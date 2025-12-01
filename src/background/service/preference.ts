import { AddressFlagType, CHAINS, ChainType, CustomNetwork, DEFAULT_LOCKTIME_ID, EVENTS } from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import { SessionEvent } from '@/shared/interfaces/SessionEvent';
import { Account, AddressTypes, AppSummary, NetworkType, storageToAddressTypes, TxHistoryItem } from '@/shared/types';
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
    historyMap: Record<string, TxHistoryItem[]>;
    locale: string;
    watchAddressPreference: Record<string, number>;
    walletSavedList: WalletSaveList;
    alianNames?: Record<string, string>;
    initAlianNames: boolean;
    currentVersion: string;
    firstOpen: boolean;
    currency: string;
    addressType: AddressTypes | number; // Support both for migration
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
    autoLockTimeId: number;
    customNetworks: Record<string, CustomNetwork>;
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
        historyMap: {},
        locale: defaultLang,
        watchAddressPreference: {},
        walletSavedList: [] as WalletSaveList,
        alianNames: {},
        initAlianNames: false,
        currentVersion: '0',
        firstOpen: false,
        currency: 'USD',
        addressType: AddressTypes.P2TR,
        networkType: NetworkType.REGTEST, // DEFAULT NETWORK
        chainType: ChainType.BITCOIN_REGTEST,
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
        autoLockTimeId: DEFAULT_LOCKTIME_ID,
        customNetworks: {}
    } as PreferenceStore
};

class PreferenceService {
    store!: PreferenceStore;
    popupOpen = false;

    init = async () => {
        const data = await browser.storage.local.get('preference');
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

        if (!this.store.historyMap) {
            this.store.historyMap = {};
        }

        if (!this.store.walletSavedList) {
            this.store.walletSavedList = [];
        }

        if (this.store.addressType === undefined || this.store.addressType === null) {
            this.store.addressType = AddressTypes.P2WPKH;
        } else if (typeof this.store.addressType === 'number') {
            // Migrate legacy numeric address types to string
            this.store.addressType = storageToAddressTypes(this.store.addressType);
        }

        if (!this.store.networkType) {
            this.store.networkType = NetworkType.REGTEST;
        }

        if (this.store.currentAccount) {
            if (!this.store.currentAccount.pubkey) {
                this.store.currentAccount = undefined;
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

        if (!this.store.chainType) {
            this.store.chainType = ChainType.BITCOIN_REGTEST;
        }

        if (typeof this.store.autoLockTimeId !== 'number') {
            this.store.autoLockTimeId = DEFAULT_LOCKTIME_ID;
        }

        if (!this.store.customNetworks) {
            this.store.customNetworks = {};
        }

        if (!saved) {
            await this.persist();
        }
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

    setCurrentAccount = async (account?: Account | null) => {
        this.store.currentAccount = account;
        if (account) {
            sessionService.broadcastEvent(SessionEvent.accountsChanged, [account.address]);
            eventBus.emit(EVENTS.broadcastToUI, {
                method: 'accountsChanged',
                params: account
            });
        }
        await this.persist();
    };

    getWatchAddressPreference = () => {
        return this.store.watchAddressPreference;
    };

    setWatchAddressPreference = async (address: string, preference: number) => {
        this.store.watchAddressPreference = Object.assign({}, this.store.watchAddressPreference, {
            [address]: preference
        });
        await this.persist();
    };

    setPopupOpen = (isOpen: boolean) => {
        this.popupOpen = isOpen;
    };

    getPopupOpen = () => {
        return this.popupOpen;
    };

    updateAddressHistory = async (address: string, data: TxHistoryItem[]) => {
        const historyMap = this.store.historyMap || {};
        this.store.historyMap = {
            ...historyMap,
            [address]: data
        };
        await this.persist();
    };

    removeAddressHistory = async (address: string) => {
        const key = address;
        if (key in this.store.historyMap) {
            const map = this.store.historyMap;
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete map[key];
            this.store.historyMap = map;
        }
        await this.persist();
    };

    getAddressHistory = (address: string): TxHistoryItem[] => {
        const historyMap = this.store.historyMap || {};
        return historyMap[address] || [];
    };

    getExternalLinkAck = (): boolean => {
        return this.store.externalLinkAck;
    };

    setExternalLinkAck = async (ack = false) => {
        this.store.externalLinkAck = ack;
        await this.persist();
    };

    getLocale = () => {
        return this.store.locale;
    };

    setLocale = async (locale: string) => {
        this.store.locale = locale;
        await i18n.changeLanguage(locale);
        await this.persist();
    };

    getCurrency = () => {
        return this.store.currency;
    };

    setCurrency = async (currency: string) => {
        this.store.currency = currency;
        await this.persist();
    };

    getWalletSavedList = () => {
        return this.store.walletSavedList || [];
    };

    updateWalletSavedList = async (list: []) => {
        this.store.walletSavedList = list;
        await this.persist();
    };

    getInitAlianNameStatus = () => {
        return this.store.initAlianNames;
    };

    changeInitAlianNameStatus = async () => {
        this.store.initAlianNames = true;
        await this.persist();
    };

    getIsFirstOpen = async () => {
        if (!this.store.currentVersion || compareVersions(version, this.store.currentVersion)) {
            this.store.currentVersion = version;
            this.store.firstOpen = true;
        }
        await this.persist();
        return this.store.firstOpen;
    };

    updateIsFirstOpen = async () => {
        this.store.firstOpen = false;
        await this.persist();
    };

    getAddressType = (): AddressTypes => {
        // Always return AddressTypes string enum
        if (typeof this.store.addressType === 'number') {
            return storageToAddressTypes(this.store.addressType);
        }
        // After the type check, this.store.addressType is narrowed to AddressTypes
        return this.store.addressType;
    };

    getChainType = (): ChainType => {
        if (!this.store) {
            throw new Error('Preference store is not initialized');
        }

        if (!CHAINS.find((chain) => chain.enum === this.store.chainType)) {
            this.store.chainType = ChainType.BITCOIN_REGTEST;
        }

        return this.store.chainType;
    };

    setChainType = async (chainType: ChainType) => {
        this.store.chainType = chainType;
        await this.persist();
    };

    getCurrentKeyringIndex = () => {
        return this.store.currentKeyringIndex;
    };

    setCurrentKeyringIndex = async (keyringIndex: number) => {
        this.store.currentKeyringIndex = keyringIndex;
        await this.persist();
    };

    setKeyringAlianName = async (keyringKey: string, name: string) => {
        this.store.keyringAlianNames = Object.assign({}, this.store.keyringAlianNames, { [keyringKey]: name });
        await this.persist();
    };

    getKeyringAlianName = async (keyringKey: string, defaultName?: string) => {
        const name = this.store.keyringAlianNames[keyringKey];
        if (!name && defaultName) {
            this.store.keyringAlianNames[keyringKey] = defaultName;
            await this.persist();
        }
        return this.store.keyringAlianNames[keyringKey];
    };

    setAccountAlianName = async (accountKey: string, name: string) => {
        this.store.accountAlianNames = Object.assign({}, this.store.accountAlianNames, { [accountKey]: name });
        await this.persist();
    };

    getAccountAlianName = async (accountKey: string, defaultName?: string) => {
        const name = this.store.accountAlianNames[accountKey];
        if (!name && defaultName) {
            this.store.accountAlianNames[accountKey] = defaultName;
        }
        await this.persist();
        return this.store.accountAlianNames[accountKey];
    };

    // get address flag
    getAddressFlag = (address: string) => {
        return this.store.addressFlags[address] || 0;
    };

    setAddressFlag = async (address: string, flag: number) => {
        this.store.addressFlags = Object.assign({}, this.store.addressFlags, { [address]: flag });
        await this.persist();
    };

    // Add address flag
    addAddressFlag = async (address: string, flag: AddressFlagType) => {
        const finalFlag = (this.store.addressFlags[address] || 0) | flag;
        this.store.addressFlags = Object.assign({}, this.store.addressFlags, { [address]: finalFlag });
        await this.persist();
        return finalFlag;
    };

    // Remove address flag
    removeAddressFlag = async (address: string, flag: AddressFlagType) => {
        const finalFlag = (this.store.addressFlags[address] || 0) & ~flag;
        this.store.addressFlags = Object.assign({}, this.store.addressFlags, { [address]: finalFlag });
        await this.persist();
        return finalFlag;
    };

    // editingKeyringIndex
    getEditingKeyringIndex = () => {
        return this.store.editingKeyringIndex;
    };

    setEditingKeyringIndex = async (keyringIndex: number) => {
        this.store.editingKeyringIndex = keyringIndex;
        await this.persist();
    };

    // editingAccount
    getEditingAccount = () => {
        return cloneDeep(this.store.editingAccount);
    };

    setEditingAccount = async (account?: Account | null) => {
        this.store.editingAccount = account;
        await this.persist();
    };

    getSkippedVersion = () => {
        return this.store.skippedVersion;
    };

    setSkippedVersion = async (version: string) => {
        this.store.skippedVersion = version;
        await this.persist();
    };

    getAppTab = () => {
        return this.store.appTab;
    };

    setAppSummary = async (appSummary: AppSummary) => {
        this.store.appTab.summary = appSummary;
        await this.persist();
    };

    setReadTabTime = async (timestamp: number) => {
        this.store.appTab.readTabTime = timestamp;
        await this.persist();
    };

    setReadAppTime = async (appid: number, timestamp: number) => {
        this.store.appTab.readAppTime[appid] = timestamp;
        await this.persist();
    };

    getShowSafeNotice = () => {
        return this.store.showSafeNotice;
    };

    setShowSafeNotice = async (showSafeNotice: boolean) => {
        this.store.showSafeNotice = showSafeNotice;
        await this.persist();
    };

    getAutoLockTimeId = () => {
        return this.store.autoLockTimeId;
    };

    getCustomNetworks = (): Record<string, CustomNetwork> => {
        return this.store.customNetworks || {};
    };

    setCustomNetworks = async (networks: Record<string, CustomNetwork>) => {
        this.store.customNetworks = networks;
        await this.persist();
    };

    addCustomNetwork = async (network: CustomNetwork) => {
        this.store.customNetworks = {
            ...this.store.customNetworks,
            [network.id]: network
        };
        await this.persist();
    };

    removeCustomNetwork = async (id: string) => {
        const networks = { ...this.store.customNetworks };
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete networks[id];

        this.store.customNetworks = networks;
        await this.persist();
    };

    // getEnableSignData = () => {
    //     return this.store.enableSignData;
    // };

    // setEnableSignData = (enableSignData: boolean) => {
    //     this.store.enableSignData = enableSignData;
    //     this.persist();
    // };

    setAutoLockTimeId = async (id: number) => {
        this.store.autoLockTimeId = id;

        await this.persist();
    };

    private persist = async () => {
        await browser.storage.local.set({ preference: this.store });
    };
}

export default new PreferenceService();
