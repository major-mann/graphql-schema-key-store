module.exports = createKeyStoreSchema;

const SPLITTER = `:::`;

const createDatasource = require(`@major-mann/graphql-datasource-base`);

async function createKeyStoreSchema({ data, name = `JsonWebKey` }) {
    const composer = await createDatasource({
        data,
        // Note: audience is purposefully unrequired since it is always required, and added
        //  in the mutation resolvers.
        definitions: `
            type ${name} {
                # A unique id for the underlying data source
                keyId: ID!
                # The key issuer
                iss: String!
                # The audience the key is intended for
                aud: String
                # The key type represented by the key data
                kty: String!
                # The use cases for the key
                use: String
                # The operations the key is valid for
                key_ops: [String!]
                # The algorithm the key should be applied with
                alg: String
                # The unique ID (per issuer) of the key
                kid: String
                # X.509 URL
                x5u: String
                # X.509 Certificate Chain
                x5c: String
                # X.509 Certificate SHA-1 Thumbprint
                x5t: String
                # X.509 Certificate SHA-256 Thumbprint
                x5t_S256: String

                # RSA public exponent
                e: String
                # RSA private exponent
                d: String
                # Symmetric key
                k: String
                # RSA modulus
                n: String
                # RSA prime factor
                p: String
                # RSA prime factor
                q: String
                # x coordinate for Elliptic Curve
                x: String
                # y coordinate for Elliptic Curve
                y: String
                # d mod (p - 1) - See https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Using_the_Chinese_remainder_algorithm
                dp: String
                # d mod (1 - 1) - See https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Using_the_Chinese_remainder_algorithm
                dq: String
                # q⁻¹ mod p - See https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Using_the_Chinese_remainder_algorithm
                qi: String
                # The cryptographic curve to use with the key
                crv: String

                # The time (ms since Unix epoch) the key was created
                created: Float
            }
        `,
        rootTypes: [name]
    });

    // TODO: Add documentation for find, list, create, upsert, update and delete
    wrapFindResolver(composer.getOTC(`${name}Query`), `find`);

    const mutationType = composer.getOTC(`${name}Mutation`);
    wrapMutationResolver(mutationType, `create`);
    wrapMutationResolver(mutationType, `upsert`);
    wrapMutationResolver(mutationType, `update`);
    wrapMutationResolver(mutationType, `delete`);

    return composer;

    function wrapFindResolver(type, fieldName) {
        type.setResolver(
            `$${fieldName}`,
            type.getResolver(`$${fieldName}`)
                .wrap(issuerAudienceAddWrapper)
        );
        type.setField(fieldName, type.getResolver(`$${fieldName}`));
    }

    function wrapMutationResolver(type, fieldName) {
        type.setResolver(`$${fieldName}`, type.getResolver(`$${fieldName}`).wrap(issuerAudienceAddWrapper));
        type.setField(fieldName, type.getResolver(`$${fieldName}`));
    }

    function issuerAudienceAddWrapper(resolver) {
        resolver.removeArg(`keyId`);
        resolver.setArg(`kid`, { type: `String!` });
        resolver.setArg(`iss`, { type: `String!` });
        resolver.setArg(`aud`, { type: `String!` });
        return resolver.wrapResolve(next => params => {
            const data = params.args.data || {};
            data.iss = params.args.iss;
            data.kid = params.args.kid;
            data.aud = params.args.aud;
            return next({
                ...params,
                args: {
                    ...params.args,
                    data,
                    keyId: [params.args.iss, params.args.aud, params.args.kid].join(SPLITTER)
                }
            });
        });
    }
}
