/** Comparison function for strings, numbers, arrays, and null。
 * * Strings are compared lexicographically；
 * * Numbers are compared by size；
 * * null is always considered less than any other value；
 * * For arrays, compare elements one by one, the first unequal comparison result is the overall result
 *
 * Array comparison similar to Python tuple comparison：
 * https://stackoverflow.com/questions/5292303/how-does-tuple-comparison-work-in-python */
export default function smartCompare(x: any, y: any): number;
