/**
 * Pad left if string length < length
 * Truncate if exceeds length。
 * @param {unknown} string
 * @param {number} length
 * @param {string} chars
 * @returns {string}
 */
module.exports = function padStart(string, length = 0, chars = " ") {
    let str = String(string)
    while (str.length < length) {
        str = `${chars}${str}`
    }
    return str
}
