import { TableTransform } from '../interfaces';
/** @deprecated transform usage, use pipeline for table expansion */
export interface TreeModeOptions {
    primaryKey: string;
    openKeys: string[];
    onChangeOpenKeys(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    isLeafNode?(node: any, nodeMeta: {
        depth: number;
        expanded: boolean;
        rowKey: string;
    }): boolean;
    /** Icon indent value, usually negative, shifts icon left. Default -6 */
    iconIndent?: number;
    /** Icon-text spacing, default 0 */
    iconGap?: number;
    /** Indent distance per level, default 16 */
    indentSize?: number;
    clickArea?: 'cell' | 'content' | 'icon';
    treeMetaKey?: string | symbol;
    stopClickEventPropagation?: boolean;
}
/** @deprecated transform usage, use pipeline for table expansion */
export declare function makeTreeModeTransform({ onChangeOpenKeys, openKeys, primaryKey, iconIndent, iconGap, indentSize, isLeafNode, clickArea, treeMetaKey, stopClickEventPropagation, }: TreeModeOptions): TableTransform;
/** @deprecated transform usage, use pipeline for table expansion */
export declare function useTreeModeTransform({ defaultOpenKeys, ...others }: Omit<TreeModeOptions, 'openKeys' | 'onChangeOpenKeys'> & {
    defaultOpenKeys?: string[];
}): TableTransform;
