import { AbstractTreeNode } from '../interfaces';
/** Traverse all nodes, collect into an array.
 * Order parameter for specifying traversal rule：
 * * `pre` Pre-order (default）
 * * `post` Post-order
 * * `leaf-only` Ignore internal nodes, collect only leaf nodes
 * */
export default function collectNodes<T extends AbstractTreeNode>(nodes: T[], order?: 'pre' | 'post' | 'leaf-only'): T[];
