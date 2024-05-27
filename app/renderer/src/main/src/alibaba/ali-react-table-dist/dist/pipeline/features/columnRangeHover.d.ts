import { HoverRange } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface ColumnRangeHoverFeatureOptions {
    /** Cell bg color on hover, default: 'var(--hover-bgcolor)' */
    hoverColor?: string;
    /** Header bg color on hover, default: 'var(--header-hover-bgcolor)' */
    headerHoverColor?: string;
    /** Uncontrolled: Default hover area */
    defaultHoverRange?: HoverRange;
    /** Controlled: Current hover area */
    hoverRange?: HoverRange;
    /** Controlled: Hover render change callback */
    onChangeHoverRange?(nextColIndexRange: HoverRange): void;
}
export declare function columnRangeHover(opts?: ColumnRangeHoverFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
