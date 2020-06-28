import {BaseVote} from "../baseVote";
import {SIMPLE_VOTE_TYPE} from '../constants';

export class SimpleVote extends BaseVote {
    public readonly TYPE = SIMPLE_VOTE_TYPE;

    constructor(rawTransaction: unknown) {
        super(rawTransaction);
    }

}
