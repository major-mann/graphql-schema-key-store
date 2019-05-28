module.exports = createKeyStoreSchema;

const SPLITTER = ':::';

const createDatasource = require('@major-mann/graphql-datasource-base');

async function createKeyStoreSchema({ data, name = 'JsonWebKey' }) {
    const composer = await createDatasource({
        data,
        definitions: `
            type ${name} {
                keyId: ID!
                iss: String
                kty: String!
                use: String
                key_ops: String
                alg: String
                kid: String
                x5u: String
                x5c: String
                x5t: String
                x5t_S256: String

                e: String
                d: String
                k: String
                n: String
                p: String
                q: String
                x: String
                y: String
                dp: String
                dq: String
                qi: String
                crv: String

                created: Float
            }
        `,
        rootTypes: [name]
    });

    wrapFindResolver(composer.getOTC(`${name}Query`), 'find');

    const mutationType = composer.getOTC(`${name}Mutation`);
    wrapMutationResolver(mutationType, 'create');
    wrapMutationResolver(mutationType, 'upsert');
    wrapMutationResolver(mutationType, 'update');
    wrapMutationResolver(mutationType, 'delete');

    return composer;

    function wrapFindResolver(type, fieldName) {
        type.setResolver(
            `$${fieldName}`,
            type.getResolver(`$${fieldName}`)
                .wrap(issuerAddWrapper)
        );
        type.setField(fieldName, type.getResolver(`$${fieldName}`));
    }

    function wrapMutationResolver(type, fieldName) {
        type.setResolver(`$${fieldName}`, type.getResolver(`$${fieldName}`).wrap(issuerAddWrapper));
        type.setField(fieldName, type.getResolver(`$${fieldName}`));
    }

    function issuerAddWrapper(resolver) {
        resolver.setArg('iss', { type: 'String' });
        return resolver.wrapResolve(next => params => {
            const data = params.args.data || {};
            data.iss = params.args.iss;
            data.kid = params.args.kid;
            return next({
                ...params,
                args: {
                    ...params.args,
                    data,
                    keyId: [params.args.iss, params.args.kid].join(SPLITTER)
                }
            })
        });
    }
}
