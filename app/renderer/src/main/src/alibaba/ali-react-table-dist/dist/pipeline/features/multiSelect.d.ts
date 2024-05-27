import { ArtColumnStaticPart } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface MultiSelectFeatureOptions {
    /** Uncontrolled: Default Selected Value */
    defaultValue?: string[];
    /** Uncontrolled: Default lastKey */
    defaultLastKey?: string;
    /** Controlled: Selected Keys */
    value?: string[];
    /** Controlled: Last Operation RowKey */
    lastKey?: string;
    /** Controlled: State Change Callback  */
    onChange?: (nextValue: string[], key: string, keys: string[], action: 'check' | 'uncheck' | 'check-all' | 'uncheck-all') => void;
    /** Checkbox Column Position */
    checkboxPlacement?: 'start' | 'end';
    /** Checkbox Column Config: width, lock, title, align, features */
    checkboxColumn?: Partial<ArtColumnStaticPart>;
    /** Highlight Selected Row */
    highlightRowWhenSelected?: boolean;
    /** Disable Checkbox in Row */
    isDisabled?(row: any, rowIndex: number): boolean;
    /** Click Event Response Zone */
    clickArea?: 'checkbox' | 'cell' | 'row';
    /** Stop onChange Click Event Propagation() */
    stopClickEventPropagation?: boolean;
}
export declare function multiSelect(opts?: MultiSelectFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
