import { useMemo, useState } from 'react';

import { WalletKeyring } from '@/shared/types';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { keyringsActions } from '@/ui/state/keyrings/reducer';
import { shortAddress, useWallet } from '@/ui/utils';
import { WarningOutlined, WalletOutlined } from '@ant-design/icons';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    error: '#ef4444',
    warning: '#fbbf24'
};

export const RemoveWalletPopover = ({ keyring, onClose }: { keyring: WalletKeyring; onClose: () => void }) => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isDeleting, setIsDeleting] = useState(false);

    const displayAddress = useMemo(() => {
        if (!keyring.accounts[0]) return 'Invalid';
        return shortAddress(keyring.accounts[0].address);
    }, [keyring]);

    const handleRemove = async () => {
        setIsDeleting(true);
        try {
            const nextKeyring = await wallet.removeKeyring(keyring);
            const keyrings = await wallet.getKeyrings();
            dispatch(keyringsActions.setKeyrings(keyrings));

            if (nextKeyring) {
                dispatch(accountActions.setCurrent(nextKeyring.accounts[0]));
                onClose();
                return;
            }

            if (keyrings[0]) {
                dispatch(keyringsActions.setCurrent(keyrings[0]));
                onClose();
                return;
            }

            navigate(RouteTypes.WelcomeScreen);
        } catch (error) {
            console.error('Failed to remove wallet:', error);
        } finally {
            setIsDeleting(false);
        }
    };

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
                    maxWidth: '340px',
                    padding: '20px 16px',
                    zIndex: 1000
                }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <WarningOutlined style={{ fontSize: 32, color: colors.error }} />
                    <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text, marginTop: '10px' }}>
                        Remove Wallet
                    </div>
                    <div style={{ fontSize: '13px', color: colors.textFaded, marginTop: '6px' }}>
                        Are you sure you want to remove this wallet?
                    </div>
                </div>

                {/* Wallet Info */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        border: `1px solid ${colors.containerBorder}`,
                        marginBottom: '12px'
                    }}>
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: `${colors.error}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                        <WalletOutlined style={{ fontSize: 18, color: colors.error }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{keyring.alianName}</div>
                        <div style={{ fontSize: '12px', color: colors.textFaded, fontFamily: 'monospace' }}>
                            {displayAddress}
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '10px 12px',
                        background: `${colors.warning}10`,
                        border: `1px solid ${colors.warning}25`,
                        borderRadius: '10px',
                        marginBottom: '20px'
                    }}>
                    <WarningOutlined style={{ fontSize: 13, color: colors.warning, marginTop: '1px', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                        This action cannot be undone. Make sure you have backed up your seed phrase or private key.
                    </span>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: colors.buttonBg,
                            border: 'none',
                            borderRadius: '10px',
                            color: colors.text,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                        Cancel
                    </button>
                    <button
                        onClick={() => void handleRemove()}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: colors.error,
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            opacity: isDeleting ? 0.7 : 1
                        }}>
                        {isDeleting ? 'Removing...' : 'Remove'}
                    </button>
                </div>
            </div>
        </>
    );
};
