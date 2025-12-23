/**
 * Wallet Duplication Detection and Resolution Types
 *
 * These types support detecting duplicate wallets (same WIF/mnemonic imported multiple times)
 * and duplicate MLDSA keys (same MLDSA key assigned to multiple wallets).
 */

/**
 * Information about a wallet involved in a duplication conflict
 */
export interface DuplicateWalletInfo {
    /** Index of the keyring in the keyrings array */
    keyringIndex: number;
    /** Unique key identifier for the keyring */
    keyringKey: string;
    /** Type of keyring */
    keyringType: 'HD Key Tree' | 'Simple Key Pair';
    /** Bitcoin public key */
    pubkey: string;
    /** Bitcoin address */
    address: string;
    /** SHA256 hash of the private key/mnemonic for comparison (never the actual key) */
    privateKeyHash: string;
    /** SHA256 hash of MLDSA public key if exists */
    mldsaPublicKeyHash?: string;
    /** Whether this wallet has an MLDSA private key */
    mldsaPrivateKeyExists: boolean;
    /** MLDSA hash linked on-chain for this Bitcoin pubkey (from getPublicKeysInfoRaw) */
    onChainLinkedMldsaHash?: string;
    /** Whether local MLDSA hash matches on-chain linked hash */
    isOnChainMatch: boolean;
    /** User-defined wallet name */
    alianName?: string;
}

/**
 * A duplication conflict - either same wallet imported multiple times
 * or same MLDSA key on multiple wallets
 */
export interface DuplicationConflict {
    /** Type of conflict */
    type: 'WALLET_DUPLICATE' | 'MLDSA_DUPLICATE';
    /** Unique identifier for this conflict */
    conflictId: string;
    /** Human-readable description */
    description: string;
    /** All wallets involved in this conflict */
    wallets: DuplicateWalletInfo[];
    /** User-selected correct wallet index (set during resolution) */
    correctWalletIndex?: number;
}

/**
 * Result of duplication detection scan
 */
export interface DuplicationDetectionResult {
    /** Whether any duplicates were found */
    hasDuplicates: boolean;
    /** Conflicts where same WIF/mnemonic was imported multiple times */
    walletDuplicates: DuplicationConflict[];
    /** Conflicts where same MLDSA key exists on multiple wallets */
    mldsaDuplicates: DuplicationConflict[];
    /** Total number of conflicts */
    totalConflicts: number;
    /** Timestamp when detection was performed */
    detectedAt: number;
}

/**
 * Data for a single keyring in the backup
 */
export interface BackupKeyringData {
    /** Index in original keyrings array */
    keyringIndex: number;
    /** Type of keyring */
    keyringType: string;
    /** Address type (P2TR, P2WPKH, etc.) */
    addressType: string;
    /** BIP39 mnemonic for HD wallets */
    mnemonic?: string;
    /** Passphrase for HD wallets */
    passphrase?: string;
    /** HD derivation path */
    hdPath?: string;
    /** Active account indexes for HD wallets */
    activeIndexes?: number[];
    /** Private key (WIF or hex) for Simple wallets */
    privateKey?: string;
    /** MLDSA quantum private key */
    quantumPrivateKey?: string;
    /** Account information */
    accounts: BackupAccountData[];
}

/**
 * Account data in backup
 */
export interface BackupAccountData {
    /** Bitcoin public key */
    pubkey: string;
    /** Bitcoin address */
    address: string;
    /** User-defined account name */
    alianName?: string;
    /** MLDSA public key hash */
    quantumPublicKeyHash?: string;
}

/**
 * Complete backup before duplication resolution
 */
export interface DuplicationBackup {
    /** Backup format version */
    version: string;
    /** Timestamp when backup was created */
    createdAt: number;
    /** All keyring data */
    keyrings: BackupKeyringData[];
    /** Conflicts that triggered this backup */
    conflicts: DuplicationConflict[];
}

/**
 * Persistent state tracking duplication resolution progress
 */
export interface DuplicationState {
    /** Whether all conflicts have been resolved */
    isResolved: boolean;
    /** When duplicates were last detected */
    lastDetectionTime?: number;
    /** When the duplicate check was last performed (prevents repeated checks in same session) */
    lastCheckTime?: number;
    /** Whether internal backup was created */
    backupCreated: boolean;
    /** Whether user downloaded the backup file */
    backupDownloaded: boolean;
    /** IDs of conflicts that have been resolved */
    conflictsResolved: string[];
}

/**
 * Resolution action types
 */
export enum DuplicationResolution {
    /** Keep the selected wallet, delete duplicates (for WALLET_DUPLICATE) */
    KEEP_SELECTED = 'keep_selected',
    /** Keep MLDSA on selected wallet, clear from others (for MLDSA_DUPLICATE) */
    KEEP_MLDSA_ON_SELECTED = 'keep_mldsa_on_selected',
    /** Move MLDSA key from one wallet to another */
    MOVE_MLDSA = 'move_mldsa',
    /** Replace MLDSA key with correct on-chain linked key */
    REPLACE_MLDSA = 'replace_mldsa'
}

/**
 * User's resolution choice for a conflict
 */
export interface ConflictResolutionChoice {
    /** ID of the conflict being resolved */
    conflictId: string;
    /** What action to take */
    resolution: DuplicationResolution;
    /** Index of the wallet the user selected as correct */
    correctWalletIndex: number;
    /** For KEEP_SELECTED: indices of wallets to delete (all except correctWalletIndex) */
    walletsToDelete?: number[];
    /** For KEEP_MLDSA_ON_SELECTED: indices of wallets to clear MLDSA from */
    walletsToClearMldsa?: number[];
    /** For MOVE_MLDSA: target wallet to move the key to */
    targetWalletIndex?: number;
    /** For REPLACE_MLDSA: the new quantum private key to use */
    newQuantumPrivateKey?: string;
}

/**
 * On-chain linkage info for a wallet
 */
export interface OnChainLinkageInfo {
    /** Bitcoin public key */
    pubkey: string;
    /** MLDSA hash stored on-chain */
    onChainMldsaHash?: string;
    /** Local MLDSA hash */
    localMldsaHash?: string;
    /** Whether they match */
    matches: boolean;
    /** Whether there's any on-chain linkage at all */
    hasOnChainLinkage: boolean;
}

/**
 * Fingerprint of a keyring for comparison
 */
export interface KeyringFingerprint {
    /** Keyring index */
    index: number;
    /** Keyring type */
    type: string;
    /** Hash of private key or mnemonic */
    privateKeyHash: string;
    /** Hash of MLDSA public key if exists */
    mldsaHash?: string;
}
