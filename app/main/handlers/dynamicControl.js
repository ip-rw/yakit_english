const { ipcMain} = require("electron")
const {asyncKillDynamicControl,asyncStartDynamicControl,asyncAliveDynamicControlStatus,getCloseFlag} = require("./dynamicControlFun")

module.exports = (win, getClient) => {

    /** Start Remote Service */
    ipcMain.handle("start-dynamic-control", async (e, params) => {
        return await asyncStartDynamicControl(win, params)
    })

    /** Stop Remote Service */
    ipcMain.handle("kill-dynamic-control", async () => {
        return await asyncKillDynamicControl()
    })

    /** Monitor Service Status */
    ipcMain.handle("alive-dynamic-control-status", async (e, params) => {
        return await asyncAliveDynamicControlStatus()
        
    })

    /** Exit Remote Control */
    ipcMain.handle("lougin-out-dynamic-control", async (e, params) => {
        // Params determine logout after remote exit
        win.webContents.send("login-out-dynamic-control-callback",params)
    })

    /** Exit Remote Page */
    ipcMain.handle("lougin-out-dynamic-control-page", async (e, params) => {
        win.webContents.send("lougin-out-dynamic-control-page-callback")
    })

    /** Log Out */
    ipcMain.handle("ipc-sign-out", async (e, params) => {
        win.webContents.send("ipc-sign-out-callback")
    })
}
