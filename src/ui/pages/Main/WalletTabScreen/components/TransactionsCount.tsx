import { UTXO_CONFIG } from '@/shared/config';
import React, { CSSProperties } from 'react';
import { UTXO_SECTION_LABELS } from '../constants';
import { ProgressSection } from './ProgressSection';

interface TransactionsCountProps {
    unspent_utxos_count: number;
    csv75_locked_utxos_count: number;
    csv75_unlocked_utxos_count: number;
    csv1_locked_utxos_count: number;
    csv1_unlocked_utxos_count: number;
    p2wda_utxos_count: number;
    unspent_p2wda_utxos_count: number;
    colors: {
        main: string;
        containerBorder: string;
        success: string;
        error: string;
        warning: string;
        textFaded: string;
    };
    noBreakStyle: CSSProperties;
}

export const TransactionsCount: React.FC<TransactionsCountProps> = ({
    unspent_utxos_count,
    csv75_locked_utxos_count,
    csv75_unlocked_utxos_count,
    csv1_locked_utxos_count,
    csv1_unlocked_utxos_count,
    p2wda_utxos_count,
    unspent_p2wda_utxos_count,
    colors,
    noBreakStyle
}) => {
    const maxUTXOs = UTXO_CONFIG.MAX_UTXOS;
    const warningThreshold = UTXO_CONFIG.WARNING_THRESHOLD;

    return (
        <div
            style={{
                marginBottom: '8px',
                textAlign: 'left'
            }}>
            <div
                style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: colors.textFaded,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'left'
                }}>
                UTXOs Counts
            </div>

            {/* Primary Account UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.PRIMARY}
                currentValue={unspent_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />

            {/* CSV75 Locked UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.CSV75_LOCKED}
                currentValue={csv75_locked_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />

            {/* CSV75 Unlocked UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.CSV75_UNLOCKED}
                currentValue={csv75_unlocked_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />

            {/* CSV1 Locked UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.CSV1_LOCKED}
                currentValue={csv1_locked_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />

            {/* CSV1 Unlocked UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.CSV1_UNLOCKED}
                currentValue={csv1_unlocked_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />

            {/* P2WDA UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.P2WDA_ALL}
                currentValue={p2wda_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />

            {/* Unspent P2WDA UTXOs */}
            <ProgressSection
                label={UTXO_SECTION_LABELS.P2WDA_UNSPENT}
                currentValue={unspent_p2wda_utxos_count}
                maxValue={maxUTXOs}
                warningThreshold={warningThreshold}
                colors={colors}
                noBreakStyle={noBreakStyle}
            />
        </div>
    );
};
