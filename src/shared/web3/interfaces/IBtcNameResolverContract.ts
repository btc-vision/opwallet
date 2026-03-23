import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
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
export type ContractUpdatedEvent = {
    readonly address: Address;
};
export type DomainRenewedEvent = {
    readonly domainHash: bigint;
    readonly owner: Address;
    readonly newExpiry: bigint;
    readonly timestamp: bigint;
};
export type DomainReservedEvent = {
    readonly domainHash: bigint;
    readonly reserver: Address;
    readonly years: bigint;
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

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the setTreasuryAddress function call.
 */
export type SetTreasuryAddress = CallResult<{}, OPNetEvent<TreasuryChangedEvent>[]>;

/**
 * @description Represents the result of the setDomainPrice function call.
 */
export type SetDomainPrice = CallResult<{}, OPNetEvent<DomainPriceChangedEvent>[]>;

/**
 * @description Represents the result of the mintDomain function call.
 */
export type MintDomain = CallResult<{}, OPNetEvent<DomainRegisteredEvent>[]>;

/**
 * @description Represents the result of the airdropDomains function call.
 */
export type AirdropDomains = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the update function call.
 */
export type Update = CallResult<{}, OPNetEvent<ContractUpdatedEvent>[]>;

/**
 * @description Represents the result of the onOP20Received function call.
 */
export type OnOP20Received = CallResult<
    {
        selector: Uint8Array;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setMotoTokenAddress function call.
 */
export type SetMotoTokenAddress = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setMotoTierPrice function call.
 */
export type SetMotoTierPrice = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setMotoBasePrice function call.
 */
export type SetMotoBasePrice = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setMotoEnabled function call.
 */
export type SetMotoEnabled = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getMotoTierPrice function call.
 */
export type GetMotoTierPrice = CallResult<
    {
        price: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMotoBasePriceView function call.
 */
export type GetMotoBasePriceView = CallResult<
    {
        price: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMotoTokenAddressView function call.
 */
export type GetMotoTokenAddressView = CallResult<
    {
        tokenAddress: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the withdrawOP20 function call.
 */
export type WithdrawOP20 = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the registerDomainWithMoto function call.
 */
export type RegisterDomainWithMoto = CallResult<{}, OPNetEvent<DomainRegisteredEvent>[]>;

/**
 * @description Represents the result of the renewDomainWithMoto function call.
 */
export type RenewDomainWithMoto = CallResult<{}, OPNetEvent<DomainRenewedEvent>[]>;

/**
 * @description Represents the result of the reserveDomain function call.
 */
export type ReserveDomain = CallResult<{}, OPNetEvent<DomainReservedEvent>[]>;

/**
 * @description Represents the result of the completeRegistration function call.
 */
export type CompleteRegistration = CallResult<{}, OPNetEvent<DomainRegisteredEvent>[]>;

/**
 * @description Represents the result of the renewDomain function call.
 */
export type RenewDomain = CallResult<{}, OPNetEvent<DomainRenewedEvent>[]>;

/**
 * @description Represents the result of the initiateTransfer function call.
 */
export type InitiateTransfer = CallResult<{}, OPNetEvent<DomainTransferInitiatedEvent>[]>;

/**
 * @description Represents the result of the acceptTransfer function call.
 */
export type AcceptTransfer = CallResult<{}, OPNetEvent<DomainTransferCompletedEvent>[]>;

/**
 * @description Represents the result of the cancelTransfer function call.
 */
export type CancelTransfer = CallResult<{}, OPNetEvent<DomainTransferCancelledEvent>[]>;

/**
 * @description Represents the result of the transferDomain function call.
 */
export type TransferDomain = CallResult<{}, OPNetEvent<DomainTransferCompletedEvent>[]>;

/**
 * @description Represents the result of the transferDomainBySignature function call.
 */
export type TransferDomainBySignature = CallResult<{}, OPNetEvent<DomainTransferCompletedEvent>[]>;

/**
 * @description Represents the result of the createSubdomain function call.
 */
export type CreateSubdomain = CallResult<{}, OPNetEvent<SubdomainCreatedEvent>[]>;

/**
 * @description Represents the result of the deleteSubdomain function call.
 */
export type DeleteSubdomain = CallResult<{}, OPNetEvent<SubdomainDeletedEvent>[]>;

/**
 * @description Represents the result of the setContenthashCIDv0 function call.
 */
export type SetContenthashCIDv0 = CallResult<{}, OPNetEvent<ContenthashChangedEvent>[]>;

/**
 * @description Represents the result of the setContenthashCIDv1 function call.
 */
export type SetContenthashCIDv1 = CallResult<{}, OPNetEvent<ContenthashChangedEvent>[]>;

/**
 * @description Represents the result of the setContenthashIPNS function call.
 */
export type SetContenthashIPNS = CallResult<{}, OPNetEvent<ContenthashChangedEvent>[]>;

/**
 * @description Represents the result of the setContenthashSHA256 function call.
 */
export type SetContenthashSHA256 = CallResult<{}, OPNetEvent<ContenthashChangedEvent>[]>;

/**
 * @description Represents the result of the clearContenthash function call.
 */
export type ClearContenthash = CallResult<{}, OPNetEvent<ContenthashClearedEvent>[]>;

/**
 * @description Represents the result of the setTTL function call.
 */
export type SetTTL = CallResult<{}, OPNetEvent<TTLChangedEvent>[]>;

/**
 * @description Represents the result of the getDomain function call.
 */
export type GetDomain = CallResult<
    {
        exists: boolean;
        owner: Address;
        createdAt: bigint;
        expiresAt: bigint;
        ttl: bigint;
        isActive: boolean;
        inGracePeriod: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getSubdomain function call.
 */
export type GetSubdomain = CallResult<
    {
        exists: boolean;
        owner: Address;
        parentHash: Uint8Array;
        ttl: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getContenthash function call.
 */
export type GetContenthash = CallResult<
    {
        hashType: number;
        hashData: Uint8Array;
        hashString: string;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the resolve function call.
 */
export type Resolve = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPendingTransfer function call.
 */
export type GetPendingTransfer = CallResult<
    {
        pendingOwner: Address;
        initiatedAt: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getTreasuryAddress function call.
 */
export type GetTreasuryAddress = CallResult<
    {
        treasuryAddress: string;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getDomainPrice function call.
 */
export type GetDomainPrice = CallResult<
    {
        totalPriceSats: bigint;
        auctionPriceSats: bigint;
        renewalPerYear: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getBaseDomainPrice function call.
 */
export type GetBaseDomainPrice = CallResult<
    {
        priceSats: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getDomainNonce function call.
 */
export type GetDomainNonce = CallResult<
    {
        nonce: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getReservation function call.
 */
export type GetReservation = CallResult<
    {
        reserver: Address;
        reservedAt: bigint;
        years: bigint;
        isActive: boolean;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// Tuple Types
// ------------------------------------------------------------------
export type AirdropDomainsEntries = [string, bigint, Address];

// ------------------------------------------------------------------
// IBtcNameResolver
// ------------------------------------------------------------------
export type IBtcNameResolverContract = IBtcNameResolver;
export interface IBtcNameResolver extends IOP_NETContract {
    setTreasuryAddress(treasuryAddress: string): Promise<SetTreasuryAddress>;
    setDomainPrice(priceSats: bigint): Promise<SetDomainPrice>;
    mintDomain(domainName: string, years: bigint, owner: Address): Promise<MintDomain>;
    airdropDomains(entries: AirdropDomainsEntries[]): Promise<AirdropDomains>;
    update(sourceAddress: Address, updateCalldata: Uint8Array): Promise<Update>;
    onOP20Received(operator: Address, from: Address, amount: bigint, data: Uint8Array): Promise<OnOP20Received>;
    setMotoTokenAddress(tokenAddress: Address): Promise<SetMotoTokenAddress>;
    setMotoTierPrice(tier: number, price: bigint): Promise<SetMotoTierPrice>;
    setMotoBasePrice(price: bigint): Promise<SetMotoBasePrice>;
    setMotoEnabled(enabled: boolean): Promise<SetMotoEnabled>;
    getMotoTierPrice(tier: number): Promise<GetMotoTierPrice>;
    getMotoBasePriceView(): Promise<GetMotoBasePriceView>;
    getMotoTokenAddressView(): Promise<GetMotoTokenAddressView>;
    withdrawOP20(token: Address): Promise<WithdrawOP20>;
    registerDomainWithMoto(domainName: string, years: bigint): Promise<RegisterDomainWithMoto>;
    renewDomainWithMoto(domainName: string, years: bigint): Promise<RenewDomainWithMoto>;
    reserveDomain(domainName: string, years: bigint): Promise<ReserveDomain>;
    completeRegistration(domainName: string): Promise<CompleteRegistration>;
    renewDomain(domainName: string, years: bigint): Promise<RenewDomain>;
    initiateTransfer(domainName: string, newOwner: Address): Promise<InitiateTransfer>;
    acceptTransfer(domainName: string): Promise<AcceptTransfer>;
    cancelTransfer(domainName: string): Promise<CancelTransfer>;
    transferDomain(domainName: string, newOwner: Address): Promise<TransferDomain>;
    transferDomainBySignature(
        ownerAddress: Uint8Array,
        ownerTweakedPublicKey: Uint8Array,
        domainName: string,
        newOwner: Address,
        deadline: bigint,
        signature: Uint8Array,
    ): Promise<TransferDomainBySignature>;
    createSubdomain(parentDomain: string, subdomainLabel: string, subdomainOwner: Address): Promise<CreateSubdomain>;
    deleteSubdomain(parentDomain: string, subdomainLabel: string): Promise<DeleteSubdomain>;
    setContenthashCIDv0(name: string, cid: string): Promise<SetContenthashCIDv0>;
    setContenthashCIDv1(name: string, cid: string): Promise<SetContenthashCIDv1>;
    setContenthashIPNS(name: string, ipnsId: string): Promise<SetContenthashIPNS>;
    setContenthashSHA256(name: string, hash: Uint8Array): Promise<SetContenthashSHA256>;
    clearContenthash(name: string): Promise<ClearContenthash>;
    setTTL(name: string, ttl: bigint): Promise<SetTTL>;
    getDomain(domainName: string): Promise<GetDomain>;
    getSubdomain(fullName: string): Promise<GetSubdomain>;
    getContenthash(name: string): Promise<GetContenthash>;
    resolve(name: string): Promise<Resolve>;
    getPendingTransfer(domainName: string): Promise<GetPendingTransfer>;
    getTreasuryAddress(): Promise<GetTreasuryAddress>;
    getDomainPrice(domainName: string, years: bigint): Promise<GetDomainPrice>;
    getBaseDomainPrice(): Promise<GetBaseDomainPrice>;
    getDomainNonce(domainName: string): Promise<GetDomainNonce>;
    getReservation(domainName: string): Promise<GetReservation>;
}
