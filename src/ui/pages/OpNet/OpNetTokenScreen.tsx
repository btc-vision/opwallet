import BigNumber from 'bignumber.js';
import { BitcoinUtils, getContract, IOP20Contract, OP20_ABI } from 'opnet';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OPTokenInfo } from '@/shared/types';
import { addressShortner } from '@/shared/utils';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Button, Column, Content, Header, Icon, Image, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { copyToClipboard, useLocationState, useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';
import { AddressMap, Wallet } from '@btc-vision/transaction';

import { RouteTypes, useNavigate } from '../MainRoute';

interface LocationState {
    address: string;
}

export default function OpNetTokenScreen() {
    const navigate = useNavigate();

    const params = useLocationState<LocationState>();
    const [tokenSummary, setTokenSummary] = useState<OPTokenInfo>({
        address: '',
        name: '',
        symbol: '',
        logo: '',
        amount: 0n,
        divisibility: 0
    });

    const account = useCurrentAccount();

    const [loading, setLoading] = useState(false);
    const [isOwner, setIsOwner] = useState(false);

    const tools = useTools();
    const wallet = useWallet();

    const getWallet = useCallback(async () => {
        const currentWalletAddress = await wallet.getCurrentAccount();
        const pubkey = currentWalletAddress.pubkey;

        const wifWallet = await wallet.getInternalPrivateKey({
            pubkey: pubkey,
            type: currentWalletAddress.type
        });

        return Wallet.fromWif(wifWallet.wif, Web3API.network);
    }, [wallet]);

    const unitBtc = useBTCUnit();
    useEffect(() => {
        const getAddress = async () => {
            Web3API.setNetwork(await wallet.getChainType());

            const myWallet = await getWallet();
            const contract: IOP20Contract = getContract<IOP20Contract>(
                params.address,
                OP20_ABI,
                Web3API.provider,
                Web3API.network,
                myWallet.address
            );

            const contractInfo: ContractInformation | false | undefined = await Web3API.queryContractInformation(
                params.address
            );
            if (!contractInfo) {
                throw new Error('Contract information not found');
            }

            try {
                const balance = await contract.balanceOf(myWallet.address);
                const newSummaryData = {
                    address: params.address,
                    name: contractInfo.name ?? '',
                    amount: balance.properties.balance,
                    divisibility: contractInfo.decimals ?? 8,
                    symbol: contractInfo.symbol,
                    logo: contractInfo.logo
                };

                setTokenSummary(newSummaryData);
            } catch (e) {
                tools.toastError('Error in getting balance');
                return;
            }

            try {
                const deployer = await contract.deployer();
                setIsOwner(myWallet.address.equals(deployer.properties.deployer));
            } catch {
                try {
                    const addy: AddressMap<bigint> = new AddressMap();
                    addy.set(myWallet.address, 100000000n);

                    await contract.airdrop(addy);
                    setIsOwner(true);
                } catch {}
            }

            setLoading(false);
        };

        void getAddress();
    }, [account.address, getWallet, params.address, tools, unitBtc, wallet]);

    const enableTransfer = useMemo(() => {
        let enable = false;
        if (tokenSummary.amount) {
            enable = true;
        }

        return enable;
    }, [tokenSummary]);

    const copy = async (data: string) => {
        await copyToClipboard(data);
        tools.toastSuccess(`Copied!`);
    };

    const deleteToken = useCallback(async () => {
        const getChain = await wallet.getChainType();
        const tokensImported = localStorage.getItem(`opnetTokens_${getChain}_${account.pubkey}`);

        if (tokensImported) {
            let updatedTokens: string[] = JSON.parse(tokensImported) as string[];
            updatedTokens = updatedTokens.filter((address) => address !== tokenSummary.address);
            localStorage.setItem('opnetTokens_' + getChain, JSON.stringify(updatedTokens));
        }

        tools.toastSuccess('Token removed from imported list');
        window.history.go(-1);
    }, [account.pubkey, tokenSummary.address, tools, wallet]);

    if (loading) {
        return (
            <Layout>
                <Content itemsCenter justifyCenter>
                    <Icon size={fontSizes.xxxl} color="gold">
                        <LoadingOutlined />
                    </Icon>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
            />
            {tokenSummary && (
                <Content>
                    <Column py="xl" style={{ borderBottomWidth: 1, borderColor: colors.white_muted }}>
                        <Row
                            itemsCenter
                            fullX
                            justifyCenter
                            style={{
                                flexDirection: 'column',
                                gap: 10
                            }}>
                            <Image src={tokenSummary.logo} size={fontSizes.xxl} />
                            <Text
                                text={`${new BigNumber(
                                    BitcoinUtils.formatUnits(tokenSummary.amount, tokenSummary.divisibility)
                                ).toFixed(tokenSummary.divisibility)} ${tokenSummary.symbol}`}
                                preset="bold"
                                textCenter
                                size="lg"
                                wrap
                            />
                        </Row>

                        <Row
                            itemsCenter
                            fullX
                            justifyCenter
                            onClick={(e) => {
                                copy(tokenSummary.address);
                            }}>
                            <Icon icon="copy" color="textDim" />
                            <Text
                                text={addressShortner(tokenSummary.address)}
                                color="textDim"
                                style={{
                                    overflowWrap: 'anywhere'
                                }}
                            />
                        </Row>

                        <Row justifyBetween mt="lg">
                            <Button
                                text="Send"
                                preset="primary"
                                icon="send"
                                style={!enableTransfer ? { backgroundColor: 'grey' } : {}}
                                disabled={!enableTransfer}
                                onClick={(e) => {
                                    navigate(RouteTypes.SendOpNetScreen, tokenSummary);
                                }}
                                full
                            />
                        </Row>
                    </Column>

                    <Text
                        text={tokenSummary.name}
                        preset="title-bold"
                        onClick={() => {
                            copyToClipboard(tokenSummary.name).then(() => {
                                tools.toastSuccess('Copied');
                            });
                        }}></Text>
                    <Row justifyBetween full>
                        {isOwner ? (
                            <>
                                <Button
                                    text="Mint"
                                    preset="primary"
                                    icon="pencil"
                                    onClick={(e) => {
                                        navigate(RouteTypes.Mint, tokenSummary);
                                    }}
                                    full
                                />
                            </>
                        ) : (
                            <></>
                        )}

                        <Button
                            text="Swap"
                            preset="primary"
                            icon="send"
                            style={!enableTransfer ? { backgroundColor: 'grey' } : {}}
                            disabled={!enableTransfer}
                            onClick={(e) => {
                                navigate(RouteTypes.Swap, tokenSummary);
                            }}
                            full
                        />
                    </Row>
                </Content>
            )}
        </Layout>
    );
}
