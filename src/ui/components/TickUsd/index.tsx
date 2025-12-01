import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';

import { TickPriceItem } from '@/shared/types';
import { Row, Text } from '@/ui/components';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { Sizes, TextProps } from '@/ui/components/Text';
import type { ColorTypes } from '@/ui/theme/colors';

function PriceChangePercent({ change, size }: { change: number; size?: Sizes }) {
    if (change === 0) {
        return <Text text={'0%'} color="textDim" size={size} />;
    }

    const changePercent = ((change || 0) * 100).toFixed(2);
    const color = change < 0 ? 'value_down_color' : 'value_up_color';

    return <Text text={`${changePercent}%`} color={color} size={size} />;
}

export function TickPriceChange(props: { price: TickPriceItem | undefined; color?: ColorTypes; size?: Sizes }) {
    const { price, color = 'textDim', size = 'xs' } = props;

    return (
        <Row>
            <BtcUsd sats={price?.curPrice || 0} color={color} size={size} {...props} />
            <PriceChangePercent change={price?.changePercent || 0} size={size} />
        </Row>
    );
}

export function TickUsd(
    props: {
        balance: string;
        price: TickPriceItem | undefined;
        color?: ColorTypes;
        size?: Sizes;
    } & TextProps
) {
    const { balance, price, color = 'textDim', size = 'xs' } = props;

    const sats = useMemo(() => {
        if (!price) return 0;

        return new BigNumber(balance).multipliedBy(price.curPrice).toNumber();
    }, [balance, price]);

    return <BtcUsd sats={sats} color={color} size={size} {...props} />;
}
