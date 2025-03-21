import { EventEmitter } from 'events';

import { IS_WINDOWS } from '@/shared/constant';

import {
    browserWindowsCreate,
    browserWindowsGetCurrent,
    browserWindowsOnFocusChanged,
    browserWindowsOnRemoved,
    browserWindowsRemove,
    browserWindowsUpdate,
    WindowProps
} from './browser';

const event = new EventEmitter();

browserWindowsOnFocusChanged((winId) => {
    event.emit('windowFocusChange', winId);
});

browserWindowsOnRemoved((winId) => {
    event.emit('windowRemoved', winId);
});

const BROWSER_HEADER = 80;
const WINDOW_SIZE = {
    width: 400 + (IS_WINDOWS ? 14 : 0), // idk why windows cut the width.
    height: 600
};

const create = async ({ url, ...rest }: WindowProps): Promise<number | undefined> => {
    const {
        top: cTop,
        left: cLeft,
        width
    } = await browserWindowsGetCurrent() as { top: number, left: number, width: number };

    const top = cTop + BROWSER_HEADER;
    const left = cLeft + width - WINDOW_SIZE.width;

    const currentWindow = await browserWindowsGetCurrent();
    let win;
    if (currentWindow.state === 'fullscreen') {
        // browser.windows.create not pass state to chrome
        win = await browserWindowsCreate({
            focused: true,
            url,
            type: 'popup',
            ...rest,
            width: undefined,
            height: undefined,
            left: undefined,
            top: undefined,
            state: 'fullscreen'
        });
    } else {
        win = await browserWindowsCreate({
            focused: true,
            url,
            type: 'popup',
            top,
            left,
            ...WINDOW_SIZE,
            ...rest
        });
    }

    if (win?.id === undefined) {
        throw new Error('Failed to create window or retrieve window id');
    }

    // shim firefox
    if (win.left !== left) {
        await browserWindowsUpdate(win.id, { left, top });
    }

    return win.id;
};

const remove = async (winId: number) => {
    return browserWindowsRemove(winId);
};

const openNotification = ({ route = '', ...rest }: WindowProps = {}): Promise<number | undefined> => {
    const url = `notification.html${route && `#${route}`}`;

    return create({ url, ...rest });
};

export default {
    openNotification,
    event,
    remove
};
