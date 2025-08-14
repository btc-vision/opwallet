import { CloseOutlined } from '@ant-design/icons';
import { Dispatch, SetStateAction, useState } from 'react';

import Web3API from '@/shared/web3/Web3API';
import { Button, Column, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useWallet } from '@/ui/utils';
import { Address } from '@btc-vision/transaction';

// Simple interface for tokens in localStorage
interface StoredToken {
    address: string;
    hidden: boolean;
}

export const AddOpNetToken = ({
    currentPage,
    onClose,
    setImportTokenBool,
    fetchData
}: {
    currentPage: number;
    onClose: () => void;
    setImportTokenBool: Dispatch<SetStateAction<boolean>>;
    fetchData: (page: number) => Promise<void>;
}) => {
    const [tokenState, setTokenState] = useState<string>('');
    const wallet = useWallet();
    const tools = useTools();
    const currentAccount = useCurrentAccount();

    const saveToLocalStorage = async () => {
        try {
            let tokenAddress = tokenState.trim();

            if (!tokenAddress) {
                tools.toastError('Please enter a valid token address.');
                return;
            }

            if (tokenAddress.startsWith('0x')) {
                const pubKey = Address.fromString(tokenAddress);
                const network = Web3API.network;

                if (!pubKey.isValid(network)) {
                    tools.toastError('The pubkey is invalid.');
                    return;
                }

                tokenAddress = pubKey.p2op(network);

                if (!tokenAddress) {
                    tools.toastError('The P2OP address was not generated.');
                    return;
                }
            }

            try {
                const isValidContract = await Web3API.queryContractInformation(tokenAddress);
                if (!isValidContract) {
                    tools.toastError('The address is not a valid contract.');
                    return;
                }
            } catch {
                tools.toastError('Failed to validate contract.');
                return;
            }

            const chain = await wallet.getChainType();
            const accountAddr = currentAccount.pubkey;
            const storageKey = `opnetTokens_${chain}_${accountAddr}`;

            // Load existing tokens for this chain+account
            const tokensImported = localStorage.getItem(storageKey);
            const parsedTokens: (StoredToken | string)[] = tokensImported
                ? (JSON.parse(tokensImported) as (StoredToken | string)[])
                : [];

            // Check if token already exists
            const isDuplicate = parsedTokens.some((t) =>
                typeof t === 'object' ? t.address === tokenState : t === tokenState
            );

            if (isDuplicate) {
                tools.toastError('Token already imported.');
                return;
            }

            // Add new token as an object
            parsedTokens.unshift({ address: tokenAddress, hidden: false });
            localStorage.setItem(storageKey, JSON.stringify(parsedTokens));

            // Refresh token list in parent
            await fetchData(currentPage);

            // Close modal
            setImportTokenBool(false);
        } catch (err) {
            if (err instanceof Error) {
                tools.toastError(err.message);
            } else {
                tools.toastError('Failed to import token, check the console for more details.');
            }
            console.error(err);
        }
    };

    return (
        <BottomModal onClose={onClose}>
            <Column justifyCenter itemsCenter>
                <Row justifyBetween itemsCenter style={{ height: 20 }} fullX>
                    <Row />
                    <Text text="Add Token" textCenter size="md" />
                    <Row onClick={onClose}>
                        <CloseOutlined />
                    </Row>
                </Row>

                <Column mt="lg" style={{ width: '100%', marginBottom: '20px' }}>
                    <Text text="Token Address" preset="regular" color="textDim" />
                    <Input
                        preset="text"
                        value={tokenState}
                        onChange={(e) => {
                            setTokenState(e.target.value);
                        }}
                        autoFocus
                    />
                </Column>
            </Column>

            <Button disabled={false} preset="primary" text="Next" onClick={() => void saveToLocalStorage()} />
        </BottomModal>
    );
};
