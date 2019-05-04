module.exports = createKeyStoreSchema;

const createDatasource = require('@major-mann/graphql-datasource-base');

async function createKeyStoreSchema({ data, name = '${name}' }) {
    const composer = await createDatasource({
        data,
        definitions: `
            type ${name} {
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
        rootTypes: [name],
        idFieldSelector: () => 'kid'
    });

    wrapResolver(composer.getOTC(`${name}Query`), 'find');

    const mutationType = composer.getOTC(`${name}Mutation`);
    wrapResolver(mutationType, 'create');
    wrapResolver(mutationType, 'upsert');
    wrapResolver(mutationType, 'update');
    wrapResolver(mutationType, 'delete');

    return composer;

    function wrapResolver(type, fieldName) {
        type.setResolver(`$${fieldName}`, type.getResolver(`$${fieldName}`).wrap(issuerAddWrapper));
        type.setField(fieldName, type.getResolver(`$${fieldName}`));
    }

    function issuerAddWrapper(resolver) {
        resolver.setArg('iss', { type: 'String' });
        return resolver.wrapResolve(next => params => {
            return next({
                ...params,
                args: {
                    ...params.args,
                    kid: {
                        kid: params.kid,
                        iss: params.iss
                    }
                }
            })
        });
    }
}
