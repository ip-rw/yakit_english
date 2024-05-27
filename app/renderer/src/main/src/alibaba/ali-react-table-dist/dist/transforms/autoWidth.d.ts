import React from 'react';
import { BaseTable } from '../base-table';
import { TableTransform } from '../interfaces';
/** Adaptive Col Width
 *
 * @deprecated transform usage obsolete, use pipeline for table expansion
 *
 * @param tableRef Ref to BaseTable
 * @param options Parameters
 * @param deps Deps array for resizing cols, useAutoWidthTransform sets col width based on actual cell content width upon deps change
 *
 * options description：
 * - options.appendExpander Add expander at end of cols?
 * - options.expanderVisibility set to `'hidden'` Hideable expander cols
 * - options.wrapperStyle Style for div.auto-width-wrapper in cells
 * - options.initColumnWidth Adaptive initial col width
 *
 * Note useAutoWidth-transform follows React hooks conventions
 * */
export declare function useAutoWidthTransform(tableRef: React.MutableRefObject<BaseTable>, options?: {
    wrapperStyle?: React.CSSProperties;
    initColumnWidth?: number;
    appendExpander?: boolean;
    expanderVisibility?: 'visible' | 'hidden';
}, deps?: any[]): TableTransform;
