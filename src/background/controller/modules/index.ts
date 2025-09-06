export { AccountManager } from './AccountManager';
export { BalanceManager } from './BalanceManager';
export { TransactionManager } from './TransactionManager';
export { AddressManager } from './AddressManager';
export { WalletControllerError } from './WalletControllerError';

// Create singleton instances with proper dependency injection
export const accountManager = new AccountManager();
export const balanceManager = new BalanceManager();
export const transactionManager = new TransactionManager(accountManager);
export const addressManager = new AddressManager();

// Export a factory function for creating instances with dependencies
export function createWalletModules() {
    const accountMgr = new AccountManager();
    const balanceMgr = new BalanceManager();
    const transactionMgr = new TransactionManager(accountMgr);
    const addressMgr = new AddressManager();

    return {
        accountManager: accountMgr,
        balanceManager: balanceMgr,
        transactionManager: transactionMgr,
        addressManager: addressMgr
    };
}