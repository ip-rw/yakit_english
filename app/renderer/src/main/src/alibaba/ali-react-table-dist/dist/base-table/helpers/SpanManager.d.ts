/** During cell rendering in the table, the colSpan of the cell rendered first/rowSpan affects whether subsequent cells will be rendered
 * `SpanManager` A state is maintained internally to track the colSpan of the most recently rendered cell/rowSpan，
 * Facilitates rapid assessment for subsequent cells "Whether rendering should be skipped" */
export default class SpanManager {
    private rects;
    testSkip(rowIndex: number, colIndex: number): boolean;
    stripUpwards(rowIndex: number): void;
    add(rowIndex: number, colIndex: number, colSpan: number, rowSpan: number): void;
}
