import {stringToBuffer} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
  BaseTransaction,
  StateStore,
  StateStorePrepare,
  TransactionError,
  convertToAssetError,
} from '@liskhq/lisk-transactions';
import {JoinAssetSchema} from './schemas';
import {JoinTXInterface, JoinTXAsset, AddressBookAccount, ProposalAccount} from './interfaces';
import { JOIN_TYPE } from './constants';
import {getAddressFromPublicKey} from "@liskhq/lisk-cryptography/dist-node";

export class JoinTransaction extends BaseTransaction {
  readonly asset: JoinTXAsset;
  public static TYPE = JOIN_TYPE;
  public constructor(rawTransaction: unknown) {
    super(rawTransaction);
    const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
      ? rawTransaction
      : {}) as Partial<JoinTXInterface>;

    if (tx.asset) {
      this.asset = {
        proposal: tx.asset.proposal,
        addressBook: tx.asset.addressBook,
      } as JoinTXAsset;
    } else {
      this.asset = {} as JoinTXAsset;
    }
  }

  protected validateAsset(): ReadonlyArray<TransactionError> {
    const asset = this.assetToJSON() as JoinTXAsset;
    const schemaErrors = validator.validate(JoinAssetSchema, asset);
    return convertToAssetError(
      this.id,
      schemaErrors,
    ) as TransactionError[];
  }

  protected assetToBytes(): Buffer {
    const proposalBuffer = this.asset.proposal
      ? stringToBuffer(this.asset.proposal)
      : Buffer.alloc(0);

    const addressBookBuffer = this.asset.addressBook
      ? stringToBuffer(this.asset.addressBook)
      : Buffer.alloc(0);

    return Buffer.concat([
      proposalBuffer,
      addressBookBuffer,
    ]);
  }

  public async prepare(store: StateStorePrepare): Promise<void> {
    await store.account.cache([
      {
        address: this.senderId,
      },
      {
        publicKey: this.asset.proposal,
      },
      {
        publicKey: this.asset.addressBook,
      },
    ]);
  }

  protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
    const errors: TransactionError[] = [];
    const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.addressBook)) as AddressBookAccount;
    const proposalValidator = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.proposal)) as ProposalAccount;

    const isMember = addressBook.asset.addresses.find(member => member === this.senderPublicKey);

    if (isMember) {
      errors.push(
        new TransactionError(
          '`.senderPublicKey` is already member.',
          this.id,
          '.senderPublicKey',
          this.senderPublicKey,
        ),
      );
    }

    if (proposalValidator.asset.start + (60*5) > store.chain.lastBlockHeader.timestamp + 10) {
      errors.push(
        new TransactionError(
          '`.asset.proposal` is not yet expired.',
          this.id,
          '.timestamp',
          store.chain.lastBlockHeader.timestamp + 10,
          `> ${proposalValidator.asset.start + (60*5)}`
        ),
      );
    }

    if (proposalValidator.asset.votes.filter(v => v.vote === 1).length <= proposalValidator.asset.votes.length / 2) {
      errors.push(
        new TransactionError(
          '`.asset.proposal` did not pass add member voting.',
          this.id,
          '.asset.proposal',
          this.asset.proposal
        ),
      );
    }

    if (proposalValidator.asset.votes.length < addressBook.asset.addresses.length * .30) {
      errors.push(
        new TransactionError(
          'Voting didn\'t reach quorum',
          this.id,
          `${proposalValidator.asset.votes.length}`,
          `> ${addressBook.asset.addresses.length * .30}`,
        ),
      );
    }

    // @ts-ignore
    if (proposalValidator.asset.options.member !== this.senderPublicKey) {
      errors.push(
        new TransactionError(
          '`.senderPublicKey` is not the subject of this proposal.',
          this.id,
          '.senderPublicKeyl',
          this.senderPublicKey,
          // @ts-ignore
          proposalValidator.asset.options.member
        ),
      );
    }

    proposalValidator.asset = {
      ...proposalValidator.asset,
      status: 0,
    }

    addressBook.asset = {
      ...addressBook.asset,
      addresses: [
        ...addressBook.asset.addresses,
        this.senderPublicKey
      ]
    }

    store.account.set(proposalValidator.address, proposalValidator);
    store.account.set(addressBook.address, addressBook);

    return errors;
  }

  protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
    const errors: TransactionError[] = [];
    const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.addressBook)) as AddressBookAccount;
    const proposal = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.proposal)) as ProposalAccount;

    addressBook.asset = {
      ...addressBook.asset,
      addresses: {
        ...addressBook.asset.addresses.filter(a => a !== this.senderPublicKey),
      }
    }

    proposal.asset = {
      ...proposal.asset,
      status: 1,
    }

    store.account.set(proposal.address, proposal);
    store.account.set(addressBook.address, addressBook);

    return errors;
  }
}
