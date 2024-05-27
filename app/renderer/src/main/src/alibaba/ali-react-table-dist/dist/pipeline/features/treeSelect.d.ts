import { ArtColumn } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface TreeSelectFeatureOptions {
    /** Complete tree */
    tree: any[];
    /** Virtual root node value; adds a parent node to the tree if non-empty */
    rootKey?: string;
    /** Parent-child selection linkage disabled. With true, parent and child values are managed separately */
    checkStrictly?: boolean;
    /**
     * Method of refilling on select, options available:
     * - 'all'(Return all selected nodes)
     * - 'parent'(Return only parent node when both parent and child are selected)
     * - 'child'(Return only child nodes when both parent and child are selected)
     */
    checkedStrategy?: 'all' | 'parent' | 'child';
    /** Checkbox column position */
    checkboxPlacement?: 'start' | 'end';
    /** Checkbox column config: width, lock, title, align, features */
    checkboxColumn?: Partial<ArtColumn>;
    /** Controlled: Currently selected value */
    value?: string[];
    /** Uncontrolled: Default selected value */
    defaultValue?: string[];
    /** Controlled: State change callback */
    onChange?(nextValue: string[]): void;
    /** Clickable area of the event */
    clickArea?: 'checkbox' | 'cell' | 'row';
    /** Stop click event propagation on onChange() */
    stopClickEventPropagation?: boolean;
    /** Highlight whole row when selected */
    highlightRowWhenSelected?: boolean;
    /** Disable node interaction */
    isDisabled?(row: any): boolean;
    /** Detach node's subtree from parent linkage */
    isDetached?(row: any): boolean;
}
export declare function treeSelect(opts: TreeSelectFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
