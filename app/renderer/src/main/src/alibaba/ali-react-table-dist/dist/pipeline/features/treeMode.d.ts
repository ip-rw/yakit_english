import { TablePipeline } from '../pipeline';
export declare const treeMetaSymbol: unique symbol;
export interface TreeModeFeatureOptions {
    /** Uncontrolled Usage: Default expanded keys */
    defaultOpenKeys?: string[];
    /** Controlled Usage: Currently expanded keys */
    openKeys?: string[];
    /** Controlled Usage: Callback for expanded keys change */
    onChangeOpenKeys?(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    /** Custom Leaf Node Logic */
    isLeafNode?(node: any, nodeMeta: {
        depth: number;
        expanded: boolean;
        rowKey: string;
    }): boolean;
    /** Icon Indent Value, usually negative for left shift, default from pipeline.ctx.indents */
    iconIndent?: number;
    /** Icon-text Margin, default from pipeline.ctx.indents */
    iconGap?: number;
    /** Indentation Distance per Level, default from pipeline.ctx.indents */
    indentSize?: number;
    /** Click Event Response Area */
    clickArea?: 'cell' | 'content' | 'icon';
    /** Expand on Trigger/Collapse Click Event Calls event.stopPropagation() */
    stopClickEventPropagation?: boolean;
    /** Specifies the record field for row meta information */
    treeMetaKey?: string | symbol;
}
export declare function treeMode(opts?: TreeModeFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
