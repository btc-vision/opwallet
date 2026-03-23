import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const BtcNameResolverEvents = [
    {
        name: 'TreasuryChanged',
        values: [
            { name: 'previousAddressHash', type: ABIDataTypes.UINT256 },
            { name: 'newAddressHash', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainPriceChanged',
        values: [
            { name: 'oldPrice', type: ABIDataTypes.UINT64 },
            { name: 'newPrice', type: ABIDataTypes.UINT64 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainRegistered',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'ContractUpdated',
        values: [{ name: 'address', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainRenewed',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'newExpiry', type: ABIDataTypes.UINT64 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainReserved',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'reserver', type: ABIDataTypes.ADDRESS },
            { name: 'years', type: ABIDataTypes.UINT64 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainTransferInitiated',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'currentOwner', type: ABIDataTypes.ADDRESS },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainTransferCompleted',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'previousOwner', type: ABIDataTypes.ADDRESS },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DomainTransferCancelled',
        values: [
            { name: 'domainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'SubdomainCreated',
        values: [
            { name: 'parentDomainHash', type: ABIDataTypes.UINT256 },
            { name: 'subdomainHash', type: ABIDataTypes.UINT256 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'SubdomainDeleted',
        values: [
            { name: 'parentDomainHash', type: ABIDataTypes.UINT256 },
            { name: 'subdomainHash', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'ContenthashChanged',
        values: [
            { name: 'nameHash', type: ABIDataTypes.UINT256 },
            { name: 'contenthashType', type: ABIDataTypes.UINT8 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'ContenthashCleared',
        values: [
            { name: 'nameHash', type: ABIDataTypes.UINT256 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'TTLChanged',
        values: [
            { name: 'nameHash', type: ABIDataTypes.UINT256 },
            { name: 'oldTTL', type: ABIDataTypes.UINT64 },
            { name: 'newTTL', type: ABIDataTypes.UINT64 },
            { name: 'timestamp', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

import { BitcoinInterfaceAbi } from 'opnet';

export const BtcNameResolverAbi: BitcoinInterfaceAbi = [
    {
        name: 'setTreasuryAddress',
        inputs: [{ name: 'treasuryAddress', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setDomainPrice',
        inputs: [{ name: 'priceSats', type: ABIDataTypes.UINT64 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'mintDomain',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'years', type: ABIDataTypes.UINT64 },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'airdropDomains',
        inputs: [{ name: 'entries', type: [ABIDataTypes.STRING, ABIDataTypes.UINT64, ABIDataTypes.ADDRESS] }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'update',
        inputs: [
            { name: 'sourceAddress', type: ABIDataTypes.ADDRESS },
            { name: 'updateCalldata', type: ABIDataTypes.BYTES },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'onOP20Received',
        inputs: [
            { name: 'operator', type: ABIDataTypes.ADDRESS },
            { name: 'from', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'data', type: ABIDataTypes.BYTES },
        ],
        outputs: [{ name: 'selector', type: ABIDataTypes.BYTES4 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setMotoTokenAddress',
        inputs: [{ name: 'tokenAddress', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setMotoTierPrice',
        inputs: [
            { name: 'tier', type: ABIDataTypes.UINT8 },
            { name: 'price', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setMotoBasePrice',
        inputs: [{ name: 'price', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setMotoEnabled',
        inputs: [{ name: 'enabled', type: ABIDataTypes.BOOL }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoTierPrice',
        inputs: [{ name: 'tier', type: ABIDataTypes.UINT8 }],
        outputs: [{ name: 'price', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoBasePriceView',
        inputs: [],
        outputs: [{ name: 'price', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoTokenAddressView',
        inputs: [],
        outputs: [{ name: 'tokenAddress', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'withdrawOP20',
        inputs: [{ name: 'token', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'registerDomainWithMoto',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'years', type: ABIDataTypes.UINT64 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'renewDomainWithMoto',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'years', type: ABIDataTypes.UINT64 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'reserveDomain',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'years', type: ABIDataTypes.UINT64 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'completeRegistration',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'renewDomain',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'years', type: ABIDataTypes.UINT64 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'initiateTransfer',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'acceptTransfer',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'cancelTransfer',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'transferDomain',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'transferDomainBySignature',
        inputs: [
            { name: 'ownerAddress', type: ABIDataTypes.BYTES32 },
            { name: 'ownerTweakedPublicKey', type: ABIDataTypes.BYTES32 },
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
            { name: 'deadline', type: ABIDataTypes.UINT64 },
            { name: 'signature', type: ABIDataTypes.BYTES },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'createSubdomain',
        inputs: [
            { name: 'parentDomain', type: ABIDataTypes.STRING },
            { name: 'subdomainLabel', type: ABIDataTypes.STRING },
            { name: 'subdomainOwner', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'deleteSubdomain',
        inputs: [
            { name: 'parentDomain', type: ABIDataTypes.STRING },
            { name: 'subdomainLabel', type: ABIDataTypes.STRING },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setContenthashCIDv0',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'cid', type: ABIDataTypes.STRING },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setContenthashCIDv1',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'cid', type: ABIDataTypes.STRING },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setContenthashIPNS',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'ipnsId', type: ABIDataTypes.STRING },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setContenthashSHA256',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'hash', type: ABIDataTypes.BYTES32 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'clearContenthash',
        inputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setTTL',
        inputs: [
            { name: 'name', type: ABIDataTypes.STRING },
            { name: 'ttl', type: ABIDataTypes.UINT64 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getDomain',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'createdAt', type: ABIDataTypes.UINT64 },
            { name: 'expiresAt', type: ABIDataTypes.UINT64 },
            { name: 'ttl', type: ABIDataTypes.UINT64 },
            { name: 'isActive', type: ABIDataTypes.BOOL },
            { name: 'inGracePeriod', type: ABIDataTypes.BOOL },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getSubdomain',
        inputs: [{ name: 'fullName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'parentHash', type: ABIDataTypes.BYTES32 },
            { name: 'ttl', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getContenthash',
        inputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'hashType', type: ABIDataTypes.UINT8 },
            { name: 'hashData', type: ABIDataTypes.BYTES32 },
            { name: 'hashString', type: ABIDataTypes.STRING },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'resolve',
        inputs: [{ name: 'name', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPendingTransfer',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'pendingOwner', type: ABIDataTypes.ADDRESS },
            { name: 'initiatedAt', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTreasuryAddress',
        inputs: [],
        outputs: [{ name: 'treasuryAddress', type: ABIDataTypes.STRING }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getDomainPrice',
        inputs: [
            { name: 'domainName', type: ABIDataTypes.STRING },
            { name: 'years', type: ABIDataTypes.UINT64 },
        ],
        outputs: [
            { name: 'totalPriceSats', type: ABIDataTypes.UINT64 },
            { name: 'auctionPriceSats', type: ABIDataTypes.UINT64 },
            { name: 'renewalPerYear', type: ABIDataTypes.UINT64 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getBaseDomainPrice',
        inputs: [],
        outputs: [{ name: 'priceSats', type: ABIDataTypes.UINT64 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getDomainNonce',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'nonce', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getReservation',
        inputs: [{ name: 'domainName', type: ABIDataTypes.STRING }],
        outputs: [
            { name: 'reserver', type: ABIDataTypes.ADDRESS },
            { name: 'reservedAt', type: ABIDataTypes.UINT64 },
            { name: 'years', type: ABIDataTypes.UINT64 },
            { name: 'isActive', type: ABIDataTypes.BOOL },
        ],
        type: BitcoinAbiTypes.Function,
    },
    ...BtcNameResolverEvents,
    ...OP_NET_ABI,
];

export { BtcNameResolverAbi as BTC_NAME_RESOLVER_ABI };
export default BtcNameResolverAbi;
