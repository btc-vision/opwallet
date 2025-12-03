import { Account, AddressSummary, AppSummary, BitcoinBalance, TxHistoryItem } from '@/shared/types';
import { createSlice } from '@reduxjs/toolkit';

import { updateVersion } from '../global/actions';
import { DEFAULT_BITCOIN_BALANCE } from './constants';

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
                payload: BitcoinBalance & { address: string };
            }
        ) {
            const {
                payload: {
                    address,

                    btc_total_amount,
                    btc_confirm_amount,
                    btc_pending_amount,

                    csv75_total_amount,
                    csv75_unlocked_amount,
                    csv75_locked_amount,

                    csv2_total_amount,
                    csv2_unlocked_amount,
                    csv2_locked_amount,

                    csv1_total_amount,
                    csv1_unlocked_amount,
                    csv1_locked_amount,

                    usd_value,

                    p2wda_pending_amount,
                    p2wda_total_amount,

                    all_utxos_count,
                    unspent_utxos_count,
                    csv75_locked_utxos_count,
                    csv75_unlocked_utxos_count,
                    csv2_locked_utxos_count,
                    csv2_unlocked_utxos_count,
                    csv1_locked_utxos_count,
                    csv1_unlocked_utxos_count,
                    p2wda_utxos_count,
                    unspent_p2wda_utxos_count
                }
            } = action;
            state.balanceMap[address] = state.balanceMap[address] || { ...DEFAULT_BITCOIN_BALANCE };

            state.balanceMap[address].btc_total_amount = btc_total_amount;
            state.balanceMap[address].btc_confirm_amount = btc_confirm_amount;
            state.balanceMap[address].btc_pending_amount = btc_pending_amount;

            state.balanceMap[address].csv75_total_amount = csv75_total_amount;
            state.balanceMap[address].csv75_unlocked_amount = csv75_unlocked_amount;
            state.balanceMap[address].csv75_locked_amount = csv75_locked_amount;

            state.balanceMap[address].csv2_total_amount = csv2_total_amount;
            state.balanceMap[address].csv2_unlocked_amount = csv2_unlocked_amount;
            state.balanceMap[address].csv2_locked_amount = csv2_locked_amount;

            state.balanceMap[address].csv1_total_amount = csv1_total_amount;
            state.balanceMap[address].csv1_unlocked_amount = csv1_unlocked_amount;
            state.balanceMap[address].csv1_locked_amount = csv1_locked_amount;

            state.balanceMap[address].p2wda_pending_amount = p2wda_pending_amount;
            state.balanceMap[address].p2wda_total_amount = p2wda_total_amount;

            state.balanceMap[address].usd_value = usd_value;

            state.balanceMap[address].all_utxos_count = all_utxos_count;
            state.balanceMap[address].unspent_utxos_count = unspent_utxos_count;
            state.balanceMap[address].csv75_locked_utxos_count = csv75_locked_utxos_count;
            state.balanceMap[address].csv75_unlocked_utxos_count = csv75_unlocked_utxos_count;
            state.balanceMap[address].csv2_locked_utxos_count = csv2_locked_utxos_count;
            state.balanceMap[address].csv2_unlocked_utxos_count = csv2_unlocked_utxos_count;
            state.balanceMap[address].csv1_locked_utxos_count = csv1_locked_utxos_count;
            state.balanceMap[address].csv1_unlocked_utxos_count = csv1_unlocked_utxos_count;
            state.balanceMap[address].p2wda_utxos_count = p2wda_utxos_count;
            state.balanceMap[address].unspent_p2wda_utxos_count = unspent_p2wda_utxos_count;
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
