import React, { ReactNode } from 'react';
import { ArtColumn, SortItem, SortOrder } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface SortHeaderCellProps {
    /** Params for makeSortTransform(…) */
    sortOptions: Required<Omit<SortFeatureOptions, 'SortHeaderCell' | 'defaultSorts'>>;
    /** Header's original content before adding sort-related content */
    children: ReactNode;
    /** Current sort */
    sortOrder: SortOrder;
    /** In multi-column sort, sortIndex indicates sort field order. -1 for sortOrder: none */
    sortIndex: number;
    /** Current column config */
    column: ArtColumn;
    /** Sort toggle callback */
    onToggle(e: React.MouseEvent): void;
    /** Click event area */
    clickArea: 'content' | 'icon';
}
export interface SortFeatureOptions {
    /** ((Uncontrolled) Default sort field list */
    defaultSorts?: SortItem[];
    /** ((Controlled) Sort field list */
    sorts?: SortItem[];
    /** Callback to update sort field list */
    onChangeSorts?(nextSorts: SortItem[]): void;
    /** Sort toggle order */
    orders?: SortOrder[];
    /** Sort mode: single or multiple, default: multiple */
    mode?: 'single' | 'multiple';
    /** Custom sort header */
    SortHeaderCell?: React.ComponentType<SortHeaderCellProps>;
    /** Keep dataSource unchanged */
    keepDataSource?: boolean;
    /** Highlight column cells when sort is active */
    highlightColumnWhenActive?: boolean;
    /** Stop propagation for click events triggering onChangeOpenKeys() */
    stopClickEventPropagation?: boolean;
    /** Click event area, default: content */
    clickArea?: 'content' | 'icon';
}
export declare function sort(opts?: SortFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
