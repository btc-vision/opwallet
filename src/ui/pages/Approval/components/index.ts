import Connect from './Connect';
import SignData from './SignData';
import SignDeployment from './SignDeployment';
import SignInteraction from './SignInteraction';
import SignPsbt from './SignPsbt';
import SignText from './SignText';
import SwitchChain from './SwitchChain';
import SwitchNetwork from './SwitchNetwork';
import CancelTransaction from './CancelTransaction';

export {
    Connect,
    SignData,
    SignDeployment,
    SignInteraction,
    SignPsbt,
    SignText,
    SwitchChain,
    SwitchNetwork,
    CancelTransaction
};

// Use string literals to avoid circular dependency with ApprovalType enum
export const ApprovalComponents = {
    'Connect': Connect,
    'SignData': SignData,
    'SignInteraction': SignInteraction,
    'CancelTransaction': CancelTransaction,
    'SignPsbt': SignPsbt,
    'SignText': SignText,
    'SwitchChain': SwitchChain,
    'SwitchNetwork': SwitchNetwork,
    'SignDeployment': SignDeployment
} as const;
