import PushEventHandlers from './pushEventHandlers';

let tryCount = 0;
const checkLoaded = (callback: () => void): boolean => {
    tryCount++;
    if (tryCount > 600) {
        // some error happen?
        return false;
    }

    if (document.readyState === 'complete') {
        callback();
        return true;
    } else {
        setTimeout(() => {
            checkLoaded(callback);
        }, 100);
    }

    return false;
};

const domReadyCall = (callback: () => void): void => {
    checkLoaded(callback);

    // if (document.readyState === 'complete') {
    //   callback();
    // } else {
    //   const domContentLoadedHandler = (e) => {
    //     callback();
    //     document.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
    //   };
    //   document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
    // }
};

const $ = (selector: string): Element | null => document.querySelector(selector);

function isPushEventHandlerMethod(instance: PushEventHandlers, event: string): event is keyof PushEventHandlers {
    return typeof instance[event as keyof PushEventHandlers] === 'function';
}

export { $, domReadyCall, isPushEventHandlerMethod };
