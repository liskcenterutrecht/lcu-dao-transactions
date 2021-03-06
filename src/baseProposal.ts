import {stringToBuffer, getAddressFromPublicKey, intToBuffer} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
  BaseTransaction,
  StateStore,
  StateStorePrepare,
  TransactionError,
  convertToAssetError,
} from '@liskhq/lisk-transactions';
import {BaseProposalAssetSchema} from './schemas';
import {
  BaseProposalTXInterface,
  BaseProposalTXAsset,
  AddressBookAccount,
  ProposalAccount,
  ApplyProposal
} from './interfaces';
import {assetBytesToPublicKey} from './utils';
import {BASE_PROPOSAL_TYPE} from "./constants";

export class BaseProposal extends BaseTransaction {
  public asset: any;
  public static TYPE = BASE_PROPOSAL_TYPE;

  public constructor(rawTransaction: unknown) {
    super(rawTransaction);
    const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
      ? rawTransaction
      : {}) as Partial<BaseProposalTXInterface>;

    if (tx.asset) {
      this.asset = {
        nonce: tx.asset.nonce,
        addressBook: tx.asset.addressBook,
        options: tx.asset.options,
      } as BaseProposalTXAsset;
    } else {
      this.asset = {} as BaseProposalTXAsset;
    }
  }

  protected validateAsset(): ReadonlyArray<TransactionError> {
    const asset = this.assetToJSON() as BaseProposalTXAsset;
    const schemaErrors = validator.validate(BaseProposalAssetSchema, asset);
    return convertToAssetError(
      this.id,
      schemaErrors,
    ) as TransactionError[];
  }

  protected assetToBytes(): Buffer {
    const nonceBuffer = this.asset.nonce
      ? intToBuffer(this.asset.nonce, 2)
      : Buffer.alloc(0);

    const addressBookBuffer = this.asset.addressBook
      ? stringToBuffer(this.asset.addressBook)
      : Buffer.alloc(0);

    const optionsBuffer = this.asset.options
      ? stringToBuffer(JSON.stringify(this.asset.options))
      : Buffer.alloc(0);

    return Buffer.concat([
      nonceBuffer,
      addressBookBuffer,
      optionsBuffer,
    ]);
  }

  public getProposalPublicKey(): string {
    return assetBytesToPublicKey(this.assetToBytes().toString())
  }

  protected getProposalAddress(): string {
    return getAddressFromPublicKey(this.getProposalPublicKey());
  }

  public async prepare(store: StateStorePrepare): Promise<void> {
    await store.account.cache([
      {
        address: this.senderId,
      },
      {
        address: this.getProposalAddress(),
      },
      {
        address: getAddressFromPublicKey(this.asset.addressBook)
      }
    ]);
  }

  public async applyProposalAsset(store: StateStore): Promise<ApplyProposal> {
    const errors: TransactionError[] = [];
    const proposal = await store.account.getOrDefault(this.getProposalAddress()) as ProposalAccount;
    return {proposal, errors};
  }

  protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
    const errs: TransactionError[] = [];
    const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.addressBook)) as AddressBookAccount;
    const storedProposal = await store.account.getOrDefault(this.getProposalAddress()) as ProposalAccount;

    if (storedProposal.balance > BigInt(0) || storedProposal.asset.nonce > -1) {
      errs.push(
        new TransactionError(
          'This proposal already exists.',
          this.id,
          '.publicKey',
          this.getProposalPublicKey(),
        ),
      );
    }

    if (this.asset.nonce !== addressBook.asset.nonce) {
      errs.push(
        new TransactionError(
          'Wrong proposal nonce.',
          this.id,
          '.asset.nonce',
          this.asset.nonce,
          addressBook.asset.nonce,
        ),
      );
    }
    const isValidMember = addressBook.asset.addresses.find(a => a.member === this.senderPublicKey);
    if (!isValidMember) {
      errs.push(
        new TransactionError(
          'You are not allowed to make a proposal for this addressBook.',
          this.id,
          '.senderPublicKey',
          this.senderPublicKey,
        ),
      );
    }

    const {proposal, errors} = await this.applyProposalAsset(store);

    errors.map(err => {
      errs.push(err);
    });

    proposal.publicKey = this.getProposalPublicKey();
    proposal.asset = {
      ...proposal.asset,
      options: proposal.asset.options || {},
      votes: [],
      status: proposal.asset.status || 1,
      addressBook: this.asset.addressBook,
      nonce: addressBook.asset.nonce,
      start: store.chain.lastBlockHeader.timestamp,
    }

    addressBook.asset = {
      ...addressBook.asset,
      nonce: addressBook.asset.nonce + 1,
    };

    store.account.set(addressBook.address, addressBook);
    store.account.set(proposal.address, proposal);

    return errs;
  }

  public async undoProposalAsset(store: StateStore): Promise<ApplyProposal> {
    const errors: TransactionError[] = [];
    const proposal = await store.account.getOrDefault(getAddressFromPublicKey(this.getProposalPublicKey())) as ProposalAccount;

    proposal.asset = {
      options: {},
      votes: [],
      type: "",
      status: -1,
      addressBook: this.asset.addressBook,
      nonce: -1,
      start: -1,
    }

    return {proposal, errors};
  }

  protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
    const {proposal, errors} = await this.undoProposalAsset(store);
    const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.addressBook)) as AddressBookAccount;

    addressBook.asset = {
      ...addressBook.asset,
      nonce: addressBook.asset.nonce - 1,
    };

    store.account.set(addressBook.address, addressBook);
    store.account.set(proposal.address, proposal);
    return errors;
  }
}
