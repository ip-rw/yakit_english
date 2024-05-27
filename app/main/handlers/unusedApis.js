const {ipcMain} = require("electron")

module.exports = (win, callback, getClient) => {
    /**
     * Connectivity check on engine process
     * Detailed error content for some status codes under err
     */
    ipcMain.handle("echo-yak", async (e, txt) => {
        let client = getClient()
        try {
            client.Echo({text: txt}, (err, result) => {
                if (err) {
                    switch (err.code) {
                        case 2:
                            if ((err.details || "").includes("secret verify failed...")) {
                                win.webContents.send("client-echo-yak", false, `Yak Server Auth Password Error`)
                                return
                            }
                            win.webContents.send("client-echo-yak", false, `Yak Server Error: ${err.details}`)
                        case 14:
                            win.webContents.send("client-echo-yak", false, `Yak Server Not Started, Network Down, or Cert Mismatch`)
                            return
                        case 16:
                            win.webContents.send("client-echo-yak", false, `Yak Server Auth Failure`)
                            return
                        default:
                            win.webContents.send("client-echo-yak", false, `${err}`)
                            return
                    }
                }
                if (win) {
                    win.webContents.send("client-echo-yak", true, result.result)
                }
            })
        } catch (e) {
            throw Error(`call yak echo failed: ${e}`)
        }
    })
}
