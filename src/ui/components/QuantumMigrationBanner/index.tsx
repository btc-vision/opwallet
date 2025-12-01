import { WarningOutlined } from '@ant-design/icons';
import { Column, Row, Text } from '@/ui/components';

export interface QuantumMigrationBannerProps {
    onMigrate: () => void;
}

export function QuantumMigrationBanner({ onMigrate }: QuantumMigrationBannerProps) {
    return (
        <div
            onClick={onMigrate}
            style={{
                background: 'linear-gradient(135deg, rgba(243, 116, 19, 0.15) 0%, rgba(243, 116, 19, 0.08) 100%)',
                border: '1px solid rgba(243, 116, 19, 0.4)',
                borderRadius: '12px',
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}>
            <Row itemsCenter gap="md">
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(243, 116, 19, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                    <WarningOutlined style={{ fontSize: 18, color: '#f37413' }} />
                </div>
                <Column gap="zero" style={{ flex: 1 }}>
                    <Text
                        text="Post-Quantum Migration Required"
                        preset="bold"
                        size="sm"
                        color="warning"
                    />
                    <Text
                        text="Tap to migrate your wallet to quantum-safe keys"
                        preset="sub"
                        size="xs"
                        style={{ opacity: 0.7 }}
                    />
                </Column>
                <div
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#f37413',
                        borderRadius: '8px'
                    }}>
                    <Text text="Migrate" size="xs" preset="bold" style={{ color: '#000' }} />
                </div>
            </Row>
        </div>
    );
}
