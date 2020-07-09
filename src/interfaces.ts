import {Account, TransactionError} from "@liskhq/lisk-transactions";

export interface ProposalAccount extends Account {
    asset: ProposalAccountAsset;
}

export interface ProposalAccountAsset {
    readonly addressBook: string;
    readonly start: number;
    readonly votes: Array<Vote>;
    readonly type: string;
    readonly status: number;
    readonly options: object;
    readonly nonce: number;
}

export interface Vote {
    readonly member: string;
    readonly vote: number;
}

export interface AddressBookAccount extends Account {
    asset: AddressBookAccountAsset;
}

export interface AddressBookAccountAsset {
    readonly addresses: Array<Member>; // allowed members
    readonly nonce: number;
    readonly name: string;
    readonly description: string;
}

interface Member {
    readonly member: string;
    readonly nonce: number;
}

export interface AddressBookTXInterface extends TransactionJSON {
    readonly asset: AddressBookTXAsset;
}

export interface BaseProposalTXInterface extends TransactionJSON {
    readonly asset: BaseProposalTXAsset;
}

export interface SimpleProposalTXInterface extends TransactionJSON {
    readonly asset: SimpleProposalTXAsset;
}

export interface AddMemberProposalTXInterface extends TransactionJSON {
    readonly asset: AddMemberProposalTXAsset;
}

export interface BaseVoteTXInterface extends TransactionJSON {
    readonly asset: BaseVoteTXAsset;
}

export interface JoinTXInterface extends TransactionJSON {
    readonly asset: JoinTXAsset;
}

export interface AddressBookTXAsset {
    readonly name: string;
    readonly description: string;
    readonly addresses: Array<string>;
}

export interface BaseProposalTXAsset {
    readonly nonce: number;
    readonly addressBook: string;
    readonly options: object;
}

export interface SimpleProposalTXAsset {
    readonly nonce: number;
    readonly addressBook: string;
    readonly options: {
        proposal: string;
    };
}

export interface AddMemberProposalTXAsset {
    readonly nonce: number;
    readonly addressBook: string;
    readonly options: {
        member: string;
    };
}

export interface BaseVoteTXAsset {
    readonly addressBook: string;
    readonly proposal: string;
    readonly vote: number;
}

export interface JoinTXAsset {
    readonly addressBook: string;
    readonly proposal: string;
}

export interface TransactionJSON {
    readonly id?: string;
    readonly blockId?: string;
    readonly height?: number;
    readonly confirmations?: number;
    readonly senderPublicKey: string;
    readonly signatures?: ReadonlyArray<string>;
    readonly type: number;
    readonly receivedAt?: string;
    readonly networkIdentifier?: string;
    readonly nonce: string;
    readonly fee: string;
}

export interface ApplyProposal {
    readonly errors: ReadonlyArray<TransactionError>;
    readonly proposal: ProposalAccount;
}
