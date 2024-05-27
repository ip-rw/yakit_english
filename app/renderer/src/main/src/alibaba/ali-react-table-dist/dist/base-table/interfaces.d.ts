import { ArtColumn } from '../interfaces';
export declare type VirtualEnum = false | true | 'auto';
export interface VerticalRenderRange {
    topIndex: number;
    topBlank: number;
    bottomIndex: number;
    bottomBlank: number;
}
export interface HorizontalRenderRange {
    leftIndex: number;
    leftBlank: number;
    rightIndex: number;
    rightBlank: number;
}
export declare type VisibleColumnDescriptor = {
    type: 'blank';
    blankSide: 'left' | 'right';
    width: number;
} | {
    type: 'normal';
    colIndex: number;
    col: ArtColumn;
};
export interface ResolvedUseVirtual {
    horizontal: boolean;
    vertical: boolean;
    header: boolean;
}
export interface RenderInfo {
    verticalRenderRange: VerticalRenderRange;
    horizontalRenderRange: HorizontalRenderRange;
    visible: VisibleColumnDescriptor[];
    flat: {
        full: ArtColumn[];
        left: ArtColumn[];
        center: ArtColumn[];
        right: ArtColumn[];
    };
    nested: {
        full: ArtColumn[];
        left: ArtColumn[];
        center: ArtColumn[];
        right: ArtColumn[];
    };
    stickyLeftMap: Map<number, number>;
    stickyRightMap: Map<number, number>;
    useVirtual: ResolvedUseVirtual;
    /** HasValidLockCol */
    hasLockColumn: boolean;
    /** TotalWidthLeftLockCol */
    leftLockTotalWidth: number;
    /** TotalWidthRightLockCol */
    rightLockTotalWidth: number;
}
