import { TransactionError, StateStore } from '@liskhq/lisk-transactions';

import {BaseVote} from "../baseVote";
import { ADD_MEMBER_VOTE_TYPE} from '../constants';
import {AddressBookAccount, ApplyProposal, ProposalAccount} from "../interfaces";

export class AddMemberVote extends BaseVote {
    public readonly TYPE = ADD_MEMBER_VOTE_TYPE;

    constructor(rawTransaction: unknown) {
        super(rawTransaction);
    }

    public async applyVoteAsset(store: StateStore): Promise<ApplyProposal> {
        const errors: TransactionError[] = [];
        const proposal = await store.account.getOrDefault(this.asset.proposal) as ProposalAccount;
        const addressBook = await store.account.getOrDefault(this.asset.addressBook) as AddressBookAccount;

        const eligibleVotes = addressBook.asset.members.filter(m => m.nonce < proposal.asset.nonce).length;
        if (eligibleVotes / 2  < proposal.asset.votes.filter(v => v.vote === 1).length) {
            // deciding vote
            addressBook.asset = {
                ...addressBook.asset,
                members: [
                    ...addressBook.asset.members,
                    {
                        // @ts-ignore
                        member: proposal.asset.options.member,
                        nonce: proposal.asset.nonce,

                    }
                ]
            }

            store.account.set(addressBook.address, addressBook);
        }

        return { proposal, errors };
    }

}
