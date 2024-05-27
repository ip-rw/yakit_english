import { CrossTableIndicator, CrossTreeNode } from '../cross-table';
import { DrillNode } from './interfaces';
declare type ConvertOptions<T extends CrossTreeNode = CrossTreeNode> = {
    /** Metrics to append on child nodes */
    indicators?: CrossTableIndicator[];
    /** Custom encoding function for unique string generation.
     * Leave blank for default encoding */
    encode?(valuePath: string[]): string;
    /** Generate sub-total node for a value sequence.
     * Function called once for each parent node；
     * * Returns null if no subtotal node needed for parent；
     * * Return `{ position: 'start' | 'end', value: string; data?: any }`
     *  Subtotal node position, text, additional data
     *
     * Leave blank to skip subtotals for all nodes */
    generateSubtotalNode?(drillNode: DrillNode): null | {
        position: 'start' | 'end';
        value: string;
    };
    /** Expand/collapse support, default false。
     * Expands when true/Collapse to activate, renders related buttons */
    supportsExpand?: boolean;
    /** Keys of expanded nodes array */
    expandKeys?: string[];
    /** Callback on node expansion change */
    onChangeExpandKeys?(nextKeys: string[], targetNode: DrillNode, action: 'collapse' | 'expand'): void;
    /** Force expand total node, default true */
    enforceExpandTotalNode?: boolean;
};
export declare function convertDrillTreeToCrossTree<T extends CrossTreeNode = CrossTreeNode>(drillTree: DrillNode[], { indicators, encode, generateSubtotalNode, enforceExpandTotalNode, expandKeys, onChangeExpandKeys, supportsExpand, }?: ConvertOptions<T>): T[];
export {};
