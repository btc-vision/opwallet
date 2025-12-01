declare module 'browser-passworder' {
    export function encrypt(password: string, privateKey: unknown): Promise<string>;

    export function decrypt(password: string, encrypted: string): Promise<unknown>;
}
