# Lisk-transaction
####Type: 0
####SDK Versions: v4.0.0

# Blockchain application installation
`npm install lisk-transaction`

```javascript
const { Transaction } = require('lisk-transaction');

app.registerTransaction(Transaction);
```

## Constants
`TRANSACTION_TYPE`: 0

# Client side
## Syntax
```javascript
transaction(options);
```

## Parameters
`options`: Options to be used for creating Transaction.
- `networkIdentifier` (required): The ID of the network where the transaction will be broadcasted to.
- `field1` (required): Text field1
- `field2` (optional): Number field2
- `data` (optional): Data to include in the transaction asset. (Must be a UTF8-encoded string of maximum 64 characters.)
- `passphrase` (optional): Passphrase to use to sign the transaction. If not provided at creation the transaction can be signed later.
- `secondPassphrase` (optional): Second passphrase to use to sign the transaction if the account has registered a second passphrase. If not provided at the creation, the transaction can be signed with the second passphrase later.

## Return value
`object`: Valid transaction object.

### Example
```javascript
Transaction({
    networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d',
    field1: 'Hello',
    field2: 1,
    data: '{ "field3": "World" }',
    });
/*
{
  senderPublicKey: undefined,
  timestamp: 117410306,
  type: 0,
  asset: {
    field1: 'Hello',
    field2: 1,
    data: '{ "field3": "World" }',
  }
}*/
```

# Tasks
- Create more extensive tests
- Register transaction type

# Change logs
`May 1st, 2020`: Created initial release
