import { keyringService, contactBookService } from '@/background/service';
import { DisplayedKeyring, Keyring } from '@/background/service/keyring';
import { ContactBookItem } from '@/background/service/contactBook';
import { KEYRING_TYPE, KEYRING_TYPES } from '@/shared/constant';
import { Account, AddressType, WalletKeyring } from '@/shared/types';

import { WalletControllerError } from './WalletControllerError';

export class AccountManager {
    public async boot(password: string): Promise<void> {
        try {
            await keyringService.boot(password);
        } catch (err) {
            throw new WalletControllerError(`Failed to boot keyringService: ${String(err)}`, {
                originalError: err
            });
        }
    }

    public isBooted(): boolean {
        return keyringService.isBooted();
    }

    public hasVault(): boolean {
        return keyringService.hasVault();
    }

    public verifyPassword(password: string): Promise<boolean> {
        return keyringService.verifyPassword(password);
    }

    public changePassword(password: string, newPassword: string): Promise<void> {
        return keyringService.changePassword(password, newPassword);
    }

    public isReady(): boolean {
        return keyringService.isReady();
    }

    public async unlock(password: string): Promise<void> {
        const alianNameInited = keyringService.loadAlianNameInited();
        const alianNames = keyringService.getAllAlianName();
        
        await keyringService.unlock(password);
        
        if (!alianNameInited && alianNames.length === 0) {
            await this.initAlianNames();
            keyringService.saveAlianNameInited();
        }
    }

    public isUnlocked(): boolean {
        return keyringService.isUnlocked();
    }

    public async lockWallet(): Promise<void> {
        await keyringService.lockWallet();
    }

    public getCurrentAccount(): Account | null {
        return keyringService.getCurrentAccount();
    }

    public async getAccounts(): Promise<Account[]> {
        return keyringService.getAccounts();
    }

    public async changeKeyring(
        keyring: WalletKeyring, 
        accountIndex?: number
    ): Promise<void> {
        keyringService.changeKeyring(keyring, accountIndex);
    }

    public async initAlianNames(): Promise<void> {
        const keyrings = keyringService.getKeyringAccountsData();
        const contacts = contactBookService.listContacts();
        const alianNames = keyringService.getAllAlianName();
        if (contacts.length !== 0 && keyrings.length !== 0) {
            const sameAddressList = alianNames.filter(
                (item) => item && contacts.find((contact) => contact.address === item.address)
            );
            if (sameAddressList.length > 0) {
                sameAddressList.forEach((item) => {
                    if (item) {
                        contactBookService.removeContact(item.address);
                    }
                });
            }
        }
    }

    public getAllAlianName(): (ContactBookItem | undefined)[] {
        return keyringService.getAllAlianName();
    }

    public getKeyringAccountsData(): DisplayedKeyring[] {
        return keyringService.getKeyringAccountsData();
    }

    public async getCurrentKeyringAccounts(): Promise<Account[]> {
        return keyringService.getCurrentKeyringAccounts();
    }

    public async getKeyringByType(type: string): Promise<Keyring[]> {
        return keyringService.getKeyringByType(type);
    }

    public async deriveNewAccountFromMnemonic(
        keyring: Keyring, 
        alianName?: string
    ): Promise<Account[]> {
        const accounts = await keyringService.deriveNewAccountFromMnemonic(
            keyring, 
            alianName
        );
        return accounts;
    }

    public async getEditingKeyring(): Promise<Keyring> {
        return keyringService.getEditingKeyring();
    }

    public async updateKeyringPassword(
        keyring: Keyring, 
        newPassword: string
    ): Promise<Keyring> {
        return keyringService.updateKeyringPassword(keyring, newPassword);
    }

    public async createKeyringWithMnemonics(
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressType,
        accountCount: number
    ): Promise<Keyring> {
        return keyringService.createKeyringWithMnemonics(
            mnemonic,
            hdPath,
            passphrase,
            addressType,
            accountCount
        );
    }

    public async createKeyringWithPrivateKey(
        data: string, 
        addressType: AddressType
    ): Promise<Account> {
        return keyringService.createKeyringWithPrivateKey(data, addressType);
    }

    public async createKeyringWithKeystone(
        ur: string, 
        addressType: AddressType, 
        hdPath: string, 
        accountIndex: number
    ): Promise<Keyring> {
        return keyringService.createKeyringWithKeystone(ur, addressType, hdPath, accountIndex);
    }

    public async createTmpKeyringWithMnemonics(
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressType,
        accountCount: number
    ): Promise<Account[]> {
        return keyringService.createTmpKeyringWithMnemonics(
            mnemonic,
            hdPath,
            passphrase,
            addressType,
            accountCount
        );
    }

    public async createTmpKeyringWithPrivateKey(
        privateKey: string, 
        addressType: AddressType
    ): Promise<Account> {
        return keyringService.createTmpKeyringWithPrivateKey(privateKey, addressType);
    }

    public async createTmpKeyringWithKeystone(
        ur: string, 
        addressType: AddressType, 
        hdPath: string, 
        accountIndex: number
    ): Promise<Account[]> {
        return keyringService.createTmpKeyringWithKeystone(ur, addressType, hdPath, accountIndex);
    }

    public async removeKeyring(keyring: Keyring): Promise<void> {
        return keyringService.removeKeyring(keyring);
    }

    public async addKeyringToUI(keyring: Keyring): Promise<void> {
        keyringService.addKeyringToUI(keyring);
    }

    public async getEditingAccount(): Promise<Account> {
        return keyringService.getEditingAccount();
    }

    public getKeyringTypeByType(type: KEYRING_TYPE): KEYRING_TYPES {
        return keyringService.getKeyringTypeByType(type);
    }
}