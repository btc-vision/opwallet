import { EventEmitter } from 'events';

export class Observable<T = unknown> extends EventEmitter {
    private value: T;

    constructor(value: T) {
        super();
        this.value = value;
    }

    /**
     * The subscribe method allows for subscribing to changes in the observable value
     * @param fn a function to be called when the observable changes
     * @returns a function that can be called to unsubscribe
     */
    public subscribe = (fn: () => void) => {
        this.on('change', fn);
        return () => {
            this.off('change', fn);
        };
    };

    /**
     * This method allows for the getting of a snapshot of the current value
     */
    public getSnapshot = () => {
        return this.value;
    };

    /**
     * This method allows for the updating of the observable value
     * @param value The new value to update the observable to
     */
    public update = (value: T) => {
        this.value = value;
        this.emit('change');
    };
}
