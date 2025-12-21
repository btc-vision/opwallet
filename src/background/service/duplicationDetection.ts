/**
 * Duplication Detection Service
 *
 * Detects duplicate wallets (same WIF/mnemonic imported multiple times)
 * and duplicate MLDSA keys (same MLDSA key on multiple wallets).
 */

import { EventEmitter } from 'events';

import { KEYRING_TYPE } from '@/shared/constant';
import { AddressTypes } from '@/shared/types';
import {
    DuplicationConflict,
    DuplicationDetectionResult,
    DuplicateWalletInfo,
    KeyringFingerprint,
    OnChainLinkageInfo
} from '@/shared/types/Duplication';
import { MessageSigner } from '@btc-vision/transaction';
import { HdKeyring, SimpleKeyring } from '@btc-vision/wallet-sdk';

import keyringService, { HdKeyringSerializedOptions, SimpleKeyringSerializedOptions } from './keyring';
import preference from './preference';
import Web3API from '@/shared/web3/Web3API';

class DuplicationDetectionService extends EventEmitter {
    /**
     * Main detection method - runs on every unlock
     * Detects both wallet duplicates and MLDSA duplicates
     */
    async detectDuplicates(): Promise<DuplicationDetectionResult> {
        const walletDuplicates = await this.detectWalletDuplicates();
        const mldsaDuplicates = await this.detectMldsaDuplicates();

        return {
            hasDuplicates: walletDuplicates.length > 0 || mldsaDuplicates.length > 0,
            walletDuplicates,
            mldsaDuplicates,
            totalConflicts: walletDuplicates.length + mldsaDuplicates.length,
            detectedAt: Date.now()
        };
    }

    /**
     * Detect same WIF/mnemonic imported multiple times
     */
    async detectWalletDuplicates(): Promise<DuplicationConflict[]> {
        const keyrings = keyringService.keyrings;
        const addressTypes = keyringService.addressTypes;
        const privateKeyHashMap = new Map<string, DuplicateWalletInfo[]>();

        for (let i = 0; i < keyrings.length; i++) {
            const keyring = keyrings[i];
            const addressType = addressTypes[i];

            if (keyring instanceof SimpleKeyring) {
                // Get the private key and hash it
                const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
                const privateKeyHash = this.hashKey(serialized.privateKey);

                const info = await this.getWalletInfo(i, keyring as SimpleKeyring, addressType);

                if (!privateKeyHashMap.has(privateKeyHash)) {
                    privateKeyHashMap.set(privateKeyHash, []);
                }
                privateKeyHashMap.get(privateKeyHash)!.push(info);
            } else if (keyring instanceof HdKeyring) {
                // Get the mnemonic and hash it with passphrase
                const serialized = keyring.serialize() as HdKeyringSerializedOptions;
                const mnemonicKey = (serialized.mnemonic || '') + '|' + (serialized.passphrase || '');
                const mnemonicHash = this.hashKey(mnemonicKey);

                const info = await this.getWalletInfo(i, keyring as HdKeyring, addressType);

                if (!privateKeyHashMap.has(mnemonicHash)) {
                    privateKeyHashMap.set(mnemonicHash, []);
                }
                privateKeyHashMap.get(mnemonicHash)!.push(info);
            }
        }

        // Filter for duplicates (more than 1 wallet with same hash)
        const conflicts: DuplicationConflict[] = [];
        privateKeyHashMap.forEach((wallets, hash) => {
            if (wallets.length > 1) {
                conflicts.push({
                    type: 'WALLET_DUPLICATE',
                    conflictId: `wallet_${hash.substring(0, 16)}`,
                    description: 'DUPLICATED WALLET DETECTED!',
                    wallets
                });
            }
        });

        return conflicts;
    }

    /**
     * Detect same MLDSA private key on multiple wallets
     */
    async detectMldsaDuplicates(): Promise<DuplicationConflict[]> {
        const keyrings = keyringService.keyrings;
        const addressTypes = keyringService.addressTypes;
        const mldsaHashMap = new Map<string, DuplicateWalletInfo[]>();

        for (let i = 0; i < keyrings.length; i++) {
            const keyring = keyrings[i];
            const addressType = addressTypes[i];
            let mldsaHash: string | undefined;

            if (keyring instanceof SimpleKeyring && keyring.hasQuantumKey()) {
                try {
                    mldsaHash = keyring.getQuantumPublicKeyHash()?.toLowerCase();
                } catch {
                    // Quantum key not available
                }
            } else if (keyring instanceof HdKeyring) {
                const accounts = keyring.getAccounts();
                if (accounts[0]) {
                    try {
                        const wallet = keyring.getWallet(accounts[0]);
                        if (wallet?.mldsaKeypair) {
                            mldsaHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                        }
                    } catch {
                        // MLDSA key not available
                    }
                }
            }

            if (mldsaHash && (keyring instanceof SimpleKeyring || keyring instanceof HdKeyring)) {
                const info = await this.getWalletInfo(i, keyring, addressType);

                if (!mldsaHashMap.has(mldsaHash)) {
                    mldsaHashMap.set(mldsaHash, []);
                }
                mldsaHashMap.get(mldsaHash)!.push(info);
            }
        }

        // Filter for duplicates (more than 1 wallet with same MLDSA)
        const conflicts: DuplicationConflict[] = [];
        mldsaHashMap.forEach((wallets, hash) => {
            if (wallets.length > 1) {
                conflicts.push({
                    type: 'MLDSA_DUPLICATE',
                    conflictId: `mldsa_${hash.substring(0, 16)}`,
                    description: 'DUPLICATED MLDSA WALLET FOUND',
                    wallets
                });
            }
        });

        return conflicts;
    }

    /**
     * Verify on-chain MLDSA linkage for all wallets
     */
    async verifyOnChainLinkage(): Promise<Map<string, OnChainLinkageInfo>> {
        const results = new Map<string, OnChainLinkageInfo>();
        const allPubkeys = keyringService.getAllPubkeys();

        for (const account of allPubkeys) {
            try {
                const pubKeyInfo = await Web3API.provider.getPublicKeysInfoRaw(account.pubkey);
                const info = pubKeyInfo[account.pubkey];

                if (info && !('error' in info)) {
                    const onChainMldsaHash = (info as { mldsaHashedPublicKey?: string }).mldsaHashedPublicKey;
                    let localMldsaHash: string | undefined;

                    if (account.quantumPublicKey) {
                        localMldsaHash = Buffer.from(
                            MessageSigner.sha256(Buffer.from(account.quantumPublicKey, 'hex'))
                        ).toString('hex');
                    }

                    results.set(account.pubkey, {
                        pubkey: account.pubkey,
                        onChainMldsaHash,
                        localMldsaHash,
                        matches: onChainMldsaHash ? onChainMldsaHash === localMldsaHash : true,
                        hasOnChainLinkage: !!onChainMldsaHash
                    });
                } else {
                    results.set(account.pubkey, {
                        pubkey: account.pubkey,
                        onChainMldsaHash: undefined,
                        localMldsaHash: undefined,
                        matches: true,
                        hasOnChainLinkage: false
                    });
                }
            } catch {
                // No on-chain linkage or error fetching
                results.set(account.pubkey, {
                    pubkey: account.pubkey,
                    onChainMldsaHash: undefined,
                    localMldsaHash: undefined,
                    matches: true,
                    hasOnChainLinkage: false
                });
            }
        }

        return results;
    }

    /**
     * Get all keyring fingerprints for comparison
     */
    getAllKeyringFingerprints(): Map<number, KeyringFingerprint> {
        const result = new Map<number, KeyringFingerprint>();
        const keyrings = keyringService.keyrings;

        for (let i = 0; i < keyrings.length; i++) {
            const keyring = keyrings[i];
            const fingerprint: KeyringFingerprint = {
                index: i,
                type: keyring.type,
                privateKeyHash: '',
                mldsaHash: undefined
            };

            if (keyring instanceof SimpleKeyring) {
                const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
                fingerprint.privateKeyHash = this.hashKey(serialized.privateKey);

                if (keyring.hasQuantumKey()) {
                    try {
                        fingerprint.mldsaHash = keyring.getQuantumPublicKeyHash()?.toLowerCase();
                    } catch {
                        // Quantum key not available
                    }
                }
            } else if (keyring instanceof HdKeyring) {
                const serialized = keyring.serialize() as HdKeyringSerializedOptions;
                fingerprint.privateKeyHash = this.hashKey(
                    (serialized.mnemonic || '') + '|' + (serialized.passphrase || '')
                );

                const accounts = keyring.getAccounts();
                if (accounts[0]) {
                    try {
                        const wallet = keyring.getWallet(accounts[0]);
                        if (wallet?.mldsaKeypair) {
                            fingerprint.mldsaHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                        }
                    } catch {
                        // MLDSA key not available
                    }
                }
            }

            result.set(i, fingerprint);
        }

        return result;
    }

    /**
     * Get wallet info for a specific keyring
     */
    private async getWalletInfo(
        keyringIndex: number,
        keyring: HdKeyring | SimpleKeyring,
        addressType: string
    ): Promise<DuplicateWalletInfo> {
        const accounts = keyring.getAccounts();
        const pubkey = accounts[0] || '';
        let address = '';
        let mldsaPublicKeyHash: string | undefined;
        let mldsaPrivateKeyExists = false;
        let onChainLinkedMldsaHash: string | undefined;
        let isOnChainMatch = true;

        // Get address
        if (keyring instanceof HdKeyring) {
            try {
                const wallet = keyring.getWallet(pubkey);
                address = wallet?.address?.toHex()?.replace('0x', '') || '';
                if (wallet?.mldsaKeypair) {
                    mldsaPublicKeyHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                    mldsaPrivateKeyExists = true;
                }
            } catch {
                // Address derivation failed
            }
        } else if (keyring instanceof SimpleKeyring) {
            try {
                // SimpleKeyring.getAddress takes addressType as AddressTypes
                const parsedAddressType =
                    typeof addressType === 'string' ? parseInt(addressType, 10) : addressType;
                address = keyring.getAddress(parsedAddressType as unknown as AddressTypes);
                if (keyring.hasQuantumKey()) {
                    mldsaPublicKeyHash = keyring.getQuantumPublicKeyHash()?.toLowerCase();
                    mldsaPrivateKeyExists = true;
                }
            } catch {
                // Address or quantum key retrieval failed
            }
        }

        // Try to get on-chain linkage info
        try {
            const pubKeyInfo = await Web3API.provider.getPublicKeysInfoRaw(pubkey);
            const info = pubKeyInfo[pubkey];
            if (info && !('error' in info)) {
                onChainLinkedMldsaHash = (info as { mldsaHashedPublicKey?: string }).mldsaHashedPublicKey;
                if (onChainLinkedMldsaHash && mldsaPublicKeyHash) {
                    isOnChainMatch = onChainLinkedMldsaHash.toLowerCase() === mldsaPublicKeyHash.toLowerCase();
                }
            }
        } catch {
            // On-chain verification failed, assume no linkage
        }

        // Get wallet name from preferences
        const keyringKey = `keyring_${keyringIndex}`;
        let alianName = `Wallet ${keyringIndex + 1}`;
        try {
            const storedName = await preference.getAccountAlianName(pubkey);
            if (storedName) {
                alianName = storedName;
            }
        } catch {
            // Use default name
        }

        // Get private key hash
        let privateKeyHash = '';
        if (keyring instanceof SimpleKeyring) {
            const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
            privateKeyHash = this.hashKey(serialized.privateKey);
        } else if (keyring instanceof HdKeyring) {
            const serialized = keyring.serialize() as HdKeyringSerializedOptions;
            privateKeyHash = this.hashKey((serialized.mnemonic || '') + '|' + (serialized.passphrase || ''));
        }

        return {
            keyringIndex,
            keyringKey,
            keyringType: keyring.type === KEYRING_TYPE.HdKeyring ? 'HD Key Tree' : 'Simple Key Pair',
            pubkey,
            address,
            privateKeyHash,
            mldsaPublicKeyHash,
            mldsaPrivateKeyExists,
            onChainLinkedMldsaHash,
            isOnChainMatch,
            alianName
        };
    }

    /**
     * Hash a key for comparison (SHA256)
     * Never store actual keys, only hashes for comparison
     */
    private hashKey(key: string): string {
        try {
            const buffer = Buffer.from(key, 'utf8');
            return Buffer.from(MessageSigner.sha256(buffer)).toString('hex');
        } catch {
            // Fallback to simple hash if MessageSigner fails
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
                const char = key.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash;
            }
            return hash.toString(16);
        }
    }
}

export default new DuplicationDetectionService();
