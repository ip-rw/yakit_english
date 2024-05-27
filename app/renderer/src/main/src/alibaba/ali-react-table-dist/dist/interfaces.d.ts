import React, { ReactNode } from 'react';
export declare type ArtColumnAlign = 'left' | 'center' | 'right';
export declare type CellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
export interface ArtColumnStaticPart {
    /** Column Name */
    name: string;
    /** Field Code in Data */
    code?: string;
    /** Column Display Name; Overrides name field on display */
    title?: ReactNode;
    /** Column Width, mandatory if locked */
    width?: number;
    /** Text or Content Alignment */
    align?: ArtColumnAlign;
    /** @Deprecated Hide */
    hidden?: boolean;
    /** Lock Column */
    lock?: boolean;
    /** Header Cell Props */
    headerCellProps?: CellProps;
    /** Feature Toggle */
    features?: {
        [key: string]: any;
    };
}
export interface ArtColumnDynamicPart {
    /** Custom Fetch Method */
    getValue?(row: any, rowIndex: number): any;
    /** Custom Render Method */
    render?(value: any, row: any, rowIndex: number): ReactNode;
    /** Custom Get Cell Props Method */
    getCellProps?(value: any, row: any, rowIndex: number): CellProps;
    /** Custom Get Cell SpanRect Method */
    getSpanRect?(value: any, row: any, rowIndex: number): SpanRect;
}
export interface ArtColumn extends ArtColumnStaticPart, ArtColumnDynamicPart {
    /** Column's Children */
    children?: ArtColumn[];
}
/** SpanRect for Merged Cells Boundary
 * Note top/left inclusive, bottom/right exclusive */
export interface SpanRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
export interface AbstractTreeNode {
    children?: AbstractTreeNode[];
}
export declare type SortOrder = 'desc' | 'asc' | 'none';
export declare type SortItem = {
    code: string;
    order: SortOrder;
};
export declare type Transform<T> = (input: T) => T;
/** @deprecated transform */
export declare type TableTransform = Transform<{
    columns: ArtColumn[];
    dataSource: any[];
}>;
export interface HoverRange {
    start: number;
    end: number;
}
