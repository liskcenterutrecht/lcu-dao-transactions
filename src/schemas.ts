export const TransactionAssetSchema = {
    type: 'object',
    required: ['name', 'addresses'],
    properties: {
        name: {
            type: 'string',
            maxLength: 20,
        },
        description: {
            type: 'string',
            maxLength: 64,
            format: 'transferData',
        },
        addresses: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
            items: {
                type: 'string',
                format: 'publicKey',
            },
        }
    },
};

export const BaseProposalAssetSchema = {
    type: 'object',
    required: ['addressBook', 'nonce', 'options'],
    properties: {
        addressBook: {
            type: 'string',
            format: 'publicKey',
        },
        nonce: {
            type: 'integer',
            minimum: 0,
        },
        options: {
            type: 'object',
        }
    }
}

export const BaseVoteAssetSchema = {
    type: 'object',
    required: ['addressBook', 'proposal', 'vote'],
    properties: {
        addressBook: {
            type: 'string',
            format: 'publicKey',
        },
        proposal: {
            type: 'string',
            format: 'publicKey',
        },
        vote: {
            type: 'integer',
            minimum: 0,
        }
    }
}
