import { AddressFlagType, CHAINS, ChainType, DEFAULT_LOCKTIME_ID, EVENTS } from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import { SessionEvent } from '@/shared/interfaces/SessionEvent';
import { Account, AddressType, AppSummary, BitcoinBalance, NetworkType, TxHistoryItem } from '@/shared/types';
import { compareVersions } from 'compare-versions';
import cloneDeep from 'lodash/cloneDeep';
import browser from '../webapi/browser';
import { i18n, sessionService } from './index';

const version = process.env.release ?? '0';

export type WalletSaveList = [];

export interface PreferenceStore {
    currentKeyringIndex: number;
    currentAccount: Account | undefined | null;
    externalLinkAck: boolean;
    balanceMap: Record<string, BitcoinBalance>;
    historyMap: Record<string, TxHistoryItem[]>;
    locale: string;
    watchAddressPreference: Record<string, number>;
    walletSavedList: WalletSaveList;
    alianNames?: Record<string, string>;
    initAlianNames: boolean;
    currentVersion: string;
    firstOpen: boolean;
    currency: string;
    addressType: AddressType;
    networkType: NetworkType;
    chainType: ChainType;
    keyringAlianNames: Record<string, string>;
    accountAlianNames: Record<string, string>;
    editingKeyringIndex: number;
    editingAccount: Account | undefined | null;
    skippedVersion: string;
    appTab: {
        summary: AppSummary;
        readTabTime: number;
        readAppTime: Record<string, number>;
    };
    showSafeNotice: boolean;
    addressFlags: Record<string, number>;
    // enableSignData: boolean;
    autoLockTimeId: number;
}

const SUPPORT_LOCALES = ['en'];
const defaultLang = 'en';
const DEFAULTS = {
    name: 'preference',
    template: {
        currentKeyringIndex: 0,
        currentAccount: undefined,
        editingKeyringIndex: 0,
        editingAccount: undefined,
        externalLinkAck: false,
        balanceMap: {},
        historyMap: {},
        locale: defaultLang,
        watchAddressPreference: {},
        walletSavedList: [] as WalletSaveList,
        alianNames: {},
        initAlianNames: false,
        currentVersion: '0',
        firstOpen: false,
        currency: 'USD',
        addressType: AddressType.P2WPKH,
        networkType: NetworkType.REGTEST, // TODO: To change to mainnet when mainnet is ready
        chainType: ChainType.BITCOIN_REGTEST, // TODO: To change to mainnet when mainnet is ready
        keyringAlianNames: {},
        accountAlianNames: {},
        skippedVersion: '',
        appTab: {
            summary: { apps: [] },
            readAppTime: {},
            readTabTime: 1
        },
        showSafeNotice: true,
        addressFlags: {},
        // enableSignData: false,
        autoLockTimeId: DEFAULT_LOCKTIME_ID
    } as PreferenceStore
};

class PreferenceService {
    store!: PreferenceStore;
    popupOpen = false;

    init = async () => {
        const data = await chrome.storage.local.get('preference');
        const saved = data.preference as PreferenceStore | undefined;

        this.store = saved ? saved : ({ ...DEFAULTS.template } as PreferenceStore);

        if (!this.store.locale || this.store.locale !== defaultLang) {
            this.store.locale = defaultLang;
        }
        void i18n.changeLanguage(this.store.locale);

        if (!this.store.currency) {
            this.store.currency = 'USD';
        }

        if (!this.store.initAlianNames) {
            this.store.initAlianNames = false;
        }
        if (!this.store.externalLinkAck) {
            this.store.externalLinkAck = false;
        }

        if (!this.store.balanceMap) {
            this.store.balanceMap = {};
        }

        if (!this.store.historyMap) {
            this.store.historyMap = {};
        }

        if (!this.store.walletSavedList) {
            this.store.walletSavedList = [];
        }

        if (this.store.addressType === undefined || this.store.addressType === null) {
            this.store.addressType = AddressType.P2WPKH;
        }

        if (!this.store.networkType) {
            this.store.networkType = NetworkType.REGTEST; // default to regtest
        }

        if (this.store.currentAccount) {
            if (!this.store.currentAccount.pubkey) {
                // old version.
                this.store.currentAccount = undefined; // will restored to new version
            }
        }

        if (!this.store.keyringAlianNames) {
            this.store.keyringAlianNames = {};
        }

        if (!this.store.accountAlianNames) {
            this.store.accountAlianNames = {};
        }

        if (!this.store.skippedVersion) {
            this.store.skippedVersion = '';
        }

        if (!this.store.appTab) {
            this.store.appTab = { summary: { apps: [] }, readTabTime: 1, readAppTime: {} };
        }

        if (!this.store.appTab.readAppTime) {
            this.store.appTab.readAppTime = {};
        }

        if (typeof this.store.showSafeNotice !== 'boolean') {
            this.store.showSafeNotice = true;
        }
        if (!this.store.addressFlags) {
            this.store.addressFlags = {};
        }

        // if (typeof this.store.enableSignData !== 'boolean') {
        //     this.store.enableSignData = false;
        // }

        if (!this.store.chainType) {
            this.store.chainType = ChainType.BITCOIN_REGTEST;
        }

        if (typeof this.store.autoLockTimeId !== 'number') {
            this.store.autoLockTimeId = DEFAULT_LOCKTIME_ID;
        }

        if (!saved) {
            this.persist();
        }
    };

    private persist = () => {
        chrome.storage.local.set({ preference: this.store });
    };

    getAcceptLanguages = async () => {
        let langs = await browser.i18n.getAcceptLanguages();
        if (!langs) langs = [];
        return langs
            .map((lang: string) => lang.replace(/-/g, '_'))
            .filter((lang: string) => SUPPORT_LOCALES.includes(lang));
    };

    getCurrentAccount = () => {
        return cloneDeep(this.store.currentAccount);
    };

    setCurrentAccount = (account?: Account | null) => {
        this.store.currentAccount = account;
        if (account) {
            sessionService.broadcastEvent(SessionEvent.accountsChanged, [account.address]);
            eventBus.emit(EVENTS.broadcastToUI, {
                method: 'accountsChanged',
                params: account
            });
        }
        this.persist();
    };

    getWatchAddressPreference = () => {
        return this.store.watchAddressPreference;
    };

    setWatchAddressPreference = (address: string, preference: number) => {
        this.store.watchAddressPreference = Object.assign({}, this.store.watchAddressPreference, {
            [address]: preference
        });
        this.persist();
    };

    // popupOpen
    setPopupOpen = (isOpen: boolean) => {
        this.popupOpen = isOpen;
    };

    getPopupOpen = () => {
        return this.popupOpen;
    };

    // addressBalance
    updateAddressBalance = (address: string, data: BitcoinBalance) => {
        const balanceMap = this.store.balanceMap || {};
        this.store.balanceMap = {
            ...balanceMap,
            [address]: data
        };
        this.persist();
    };

    removeAddressBalance = (address: string) => {
        const key = address;
        if (key in this.store.balanceMap) {
            const map = this.store.balanceMap;
            // Since we're already checking if the key exists, we can disable this eslint error
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete map[key];
            this.store.balanceMap = map;
        }
        this.persist();
    };

    getAddressBalance = (address: string): BitcoinBalance | null => {
        const balanceMap = this.store.balanceMap || {};
        return balanceMap[address] || null;
    };

    // addressHistory
    updateAddressHistory = (address: string, data: TxHistoryItem[]) => {
        const historyMap = this.store.historyMap || {};
        this.store.historyMap = {
            ...historyMap,
            [address]: data
        };
        this.persist();
    };

    removeAddressHistory = (address: string) => {
        const key = address;
        if (key in this.store.historyMap) {
            const map = this.store.historyMap;
            // Since we're already checking if the key exists, we can disable this eslint error
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete map[key];
            this.store.historyMap = map;
        }
        this.persist();
    };

    getAddressHistory = (address: string): TxHistoryItem[] => {
        const historyMap = this.store.historyMap || {};
        return historyMap[address] || [];
    };

    // externalLinkAck
    getExternalLinkAck = (): boolean => {
        return this.store.externalLinkAck;
    };

    setExternalLinkAck = (ack = false) => {
        this.store.externalLinkAck = ack;
        this.persist();
    };

    // locale
    getLocale = () => {
        return this.store.locale;
    };

    setLocale = async (locale: string) => {
        this.store.locale = locale;
        await i18n.changeLanguage(locale);
        this.persist();
    };

    // currency
    getCurrency = () => {
        return this.store.currency;
    };

    setCurrency = (currency: string) => {
        this.store.currency = currency;
        this.persist();
    };

    // walletSavedList
    getWalletSavedList = () => {
        return this.store.walletSavedList || [];
    };

    updateWalletSavedList = (list: []) => {
        this.store.walletSavedList = list;
        this.persist();
    };

    // alianNames
    getInitAlianNameStatus = () => {
        return this.store.initAlianNames;
    };

    changeInitAlianNameStatus = () => {
        this.store.initAlianNames = true;
        this.persist();
    };

    // isFirstOpen
    getIsFirstOpen = () => {
        if (!this.store.currentVersion || compareVersions(version, this.store.currentVersion)) {
            this.store.currentVersion = version;
            this.store.firstOpen = true;
        }
        this.persist();
        return this.store.firstOpen;
    };

    updateIsFirstOpen = () => {
        this.store.firstOpen = false;
        this.persist();
    };

    // deprecate
    getAddressType = () => {
        return this.store.addressType;
    };

    // // network type
    // getNetworkType = () => {
    //   return this.store.networkType;
    // };

    // setNetworkType = (networkType: NetworkType) => {
    //   this.store.networkType = networkType;
    //   this.persist();
    // };

    // chain type
    getChainType = (): ChainType => {
        if (!this.store) {
            throw new Error('Preference store is not initialized');
        }

        if (!CHAINS.find((chain) => chain.enum === this.store.chainType)) {
            this.store.chainType = ChainType.BITCOIN_REGTEST;
        }

        return this.store.chainType;
    };

    setChainType = (chainType: ChainType) => {
        this.store.chainType = chainType;
        this.persist();
    };

    // currentKeyringIndex
    getCurrentKeyringIndex = () => {
        return this.store.currentKeyringIndex;
    };

    setCurrentKeyringIndex = (keyringIndex: number) => {
        this.store.currentKeyringIndex = keyringIndex;
        this.persist();
    };

    // keyringAlianNames
    setKeyringAlianName = (keyringKey: string, name: string) => {
        this.store.keyringAlianNames = Object.assign({}, this.store.keyringAlianNames, { [keyringKey]: name });
        this.persist();
    };

    getKeyringAlianName = (keyringKey: string, defaultName?: string) => {
        const name = this.store.keyringAlianNames[keyringKey];
        if (!name && defaultName) {
            this.store.keyringAlianNames[keyringKey] = defaultName;
        }
        this.persist();
        return this.store.keyringAlianNames[keyringKey];
    };

    // accountAlianNames
    setAccountAlianName = (accountKey: string, name: string) => {
        this.store.accountAlianNames = Object.assign({}, this.store.accountAlianNames, { [accountKey]: name });
        this.persist();
    };

    getAccountAlianName = (accountKey: string, defaultName?: string) => {
        const name = this.store.accountAlianNames[accountKey];
        if (!name && defaultName) {
            this.store.accountAlianNames[accountKey] = defaultName;
        }
        this.persist();
        return this.store.accountAlianNames[accountKey];
    };

    // get address flag
    getAddressFlag = (address: string) => {
        return this.store.addressFlags[address] || 0;
    };
    setAddressFlag = (address: string, flag: number) => {
        this.store.addressFlags = Object.assign({}, this.store.addressFlags, { [address]: flag });
        this.persist();
    };

    // Add address flag
    addAddressFlag = (address: string, flag: AddressFlagType) => {
        const finalFlag = (this.store.addressFlags[address] || 0) | flag;
        this.store.addressFlags = Object.assign({}, this.store.addressFlags, { [address]: finalFlag });
        this.persist();
        return finalFlag;
    };

    // Remove address flag
    removeAddressFlag = (address: string, flag: AddressFlagType) => {
        const finalFlag = (this.store.addressFlags[address] || 0) & ~flag;
        this.store.addressFlags = Object.assign({}, this.store.addressFlags, { [address]: finalFlag });
        this.persist();
        return finalFlag;
    };

    // editingKeyringIndex
    getEditingKeyringIndex = () => {
        return this.store.editingKeyringIndex;
    };

    setEditingKeyringIndex = (keyringIndex: number) => {
        this.store.editingKeyringIndex = keyringIndex;
        this.persist();
    };

    // editingAccount
    getEditingAccount = () => {
        return cloneDeep(this.store.editingAccount);
    };

    setEditingAccount = (account?: Account | null) => {
        this.store.editingAccount = account;
        this.persist();
    };

    getSkippedVersion = () => {
        return this.store.skippedVersion;
    };

    setSkippedVersion = (version: string) => {
        this.store.skippedVersion = version;
        this.persist();
    };

    getAppTab = () => {
        return this.store.appTab;
    };

    setAppSummary = (appSummary: AppSummary) => {
        this.store.appTab.summary = appSummary;
        this.persist();
    };

    setReadTabTime = (timestamp: number) => {
        this.store.appTab.readTabTime = timestamp;
        this.persist();
    };

    setReadAppTime = (appid: number, timestamp: number) => {
        this.store.appTab.readAppTime[appid] = timestamp;
        this.persist();
    };

    getShowSafeNotice = () => {
        return this.store.showSafeNotice;
    };
    setShowSafeNotice = (showSafeNotice: boolean) => {
        this.store.showSafeNotice = showSafeNotice;
        this.persist();
    };

    // getEnableSignData = () => {
    //     return this.store.enableSignData;
    // };

    // setEnableSignData = (enableSignData: boolean) => {
    //     this.store.enableSignData = enableSignData;
    //     this.persist();
    // };

    getAutoLockTimeId = () => {
        return this.store.autoLockTimeId;
    };

    setAutoLockTimeId = (id: number) => {
        this.store.autoLockTimeId = id;
        this.persist();
    };
}

export default new PreferenceService();
