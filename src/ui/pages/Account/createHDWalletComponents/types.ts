import { RestoreWalletType } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';

export enum TabType {
    STEP1 = 'STEP1',
    STEP2 = 'STEP2',
    STEP3 = 'STEP3',
    STEP4 = 'STEP4' // Rotation mode selection
}

export enum WordsType {
    WORDS_12,
    WORDS_24
}

export interface ContextData {
    mnemonics: string;
    hdPath: string;
    passphrase: string;
    addressType: AddressTypes;
    step1Completed: boolean;
    tabType: TabType;
    restoreWalletType: RestoreWalletType;
    isRestore: boolean;
    isCustom: boolean;
    customHdPath: string;
    addressTypeIndex: number;
    wordsType: WordsType;
    rotationModeEnabled: boolean; // Privacy mode - permanent choice
}

export interface UpdateContextDataParams {
    mnemonics?: string;
    hdPath?: string;
    passphrase?: string;
    addressType?: AddressTypes;
    step1Completed?: boolean;
    tabType?: TabType;
    restoreWalletType?: RestoreWalletType;
    isCustom?: boolean;
    customHdPath?: string;
    addressTypeIndex?: number;
    wordsType?: WordsType;
    rotationModeEnabled?: boolean;
}
