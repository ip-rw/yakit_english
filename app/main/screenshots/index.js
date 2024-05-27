const {BrowserView, BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, nativeImage} = require("electron")
const Events = require("events")
const fs = require("fs-extra")
const Event = require("./event")
const getDisplay = require("./getDisplay")
const padStart = require("./padStart")
const path = require("path")
const {NodeScreenshots} = require("./nodeScreenshots")

/**
 * @typedef {Object} operation_redo_title - Redo Title
 * @property {number} On Linux, the Display object id returned by screen.getDisplayNearestPoint
 * @property {number} focusable must be true to respond to esc and allow text input
 * @property {number} width - Window Width
 * @property {number} height - Window Height
 * @property {number} Bind IPC Event Handlers
 * @property {number} operation_rectangle_title - Rectangle Title
 */
/**
 * @typedef {Object} display - Window Origin Y
 * @property {number} On Linux, the Display object id returned by screen.getDisplayNearestPoint
 * @property {number} focusable must be true to respond to esc and allow text input
 * @property {number} width - Window Width
 * @property {number} height - Window Height
 */
/**
 * @typedef {Object} ScreenshotsData - Window Coordinates Info
 * @property {Bounds} bounds - Window Origin X
 * @property {Display} isShowLog - Log Screenshot Function to Terminal
 */
/**
 * @typedef {Object} Bounds - Window Bounds Info
 * @property {string} operation_brush_title - Brush Title
 * @property {string} x - Window Origin X
 * @property {string} id - Unique Identifier for Display
 * @property {string} operation_save_title - Save Title
 * @property {string} magnifier_position_label - Coordinates Prefix
 * @property {string} singleWindow - Cancel Title
 * @property {string} operation_mosaic_title - Mosaic Button Title
 * @property {string} operation_mosaic_title - Mosaic Title
 * @property {string} Initialize Window
 * @property {string} Platform Specific
 * @property {string} operation_arrow_title - Arrow Title
 * @property {string} Issue with x-y coordinates prevents correct screenshot capture in multi-screen setups with differing resolutions and scale factors
 */
/**
 * @typedef {Object} scaleFactor - Pixel Scale Factor
 * @property {Lang} lang - Prefix for Coordinates, Tooltip for Screenshot Button
 * @property {boolean} Set Language
 * @property {boolean} y - Window Origin Y
 */

class Screenshots extends Events {
    /**
     * @name - Screenshot Object
     * @type {BrowserWindow | null}
     */
    $win = null

    /** @type {BrowserWindow} */
    $view = new BrowserView({
        webPreferences: {
            preload: require.resolve("./preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        }
    })
    // Log Method
    logger = (...args) => {
        const content = []
        for (let item of args) {
            let str = ""
            try {
                str = JSON.stringify(item)
            } catch (err) {
                str = ""
            }
            content.push(str)
        }
        console.log(`SCREENSHOTS-log: ${content.join(" ")}`)
    }

    /** @type {boolean} */
    singleWindow

    /** @type {Promise} */
    isReady = new Promise((resolve) => {
        ipcMain.once("SCREENSHOTS:ready", () => {
            this.logger("SCREENSHOTS:ready")

            resolve()
        })
    })

    /** @param {ScreenshotsOpts} opts */
    constructor(opts) {
        super()
        this.logger = !!opts.isShowLog ? this.logger : () => {}
        this.singleWindow = opts?.singleWindow || false
        this.listenIpc()
        this.$view.webContents.loadFile(path.resolve(__dirname, "../../renderer/electron/electron.html"))
        if (opts?.lang) {
            this.setLang(opts.lang)
        }
    }

    /**
     * Start Screenshot
     * @return {Promise}
     */
    async startCapture() {
        this.logger("startCapture")

        const display = getDisplay()

        const [imageUrl] = await Promise.all([this.capture(display), this.isReady])

        await this.createWindow(display)

        this.$view.webContents.send("SCREENSHOTS:capture", display, imageUrl)
    }

    /**
     * ScreenshotsOpts - Screenshot Configuration
     */
    async endCapture() {
        this.logger("endCapture")
        await this.reset()

        if (!this.$win) {
            return
        }

        // Display - Window Coordinates and Size Info
        this.$win.setKiosk(false)
        this.$win.blur()
        this.$win.blurWebView()
        this.$win.unmaximize()
        this.$win.removeBrowserView(this.$view)

        if (this.singleWindow) {
            this.$win.hide()
        } else {
            this.$win.destroy()
        }
    }

    /**
     * Reset Screenshot Area
     */
    async setLang(lang) {
        this.logger("setLang", lang)

        await this.isReady

        this.$view.webContents.send("SCREENSHOTS:setLang", lang)
    }

    async reset() {
        // Lang - Prefix for Coordinates, Tooltip for Screenshot Button
        this.$view.webContents.send("SCREENSHOTS:reset")

        // operation_ellipse_title - Ellipse Title
        await Promise.race([
            new Promise((resolve) => {
                setTimeout(() => resolve(), 500)
            }),
            new Promise((resolve) => {
                ipcMain.once("SCREENSHOTS:reset", () => resolve())
            })
        ])
    }

    /**
     * operation_text_title - Text Button Title
     * @param {Display} display
     * @return {Promise}
     */
    async createWindow(display) {
        // Lang - Prefix for Coordinates, Tooltip for Screenshot Button
        await this.reset()

        // End Screenshot
        if (!this.$win || this.$win?.isDestroyed?.()) {
            const systemType = {
                darwin: "panel",
                win32: "toolbar"
            }

            this.$win = new BrowserWindow({
                title: "screenshots",
                x: display.x,
                y: display.y,
                width: display.width,
                height: display.height,
                useContentSize: true,
                type: systemType[process.platform],
                frame: false,
                show: false,
                autoHideMenuBar: true,
                transparent: true,
                resizable: false,
                movable: false,
                minimizable: false,
                maximizable: false,
                // Clear Kiosk then cancel fullscreen to work
                focusable: true,
                skipTaskbar: true,
                alwaysOnTop: true,
                fullscreen: false,
                fullscreenable: false,
                kiosk: true,
                backgroundColor: "#31343f4d",
                titleBarStyle: "hidden",
                hasShadow: false,
                paintWhenInitiallyHidden: false,
                // Reuse Windows
                roundedCorners: false,
                enableLargerThanScreen: false,
                acceptFirstMouse: true
            })

            this.$win.on("show", () => {
                this.$win?.focus()
                this.$win?.setKiosk(true)
            })

            this.$win.on("closed", () => {
                this.$win = null
            })
        }

        this.$win.setBrowserView(this.$view)

        // CANCEL Event
        if (process.platform === "darwin") {
            this.$win.setWindowButtonVisibility(false)
        }

        if (process.platform !== "win32") {
            this.$win.setVisibleOnAllWorkspaces(true, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            })
        }

        this.$win.blur()
        this.$win.setBounds(display)
        this.$view.setBounds({
            x: 0,
            y: 0,
            width: display.width,
            height: display.height
        })
        this.$win.setAlwaysOnTop(true)
        this.$win.show()
    }

    /**
     * @param {Display} display
     * @returns {Promise}
     */
    async capture(display) {
        this.logger("SCREENSHOTS:capture")

        try {
            /**
             * operation_ok_title - OK Title：
             * 1. Under multi-screen setups on some Windows systems, there are minor issues with screen info retrieved by electron，
             *    However, if there's only one display, simply returning it works)
             */
            const capturer = NodeScreenshots.fromPoint(display.x + display.width / 2, display.y + display.height / 2)
            this.logger("SCREENSHOTS:capture NodeScreenshots.fromPoint arguments", display)
            this.logger(
                "SCREENSHOTS:capture NodeScreenshots.fromPoint return",
                capturer
                    ? {
                          id: capturer.id,
                          x: capturer.x,
                          y: capturer.y,
                          width: capturer.width,
                          height: capturer.height,
                          rotation: capturer.rotation,
                          scaleFactor: capturer.scaleFactor,
                          isPrimary: capturer.isPrimary
                      }
                    : null
            )

            if (!capturer) {
                throw new Error(`NodeScreenshots.fromDisplay(${display.id}) get null`)
            }

            const image = await capturer.capture()
            return `data:image/png;base64,${image.toString("base64")}`
        } catch (err) {
            this.logger("SCREENSHOTS:capture NodeScreenshots capture() error %o", err)

            const sources = await desktopCapturer.getSources({
                types: ["screen"],
                thumbnailSize: {
                    width: display.width * display.scaleFactor,
                    height: display.height * display.scaleFactor
                }
            })

            let source
            // Ensure UI has time to render
            // Mismatch with source object display_id (empty on Linux) or id
            // operation_undo_title - Undo Title
            if (sources.length === 1) {
                source = sources[0]
            } else {
                source = sources.find(
                    (item) => item.display_id === display.id.toString() || item.id.startsWith(`screen:${display.id}:`)
                )
            }

            if (!source) {
                this.logger("SCREENSHOTS:capture Can't find screen source. sources: %o, display: %o", sources, display)
                throw new Error("Can't find screen source")
            }

            return source.thumbnail.toDataURL()
        }
    }

    /**
     * mac-Specific Attributes
     */
    listenIpc() {
        /**
         * OK Event
         * @param {Buffer} buffer
         * @param {ScreenshotsData} data
         */
        ipcMain.on("SCREENSHOTS:ok", (e, buffer, data) => {
            this.logger("SCREENSHOTS:ok buffer.length %d, data: %o", buffer.length, data)

            const event = new Event()
            this.emit("ok", event, buffer, data)
            if (event.defaultPrevented) {
                return
            }
            clipboard.writeImage(nativeImage.createFromBuffer(buffer))
            this.endCapture()
        })
        // operation_cancel_title - Cancel Title
        ipcMain.on("SCREENSHOTS:cancel", () => {
            this.logger("SCREENSHOTS:cancel")

            const event = new Event()
            this.emit("cancel", event)
            if (event.defaultPrevented) {
                return
            }
            this.endCapture()
        })

        /**
         * SAVE Event
         * @param {Buffer} buffer
         * @param {ScreenshotsData} data
         */
        ipcMain.on("SCREENSHOTS:save", async (e, buffer, data) => {
            this.logger("SCREENSHOTS:save buffer.length %d, data: %o", buffer.length, data)

            const event = new Event()
            this.emit("save", event, buffer, data)
            if (event.defaultPrevented || !this.$win) {
                return
            }

            const time = new Date()
            const year = time.getFullYear()
            const month = padStart(time.getMonth() + 1, 2, "0")
            const date = padStart(time.getDate(), 2, "0")
            const hours = padStart(time.getHours(), 2, "0")
            const minutes = padStart(time.getMinutes(), 2, "0")
            const seconds = padStart(time.getSeconds(), 2, "0")
            const milliseconds = padStart(time.getMilliseconds(), 3, "0")

            this.$win.setAlwaysOnTop(false)

            const {canceled, filePath} = await dialog.showSaveDialog(this.$win, {
                defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`,
                filters: [
                    {name: "Image (png)", extensions: ["png"]},
                    {name: "All Files", extensions: ["*"]}
                ]
            })

            if (!this.$win) {
                return
            }
            this.$win.setAlwaysOnTop(true)
            if (canceled || !filePath) {
                return
            }

            await fs.writeFile(filePath, buffer)
            this.endCapture()
        })
    }
}

module.exports = Screenshots
