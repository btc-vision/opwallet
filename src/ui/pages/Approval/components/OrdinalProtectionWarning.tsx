import { WarningOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/ui/utils/WalletContext';

const ORDINAL_UTXO_THRESHOLD = 1000n;

interface UTXOLike {
    value: bigint | string | number;
    transactionId?: string;
    outputIndex?: number;
}

interface OrdinalProtectionWarningProps {
    address?: string;
    utxos?: UTXOLike[];
    optionalInputs?: UTXOLike[];
}

function toBigInt(value: bigint | string | number): bigint {
    if (typeof value === 'bigint') return value;
    try {
        return BigInt(value);
    } catch {
        return 0n;
    }
}

export function OrdinalProtectionWarning({ address, utxos, optionalInputs }: OrdinalProtectionWarningProps) {
    const wallet = useWallet();
    const [protectionEnabled, setProtectionEnabled] = useState<boolean | null>(null);
    const [fetchedSmallUtxoCount, setFetchedSmallUtxoCount] = useState(0);

    useEffect(() => {
        wallet
            .getUTXOProtectionDisabled()
            .then((disabled) => setProtectionEnabled(!disabled))
            .catch(() => setProtectionEnabled(true));
    }, [wallet]);

    // Fetch UTXOs by address when utxos/optionalInputs aren't provided
    useEffect(() => {
        if (!protectionEnabled || !address) return;

        wallet
            .getAddressUtxo(address)
            .then((fetchedUtxos) => {
                const count = fetchedUtxos.filter((u) => u.satoshis > 0 && u.satoshis < Number(ORDINAL_UTXO_THRESHOLD)).length;
                setFetchedSmallUtxoCount(count);
            })
            .catch(() => setFetchedSmallUtxoCount(0));
    }, [wallet, protectionEnabled, address]);

    // Use passed utxos if available, otherwise use fetched count
    const smallUtxos = useMemo(() => {
        const allUtxos = [...(utxos || []), ...(optionalInputs || [])];
        return allUtxos.filter((u) => toBigInt(u.value) < ORDINAL_UTXO_THRESHOLD && toBigInt(u.value) > 0n);
    }, [utxos, optionalInputs]);

    const hasSmallUtxos = smallUtxos.length > 0 || fetchedSmallUtxoCount > 0;
    const displayCount = smallUtxos.length > 0 ? smallUtxos.length : fetchedSmallUtxoCount;

    if (protectionEnabled === null || !protectionEnabled || !hasSmallUtxos) {
        return null;
    }

    return (
        <div
            style={{
                padding: '12px',
                background: '#ef444420',
                border: '2px solid #ef4444',
                borderRadius: '10px',
                marginBottom: '12px'
            }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                <WarningOutlined style={{ fontSize: 18, color: '#ef4444' }} />
                <span
                    style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#ef4444',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                    Ordinal Protection Warning
                </span>
            </div>

            <div
                style={{
                    fontSize: '12px',
                    color: '#fca5a5',
                    lineHeight: '1.5',
                    marginBottom: '8px'
                }}>
                {smallUtxos.length > 0 ? (
                    <>
                        This dApp is requesting to use{' '}
                        <strong style={{ color: '#ef4444' }}>
                            {smallUtxos.length} UTXO{smallUtxos.length > 1 ? 's' : ''}
                        </strong>{' '}
                        with value below {Number(ORDINAL_UTXO_THRESHOLD).toLocaleString()} sats.
                    </>
                ) : (
                    <>
                        Your wallet has{' '}
                        <strong style={{ color: '#ef4444' }}>
                            {displayCount} UTXO{displayCount > 1 ? 's' : ''}
                        </strong>{' '}
                        with value below {Number(ORDINAL_UTXO_THRESHOLD).toLocaleString()} sats that could be used in this transaction.
                    </>
                )}{' '}
                These UTXOs may contain{' '}
                <strong style={{ color: '#ef4444' }}>Ordinals, BRC-20 tokens, or Runes</strong> that will be
                permanently lost if spent.
            </div>

            {smallUtxos.length > 0 && (
                <div
                    style={{
                        background: '#ef444415',
                        borderRadius: '6px',
                        padding: '8px',
                        marginBottom: '8px'
                    }}>
                    {smallUtxos.map((utxo, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: '#fca5a5',
                                marginTop: idx > 0 ? '4px' : '0'
                            }}>
                            <span>
                                {utxo.transactionId
                                    ? `${utxo.transactionId.slice(0, 8)}...${utxo.transactionId.slice(-8)}:${utxo.outputIndex ?? '?'}`
                                    : `UTXO #${idx + 1}`}
                            </span>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                {Number(toBigInt(utxo.value)).toLocaleString()} sats
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div
                style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    fontWeight: 600,
                    textAlign: 'center'
                }}>
                Verify you have no valuable assets at risk before proceeding.
            </div>
        </div>
    );
}
