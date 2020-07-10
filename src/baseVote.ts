import {stringToBuffer, intToBuffer} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
  BaseTransaction,
  StateStore,
  StateStorePrepare,
  TransactionError,
  convertToAssetError,
} from '@liskhq/lisk-transactions';
import {BaseVoteAssetSchema} from './schemas';
import {BaseVoteTXInterface, BaseVoteTXAsset, AddressBookAccount, ProposalAccount, ApplyProposal} from './interfaces';
import {BASE_VOTE_TYPE} from './constants';
import {getAddressFromPublicKey} from "@liskhq/lisk-cryptography/dist-node";

export class BaseVote extends BaseTransaction {
  readonly asset: BaseVoteTXAsset;
  public static TYPE = BASE_VOTE_TYPE;

  public constructor(rawTransaction: unknown) {
    super(rawTransaction);
    const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
      ? rawTransaction
      : {}) as Partial<BaseVoteTXInterface>;

    if (tx.asset) {
      this.asset = {
        proposal: tx.asset.proposal,
        vote: tx.asset.vote,
        addressBook: tx.asset.addressBook,
      } as BaseVoteTXAsset;
    } else {
      this.asset = {} as BaseVoteTXAsset;
    }
  }

  protected validateAsset(): ReadonlyArray<TransactionError> {
    const asset = this.assetToJSON() as BaseVoteTXAsset;
    const schemaErrors = validator.validate(BaseVoteAssetSchema, asset);
    return convertToAssetError(
      this.id,
      schemaErrors,
    ) as TransactionError[];
  }

  protected assetToBytes(): Buffer {
    const voteBuffer = this.asset.vote
      ? intToBuffer(this.asset.vote, 1)
      : Buffer.alloc(0);

    const proposalBuffer = this.asset.proposal
      ? stringToBuffer(this.asset.proposal)
      : Buffer.alloc(0);

    const addressBookBuffer = this.asset.addressBook
      ? stringToBuffer(this.asset.addressBook)
      : Buffer.alloc(0);

    return Buffer.concat([
      voteBuffer,
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

  public async applyVoteAsset(store: StateStore): Promise<ApplyProposal> {
    const errors: TransactionError[] = [];
    const proposal = await store.account.get(getAddressFromPublicKey(this.asset.proposal)) as ProposalAccount;

    return {proposal, errors};
  }

  protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
    const errs: TransactionError[] = [];
    const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.addressBook)) as AddressBookAccount;
    const proposalValidator = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.proposal)) as ProposalAccount;

    const isValidMember = addressBook.asset.addresses.find(a => a.member === this.senderPublicKey);

    if (!isValidMember) {
      errs.push(
        new TransactionError(
          'You are not allowed to vote on this voting.',
          this.id,
          '.senderPublicKey',
          this.senderPublicKey,
        ),
      );
    }

    if (isValidMember && proposalValidator.asset.nonce < isValidMember.nonce) {
      errs.push(
        new TransactionError(
          'You are not allowed to vote on this voting, please wait for a new voting.',
          this.id,
          '.senderPublicKey',
          this.senderPublicKey,
        ),
      );
    }

    if (proposalValidator.asset.addressBook !== addressBook.publicKey) {
      errs.push(
        new TransactionError(
          'This DAO isn\'t part of this voting.',
          this.id,
          '.asset.addressBook',
          this.asset.addressBook,
          proposalValidator.asset.addressBook ? proposalValidator.asset.addressBook : undefined,
        ),
      );
    }



    if (proposalValidator.asset.start + (60 * 60 * 24) < store.chain.lastBlockHeader.timestamp + 10) {
      errs.push(
        new TransactionError(
          'This voting is finished already.',
          this.id,
          '.timestamp',
          store.chain.lastBlockHeader.timestamp + 10,
          `<= ${proposalValidator.asset.start + (60 * 60 * 24)}`
        ),
      );
    }

    if (proposalValidator.asset.votes.find(v => v.member === this.senderPublicKey)) {
      errs.push(
        new TransactionError(
          'You already voted for this voting.',
          this.id,
          '.senderPublicKey',
          this.senderPublicKey,
        ),
      );
    }

    // @ts-ignore
    if (proposalValidator.asset.type === "ADD_MEMBER" && proposalValidator.asset.options.member &&
      // @ts-ignore
      proposalValidator.asset.options.member === this.senderPublicKey) {
      errs.push(
        new TransactionError(
          'You can\'t vote for yourself.',
          this.id,
          '.senderPublicKey',
          this.senderPublicKey,
        ),
      );
    }

    const {proposal, errors} = await this.applyVoteAsset(store);

    proposal.asset = {
      ...proposal.asset,
      votes: [
        ...proposalValidator.asset.votes,
        {member: this.senderPublicKey, vote: this.asset.vote},
      ],
      status: proposal.votes.length === addressBook.asset.addresses.length ? 0 : 1,
    }

    errors.map(err => {
      errs.push(err);
    });

    store.account.set(proposal.address, proposal);

    return errs;
  }

  public async undoVoteAsset(store: StateStore): Promise<ApplyProposal> {
    const errors: TransactionError[] = [];
    const proposal = await store.account.get(this.asset.proposal) as ProposalAccount;

    return {proposal, errors};
  }

  protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
    const {proposal, errors} = await this.undoVoteAsset(store);
    proposal.asset = {
      ...proposal.asset,
      votes: [
        ...proposal.asset.votes.filter(v => v.member !== this.senderPublicKey),
      ],
      status: 1,
    }

    store.account.set(proposal.address, proposal);

    return errors;
  }
}
