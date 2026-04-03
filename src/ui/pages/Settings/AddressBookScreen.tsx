import { useCallback, useEffect, useState } from 'react';

import { ContactBookItem } from '@/background/service/contactBook';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { isValidAddress, useWallet } from '@/ui/utils';
import {
    BookOutlined,
    CloseOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SearchOutlined,
    UserOutlined
} from '@ant-design/icons';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

interface EditState {
    visible: boolean;
    mode: 'add' | 'edit';
    name: string;
    address: string;
    originalAddress?: string;
}

export default function AddressBookScreen() {
    const wallet = useWallet();
    const tools = useTools();

    const [contacts, setContacts] = useState<ContactBookItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editState, setEditState] = useState<EditState>({
        visible: false,
        mode: 'add',
        name: '',
        address: ''
    });
    const [editError, setEditError] = useState('');

    const loadContacts = useCallback(async () => {
        setLoading(true);
        try {
            const list = await wallet.listContact(false);
            setContacts(list);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [wallet]);

    useEffect(() => {
        void loadContacts();
    }, [loadContacts]);

    const filtered = contacts.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
    });

    const handleSave = async () => {
        setEditError('');
        const name = editState.name.trim();
        const address = editState.address.trim();

        if (!name) {
            setEditError('Name is required');
            return;
        }
        if (!address) {
            setEditError('Address is required');
            return;
        }
        if (!isValidAddress(address)) {
            setEditError('Invalid Bitcoin address');
            return;
        }

        try {
            await wallet.addContact({ name, address, isAlias: false, isContact: true });
            if (editState.mode === 'edit' && editState.originalAddress && editState.originalAddress !== address) {
                await wallet.removeContact(editState.originalAddress);
            }
            setEditState({ visible: false, mode: 'add', name: '', address: '' });
            tools.toastSuccess(editState.mode === 'add' ? 'Contact added' : 'Contact updated');
            await loadContacts();
        } catch {
            setEditError('Failed to save contact');
        }
    };

    const [pendingDelete, setPendingDelete] = useState<string | null>(null);

    const handleDelete = async (address: string) => {
        try {
            await wallet.removeContact(address);
            tools.toastSuccess('Contact removed');
            setPendingDelete(null);
            await loadContacts();
        } catch {
            tools.toastError('Failed to remove contact');
        }
    };

    const handleCopy = (address: string) => {
        void navigator.clipboard.writeText(address);
        tools.toastSuccess('Address copied');
    };

    return (
        <Layout>
            <Header
                onBack={() => window.history.go(-1)}
                title="Address Book"
            />
            <Content style={{ padding: 12, overflowY: 'auto' }}>
                {/* Search + Add */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: colors.inputBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: 8,
                            padding: '0 10px'
                        }}>
                        <SearchOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: colors.text,
                                fontSize: 13,
                                padding: '10px 0'
                            }}
                        />
                    </div>
                    <button
                        onClick={() =>
                            setEditState({ visible: true, mode: 'add', name: '', address: '' })
                        }
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '0 12px',
                            background: colors.main,
                            border: 'none',
                            borderRadius: 8,
                            color: colors.background,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}>
                        <PlusOutlined style={{ fontSize: 12 }} />
                        Add
                    </button>
                </div>

                {/* Contact List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: colors.textFaded, fontSize: 13 }}>
                        Loading...
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 40,
                            color: colors.textFaded
                        }}>
                        <BookOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        <div style={{ fontSize: 13 }}>
                            {search ? 'No contacts match your search' : 'No saved contacts yet'}
                        </div>
                        {!search && (
                            <div style={{ fontSize: 11, marginTop: 4 }}>
                                Tap + Add to save your first address
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: 12,
                            overflow: 'hidden'
                        }}>
                        {filtered.map((contact, index) => (
                            <div
                                key={contact.address}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 12,
                                    borderBottom:
                                        index < filtered.length - 1
                                            ? `1px solid ${colors.containerBorder}`
                                            : 'none',
                                    gap: 10
                                }}>
                                {/* Avatar */}
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: colors.buttonHoverBg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                    <UserOutlined style={{ fontSize: 16, color: colors.main }} />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: colors.text,
                                            marginBottom: 2
                                        }}>
                                        {contact.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: colors.textFaded,
                                            fontFamily: 'monospace',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                        {contact.address}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={() => handleCopy(contact.address)}
                                        title="Copy address"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            background: colors.buttonHoverBg,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setEditState({
                                                visible: true,
                                                mode: 'edit',
                                                name: contact.name,
                                                address: contact.address,
                                                originalAddress: contact.address
                                            })
                                        }
                                        title="Edit"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            background: colors.buttonHoverBg,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        <EditOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                    {pendingDelete === contact.address ? (
                                        <>
                                            <button
                                                onClick={() => void handleDelete(contact.address)}
                                                title="Confirm delete"
                                                style={{
                                                    height: 28,
                                                    padding: '0 8px',
                                                    borderRadius: 6,
                                                    background: colors.error,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: '#fff'
                                                }}>
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setPendingDelete(null)}
                                                title="Cancel"
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    background: colors.buttonHoverBg,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                <CloseOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setPendingDelete(contact.address)}
                                            title="Delete"
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 6,
                                                background: `${colors.error}15`,
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                            <DeleteOutlined style={{ fontSize: 12, color: colors.error }} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Content>

            {/* Add/Edit Modal */}
            {editState.visible && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        zIndex: 1000
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setEditState({ visible: false, mode: 'add', name: '', address: '' });
                            setEditError('');
                        }
                    }}>
                    <div
                        style={{
                            width: '100%',
                            background: colors.background,
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                            padding: 16
                        }}>
                        {/* Modal Header */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16
                            }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                                {editState.mode === 'add' ? 'Add Contact' : 'Edit Contact'}
                            </span>
                            <button
                                onClick={() => {
                                    setEditState({ visible: false, mode: 'add', name: '', address: '' });
                                    setEditError('');
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 4
                                }}>
                                <CloseOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                            </button>
                        </div>

                        {/* Name Input */}
                        <div style={{ marginBottom: 12 }}>
                            <label
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: 6,
                                    display: 'block'
                                }}>
                                Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Alice"
                                value={editState.name}
                                onChange={(e) =>
                                    setEditState((s) => ({ ...s, name: e.target.value }))
                                }
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    background: colors.inputBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: 8,
                                    color: colors.text,
                                    fontSize: 13,
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Address Input */}
                        <div style={{ marginBottom: 12 }}>
                            <label
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: 6,
                                    display: 'block'
                                }}>
                                Address
                            </label>
                            <input
                                type="text"
                                placeholder="bc1q..."
                                value={editState.address}
                                onChange={(e) =>
                                    setEditState((s) => ({ ...s, address: e.target.value }))
                                }
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    background: colors.inputBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: 8,
                                    color: colors.text,
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Error */}
                        {editError && (
                            <div
                                style={{
                                    marginBottom: 12,
                                    padding: 6,
                                    background: `${colors.error}15`,
                                    borderRadius: 6,
                                    textAlign: 'center'
                                }}>
                                <span style={{ fontSize: 11, color: colors.error }}>{editError}</span>
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={() => void handleSave()}
                            style={{
                                width: '100%',
                                padding: 12,
                                background: colors.main,
                                border: 'none',
                                borderRadius: 10,
                                color: colors.background,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}>
                            {editState.mode === 'add' ? 'Add Contact' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
