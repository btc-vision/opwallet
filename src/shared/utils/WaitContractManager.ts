import { OPNetTransactionTypes } from 'opnet';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import { Account } from '@/shared/types';
import web3API from '@/shared/web3/Web3API';
import { ChainType } from '@/shared/constant';

export interface WaitContract {
    txId: string;
    addressP20P: string;
    time: number,
    address?: Address;
    failed?: boolean;
}

//TODO:
// check for chainType below
// ensure contracts are created below (isToken / isNFT)

const MAX_MEMPOOL_TIMEOUT = 14 * 7 * 24 * 3600 * 1000;

class WaitContractManager {
    private getStorageKey(account: Account, chainType: ChainType) {
        if (!account || !account.pubkey) throw new Error('No account selected');

        const publicKey = account.pubkey;
        const storageKey = `waitContract_${chainType}_${publicKey}`;

        return { storageKey, publicKey };
    }

    public addContract(txId: string, contractAddress: string, account: Account, chainType: ChainType) {
        const network = web3API.network;
        const type = AddressVerificator.detectAddressType(contractAddress, network);
        if (type !== AddressTypes.P2OP && type !== AddressTypes.P2PK) {
            return false;
        }

        // Load existing tokens
        const { storageKey } = this.getStorageKey(account, chainType);
        const contracts = this.load(storageKey);

        // Check for duplicates (using the hex address)
        const isDuplicate = contracts.some((t) => t.addressP20P === contractAddress);

        if (isDuplicate) {
            return false;
        }

        // Add new token (store hex address with 0x prefix)
        const now = Date.now();
        contracts.unshift({ txId, addressP20P: contractAddress, time: now });
        console.log('WAITING FOR', contracts);
        this.save(storageKey, contracts);
        return true;
    }

    public getContracts(account: Account, chainType: ChainType) {
        // Load existing tokens
        const { storageKey } = this.getStorageKey(account, chainType);
        return this.load(storageKey);
    }

    private async manageContracts(
        account: Account,
        chainType: ChainType,
        callback?: (contract: WaitContract) => Promise<void>
    ) {
        const { storageKey } = this.getStorageKey(account, chainType);
        const contracts = this.load(storageKey);
        const results: WaitContract[] = [];

        if (contracts.length > 0) {
            const promises = contracts.map((c) => web3API.provider.getTransaction(c.txId));
            const validates = await Promise.allSettled(promises);
            console.log('WAITING', validates);
            console.log('WAITING', JSON.stringify(validates));

            const now = Date.now();
            for (let i = 0; i < contracts.length; i++) {
                const contract = contracts[i] as WaitContract;

                const result = validates[i];
                const expired = now - contract.time > MAX_MEMPOOL_TIMEOUT;
                const value = result.status === 'fulfilled' && result.value;
                const failed = value && value.failed;
                const address =
                    (value &&
                        !failed &&
                        value.OPNetType == OPNetTransactionTypes.Deployment &&
                        'contractPublicKey' in value &&
                        Address.wrap(value.contractPublicKey as Uint8Array<ArrayBuffer>)) ||
                    undefined;
                console.log('Contract', contract.addressP20P, !!value, expired);
                if (value || expired) {
                    results.push({ ...contract, address, failed });
                }
            }
        }

        // Handle results if callback provided
        if (!!callback && results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                try {
                    await callback(results[i]);
                } catch (error) {
                    console.error(error);
                }
            }

            const newContracts = contracts.filter((c) => !results.find((r) => r.addressP20P == c.addressP20P));
            //this.save(storageKey, newContracts);
            console.log('New contracts', newContracts);
        }

        return results;
    }

    // Only get information about waiting contracts
    // without triggering callback / removal from list
    public async checkContracts(account: Account, chainType: ChainType) {
        return await this.manageContracts(account, chainType);
    }

    public async checkAndManageContracts(
        account: Account,
        chainType: ChainType,
        callback?: (contact: WaitContract) => Promise<void>
    ) {
        const manageCallback =
            callback ??
            (async (contract: WaitContract): Promise<void> => {
                /*
            if (contract.address && await web3Service.isTokenContract(contract.addressP20P)) {
                tokenManager.addToken(contract.address, account);
            }
            if (contract.address && await web3Service.isNftContract(contract.addressP20P)) {
                await nftManager.addNftFromAddresses(contract.address, contract.addressP20P);
            }
             */
            });
        return await this.manageContracts(account, chainType, manageCallback);
    }

    private load(storageKey: string): WaitContract[] {
        const json = localStorage.getItem(storageKey) || '[]';
        return JSON.parse(json) as WaitContract[];
    }
    private save(storageKey: string, tokens: WaitContract[]): void {
        const json = JSON.stringify(tokens);
        localStorage.setItem(storageKey, json);
    }
}

export const waitContractManager = new WaitContractManager();
