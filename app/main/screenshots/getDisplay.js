const {screen} = require("electron")

/**
 * @typedef {Object} Display - Window Position & Size Info
 * @property {number} x - Window Origin X Coord
 * @property {number} y - Window Origin Y Coord
 * @property {number} width - Window Width
 * @property {number} height - Window Height
 * @property {number} id - Unique Identifier for Display
 * @property {number} scaleFactor - Pixel Ratio of Output Device
 */

/**
 * @return {Display}
 */
module.exports = () => {
    const point = screen.getCursorScreenPoint()
    const {id, bounds, scaleFactor} = screen.getDisplayNearestPoint(point)

    return {
        id,
        x: Math.floor(bounds.x),
        y: Math.floor(bounds.y),
        width: Math.floor(bounds.width),
        height: Math.floor(bounds.height),
        scaleFactor
    }
}
