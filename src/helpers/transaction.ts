import {
    isValidFee,
    isValidNonce,
    validateNetworkIdentifier,
    isValidInteger,
} from '@liskhq/lisk-validator';
import { constants, TransactionJSON } from '@liskhq/lisk-transactions';
import { createBaseTransaction } from '@liskhq/lisk-transactions/dist-node/utils'
import { Transaction } from '../transaction';
const { BYTESIZES } = constants;

export interface Inputs {
    readonly fee: string;
    readonly nonce: string;
    readonly networkIdentifier: string;
    readonly field1: string;
    readonly field2?: number;
    readonly data?: string;
    readonly senderPublicKey?: string;
    readonly passphrase?: string;
    readonly passphrases?: ReadonlyArray<string>;
    readonly keys?: {
        readonly mandatoryKeys: Array<Readonly<string>>;
        readonly optionalKeys: Array<Readonly<string>>;
    };
}

const validateInputs = ({
                            field1,
                            field2,
                            data,
                            networkIdentifier,
                            fee,
                            nonce,
                        }: Inputs): void => {
    if (!isValidNonce(nonce)) {
        throw new Error('Nonce must be a valid number in string format.');
    }

    if (!isValidFee(fee)) {
        throw new Error('Fee must be a valid number in string format.');
    }

    if (!field1) {
        throw new Error('Field 1 must be set.');
    }

    if (field2 && !isValidInteger(field2)) {
        throw new Error('Field 2 must be valid integer.');
    }

    if (data && data.length > 0) {
        if (typeof data !== 'string') {
            throw new Error(
                'Invalid encoding in transaction data. Data must be utf-8 encoded string.',
            );
        }
        if (data.length > BYTESIZES.DATA) {
            throw new Error('Transaction data field cannot exceed 64 bytes.');
        }
    }

    validateNetworkIdentifier(networkIdentifier);
};

export const transaction = (inputs: Inputs): Partial<TransactionJSON> => {
    validateInputs(inputs);
    const {
        data,
        field1,
        field2,
        passphrase,
        networkIdentifier,
        passphrases,
        keys,
        senderPublicKey,
    } = inputs;

    const tx = {
        ...createBaseTransaction(inputs),
        type: 0,
        // For txs from multisig senderPublicKey must be set before attempting signing
        senderPublicKey,
        asset: {
            field1,
            field2,
            data,
        },
    };

    if (!passphrase && !passphrases?.length) {
        return tx;
    }

    const transactionWithSenderInfo = {
        ...tx,
        senderPublicKey: tx.senderPublicKey as string,
        asset: {
            ...tx.asset,
        },
    };

    const transactionTransaction = new Transaction(
        transactionWithSenderInfo,
    );

    if (passphrase) {
        transactionTransaction.sign(networkIdentifier, passphrase);

        return transactionTransaction.toJSON();
    }

    if (passphrases && keys) {
        transactionTransaction.sign(networkIdentifier, undefined, passphrases, keys);

        return transactionTransaction.toJSON();
    }

    return transactionWithSenderInfo;
};
