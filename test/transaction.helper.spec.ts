import {transaction} from "../src/helpers";
import {defaultNetworkIdentifier} from './helpers/state_store';

describe('Test helper transaction', () => {
    it('should return valid transaction', () => {
        expect(transaction({
            networkIdentifier: defaultNetworkIdentifier,
            fee: '10000',
            field1: "Hello",
            nonce: "2"
        })).toEqual({
            nonce: '2',
            fee: '10000',
            senderPublicKey: undefined,
            type: 0,
            asset: {field1: 'Hello', field2: undefined, data: undefined}
        })
    });

    it('should return valid signed transaction', () => {
        expect(transaction({
            networkIdentifier: defaultNetworkIdentifier,
            fee: '10000',
            field1: "Hello",
            nonce: "2",
            passphrase: "creek own stem final gate scrub live shallow stage host concert they",
        })).toEqual({
            nonce: '2',
            fee: '10000',
            id: "16896183767761432274",
            height: undefined,
            blockId: undefined,
            confirmations: undefined,
            receivedAt: undefined,
            senderId: "11237980039345381032L",
            senderPublicKey: "5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca",
            signatures: [
                "72d9f40e5c9db9b720bcc75d054f5a559b5a76e8a9315965cf5df7d73309d18b76482ad8c69bb042537f41c1dc0061fb02f770a1840bfbcd64750c83566b7a03",
            ],
            type: 0,
            asset: {field1: 'Hello', field2: undefined, data: undefined}
        })
    })
});
