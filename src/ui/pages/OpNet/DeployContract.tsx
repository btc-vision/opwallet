import React, { useEffect, useState } from 'react';
import { Button, Column, Content, Header, Layout, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RouteTypes, useNavigate } from '../MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { Action, Features } from '@/shared/interfaces/RawTxParameters';

export default function DeployContractOpnet() {
    const account = useCurrentAccount();
    const navigate = useNavigate();
    const tools = useTools();

    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [feeRate, setFeeRate] = useState<number>(2);
    const [priorityFee, setPriorityFee] = useState<string>('0');
    const [calldataHex, setCalldataHex] = useState<string>('');
    const [disabled, setDisabled] = useState(true);

    useEffect(() => {
        setDisabled(!wasmFile);
    }, [wasmFile]);

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.wasm')) {
            tools.toastError('Please select a .wasm file');
            return;
        }
        setWasmFile(file);
    };

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const triggerDeploy = () => {
        navigate(RouteTypes.TxOpnetConfirmScreen, {
            rawTxInfo: {
                account,
                feeRate,
                tokens: [],
                priorityFee: BigInt(priorityFee),
                gasSatFee: 5000n,
                header: 'Deploy Contract',
                networkFee: feeRate,
                features: {
                    [Features.rbf]: true,
                    [Features.taproot]: true,
                    [Features.cpfp]: true
                },
                file: wasmFile,
                calldataHex,
                action: Action.DeployContract
            }
        });
    };

    return (
        <Layout>
            <Header title="Deploy Contract" onBack={() => window.history.go(-1)} />
            <Content>
                {/* warning */}
                <div
                    style={{
                        background: 'rgba(255,165,0,0.1)',
                        border: '1px solid rgba(255,165,0,0.4)',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 20
                    }}>
                    <Text text="Heads‑up: network confirmation can take up to 10 minutes after submitting the deploy transaction." />
                </div>

                {/* file uploader */}
                <Text text="Upload Contract (.wasm)" color="textDim" />
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                    }}
                    onDrop={onDrop}
                    style={{
                        border: '2px dashed #ccc',
                        borderRadius: 8,
                        padding: 30,
                        textAlign: 'center',
                        cursor: 'pointer',
                        marginBottom: 20
                    }}>
                    <input
                        type="file"
                        accept=".wasm"
                        style={{ display: 'none' }}
                        id="fileInput"
                        onChange={onFileInput}
                    />
                    <label htmlFor="fileInput" style={{ cursor: 'pointer' }}>
                        {wasmFile ? wasmFile.name : 'Click to select or drag & drop your .wasm file'}
                    </label>
                </div>

                {/* fees */}
                <Column>
                    <Text text="Fee rate (sat/vB)" color="textDim" />
                    <FeeRateBar onChange={setFeeRate} />
                </Column>

                <div style={{ marginTop: 20 }}>
                    <Text text="Gas fee (sats)" color="textDim" />
                    <input
                        type="number"
                        min={0}
                        value={priorityFee}
                        onChange={(e) => setPriorityFee(e.target.value)}
                        style={{
                            marginTop: 6,
                            backgroundColor: 'transparent',
                            borderRadius: 5,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.3)',
                            padding: 4,
                            width: '100%'
                        }}
                    />
                </div>

                {/* calldata */}
                <div style={{ marginTop: 20 }}>
                    <Text text="Custom calldata (hex, optional)" color="textDim" />
                    <input
                        type="text"
                        placeholder="0x…"
                        value={calldataHex}
                        onChange={(e) => {
                            // validate hex string
                            const hex = e.target.value;
                            if (/^0x[0-9a-fA-F]*$/.test(hex)) {
                                setCalldataHex(hex);
                            } else {
                                tools.toastError('Invalid hex string');
                            }
                        }}
                        style={{
                            marginTop: 6,
                            backgroundColor: 'transparent',
                            borderRadius: 5,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.3)',
                            padding: 4,
                            width: '100%',
                            fontFamily: 'monospace'
                        }}
                    />
                </div>

                {/* quick guide */}
                <details style={{ marginTop: 30 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Need help? Quick guide</summary>
                    <ol style={{ marginTop: 10, paddingLeft: 20, lineHeight: 1.6 }}>
                        <li>
                            Clone the OP_20 template: <code>git clone https://github.com/btc-vision/OP_20.git</code>
                        </li>
                        <li>
                            Edit <code>src/contracts/MyToken.ts</code> → set maxSupply, decimals, name, symbol.
                        </li>
                        <li>
                            Run <code>npm install</code> then <code>npm run build</code> →&#160;find{' '}
                            <code>MyToken.wasm</code> in build/.
                        </li>
                        <li>Open OP_Wallet → Deploy → upload your .wasm file.</li>
                        <li>Wait for ~10 min until the transaction is mined. Then mint / interact as usual.</li>
                    </ol>
                </details>

                {/* deploy btn */}
                <Button
                    preset="primary"
                    text="Deploy"
                    style={{ marginTop: 30 }}
                    disabled={disabled}
                    onClick={triggerDeploy}
                />
            </Content>
        </Layout>
    );
}
