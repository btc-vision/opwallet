import { Address } from '@btc-vision/transaction';
import { CallResult, IOP_NETContract, OPNetEvent } from 'opnet';

// =============================================================================
// Event Types
// =============================================================================

export type TreasuryChangedEvent = {
    readonly previousAddressHash: bigint;
    readonly newAddressHash: bigint;
    readonly timestamp: bigint;
};

export type DomainPriceChangedEvent = {
    readonly oldPrice: bigint;
    readonly newPrice: bigint;
    readonly timestamp: bigint;
};

export type DomainRegisteredEvent = {
    readonly domainHash: bigint;
    readonly owner: Address;
    readonly timestamp: bigint;
};

export type DomainTransferInitiatedEvent = {
    readonly domainHash: bigint;
    readonly currentOwner: Address;
    readonly newOwner: Address;
    readonly timestamp: bigint;
};

export type DomainTransferCompletedEvent = {
    readonly domainHash: bigint;
    readonly previousOwner: Address;
    readonly newOwner: Address;
    readonly timestamp: bigint;
};

export type DomainTransferCancelledEvent = {
    readonly domainHash: bigint;
    readonly owner: Address;
    readonly timestamp: bigint;
};

export type SubdomainCreatedEvent = {
    readonly parentDomainHash: bigint;
    readonly subdomainHash: bigint;
    readonly owner: Address;
    readonly timestamp: bigint;
};

export type SubdomainDeletedEvent = {
    readonly parentDomainHash: bigint;
    readonly subdomainHash: bigint;
    readonly timestamp: bigint;
};

export type ContenthashChangedEvent = {
    readonly nameHash: bigint;
    readonly contenthashType: number;
    readonly timestamp: bigint;
};

export type ContenthashClearedEvent = {
    readonly nameHash: bigint;
    readonly timestamp: bigint;
};

export type TTLChangedEvent = {
    readonly nameHash: bigint;
    readonly oldTTL: bigint;
    readonly newTTL: bigint;
    readonly timestamp: bigint;
};

// =============================================================================
// Call Result Types
// =============================================================================

export type SetTreasuryAddressResult = CallResult<
    Record<string, never>,
    OPNetEvent<TreasuryChangedEvent>[]
>;

export type SetDomainPriceResult = CallResult<
    Record<string, never>,
    OPNetEvent<DomainPriceChangedEvent>[]
>;

export type RegisterDomainResult = CallResult<
    Record<string, never>,
    OPNetEvent<DomainRegisteredEvent>[]
>;

export type InitiateTransferResult = CallResult<
    Record<string, never>,
    OPNetEvent<DomainTransferInitiatedEvent>[]
>;

export type AcceptTransferResult = CallResult<
    Record<string, never>,
    OPNetEvent<DomainTransferCompletedEvent>[]
>;

export type CancelTransferResult = CallResult<
    Record<string, never>,
    OPNetEvent<DomainTransferCancelledEvent>[]
>;

export type CreateSubdomainResult = CallResult<
    Record<string, never>,
    OPNetEvent<SubdomainCreatedEvent>[]
>;

export type DeleteSubdomainResult = CallResult<
    Record<string, never>,
    OPNetEvent<SubdomainDeletedEvent>[]
>;

export type SetContenthashResult = CallResult<
    Record<string, never>,
    OPNetEvent<ContenthashChangedEvent>[]
>;

export type ClearContenthashResult = CallResult<
    Record<string, never>,
    OPNetEvent<ContenthashClearedEvent>[]
>;

export type SetTTLResult = CallResult<Record<string, never>, OPNetEvent<TTLChangedEvent>[]>;

export type GetDomainResult = CallResult<
    {
        exists: boolean;
        owner: Address;
        createdAt: bigint;
        ttl: bigint;
    },
    OPNetEvent<never>[]
>;

export type GetSubdomainResult = CallResult<
    {
        exists: boolean;
        owner: Address;
        parentHash: Uint8Array;
        ttl: bigint;
    },
    OPNetEvent<never>[]
>;

export type GetContenthashResult = CallResult<
    {
        hashType: number;
        hashData: Uint8Array;
        hashString: string;
    },
    OPNetEvent<never>[]
>;

export type ResolveResult = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

export type GetPendingTransferResult = CallResult<
    {
        pendingOwner: Address;
        initiatedAt: bigint;
    },
    OPNetEvent<never>[]
>;

export type GetTreasuryAddressResult = CallResult<
    {
        treasuryAddress: string;
    },
    OPNetEvent<never>[]
>;

export type GetDomainPriceResult = CallResult<
    {
        priceSats: bigint;
    },
    OPNetEvent<never>[]
>;

export type GetBaseDomainPriceResult = CallResult<
    {
        priceSats: bigint;
    },
    OPNetEvent<never>[]
>;

// =============================================================================
// Contract Interface
// =============================================================================

/**
 * Interface for the BtcNameResolver contract.
 * Handles .btc domain registration, ownership, and contenthash resolution.
 */
export interface IBtcNameResolverContract extends IOP_NETContract {
    // Admin functions
    setTreasuryAddress(treasuryAddress: string): Promise<SetTreasuryAddressResult>;
    setDomainPrice(priceSats: bigint): Promise<SetDomainPriceResult>;

    // Domain registration and transfer
    registerDomain(domainName: string): Promise<RegisterDomainResult>;
    initiateTransfer(domainName: string, newOwner: Address): Promise<InitiateTransferResult>;
    acceptTransfer(domainName: string): Promise<AcceptTransferResult>;
    cancelTransfer(domainName: string): Promise<CancelTransferResult>;

    // Subdomain management
    createSubdomain(
        parentDomain: string,
        subdomainLabel: string,
        subdomainOwner: Address
    ): Promise<CreateSubdomainResult>;
    deleteSubdomain(parentDomain: string, subdomainLabel: string): Promise<DeleteSubdomainResult>;

    // Contenthash management
    setContenthashCIDv0(name: string, cid: string): Promise<SetContenthashResult>;
    setContenthashCIDv1(name: string, cid: string): Promise<SetContenthashResult>;
    setContenthashIPNS(name: string, ipnsId: string): Promise<SetContenthashResult>;
    setContenthashSHA256(name: string, hash: Uint8Array): Promise<SetContenthashResult>;
    clearContenthash(name: string): Promise<ClearContenthashResult>;

    // TTL management
    setTTL(name: string, ttl: bigint): Promise<SetTTLResult>;

    // View functions
    getDomain(domainName: string): Promise<GetDomainResult>;
    getSubdomain(fullName: string): Promise<GetSubdomainResult>;
    getContenthash(name: string): Promise<GetContenthashResult>;
    resolve(name: string): Promise<ResolveResult>;
    getPendingTransfer(domainName: string): Promise<GetPendingTransferResult>;
    getTreasuryAddress(): Promise<GetTreasuryAddressResult>;
    getDomainPrice(domainName: string): Promise<GetDomainPriceResult>;
    getBaseDomainPrice(): Promise<GetBaseDomainPriceResult>;
}
