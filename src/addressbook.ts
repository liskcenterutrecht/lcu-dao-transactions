import {stringToBuffer, getAddressFromPublicKey} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
    BaseTransaction,
    StateStore,
    StateStorePrepare,
    TransactionError,
    convertToAssetError,
    TransactionJSON,
} from '@liskhq/lisk-transactions';

import {ADDRESBOOK_TYPE} from './constants';
import {TransactionAssetSchema} from './schemas';
import {AddressBookTXAsset, AddressBookTXInterface} from './interfaces';
import {assetBytesToPublicKey} from './utils';

export class CreateAddressBook extends BaseTransaction {
    readonly asset: AddressBookTXAsset;
    public static TYPE = ADDRESBOOK_TYPE;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<AddressBookTXInterface>;

        if (tx.asset) {
            this.asset = {
                name: tx.asset.name,
                description: tx.asset.description,
                addresses: tx.asset.addresses,
            } as AddressBookTXAsset;
        } else {
            this.asset = {} as AddressBookTXAsset;
        }
    }

    protected validateAsset(): ReadonlyArray<TransactionError> {
        const asset = this.assetToJSON() as AddressBookTXAsset;
        const schemaErrors = validator.validate(TransactionAssetSchema, asset);
        const errors = convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];

        if (asset.addresses && asset.addresses.indexOf(this.senderPublicKey) > -1) {
            errors.push(
                new TransactionError(
                    '`.senderPublicKey` is in the addresses array',
                    this.id,
                    '.asset.addresses',
                    JSON.stringify(asset.addresses),
                    JSON.stringify(asset.addresses.filter(a => a !== this.senderPublicKey)),
                )
            )
        }

        return errors;
    }

    protected assetToBytes(): Buffer {
        const nameBuffer = this.asset.name
            ? stringToBuffer(this.asset.name)
            : Buffer.alloc(0);

        const addressesBuffer = this.asset.addresses && this.asset.addresses.length > 0 ?
            Buffer.concat(this.asset.addresses.map(address => stringToBuffer(address))) :
            Buffer.alloc(0);

        const descriptionBuffer = this.asset.description
            ? stringToBuffer(this.asset.description)
            : Buffer.alloc(0);

        return Buffer.concat([
            nameBuffer,
            descriptionBuffer,
            addressesBuffer,
        ]);
    }

    public getAddressBookPublicKey(): string {
        return assetBytesToPublicKey(this.assetToBytes().toString())
    }

    public async prepare(store: StateStorePrepare): Promise<void> {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                address: getAddressFromPublicKey(this.getAddressBookPublicKey()),
            },
        ]);
    }

    protected verifyAgainstTransactions(
        transactions: ReadonlyArray<TransactionJSON>,
    ): ReadonlyArray<TransactionError> {
        return transactions
            .filter(
                tx =>
                    // @ts-ignore
                    tx.type === this.type && tx.asset.name === this.asset.name,
            )
            .map(
                tx =>
                    new TransactionError(
                        'Address book name already exist.',
                        tx.id,
                        '.asset.name',
                        this.asset.name,
                    ),
            );
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const addressBook = await store.account.getOrDefault(getAddressFromPublicKey(this.getAddressBookPublicKey()));

        if (addressBook.balance > BigInt(0) || Object.keys(addressBook.asset).length > 0) {
            errors.push(
                new TransactionError(
                    '`addressBookPublicKey` already exists.',
                    this.id,
                    '.publicKey',
                    this.getAddressBookPublicKey(),
                ),
            );
        }

        addressBook.publicKey = this.getAddressBookPublicKey();
        addressBook.asset = {
            type: "ADDRESSBOOK",
            name: this.asset.name,
            addresses: [this.senderPublicKey.toString(), ...this.asset.addresses],
            description: this.asset.description,
            nonce: 0,
        };

        store.account.set(addressBook.address, addressBook);
        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const sender = await store.account.get(this.senderId);

        store.account.set(sender.address, sender);
        return errors;
    }
}
