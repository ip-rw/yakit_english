/** Data Cube.
 * RecordMatrix is a 2D map, CrossTable uses matrix data as follows：
 * `matrix.get(leftPK).get(topPK)[indicatorCode]` */
export declare type RecordMatrix<R = any> = Map<string, Map<string, R>>;
/** Generic Drilldown Node */
export interface DrillNode {
    key: string;
    value: string;
    path: string[];
    children?: DrillNode[];
    hasChild?: boolean;
}
