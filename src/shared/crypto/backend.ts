import { createNobleBackend, type CryptoBackend } from '@btc-vision/ecpair';

export const eccBackend: CryptoBackend = createNobleBackend();
