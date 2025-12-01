import browser from '../webapi/browser';

export interface ContactBookItem {
    name: string;
    address: string;
    isAlias: boolean;
    isContact: boolean;
}

export interface UIContactBookItem {
    name: string;
    address: string;
}

export type ContactBookStore = Record<string, ContactBookItem | undefined>;

class ContactBook {
    store!: ContactBookStore;

    init = async () => {
        const data = await browser.storage.local.get('contactBook');
        const saved = data.contactBook as ContactBookStore | undefined;

        this.store = saved ? saved : ({} as ContactBookStore);

        if (!saved) {
            this.persist();
        }
    };

    getContactByAddress = (address: string) => {
        return this.store[address.toLowerCase()];
    };

    removeContact = (address: string) => {
        const key = address.toLowerCase();
        if (!this.store[key]) return;
        if (this.store[key]?.isAlias) {
            this.store[key] = Object.assign({}, this.store[key], {
                isContact: false
            });
        } else {
            // Since we're already checking if the key exists, we can disable this eslint error
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.store[key];
        }
        this.persist();
    };

    updateContact = (data: ContactBookItem) => {
        if (this.store[data.address.toLowerCase()]) {
            this.store[data.address.toLowerCase()] = Object.assign({}, this.store[data.address.toLowerCase()], {
                name: data.name,
                address: data.address,
                isContact: true
            });
        } else {
            this.store[data.address.toLowerCase()] = {
                name: data.name,
                address: data.address,
                isContact: true,
                isAlias: false
            };
        }
        this.persist();
    };

    addContact = this.updateContact;

    listContacts = (): ContactBookItem[] => {
        const list = Object.values(this.store);
        return list.filter((item): item is ContactBookItem => !!item?.isContact) || [];
    };

    listAlias = () => {
        return Object.values(this.store)
            .filter((item) => item?.isAlias)
            .filter((item) => !!item);
    };

    updateAlias = (data: { address: string; name: string }) => {
        const key = data.address.toLowerCase();
        if (this.store[key]) {
            this.store[key] = Object.assign({}, this.store[key], {
                name: data.name,
                address: data.address,
                isAlias: true
            });
        } else {
            this.store[key] = {
                name: data.name,
                address: data.address,
                isAlias: true,
                isContact: false
            };
        }
        this.persist();
    };

    addAlias = this.updateAlias;

    removeAlias = (address: string) => {
        const key = address.toLowerCase();
        if (!this.store[key]) return;
        if (this.store[key].isContact) {
            this.store[key] = Object.assign({}, this.store[key], {
                isAlias: false
            });
        } else {
            // Since we're already checking if the key exists, we can disable this eslint error
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.store[key];
        }
        this.persist();
    };

    getContactsByMap = () => {
        const res = Object.values(this.store)
            .filter((item): item is ContactBookItem => item?.isContact === true)
            .reduce(
                (res, item) => ({
                    ...res,
                    [item.address.toLowerCase()]: item
                }),
                {}
            );
        return res;
    };

    private persist = () => {
        browser.storage.local.set({ contactBook: this.store });
    };
}

export default new ContactBook();
