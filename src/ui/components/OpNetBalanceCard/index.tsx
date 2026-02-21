import { OPTokenInfo } from '@/shared/types';
import { bigIntToDecimal } from '@/shared/web3/Web3API';
import { fontSizes } from '@/ui/theme/font';
import BigNumber from 'bignumber.js';

import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Image } from '../Image';
import { formatBalanceWithSettings } from '@/ui/pages/OpNet/BigintToString';
import { useDisplaySettings } from '@/ui/state/settings/hooks';

export interface OpNetBalanceCardProps {
    tokenInfo: OPTokenInfo;
    onClick?: () => void;
    handleRemoveToken: (address: string) => void;
}

export default function OpNetBalanceCard(props: OpNetBalanceCardProps) {
    const { tokenInfo, handleRemoveToken, onClick } = props;
    const displaySettings = useDisplaySettings();
    const balance = new BigNumber(bigIntToDecimal(tokenInfo.amount, tokenInfo.divisibility));

    const finalBal = formatBalanceWithSettings(balance, displaySettings, 3);

    return (
        <div
            className="op_token_container"
            onClick={() => {
                onClick?.();
            }}>
            <div className="op_token_col_1">
                <div className="op_token_image">
                    {tokenInfo.logo && <Image src={tokenInfo.logo} size={fontSizes.iconMiddle} />}
                </div>
                <div className="op_token_title">{tokenInfo.symbol}</div>
            </div>
            <div className="op_token_col_2">
                <div className="op_token_balance">
                    {finalBal} {tokenInfo.symbol}
                </div>
                <div
                    className="op_token_remove"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveToken(tokenInfo.address);
                    }}>
                    <FontAwesomeIcon icon={faTrashCan} size="xs" />
                </div>
            </div>
        </div>
    );
}
