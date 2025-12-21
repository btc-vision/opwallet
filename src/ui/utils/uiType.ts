const UI_TYPE = {
    Tab: 'index',
    Pop: 'popup',
    Notification: 'notification'
};

interface UiTypeCheck {
    isTab: boolean;
    isNotification: boolean;
    isPop: boolean;
    [key: string]: boolean;
}

export const getUiType = (): UiTypeCheck => {
    const { pathname } = window.location;
    return Object.entries(UI_TYPE).reduce<UiTypeCheck>(
        (m, [key, value]) => {
            m[`is${key}`] = pathname === `/${value}.html`;
            return m;
        },
        { isNotification: false, isPop: false, isTab: false }
    );
};
