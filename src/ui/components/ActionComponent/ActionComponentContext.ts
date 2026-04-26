import React from 'react';

type ToastFunction = (content: string) => void;
type LoadingFunction = (visible: boolean, content?: string) => void;

export interface ContextType {
    toast: ToastFunction;
    toastSuccess: ToastFunction;
    toastError: ToastFunction;
    toastWarning: ToastFunction;
    showLoading: LoadingFunction;
    showTip: ToastFunction;
}

const noopToast = () => {};
const noopLoading = () => {};

export const ActionComponentContext = React.createContext<ContextType>({
    toast: noopToast,
    toastSuccess: noopToast,
    toastError: noopToast,
    toastWarning: noopToast,
    showLoading: noopLoading,
    showTip: noopToast
});
