import { useEffect, useState } from 'react';

import { Action, AirdropParameters, Features } from '@/shared/interfaces/RawTxParameters';
import { OPTokenInfo } from '@/shared/types';
import { Button, Content, Header, Layout, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';

import { useLocationState } from '@/ui/utils';
import { RouteTypes, useNavigate } from '../MainRoute';

export default function WrapBitcoinOpnet() {
    const OpNetBalance = useLocationState<OPTokenInfo>();

    const navigate = useNavigate();
    const [disabled, setDisabled] = useState(true);
    const [getFile, setFile] = useState<File | null>(null);

    const [error, setError] = useState('');
    const [amounts, SetAmounts] = useState<{ [key: string]: string } | null>(null);
    const tools = useTools();

    const [feeRate, setFeeRate] = useState(5);

    useEffect(() => {
        setError('');
        setDisabled(false);
        if (getFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                const lines = content.split('\n');

                const amounts: { [key: string]: string } = {};

                for (let i = 1; i < lines.length; i++) {
                    // Start from 1 to skip header
                    const [address, amount] = lines[i].split(',');
                    if (address && amount) {
                        const trimmedAddress = address.trim();
                        const trimmedAmount = amount.trim();

                        // verify if address is 0x
                        if (/^0x[a-fA-F0-9]$/.test(trimmedAddress) && /^\d+$/.test(trimmedAmount)) {
                            amounts[trimmedAddress] = trimmedAmount;
                        } else {
                            setError('Invalid data found in CSV file.');
                            setDisabled(true);
                            break;
                        }
                    }
                }

                if (amounts && Object.keys(amounts).length > 0) {
                    console.log('Parsed amounts:', amounts);
                    SetAmounts(amounts);
                } else {
                    setError('No valid data found in CSV file.');
                    setDisabled(true);
                }
            };

            reader.onerror = (event) => {
                setError('Error reading file: ' + (event.target?.error?.message ?? 'unknown error'));
                setDisabled(true);
            };

            reader.readAsText(getFile);
        }
        if (!getFile) {
            setDisabled(true);
        }

        // }
    }, [getFile]);

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title={'Airdrop ' + OpNetBalance.name}
            />
            <Content>
                <Text text="Upload Contract" color="textDim" />
                <Text text={getFile?.name} />

                <div
                    style={{
                        border: '2px dashed #ccc',
                        borderRadius: '4px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer'
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = e.dataTransfer.files;
                        if (files.length > 0 && files[0].name.endsWith('.wasm')) {
                            // Handle the dropped file here
                            setFile(files[0]);
                            console.log(files[0]);
                            console.log('File dropped:', files[0].name);
                        } else {
                            tools.toastError('Please drop a .wasm file');
                        }
                    }}>
                    <input
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                                // Handle the selected file here
                                setFile(files[0]);
                                console.log(files[0]);
                                console.log('File selected:', files[0].name);
                            }
                        }}
                        id="fileInput"
                    />

                    <label htmlFor="fileInput" style={{ cursor: 'pointer' }}>
                        <Text text="Click to select or drag and drop a .wasm file here" />
                    </label>
                </div>
                {error && <Text text={error} color="error" />}

                <Button
                    disabled={disabled}
                    preset="primary"
                    text="Airdrop"
                    onClick={() => {
                        if (!amounts) {
                            tools.toastError('Please upload a valid CSV file');
                            return;
                        }

                        const event: AirdropParameters = {
                            action: Action.Airdrop,
                            contractAddress: OpNetBalance.address,
                            tokens: [OpNetBalance],
                            feeRate: feeRate,
                            priorityFee: 0n,
                            amounts: amounts,
                            header: 'Airdrop ' + OpNetBalance.name,
                            features: {
                                [Features.rbf]: true,
                                [Features.taproot]: true,
                                [Features.cpfp]: true
                            }
                        };

                        navigate(RouteTypes.TxOpnetConfirmScreen, {
                            rawTxInfo: event
                        });
                    }}></Button>
            </Content>
        </Layout>
    );
}
