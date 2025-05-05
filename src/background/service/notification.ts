import Events from 'events';

import { winMgr } from '@/background/webapi';
import { IS_CHROME, IS_LINUX } from '@/shared/constant';
import { providerErrors, rpcErrors } from '@/shared/lib/bitcoin-rpc-errors/errors';
import { Approval, ApprovalData, ApprovalResponse } from '@/shared/types/Approval';
import { InteractionParametersWithoutSigner } from '@btc-vision/transaction';
import browser, { WindowProps } from '../webapi/browser';

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
    approval: Approval | null = null;
    interactionParametersToUse: InteractionParametersWithoutSigner | undefined = undefined;
    notifiWindowId = 0;
    isLocked = false;

    constructor() {
        super();

        winMgr.event.on('windowRemoved', async (winId: number) => {
            if (winId === this.notifiWindowId) {
                this.notifiWindowId = 0;
                await this.rejectApproval();
            }
        });

        winMgr.event.on('windowFocusChange', (winId: number) => {
            if (this.notifiWindowId && winId !== this.notifiWindowId) {
                if (IS_CHROME && winId === browser.windows.WINDOW_ID_NONE && IS_LINUX) {
                    // Wired issue: When notification popuped, will focus to -1 first then focus on notification
                    return;
                }
                // this.rejectApproval();
            }
        });
    }

    getApproval = () => this.approval?.data;

    getApprovalInteractionParametersToUse = () => this.interactionParametersToUse;

    clearApprovalInteractionParametersToUse = () => {
        this.interactionParametersToUse = undefined;
    };

    resolveApproval = (
        data?: ApprovalResponse,
        interactionParametersToUse?: InteractionParametersWithoutSigner,
        forceReject = false
    ) => {
        if (forceReject) {
            this.approval?.reject(providerErrors.userRejectedRequest());
        } else {
            this.interactionParametersToUse = interactionParametersToUse;
            this.approval?.resolve(data);
        }
        this.approval = null;
        this.emit('resolve', data);
    };

    rejectApproval = async (err?: string, stay = false, isInternal = false) => {
        if (!this.approval) return;
        if (isInternal) {
            this.approval?.reject(rpcErrors.internal({ message: err }));
        } else {
            this.approval?.reject(providerErrors.userRejectedRequest({ message: err }));
        }

        await this.clear(stay);
        this.emit('reject', err);
    };

    // currently it only support one approval at the same time
    requestApproval = async (data: ApprovalData, winProps?: WindowProps): Promise<ApprovalResponse | undefined> => {
        // We will just override the existing open approval with the new one coming in
        return new Promise(async (resolve, reject) => {
            this.approval = {
                data,
                resolve,
                reject
            };

            await this.openNotification(winProps);
        });
    };

    clear = async (stay = false) => {
        this.approval = null;
        if (this.notifiWindowId && !stay) {
            await winMgr.remove(this.notifiWindowId);
            this.notifiWindowId = 0;
        }
    };

    unLock = () => {
        this.isLocked = false;
    };

    lock = () => {
        this.isLocked = true;
    };

    openNotification = async (winProps?: WindowProps) => {
        // if (this.isLocked) return;
        // this.lock();
        if (this.notifiWindowId) {
            await winMgr.remove(this.notifiWindowId);
            this.notifiWindowId = 0;
        }

        winMgr.openNotification(winProps).then((winId: number | undefined) => {
            if (typeof winId === 'number') {
                this.notifiWindowId = winId;
            }
        });
    };
}

export default new NotificationService();
