import {
    AddressTypes,
    MLDSASecurityLevel,
    Mnemonic,
    MnemonicStrength,
} from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

// Step 1: Generate mnemonic
console.log('Generating quantum-resistant wallet...');
const mnemonic = new Mnemonic('provide crumble mistake horror old beauty sail sauce boss call time endless');

// Step 2: Securely store mnemonic phrase
const phrase = mnemonic.phrase;
console.log('⚠️ IMPORTANT: Backup these 24 words securely:');
console.log(phrase);

// Step 3: Derive wallets
const wallet = mnemonic.derive(0);
const walletUnisat = mnemonic.deriveUnisat(AddressTypes.P2TR, 0);

console.log('\nDerived Wallets:');
console.log('Classical Wallet (Unisat):');
console.log('  P2TR Address:', walletUnisat.p2tr);
console.log('  P2WPKH Address:', walletUnisat.p2wpkh);

console.log('\nQuantum Address:');
console.log('Public Key:', wallet.address.toHex());

// Step 5: Display keys (for demonstration only!)
console.log('\nKey Information:');
console.log('Classical Public Key:', wallet.toPublicKeyHex());
console.log('Quantum Public Key:', wallet.quantumPublicKeyHex);
console.log('Security Level:', wallet.securityLevel);

// Step 4: Get addresses
console.log('\nClassical Addresses:');
console.log('P2TR:', wallet.p2tr);
console.log('P2WPKH:', wallet.p2wpkh);
