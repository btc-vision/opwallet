/**
 * Duplication Detection Service
 *
 * Detects duplicate wallets (same WIF/mnemonic imported multiple times)
 * and duplicate MLDSA keys (same MLDSA key on multiple wallets).
 */

import { EventEmitter } from 'events';

import { KEYRING_TYPE } from '@/shared/constant';
import { networkTypeToOPNet } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import {
    DuplicationConflict,
    DuplicationDetectionResult,
    DuplicateWalletInfo,
    KeyringFingerprint,
    OnChainLinkageInfo
} from '@/shared/types/Duplication';
import { MessageSigner } from '@btc-vision/transaction';
import { fromHex, fromUtf8, toHex } from '@btc-vision/bitcoin';
import { HdKeyring, publicKeyToAddressWithNetworkType, SimpleKeyring } from '@btc-vision/wallet-sdk';

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

        const result = {
            hasDuplicates: walletDuplicates.length > 0 || mldsaDuplicates.length > 0,
            walletDuplicates,
            mldsaDuplicates,
            totalConflicts: walletDuplicates.length + mldsaDuplicates.length,
            detectedAt: Date.now()
        };

        if (result.hasDuplicates) {
            console.log(`[DuplicationDetection] Found ${result.totalConflicts} conflicts`);
        }

        return result;
    }

    /**
     * Detect same WIF/mnemonic imported multiple times
     * Only reports as conflict if MLDSA keys are different
     * Same wallet + same MLDSA = true duplicate (just redundant copies)
     */
    async detectWalletDuplicates(): Promise<DuplicationConflict[]> {
        const keyrings = keyringService.keyrings;
        const addressTypes = keyringService.addressTypes;
        // Map: privateKeyHash -> { mldsaHash -> wallets[] }
        const privateKeyHashMap = new Map<string, Map<string, DuplicateWalletInfo[]>>();

        for (let i = 0; i < keyrings.length; i++) {
            const keyring = keyrings[i];
            const addressType = addressTypes[i];

            let privateKeyHash: string | undefined;
            let mldsaHash: string | undefined;

            if (keyring instanceof SimpleKeyring) {
                const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
                privateKeyHash = this.hashKey(serialized.privateKey);
                if (keyring.hasQuantumKey()) {
                    try {
                        mldsaHash = keyring.getQuantumPublicKeyHash()?.toLowerCase() || 'no_mldsa';
                    } catch {
                        mldsaHash = 'no_mldsa';
                    }
                } else {
                    mldsaHash = 'no_mldsa';
                }
            } else if (keyring instanceof HdKeyring) {
                const serialized = keyring.serialize() as HdKeyringSerializedOptions;
                const mnemonicKey = (serialized.mnemonic || '') + '|' + (serialized.passphrase || '');
                privateKeyHash = this.hashKey(mnemonicKey);
                const accounts = keyring.getAccounts();
                if (accounts[0]) {
                    try {
                        const wallet = keyring.getWallet(accounts[0]);
                        if (wallet?.mldsaKeypair) {
                            mldsaHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                        } else {
                            mldsaHash = 'no_mldsa';
                        }
                    } catch {
                        mldsaHash = 'no_mldsa';
                    }
                } else {
                    mldsaHash = 'no_mldsa';
                }
            }

            if (privateKeyHash && mldsaHash && (keyring instanceof SimpleKeyring || keyring instanceof HdKeyring)) {
                const info = await this.getWalletInfo(i, keyring, addressType);

                let mldsaMap = privateKeyHashMap.get(privateKeyHash);
                if (!mldsaMap) {
                    mldsaMap = new Map();
                    privateKeyHashMap.set(privateKeyHash, mldsaMap);
                }
                let walletList = mldsaMap.get(mldsaHash);
                if (!walletList) {
                    walletList = [];
                    mldsaMap.set(mldsaHash, walletList);
                }
                walletList.push(info);
            }
        }

        // Create conflicts only when:
        // 1. Same private key with DIFFERENT MLDSA keys (conflict - user needs to choose)
        // 2. Same private key with same MLDSA - these are true duplicates (one can be deleted)
        const conflicts: DuplicationConflict[] = [];
        privateKeyHashMap.forEach((mldsaMap, privateKeyHash) => {
            // Get all unique MLDSA keys for this private key
            const mldsaKeys = Array.from(mldsaMap.keys());
            const allWallets = Array.from(mldsaMap.values()).flat();

            if (allWallets.length > 1) {
                // There are duplicates
                if (mldsaKeys.length === 1) {
                    // All duplicates have the SAME MLDSA (or all no_mldsa)
                    // This is a "true duplicate" - just redundant copies
                    conflicts.push({
                        type: 'WALLET_DUPLICATE',
                        conflictId: `wallet_same_${privateKeyHash.substring(0, 16)}`,
                        description: 'IDENTICAL WALLET COPIES - Can safely delete duplicates',
                        wallets: allWallets
                    });
                } else {
                    // Different MLDSA keys on same private key - this is the main conflict
                    conflicts.push({
                        type: 'WALLET_DUPLICATE',
                        conflictId: `wallet_diff_${privateKeyHash.substring(0, 16)}`,
                        description: 'SAME WALLET WITH DIFFERENT MLDSA KEYS - Must choose correct one',
                        wallets: allWallets
                    });
                }
            }
        });

        return conflicts;
    }

    /**
     * Detect same MLDSA private key on DIFFERENT Bitcoin wallets
     * This is problematic - same MLDSA should not be on different addresses
     * Excludes wallets that are true duplicates (same private key)
     */
    async detectMldsaDuplicates(): Promise<DuplicationConflict[]> {
        const keyrings = keyringService.keyrings;
        const addressTypes = keyringService.addressTypes;
        // Map: mldsaHash -> { privateKeyHash -> wallets[] }
        const mldsaHashMap = new Map<string, Map<string, DuplicateWalletInfo[]>>();

        for (let i = 0; i < keyrings.length; i++) {
            const keyring = keyrings[i];
            const addressType = addressTypes[i];
            let mldsaHash: string | undefined;
            let privateKeyHash: string | undefined;

            if (keyring instanceof SimpleKeyring) {
                const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
                privateKeyHash = this.hashKey(serialized.privateKey);
                if (keyring.hasQuantumKey()) {
                    try {
                        mldsaHash = keyring.getQuantumPublicKeyHash()?.toLowerCase();
                    } catch {
                        // Quantum key not available
                    }
                }
            } else if (keyring instanceof HdKeyring) {
                const serialized = keyring.serialize() as HdKeyringSerializedOptions;
                const mnemonicKey = (serialized.mnemonic || '') + '|' + (serialized.passphrase || '');
                privateKeyHash = this.hashKey(mnemonicKey);
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

            if (mldsaHash && privateKeyHash && (keyring instanceof SimpleKeyring || keyring instanceof HdKeyring)) {
                const info = await this.getWalletInfo(i, keyring, addressType);

                let privateKeyMap = mldsaHashMap.get(mldsaHash);
                if (!privateKeyMap) {
                    privateKeyMap = new Map();
                    mldsaHashMap.set(mldsaHash, privateKeyMap);
                }
                let walletList = privateKeyMap.get(privateKeyHash);
                if (!walletList) {
                    walletList = [];
                    privateKeyMap.set(privateKeyHash, walletList);
                }
                walletList.push(info);
            }
        }

        // Only report as MLDSA conflict if same MLDSA is on DIFFERENT private keys
        const conflicts: DuplicationConflict[] = [];
        mldsaHashMap.forEach((privateKeyMap, mldsaHash) => {
            const privateKeyHashes = Array.from(privateKeyMap.keys());

            // Only a conflict if same MLDSA on wallets with DIFFERENT private keys
            if (privateKeyHashes.length > 1) {
                const allWallets = Array.from(privateKeyMap.values()).flat();
                conflicts.push({
                    type: 'MLDSA_DUPLICATE',
                    conflictId: `mldsa_${mldsaHash.substring(0, 16)}`,
                    description: 'SAME MLDSA KEY ON DIFFERENT BITCOIN WALLETS - Invalid configuration',
                    wallets: allWallets
                });
            }
            // If same MLDSA on same private key, it's handled by detectWalletDuplicates
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
                        localMldsaHash = toHex(
                            MessageSigner.sha256(fromHex(account.quantumPublicKey))
                        );
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
        addressType: AddressTypes
    ): Promise<DuplicateWalletInfo> {
        const accounts = keyring.getAccounts();
        const pubkey = accounts[0] || '';
        let address = '';
        let mldsaPublicKeyHash: string | undefined;
        let mldsaPrivateKeyExists = false;
        let onChainLinkedMldsaHash: string | undefined;
        let isOnChainMatch = false; // Only true if MLDSA exists AND matches on-chain

        const networkType = preference.store.networkType;

        // Derive Bitcoin address from pubkey using proper method
        try {
            address = publicKeyToAddressWithNetworkType(
                pubkey,
                addressType,
                networkTypeToOPNet(networkType)
            );
        } catch (e) {
            console.error(`[DuplicationDetection] Address derivation failed for keyring ${keyringIndex}:`, e);
        }

        // Get MLDSA info
        if (keyring instanceof HdKeyring) {
            try {
                const wallet = keyring.getWallet(pubkey);
                if (wallet?.mldsaKeypair) {
                    // MLDSA public key hash is from the Address object
                    mldsaPublicKeyHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                    mldsaPrivateKeyExists = true;
                }
            } catch {
                // MLDSA retrieval failed
            }
        } else if (keyring instanceof SimpleKeyring) {
            try {
                if (keyring.hasQuantumKey()) {
                    mldsaPublicKeyHash = keyring.getQuantumPublicKeyHash()?.toLowerCase();
                    mldsaPrivateKeyExists = true;
                }
            } catch {
                // Quantum key retrieval failed
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
            // On-chain verification failed silently
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
            const buffer = fromUtf8(key);
            return toHex(MessageSigner.sha256(buffer));
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
