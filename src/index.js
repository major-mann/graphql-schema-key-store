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
                keyId: ID!
                iss: String!
                aud: String
                kty: String!
                use: String
                key_ops: [String!]
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

    // Add some documentation
    extendFields(composer.getOTC(name), {
        keyId: { description: `A unique id for the underlying data source` },
        iss: { description: `The key issuer` },
        aud: { description: `The audience the key is intended for` },
        kty: { description: `The key type represented by the key data` },
        use: { description: `The use cases for the key` },
        key_ops: { description: `The operations the key is valid for` },
        alg: { description: `The algorithm the key should be applied with` },
        kid: { description: `The unique ID (per issuer) of the key` },
        x5u: { description: `X.509 URL` },
        x5c: { description: `X.509 Certificate Chain` },
        x5t: { description: `X.509 Certificate SHA-1 Thumbprint` },
        x5t_S256: { description: `X.509 Certificate SHA-256 Thumbprint` },
        e: { description: `RSA public exponent` },
        d: { description: `RSA private exponent` },
        k: { description: `Symmetric key` },
        n: { description: `RSA modulus` },
        p: { description: `RSA prime factor` },
        q: { description: `RSA prime factor` },
        x: { description: `x coordinate for Elliptic Curve` },
        y: { description: `y coordinate for Elliptic Curve` },
        dp: { description: `d mod (p - 1) - See https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Using_the_Chinese_remainder_algorithm` },
        dq: { description: `d mod (1 - 1) - See https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Using_the_Chinese_remainder_algorithm` },
        qi: { description: `q⁻¹ mod p - See https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Using_the_Chinese_remainder_algorithm` },
        crv: { description: `The cryptographic curve to use with the key` },
        created: { description: `The time (ms since Unix epoch) the key was created` }
    });

    const queryType = composer.getOTC(`${name}Query`);
    wrapFindResolver(queryType, `find`);
    extendFields(queryType, {
        find: { description: `Searches for a given key by "kid", "iss" and "aud"` },
        list: { description: `Searches through all keys using the supplied filters` }
    });


    const mutationType = composer.getOTC(`${name}Mutation`);
    wrapMutationResolver(mutationType, `create`);
    wrapMutationResolver(mutationType, `upsert`);
    wrapMutationResolver(mutationType, `update`);
    wrapMutationResolver(mutationType, `delete`);

    extendFields(mutationType, {
        create: { description: `Creates a new service key` },
        upsert: { description: `Creates a new service key if the given "kid", "iss" and "aud" combination does not exist, ` +
            `or updates it if it does exist` },
        update: { description: `Updates the service key with the given "kid", "iss" and "aud" combination` },
        delete: { description: `Deletes the service key with the given "kid", "iss" and "aud" combination` }
    });

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

    function extendFields(type, data) {
        Object.keys(data).forEach(key => type.extendField(key, data[key]));
    }
}
