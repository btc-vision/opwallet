import { ABIDataTypes } from '@btc-vision/transaction';
import { BitcoinAbiTypes, BitcoinInterfaceAbi } from 'opnet';

/**
 * BtcNameResolver Events
 */
export const BtcNameResolverEvents: BitcoinInterfaceAbi = [
    {
        name: 'TreasuryChanged',
        values: [
            { name: 'previousAddressHash', type: ABIDataTypes.UINT256 },
            { name: 'newAddressHash', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'DomainPriceChanged',
        values: [
            { name: 'oldPrice', type: ABIDataTypes.UINT64 },
            { name: 'newPrice', type: ABIDataTypes.UINT64 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'DomainRegistered',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'DomainTransferInitiated',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'currentOwner', type: ABIDataTypes.ADDRESS },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'DomainTransferCompleted',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'previousOwner', type: ABIDataTypes.ADDRESS },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'DomainTransferCancelled',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'SubdomainCreated',
        values: [
            { name: 'parentDomainHash', type: ABIDataTypes.UINT256 },
            { name: 'subdomainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'SubdomainDeleted',
        values: [
            { name: 'parentDomainHash', type: ABIDataTypes.UINT256 },
            { name: 'subdomainHash', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'ContenthashChanged',
        values: [
            { name: 'nameHash', type: ABIDataTypes.UINT256 },
            { name: 'contenthashType', type: ABIDataTypes.UINT8 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'ContenthashCleared',
        values: [
            { name: 'nameHash', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    },
    {
        name: 'TTLChanged',
        values: [
            { name: 'nameHash', type: ABIDataTypes.UINT256 },
            { name: 'oldTTL', type: ABIDataTypes.UINT64 },
            { name: 'newTTL', type: ABIDataTypes.UINT64 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Event
    }
];

/**
 * BtcNameResolver ABI - Function definitions
 */
export const BTC_NAME_RESOLVER_ABI: BitcoinInterfaceAbi = [
    // Admin functions
    {
        name: 'setTreasuryAddress',
        inputs: [{ name: 'treasuryAddress', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'setDomainPrice',
        inputs: [{ name: 'priceSats', type: ABIDataTypes.UINT64 }],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },

    // Domain registration and transfer
    {
        name: 'registerDomain',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'initiateTransfer',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'acceptTransfer',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'cancelTransfer',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },

    // Subdomain management
    {
        name: 'createSubdomain',
        inputs: [
            { name: 'parentDomain', type: ABIDataTypes.STRING },
            { name: 'subdomainLabel', type: ABIDataTypes.STRING },
            { name: 'subdomainOwner', type: ABIDataTypes.ADDRESS }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'deleteSubdomain',
        inputs: [
            { name: 'parentDomain', type: ABIDataTypes.STRING },
            { name: 'subdomainLabel', type: ABIDataTypes.STRING }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },

    // Contenthash management
    {
        name: 'setContenthashCIDv0',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'cid', type: ABIDataTypes.STRING }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'setContenthashCIDv1',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'cid', type: ABIDataTypes.STRING }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'setContenthashIPNS',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'ipnsId', type: ABIDataTypes.STRING }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'setContenthashSHA256',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'hash', type: ABIDataTypes.BYTES32 }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'clearContenthash',
        inputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },

    // TTL management
    {
        name: 'setTTL',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'ttl', type: ABIDataTypes.UINT64 }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    },

    // View functions
    {
        name: 'getDomain',
        constant: true,
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'createdAt', type: ABIDataTypes.UINT64 },
            { name: 'ttl', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'getSubdomain',
        constant: true,
        inputs: [{ name: 'fullName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'parentHash', type: ABIDataTypes.BYTES32 },
            { name: 'ttl', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'getContenthash',
        constant: true,
        inputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'hashType', type: ABIDataTypes.UINT8 },
            { name: 'hashData', type: ABIDataTypes.BYTES32 },
            { name: 'hashString', type: ABIDataTypes.STRING }
        ],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'resolve',
        constant: true,
        inputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'getPendingTransfer',
        constant: true,
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'pendingOwner', type: ABIDataTypes.ADDRESS },
            { name: 'initiatedAt', type: ABIDataTypes.UINT64 }
        ],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'getTreasuryAddress',
        constant: true,
        inputs: [],
        outputs: [{ name: 'treasuryAddress', type: ABIDataTypes.STRING }],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'getDomainPrice',
        constant: true,
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'priceSats', type: ABIDataTypes.UINT64 }],
        type: BitcoinAbiTypes.Function
    },
    {
        name: 'getBaseDomainPrice',
        constant: true,
        inputs: [],
        outputs: [{ name: 'priceSats', type: ABIDataTypes.UINT64 }],
        type: BitcoinAbiTypes.Function
    },

    // Events
    ...BtcNameResolverEvents
];
