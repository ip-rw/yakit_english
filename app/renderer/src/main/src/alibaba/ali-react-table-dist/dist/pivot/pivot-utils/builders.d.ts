import { DrillNode, RecordMatrix } from './interfaces';
export interface BuildingCtx {
    peculiarity: Set<string>;
}
export interface BuildRecordMatrixConfig {
    leftCodes: string[];
    topCodes: string[];
    data: any[];
    aggregate?(slice: any[], ctx: BuildingCtx): any;
    encode?(valuePath: string[]): string;
    isLeftExpand?(key: string): boolean;
    isTopExpand?(key: string): boolean;
    prebuiltLeftTree?: DrillNode[];
    prebuiltTopTree?: DrillNode[];
}
/** Calculates the corresponding data cube from the full detail data based on the drill-down trees on the left and top of the table */
export declare function buildRecordMatrix({ data, leftCodes, topCodes, aggregate, encode, isLeftExpand, isTopExpand, prebuiltLeftTree, prebuiltTopTree, }: BuildRecordMatrixConfig): RecordMatrix;
/** Simplified version of buildRecordMatrix, can only process one dimension sequence, returns a Map。
 * Equivalent to processing only the first row of matrix (Summary row） */
export declare function buildRecordMap({ codes, encode, data, aggregate, isExpand, }: {
    codes: string[];
    data: any[];
    aggregate?(slice: any[], ctx: BuildingCtx): any;
    encode?(valuePath: string[]): string;
    isExpand?(key: string): boolean;
}): Map<string, any>;
