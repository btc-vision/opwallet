/**
 * Cold Storage Withdraw Screen
 *
 * Collects withdrawal parameters and navigates to TxOpnetConfirmScreen
 * for proper transaction building and signing using @btc-vision/transaction.
 */
import { useEffect, useState } from 'react';
import {
    SafetyCertificateOutlined,
    SendOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';

import { AddressVerificator } from '@btc-vision/transaction';

import { Layout, Header, Content, Column, Row, Button, Text, Input } from '@/ui/components';
import { useWallet, satoshisToAmount, amountToSatoshis } from '@/ui/utils';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useRotationState, useRefreshRotation } from '@/ui/state/rotation/hooks';
import Web3API from '@/shared/web3/Web3API';
import { Action, SourceType } from '@/shared/interfaces/RawTxParameters';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    coldBlue: '#3b82f6'
};

export default function ColdStorageWithdrawScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();

    const rotationState = useRotationState();
    const refreshRotation = useRefreshRotation();

    const [destinationAddress, setDestinationAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [feeRate, setFeeRate] = useState('10');
    const [coldWalletAddress, setColdWalletAddress] = useState('');
    const [error, setError] = useState('');

    const coldBalance = BigInt(rotationState.summary?.coldWalletBalance || '0');
    const coldBalanceBtc = satoshisToAmount(Number(coldBalance));

    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                await Web3API.setNetwork(await wallet.getChainType());

                // Get cold wallet address
                const coldAddr = await wallet.getColdWalletAddress();
                setColdWalletAddress(coldAddr);
            } catch (err) {
                console.error('Failed to fetch addresses:', err);
            }
        };

        if (rotationState.enabled) {
            void fetchAddresses();
        }
    }, [rotationState.enabled, wallet]);

    const handleMaxAmount = () => {
        // Set max amount (cold balance minus estimated fee)
        const estimatedFee = BigInt(feeRate) * 200n; // Rough estimate: 200 vbytes
        const maxAmount = coldBalance - estimatedFee;
        if (maxAmount > 0n) {
            setAmount(satoshisToAmount(Number(maxAmount)));
        }
    };

    const isValidBitcoinAddress = (address: string): boolean => {
        const trimmed = address.trim();
        if (!trimmed) return false;

        try {
            const addressType = AddressVerificator.detectAddressType(trimmed, Web3API.network);
            return !!addressType;
        } catch {
            return false;
        }
    };

    const validateInputs = (): boolean => {
        setError('');

        if (!destinationAddress.trim()) {
            setError('Please enter a destination address');
            return false;
        }

        if (!isValidBitcoinAddress(destinationAddress)) {
            setError('Please enter a valid Bitcoin address');
            return false;
        }

        if (!amount.trim() || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return false;
        }

        const amountSats = amountToSatoshis(amount);
        if (BigInt(amountSats) > coldBalance) {
            setError('Amount exceeds cold storage balance');
            return false;
        }

        const feeRateNum = parseInt(feeRate);
        if (isNaN(feeRateNum) || feeRateNum < 1) {
            setError('Please enter a valid fee rate');
            return false;
        }

        return true;
    };

    const handleWithdraw = () => {
        if (!validateInputs()) return;

        // Navigate to TxOpnetConfirmScreen with SendBitcoinParameters
        navigate(RouteTypes.TxOpnetConfirmScreen, {
            action: Action.SendBitcoin,
            header: 'Cold Storage Withdrawal',
            features: {},
            tokens: [],
            feeRate: parseInt(feeRate),
            priorityFee: 0n,
            to: destinationAddress.trim(),
            inputAmount: amountToSatoshis(amount),
            from: coldWalletAddress,
            sourceType: SourceType.COLD_STORAGE,
            optimize: true
        });
    };

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Withdraw from Cold Storage" />
            <Content>
                <Column gap="md" style={{ padding: '16px' }}>
                    {/* Cold Storage Info */}
                    <div
                        style={{
                            background: `linear-gradient(145deg, ${colors.coldBlue}15 0%, ${colors.coldBlue}08 100%)`,
                            border: `1px solid ${colors.coldBlue}30`,
                            borderRadius: '14px',
                            padding: '16px'
                        }}>
                        <Row style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <SafetyCertificateOutlined style={{ fontSize: 24, color: colors.coldBlue }} />
                            <Column>
                                <Text text="Cold Storage Balance" style={{ fontSize: 12, color: colors.textFaded }} />
                                <Text
                                    text={`${coldBalanceBtc} BTC`}
                                    style={{ fontSize: 20, fontWeight: 600, color: colors.coldBlue }}
                                />
                            </Column>
                        </Row>
                        <Text
                            text={coldWalletAddress}
                            style={{
                                fontSize: 10,
                                fontFamily: 'monospace',
                                color: colors.textFaded,
                                wordBreak: 'break-all'
                            }}
                        />
                    </div>

                    {/* Destination Address */}
                    <Column gap="sm">
                        <Text text="Destination Address" preset="bold" size="sm" />
                        <Input
                            placeholder="Enter recipient address"
                            value={destinationAddress}
                            onChange={(e) => setDestinationAddress(e.target.value)}
                        />
                    </Column>

                    {/* Amount */}
                    <Column gap="sm">
                        <Row justifyBetween>
                            <Text text="Amount (BTC)" preset="bold" size="sm" />
                            <Text
                                text="Max"
                                style={{ color: colors.main, cursor: 'pointer', fontSize: 12 }}
                                onClick={handleMaxAmount}
                            />
                        </Row>
                        <Input
                            placeholder="0.00000000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </Column>

                    {/* Fee Rate */}
                    <Column gap="sm">
                        <Text text="Fee Rate (sat/vB)" preset="bold" size="sm" />
                        <Input
                            placeholder="10"
                            value={feeRate}
                            onChange={(e) => setFeeRate(e.target.value)}
                        />
                    </Column>

                    {/* Error message */}
                    {error && (
                        <div
                            style={{
                                background: `${colors.error}15`,
                                border: `1px solid ${colors.error}40`,
                                borderRadius: '10px',
                                padding: '10px 12px'
                            }}>
                            <Text text={error} style={{ color: colors.error, fontSize: 12 }} />
                        </div>
                    )}

                    {/* Warning */}
                    <div
                        style={{
                            background: `${colors.warning}10`,
                            border: `1px solid ${colors.warning}30`,
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8
                        }}>
                        <InfoCircleOutlined style={{ fontSize: 14, color: colors.warning, marginTop: 2 }} />
                        <Text
                            text="Any change from this withdrawal will remain in cold storage. You can withdraw the remaining balance in a separate transaction."
                            style={{ fontSize: 11, color: colors.textFaded, lineHeight: 1.4 }}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        preset="primary"
                        text="Continue"
                        icon={<SendOutlined />}
                        onClick={handleWithdraw}
                        disabled={coldBalance === 0n}
                        style={{ marginTop: 8 }}
                    />
                </Column>
            </Content>
        </Layout>
    );
}
