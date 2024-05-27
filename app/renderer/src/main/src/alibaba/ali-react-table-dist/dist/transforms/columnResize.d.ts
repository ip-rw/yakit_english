import { TableTransform } from '../interfaces';
/** @Deprecated Transform, use Pipeline for Expansion */
export interface ColumnResizeOptions {
    /** Col Width */
    sizes: number[];
    /** Width Change Callback */
    onChangeSizes(nextSizes: number[]): void;
    /** Col Min Width, default 40 */
    minSize?: number;
    /** Col Max Width, default Infinity */
    maxSize?: number;
    /** Append Flex Col at End, default false */
    appendExpander?: boolean;
    /** Disable User-Select on Resize, default false */
    disableUserSelectWhenResizing?: boolean;
    /** Flex Col Style.Visibility */
    expanderVisibility?: 'visible' | 'hidden';
}
/** @Deprecated Transform, use Pipeline for Expansion */
export declare function makeColumnResizeTransform({ sizes, onChangeSizes, minSize, maxSize, appendExpander, expanderVisibility, disableUserSelectWhenResizing, }: ColumnResizeOptions): TableTransform;
/** @Deprecated Transform, use Pipeline for Expansion */
export declare function useColumnResizeTransform({ defaultSizes, ...others }: Omit<ColumnResizeOptions, 'sizes' | 'onChangeSizes'> & {
    defaultSizes: number[];
}): TableTransform;
