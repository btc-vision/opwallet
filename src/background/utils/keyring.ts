import { KEYRING_TYPE } from "@/shared/constant";
import { HdKeyring, SimpleKeyring } from "@btc-vision/wallet-sdk";
import { Keyring } from "../service/keyring";

export function isHDKeyring(keyring: Keyring | { type: string }): keyring is HdKeyring {
    return keyring.type === KEYRING_TYPE.HdKeyring;
}

export function isSimpleKeyring(keyring: Keyring | { type: string }): keyring is SimpleKeyring {
    return keyring.type === KEYRING_TYPE.SimpleKeyring;
}
