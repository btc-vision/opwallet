import { AddressTypes, NetworkType, RestoreWalletType } from '../types';

export enum CHAINS_ENUM {
    BTC = 'BTC'
}

export const KEYRING_TYPE = {
    HdKeyring: 'HD Key Tree',
    SimpleKeyring: 'Simple Key Pair',
    WatchAddressKeyring: 'Watch Address',
    WalletConnectKeyring: 'WalletConnect',
    Empty: 'Empty',
    KeystoneKeyring: 'Keystone'
};

export const KEYRING_CLASS = {
    PRIVATE_KEY: 'Simple Key Pair',
    MNEMONIC: 'HD Key Tree',
    KEYSTONE: 'Keystone'
};

export const BRAND_ALIAN_TYPE_TEXT = {
    [KEYRING_TYPE.HdKeyring]: 'Account',
    [KEYRING_TYPE.SimpleKeyring]: 'Private Key',
    [KEYRING_TYPE.WatchAddressKeyring]: 'Watch',
    [KEYRING_TYPE.KeystoneKeyring]: 'Account'
};

export const KEYRING_TYPES: Record<
    string,
    {
        name: string;
        tag: string;
        alianName: string;
    }
> = {
    'HD Key Tree': {
        name: 'HD Key Tree',
        tag: 'HD',
        alianName: 'HD Wallet'
    },
    'Simple Key Pair': {
        name: 'Simple Key Pair',
        tag: 'IMPORT',
        alianName: 'Single Wallet'
    },
    Keystone: {
        name: 'Keystone',
        tag: 'KEYSTONE',
        alianName: 'Keystone'
    }
};

export const IS_CHROME = /Chrome\//i.test(navigator.userAgent);

export const IS_LINUX = /linux/i.test(navigator.userAgent);

export const IS_WINDOWS = /windows/i.test(navigator.userAgent);

export const ADDRESS_TYPES: {
    value: AddressTypes;
    label: string;
    name: string;
    hdPath: string;
    displayIndex: number;
    isUnisatLegacy?: boolean;
}[] = [
    {
        value: AddressTypes.P2PKH,
        label: 'P2PKH',
        name: 'Legacy (P2PKH)',
        hdPath: "m/44'/0'/0'/0",
        displayIndex: 3,
        isUnisatLegacy: false
    },
    {
        value: AddressTypes.P2WPKH,
        label: 'P2WPKH',
        name: 'Native Segwit (P2WPKH)',
        hdPath: "m/84'/0'/0'/0",
        displayIndex: 0,
        isUnisatLegacy: false
    },
    {
        value: AddressTypes.P2TR,
        label: 'P2TR',
        name: 'Taproot (P2TR)',
        hdPath: "m/86'/0'/0'/0",
        displayIndex: 2,
        isUnisatLegacy: false
    },
    {
        value: AddressTypes.P2SH_OR_P2SH_P2WPKH,
        label: 'P2SH-P2WPKH',
        name: 'Nested Segwit (P2SH-P2WPKH)',
        hdPath: "m/49'/0'/0'/0",
        displayIndex: 1,
        isUnisatLegacy: false
    }
];

export const OW_HD_PATH = "m/86'/0'/0'";

export const RESTORE_WALLETS: { value: RestoreWalletType; name: string; addressTypes: AddressTypes[] }[] = [
    {
        value: RestoreWalletType.OP_WALLET,
        name: 'OP_WALLET',
        addressTypes: [AddressTypes.P2WPKH, AddressTypes.P2SH_OR_P2SH_P2WPKH, AddressTypes.P2TR, AddressTypes.P2PKH]
    },
    {
        value: RestoreWalletType.UNISAT,
        name: 'UniSat Wallet',
        addressTypes: [AddressTypes.P2WPKH, AddressTypes.P2SH_OR_P2SH_P2WPKH, AddressTypes.P2TR, AddressTypes.P2PKH]
    },
    {
        value: RestoreWalletType.SPARROW,
        name: 'Sparrow Wallet',
        addressTypes: [AddressTypes.P2PKH, AddressTypes.P2WPKH, AddressTypes.P2SH_OR_P2SH_P2WPKH, AddressTypes.P2TR]
    },
    {
        value: RestoreWalletType.XVERSE,
        name: 'Xverse Wallet',
        addressTypes: [AddressTypes.P2SH_OR_P2SH_P2WPKH, AddressTypes.P2TR]
    },
    {
        value: RestoreWalletType.OW,
        name: 'Ordinals Wallet',
        addressTypes: [AddressTypes.P2TR]
    },
    {
        value: RestoreWalletType.OTHERS,
        name: 'Other Wallet',
        addressTypes: [AddressTypes.P2PKH, AddressTypes.P2WPKH, AddressTypes.P2SH_OR_P2SH_P2WPKH, AddressTypes.P2TR]
    }
];

export enum ChainType {
    BITCOIN_MAINNET = 'BITCOIN_MAINNET',
    BITCOIN_TESTNET = 'BITCOIN_TESTNET',
    BITCOIN_TESTNET4 = 'BITCOIN_TESTNET4',
    BITCOIN_REGTEST = 'BITCOIN_REGTEST',
    BITCOIN_SIGNET = 'BITCOIN_SIGNET',
    FRACTAL_BITCOIN_MAINNET = 'FRACTAL_BITCOIN_MAINNET',
    FRACTAL_BITCOIN_TESTNET = 'FRACTAL_BITCOIN_TESTNET',
    DOGECOIN_MAINNET = 'DOGECOIN_MAINNET',
    DOGECOIN_TESTNET = 'DOGECOIN_TESTNET',
    DOGECOIN_REGTEST = 'DOGECOIN_REGTEST',
    LITECOIN_MAINNET = 'LITECOIN_MAINNET',
    LITECOIN_TESTNET = 'LITECOIN_TESTNET',
    LITECOIN_REGTEST = 'LITECOIN_REGTEST',
    BITCOINCASH_MAINNET = 'BITCOINCASH_MAINNET',
    BITCOINCASH_TESTNET = 'BITCOINCASH_TESTNET',
    BITCOINCASH_REGTEST = 'BITCOINCASH_REGTEST',
    DASH_MAINNET = 'DASH_MAINNET',
    DASH_TESTNET = 'DASH_TESTNET',
    DASH_REGTEST = 'DASH_REGTEST'
}

export const NETWORK_TYPES = [
    { value: NetworkType.MAINNET, label: 'MAINNET', name: 'mainnet', validNames: [0, 'livenet', 'mainnet'] },
    { value: NetworkType.TESTNET, label: 'TESTNET', name: 'testnet', validNames: ['testnet'] },
    { value: NetworkType.REGTEST, label: 'REGTEST', name: 'regtest', validNames: ['regtest'] }
];

export enum ChainId {
    Bitcoin = 0,
    Fractal = 1,
    Dogecoin = 2,
    Litecoin = 3,
    BitcoinCash = 4,
    Dash = 5
}

export interface ContractsDetails {
    moto?: string;
    pill?: string;
    btcResolver?: string;
}

export interface CustomNetwork {
    id: string;
    name: string;
    networkType: NetworkType;
    chainId: ChainId;
    chainType: ChainType;
    icon: string;
    unit: string;
    opnetUrl: string;
    mempoolSpaceUrl: string;
    faucetUrl?: string;
    showPrice: boolean;
    isCustom: true;
    createdAt: number;
    contractAddresses: ContractsDetails;
}

export interface TypeChain<T extends ChainType> {
    enum: T;
    label: string;
    icon: string;
    unit: string;
    networkType: NetworkType;
    endpoints: string[];
    opnetUrl: string;
    mempoolSpaceUrl: string;
    faucetUrl: string;
    okxExplorerUrl: string;
    isViewTxHistoryInternally?: boolean;
    disable?: boolean;
    isFractal?: boolean;
    showPrice: boolean;
    defaultExplorer: 'mempool-space' | 'opnet-explorer';
    isCustom?: boolean;
    contractAddresses: ContractsDetails;
}

export const DEFAULT_CHAINS_MAP: { [key in ChainType]?: TypeChain<key> } = {
    [ChainType.BITCOIN_MAINNET]: {
        enum: ChainType.BITCOIN_MAINNET,
        label: 'Bitcoin Mainnet',
        unit: 'BTC',
        icon: './images/artifacts/bitcoin-mainnet.png',
        networkType: NetworkType.MAINNET,
        opnetUrl: 'https://api.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://mempool.space',
        faucetUrl: '',
        okxExplorerUrl: '',
        disable: true,
        showPrice: true,
        defaultExplorer: 'mempool-space',
        contractAddresses: {}
    },
    [ChainType.BITCOIN_TESTNET]: {
        enum: ChainType.BITCOIN_TESTNET,
        label: 'Bitcoin Testnet',
        unit: 'tBTC',
        icon: './images/artifacts/bitcoin-testnet.svg',
        networkType: NetworkType.TESTNET,
        opnetUrl: 'https://testnet.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://mempool.space/testnet',
        faucetUrl: 'https://faucet.opnet.org/',
        okxExplorerUrl: '',
        disable: false,
        showPrice: false,
        defaultExplorer: 'mempool-space',
        contractAddresses: {}
    },
    [ChainType.BITCOIN_TESTNET4]: {
        enum: ChainType.BITCOIN_TESTNET4,
        label: 'Bitcoin Testnet4 (Beta)',
        icon: './images/artifacts/bitcoin-testnet.svg',
        unit: 'tBTC',
        networkType: NetworkType.TESTNET,
        opnetUrl: 'https://testnet4.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://mempool.space/testnet4',
        faucetUrl: 'https://faucet.opnet.org/',
        okxExplorerUrl: '',
        disable: true,
        showPrice: false,
        defaultExplorer: 'mempool-space',
        contractAddresses: {}
    },
    [ChainType.BITCOIN_REGTEST]: {
        enum: ChainType.BITCOIN_REGTEST,
        label: 'Bitcoin Regtest',
        unit: 'rBTC',
        icon: './images/artifacts/bitcoin-testnet.svg',
        networkType: NetworkType.REGTEST,
        opnetUrl: 'https://regtest.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://mempool.opnet.org',
        faucetUrl: 'https://faucet.opnet.org/',
        okxExplorerUrl: '',
        showPrice: false,
        defaultExplorer: 'mempool-space',
        contractAddresses: {
            moto: '0x0a6732489a31e6de07917a28ff7df311fc5f98f6e1664943ac1c3fe7893bdab5',
            pill: '0xfb7df2f08d8042d4df0506c0d4cee3cfa5f2d7b02ef01ec76dd699551393a438',
            btcResolver: '0x336dcb0b117e29a61aef4856dc438f9951de39edcc4745a255713da8f807779c'
        }
    },
    [ChainType.BITCOIN_SIGNET]: {
        enum: ChainType.BITCOIN_SIGNET,
        label: 'Bitcoin Signet',
        icon: './images/artifacts/bitcoin-signet.svg',
        unit: 'sBTC',
        networkType: NetworkType.TESTNET,
        opnetUrl: 'https://signet.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://mempool.space/signet',
        faucetUrl: 'https://faucet.opnet.org/',
        okxExplorerUrl: '',
        disable: true,
        showPrice: false,
        defaultExplorer: 'mempool-space',
        contractAddresses: {}
    },
    [ChainType.FRACTAL_BITCOIN_MAINNET]: {
        enum: ChainType.FRACTAL_BITCOIN_MAINNET,
        label: 'Fractal Bitcoin Mainnet',
        icon: './images/artifacts/fractal-mainnet.svg',
        unit: 'FB',
        networkType: NetworkType.MAINNET,
        opnetUrl: 'https://fractal.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://mempool.fractalbitcoin.io',
        faucetUrl: '',
        okxExplorerUrl: '',
        isViewTxHistoryInternally: false,
        disable: true,
        isFractal: true,
        showPrice: true,
        defaultExplorer: 'mempool-space',
        contractAddresses: {}
    },
    [ChainType.FRACTAL_BITCOIN_TESTNET]: {
        enum: ChainType.FRACTAL_BITCOIN_TESTNET,
        label: 'Fractal Bitcoin Testnet',
        icon: './images/artifacts/fractal-testnet.svg',
        unit: 'tFB',
        networkType: NetworkType.MAINNET,
        opnetUrl: 'https://fractal-testnet.opnet.org',
        endpoints: ['https://wallet.opnet.org'],
        mempoolSpaceUrl: 'https://fractal-mempool.opnet.org',
        faucetUrl: 'https://fractal-faucet.opnet.org/',
        okxExplorerUrl: '',
        isViewTxHistoryInternally: true,
        isFractal: true,
        showPrice: false,
        defaultExplorer: 'mempool-space',
        contractAddresses: {}
    }
};

// Initialize CHAINS_MAP with default chains
export const CHAINS_MAP: { [key in ChainType]?: TypeChain<ChainType> } = {};

// Initialize with default chains
Object.entries(DEFAULT_CHAINS_MAP).forEach(([key, value]) => {
    if (value) {
        CHAINS_MAP[key as ChainType] = value as TypeChain<ChainType>;
    }
});

export const CHAIN_ICONS: { [key in ChainId]: string } = {
    [ChainId.Bitcoin]: './images/artifacts/bitcoin-mainnet.png',
    [ChainId.Fractal]: './images/artifacts/fractal-mainnet.svg',
    [ChainId.Dogecoin]: './images/artifacts/doge.svg',
    [ChainId.Litecoin]: './images/artifacts/ltc.svg',
    [ChainId.BitcoinCash]: './images/artifacts/bch.svg',
    [ChainId.Dash]: './images/artifacts/dash.svg'
};

Object.values(ChainType).forEach((chainType) => {
    if (!CHAINS_MAP[chainType]) {
        // Determine network type and chain id from the enum name
        const isMainnet = chainType.includes('MAINNET');
        const isTestnet = chainType.includes('TESTNET');
        const isRegtest = chainType.includes('REGTEST');
        const isSignet = chainType.includes('SIGNET');

        let networkType = NetworkType.MAINNET;
        if (isTestnet) networkType = NetworkType.TESTNET;
        else if (isRegtest) networkType = NetworkType.REGTEST;

        let unit: string;
        let icon: string;
        const label = chainType
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());

        if (chainType.includes('DOGECOIN')) {
            unit = isMainnet ? 'DOGE' : isRegtest ? 'rDOGE' : 'tDOGE';
            icon = CHAIN_ICONS[ChainId.Dogecoin];
        } else if (chainType.includes('LITECOIN')) {
            unit = isMainnet ? 'LTC' : isRegtest ? 'rLTC' : 'tLTC';
            icon = CHAIN_ICONS[ChainId.Litecoin];
        } else if (chainType.includes('BITCOINCASH')) {
            unit = isMainnet ? 'BCH' : isRegtest ? 'rBCH' : 'tBCH';
            icon = CHAIN_ICONS[ChainId.BitcoinCash];
        } else if (chainType.includes('DASH')) {
            unit = isMainnet ? 'DASH' : isRegtest ? 'rDASH' : 'tDASH';
            icon = CHAIN_ICONS[ChainId.Dash];
        } else if (chainType.includes('FRACTAL')) {
            unit = isMainnet ? 'FB' : isRegtest ? 'rFB' : 'tFB';
            icon = isMainnet ? './images/artifacts/fractal-mainnet.svg' : './images/artifacts/fractal-testnet.svg';
        } else {
            // Handle Bitcoin networks
            if (isRegtest) {
                unit = 'rBTC';
                icon = './images/artifacts/bitcoin-testnet.svg';
            } else if (isSignet) {
                unit = 'sBTC';
                icon = './images/artifacts/bitcoin-signet.svg';
            } else if (isTestnet) {
                unit = 'tBTC';
                icon = './images/artifacts/bitcoin-testnet.svg';
            } else {
                unit = 'BTC';
                icon = './images/artifacts/bitcoin-mainnet.png';
            }
        }

        CHAINS_MAP[chainType] = {
            enum: chainType,
            label,
            unit,
            icon,
            networkType,
            opnetUrl: '',
            endpoints: ['https://wallet.opnet.org'],
            mempoolSpaceUrl: '',
            faucetUrl: '',
            okxExplorerUrl: '',
            disable: true, // Disabled by default until custom RPC is added
            showPrice: isMainnet,
            defaultExplorer: 'mempool-space',
            contractAddresses: {}
        } as TypeChain<ChainType>;
    }
});

export const CHAINS = Object.values(CHAINS_MAP).filter(Boolean);

export interface TypeChainGroup {
    type: 'single' | 'list';
    chain?: TypeChain<ChainType>;
    label?: string;
    icon?: string;
    items?: TypeChain<ChainType>[];
}

export const INTERNAL_REQUEST_ORIGIN = 'https://opnet.org';

export const EVENTS = {
    broadcastToUI: 'broadcastToUI',
    broadcastToBackground: 'broadcastToBackground',
    SIGN_FINISHED: 'SIGN_FINISHED',
    WALLETCONNECT: {
        STATUS_CHANGED: 'WALLETCONNECT_STATUS_CHANGED',
        INIT: 'WALLETCONNECT_INIT',
        INITED: 'WALLETCONNECT_INITED'
    }
};

export const COIN_NAME = 'BTC';
export const COIN_SYMBOL = 'BTC';

export const COIN_DUST = 1000;

export const GITHUB_URL = 'https://github.com/btc-vision/opwallet';
export const TWITTER_URL = 'https://x.com/opnetbtc';
export const TELEGRAM_URL = 'https://t.me/opnetbtc ';

export const CHANNEL = process.env.channel ?? 'github';
export const VERSION = process.env.release ?? '0.0.0';
export const MANIFEST_VERSION = process.env.manifest ?? 'mv3';

export enum AddressFlagType {
    CONFIRMED_UTXO_MODE = 0b10,
    DISABLE_AUTO_SWITCH_CONFIRMED = 0b100
}

export const UNCONFIRMED_HEIGHT = 4194303;

export enum HardwareWalletType {
    Keystone = 'keystone',
    Ledger = 'ledger',
    Trezor = 'trezor'
}

export const HARDWARE_WALLETS = {
    [HardwareWalletType.Keystone]: {
        name: 'Keystone',
        img: './images/artifacts/keystone.png'
    },
    [HardwareWalletType.Ledger]: {
        name: 'Ledger',
        img: './images/artifacts/ledger.png'
    },
    [HardwareWalletType.Trezor]: {
        name: 'Trezor',
        img: './images/artifacts/trezor.png'
    }
};

export const AUTO_LOCKTIMES = [
    { id: 0, time: 30000, label: '30 Seconds' },
    { id: 1, time: 60000, label: '1 Minute' },
    { id: 2, time: 180000, label: '3 Minutes' },
    { id: 3, time: 300000, label: '5 Minutes' },
    { id: 4, time: 600000, label: '10 Minutes' },
    { id: 5, time: 1800000, label: '30 Minutes' },
    { id: 6, time: 3600000, label: '1 Hour' },
    { id: 7, time: 7200000, label: '2 Hours' },
    { id: 8, time: 14400000, label: '4 Hours' },
    { id: 9, time: 21600000, label: '6 Hours' },
    { id: 10, time: 43200000, label: '12 Hours' },
    { id: 11, time: 86400000, label: '1 Day' },
    { id: 12, time: 604800000, label: '1 Week' }
];

export const DEFAULT_LOCKTIME_ID = 10;
