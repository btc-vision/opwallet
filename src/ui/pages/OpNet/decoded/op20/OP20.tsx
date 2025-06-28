import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Card, Column, Image, Row, Text } from '@/ui/components';
import { fontSizes } from '@/ui/theme/font';

// These interfaces match your decoded objects
import {
    DecodedAirdrop,
    DecodedAirdropWithAmount,
    DecodedIncreaseAllowance,
    DecodedIncreaseAllowanceBySignature,
    DecodedBurn,
    DecodedMint,
    DecodedTransfer,
    DecodedTransferFrom
} from '@/ui/pages/OpNet/decoded/DecodedTypes';
import { sliceAddress } from '@/ui/pages/OpNet/decoded/helpper';
import BigNumber from 'bignumber.js';
import { BitcoinUtils } from 'opnet';
import { MAX_UINT256 } from './IncreaseAllowanceDecodedInfo';

interface CommonProps {
    readonly contractInfo: Partial<ContractInformation>;
    readonly interactionType: string;
}

/* -------------------------------
   SafeTransfer (safeTransfer(address,uint256,bytes))
----------------------------------- */
interface TransferDecodedProps extends CommonProps {
    readonly decoded: DecodedTransfer;
}

export function TransferDecodedInfo(props: TransferDecodedProps) {
    const { contractInfo, interactionType, decoded } = props;

    const balanceFormatted = BitcoinUtils.formatUnits(decoded.amount, contractInfo.decimals || 8);
    const slicedRecipient = sliceAddress(decoded.recipient);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={`${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()}`}
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
                <Text text={`recipient: ✓ ${slicedRecipient}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}

/* ---------------------------------
   SafeTransferFrom (safeTransferFrom(address,address,uint256,bytes))
------------------------------------- */
interface TransferFromDecodedProps extends CommonProps {
    readonly decoded: DecodedTransferFrom;
}

export function TransferFromDecodedInfo(props: TransferFromDecodedProps) {
    const { contractInfo, interactionType, decoded } = props;

    const balanceFormatted = BitcoinUtils.formatUnits(decoded.amount, contractInfo.decimals || 8);
    const slicedSender = sliceAddress(decoded.sender);
    const slicedRecipient = sliceAddress(decoded.recipient);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={`${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()}`}
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
                <Text text={`sender: ✗ ${slicedSender}`} preset="sub" textCenter />
                <Text text={`recipient: ✓ ${slicedRecipient}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}

/* -------------------------------
   IncreaseAllowance (increaseAllowance(address,uint256))
----------------------------------- */
interface IncreaseAllowanceDecodedProps extends CommonProps {
    readonly decoded: DecodedIncreaseAllowance;
}

export function IncreaseAllowanceDecodedInfo(props: IncreaseAllowanceDecodedProps) {
    const { contractInfo, interactionType, decoded } = props;

    const balanceFormatted = BitcoinUtils.formatUnits(decoded.amount, contractInfo.decimals || 8);
    const slicedSpender = sliceAddress(decoded.spender);

    const isUnlimitedApproval = new BigNumber(decoded.amount.toString()).isGreaterThanOrEqualTo(MAX_UINT256);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={
                            isUnlimitedApproval
                                ? `Unlimited ${(contractInfo.symbol || '').toUpperCase()}`
                                : `${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()}`
                        }
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
                <Text text={`spender: ✓ ${slicedSpender}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}

/* -------------------------------
   IncreaseAllowanceBySignature (increaseAllowanceBySignature(address,address,uint256,uint64,bytes))
----------------------------------- */
interface IncreaseAllowanceBySignatureDecodedProps extends CommonProps {
    readonly decoded: DecodedIncreaseAllowanceBySignature;
}

export function IncreaseAllowanceBySignatureDecodedInfo(props: IncreaseAllowanceBySignatureDecodedProps) {
    const { contractInfo, interactionType, decoded } = props;

    const balanceFormatted = BitcoinUtils.formatUnits(decoded.amount, contractInfo.decimals || 8);
    const slicedSpender = sliceAddress(decoded.spender);

    // If you want to display the signature, do so here
    // For simplicity, we just show its length
    const signatureLength = decoded.signature?.length || 0;

    const isUnlimitedApproval = new BigNumber(decoded.amount.toString()).isGreaterThanOrEqualTo(MAX_UINT256);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={
                            isUnlimitedApproval
                                ? `Unlimited ${(contractInfo.symbol || '').toUpperCase()}`
                                : `${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()}`
                        }
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
                <Text text={`spender: ✓ ${slicedSpender}`} preset="sub" textCenter />
                <Text text={`signature length: ${signatureLength} bytes`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}

/* -------------------------------
   Burn (burn(uint256))
----------------------------------- */
interface BurnDecodedProps extends CommonProps {
    readonly decoded: DecodedBurn;
}

export function BurnDecodedInfo(props: BurnDecodedProps) {
    const { contractInfo, interactionType, decoded } = props;

    const balanceFormatted = BitcoinUtils.formatUnits(decoded.value, contractInfo.decimals || 8);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={`${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()} burned`}
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
            </Column>
        </Card>
    );
}

/* -------------------------------
   Mint (mint(address,uint256))
----------------------------------- */
interface MintDecodedProps extends CommonProps {
    readonly decoded: DecodedMint;
}

export function MintDecodedInfo(props: MintDecodedProps) {
    const { contractInfo, interactionType, decoded } = props;

    const balanceFormatted = BitcoinUtils.formatUnits(decoded.value, contractInfo.decimals || 8);
    const slicedAddr = sliceAddress(decoded.address);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={`${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()} minted`}
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
                <Text text={`to: ✓ ${slicedAddr}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}

/* -------------------------------
   Airdrop (airdrop(AddressMap<bigint>))
----------------------------------- */
interface AirdropDecodedProps extends CommonProps {
    readonly decoded: DecodedAirdrop;
}

export function AirdropDecodedInfo(props: AirdropDecodedProps) {
    const { interactionType } = props;
    // The data might be complex. For simplicity, just show JSON
    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Text text="Airdrop data (AddressMap<bigint>):" preset="large" textCenter />
                <Text
                    text={JSON.stringify(props.decoded.addressMapData, null, 2)}
                    preset="sub"
                    style={{ textAlign: 'left' }}
                />
            </Column>
        </Card>
    );
}

/* -------------------------------
   AirdropWithAmount (airdropWithAmount(uint256,address[]))
----------------------------------- */
interface AirdropWithAmountProps extends CommonProps {
    readonly decoded: DecodedAirdropWithAmount;
}

export function AirdropWithAmountDecodedInfo(props: AirdropWithAmountProps) {
    const { contractInfo, interactionType, decoded } = props;
    const balanceFormatted = BitcoinUtils.formatUnits(decoded.amount, contractInfo.decimals || 8);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Text
                    text={`Airdrop with Amount: ${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()}`}
                    preset="large"
                    textCenter
                    style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal'
                    }}
                />
                <Text text={`Addresses:`} preset="sub-bold" textCenter />
                {decoded.addresses?.map((addr, i) => (
                    <Text key={i} text={sliceAddress(addr)} preset="sub" textCenter />
                ))}
            </Column>
        </Card>
    );
}
