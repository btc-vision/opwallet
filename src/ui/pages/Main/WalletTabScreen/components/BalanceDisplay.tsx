import React, { CSSProperties } from 'react';
import { BitcoinBalance } from '@/shared/types';
import { BtcDisplay } from './BtcDisplay';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { amountToSatoshis } from '@/ui/utils';
import { BalanceTabs } from './BalanceTabs';
import { TransactionsCount } from './TransactionsCount';

interface BalanceDisplayProps {
    accountBalance: BitcoinBalance;
    showDetails: boolean;
    btcUnit: string;
    colors: {
        main: string;
        btcOrange: string;
        textFaded: string;
        buttonBg: string;
        buttonHoverBg: string;
        containerBorder: string;
        success: string;
        error: string;
        warning: string;
    };
    noBreakStyle: CSSProperties;
}

/**
 * Component to display balance in either detailed (tabs) or simple mode
 */
export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
    accountBalance,
    showDetails,
    btcUnit,
    colors,
    noBreakStyle
}) => {
    // Helper function to calculate total balance including CSV amounts
    const calculateTotalBalance = () => {
        const mainBalance = parseFloat(accountBalance.btc_total_amount || '0');
        const csv75Total = parseFloat(accountBalance.csv75_total_amount || '0');
        const csv1Total = parseFloat(accountBalance.csv1_total_amount || '0');

        const total = mainBalance + csv75Total + csv1Total;
        return total.toFixed(8).replace(/\.?0+$/, '');
    };

    if (showDetails) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                marginTop: '8px'
            }}>
                <BalanceTabs
                    accountBalance={accountBalance}
                    btcUnit={btcUnit}
                    colors={colors}
                    noBreakStyle={noBreakStyle}
                    TransactionsCountComponent={
                        <TransactionsCount
                            unspent_utxos_count={accountBalance.unspent_utxos_count}
                            csv75_locked_utxos_count={accountBalance.csv75_locked_utxos_count}
                            csv75_unlocked_utxos_count={accountBalance.csv75_unlocked_utxos_count}
                            csv1_locked_utxos_count={accountBalance.csv1_locked_utxos_count}
                            csv1_unlocked_utxos_count={accountBalance.csv1_unlocked_utxos_count}
                            p2wda_utxos_count={accountBalance.p2wda_utxos_count}
                            unspent_p2wda_utxos_count={accountBalance.unspent_p2wda_utxos_count}
                            colors={{...colors, textFaded: colors.textFaded}}
                            noBreakStyle={noBreakStyle}
                        />
                    }
                />
            </div>
        );
    }

    return (
        <>
            {/* Display the combined total */}
            <BtcDisplay balance={calculateTotalBalance()} />
            <BtcUsd
                sats={amountToSatoshis(calculateTotalBalance())}
                textCenter
                size={'sm'}
                style={{
                    marginBottom: '4px'
                }}
            />
        </>
    );
};
