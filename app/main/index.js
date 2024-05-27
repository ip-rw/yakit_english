const {app, BrowserWindow, dialog, nativeImage, globalShortcut, ipcMain, protocol, Menu} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const url = require("url")
const {registerIPC, clearing} = require("./ipc")
const process = require("process")
const {initExtraLocalCache, getExtraLocalCacheValue, initLocalCache, setCloeseExtraLocalCache} = require("./localCache")
const {asyncKillDynamicControl} = require("./handlers/dynamicControlFun")
const {windowStatePatch, engineLog, renderLog, printLog} = require("./filePath")
const fs = require("fs")
const Screenshots = require("./screenshots")
const windowStateKeeper = require("electron-window-state")
const {clearFolder} = require("./toolsFunc")
const {MenuTemplate} = require("./menu")

/** Retrieve cache data - need to show closure confirmation dialog? */
const UICloseFlag = "windows-close-flag"

/** Main process window object */
let win
// Flag for showing closure confirmation
let closeFlag = true

process.on("uncaughtException", (error) => {
    console.info(error)
})

// Performance optimization: https://juejin.cn/post/6844904029231775758

const createWindow = () => {
    /** Retrieve and store cache data */
    initLocalCache()
    /** Retrieve and store extension cache data (show closure confirmation dialog?) */
    initExtraLocalCache(() => {
        const cacheFlag = getExtraLocalCacheValue(UICloseFlag)
        closeFlag = cacheFlag === undefined ? true : cacheFlag
    })
    let mainWindowState = windowStateKeeper({
        defaultWidth: 900,
        defaultHeight: 500,
        path: windowStatePatch,
        file: "yakit-window-state.json"
    })
    win = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: 900,
        minHeight: 500,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: true
        },
        frame: false,
        titleBarStyle: "hidden"
    })
    win.setSize(mainWindowState.width, mainWindowState.height)
    mainWindowState.manage(win)
    if (isDev) {
        win.loadURL("http://127.0.0.1:3000")
    } else {
        win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))
    }

    // Open the DevTools.
    if (isDev) {
        win.webContents.openDevTools({mode: "detach"})
    }
    win.setMenu(null)
    win.setMenuBarVisibility(false)
    if (process.platform === "darwin") win.setWindowButtonVisibility(false)

    win.on("close", async (e) => {
        e.preventDefault()
        mainWindowState.saveState(win)
        // Notify render process when closing app, then close after processing
        win.webContents.send("close-windows-renderer")
    })
    win.on("minimize", (e) => {
        win.webContents.send("refresh-token")
        // Notify render process when closing app, then close after processing
        win.webContents.send("minimize-windows-renderer")
    })
    win.on("maximize", (e) => {
        win.webContents.send("refresh-token")
    })
    // Prevent internal React page link navigation
    win.webContents.on("will-navigate", (e, url) => {
        e.preventDefault()
    })
    // Screen recording
    // globalShortcut.register("Control+Shift+X", (e) => {
    //     win.webContents.send("open-screenCap-modal")
    // })
}

/**
 * set software menu
 */

const menu = Menu.buildFromTemplate(MenuTemplate)
Menu.setApplicationMenu(menu)

app.whenReady().then(() => {
    // Register screenshot feature (and global shortcut)
    if (["darwin", "win32"].includes(process.platform)) {
        const screenshots = new Screenshots({
            singleWindow: true
        })

        ipcMain.handle("activate-screenshot", () => {
            screenshots.startCapture()
            globalShortcut.register("esc", () => {
                screenshots.endCapture()
                globalShortcut.unregister("esc")
            })
        })

        // globalShortcut.register("Control+Shift+b", () => {
        //     screenshots.startCapture()
        //     globalShortcut.register("esc", () => {
        //         screenshots.endCapture()
        //         globalShortcut.unregister("esc")
        //     })
        // })
        globalShortcut.register("Control+Shift+q", () => {
            screenshots.endCapture()
            globalShortcut.unregister("esc")
        })

        // OK button click callback
        screenshots.on("ok", (e, buffer, bounds) => {
            if (screenshots.$win?.isFocused()) {
                screenshots.endCapture()
                globalShortcut.unregister("esc")
            }
        })
        // Cancel button click callback
        screenshots.on("cancel", () => {
            globalShortcut.unregister("esc")
        })
    }

    /**
     * error-log:
     * If exists, check if file count exceeds 10, keep only the last 10 files
     * Create folder if not exists
     */
    if (fs.existsSync(engineLog)) {
        clearFolder(engineLog, 9)
    } else {
        fs.mkdirSync(engineLog, {recursive: true})
    }
    if (fs.existsSync(renderLog)) {
        clearFolder(renderLog, 9)
    } else {
        fs.mkdirSync(renderLog, {recursive: true})
    }
    if (fs.existsSync(printLog)) {
        clearFolder(printLog, 9)
    } else {
        fs.mkdirSync(printLog, {recursive: true})
    }

    // App exit logic
    ipcMain.handle("app-exit", async (e, params) => {
        const showCloseMessageBox = params.showCloseMessageBox
        if (closeFlag && showCloseMessageBox) {
            dialog
                .showMessageBox(win, {
                    icon: nativeImage.createFromPath(path.join(__dirname, "../assets/yakitlogo.pic.jpg")),
                    type: "none",
                    title: "Prompt",
                    defaultId: 0,
                    cancelId: 3,
                    message: "Confirm closure?？",
                    buttons: ["Minimize", "Exit directly"],
                    checkboxLabel: "Don't show closure confirmation again？",
                    checkboxChecked: false,
                    noLink: true
                })
                .then(async (res) => {
                    await setCloeseExtraLocalCache(UICloseFlag, !res.checkboxChecked)
                    await asyncKillDynamicControl()
                    if (res.response === 0) {
                        e.preventDefault()
                        win.minimize()
                    } else if (res.response === 1) {
                        win = null
                        clearing()
                        app.exit()
                    } else {
                        e.preventDefault()
                        return
                    }
                })
        } else {
            // Close remote control on app close
            await asyncKillDynamicControl()
            win = null
            clearing()
            app.exit()
        }
    })

    // Protocol
    protocol.registerFileProtocol("atom", (request, callback) => {
        const filePath = url.fileURLToPath("file://" + request.url.slice("atom://".length))
        callback(filePath)
    })

    createWindow()

    try {
        registerIPC(win)
    } catch (e) {}

    //
    // // autoUpdater.autoDownload = false
    // autoUpdater.checkForUpdates();
    // autoUpdater.signals.updateDownloaded(info => {
    //     console.info(info.downloadedFile)
    // })

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Exit unreachable due to win.on("close") Prevented default action
app.on("window-all-closed", function () {
    clearing()
    app.quit()
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})
