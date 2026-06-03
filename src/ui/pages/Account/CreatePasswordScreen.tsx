import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Layout, Content, Header } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent/useTools';
import { useWallet, useWalletRequest } from '@/ui/utils';
import { getPasswordStrengthWord, MIN_PASSWORD_LENGTH } from '@/ui/utils/password-utils';
import { LockOutlined } from '@ant-design/icons';

import { WalletError } from '@/shared/types/Error';
import { RouteTypes, useNavigate } from '../routeTypes';
import './create-password.css';

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
    if (loc.state) state = loc.state as LocationState;
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
            if (isKeystone) navigate(RouteTypes.CreateKeystoneWalletScreen, { fromUnlock: true });
            else if (isNewAccount) navigate(RouteTypes.CreateHDWalletScreen, { isImport: false, fromUnlock: true });
            else navigate(RouteTypes.CreateHDWalletScreen, { isImport: true, fromUnlock: true });
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
        if (!disabled && e.key === 'Enter') void run(newPassword.trim());
    };

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Create Password" />
            <Content>
                <div className="create-password">
                    <div className="icon-circle icon-circle-lg create-password__icon">
                        <LockOutlined style={{ fontSize: 24, color: 'var(--color-main)' }} />
                    </div>

                    <div className="create-password__subtitle">
                        You will use this to unlock your wallet
                    </div>

                    <div className="create-password__field">
                        <div className="create-password__field-label">Password</div>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoFocus
                            placeholder="Enter password"
                            className="input"
                        />
                        {strengthInfo && (
                            <div className="create-password__strength">
                                <span className="create-password__strength-label">Strength: </span>
                                <span className="create-password__strength-value" style={{ color: strengthInfo.color }}>
                                    {strengthInfo.text}
                                </span>
                                {strengthInfo.tip && (
                                    <div className="create-password__strength-tip">{strengthInfo.tip}</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="create-password__field">
                        <div className="create-password__field-label">Confirm Password</div>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyUp={handleKeyUp}
                            placeholder="Confirm password"
                            className={`input ${!passwordsMatch ? 'input-error' : ''}`}
                        />
                        {!passwordsMatch && (
                            <div className="create-password__mismatch">Passwords don&apos;t match</div>
                        )}
                    </div>

                    <button
                        disabled={disabled}
                        onClick={() => void run(newPassword.trim())}
                        className={`btn w-full ${disabled ? 'btn-disabled' : 'btn-primary'}`}>
                        Continue
                    </button>
                </div>
            </Content>
        </Layout>
    );
}
