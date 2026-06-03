import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Loading } from './Loading';
import { Tip } from './Tip';
import { Toast, ToastPresets, ToastProps } from './Toast';
import { ActionComponentContext, ContextType } from './ActionComponentContext';

interface ToastItem {
    key: string;
    props: ToastProps;
}

export function ActionComponentProvider({ children }: { children: React.ReactNode }) {
    // Toast state
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toastsRef = useRef<ToastItem[]>([]);

    // Loading state
    const [loadingInfo, setLoadingInfo] = useState<{ visible: boolean; content?: string }>({
        visible: false,
        content: ''
    });

    // Tip state
    const [tipData, setTipData] = useState<{ visible: boolean; content: string }>({
        visible: false,
        content: ''
    });

    // Toast handlers
    const basicToast = useCallback((content: string, preset?: ToastPresets) => {
        const key = `Toast_${Math.random()}`;
        const newToast: ToastItem = {
            key,
            props: {
                preset: preset ?? 'info',
                content,
                onClose: () => {
                    toastsRef.current = toastsRef.current.filter((v) => v.key !== key);
                    setToasts([...toastsRef.current]);
                }
            }
        };
        toastsRef.current = [...toastsRef.current, newToast];
        setToasts([...toastsRef.current]);
    }, []);

    const toast = useCallback(
        (content: string) => basicToast(content),
        [basicToast]
    );

    const toastSuccess = useCallback(
        (content: string) => basicToast(content, 'success'),
        [basicToast]
    );

    const toastError = useCallback(
        (content: string) => basicToast(content, 'error'),
        [basicToast]
    );

    const toastWarning = useCallback(
        (content: string) => basicToast(content, 'warning'),
        [basicToast]
    );

    // Loading handler
    const showLoading = useCallback((visible: boolean, content?: string) => {
        setLoadingInfo({ visible, content });
    }, []);

    // Tip handler
    const showTip = useCallback((content: string) => {
        setTipData({ content, visible: true });
    }, []);

    const closeTip = useCallback(() => {
        setTipData({ visible: false, content: '' });
    }, []);

    // Build context value immutably
    const contextValue = useMemo<ContextType>(
        () => ({
            toast,
            toastSuccess,
            toastError,
            toastWarning,
            showLoading,
            showTip
        }),
        [toast, toastSuccess, toastError, toastWarning, showLoading, showTip]
    );

    return (
        <ActionComponentContext.Provider value={contextValue}>
            {children}
            {/* Toast container */}
            <div>
                {toasts.map(({ key, props }) => (
                    <Toast key={key} {...props} />
                ))}
            </div>
            {/* Loading container */}
            {loadingInfo.visible && <Loading text={loadingInfo.content} />}
            {/* Tip container */}
            {tipData.visible && <Tip text={tipData.content} onClose={closeTip} />}
        </ActionComponentContext.Provider>
    );
}
