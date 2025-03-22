import React, {
    ChangeEvent,
    ClipboardEvent,
    CSSProperties,
    FocusEvent,
    KeyboardEvent,
    useEffect,
    useState
} from 'react';
import { AddressVerificator } from '@btc-vision/transaction';
import Web3API from '@/shared/web3/Web3API';
import { useWallet } from '@/ui/utils';
import { useTools } from '../ActionComponent';

import { Icon } from '../Icon';
import { Row } from '../Row';
import { $textPresets, Text } from '../Text';
import { colors } from '@/ui/theme/colors';
import { spacing } from '@/ui/theme/spacing';

export interface InputProps {
    /** Choose which specialized input to render */
    preset?: Presets;

    /** HTML input placeholder */
    placeholder?: string;

    /** Additional children elements */
    children?: React.ReactNode;

    /** Standard event handlers */
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
    onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
    onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;

    /** Autofocus for the input element */
    autoFocus?: boolean;

    /** Controlled or default values */
    defaultValue?: string;
    value?: string;

    /** Custom styling */
    style?: CSSProperties;
    containerStyle?: CSSProperties;

    /** Address input specific fields */
    addressInputData?: { address: string; domain: string };
    onAddressInputChange?: (params: { address: string; domain: string }) => void;

    /** Amount input specific fields */
    onAmountInputChange?: (amount: string) => void;
    disableDecimal?: boolean;
    enableBrc20Decimal?: boolean;
    runesDecimal?: number;

    /** Boolean flags */
    disabled?: boolean;
    enableMax?: boolean;

    /** Callback if max button is clicked */
    onMaxClick?: () => void;
}

export type Presets = 'password' | 'amount' | 'address' | 'text';

/* ---------------------------------- Styles --------------------------------- */

// You can tweak these base styles for consistent look and feel
const baseContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2626',
    borderRadius: 5,
    minHeight: '46.5px',
    alignSelf: 'stretch',
    padding: '11px 15.2px'
};

const baseInputStyle: CSSProperties = {
    ...$textPresets.regular,
    display: 'flex',
    flex: 1,
    borderWidth: 0,
    outlineWidth: 0,
    backgroundColor: 'transparent',
    alignSelf: 'stretch'
};

/* ------------------------------ Subcomponents ------------------------------- */

/** PasswordInput */
function PasswordInput({ placeholder, containerStyle, style: inputStyleOverride, ...rest }: InputProps) {
    const [type, setType] = useState<'password' | 'text'>('password');

    return (
        <div style={{ ...baseContainerStyle, ...containerStyle }}>
            <input
                type={type}
                placeholder={placeholder ?? 'Password'}
                style={{ ...baseInputStyle, ...inputStyleOverride }}
                {...rest}
            />
            {type === 'password' ? (
                <Icon
                    icon="eye-slash"
                    style={{ marginLeft: spacing.tiny }}
                    onClick={() => setType('text')}
                    color="textDim"
                />
            ) : (
                <Icon icon="eye" style={{ marginLeft: spacing.tiny }} onClick={() => setType('password')} />
            )}
        </div>
    );
}

/** AmountInput */
function AmountInput({
    placeholder,
    onAmountInputChange,
    disabled,
    style: inputStyleOverride,
    disableDecimal,
    enableBrc20Decimal,
    runesDecimal,
    enableMax,
    onMaxClick,
    value,
    ...rest
}: InputProps) {
    // If there's no handler to bubble up the amount, just return an empty element.
    if (!onAmountInputChange) {
        return <div />;
    }

    const [inputValue, setInputValue] = useState<string>(value ?? '');
    const [validAmount, setValidAmount] = useState<string>(value ?? '');

    // Notify parent whenever validAmount changes
    useEffect(() => {
        onAmountInputChange(validAmount);
    }, [validAmount, onAmountInputChange]);

    // Input style override if disabled
    const mergedInputStyle = {
        ...baseInputStyle,
        ...inputStyleOverride,
        ...(disabled ? { color: colors.textDim } : {})
    };

    const handleInputAmount = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        // If decimals are not allowed (integer only)
        if (disableDecimal) {
            // ^[1-9]\d*$ means at least one digit, not starting with 0 unless empty
            if (/^[1-9]\d*$/.test(val) || val === '') {
                setInputValue(val);
                setValidAmount(val);
            }
            return;
        }

        // If decimals are allowed
        if (enableBrc20Decimal) {
            // Up to 18 decimal places
            if (/^\d+\.?\d{0,18}$/.test(val) || val === '') {
                setInputValue(val);
                setValidAmount(val);
            }
        } else if (typeof runesDecimal === 'number') {
            // Up to `runesDecimal` decimal places
            const decimalRegex = new RegExp(`^\\d+\\.?\\d{0,${runesDecimal}}$`);
            if (decimalRegex.test(val) || val === '') {
                setInputValue(val);
                setValidAmount(val);
            }
        } else {
            // Default up to 8 decimal places
            if (/^\d*\.?\d{0,8}$/.test(val) || val === '') {
                setInputValue(val);
                setValidAmount(val);
            }
        }
    };

    return (
        <div style={baseContainerStyle}>
            <input
                placeholder={placeholder ?? 'Amount'}
                type="text"
                value={inputValue}
                onChange={handleInputAmount}
                style={mergedInputStyle}
                disabled={disabled}
                {...rest}
            />
            {enableMax && (
                <Text
                    text="Max"
                    color="yellow"
                    size="sm"
                    onClick={() => onMaxClick?.()}
                    style={{ cursor: 'pointer' }}
                />
            )}
        </div>
    );
}

/** AddressInput */
function AddressInput({
    placeholder,
    onAddressInputChange,
    addressInputData,
    style: inputStyleOverride,
    ...rest
}: InputProps) {
    if (!addressInputData || !onAddressInputChange) {
        return <div />;
    }

    const { address: initialAddress, domain: initialDomain } = addressInputData;

    // Controlled states for address
    const [validAddress, setValidAddress] = useState(initialAddress);
    const [inputVal, setInputVal] = useState(initialDomain || initialAddress);

    // Potential error states
    const [parseError, setParseError] = useState('');
    const [formatError, setFormatError] = useState('');

    // If the address is recognized as an ENS-like name or short domain
    const [parseName, setParseName] = useState('');
    const [searching, setSearching] = useState(false);

    // We might need these from your hooking system
    const wallet = useWallet();
    const tools = useTools();

    // Effect: Let parent know whenever validAddress changes
    useEffect(() => {
        onAddressInputChange({
            address: validAddress,
            domain: parseName ? inputVal : ''
        });
    }, [validAddress, parseName, inputVal, onAddressInputChange]);

    const resetState = () => {
        setParseError('');
        setFormatError('');
        setParseName('');
        setValidAddress('');
    };

    const handleInputAddress = (e: ChangeEvent<HTMLInputElement>) => {
        const inputAddr = e.target.value.trim();
        setInputVal(inputAddr);

        resetState();

        // Quick check for validity
        const isValid = AddressVerificator.detectAddressType(inputAddr, Web3API.network);
        if (!isValid) {
            setFormatError('Recipient address is invalid');
            return;
        }

        // If valid, store it
        setValidAddress(inputAddr);
        // Potentially do name resolution if user typed in a short domain
        // e.g. "bob.sats" or "bob.unisat"
        // This might involve setting `parseName`.
    };

    return (
        <div style={{ alignSelf: 'stretch' }}>
            {/* Container for the actual input */}
            <div
                style={{
                    ...baseContainerStyle,
                    flexDirection: 'column',
                    minHeight: '56.5px'
                }}>
                <input
                    placeholder={placeholder ?? 'Address or name (sats, unisat, ...)'}
                    type="text"
                    style={{ ...baseInputStyle, ...inputStyleOverride }}
                    onChange={handleInputAddress}
                    defaultValue={inputVal}
                    {...rest}
                />

                {/* Show a simple "Loading..." state if we are searching */}
                {searching && (
                    <Row full mt="sm">
                        <Text preset="sub" text="Loading..." />
                    </Row>
                )}
            </div>

            {/* If we recognized a short domain or name */}
            {parseName && (
                <Row mt="sm" gap="zero" itemsCenter>
                    <Text preset="sub" size="sm" text="Name recognized and resolved. (" />
                    <Text
                        preset="link"
                        color="yellow"
                        text="More details"
                        onClick={() => window.open('https://docs.unisat.io/unisat-wallet/name-recognized-and-resolved')}
                    />
                    <Text preset="sub" size="sm" text=")" />
                </Row>
            )}

            {/* Show any parse or format errors */}
            {parseError && <Text text={parseError} preset="regular" color="error" />}
            {formatError && <Text text={formatError} preset="regular" color="error" />}
        </div>
    );
}

/** Plain TextInput */
function TextInput({
    placeholder,
    containerStyle,
    style: inputStyleOverride,
    disabled,
    autoFocus,
    ...rest
}: InputProps) {
    return (
        <div style={{ ...baseContainerStyle, ...containerStyle }}>
            <input
                type="text"
                disabled={disabled}
                autoFocus={autoFocus}
                placeholder={placeholder}
                style={{
                    ...baseInputStyle,
                    ...inputStyleOverride,
                    ...(disabled ? { color: colors.textDim } : {})
                }}
                {...rest}
            />
        </div>
    );
}

/* ---------------------------------- Export --------------------------------- */

/**
 * Main Input component that chooses a specialized input
 * based on the `preset` prop. Default is a simple text input.
 */
export function Input(props: InputProps) {
    const { preset } = props;

    switch (preset) {
        case 'password':
            return <PasswordInput {...props} />;
        case 'amount':
            return <AmountInput {...props} />;
        case 'address':
            return <AddressInput {...props} />;
        // Default: treat as regular text
        case 'text':
        default:
            return <TextInput {...props} />;
    }
}
