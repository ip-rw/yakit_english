import { AbstractTreeNode } from '../interfaces';
/** Sort data in a tree structure.
 * layeredSort is a recursive process, sorting the children array of each parent node in the tree.
 * */
export default function layeredSort<T extends AbstractTreeNode>(array: T[], compare: (x: T, y: T) => number): T[];
