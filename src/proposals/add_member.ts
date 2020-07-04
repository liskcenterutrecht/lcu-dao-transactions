import { Account, TransactionError, StateStore, StateStorePrepare } from '@liskhq/lisk-transactions';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

import {BaseProposal} from '../baseProposal';
import {ADD_MEMBER_PROPOSAL_TYPE} from '../constants';
import {
    ApplyProposal,
    ProposalAccount,
    AddMemberProposalTXAsset,
    AddMemberProposalTXInterface,
    AddressBookAccount
} from "../interfaces";

export class AddMemberProposal extends BaseProposal {
    public static TYPE = ADD_MEMBER_PROPOSAL_TYPE;

    constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<AddMemberProposalTXInterface>;
        if (tx.asset) {
            this.asset = {
                nonce: tx.asset.nonce,
                addressBook: tx.asset.addressBook,
                options: {
                    member: tx.asset.options.member ? tx.asset.options.member : "",
                }
            } as AddMemberProposalTXAsset;
        } else {
            this.asset = {} as AddMemberProposalTXAsset;
        }
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
                address: getAddressFromPublicKey(this.asset.options.member),
            },
            {
                address: getAddressFromPublicKey(this.asset.addressBook),
            }
        ]);
    }

    public async applyProposalAsset(store: StateStore): Promise<ApplyProposal> {
        const errors: TransactionError[] = [];
        const proposal = await store.account.getOrDefault(this.getProposalAddress()) as ProposalAccount;
        const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.addressBook)) as AddressBookAccount;
        const proposedMember = await store.account.getOrDefault(getAddressFromPublicKey(this.asset.options.member)) as Account;

        if (!this.asset.options.member) {
            errors.push(
                new TransactionError(
                    '`.asset.options.member` should contain the proposal.',
                    this.id,
                    '.asset.options.member',
                    undefined,
                ),
            );
        }

        if (addressBook.asset.addresses.find(m => m === this.asset.options.member)) {
            errors.push(
                new TransactionError(
                    '`.asset.options.member` already is in this address book.',
                    this.id,
                    '.asset.options.member',
                    this.asset.options.member,
                ),
            );
        }

        if (proposedMember.publicKey === undefined) {
            errors.push(
                new TransactionError(
                    '`.asset.options.member` not found on the blockchain.',
                    this.id,
                    '.asset.options.member',
                    this.asset.options.member,
                    'not found'
                ),
            );
        }

        proposal.asset = {
            ...proposal.asset,
            options: {
                member: this.asset.options.member ? this.asset.options.member : "",
            },
        }

        return { proposal, errors };
    }

}
