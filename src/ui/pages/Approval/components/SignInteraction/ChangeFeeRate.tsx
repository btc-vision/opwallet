import { CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { Button, Column, Input, Row, Text } from '@/ui/components';
import { BottomModal } from '@/ui/components/BottomModal';

export const ChangeFeeRate = ({
    onClose,
    setting,
    setSetting
}: {
    onClose: () => void;
    setting: string;
    setSetting: (newFeeRate: number) => void;
}) => {
    const [tempSetting, setTempSetting] = useState<string>(setting);

    return (
        <BottomModal onClose={onClose}>
            <Column justifyCenter itemsCenter>
                <Row justifyBetween itemsCenter style={{ height: 20 }} fullX>
                    <Row />
                    <Text text="Change Fee Rate" textCenter size="md" />
                    <Row onClick={onClose}>
                        <CloseOutlined />
                    </Row>
                </Row>

                <Column mt="lg" style={{ width: '100%', marginBottom: '20px' }}>
                    <Text text="Fee rate" preset="regular" color="textDim" />
                    <Input
                        preset="text"
                        value={tempSetting}
                        onChange={(e) => {
                            setTempSetting(e.target.value);
                        }}
                        autoFocus
                    />
                </Column>
            </Column>

            <Button
                disabled={false}
                preset="primary"
                text="Save"
                onClick={() => {
                    const temp = Number(tempSetting);

                    if (isNaN(temp) || temp <= 0) {
                        return;
                    }

                    setSetting(temp);
                    onClose();
                }}
            />
        </BottomModal>
    );
};
