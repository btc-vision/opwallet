import React, { useState } from 'react';

import { Layout, Content, Logo } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useUnlockCallback } from '@/ui/state/global/hooks';
import { getUiType, useWallet } from '@/ui/utils';
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons';
import ParticleCanvas from '@/ui/components/ParticleField/ParticleField';

import { RouteTypes, useNavigate } from '../../routeTypes';
import './unlock.css';

export default function UnlockScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const UIType = getUiType();
    const isInNotification = UIType.isNotification;
    const unlock = useUnlockCallback();
    const tools = useTools();

    const handleUnlock = async () => {
        if (!password || unlocking) return;
        setUnlocking(true);
        setError('');
        try {
            await unlock(password);
            if (!isInNotification) {
                const hasVault = await wallet.hasVault();
                navigate(hasVault ? RouteTypes.MainScreen : RouteTypes.WelcomeScreen);
            }
        } catch {
            setError('Wrong password');
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
            tools.toastError('Wrong password entered, please try again.');
        } finally {
            setUnlocking(false);
        }
    };

    const handleKeyUp = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && password) {
            await handleUnlock();
        }
    };

    const active = !!password && !unlocking;

    return (
        <Layout>
            <Content style={{ padding: 0, overflow: 'hidden' }}>
                <div className="unlock">
                    <div className="unlock__particles">
                        <ParticleCanvas count={30} speed={0.15} size={1.375} />
                    </div>

                    <div className="unlock__logo">
                        <Logo preset="large" />
                    </div>
                    {unlocking && (
                        <div className="unlock__loading">
                            <LoadingOutlined style={{ fontSize: 20, color: 'var(--color-main)' }} />
                        </div>
                    )}

                    <div className="unlock__subtitle">Enter your password to unlock</div>

                    <div className={`unlock__form ${shaking ? 'anim-shake' : ''}`}>
                        <div className="unlock__input-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                onKeyUp={(e) => void handleKeyUp(e)}
                                autoFocus
                                placeholder="Password"
                                className={`input input-center ${error ? 'input-error' : ''}`}
                            />
                            <button
                                type="button"
                                className="unlock__eye"
                                onClick={() => setShowPassword((v) => !v)}
                                tabIndex={-1}>
                                {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            </button>
                        </div>
                        {error && <div className="unlock__error">{error}</div>}

                        <button
                            disabled={!active}
                            onClick={() => void handleUnlock()}
                            className={`btn unlock__submit ${active ? 'btn-primary' : 'btn-disabled'}`}>
                            {unlocking && <LoadingOutlined style={{ fontSize: 14 }} />}
                            {unlocking ? 'Unlocking...' : 'Unlock'}
                        </button>
                    </div>
                </div>
            </Content>
        </Layout>
    );
}
