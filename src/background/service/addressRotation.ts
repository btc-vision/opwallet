/**
 * Address Rotation Service
 *
 * Manages the address rotation privacy feature. Provides rotating
 * taproot addresses for receiving funds, with a hidden MLDSA cold
 * wallet for secure storage.
 */
import { EventEmitter } from 'events';

import { HdKeyring, publicKeyToAddressWithNetworkType } from '@btc-vision/wallet-sdk';
import { AddressTypes, MLDSASecurityLevel } from '@btc-vision/transaction';
import { Network, networks } from '@btc-vision/bitcoin';
import * as bip39 from 'bip39';

import browser from '../webapi/browser';
import keyringService, { HdKeyringSerializedOptions } from './keyring';
import preferenceService from './preference';
import Web3API from '@/shared/web3/Web3API';
import {
    AddressRotationState,
    RotatedAddress,
    RotatedAddressStatus,
    RotationModeSettings,
    RotationModeSummary,
    ColdWalletInfo,
    ConsolidationParams,
    DEFAULT_ROTATION_STATE
} from '@/shared/types/AddressRotation';
import {
    ROTATION_STORAGE_KEY,
    ROTATION_GAP_LIMIT,
    DEFAULT_ROTATION_SETTINGS,
    MAX_CONSOLIDATION_UTXOS,
    COLD_WALLET_INDEX
} from '@/shared/constant/addressRotation';
import { KEYRING_TYPE, ChainType } from '@/shared/constant';
import { networkTypeToOPNet, NetworkType } from '@/shared/types';

interface RotationStore {
    settings: RotationModeSettings;
}

class AddressRotationService extends EventEmitter {
    private store: RotationStore = { settings: {} };
    private initialized = false;

    constructor() {
        super();
    }

    /**
     * Initialize the service - load state from browser storage
     */
    init = async (): Promise<void> => {
        if (this.initialized) return;

        try {
            const data = await browser.storage.local.get(ROTATION_STORAGE_KEY);
            if (data[ROTATION_STORAGE_KEY]) {
                this.store = data[ROTATION_STORAGE_KEY] as RotationStore;
            }
            this.initialized = true;
        } catch (error) {
            console.error('[AddressRotationService] Failed to initialize:', error);
            this.store = { settings: {} };
            this.initialized = true;
        }
    };

    /**
     * Persist state to browser storage
     */
    private persist = async (): Promise<void> => {
        try {
            await browser.storage.local.set({ [ROTATION_STORAGE_KEY]: this.store });
        } catch (error) {
            console.error('[AddressRotationService] Failed to persist:', error);
        }
    };

    /**
     * Get rotation state for an account
     */
    getRotationState = (accountPubkey: string): AddressRotationState | null => {
        return this.store.settings[accountPubkey] || null;
    };

    /**
     * Check if rotation mode is enabled for an account
     */
    isRotationEnabled = (accountPubkey: string): boolean => {
        const state = this.getRotationState(accountPubkey);
        return state?.enabled || false;
    };

    /**
     * Enable rotation mode for an account (HD wallet only)
     */
    enableRotationMode = async (
        keyringIndex: number,
        accountPubkey: string,
        network: Network = networks.bitcoin
    ): Promise<AddressRotationState> => {
        // Verify this is an HD keyring
        const keyring = keyringService.keyrings[keyringIndex];
        if (!keyring || keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new Error('Rotation mode only supported for HD wallets');
        }

        // Get mnemonic and passphrase from keyring
        const serialized = keyring.serialize() as HdKeyringSerializedOptions;
        if (!serialized.mnemonic) {
            throw new Error('No mnemonic found in keyring');
        }

        // Create initial state
        const now = Date.now();
        const state: AddressRotationState = {
            ...DEFAULT_ROTATION_STATE,
            enabled: true,
            enabledAt: now,
            lastUpdated: now,
            autoRotate: DEFAULT_ROTATION_SETTINGS.autoRotate,
            rotationThreshold: DEFAULT_ROTATION_SETTINGS.rotationThreshold,
            currentIndex: 0,
            maxUsedIndex: 0,
            rotatedAddresses: [],
            coldWallet: {
                isInitialized: true,
                totalBalance: '0',
                consolidationCount: 0
            }
        };

        // Derive the first hot address
        const firstAddress = await this.deriveRotationAddress(
            serialized.mnemonic,
            serialized.passphrase || '',
            0,
            network
        );

        state.rotatedAddresses.push({
            address: firstAddress.address,
            pubkey: firstAddress.pubkey,
            derivationIndex: 0,
            status: RotatedAddressStatus.ACTIVE,
            createdAt: now,
            totalReceived: '0',
            currentBalance: '0',
            utxoCount: 0
        });

        // Initialize cold wallet info (derive but don't store the address)
        const coldWallet = await this.deriveColdWalletInfo(
            serialized.mnemonic,
            serialized.passphrase || '',
            network
        );
        state.coldWallet = coldWallet;

        // Store state
        this.store.settings[accountPubkey] = state;
        await this.persist();

        this.emit('rotationEnabled', { accountPubkey, state });
        return state;
    };

    /**
     * Disable rotation mode for an account
     */
    disableRotationMode = async (accountPubkey: string): Promise<void> => {
        const state = this.store.settings[accountPubkey];
        if (state) {
            state.enabled = false;
            state.lastUpdated = Date.now();
            await this.persist();
            this.emit('rotationDisabled', { accountPubkey });
        }
    };

    /**
     * Get the current active hot address for receiving
     */
    getCurrentHotAddress = (accountPubkey: string): RotatedAddress | null => {
        const state = this.getRotationState(accountPubkey);
        if (!state?.enabled) return null;

        // Find the active address (should be at currentIndex)
        const activeAddress = state.rotatedAddresses.find(
            (addr) => addr.status === RotatedAddressStatus.ACTIVE
        );

        return activeAddress || null;
    };

    /**
     * Derive the next hot address and make it active
     */
    deriveNextHotAddress = async (
        keyringIndex: number,
        accountPubkey: string,
        network: Network = networks.bitcoin
    ): Promise<RotatedAddress> => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) {
            throw new Error('Rotation mode not enabled');
        }

        const keyring = keyringService.keyrings[keyringIndex];
        if (!keyring || keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new Error('Invalid HD keyring');
        }

        const serialized = keyring.serialize() as HdKeyringSerializedOptions;
        if (!serialized.mnemonic) {
            throw new Error('No mnemonic found');
        }

        // Mark current active address as received (if it has balance) or archived
        const currentActive = state.rotatedAddresses.find(
            (addr) => addr.status === RotatedAddressStatus.ACTIVE
        );
        if (currentActive) {
            if (BigInt(currentActive.currentBalance) > 0n) {
                currentActive.status = RotatedAddressStatus.RECEIVED;
                currentActive.receivedAt = Date.now();
            } else {
                currentActive.status = RotatedAddressStatus.ARCHIVED;
            }
        }

        // Increment index
        const newIndex = state.currentIndex + 1;
        state.currentIndex = newIndex;
        state.maxUsedIndex = Math.max(state.maxUsedIndex, newIndex);

        // Derive new address
        const now = Date.now();
        const newAddress = await this.deriveRotationAddress(
            serialized.mnemonic,
            serialized.passphrase || '',
            newIndex,
            network
        );

        const rotatedAddress: RotatedAddress = {
            address: newAddress.address,
            pubkey: newAddress.pubkey,
            derivationIndex: newIndex,
            status: RotatedAddressStatus.ACTIVE,
            createdAt: now,
            totalReceived: '0',
            currentBalance: '0',
            utxoCount: 0
        };

        state.rotatedAddresses.push(rotatedAddress);
        state.lastUpdated = now;

        // Trim history if too long
        if (state.rotatedAddresses.length > DEFAULT_ROTATION_SETTINGS.maxHistoryAddresses) {
            // Keep the most recent addresses, remove archived ones with 0 balance
            state.rotatedAddresses = state.rotatedAddresses.filter(
                (addr) =>
                    addr.status !== RotatedAddressStatus.ARCHIVED ||
                    BigInt(addr.currentBalance) > 0n
            );
        }

        await this.persist();
        this.emit('addressRotated', { accountPubkey, newAddress: rotatedAddress });

        return rotatedAddress;
    };

    /**
     * Get cold wallet address (INTERNAL USE ONLY - never expose to user)
     * Returns the actual cold wallet address for transaction building
     */
    getColdWalletAddress = async (
        keyringIndex: number,
        network: Network = networks.bitcoin
    ): Promise<string> => {
        const keyring = keyringService.keyrings[keyringIndex];
        if (!keyring || keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new Error('Invalid HD keyring');
        }

        const serialized = keyring.serialize() as HdKeyringSerializedOptions;
        if (!serialized.mnemonic) {
            throw new Error('No mnemonic found');
        }

        // Derive cold wallet using a high index that won't conflict with rotation addresses
        // We use index 1000000 (1 million) which is far beyond any realistic rotation count
        // This ensures cold wallet is completely separate from hot rotation addresses
        const coldKeyring = new HdKeyring({
            mnemonic: serialized.mnemonic,
            passphrase: serialized.passphrase || '',
            network,
            securityLevel: MLDSASecurityLevel.LEVEL2,
            activeIndexes: [COLD_WALLET_INDEX],
            addressType: AddressTypes.P2TR
        });

        const accounts = coldKeyring.getAccounts();
        if (!accounts[0]) {
            throw new Error('Failed to derive cold wallet');
        }

        // Get the wallet and its address
        const wallet = coldKeyring.getWallet(accounts[0]);
        if (!wallet) {
            throw new Error('Failed to get cold wallet');
        }

        // For cold wallet, we use the P2TR (taproot) address
        return wallet.p2tr;
    };

    /**
     * Get the next unused rotation address for change outputs
     * This derives a new address without activating it yet
     */
    getNextUnusedRotationAddress = async (
        keyringIndex: number,
        accountPubkey: string,
        network: Network = networks.bitcoin
    ): Promise<string> => {
        const keyring = keyringService.keyrings[keyringIndex];
        if (!keyring || keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new Error('Invalid HD keyring');
        }

        const serialized = keyring.serialize() as HdKeyringSerializedOptions;
        if (!serialized.mnemonic) {
            throw new Error('No mnemonic found');
        }

        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) {
            throw new Error('Rotation mode not enabled');
        }

        // Derive the next unused index
        const nextIndex = state.maxUsedIndex + 1;

        const newAddress = await this.deriveRotationAddress(
            serialized.mnemonic,
            serialized.passphrase || '',
            nextIndex,
            network
        );

        return newAddress.address;
    };

    /**
     * Mark an address as having received funds
     */
    markAddressReceived = async (
        accountPubkey: string,
        address: string,
        amount: string,
        keyringIndex?: number,
        network?: Network
    ): Promise<boolean> => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) return false;

        const rotatedAddr = state.rotatedAddresses.find((a) => a.address === address);
        if (!rotatedAddr) return false;

        // Update the address info
        const prevBalance = BigInt(rotatedAddr.currentBalance);
        const newBalance = BigInt(amount);

        if (newBalance > prevBalance) {
            rotatedAddr.totalReceived = (
                BigInt(rotatedAddr.totalReceived) +
                (newBalance - prevBalance)
            ).toString();
        }
        rotatedAddr.currentBalance = amount;

        // If this is the active address and it now has funds, auto-rotate if enabled
        if (
            rotatedAddr.status === RotatedAddressStatus.ACTIVE &&
            newBalance > 0n &&
            state.autoRotate &&
            keyringIndex !== undefined &&
            network
        ) {
            rotatedAddr.status = RotatedAddressStatus.RECEIVED;
            rotatedAddr.receivedAt = Date.now();

            // Derive next address
            await this.deriveNextHotAddress(keyringIndex, accountPubkey, network);
            return true; // Rotation occurred
        }

        state.lastUpdated = Date.now();
        await this.persist();
        return false;
    };

    /**
     * Update all rotation address balances from chain
     */
    refreshAddressBalances = async (
        accountPubkey: string,
        chainType: ChainType
    ): Promise<void> => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) return;

        // Get addresses that need balance checking
        const addressesToCheck = state.rotatedAddresses
            .filter(
                (a) =>
                    a.status === RotatedAddressStatus.ACTIVE ||
                    a.status === RotatedAddressStatus.RECEIVED
            )
            .map((a) => a.address);

        if (addressesToCheck.length === 0) return;

        try {
            await Web3API.setNetwork(chainType);
            const utxos = await Web3API.getAllUTXOsForAddresses(addressesToCheck);

            // Group UTXOs by address
            const balancesByAddress = new Map<string, { balance: bigint; utxoCount: number }>();

            for (const utxo of utxos) {
                const addr = utxo.scriptPubKey?.address || '';
                if (!addr) continue;

                const current = balancesByAddress.get(addr) || { balance: 0n, utxoCount: 0 };
                current.balance += BigInt(utxo.value);
                current.utxoCount += 1;
                balancesByAddress.set(addr, current);
            }

            // Update state
            for (const rotatedAddr of state.rotatedAddresses) {
                const balanceInfo = balancesByAddress.get(rotatedAddr.address);
                if (balanceInfo) {
                    const newBalance = balanceInfo.balance.toString();
                    const prevBalance = BigInt(rotatedAddr.currentBalance);

                    if (BigInt(newBalance) > prevBalance) {
                        rotatedAddr.totalReceived = (
                            BigInt(rotatedAddr.totalReceived) +
                            (BigInt(newBalance) - prevBalance)
                        ).toString();
                    }

                    rotatedAddr.currentBalance = newBalance;
                    rotatedAddr.utxoCount = balanceInfo.utxoCount;
                } else if (
                    rotatedAddr.status === RotatedAddressStatus.RECEIVED ||
                    rotatedAddr.status === RotatedAddressStatus.ACTIVE
                ) {
                    // No UTXOs found - might have been spent
                    rotatedAddr.currentBalance = '0';
                    rotatedAddr.utxoCount = 0;
                }
                rotatedAddr.lastBalanceCheck = Date.now();
            }

            // Check if any received addresses are now empty -> mark as consolidated/archived
            for (const rotatedAddr of state.rotatedAddresses) {
                if (
                    rotatedAddr.status === RotatedAddressStatus.RECEIVED &&
                    rotatedAddr.currentBalance === '0'
                ) {
                    rotatedAddr.status = RotatedAddressStatus.CONSOLIDATED;
                    rotatedAddr.consolidatedAt = Date.now();
                }
            }

            state.lastUpdated = Date.now();
            await this.persist();
        } catch (error) {
            console.error('[AddressRotationService] Failed to refresh balances:', error);
        }
    };

    /**
     * Get addresses with balance that can be consolidated
     */
    getAddressesForConsolidation = (accountPubkey: string): RotatedAddress[] => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) return [];

        return state.rotatedAddresses.filter(
            (a) =>
                (a.status === RotatedAddressStatus.RECEIVED ||
                    a.status === RotatedAddressStatus.ACTIVE) &&
                BigInt(a.currentBalance) > 0n
        );
    };

    /**
     * Prepare consolidation transaction parameters
     */
    prepareConsolidation = async (
        keyringIndex: number,
        accountPubkey: string,
        feeRate: number
    ): Promise<ConsolidationParams> => {
        const addressesWithBalance = this.getAddressesForConsolidation(accountPubkey);

        if (addressesWithBalance.length === 0) {
            throw new Error('No funds to consolidate');
        }

        // Limit number of inputs
        const limitedAddresses = addressesWithBalance.slice(0, MAX_CONSOLIDATION_UTXOS);

        const totalAmount = limitedAddresses.reduce(
            (sum, a) => sum + BigInt(a.currentBalance),
            0n
        );

        const totalUtxoCount = limitedAddresses.reduce((sum, a) => sum + a.utxoCount, 0);

        // Estimate fee: ~68 vbytes per P2TR input, ~43 vbytes for output, ~12 vbytes overhead
        const estimatedVSize = 12 + totalUtxoCount * 68 + 43;
        const estimatedFee = BigInt(Math.ceil(estimatedVSize * feeRate));

        const netAmount = totalAmount - estimatedFee;
        if (netAmount <= 0n) {
            throw new Error('Consolidation amount too small to cover fees');
        }

        return {
            sourceAddresses: limitedAddresses.map((a) => a.address),
            sourcePubkeys: limitedAddresses.map((a) => a.pubkey),
            totalAmount: totalAmount.toString(),
            feeRate,
            estimatedFee: estimatedFee.toString(),
            netAmount: netAmount.toString(),
            utxoCount: totalUtxoCount
        };
    };

    /**
     * Create an HdKeyring configured to sign for consolidation addresses
     * Returns a keyring with all rotation address indices that have balance
     */
    getConsolidationKeyring = async (
        keyringIndex: number,
        accountPubkey: string,
        network: Network
    ): Promise<HdKeyring> => {
        const addressesWithBalance = this.getAddressesForConsolidation(accountPubkey);
        if (addressesWithBalance.length === 0) {
            throw new Error('No addresses to consolidate');
        }

        const keyring = keyringService.keyrings[keyringIndex];
        if (!keyring || keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new Error('Invalid HD keyring');
        }

        const serialized = keyring.serialize() as HdKeyringSerializedOptions;
        if (!serialized.mnemonic) {
            throw new Error('No mnemonic found');
        }

        // Get all derivation indices for addresses with balance
        const activeIndexes = addressesWithBalance.map((a) => a.derivationIndex);

        // Create keyring with all needed indices
        return new HdKeyring({
            mnemonic: serialized.mnemonic,
            passphrase: serialized.passphrase || '',
            network,
            securityLevel: MLDSASecurityLevel.LEVEL2,
            activeIndexes,
            addressType: AddressTypes.P2TR
        });
    };

    /**
     * Get the cold wallet keyring for signing withdrawals
     * Returns a keyring configured to sign from the cold wallet address
     */
    getColdWalletKeyring = async (
        keyringIndex: number,
        network: Network = networks.bitcoin
    ): Promise<HdKeyring> => {
        const keyring = keyringService.keyrings[keyringIndex];
        if (!keyring || keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new Error('Invalid HD keyring');
        }

        const serialized = keyring.serialize() as HdKeyringSerializedOptions;
        if (!serialized.mnemonic) {
            throw new Error('No mnemonic found');
        }

        // Cold wallet uses a high index (1 million) that won't conflict with rotation addresses
        return new HdKeyring({
            mnemonic: serialized.mnemonic,
            passphrase: serialized.passphrase || '',
            network,
            securityLevel: MLDSASecurityLevel.LEVEL2,
            activeIndexes: [COLD_WALLET_INDEX],
            addressType: AddressTypes.P2TR
        });
    };

    /**
     * Update rotation state after successful consolidation
     */
    markConsolidated = async (
        accountPubkey: string,
        consolidatedAddresses: string[],
        consolidatedAmount: string
    ): Promise<void> => {
        const state = this.store.settings[accountPubkey];
        if (!state) return;

        for (const address of consolidatedAddresses) {
            const rotatedAddr = state.rotatedAddresses.find((a) => a.address === address);
            if (rotatedAddr && rotatedAddr.status !== RotatedAddressStatus.ACTIVE) {
                rotatedAddr.status = RotatedAddressStatus.CONSOLIDATED;
                rotatedAddr.consolidatedAt = Date.now();
                rotatedAddr.currentBalance = '0';
                rotatedAddr.utxoCount = 0;
            }
        }

        // Update cold wallet balance
        state.coldWallet.totalBalance = (
            BigInt(state.coldWallet.totalBalance) + BigInt(consolidatedAmount)
        ).toString();
        state.coldWallet.consolidationCount += 1;
        state.coldWallet.lastConsolidation = Date.now();

        state.lastUpdated = Date.now();
        await this.persist();
    };

    /**
     * Get rotation history for an account
     */
    getRotationHistory = (accountPubkey: string): RotatedAddress[] => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) return [];

        // Return sorted by creation time, newest first
        return [...state.rotatedAddresses].sort((a, b) => b.createdAt - a.createdAt);
    };

    /**
     * Get summary for UI display
     */
    getRotationSummary = async (accountPubkey: string): Promise<RotationModeSummary | null> => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) return null;

        const currentHot = this.getCurrentHotAddress(accountPubkey);
        if (!currentHot) return null;

        const addressesWithBalance = state.rotatedAddresses.filter(
            (a) => BigInt(a.currentBalance) > 0n
        );

        const totalHotBalance = state.rotatedAddresses.reduce(
            (sum, a) => sum + BigInt(a.currentBalance),
            0n
        );

        const pendingConsolidation = state.rotatedAddresses
            .filter(
                (a) =>
                    a.status === RotatedAddressStatus.RECEIVED && BigInt(a.currentBalance) > 0n
            )
            .reduce((sum, a) => sum + BigInt(a.currentBalance), 0n);

        // Find the last rotation timestamp
        const receivedAddresses = state.rotatedAddresses.filter((a) => a.receivedAt);
        const lastRotation =
            receivedAddresses.length > 0
                ? Math.max(...receivedAddresses.map((a) => a.receivedAt!))
                : undefined;

        return {
            enabled: true,
            currentHotAddress: currentHot.address,
            currentHotPubkey: currentHot.pubkey,
            currentIndex: state.currentIndex,
            totalRotatedAddresses: state.rotatedAddresses.length,
            addressesWithBalance: addressesWithBalance.length,
            totalHotBalance: totalHotBalance.toString(),
            coldWalletBalance: state.coldWallet.totalBalance,
            pendingConsolidation: pendingConsolidation.toString(),
            lastRotation,
            autoRotate: state.autoRotate
        };
    };

    /**
     * Update rotation settings
     */
    updateRotationState = async (
        accountPubkey: string,
        updates: Partial<AddressRotationState>
    ): Promise<void> => {
        const state = this.store.settings[accountPubkey];
        if (!state) return;

        Object.assign(state, updates);
        state.lastUpdated = Date.now();
        await this.persist();
    };

    /**
     * Handle incoming funds detection - called by TransactionStatusPoller
     * Returns true if rotation was triggered
     */
    handleIncomingFunds = async (
        accountPubkey: string,
        address: string,
        amount: string,
        keyringIndex: number,
        network: Network
    ): Promise<boolean> => {
        const state = this.store.settings[accountPubkey];
        if (!state?.enabled) return false;

        const currentHot = this.getCurrentHotAddress(accountPubkey);
        if (!currentHot || currentHot.address !== address) return false;

        // Update balance and potentially auto-rotate
        return this.markAddressReceived(accountPubkey, address, amount, keyringIndex, network);
    };

    // ==================== Private Helper Methods ====================

    /**
     * Derive a rotation address at a specific index
     * Uses taproot (P2TR) address type
     */
    private deriveRotationAddress = async (
        mnemonic: string,
        passphrase: string,
        index: number,
        network: Network
    ): Promise<{ address: string; pubkey: string }> => {
        // Create a temporary HdKeyring just for derivation
        // We use the change path (internal) for rotation addresses
        const tempKeyring = new HdKeyring({
            mnemonic,
            passphrase,
            network,
            securityLevel: MLDSASecurityLevel.LEVEL2,
            activeIndexes: [index],
            addressType: AddressTypes.P2TR
        });

        const accounts = tempKeyring.getAccounts();
        if (!accounts[0]) {
            throw new Error(`Failed to derive rotation address at index ${index}`);
        }

        const pubkey = accounts[0];
        const wallet = tempKeyring.getWallet(pubkey);
        if (!wallet) {
            throw new Error('Failed to get wallet for rotation address');
        }

        // Get the taproot address
        const networkType = preferenceService.store.networkType;
        const address = publicKeyToAddressWithNetworkType(
            pubkey,
            AddressTypes.P2TR,
            networkTypeToOPNet(networkType)
        );

        return { address, pubkey };
    };

    /**
     * Derive cold wallet info (but not the actual address for security)
     */
    private deriveColdWalletInfo = async (
        mnemonic: string,
        passphrase: string,
        network: Network
    ): Promise<ColdWalletInfo> => {
        // Create a temporary keyring for cold wallet using the dedicated high index
        const coldKeyring = new HdKeyring({
            mnemonic,
            passphrase,
            network,
            securityLevel: MLDSASecurityLevel.LEVEL2,
            activeIndexes: [COLD_WALLET_INDEX],
            addressType: AddressTypes.P2TR
        });

        const accounts = coldKeyring.getAccounts();
        if (!accounts[0]) {
            throw new Error('Failed to derive cold wallet');
        }

        const wallet = coldKeyring.getWallet(accounts[0]);
        if (!wallet?.mldsaKeypair) {
            throw new Error('Failed to get MLDSA keypair for cold wallet');
        }

        // Store only the hash, never the address
        const mldsaPublicKeyHash = wallet.address.toHex().replace('0x', '').toLowerCase();

        return {
            isInitialized: true,
            totalBalance: '0',
            consolidationCount: 0,
            mldsaPublicKeyHash
        };
    };
}

export default new AddressRotationService();
