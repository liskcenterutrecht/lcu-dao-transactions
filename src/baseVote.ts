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

export class BaseVote extends BaseTransaction {
    readonly asset: BaseVoteTXAsset;

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
                address: this.asset.proposal,
            },
            {
                address: this.asset.addressBook,
            },
        ]);
    }

    public async applyVoteAsset(store: StateStore): Promise<ApplyProposal> {
        const errors: TransactionError[] = [];
        const proposal = await store.account.get(this.asset.proposal) as ProposalAccount;

        return {proposal, errors};
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errs: TransactionError[] = [];
        const addressBook = await store.account.getOrDefault(this.asset.addressBook) as AddressBookAccount;
        const proposalValidator = await store.account.getOrDefault(this.asset.proposal) as ProposalAccount;

        // check if user is allowed:
        // +1. is member of addressbook
        // +2. was member before this proposal nonce
        // +3. proposal is still open for voting
        // +4. proposal is part of addressbook
        // +5. member didn't voted already
        const isValidMember = addressBook.asset.members.find(member => member.publicKey === this.senderPublicKey && !member.out);

        if (proposalValidator.asset.addressBook !== addressBook.publicKey) {
            errs.push(
                new TransactionError(
                    '`.asset.addressBook` isn\'t part of this proposal.',
                    this.id,
                    '.asset.addressBook',
                    this.asset.addressBook,
                    proposalValidator.asset.addressBook ? proposalValidator.asset.addressBook : undefined,
                ),
            );
        }

        if (!isValidMember || (isValidMember && isValidMember.nonce && isValidMember.nonce >= proposalValidator.asset.nonce)) {
            errs.push(
                new TransactionError(
                    '`.senderPublicKey` is not allowed to vote on this proposal.',
                    this.id,
                    '.senderPublicKey',
                    this.senderPublicKey,
                ),
            );
        }

        if (proposalValidator.asset.start + 604800 > store.chain.lastBlockHeader.timestamp + 10) {
            errs.push(
                new TransactionError(
                    '`.asset.proposal` is expired.',
                    this.id,
                    '.timestamp',
                    store.chain.lastBlockHeader.timestamp + 10,
                    `<= ${proposalValidator.asset.start + 604800}`
                ),
            );
        }

        if (proposalValidator.asset.votes.find(v => v.member === this.senderPublicKey)) {
            errs.push(
                new TransactionError(
                    '`.senderPublicKey` already voted for this proposal.',
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
            ]
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
            ]
        }

        store.account.set(proposal.address, proposal);

        return errors;
    }
}
