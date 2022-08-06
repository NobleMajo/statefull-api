import * as crypto from 'crypto';

export type HashFunc = (
    options: SecretHashOptions,
) => Promise<SecretHash>

export interface SecretHash {
    salt: string,
    hash: string,
}

export interface SecretHashOptions {
    value: string,
    salt?: string,
    iterations?: number,
    keylen?: number,
    algorithm?: string
}

export async function createSecretHash(
    options: SecretHashOptions,
): Promise<SecretHash> {
    const salt = options.salt ?? crypto.randomBytes(32).toString('base64');
    const hash = await new Promise<string>((res, rej) => crypto.pbkdf2(
        options.value,
        salt,
        options.iterations ?? 512,
        options.keylen ?? 32,
        options.algorithm ?? 'sha512',
        (err, hash) =>
            err ?
                rej(err) :
                res(hash.toString("base64"))
    ))

    return {
        salt: salt,
        hash: hash,
    }
}