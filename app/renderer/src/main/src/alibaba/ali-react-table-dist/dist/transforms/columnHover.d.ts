import { TableTransform } from '../interfaces';
/** @deprecated transform usage outdated, use pipeline to expand tables */
export interface ColumnHoverOptions {
    hoverColor?: string;
    hoverColIndex: number;
    onChangeHoverColIndex(nextColIndex: number): void;
}
/** @deprecated transform usage outdated, use pipeline to expand tables */
export declare function makeColumnHoverTransform({ hoverColor, hoverColIndex, onChangeHoverColIndex, }: ColumnHoverOptions): TableTransform;
/** @deprecated transform usage outdated, use pipeline to expand tables */
export declare function useColumnHoverTransform({ hoverColor, defaultHoverColIndex, }?: {
    hoverColor?: string;
    defaultHoverColIndex?: number;
}): TableTransform;
