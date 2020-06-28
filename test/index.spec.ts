import 'jest-extended';
import {Account, TransactionError} from '@liskhq/lisk-transactions/dist-node';
import {
    transactions,
    accounts,
} from './fixtures';
import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from './helpers/state_store';
import {Transaction,} from '../src';

// const { TransactionInterface, TransactionAsset } = Interfaces;

describe('Test Transaction', () => {
    const validTransaction = transactions.validTransaction.input;
    let validTestTransaction: Transaction;
    let sender: Account;
    let recipient: Account;
    let store: StateStoreMock;
    let lastBlockHeader;

    beforeEach(() => {
        validTestTransaction = new Transaction(
            validTransaction,
        );
        sender = {
            ...defaultAccount,
            balance: BigInt('10000000000'),
            address: accounts.defaultAccount.senderId,
        };

        recipient = {
            ...defaultAccount,
            balance: BigInt('10000000000'),
            address: accounts.secondAccount.senderId,
        };

        lastBlockHeader = {
            lastBlockHeader: {
                "version": 1,
                "height": 16,
                "timestamp": 23445,
                "generatorPublicKey": "968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b",
                "payloadLength": 0,
                "payloadHash": "4e4d91be041e09a2e54bb7dd38f1f2a02ee7432ec9f169ba63cd1f193a733dd2",
                "blockSignature": "a3733254aad600fa787d6223002278c3400be5e8ed4763ae27f9a15b80e20c22ac9259dc926f4f4cabdf0e4f8cec49308fa8296d71c288f56b9d1e11dfe81e07",
                "previousBlockId": "15918760246746894806",
                "numberOfTransactions": 0,
                "totalAmount": BigInt("0"),
                "totalFee": BigInt("0"),
                "reward": BigInt("50000000"),
                "maxHeightPreviouslyForged": 12,
                "maxHeightPrevoted": 12,
                "seedReveal": ""
            }
        }

        store = new StateStoreMock([sender, recipient], lastBlockHeader);

        jest.spyOn(store.account, 'cache');
        jest.spyOn(store.account, 'get');
        jest.spyOn(store.account, 'getOrDefault');
        jest.spyOn(store.account, 'set');
    });

    describe('#constructor', () => {
        it('should create instance of Transaction', async () => {
            expect(validTestTransaction).toBeInstanceOf(Transaction);
        });

        it('should create empty instance of Transaction', async () => {
            validTestTransaction = new Transaction({});
            expect(validTestTransaction).toBeInstanceOf(Transaction);
            expect(validTestTransaction.asset.field1).toEqual(
                undefined,
            );
        });

        it('should set asset data', async () => {
            expect(validTestTransaction.asset.data).toEqual(
                validTransaction.asset.data,
            );
        });
    });

    describe('#assetToJSON', () => {
        it('should return an asset object', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual(validTransaction.asset);
        });
    });

    describe('#validateAssets', () => {
        it('should return no errors', async () => {
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(0);
        });

        it('should return field1 error', async () => {
            validTestTransaction = new Transaction(
                {
                    ...validTransaction,
                    asset: {
                        ...validTransaction.asset,
                        field1: "Hello World",
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toEqual("`.asset.field1` can't be `Hello World`");
        });
    });

    describe('#prepare', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTransaction.passphrase);
            await validTestTransaction.prepare(store);
            expect(store.account.cache).toHaveBeenCalledWith([
                {address: transactions.validTransaction.senderId},
            ]);
        });
    });

    describe('#applyAsset', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTransaction.passphrase);
            const errors = (validTestTransaction as any).applyAsset(store);
            expect(Object.keys(errors)).toHaveLength(0);
        });

        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTransaction.passphrase);
            await (validTestTransaction as any).applyAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTransaction.senderId,
            );

            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTransaction.senderId,
                expect.objectContaining({
                    address: transactions.validTransaction.senderId,
                }),
            );
        });
    });

    describe('#undoAsset', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTransaction.passphrase);
            await (validTestTransaction as any).undoAsset(store);
            expect(store.account.get).toHaveBeenCalledWith(
                transactions.validTransaction.senderId);
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTransaction.senderId,
                expect.objectContaining({
                    address: transactions.validTransaction.senderId,
                }),
            );
        });
    });
});

