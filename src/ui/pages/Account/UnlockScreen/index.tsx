import React, { useState } from 'react';

import { Layout, Content } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useUnlockCallback } from '@/ui/state/global/hooks';
import { getUiType, useWallet } from '@/ui/utils';
import { LockOutlined, LoadingOutlined } from '@ant-design/icons';
import ParticleCanvas from '@/ui/components/ParticleField/ParticleField';

import { RouteTypes, useNavigate } from '../../routeTypes';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    error: '#ef4444'
};

export default function UnlockScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);
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

    return (
        <Layout>
            <Content style={{ padding: 0, overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}>
                    {/* Background particles */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.4,
                            pointerEvents: 'none'
                        }}>
                        <ParticleCanvas count={20} speed={0.15} />
                    </div>

                    {/* Lock icon with glow */}
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${colors.main}25 0%, transparent 70%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                        <div
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: colors.containerBgFaded,
                                border: `1px solid ${colors.main}40`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                            {unlocking ? (
                                <LoadingOutlined style={{ fontSize: 26, color: colors.main }} />
                            ) : (
                                <LockOutlined style={{ fontSize: 26, color: colors.main }} />
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div
                        style={{
                            fontSize: '22px',
                            fontWeight: 700,
                            color: colors.text,
                            marginBottom: '6px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                        OPWallet
                    </div>
                    <div
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            marginBottom: '32px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                        Enter your password to unlock
                    </div>

                    {/* Password input */}
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '300px',
                            position: 'relative',
                            zIndex: 1,
                            animation: shaking ? 'shake 0.5s ease-in-out' : undefined
                        }}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            onKeyUp={(e) => void handleKeyUp(e)}
                            autoFocus
                            placeholder="Password"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: colors.containerBgFaded,
                                border: `1.5px solid ${error ? colors.error : colors.containerBorder}`,
                                borderRadius: '12px',
                                color: colors.text,
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                                textAlign: 'center'
                            }}
                            onFocus={(e) => {
                                if (!error) e.currentTarget.style.borderColor = colors.main;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = error ? colors.error : colors.containerBorder;
                            }}
                        />
                        {error && (
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.error,
                                    textAlign: 'center',
                                    marginTop: '8px'
                                }}>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Unlock button */}
                    <button
                        disabled={!password || unlocking}
                        onClick={() => void handleUnlock()}
                        style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '14px',
                            marginTop: '16px',
                            background: !password || unlocking ? colors.containerBgFaded : colors.main,
                            border: `1px solid ${!password || unlocking ? colors.containerBorder : colors.main}`,
                            borderRadius: '12px',
                            color: !password || unlocking ? colors.textFaded : '#000',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: !password || unlocking ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}>
                        {unlocking && <LoadingOutlined style={{ fontSize: 14 }} />}
                        {unlocking ? 'Unlocking...' : 'Unlock'}
                    </button>
                </div>

                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                        20%, 40%, 60%, 80% { transform: translateX(4px); }
                    }
                `}</style>
            </Content>
        </Layout>
    );
}
