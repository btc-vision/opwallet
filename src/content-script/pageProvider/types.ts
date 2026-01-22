import { EventEmitter } from 'events';

export interface StateProvider {
    accounts: string[] | null;
    isConnected: boolean;
    isUnlocked: boolean;
    initialized: boolean;
    isPermanentlyDisconnected: boolean;
}

// Base interface for OpnetProviderPrivate without circular reference to PushEventHandlers
export interface OpnetProviderPrivateBase {
    _selectedAddress: string | null;
    _network: string | null;
    _isConnected: boolean;
    _initialized: boolean;
    _isUnlocked: boolean;
    _state: StateProvider;
}

// Interface for provider that can emit events
export interface ProviderEmitter extends EventEmitter {
    emit(event: string, ...args: unknown[]): boolean;
}
