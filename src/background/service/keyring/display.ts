import { isHDKeyring } from '@/background/utils/keyring';
import KeyringService, { Keyring } from './index';

// Type for keyring that may be Keyring, EmptyKeyring, or HdKeyring
type AnyKeyring = Keyring | { type: string; getAccounts(): string[] };

class DisplayKeyring {
    accounts: string[] = [];
    type = '';
    private currentPage = 0;
    private readonly perPage = 5;

    constructor(keyring: AnyKeyring) {
        this.accounts = keyring.getAccounts();
        this.type = keyring.type;
    }

    getFirstPage = () => {
        const keyring = KeyringService.getKeyringForAccount(this.accounts[0], this.type);
        if (isHDKeyring(keyring)) {
            this.currentPage = 0;
            return keyring.getAddressesPage(this.currentPage, this.perPage);
        } else {
            return [];
        }
    };

    getNextPage = () => {
        const keyring = KeyringService.getKeyringForAccount(this.accounts[0], this.type);
        if (isHDKeyring(keyring)) {
            this.currentPage++;
            return keyring.getAddressesPage(this.currentPage, this.perPage);
        } else {
            return [];
        }
    };

    getAccounts = () => {
        const keyring = KeyringService.getKeyringForAccount(this.accounts[0], this.type);
        return keyring.getAccounts();
    };

    activateAccounts = (indexes: number[]): string[] => {
        const keyring = KeyringService.getKeyringForAccount(this.accounts[0], this.type);
        if (isHDKeyring(keyring)) {
            return keyring.activateAccounts(indexes);
        } else {
            return [];
        }
    };

    getHdPath = (): string => {
        if (this.accounts.length === 0) return '';
        const keyring = KeyringService.getKeyringForAccount(this.accounts[0], this.type);
        if (isHDKeyring(keyring)) {
            return keyring.hdPath;
        }
        return '';
    };
}

export default DisplayKeyring;
