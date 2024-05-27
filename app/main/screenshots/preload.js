const {contextBridge, ipcRenderer, IpcRendererEvent} = require("electron")

/**
 * @typedef {Object} Display - Window Info
 * @property {number} x - Origin X in Window
 * @property {number} y - Origin Y in Window
 * @property {number} width - Window Width
 * @property {number} height - Window Height
 * @property {number} id - Unique Identifier for Display
 * @property {number} scaleFactor - Pixel Ratio of Output Device
 */

/**
 * @typedef {Object} Bounds - Window Bounds Info
 * @property {number} x - Origin X in Window
 * @property {number} y - Origin Y in Window
 * @property {number} width - Window Width
 * @property {number} height - Window Height
 */

/**
 * @typedef {Object} ScreenshotsData - Coordinates for Window
 * @property {Bounds} bounds - Origin X in Window
 * @property {Display} display - Origin Y in Window
 */

const map = new Map()

contextBridge.exposeInMainWorld("screenshots", {
    ready: () => {
        ipcRenderer.send("SCREENSHOTS:ready")
    },
    reset: () => {
        ipcRenderer.send("SCREENSHOTS:reset")
    },
    /**
     * @param {ArrayBuffer} arrayBuffer
     * @param {ScreenshotsData} data
     */
    save: (arrayBuffer, data) => {
        ipcRenderer.send("SCREENSHOTS:save", Buffer.from(arrayBuffer), data)
    },
    cancel: () => {
        ipcRenderer.send("SCREENSHOTS:cancel")
    },
    /**
     * @param {ArrayBuffer} arrayBuffer
     * @param {ScreenshotsData} data
     */
    ok: (arrayBuffer, data) => {
        ipcRenderer.send("SCREENSHOTS:ok", Buffer.from(arrayBuffer), data)
    },
    /**
     * @param {string} channel
     * @param {() => void} fn
     */
    on: (channel, fn) => {
        /** @param {IpcRendererEvent} event */
        const listener = (event, ...args) => {
            fn(...args)
        }

        const listeners = map.get(fn) ?? {}
        listeners[channel] = listener
        map.set(fn, listeners)

        ipcRenderer.on(`SCREENSHOTS:${channel}`, listener)
    },
    /**
     * @param {string} channel
     * @param {() => void} fn
     */
    off: (channel, fn) => {
        const listeners = map.get(fn) ?? {}
        const listener = listeners[channel]
        delete listeners[channel]

        if (!listener) {
            return
        }

        ipcRenderer.off(`SCREENSHOTS:${channel}`, listener)
    }
})
