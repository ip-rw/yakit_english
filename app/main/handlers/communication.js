const {ipcMain} = require("electron")
const isDev = require("electron-is-dev")
const exec = require("child_process").exec
module.exports = (win, getClient) => {
    // Refresh main page's left menu / refresh the menu content on the right side of the main page
    ipcMain.handle("change-main-menu", async (e) => {
        win.webContents.send("fetch-new-main-menu")
    })
    // Refresh public version menu
    ipcMain.handle("refresh-public-menu", async (e) => {
        win.webContents.send("refresh-public-menu-callback")
    })
    // Remotely open a tool page / open a tool page remotely
    ipcMain.handle("send-to-tab", async (e, params) => {
        win.webContents.send("fetch-send-to-tab", params)
    })
    // Open packet plugin via request packet
    ipcMain.handle("send-to-packet-hack", async (e, params) => {
        win.webContents.send("fetch-send-to-packet-hack", params)
    })
    // Cache data & config comm in fuzzer
    // ipcMain.handle("send-fuzzer-setting-data", async (e, params) => {
    //     win.webContents.send("fetch-fuzzer-setting-data", params)
    // })
    // Send plugin info to YakRunning page
    ipcMain.handle("send-to-yak-running", async (e, params) => {
        win.webContents.send("fetch-send-to-yak-running", params)
    })

    // Local environment (packaged)/Development)
    ipcMain.handle("is-dev", () => {
        return isDev
    })

    /**
     * @name ipc comm - close top-level page remotely
     * @param {object} params
     * @param {YakitRoute} params.router Page router
     * @param {string} params.name optional, required for YakitRoute.Plugin_OP - plugin name needed
     */
    ipcMain.handle("send-close-tab", async (e, params) => {
        win.webContents.send("fetch-close-tab", params)
    })
    /**
     * @name Remotely open a page via comm
     * @param {object} params Page opening info
     *
     * @param {YakitRoute} params.route Page route
     * @param {number} pluginId Plugin ID (local))
     * @param {string} pluginName Plugin name
     */
    ipcMain.handle("open-route-page", (e, params) => {
        win.webContents.send("open-route-page-callback", params)
    })

    // Refresh local plugin list after tab creates a plugin
    ipcMain.handle("send-local-script-list", async (e, params) => {
        win.webContents.send("ref-local-script-list", params)
    })

    /** Open comm for direction log */
    ipcMain.handle("direction-console-log", async (e, params) => {
        win.webContents.send("callback-direction-console-log", params)
    })
    // Open custom menu
    ipcMain.handle("open-customize-menu", (e, params) => {
        win.webContents.send("fetch-open-customize-menu", params)
    })
    /** Switch engine with pinwheel */
    ipcMain.handle("switch-conn-refresh", (e, params) => {
        if (!params) {
            // Close all menus
            win.webContents.send("fetch-close-all-tab")
        }
        win.webContents.send("fetch-switch-conn-refresh", params)
    })
    /** License validation comm */
    ipcMain.handle("update-judge-license", (e, params) => {
        win.webContents.send("fetch-judge-license", params)
    })

    /** Network check */
    ipcMain.handle("try-network-detection", async (e, ip) => {
        return await new Promise((resolve, reject) => {
            reject("Unimplemented - use advanced network diagnose")
        })
    })

    /** Simplified Enterprise - open fixed report */
    ipcMain.handle("simple-open-report", async (e, params) => {
        win.webContents.send("fetch-simple-open-report", params)
    })

    /** Open screen recording */
    ipcMain.handle("send-open-screenCap-modal", async (e, params) => {
        win.webContents.send("open-screenCap-modal")
    })

    // Locate HTTP History
    ipcMain.handle("send-positioning-http-history", (e, params) => {
        win.webContents.send("fetch-positioning-http-history", params)
    })


    // Create group onAddGroup
    ipcMain.handle("send-add-group", (e, params) => {
        win.webContents.send("fetch-add-group", params)
    })
}
