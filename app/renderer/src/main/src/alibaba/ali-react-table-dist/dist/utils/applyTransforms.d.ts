import { Transform } from '../interfaces';
/**
 * Use input as input, apply transform in order.
 *
 * `applyTransforms(input, f1, f2, f3)` Equivalent to `f3(f2(f1(input)))` */
export default function applyTransforms<T>(input: T, ...transforms: Transform<T>[]): T;
