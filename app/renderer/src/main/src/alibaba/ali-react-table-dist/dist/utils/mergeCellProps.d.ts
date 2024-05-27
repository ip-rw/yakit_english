import { CellProps } from '../interfaces';
/** Merge two cellProps objects, returning a new merged object。
 *
 * mergeCellParams will merge two objects according to the following rules:：
 * * For number, string, boolean field types, the field value in extra will directly overwrite the field value in base (className is an exception, which will be concatenated)）
 * * For functions,/For method-type fields (corresponding to cell's event callback functions), mergeCellProps will generate a new function that calls methods in base and extra in sequence
 * * For ordinary object fields (corresponding to cell styles), mergeCellProps merges the two objects
 * */
export default function mergeCellProps(base: CellProps, extra: CellProps): CellProps;
