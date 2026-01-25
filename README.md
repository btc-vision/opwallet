# OP_WALLET

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=firefox&logoColor=white)

<p align="center">
  <a href="https://verichains.io">
    <img src="https://img.shields.io/badge/Security%20Audit-Verichains-4C35E0?style=for-the-badge" alt="Audited by Verichains"/>
  </a>
</p>

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Beta Notice

> **BETA SOFTWARE**: Wallet in active development. Expected bugs, missing features, and breaking changes. Release
> candidate planned soon, stay tuned!

## What is OPWallet?

OPWallet is an open-source browser extension for OPNet and UTXO-based blockchains. It handles Bitcoin, Fractal,
Dogecoin, Litecoin, and any UTXO chain you want to add via the power of opnet-node.

It's built for people who want control over their wallet: custom RPCs, custom gateways, privacy features,
quantum-resistant signatures, all configurable.

[![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/opnetbtc)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/opnetbtc)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/opnet)

## Features

| Feature                   | OPWallet | UniSat       | OKX          | Xverse          | Leather | MetaMask      | Phantom |
|---------------------------|----------|--------------|--------------|-----------------|---------|---------------|---------|
| **Bitcoin Core**          |
| Taproot                   | ✓        | ✓            | ✓            | ✓               | ✓       | Soon          | ✓       |
| SegWit                    | ✓        | ✓            | ✓            | ✓               | ✓       | ✓             | ✓       |
| Legacy                    | ✓        | ✓            | ✓            | ✓               | ✓       | ✗             | ✗       |
| Testnet/Signet/Regtest    | ✓        | Testnet only | Testnet only | Testnet only    | ✗       | ✗             | ✗       |
| Custom Networks           | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Quantum Safe*             | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| **Features**              |
| UTXO Management           | ✓        | ✓            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Address Rotation          | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Custom RPC                | ✓        | ✗            | ✗            | ✗               | ✓       | ✗             | ✗       |
| Fiat On-Ramp              | ✗        | ✓            | ✓            | ✓               | ✗       | ✓             | ✓       |
| .btc Domains (see bellow) | ✓        | Centralized  | Centralized  | Centralized     | ✗       | ✗             | ✗       |
| RBF Cancel                | ✓        | ✓            | ~            | ~               | ✗       | ✗             | ✗       |
| Tx Visualization          | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Accurate Tx Cost          | ✓        | ~            | ~            | ~               | ~       | ~             | ~       |
| **Bitcoin Assets**        |
| OPNet (L1)                | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Ordinals (Centralized)    | ✗        | ✓            | ✓            | ✓               | ✓       | ✗             | ✓       |
| Stacks (L2)               | ✗        | ✗            | ✗            | ✓               | ✓       | ✗             | ✗       |
| **Multi-Chain**           |
| Dogecoin                  | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Litecoin                  | ✓        | ✗            | ✗            | ✗               | ✗       | ✗             | ✗       |
| Ethereum/EVM              | ✗        | ✗            | ✓            | ✓               | ✗       | ✓             | ✓       |
| Solana                    | ✗        | ✗            | ✓            | ✗               | ✗       | ✓             | ✓       |
| **Security**              |
| Open Source               | ✓        | ✓            | ✗            | ✗               | ✓       | ✓             | ✗       |
| Hardware Wallet           | ✗        | Keystone     | Ledger       | Ledger/Keystone | Ledger  | Ledger/Trezor | Ledger  |
| **Platforms**             |
| Browser Extension         | ✓        | ✓            | ✓            | ✓               | ✓       | ✓             | ✓       |
| Mobile                    | ✓        | ✓            | ✓            | ✓               | ✓       | ✓             | ✓       |

*Quantum safe via address rotation prevents pubkey exposure

*Decentralized .btc domain resolution. Xverse uses centralized ordinals indexer.

The wallet supports Bitcoin across mainnet, testnet, testnet4, signet, and regtest alongside Fractal Bitcoin, Dogecoin,
Litecoin, and any custom UTXO chain you configure. Privacy mode implements a hot/cold architecture with separate
derivation paths, automatically rotating addresses after receiving funds while tracking rotation history and balances
per address, with manual or automatic consolidation to cold storage without relying on mixing services.

Quantum resistance for Bitcoin is achieved through address rotation. By never reusing addresses after receiving funds,
public keys are never exposed on-chain, protecting against future quantum attacks on ECDSA. The wallet automatically
rotates to fresh addresses and tracks rotation history with per-address balances. OPNet assets are quantum safe by
default since your OPNet public key is ML-DSA, not Bitcoin, and is bound via ML-DSA hash. Once quantum computers become
a threat, OPNet will enable strict security consensus rules that only allow ML-DSA signatures.

Custom RPC endpoints work per network, and IPFS gateways include health monitoring, latency tracking, automatic
failover, local node support with priority routing, and configurable cache TTL from one minute to one hour.

OPNet integration covers smart contract deployment and interaction, OP20 tokens with transfer, approve, and mint
operations, OP721 NFTs, .btc domain registration and resolution, human-readable decoding for MotoSwap and MotoChef
transactions, and priority fee configuration.

Wallet management handles HD wallets via BIP32, BIP39, BIP44, and BIP341, WIF private key imports, duplication detection
for conflicting WIF or mnemonic keys, and encrypted backup exports with versioning.

Transactions get full PSBT support, UTXO management and consolidation, RBF for cancellation, dynamic fee rate selection
with bad fee detection warnings, accurate transaction cost calculation before sending, and change UTXO visibility
showing
exactly what returns to your wallet. The bowtie graph visualization lets you see your entire transaction before signing,
displaying inputs on the left, outputs on the right, and the flow of funds between them so you know exactly what you are
approving.

Security features include per-site permission management, configurable auto-lock timers from five minutes to disabled,
unconfirmed UTXO handling toggles, and risk assessment on transactions.

## Installation

### Manual Install

1. Download from [GitHub Releases](https://github.com/btc-vision/opwallet/releases)
2. Unzip
3. Load in browser:

**Chrome / Brave / Edge / Opera:**

1. Go to `chrome://extensions/` (or equivalent)
2. Enable Developer Mode
3. Click Load unpacked
4. Select folder

**Firefox:**

1. Go to `about:debugging#/runtime/this-firefox`
2. Click Load Temporary Add-on
3. Select `manifest.json`

## Build from Source

```bash
git clone https://github.com/btc-vision/opwallet.git
cd opwallet
npm install

# Build
npm run build:chrome
npm run build:firefox
npm run build:brave
npm run build:edge
npm run build:opera

# Dev with hot reload
npm run dev:chrome
```

Requires Node.js 24+.

## Security Audit

<p>
  <a href="https://verichains.io">
    <img src="https://raw.githubusercontent.com/btc-vision/contract-logo/refs/heads/main/public-assets/verichains.png" alt="Verichains" width="100"/>
  </a>
</p>

| Component | Status             | Auditor                             |
|-----------|--------------------|-------------------------------------|
| OPWallet  | Completed (v1.5.x) | [Verichains](https://verichains.io) |

### Vulnerabilities

**DO NOT** open public issues for security bugs.

Report via [GitHub Security Advisories](https://github.com/btc-vision/opwallet/security/advisories/new).

See [SECURITY.md](SECURITY.md).

## Contributing

1. Fork
2. Branch
3. Code
4. `npm run lint`
5. PR

## License

[Apache-2.0](LICENSE)

## Links

- [OPNet](https://opnet.org)
- [Docs](https://docs.opnet.org)
- [GitHub](https://github.com/btc-vision/opwallet)
