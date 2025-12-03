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
            <>
                <Row style={{ alignItems: 'flex-end', marginBottom: '3px' }} justifyCenter gap={'zero'}>
                    <span
                        style={{
                            background: 'linear-gradient(180deg, #e4e6eb, #f7931a)', // pick your gradient
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: 30,
                            fontWeight: 'bold'
                        }}>
                        {intPart}
                    </span>
                    {decPart && (
                        <span
                            style={{
                                background: 'linear-gradient(180deg, #e4e6eb, #f7931a)', // pick your gradient
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontSize: 30,
                                fontWeight: 'bold'
                            }}>
                            {'.' + decPart}
                        </span>
                    )}
                    <span
                        style={{
                            background: 'linear-gradient(180deg, #e4e6eb, #f7931a)', // pick your gradient
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: 30,
                            fontWeight: 'bold',
                            marginLeft: '0.25em'
                        }}>
                        {btcUnit}
                    </span>
                </Row>
            </>
        );
    }

    return <Text text={`${balance} ${btcUnit}`} preset="title-bold" textCenter size="xxxl" my="sm" />;
}
