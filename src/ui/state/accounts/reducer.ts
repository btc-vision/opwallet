import { Account, AddressSummary, AppSummary, BitcoinBalance, TxHistoryItem } from '@/shared/types';
import { createSlice } from '@reduxjs/toolkit';

import { updateVersion } from '../global/actions';

export interface AccountsState {
    accounts: Account[];
    current: Account;
    loading: boolean;
    balanceMap: Record<string, BitcoinBalance>;
    historyMap: Record<
        string,
        {
            list: TxHistoryItem[];
        }
    >;
    inscriptionsMap: Record<string, {}>;
    appSummary: AppSummary;
    addressSummary: AddressSummary;
}

const initialAccount = {
    type: '',
    address: '',
    brandName: '',
    alianName: '',
    displayBrandName: '',
    index: 0,
    balance: 0,
    pubkey: '',
    key: '',
    flag: 0
};

export const initialState: AccountsState = {
    accounts: [],
    current: initialAccount,
    loading: false,
    balanceMap: {},
    historyMap: {},
    inscriptionsMap: {},
    appSummary: {
        apps: []
    },
    addressSummary: {
        address: '',
        totalSatoshis: 0,
        loading: true
    }
};

const slice = createSlice({
    name: 'accounts',
    initialState,
    reducers: {
        pendingLogin(state) {
            state.loading = true;
        },
        setCurrent(state, action: { payload: Account }) {
            const { payload } = action;
            state.current = payload || initialAccount;
        },
        setAccounts(state, action: { payload: Account[] }) {
            const { payload } = action;
            state.accounts = payload;
        },
        setBalance(
            state,
            action: {
                payload: {
                    address: string;

                    amount: string;
                    confirm_amount: string;
                    pending_amount: string;

                    btc_amount: string;
                    confirm_btc_amount: string;
                    pending_btc_amount: string;

                    csv75_total_amount: string;
                    csv75_unlocked_amount: string;
                    csv75_locked_amount: string;

                    csv1_total_amount: string;
                    csv1_unlocked_amount: string;
                    csv1_locked_amount: string;

                    inscription_amount: string;
                    confirm_inscription_amount: string;
                    pending_inscription_amount: string;

                    usd_value: string;
                };
            }
        ) {
            const {
                payload: {
                    address,

                    amount,
                    confirm_amount,
                    pending_amount,

                    btc_amount,
                    confirm_btc_amount,
                    pending_btc_amount,

                    csv75_total_amount,
                    csv75_unlocked_amount,
                    csv75_locked_amount,

                    csv1_total_amount,
                    csv1_unlocked_amount,
                    csv1_locked_amount,

                    inscription_amount,
                    confirm_inscription_amount,
                    pending_inscription_amount,

                    usd_value
                }
            } = action;
            state.balanceMap[address] = state.balanceMap[address] || {
                amount: '0',
                confirm_amount: '0',
                pending_amount: '0',

                btc_amount: '0',
                confirm_btc_amount: '0',
                pending_btc_amount: '0',

                csv75_total_amount: '0',
                csv75_unlocked_amount: '0',
                csv75_locked_amount: '0',

                csv1_total_amount: '0',
                csv1_unlocked_amount: '0',
                csv1_locked_amount: '0',

                inscription_amount: '0',
                confirm_inscription_amount: '0',
                pending_inscription_amount: '0',

                usd_value: '0.00'
            };
            state.balanceMap[address].amount = amount;
            state.balanceMap[address].confirm_amount = confirm_amount;
            state.balanceMap[address].pending_amount = pending_amount;

            state.balanceMap[address].btc_amount = btc_amount;
            state.balanceMap[address].confirm_btc_amount = confirm_btc_amount;
            state.balanceMap[address].pending_btc_amount = pending_btc_amount;

            state.balanceMap[address].csv75_total_amount = csv75_total_amount;
            state.balanceMap[address].csv75_unlocked_amount = csv75_unlocked_amount;
            state.balanceMap[address].csv75_locked_amount = csv75_locked_amount;

            state.balanceMap[address].csv1_total_amount = csv1_total_amount;
            state.balanceMap[address].csv1_unlocked_amount = csv1_unlocked_amount;
            state.balanceMap[address].csv1_locked_amount = csv1_locked_amount;

            state.balanceMap[address].inscription_amount = inscription_amount;
            state.balanceMap[address].confirm_inscription_amount = confirm_inscription_amount;
            state.balanceMap[address].pending_inscription_amount = pending_inscription_amount;

            state.balanceMap[address].usd_value = usd_value;
        },
        setAddressSummary(state, action: { payload: AddressSummary }) {
            state.addressSummary = action.payload;
        },
        setHistory(state, action: { payload: { address: string; list: TxHistoryItem[] } }) {
            const {
                payload: { address, list }
            } = action;
            state.historyMap[address] = state.historyMap[address] || {
                list: []
            };
            state.historyMap[address].list = list;
        },
        setInscriptions(state, action: { payload: { address: string } }) {
            const {
                payload: { address }
            } = action;
            state.inscriptionsMap[address] = state.inscriptionsMap[address] || {
                list: []
            };
        },
        setCurrentAccountName(state, action: { payload: string }) {
            const { payload } = action;
            state.current.alianName = payload;
            const account = state.accounts.find((v) => v.address === state.current.address);
            if (account) {
                account.alianName = payload;
            }
        },
        setCurrentAddressFlag(state, action: { payload: number }) {
            const { payload } = action;
            state.current.flag = payload;
            const account = state.accounts.find((v) => v.address === state.current.address);
            if (account) {
                account.flag = payload;
            }
        },
        setAppSummary(state, action: { payload: AppSummary }) {
            const { payload } = action;
            state.appSummary = payload;
        },
        rejectLogin(state) {
            state.loading = false;
        },
        reset(state) {
            return initialState;
        },
        updateAccountName(
            state,
            action: {
                payload: Account;
            }
        ) {
            const account = action.payload;
            if (state.current.key === account.key) {
                state.current.alianName = account.alianName;
            }
            state.accounts.forEach((v) => {
                if (v.key === account.key) {
                    v.alianName = account.alianName;
                }
            });
        }
    },
    extraReducers: (builder) => {
        builder.addCase(updateVersion, (state) => {
            // todo
            if (!state.addressSummary) {
                state.addressSummary = {
                    totalSatoshis: 0,
                    address: ''
                };
            }
        });
    }
});

export const accountActions = slice.actions;
export default slice.reducer;
