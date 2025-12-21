import { keyBy } from 'lodash-es';
import { AddressFlagType, CHAINS, CHAINS_MAP, ChainType, NETWORK_TYPES } from '@/shared/constant';

const chainsDict = keyBy(CHAINS, 'serverId');
export const getChain = (chainId?: string) => {
    if (!chainId) {
        return null;
    }
    return chainsDict[chainId];
};

// Check if address flag is enabled
export const checkAddressFlag = (currentFlag: number, flag: AddressFlagType): boolean => {
    return Boolean(currentFlag & flag);
};

export function getChainInfo(chainType: ChainType) {
    const chain = CHAINS_MAP[chainType];
    if (!chain) {
        throw new Error(`Chain type ${chainType} is not supported.`);
    }

    return {
        enum: chainType,
        name: chain.label,
        network: NETWORK_TYPES[chain.networkType].name
    };
}

export function addressShortner(address: string) {
    return address.slice(0, 4) + '...' + address.slice(address.length - 4, address.length);
}
