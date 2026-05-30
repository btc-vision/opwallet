import { useMemo, useSyncExternalStore } from 'react';
import { Observable } from '@/shared/observable';

interface CacheShape<T> {
    data: T;
    loading: boolean;
    loadingError: string | null;
    refresh: () => Promise<void>;
    count: number;
}

const updateResult = <T>(result: T): T => {
    if (result === undefined || result === null) {
        return result;
    } else if (Array.isArray(result)) {
        return [...result] as T;
    } else if (result instanceof Map) {
        return new Map(result) as T;
    } else if (typeof result === 'object') {
        return { ...result };
    } else {
        return result;
    }
};

let count = 1;
const fetchData = async <T>(init: () => Promise<T>, isRefresh: boolean, observable: Observable<CacheShape<T>>, errorCallback?: (message:string) => void) => {
    const { data, refresh } = observable.getSnapshot();
    count = count + 1;
    observable.update({ loading: true, loadingError: null, data: data, refresh, count });
    try {
        const res = (await init()) as T;
        const result = isRefresh ? updateResult(res) : res;
        observable.update({ loading: false, loadingError: null, data: result, refresh, count });
    } catch (error) {
        const message = (error as Error)?.message || `${error}`;
        observable.update({ loading: false, loadingError: message, data: data, refresh, count });
        console.error("Initialization failed: ", error);
        errorCallback?.(message);
    }
};

export const useInit = <Data>(init: () => Promise<Data>, defaults: Data, errorCallback?: (message:string) => void) => {
    const observable = useMemo(() => {
        const newObservable: Observable<CacheShape<Data>> = new Observable<CacheShape<Data>>({
            loading: false,
            data: defaults,
            loadingError: null,
            refresh: () => fetchData<Data>(init, true, newObservable, errorCallback),
            count
        });
        void fetchData<Data>(init, false, newObservable, errorCallback);
        return newObservable;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [init]);

    return useSyncExternalStore(observable.subscribe, observable.getSnapshot);
};
