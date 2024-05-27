import { TablePipeline } from '../pipeline';
export interface RowGroupingFeatureOptions {
    /** Uncontrol: DefaultExpandAll */
    defaultOpenAll?: boolean;
    /** Uncontrol: DefaultExpandKeys */
    defaultOpenKeys?: string[];
    /** Control: CurrentExpandKeys */
    openKeys?: string[];
    /** Control: OnExpandKeysChange */
    onChangeOpenKeys?(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    /** StopPropagation OnChangeOpenKeys Click() */
    stopClickEventPropagation?: boolean;
}
export declare function rowGrouping(opts?: RowGroupingFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
