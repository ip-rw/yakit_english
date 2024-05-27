import { DrillNode } from './interfaces';
export interface BuildDrillTreeOptions<T extends DrillNode> {
    /** Generate top "Total" node, off by default */
    includeTopWrapper?: boolean;
    /** Text in top node when generated, defaults to "Total"」 */
    totalValue?: string;
    /** Custom encoding function to generate unique string from drill-down value sequence.
     * Leave empty to use default encoding */
    encode?(path: string[]): string;
    /** Check if a node is expanded, unexpanded nodes aren't drilled down */
    isExpand?(key: string): boolean;
    /** Force expand "Total" node, defaults to true */
    enforceExpandTotalNode?: boolean;
}
/** Calculate drill-down tree from specified code sequence */
export default function buildDrillTree(data: any[], codes: string[], { encode, totalValue, includeTopWrapper, isExpand, enforceExpandTotalNode, }?: BuildDrillTreeOptions<DrillNode>): DrillNode[];
