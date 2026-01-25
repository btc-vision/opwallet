# Security Policy

<p align="center">
  <a href="https://verichains.io">
    <img src="https://raw.githubusercontent.com/btc-vision/contract-logo/refs/heads/main/public-assets/verichains.png" alt="Verichains" width="150"/>
  </a>
</p>

<p align="center">
  <a href="https://verichains.io">
    <img src="https://img.shields.io/badge/Security%20Audit-Verichains-4C35E0?style=for-the-badge" alt="Audited by Verichains"/>
  </a>
</p>

## Audit Status

| Component | Status       | Auditor                             |
| --------- | ------------ | ----------------------------------- |
| OPWallet  | Final Review | [Verichains](https://verichains.io) |

## Supported Versions

| Version | Status        |
| ------- | ------------- |
| 1.x.x   | Supported     |
| < 1.0   | Not supported |

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities through [GitHub Security Advisories](https://github.com/btc-vision/opwallet/security/advisories/new).

Include:

- Description of the vulnerability
- Affected version(s)
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Action                   | Timeframe   |
| ------------------------ | ----------- |
| Initial response         | 48 hours    |
| Vulnerability assessment | 7 days      |
| Patch development        | 14-30 days  |
| Public disclosure        | After patch |

## Security Scope

### In Scope

- **Wallet Security**
  - Private key management and storage
  - Mnemonic phrase generation and handling
  - Keyring encryption and decryption
  - Password hashing and authentication
- **Transaction Security**
  - Transaction signing
  - UTXO management
  - Fee calculation and validation
  - Address validation
- **Extension Security**
  - Content script isolation
  - Background script communication
  - Cross-origin messaging
  - Storage encryption
- **OPNet Integration**
  - Smart contract interactions
  - OP_20 token transfers
  - State validation
  - RPC communication
- **Cryptographic Operations**
  - Schnorr signatures
  - SHA256/RIPEMD160 hashing
  - BIP32/BIP39/BIP44 derivation
  - Address encoding (Bech32/Bech32m)

### Out of Scope

- Third-party dependencies (report to respective maintainers)
- User errors (e.g., phishing, sharing credentials)
- Issues in development/test environments only
- Browser vulnerabilities
- Operating system vulnerabilities

## Security Best Practices for Users

### Wallet Security

- Use a strong, unique password
- Never share your mnemonic phrase
- Verify transaction details before signing
- Keep your browser and extension updated

### Network Security

- Only connect to trusted dApps
- Verify website URLs before connecting
- Use hardware wallets for large holdings
- Disconnect unused dApp connections

## Contact

- **Security Issues**: [GitHub Security Advisories](https://github.com/btc-vision/opwallet/security/advisories)
- **General Issues**: [GitHub Issues](https://github.com/btc-vision/opwallet/issues)
- **Website**: [opnet.org](https://opnet.org)
