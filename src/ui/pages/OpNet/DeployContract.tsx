import { Action, Features } from '@/shared/interfaces/RawTxParameters';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { PriorityFeeBar } from '@/ui/components/PriorityFeeBar';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import {
    BookOutlined,
    CheckCircleOutlined,
    CloudUploadOutlined,
    CodeOutlined,
    EditOutlined,
    FileOutlined,
    GithubOutlined,
    InfoCircleOutlined,
    RocketOutlined,
    ThunderboltOutlined,
    ToolOutlined
} from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import { RouteTypes, useNavigate } from '../MainRoute';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#3b82f6'
};

export default function DeployContractOpnet() {
    const account = useCurrentAccount();
    const navigate = useNavigate();
    const tools = useTools();

    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [feeRate, setFeeRate] = useState<number>(2);
    const [priorityFee, setPriorityFee] = useState<string>('0');
    const [calldataHex, setCalldataHex] = useState<string>('');
    const [disabled, setDisabled] = useState(true);
    const [note, setNote] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

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
        setIsDragging(false);
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
                action: Action.DeployContract,
                note
            }
        });
    };

    return (
        <Layout>
            <Header title="Deploy Smart Contract" onBack={() => navigate(RouteTypes.MainScreen)} />

            <Content
                style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '24px'
                }}>
                {/* Hero Section */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`,
                        border: `1px solid ${colors.main}20`,
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '24px',
                        textAlign: 'center'
                    }}>
                    <RocketOutlined
                        style={{
                            fontSize: 48,
                            color: colors.main,
                            marginBottom: '16px'
                        }}
                    />
                    <h2
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: colors.text,
                            marginBottom: '8px'
                        }}>
                        Deploy Your OP_NET Contract
                    </h2>
                    <p
                        style={{
                            fontSize: '14px',
                            color: colors.textFaded,
                            margin: 0
                        }}>
                        Upload your compiled WASM file to deploy it on the OP_NET network
                    </p>
                </div>

                {/* Warning Banner */}
                <div
                    style={{
                        background: `${colors.warning}10`,
                        border: `1px solid ${colors.warning}30`,
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                    }}>
                    <InfoCircleOutlined
                        style={{
                            fontSize: 20,
                            color: colors.warning,
                            flexShrink: 0,
                            marginTop: '2px'
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: colors.warning,
                                marginBottom: '4px'
                            }}>
                            Important Notice
                        </div>
                        <div
                            style={{
                                fontSize: '13px',
                                color: colors.text,
                                lineHeight: '1.5'
                            }}>
                            Network confirmation can take up to 10 minutes after submitting the deploy transaction.
                            Please be patient and don&apos;t close this window during the process.
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                        marginBottom: '24px'
                    }}>
                    {/* Left Column - File Upload */}
                    <div>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '20px'
                            }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                <FileOutlined style={{ fontSize: 12 }} />
                                Contract File
                            </div>

                            {/* File Upload Area */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                                style={{
                                    border: `2px dashed ${isDragging ? colors.main : colors.containerBorder}`,
                                    borderRadius: '12px',
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    background: isDragging ? `${colors.main}05` : colors.inputBg,
                                    position: 'relative'
                                }}>
                                <input
                                    type="file"
                                    accept=".wasm"
                                    style={{ display: 'none' }}
                                    id="fileInput"
                                    onChange={onFileInput}
                                />
                                <label htmlFor="fileInput" style={{ cursor: 'pointer' }}>
                                    {wasmFile ? (
                                        <div>
                                            <CheckCircleOutlined
                                                style={{
                                                    fontSize: 32,
                                                    color: colors.success,
                                                    marginBottom: '12px'
                                                }}
                                            />
                                            <div
                                                style={{
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: colors.text,
                                                    marginBottom: '4px'
                                                }}>
                                                {wasmFile.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '12px',
                                                    color: colors.textFaded
                                                }}>
                                                {(wasmFile.size / 1024).toFixed(2)} KB
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <CloudUploadOutlined
                                                style={{
                                                    fontSize: 32,
                                                    color: colors.textFaded,
                                                    marginBottom: '12px'
                                                }}
                                            />
                                            <div
                                                style={{
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: colors.text,
                                                    marginBottom: '4px'
                                                }}>
                                                Upload WASM File
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '12px',
                                                    color: colors.textFaded
                                                }}>
                                                Click to browse or drag & drop
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Optional Note */}
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '20px',
                                marginTop: '20px'
                            }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                <EditOutlined style={{ fontSize: 12 }} />
                                Transaction Note
                            </div>
                            <input
                                type="text"
                                placeholder="Add a note for this deployment (optional)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: colors.inputBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '10px',
                                    color: colors.text,
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: 'Inter-Regular, serif'
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Column - Configuration */}
                    <div>
                        {/* Fee Configuration */}
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '20px'
                            }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                <ThunderboltOutlined style={{ fontSize: 12 }} />
                                Network Configuration
                            </div>

                            {/* Fee Rate */}
                            <div style={{ marginBottom: '16px' }}>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: colors.textFaded,
                                        marginBottom: '8px'
                                    }}>
                                    Fee Rate (sat/vB)
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    step={1}
                                    value={feeRate}
                                    onChange={(e) => setFeeRate(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: colors.inputBg,
                                        border: `1px solid ${colors.containerBorder}`,
                                        borderRadius: '10px',
                                        color: colors.text,
                                        fontSize: '13px',
                                        outline: 'none',
                                        fontFamily: 'monospace'
                                    }}
                                />
                            </div>

                            {/* Priority Fee */}
                            <div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: colors.textFaded,
                                        marginBottom: '8px'
                                    }}>
                                    Priority Fee (sats)
                                </div>
                                <PriorityFeeBar onChange={(val) => setPriorityFee(String(val))} />
                            </div>
                        </div>

                        {/* Custom Calldata */}
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '20px',
                                marginTop: '20px'
                            }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                <CodeOutlined style={{ fontSize: 12 }} />
                                Advanced Options
                            </div>
                            <div
                                style={{
                                    fontSize: '13px',
                                    color: colors.textFaded,
                                    marginBottom: '8px'
                                }}>
                                Custom Calldata (Hex)
                            </div>
                            <input
                                type="text"
                                placeholder="Paste hex data: 0x... (optional)"
                                value={calldataHex}
                                onChange={(e) => {
                                    const hex = e.target.value;
                                    if (hex === '' || /^0x[0-9a-fA-F]*$/.test(hex)) {
                                        setCalldataHex(hex);
                                    } else {
                                        tools.toastError('Invalid hex string - paste valid hex data');
                                    }
                                }}
                                onPaste={(e) => {
                                    e.currentTarget.style.borderColor = colors.main;
                                    setTimeout(() => {
                                        e.currentTarget.style.borderColor = colors.containerBorder;
                                    }, 300);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: colors.inputBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '10px',
                                    color: colors.text,
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                    transition: 'border-color 0.3s'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Guide Section */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        marginBottom: '24px'
                    }}>
                    <button
                        style={{
                            width: '100%',
                            padding: '16px 20px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => setShowGuide(!showGuide)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                            <BookOutlined style={{ fontSize: 18, color: colors.main }} />
                            <span
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: colors.text
                                }}>
                                Quick Deployment Guide
                            </span>
                        </div>
                        <span
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                transform: showGuide ? 'rotate(180deg)' : 'rotate(0)',
                                transition: 'transform 0.3s'
                            }}>
                            ▼
                        </span>
                    </button>

                    {showGuide && (
                        <div
                            style={{
                                padding: '0 20px 20px',
                                borderTop: `1px solid ${colors.containerBorder}`
                            }}>
                            <div style={{ marginTop: '16px' }}>
                                {[
                                    {
                                        icon: <GithubOutlined />,
                                        title: 'Clone the Template',
                                        code: 'git clone https://github.com/btc-vision/OP_20.git',
                                        desc: 'Start with the official OP_20 template repository'
                                    },
                                    {
                                        icon: <ToolOutlined />,
                                        title: 'Configure Your Token',
                                        code: 'src/contracts/MyToken.ts',
                                        desc: 'Set maxSupply, decimals, name, and symbol'
                                    },
                                    {
                                        icon: <CodeOutlined />,
                                        title: 'Build the Contract',
                                        code: 'npm install && npm run build',
                                        desc: 'Find MyToken.wasm in the build/ directory'
                                    },
                                    {
                                        icon: <CloudUploadOutlined />,
                                        title: 'Deploy',
                                        desc: 'Upload your .wasm file using this interface'
                                    }
                                ].map((step, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            gap: '12px',
                                            marginBottom: '16px'
                                        }}>
                                        <div
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                background: `${colors.main}15`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                color: colors.main,
                                                fontSize: '16px'
                                            }}>
                                            {step.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    color: colors.text,
                                                    marginBottom: '4px'
                                                }}>
                                                Step {index + 1}: {step.title}
                                            </div>
                                            {step.code && (
                                                <code
                                                    style={{
                                                        display: 'block',
                                                        padding: '6px 8px',
                                                        background: colors.inputBg,
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        color: colors.main,
                                                        marginBottom: '4px',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                    {step.code}
                                                </code>
                                            )}
                                            <div
                                                style={{
                                                    fontSize: '12px',
                                                    color: colors.textFaded,
                                                    lineHeight: '1.4'
                                                }}>
                                                {step.desc}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Deploy Button */}
                <button
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: disabled
                            ? colors.buttonBg
                            : `linear-gradient(135deg, ${colors.main} 0%, ${colors.main}dd 100%)`,
                        border: 'none',
                        borderRadius: '14px',
                        color: disabled ? colors.textFaded : '#fff',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        opacity: disabled ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: disabled ? 'none' : '0 4px 20px rgba(243, 116, 19, 0.3)'
                    }}
                    onClick={triggerDeploy}
                    disabled={disabled}
                    onMouseEnter={(e) => {
                        if (!disabled) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 30px rgba(243, 116, 19, 0.4)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = disabled ? 'none' : '0 4px 20px rgba(243, 116, 19, 0.3)';
                    }}>
                    <RocketOutlined style={{ fontSize: 18 }} />
                    Deploy Contract
                </button>
            </Content>
        </Layout>
    );
}
