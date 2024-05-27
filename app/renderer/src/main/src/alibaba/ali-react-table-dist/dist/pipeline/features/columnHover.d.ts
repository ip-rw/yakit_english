import { TablePipeline } from '../pipeline';
export interface ColumnHoverFeatureOptions {
    /** Hover color, defaults to 'var(--hover-bgcolor)' */
    hoverColor?: string;
    /** Uncontrolled: Default colIndex */
    defaultHoverColIndex?: number;
    /** Controlled: Current hovered column index (colIndex) */
    hoverColIndex?: number;
    /** Controlled: Callback on colIndex change */
    onChangeHoverColIndex?(nextColIndex: number): void;
}
export declare function columnHover(opts?: ColumnHoverFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
