const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    ipcMain.handle("UIOperate", (e, params) => {
        switch (params) {
            case "close":
                win.close()
                return
            case "min":
                win.minimize()
                return
            case "full":
                let isMax = win.isFullScreen()
                if (isMax) {
                    win.setFullScreen(false)
                    if (win.isMaximized()) {
                        setTimeout(() => {
                            win.unmaximize()
                        }, 10)
                    }
                } else win.setFullScreen(true)
                return
            case "max":
                if (win.isMaximized()) win.unmaximize()
                else win.maximize()
                return

            default:
                return
        }
    })

    /** Maximize */
    win.on("maximize", () => {
        win.webContents.send("callback-win-maximize")
    })
    /** Exit Maximize */
    win.on("unmaximize", () => {
        win.webContents.send("callback-win-unmaximize")
    })
    /** Fullscreen */
    win.on("enter-full-screen", () => {
        win.webContents.send("callback-win-enter-full")
    })
    /** Exit Fullscreen */
    win.on("leave-full-screen", () => {
        win.webContents.send("callback-win-leave-full")
    })
    /** Is Fullscreen? */
    ipcMain.handle("is-full-screen", () => {
        win.webContents.send("callback-is-full-screen", win.isFullScreen())
    })
    /** Is Maximized? */
    ipcMain.handle("is-maximize-screen", () => {
        win.webContents.send("callback-is-maximize-screen", win.isMaximized())
    })

    /** Open/Close DevTool */
    ipcMain.handle("trigger-devtool", () => {
        const flag = win.webContents.isDevToolsOpened()
        if (flag) win.webContents.closeDevTools()
        else win.webContents.openDevTools()
        return
    })
    /** Refresh Cache */
    ipcMain.handle("trigger-reload", () => {
        win.webContents.reload()
        return
    })
    /** Force Clear Cache */
    ipcMain.handle("trigger-reload-cache", () => {
        win.webContents.reloadIgnoringCache()
        return
    })
}
