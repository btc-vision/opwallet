// TODO: write documentation for colors and palette in own markdown file and add links from here

const palette = {
    white: '#ffffff',
    white_muted: 'rgba(255, 255, 255, 0.5)',
    black: '#212121',
    black_muted: 'rgba(0, 0, 0, 0.5)',
    black_muted2: 'rgba(0, 0, 0, 0.)',

    dark: '#1E283C',
    grey: '#495361',
    light: '#A2A4AA',

    black_dark: '#212121',

    green_dark2: '#2D7E24',
    green_dark: '#379a29',
    green: '#41B530',
    green_light: '#5ec04f',

    yellow_dark: '#d5ac00',
    yellow: '#ee771b',
    yellow_light: '#fcd226',

    red_dark: '#c92b40',
    red: '#ED334B',
    red_light: '#f05266',

    blue_dark: '#1461d1',
    blue: '#1872F6',
    blue_light: '#c6dcfd',

    orange_dark: '#d9691c',
    orange: '#f37413',
    orange_light: '#ff8f42',

    gold: '#ee771b'
};

export const colors = Object.assign({}, palette, {
    transparent: 'rgba(0, 0, 0, 0)',

    text: palette.white,

    textDim: palette.white_muted,

    background: '#212121',

    error: '#e52937',

    danger: 'rgba(245, 84, 84, 0.90)',

    card: '#212121',
    warning: palette.orange,
    primary: palette.yellow,

    bg2: '#2a2a2a',
    bg3: '#434242',
    bg4: '#383535',

    border: 'rgba(255,255,255,0.1)',

    icon_yellow: '#FFBA33',

    brc20_deploy: '#233933',
    brc20_transfer: '#375e4d',
    brc20_transfer_selected: '#41B530',
    brc20_other: '#3e3e3e',

    value_up_color: '#4DA474',
    value_down_color: '#BF3F4D',

    ticker_color: '#ee771b'
});

export type ColorTypes = keyof typeof colors;
