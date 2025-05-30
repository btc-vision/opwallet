import { useMemo } from 'react';

import { ChainType } from '@/shared/constant';
import { Row, Text } from '@/ui/components';
import { useBTCUnit, useChainType } from '@/ui/state/settings/hooks';

export function BtcDisplay({ balance }: { balance: string | number }) {
    const chainType = useChainType();
    const btcUnit = useBTCUnit();

    const { intPart, decPart } = useMemo(() => {
        const [int, dec] = Number(balance).toFixed(8).split('.');

        const trimmedDec = dec.replace(/0+$/, '');

        return {
            intPart: int,
            decPart: trimmedDec
        };
    }, [balance]);

    if (chainType === ChainType.FRACTAL_BITCOIN_MAINNET || ChainType.FRACTAL_BITCOIN_TESTNET) {
        //   show 3 decimal places for fractal bitcoin
        return (
            <Row style={{ alignItems: 'flex-end', marginBottom: '10px' }} justifyCenter gap={'zero'}>
                <Text text={intPart} preset="title-bold" size="xxxl" />
                {decPart && (
                    <Text
                        text={'.' + decPart}
                        preset="title-bold"
                        style={{
                            color: '#8a8a8a',
                            fontSize: 28
                        }}
                    />
                )}
                <Text text={btcUnit} preset="title-bold" size="xxxl" style={{ marginLeft: '0.25em' }} />
            </Row>
        );
    }

    return <Text text={`${balance} ${btcUnit}`} preset="title-bold" textCenter size="xxxl" my="sm" />;
}
