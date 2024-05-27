const {ipcMain} = require("electron")

/** @name Global Callback Server Config */
let globalConfigServer = null

module.exports = (win, getClient) => {
    /** @name Check Global Callback Active */
    // ipcMain.handle("is-global-reverse-status", () => {
    //     /** @returns {Boolean} */
    //     return !!globalConfigServer
    // })
    /** @name Cancel Global Callback */
    // ipcMain.handle("cancel-global-reverse-status", () => {
    //     if (globalConfigServer) {
    //         globalConfigServer.cancel()
    //         console.info("Cancel Global Callback Config")
    //         globalConfigServer = null
    //     }
    //     return
    // })
}
