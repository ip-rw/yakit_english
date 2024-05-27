import React, { ReactNode } from 'react';
import { TablePipeline } from '../pipeline';
export interface RowDetailFeatureOptions {
    /** Uncontrolled: Default Expand All Detail Cells */
    defaultOpenAll?: boolean;
    /** Uncontrolled: Default Expanded Keys */
    defaultOpenKeys?: string[];
    /** Controlled: Currently Expanded Keys */
    openKeys?: string[];
    /** Controlled: Callback for openKeys Change */
    onChangeOpenKeys?(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    /** Render Method for Detail Cell */
    renderDetail?(row: any, rowIndex: number): ReactNode;
    /** Includes Detail Cell */
    hasDetail?(row: any, rowIndex: number): ReactNode;
    /** Get Key of Row with Detail Cell, Default to `(row) => row[primaryKey] + '_detail'` */
    getDetailKey?(row: any, rowIndex: number): string;
    /** Extra Styles for Detail Cell (td) */
    detailCellStyle?: React.CSSProperties;
    /** Click Event Response Area */
    clickArea?: 'cell' | 'content' | 'icon';
    /** Toggle Expand on Trigger/Collapse Click Event Calls event.stopPropagation() */
    stopClickEventPropagation?: boolean;
    /** Record Field for Row Metadata */
    rowDetailMetaKey?: string | symbol;
}
export declare function rowDetail(opts?: RowDetailFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
