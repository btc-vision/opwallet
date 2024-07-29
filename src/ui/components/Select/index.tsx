import { IOP_20Contract, OP_20_ABI, getContract } from 'opnet';
import { CSSProperties, useEffect, useState } from 'react';

import { runesUtils } from '@/shared/lib/runes-utils';
import { OpNetBalance } from '@/shared/types';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Column, Icon, Image, Row, Text } from '@/ui/components';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';

import { BaseView, BaseViewProps } from '../BaseView';
import { RunesTicker } from '../RunesTicker';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends BaseViewProps {
  options: OpNetBalance[];
  onSelect: (option: OpNetBalance) => void;
  placeholder?: string;
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
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
} as CSSProperties;

const $modalContentStyle = {
  backgroundColor: '#1c1919',
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
  backgroundColor: '#1c1919',
  width: '100%',
  padding: 8,
  marginBottom: 10,
  fontSize: fontSizes.xs,
  border: 'none',
  color: colors.text
} as CSSProperties;

export function Select(props: SelectProps) {
  const { style: $styleOverride, options, onSelect, placeholder = 'Select an option', ...rest } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<OpNetBalance | null>(null);
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
    setWallet();
  }, []);
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
          const contract: IOP_20Contract = getContract<IOP_20Contract>(searchTerm, OP_20_ABI, Web3API.provider);
          const contractInfo: ContractInformation | undefined = await Web3API.queryContractInformation(searchTerm);

          const balance = await contract.balanceOf(account.address);

          if (!('error' in balance)) {
            const opNetBalance: OpNetBalance = {
              address: searchTerm,
              name: contractInfo?.name || '',
              amount: BigInt(balance.decoded[0].toString()),
              divisibility: contractInfo?.decimals || 8,
              symbol: contractInfo?.symbol,
              logo: contractInfo?.logo
            };
            setFilteredOptions([opNetBalance]);
            setLoading(false);
          } else {
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

  const handleSelect = (option: OpNetBalance) => {
    setSelectedOption(option);
    onSelect(option);
    setIsOpen(false);
    setSearchTerm('');
  };
  const calculateBalance = (amount: bigint | undefined, divisibility: number | undefined) => {
    const balance = runesUtils.toDecimalNumber(amount, divisibility);
    let str = balance.toString();
    if (balance.lt(0.0001)) {
      str = '0';
    }
    return str;
  };

  return (
    <>
      <Column>
        <BaseView style={$style} onClick={() => setIsOpen(true)} {...rest}>
          <div>{selectedOption ? <Image src={selectedOption.logo} size={fontSizes.tiny} /> : <></>}</div>
          {selectedOption ? (
            <>
              <Row fullY justifyBetween justifyCenter>
                <Column fullY justifyCenter>
                  <RunesTicker tick={selectedOption.symbol} />
                </Column>
              </Row>
            </>
          ) : (
            <RunesTicker tick={placeholder} />
          )}
        </BaseView>
        <div onClick={() => setIsOpen(true)} {...rest}>
          {selectedOption ? (
            <>
              <Row itemsCenter fullY gap="zero">
                <Text text={'Balance:'} size="xs" />
                <Text
                  text={calculateBalance(selectedOption?.amount || 0n, selectedOption?.divisibility || 0)}
                  size="xs"
                />
              </Row>
            </>
          ) : (
            <Text text={'Balance:0'} size="xs" />
          )}
        </div>
      </Column>
      {isOpen && (
        <div style={$modalStyle} onClick={() => setIsOpen(false)}>
          <div style={$modalContentStyle} onClick={(e) => e.stopPropagation()}>
            {' '}
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
                {filteredOptions.map((option) => (
                  <div key={option.address} style={$optionStyle} onClick={() => handleSelect(option)}>
                    <Image src={option.logo} size={fontSizes.tiny} />
                    {option.name}
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
