import { Subscription } from 'rxjs';
/** styled-components library version, ali-react-table-dist supports both v3 and v5 */
export declare const STYLED_VERSION: string;
export declare const STYLED_REF_PROP: string;
export declare const OVERSCAN_SIZE = 100;
export declare const AUTO_VIRTUAL_THRESHOLD = 100;
export declare function sum(arr: number[]): number;
export declare const throttledWindowResize$: import("rxjs").Observable<Event>;
export declare function getScrollbarSize(): {
    width: number;
    height: number;
};
/** Sync scrollLeft among multiple elements, callback is invoked whenever scrollLeft changes */
export declare function syncScrollLeft(elements: HTMLElement[], callback: (scrollLeft: number) => void): Subscription;
/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export declare function shallowEqual<T>(objA: T, objB: T): boolean;
