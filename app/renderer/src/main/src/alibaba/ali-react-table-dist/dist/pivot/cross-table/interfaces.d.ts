import { ReactNode } from 'react';
import { ArtColumnStaticPart, CellProps } from '../../interfaces';
export interface CrossTableIndicator extends ArtColumnStaticPart {
    code: string;
    expression?: string;
}
export interface CrossTableLeftMetaColumn extends Omit<ArtColumnStaticPart, 'hidden'> {
    /** Custom Render Method */
    render?(leftNode: LeftCrossTreeNode, leftDepth: number): ReactNode;
    /** Custom Method for Cell Props */
    getCellProps?(leftNode: LeftCrossTreeNode, leftDepth: number): CellProps;
}
export interface CrossTreeNode {
    key: string;
    value: string;
    title?: ReactNode;
    data?: any;
    hidden?: boolean;
    children?: CrossTreeNode[];
}
/** Pivot Table Left Tree Node */
export interface LeftCrossTreeNode extends CrossTreeNode {
    children?: CrossTreeNode[];
}
/** Pivot Table Top Tree Node
 * Column Name Now Provided by Value Field, Removed Name Field from ArtColumnStaticPart */
export interface TopCrossTreeNode extends CrossTreeNode, Omit<ArtColumnStaticPart, 'name'> {
    children?: TopCrossTreeNode[];
}
