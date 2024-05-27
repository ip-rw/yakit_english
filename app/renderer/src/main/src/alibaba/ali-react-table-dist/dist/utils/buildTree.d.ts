declare type WithChildren<T> = T & {
    children?: WithChildren<T>[];
};
/**
 * Build tree from objects array using idProp and parentIdProp
 * When A[parentIdProp] === B[idProp], A moves to B's children。
 * When an object's parentIdProp doesn't match others' idProp, it's a top-level tree node
 * @example
 * const array = [
 *   { id: 'node-1', parent: 'root' },
 *   { id: 'node-2', parent: 'root' },
 *   { id: 'node-3', parent: 'node-2' },
 *   { id: 'node-4', parent: 'node-2' },
 *   { id: 'node-5', parent: 'node-4' },
 * ]
 * const tree = buildTree('id', 'parent', array)
 * expect(tree).toEqual([
 *   { id: 'node-1', parent: 'root' },
 *   {
 *     id: 'node-2',
 *     parent: 'root',
 *     children: [
 *       { id: 'node-3', parent: 'node-2' },
 *       {
 *         id: 'node-4',
 *         parent: 'node-2',
 *         children: [{ id: 'node-5', parent: 'node-4' }],
 *       },
 *     ],
 *   },
 * ])
 */
export default function buildTree<ID extends string, PID extends string, T extends {
    [key in ID | PID]: string;
}>(idProp: ID, parentIdProp: PID, items: T[]): WithChildren<T>[];
export {};
