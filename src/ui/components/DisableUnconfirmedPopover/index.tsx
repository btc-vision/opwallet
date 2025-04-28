import { Button, Column, Image, Row, Text } from '@/ui/components';
import { Popover } from '../Popover';

export const DisableUnconfirmedsPopover = ({ onClose }: { onClose: () => void }) => (
    <Popover
        style={{
            padding: 24,
            borderRadius: 12,
            background: 'rgba(255,140,0,0.07)',
            border: '1px solid #FFA640',
            maxWidth: 380
        }}>
        <Column gap="lg" itemsCenter>
            {/* headline */}
            <Row itemsCenter gap="sm">
                <Image src="./images/artifacts/security.png" size={42} />
                <Text text="Heads-Up!" color="gold" size="xl" preset="bold" />
            </Row>

            {/* body copy */}
            <Text
                text="For your safety, OP_WALLET will never touch UTXOs below 10 000 sats. Dust-sized
              outputs—often holding Ordinals, Runes, or BRC-20 inscriptions—stay exactly where
              they are."
                size="sm"
                textCenter
                style={{ lineHeight: 1.4 }}
            />

            <Text
                text="Need those sats later? Simply consolidate them into a larger UTXO first."
                size="xs"
                color="textDim"
                textCenter
                style={{ marginTop: 4 }}
            />

            {/* action */}
            <Button
                text="Got it"
                full
                preset="defaultV2"
                onClick={onClose}
                style={{ marginTop: 12, background: '#FFA640', color: '#000' }}
            />
        </Column>
    </Popover>
);
