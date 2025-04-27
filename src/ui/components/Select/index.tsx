import { BitcoinUtils, getContract, IOP_20Contract, OP_20_ABI } from 'opnet';
import { CSSProperties, useEffect, useState } from 'react';

import { OPTokenInfo } from '@/shared/types';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Icon, Image, Row } from '@/ui/components';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';

import { BaseViewProps } from '../BaseView';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends BaseViewProps {
    setMax?: () => void;
    selectIndex: number;
    options: OPTokenInfo[];
    onSelect: (option: OPTokenInfo) => void;
    placeholder?: string;
    selectedoptionuse?: OPTokenInfo | null;
}

const $selectStyle = {
    backgroundColor: '#1c1919',
    padding: 10,
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: fontSizes.xs,
    color: colors.text,
    gap: '10px',
    display: 'flex',
    alignItems: 'center',
    height: '42px',
    width: '120px'
} as CSSProperties;

const $modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(33,33,33,0.69)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
} as CSSProperties;

const $modalContentStyle = {
    backgroundColor: '#212121',
    padding: 20,
    borderRadius: 4,
    maxWidth: 300,
    width: '100%'
} as CSSProperties;

const $optionStyle = {
    padding: 10,
    cursor: 'pointer',
    ':hover': {
        backgroundColor: colors.bg3
    },
    gap: '10px',
    display: 'flex',
    alignItems: 'center'
} as CSSProperties;

const $searchInputStyle = {
    backgroundColor: '#212121',
    borderColor: '#292828',
    borderWidth: 1,
    width: '100%',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
    fontSize: fontSizes.xs,
    border: 'none',
    color: colors.text
} as CSSProperties;

export function Select(props: SelectProps) {
    const {
        style: $styleOverride,
        options,
        onSelect,
        placeholder = 'Select an option',
        selectIndex,
        setMax,
        ...rest
    } = props;
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState<OPTokenInfo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const account = useCurrentAccount();
    const wallet = useWallet();
    const [loading, setLoading] = useState(true);

    const $style = Object.assign({}, $selectStyle, $styleOverride);
    useEffect(() => {
        const setWallet = async () => {
            Web3API.setNetwork(await wallet.getChainType());
        };

        if (props.selectedoptionuse) {
            setSelectedOption(props.selectedoptionuse);
        }
        setWallet();
    }, [props.selectedoptionuse]);
    useEffect(() => {
        const checkOption = async () => {
            if (searchTerm) {
                setLoading(true);
                const lowercasedSearch = searchTerm.toLowerCase();
                setFilteredOptions(
                    options.filter(
                        (option) =>
                            option.name.toLowerCase().includes(lowercasedSearch) ||
                            option.address.toLowerCase().includes(lowercasedSearch)
                    )
                );
                if (
                    options.filter(
                        (option) =>
                            option.name.toLowerCase().includes(lowercasedSearch) ||
                            option.address.toLowerCase().includes(lowercasedSearch)
                    ).length == 0
                ) {
                    if (searchTerm.length > 20) {
                        setLoading(true);
                    }
                    const contract: IOP_20Contract = getContract<IOP_20Contract>(
                        searchTerm,
                        OP_20_ABI,
                        Web3API.provider,
                        Web3API.network
                    );
                    const contractInfo: ContractInformation | false | undefined =
                        await Web3API.queryContractInformation(searchTerm);

                    if (!contractInfo) {
                        setFilteredOptions([]);
                        setLoading(false);
                        return;
                    }

                    try {
                        const balance = await contract.balanceOf(Address.fromString(account.pubkey));
                        if (balance == undefined) {
                            setFilteredOptions([]);
                            setLoading(false);
                        }
                        const opNetBalance: OPTokenInfo = {
                            address: searchTerm,
                            name: contractInfo?.name ?? '',
                            amount: balance.properties.balance,
                            divisibility: contractInfo?.decimals ?? 8,
                            symbol: contractInfo?.symbol ?? '',
                            logo: contractInfo?.logo
                        };
                        setFilteredOptions([opNetBalance]);
                        setLoading(false);
                    } catch (e) {
                        setFilteredOptions([]);
                        setLoading(false);
                    }
                }
            } else {
                setFilteredOptions(options);
                setLoading(false);
            }
        };
        checkOption();
    }, [searchTerm, options]);

    const handleSelect = (option: OPTokenInfo) => {
        setSelectedOption(option);
        onSelect(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const calculateBalance = (amount: bigint | undefined, divisibility: number | undefined) => {
        return BitcoinUtils.formatUnits(amount ?? 0n, divisibility);
    };

    return (
        <>
            <div className="op_swap_token_selector" onClick={() => setIsOpen(true)} {...rest}>
                {selectedOption ? <Image src={selectedOption.logo} width={22} height={22} /> : <></>}
                {selectedOption ? (
                    <>
                        <Row fullY justifyBetween justifyCenter>
                            <div className="op_swap_token_selector_inner">
                                {selectedOption.symbol}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="
                            none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-chevron-down-icon lucide-chevron-down">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </Row>
                    </>
                ) : (
                    <>
                        <span className="op_select_token_placeholder">{placeholder}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="
                            none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-chevron-down-icon lucide-chevron-down">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </>
                )}
            </div>
            {isOpen && (
                <div style={$modalStyle} onClick={() => setIsOpen(false)}>
                    <div style={$modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={$searchInputStyle}
                        />
                        {loading ? (
                            <Row itemsCenter justifyCenter>
                                <Icon size={fontSizes.xxxl} color="gold">
                                    <LoadingOutlined />
                                </Icon>
                            </Row>
                        ) : (
                            <>
                                {filteredOptions.map((option, index) => (
                                    <div
                                        key={index}
                                        className="op_token_container"
                                        onClick={() => handleSelect(option)}>
                                        <div className="op_token_col_1">
                                            <div className="op_token_image">
                                                <Image src={option.logo} />
                                            </div>
                                            <div className="op_token_title">{option.name}</div>
                                        </div>
                                    </div>
                                ))}
                                {filteredOptions.length === 0 && (
                                    <div style={{ padding: 10, color: colors.text }}>No options found</div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
