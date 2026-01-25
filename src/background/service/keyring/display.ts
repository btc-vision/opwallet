import { isHDKeyring } from '@/background/utils/keyring';
import { HdKeyring, SimpleKeyring } from '@btc-vision/wallet-sdk';

// Type for keyring that may be Keyring, EmptyKeyring, or HdKeyring
type Keyring = HdKeyring | SimpleKeyring;
type AnyKeyring = Keyring | { type: string; getAccounts(): string[] };
type KeyringGetter = (account: string, type: string) => Keyring | AnyKeyring;

// Module-level getter that will be set by KeyringService
let keyringGetter: KeyringGetter | null = null;

export function setKeyringGetter(getter: KeyringGetter): void {
    keyringGetter = getter;
}

class DisplayKeyring {
    accounts: string[] = [];
    type = '';
    private currentPage = 0;
    private readonly perPage = 5;

    constructor(keyring: AnyKeyring) {
        this.accounts = keyring.getAccounts();
        this.type = keyring.type;
    }

    private getKeyring(): Keyring | AnyKeyring {
        if (!keyringGetter) {
            throw new Error('KeyringGetter not initialized');
        }
        return keyringGetter(this.accounts[0], this.type);
    }

    getFirstPage = () => {
        const keyring = this.getKeyring();
        if (isHDKeyring(keyring)) {
            this.currentPage = 0;
            return keyring.getAddressesPage(this.currentPage, this.perPage);
        } else {
            return [];
        }
    };

    getNextPage = () => {
        const keyring = this.getKeyring();
        if (isHDKeyring(keyring)) {
            this.currentPage++;
            return keyring.getAddressesPage(this.currentPage, this.perPage);
        } else {
            return [];
        }
    };

    getAccounts = () => {
        const keyring = this.getKeyring();
        return keyring.getAccounts();
    };

    activateAccounts = (indexes: number[]): string[] => {
        const keyring = this.getKeyring();
        if (isHDKeyring(keyring)) {
            return keyring.activateAccounts(indexes);
        } else {
            return [];
        }
    };

    getHdPath = (): string => {
        if (this.accounts.length === 0) return '';
        const keyring = this.getKeyring();
        if (isHDKeyring(keyring)) {
            return keyring.hdPath;
        }
        return '';
    };
}

export default DisplayKeyring;
