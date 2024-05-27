import React, { ReactNode } from 'react';
import { ArtColumn, SortItem, SortOrder, TableTransform } from '../interfaces';
export interface SortHeaderCellProps {
    /** Parameters for makeSortTransform(...) */
    sortOptions: Required<Omit<SortOptions, 'SortHeaderCell'>>;
    /** Pre-sort column header content */
    children: ReactNode;
    /** Current Sort */
    sortOrder: SortOrder;
    /** Sort index for multi-column sort order. Fixed at -1 when sortOrder is none */
    sortIndex: number;
    /** Current column config */
    column: ArtColumn;
    /** Sort change callback */
    onToggle(e: React.MouseEvent): void;
}
export interface SortOptions {
    /** Sort field list */
    sorts: SortItem[];
    /** Update sort field list callback */
    onChangeSorts(nextSorts: SortItem[]): void;
    /** Sort order toggle */
    orders?: SortOrder[];
    /** Sort mode: single or multiple (default multiple) */
    mode?: 'single' | 'multiple';
    /** Custom sort header */
    SortHeaderCell?: React.ComponentType<SortHeaderCellProps>;
    /** Keep dataSource unchanged */
    keepDataSource?: boolean;
    /** Highlight cell on sort active */
    highlightColumnWhenActive?: boolean;
    /** Stop propagation for click events triggering onChangeOpenKeys() */
    stopClickEventPropagation?: boolean;
}
/** @Deprecated Transform, use Pipeline for Expansion */
export declare function makeSortTransform({ sorts: inputSorts, onChangeSorts: inputOnChangeSorts, orders, mode, SortHeaderCell, keepDataSource, highlightColumnWhenActive, stopClickEventPropagation, }: SortOptions): TableTransform;
/** @Deprecated Transform, use Pipeline for Expansion */
export declare function useSortTransform({ defaultSorts, ...others }?: Omit<SortOptions, 'sorts' | 'onChangeSorts'> & {
    defaultSorts?: SortItem[];
}): TableTransform;
