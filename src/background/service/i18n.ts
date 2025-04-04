import i18n from 'i18next';

export const fetchLocale = async (locale: string) => {
    const res = await fetch(`./_locales/${locale}/messages.json`);
    const data = (await res.json()) as Record<string, { message: string; description: string }>;
    return Object.keys(data).reduce((res, key) => {
        return {
            ...res,
            [key.replace(/__/g, ' ')]: data[key].message
        };
    }, {});
};

i18n.init({
    fallbackLng: 'en',
    defaultNS: 'translations',
    interpolation: {
        escapeValue: false // react already safes from xss
    }
});

export const I18N_NS = 'translations';

export const addResourceBundle = async (locale: string) => {
    if (i18n.hasResourceBundle(locale, I18N_NS)) return;
    const bundle = await fetchLocale(locale);

    i18n.addResourceBundle(locale, 'translations', bundle);
};

addResourceBundle('en');

i18n.on('languageChanged', function (lng) {
    addResourceBundle(lng);
});

export default i18n;
