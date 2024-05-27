import { TablePipeline } from '../pipeline';
export interface ColumnResizeFeatureOptions {
    /** Uncontrolled: Default width array */
    defaultSizes?: number[];
    /** Controlled: Width array */
    sizes?: number[];
    /** Controlled: Width change callback */
    onChangeSizes?(nextSizes: number[]): void;
    /** Min column width, default 60 */
    minSize?: number;
    /** If no valid width in array, fallbackSize is column width, default 150 */
    fallbackSize?: number;
    /** Max column width, default 1000 */
    maxSize?: number;
    /** Disable user-select on resize, default true */
    disableUserSelectWhenResizing?: boolean;
    /** Handle BG color */
    handleBackground?: string;
    /** Handle BG color on hover */
    handleHoverBackground?: string;
    /** Handle active BG color */
    handleActiveBackground?: string;
}
export declare function columnResize(opts?: ColumnResizeFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
