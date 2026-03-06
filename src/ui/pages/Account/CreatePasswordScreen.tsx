import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Layout, Content, Header } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useWallet, useWalletRequest } from '@/ui/utils';
import { getPasswordStrengthWord, MIN_PASSWORD_LENGTH } from '@/ui/utils/password-utils';
import { LockOutlined } from '@ant-design/icons';

import { WalletError } from '@/shared/types/Error';
import { RouteTypes, useNavigate } from '../routeTypes';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    buttonBg: '#434343',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

interface LocationState {
    isNewAccount?: boolean;
    isKeystone?: boolean;
}

export default function CreatePasswordScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const loc = useLocation();
    const params = new URLSearchParams(loc.search);

    let state: LocationState = {};
    if (loc.state) {
        state = loc.state as LocationState;
    }
    if (Array.from(params).length > 0) {
        params.forEach((value, key) => {
            state[key as keyof LocationState] = value === 'true';
        });
    }

    const { isNewAccount, isKeystone } = state;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const disabled = useMemo(() => {
        return !(newPassword && newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword);
    }, [newPassword, confirmPassword]);

    const tools = useTools();
    const [run] = useWalletRequest(wallet.boot.bind(wallet), {
        onSuccess() {
            if (isKeystone) {
                navigate(RouteTypes.CreateKeystoneWalletScreen, { fromUnlock: true });
            } else if (isNewAccount) {
                navigate(RouteTypes.CreateHDWalletScreen, { isImport: false, fromUnlock: true });
            } else {
                navigate(RouteTypes.CreateHDWalletScreen, { isImport: true, fromUnlock: true });
            }
        },
        onError(err: WalletError) {
            tools.toastError(typeof err === 'string' ? err : err.message);
        }
    });

    const strengthInfo = useMemo(() => {
        if (!newPassword) return null;
        return getPasswordStrengthWord(newPassword);
    }, [newPassword]);

    const passwordsMatch = confirmPassword ? newPassword === confirmPassword : true;

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!disabled && e.key === 'Enter') {
            void run(newPassword.trim());
        }
    };

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Create Password" />
            <Content>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '20px 4px'
                    }}>
                    {/* Icon */}
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: `${colors.main}15`,
                            border: `1px solid ${colors.main}30`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px'
                        }}>
                        <LockOutlined style={{ fontSize: 24, color: colors.main }} />
                    </div>

                    <div style={{ fontSize: '13px', color: colors.textFaded, marginBottom: '24px', textAlign: 'center' }}>
                        You will use this to unlock your wallet
                    </div>

                    {/* Password Field */}
                    <div style={{ width: '100%', marginBottom: '14px' }}>
                        <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '6px', fontWeight: 500 }}>
                            Password
                        </div>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoFocus
                            placeholder="Enter password"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                color: colors.text,
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = colors.main; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = colors.containerBorder; }}
                        />
                        {strengthInfo && (
                            <div style={{ marginTop: '6px' }}>
                                <span style={{ fontSize: '11px', color: colors.textFaded }}>Strength: </span>
                                <span style={{ fontSize: '11px', color: strengthInfo.color, fontWeight: 500 }}>
                                    {strengthInfo.text}
                                </span>
                                {strengthInfo.tip && (
                                    <div style={{ fontSize: '10px', color: colors.textFaded, marginTop: '2px' }}>
                                        {strengthInfo.tip}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div style={{ width: '100%', marginBottom: '20px' }}>
                        <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '6px', fontWeight: 500 }}>
                            Confirm Password
                        </div>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyUp={handleKeyUp}
                            placeholder="Confirm password"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: colors.inputBg,
                                border: `1px solid ${!passwordsMatch ? colors.error : colors.containerBorder}`,
                                borderRadius: '10px',
                                color: colors.text,
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => {
                                if (passwordsMatch) e.currentTarget.style.borderColor = colors.main;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = !passwordsMatch ? colors.error : colors.containerBorder;
                            }}
                        />
                        {!passwordsMatch && (
                            <div style={{ fontSize: '11px', color: colors.error, marginTop: '6px' }}>
                                Passwords don&apos;t match
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}
                    <button
                        disabled={disabled}
                        onClick={() => void run(newPassword.trim())}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: disabled ? colors.buttonBg : colors.main,
                            border: 'none',
                            borderRadius: '12px',
                            color: disabled ? colors.textFaded : '#000',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}>
                        Continue
                    </button>
                </div>
            </Content>
        </Layout>
    );
}
