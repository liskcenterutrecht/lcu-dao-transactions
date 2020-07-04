import {TransactionError, StateStore} from '@liskhq/lisk-transactions';

import {BaseProposal} from '../baseProposal';
import {SIMPLE_PROPOSAL_TYPE} from '../constants';
import {ApplyProposal, SimpleProposalTXAsset, SimpleProposalTXInterface, ProposalAccount} from "../interfaces";

export class SimpleProposal extends BaseProposal {
    public static TYPE = SIMPLE_PROPOSAL_TYPE;

    constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<SimpleProposalTXInterface>;
        if (tx.asset) {
            this.asset = {
                nonce: tx.asset.nonce,
                addressBook: tx.asset.addressBook,
                options: {
                    proposal: tx.asset.options.proposal ? tx.asset.options.proposal : "",
                }
            } as SimpleProposalTXAsset;
        } else {
            this.asset = {} as SimpleProposalTXAsset;
        }
    }

    public async applyProposalAsset(store: StateStore): Promise<ApplyProposal> {
        const errors: TransactionError[] = [];
        const proposal = await store.account.getOrDefault(this.getProposalAddress()) as ProposalAccount;

        if (!this.asset.options.proposal) {
            errors.push(
                new TransactionError(
                    '`.asset.options.proposal` should contain the proposal.',
                    this.id,
                    '.asset.options.proposal',
                    undefined,
                ),
            );
        }

        if (this.asset.options.proposal &&
            (typeof this.asset.options.proposal !== "string" ||this.asset.options.proposal.length < 6 ||
                this.asset.options.proposal && this.asset.options.proposal.length > 128)) {
            errors.push(
                new TransactionError(
                    '`.asset.options.proposal` should contain string between 6 and 128 characters.',
                    this.id,
                    '.asset.options.proposal',
                    this.asset.options.proposal,
                ),
            );
        }

        proposal.asset = {
            ...proposal.asset,
            options: {
                proposal: this.asset.options.proposal,
            },
        }

        return {proposal, errors};
    }

}
