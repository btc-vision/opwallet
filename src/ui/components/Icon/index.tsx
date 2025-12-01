import React, { CSSProperties } from 'react';

import { colors, ColorTypes } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';

export enum svgRegistry {
    history = './images/icons/clock-solid.svg',
    send = './images/icons/arrow-left-right.svg',
    receive = './images/icons/qrcode.svg',

    right = './images/icons/right.svg',
    left = './images/icons/arrow-left.svg',
    down = './images/icons/down.svg',
    up = './images/icons/up.svg',
    link = './images/icons/arrow-up-right.svg',

    discord = './images/icons/discord.svg',
    twitter = './images/icons/twitter.svg',
    github = './images/icons/github.svg',
    telegram = './images/icons/telegram.svg',

    btc = './images/icons/btc.svg',
    qrcode = './images/icons/qrcode.svg',

    user = '/images/icons/user-solid.svg',
    wallet = '/images/icons/wallet-solid.svg',
    compass = './images/icons/compass-solid.svg',
    settings = './images/icons/gear-solid.svg',
    grid = './images/icons/grid-solid.svg',

    delete = '/images/icons/delete.svg',
    success = '/images/icons/success.svg',
    check = '/images/icons/check.svg',
    eye = '/images/icons/eye.svg',
    'eye-slash' = '/images/icons/eye-slash.svg',
    copy = './images/icons/copy-solid.svg',
    close = './images/icons/xmark.svg',

    'circle-check' = '/images/icons/circle-check.svg',
    pencil = '/images/icons/pencil.svg',
    'circle-info' = '/images/icons/circle-info.svg',
    bitcoin = './images/icons/bitcoin.svg',
    'circle-question' = '/images/icons/circle-question.svg',
    split = '/images/icons/scissors.svg',
    info = '/images/icons/info.svg',
    warning = '/images/icons/warning.svg',
    alert = '/images/icons/alert.svg',
    burn = '/images/icons/burn.svg',
    risk = '/images/icons/risk.svg',
    swap = '/images/icons/swap.svg',
    faucet = '/images/icons/faucet.svg',

    overview = '/images/icons/overview.svg'
}

const iconImgList: IconTypes[] = ['success', 'delete', 'btc'];

export type IconTypes = keyof typeof svgRegistry;

// Type guard to check if a string is a valid icon type
function isIconType(value: string): value is IconTypes {
    return value in svgRegistry;
}

// Type guard to check if a string is a custom path
function isCustomPath(value: string): boolean {
    return value.startsWith('./');
}

export type ValidIconType = IconTypes | (string & {}) | React.ReactElement;

interface IconProps {
    /**
     * The name of the icon (from registry), a custom path starting with './', or a React element
     */
    icon?: ValidIconType;

    /**
     * An optional tint color for the icon
     */
    color?: ColorTypes;

    /**
     * An optional size for the icon..
     */
    size?: number | string;

    /**
     * Style overrides for the icon image
     */
    style?: CSSProperties;

    /**
     * Style overrides for the icon container
     */
    containerStyle?: CSSProperties;

    /**
     * An optional function to be called when the icon is clicked
     */
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    children?: React.ReactNode;
}

// Image component for displaying icons that are image files
interface ImageProps {
    src: string;
    size?: number | string;
    style?: CSSProperties;
}

export function Image({ src, size = 24, style }: ImageProps) {
    return (
        <img
            src={src}
            alt=""
            style={{
                width: size,
                height: size,
                ...style
            }}
        />
    );
}

export function Icon(props: IconProps) {
    const {
        icon,
        color,
        size,
        style: $imageStyleOverride,
        containerStyle: $containerStyleOverride,
        onClick,
        children
    } = props;

    // If no icon prop is provided, render children in a container
    if (!icon) {
        return (
            <div
                onClick={onClick}
                style={
                    Object.assign(
                        {},
                        {
                            color: color ? colors[color] : '#FFF',
                            fontSize: size ?? fontSizes.icon,
                            display: 'flex'
                        } as CSSProperties,
                        $containerStyleOverride,
                        $imageStyleOverride ?? {},
                        onClick ? { cursor: 'pointer' } : {}
                    ) as CSSProperties
                }>
                {children}
            </div>
        );
    }

    // Handle React element icons
    if (React.isValidElement(icon)) {
        return (
            <div
                onClick={onClick}
                style={Object.assign({}, $containerStyleOverride, onClick ? { cursor: 'pointer' } : {})}>
                {icon}
            </div>
        );
    }

    // Handle custom icon path passed directly
    if (typeof icon === 'string' && isCustomPath(icon)) {
        return (
            <Image
                src={icon}
                size={size ?? fontSizes.icon}
                style={Object.assign({}, $containerStyleOverride, $imageStyleOverride)}
            />
        );
    }

    // Handle registry icons
    if (typeof icon === 'string' && isIconType(icon)) {
        const iconPath = svgRegistry[icon];

        // Check if this icon should be rendered as an img tag
        if (iconImgList.includes(icon)) {
            return (
                <img
                    src={iconPath}
                    alt=""
                    style={Object.assign({}, $containerStyleOverride, {
                        width: size ?? fontSizes.icon,
                        height: size ?? fontSizes.icon
                    })}
                />
            );
        }

        // Render as masked div for color customization
        return (
            <div style={$containerStyleOverride}>
                <div
                    onClick={onClick}
                    style={Object.assign(
                        {},
                        {
                            color: color ? colors[color] : '#FFF',
                            width: size ?? fontSizes.icon,
                            height: size ?? fontSizes.icon,
                            backgroundColor: color ? colors[color] : '#FFF',
                            maskImage: `url(${iconPath})`,
                            maskSize: 'cover',
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            WebkitMaskImage: `url(${iconPath})`,
                            WebkitMaskSize: 'cover',
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center'
                        },
                        $imageStyleOverride ?? {},
                        onClick ? { cursor: 'pointer' } : {}
                    )}
                />
            </div>
        );
    }

    // If we get here, the icon prop is invalid
    console.warn(`Invalid icon prop: ${icon}`);
    return <div />;
}
