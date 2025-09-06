import { SourceType } from '@/shared/interfaces/RawTxParameters';

export interface AddressBalance {
    type: SourceType;
    label: string;
    address: string;
    balance: string;
    totalBalance?: string;
    lockedBalance?: string;
    satoshis: bigint;
    available: boolean;
    lockTime?: number;
    description: string;
    description2?: string;
}