import { useState } from 'react';
import { CheckCircleFilled, WarningOutlined } from '@ant-design/icons';
import { faShieldHalved, faBolt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import type { WalletController } from '@/ui/utils/WalletContext';

type UTXOMode = 'protected' | 'fullaccess';

interface UTXOOption {
    mode: UTXOMode;
    title: string;
    description: string;
    icon: typeof faShieldHalved;
    iconColor: string;
    features: string[];
    badge?: string;
}

const utxoOptions: UTXOOption[] = [
    {
        mode: 'protected',
        title: 'Protected Mode',
        description: 'Safe for ordinal holders',
        icon: faShieldHalved,
        iconColor: '#4ade80',
        features: ['Filters UTXOs under 1,000 sat', 'Prevents accidental ordinal spending', 'Safe default for most users'],
        badge: 'Recommended',
    },
    {
        mode: 'fullaccess',
        title: 'Full Access Mode',
        description: 'Uses all UTXOs',
        icon: faBolt,
        iconColor: '#f59e0b',
        features: ['Access all UTXOs including small ones', 'May spend ordinals accidentally', 'For users who don\'t hold ordinals'],
    },
];

export function OnboardingUTXO({
    wallet,
    onContinue,
}: {
    wallet: WalletController;
    onContinue: () => void;
}) {
    const [selected, setSelected] = useState<UTXOMode | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleSelect = (mode: UTXOMode) => {
        if (mode === 'fullaccess') {
            setShowConfirm(true);
        } else {
            setSelected(mode);
            setShowConfirm(false);
            setConfirmText('');
        }
    };

    const handleContinue = () => {
        if (!selected) return;
        const disabled = selected === 'fullaccess';
        void wallet.setUTXOProtectionDisabled(disabled).then(onContinue);
    };

    const handleConfirmDisable = () => {
        setSelected('fullaccess');
        setShowConfirm(false);
        setConfirmText('');
    };

    if (showConfirm) {
        return (
            <div>
                <div className="utxo__header">
                    <WarningOutlined style={{ fontSize: 32, color: 'var(--color-error)' }} />
                    <div className="utxo__title utxo__title--error">Are You Sure?</div>
                </div>

                <div className="utxo__info alert-error">
                    <div className="alert-title text-error">THIS MAY DESTROY YOUR ORDINALS</div>
                    <div className="utxo__info-text utxo__info-text--muted">
                        OPWallet will use all UTXOs including those under 1,000 sat. If any contain ordinals or
                        inscriptions, they will be permanently spent and lost.
                    </div>
                </div>

                <div className="utxo__confirm-input">
                    <div className="utxo__confirm-label">
                        Type <strong className="text-error">DISABLE</strong> to confirm:
                    </div>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DISABLE"
                        className={`input input-center input-mono ${confirmText === 'DISABLE' ? 'input-error' : ''}`}
                    />
                </div>

                <div className="utxo__actions">
                    <button
                        onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                        className="btn btn-success">
                        Go Back - Keep Protection
                    </button>
                    <button
                        disabled={confirmText !== 'DISABLE'}
                        onClick={handleConfirmDisable}
                        className={`btn ${confirmText === 'DISABLE' ? 'btn-danger' : 'btn-disabled'}`}>
                        Confirm - Disable Protection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="utxo__header">
                <div className="utxo__title">UTXO Protection</div>
                <div className="utxo__subtitle">Protect ordinals from accidental spending</div>
            </div>

            <div className="utxo__cards">
                {utxoOptions.map((option) => {
                    const isSelected = selected === option.mode;
                    return (
                        <button
                            key={option.mode}
                            type="button"
                            className={`utxo__card ${isSelected ? 'utxo__card--selected' : ''}`}
                            style={{
                                borderColor: isSelected ? option.iconColor : undefined,
                                background: isSelected ? `${option.iconColor}10` : undefined,
                            }}
                            onClick={() => handleSelect(option.mode)}>
                            {isSelected && (
                                <CheckCircleFilled
                                    className="utxo__card-check"
                                    style={{ color: option.iconColor }}
                                />
                            )}

                            {option.badge && (
                                <span className="utxo__card-badge">{option.badge}</span>
                            )}

                            <div className="utxo__card-icon-row">
                                <div
                                    className="utxo__card-icon"
                                    style={{ background: `${option.iconColor}20` }}>
                                    <FontAwesomeIcon
                                        icon={option.icon}
                                        style={{ fontSize: 20, color: option.iconColor }}
                                    />
                                </div>
                                <div>
                                    <div className="utxo__card-title">{option.title}</div>
                                    <div className="utxo__card-desc">{option.description}</div>
                                </div>
                            </div>

                            <div className="utxo__card-features">
                                {option.features.map((feature, i) => (
                                    <div key={i} className="utxo__card-feature">
                                        <span
                                            className="utxo__card-dot"
                                            style={{ background: option.iconColor }}
                                        />
                                        <span className="utxo__card-feature-text">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                disabled={!selected}
                onClick={handleContinue}
                className={`btn ${selected ? 'btn-primary' : 'btn-disabled'}`}>
                Continue
            </button>
        </div>
    );
}
