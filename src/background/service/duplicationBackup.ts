/**
 * Duplication Backup Service
 *
 * Creates encrypted backups of all wallets before duplication resolution.
 * Stores backups in a separate storage key and provides file export.
 */

import * as encryptor from '@btc-vision/passworder';
import { HdKeyring, SimpleKeyring } from '@btc-vision/wallet-sdk';

import { DUPLICATION_BACKUP_STORAGE_KEY, DUPLICATION_BACKUP_VERSION, KEYRING_TYPE } from '@/shared/constant';
import { AddressTypes } from '@/shared/types';
import {
    BackupAccountData,
    BackupKeyringData,
    DuplicationBackup,
    DuplicationConflict
} from '@/shared/types/Duplication';
import { browserStorageLocalGet, browserStorageLocalSet } from '../webapi/browser';
import keyringService, { HdKeyringSerializedOptions, SimpleKeyringSerializedOptions } from './keyring';

class DuplicationBackupService {
    /**
     * Create encrypted backup of all keyrings
     * Must be called before any resolution actions
     */
    async createBackup(password: string, conflicts: DuplicationConflict[]): Promise<DuplicationBackup> {
        const keyrings = await this.serializeAllKeyrings();

        const backup: DuplicationBackup = {
            version: DUPLICATION_BACKUP_VERSION,
            createdAt: Date.now(),
            keyrings,
            conflicts
        };

        // Encrypt and store in separate storage key
        const encryptedBackup = await encryptor.encrypt(password, JSON.stringify(backup));
        await browserStorageLocalSet({ [DUPLICATION_BACKUP_STORAGE_KEY]: encryptedBackup });

        return backup;
    }

    /**
     * Get stored backup (decrypted)
     */
    async getBackup(password: string): Promise<DuplicationBackup | null> {
        const result = await browserStorageLocalGet(DUPLICATION_BACKUP_STORAGE_KEY);
        const stored = result?.[DUPLICATION_BACKUP_STORAGE_KEY];
        if (!stored || typeof stored !== 'string') {
            return null;
        }

        try {
            const decrypted = (await encryptor.decrypt(password, stored)) as string;
            return JSON.parse(decrypted) as DuplicationBackup;
        } catch {
            return null;
        }
    }

    /**
     * Check if backup exists
     */
    async hasBackup(): Promise<boolean> {
        const result = await browserStorageLocalGet(DUPLICATION_BACKUP_STORAGE_KEY);
        const stored = result?.[DUPLICATION_BACKUP_STORAGE_KEY];
        return !!stored;
    }

    /**
     * Export backup as downloadable file content
     * Returns the encrypted backup string that can be saved to a file
     */
    async exportBackupToFile(password: string): Promise<{ content: string; filename: string }> {
        const result = await browserStorageLocalGet(DUPLICATION_BACKUP_STORAGE_KEY);
        const stored = result?.[DUPLICATION_BACKUP_STORAGE_KEY];
        if (!stored || typeof stored !== 'string') {
            throw new Error('No backup found. Create backup first.');
        }

        // Verify password by attempting to decrypt
        try {
            await encryptor.decrypt(password, stored);
        } catch {
            throw new Error('Invalid password');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `opwallet-backup-${timestamp}.json`;

        // Return the encrypted content - user will import with password
        return {
            content: JSON.stringify({
                type: 'opwallet-duplication-backup',
                version: DUPLICATION_BACKUP_VERSION,
                encrypted: stored
            }),
            filename
        };
    }

    /**
     * Clear backup after successful resolution
     */
    async clearBackup(): Promise<void> {
        await browserStorageLocalSet({ [DUPLICATION_BACKUP_STORAGE_KEY]: null });
    }

    /**
     * Serialize all keyrings for backup
     * Includes all sensitive data (mnemonics, private keys, quantum keys)
     */
    private async serializeAllKeyrings(): Promise<BackupKeyringData[]> {
        const keyrings = keyringService.keyrings;
        const addressTypes = keyringService.addressTypes;
        const result: BackupKeyringData[] = [];

        for (let i = 0; i < keyrings.length; i++) {
            const keyring = keyrings[i];
            const addressType = addressTypes[i];

            if (keyring instanceof HdKeyring) {
                const serialized = keyring.serialize() as HdKeyringSerializedOptions;
                const accounts = keyring.getAccounts();

                const accountsData: BackupAccountData[] = accounts.map((pubkey) => {
                    let quantumPublicKeyHash: string | undefined;
                    let address = '';

                    try {
                        const wallet = keyring.getWallet(pubkey);
                        address = wallet?.address?.toHex()?.replace('0x', '') || '';
                        if (wallet?.mldsaKeypair) {
                            quantumPublicKeyHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                        }
                    } catch {
                        // Skip if wallet retrieval fails
                    }

                    return {
                        pubkey,
                        address,
                        quantumPublicKeyHash
                    };
                });

                result.push({
                    keyringIndex: i,
                    keyringType: KEYRING_TYPE.HdKeyring,
                    addressType: String(addressType),
                    mnemonic: serialized.mnemonic,
                    passphrase: serialized.passphrase,
                    hdPath: undefined, // HD path is derived from addressType in wallet-sdk 2.0
                    activeIndexes: serialized.activeIndexes ? [...serialized.activeIndexes] : undefined,
                    accounts: accountsData
                });
            } else if (keyring instanceof SimpleKeyring) {
                const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
                const accounts = keyring.getAccounts();

                const accountsData: BackupAccountData[] = accounts.map((pubkey) => {
                    let quantumPublicKeyHash: string | undefined;
                    let address = '';

                    try {
                        // SimpleKeyring.getAddress only takes addressType
                        address = keyring.getAddress(addressType);
                        if (keyring.hasQuantumKey()) {
                            quantumPublicKeyHash = keyring.getQuantumPublicKeyHash()?.toLowerCase();
                        }
                    } catch {
                        // Skip if retrieval fails
                    }

                    return {
                        pubkey,
                        address,
                        quantumPublicKeyHash
                    };
                });

                // Get quantum private key if exists
                let quantumPrivateKey: string | undefined;
                try {
                    if (keyring.hasQuantumKey()) {
                        quantumPrivateKey = serialized.quantumPrivateKey;
                    }
                } catch {
                    // Quantum key not available
                }

                result.push({
                    keyringIndex: i,
                    keyringType: KEYRING_TYPE.SimpleKeyring,
                    addressType: String(addressType),
                    privateKey: serialized.privateKey,
                    quantumPrivateKey,
                    accounts: accountsData
                });
            }
        }

        return result;
    }

    /**
     * Restore backup to a readable format for display
     * Does NOT restore wallets - just for viewing backup contents
     */
    async getBackupSummary(password: string): Promise<{
        walletCount: number;
        hdWalletCount: number;
        simpleWalletCount: number;
        createdAt: number;
        conflicts: DuplicationConflict[];
    } | null> {
        const backup = await this.getBackup(password);
        if (!backup) {
            return null;
        }

        const hdWalletCount = backup.keyrings.filter((k) => k.keyringType === KEYRING_TYPE.HdKeyring).length;
        const simpleWalletCount = backup.keyrings.filter((k) => k.keyringType === KEYRING_TYPE.SimpleKeyring).length;

        return {
            walletCount: backup.keyrings.length,
            hdWalletCount,
            simpleWalletCount,
            createdAt: backup.createdAt,
            conflicts: backup.conflicts
        };
    }

    /**
     * Import backup from file content
     * Parses the exported file format and stores it
     */
    async importBackupFromFile(fileContent: string, password: string): Promise<DuplicationBackup> {
        try {
            const parsed = JSON.parse(fileContent);

            if (parsed.type !== 'opwallet-duplication-backup') {
                throw new Error('Invalid backup file format');
            }

            if (!parsed.encrypted) {
                throw new Error('Backup file is missing encrypted data');
            }

            // Verify password by attempting to decrypt
            const decrypted = (await encryptor.decrypt(password, parsed.encrypted)) as string;
            const backup = JSON.parse(decrypted) as DuplicationBackup;

            // Store the encrypted backup
            await browserStorageLocalSet({ [DUPLICATION_BACKUP_STORAGE_KEY]: parsed.encrypted });

            return backup;
        } catch (e) {
            if (e instanceof Error && e.message.includes('Invalid backup file')) {
                throw e;
            }
            throw new Error('Failed to import backup. Check file format and password.');
        }
    }

    /**
     * Restore wallets from backup
     * WARNING: This will clear existing keyrings and restore from backup
     */
    async restoreFromBackup(password: string): Promise<{
        restored: number;
        errors: string[];
    }> {
        const backup = await this.getBackup(password);
        if (!backup) {
            throw new Error('No backup found or invalid password');
        }

        const errors: string[] = [];
        let restored = 0;

        // Clear existing keyrings first
        await keyringService.clearKeyrings();

        for (const keyringData of backup.keyrings) {
            try {
                const addressType = parseInt(keyringData.addressType, 10) as unknown as AddressTypes;

                if (keyringData.keyringType === KEYRING_TYPE.HdKeyring && keyringData.mnemonic) {
                    // Restore HD wallet
                    await keyringService.createKeyringWithMnemonics(
                        keyringData.mnemonic,
                        '', // hdPath (ignored in wallet-sdk 2.0)
                        keyringData.passphrase || '',
                        addressType,
                        keyringData.activeIndexes?.length || 1
                    );
                    restored++;
                } else if (keyringData.keyringType === KEYRING_TYPE.SimpleKeyring && keyringData.privateKey) {
                    // Restore Simple wallet with quantum key if available
                    await keyringService.importPrivateKey(
                        keyringData.privateKey,
                        addressType,
                        undefined, // network defaults to mainnet
                        keyringData.quantumPrivateKey
                    );
                    restored++;
                }
            } catch (e) {
                errors.push(`Failed to restore keyring ${keyringData.keyringIndex}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        return { restored, errors };
    }
}

export default new DuplicationBackupService();
