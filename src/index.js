module.exports = createKeyStoreSchema;

const createDatasource = require('@major-mann/graphql-datasource-base');

async function createKeyStoreSchema({ data }) {
    const composer = await createDatasource({
        data,
        definitions: `
            type JsonWebKey {
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
            }
        `,
        rootTypes: ['JsonWebKey'],
        idFieldSelector: () => 'kid'
    });

    wrapResolver(composer.getOTC('JsonWebKeyQuery'), 'find');

    const mutationType = composer.getOTC('JsonWebKeyMutation');
    wrapResolver(mutationType, 'create');
    wrapResolver(mutationType, 'upsert');
    wrapResolver(mutationType, 'update');
    wrapResolver(mutationType, 'delete');

    return composer;

    function wrapResolver(type, name) {
        type.setResolver(`$${name}`, type.getResolver(`$${name}`).wrap(issuerAddWrapper));
        type.setField(name, type.getResolver(`$${name}`));
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
