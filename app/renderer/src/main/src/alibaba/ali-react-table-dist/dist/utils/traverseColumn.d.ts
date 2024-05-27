import { ArtColumn, TableTransform } from '../interfaces';
declare type NormalizeAsArrayInput<T> = null | T | T[];
/** @deprecated This API is deprecated, please use makeRecursiveMapper */
export default function traverseColumn(fn: (column: ArtColumn, ctx: {
    range: {
        start: number;
        end: number;
    };
    dataSource: any[];
}) => NormalizeAsArrayInput<ArtColumn>): TableTransform;
export {};
