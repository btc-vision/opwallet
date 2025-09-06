export class WalletControllerError extends Error {
    constructor(message: string, public data?: unknown) {
        super(message);
        this.name = 'WalletControllerError';
    }
}