import { HoverRange, TableTransform } from '../interfaces';
/** @deprecated transform usage outdated, use pipeline to expand tables */
export interface ColumnRangeHoverOptions {
    hoverColor?: string;
    headerHoverColor?: string;
    hoverRange: HoverRange;
    onChangeHoverRange(nextColIndexRange: HoverRange): void;
}
/** @deprecated transform usage outdated, use pipeline to expand tables */
export declare function makeColumnRangeHoverTransform({ hoverColor, headerHoverColor, hoverRange, onChangeHoverRange, }: ColumnRangeHoverOptions): TableTransform;
/** @deprecated transform usage outdated, use pipeline to expand tables */
export declare function useColumnHoverRangeTransform({ hoverColor, headerHoverColor, defaultHoverRange, }?: Omit<ColumnRangeHoverOptions, 'hoverRange' | 'onChangeHoverRange'> & {
    defaultHoverRange?: HoverRange;
}): TableTransform;
