import { CSSProperties } from 'react';

import { BitcoinBalance } from '@/shared/types';
import { BalanceTabs } from '@/ui/pages/Main/WalletTabScreen/components/BalanceTabs';
import { TransactionsCount } from '@/ui/pages/Main/WalletTabScreen/components/TransactionsCount';
import { CloseOutlined } from '@ant-design/icons';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    btcOrange: '#e9983d'
};

const $noBreakStyle: CSSProperties = { whiteSpace: 'nowrap' };

export function BalanceDetailPopup({
    accountBalance,
    btcUnit,
    onClose
}: {
    accountBalance: BitcoinBalance;
    btcUnit: string;
    onClose: () => void;
}) {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 999
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#1a1a1a',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '360px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '16px',
                    zIndex: 1000
                }}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>
                        Balance Details
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex'
                        }}>
                        <CloseOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                    </button>
                </div>

                {/* Balance Tabs */}
                <BalanceTabs
                    accountBalance={accountBalance}
                    btcUnit={btcUnit}
                    colors={colors}
                    noBreakStyle={$noBreakStyle}
                    noBorder={true}
                    alignLeft={true}
                    TransactionsCountComponent={
                        <TransactionsCount
                            unspent_utxos_count={accountBalance.unspent_utxos_count}
                            csv75_locked_utxos_count={accountBalance.csv75_locked_utxos_count}
                            csv75_unlocked_utxos_count={accountBalance.csv75_unlocked_utxos_count}
                            csv3_locked_utxos_count={accountBalance.csv3_locked_utxos_count}
                            csv3_unlocked_utxos_count={accountBalance.csv3_unlocked_utxos_count}
                            csv2_locked_utxos_count={accountBalance.csv2_locked_utxos_count}
                            csv2_unlocked_utxos_count={accountBalance.csv2_unlocked_utxos_count}
                            csv1_locked_utxos_count={accountBalance.csv1_locked_utxos_count}
                            csv1_unlocked_utxos_count={accountBalance.csv1_unlocked_utxos_count}
                            p2wda_utxos_count={accountBalance.p2wda_utxos_count}
                            unspent_p2wda_utxos_count={accountBalance.unspent_p2wda_utxos_count}
                            colors={{ ...colors, textFaded: colors.textFaded }}
                            noBreakStyle={$noBreakStyle}
                        />
                    }
                />
            </div>
        </>
    );
}
