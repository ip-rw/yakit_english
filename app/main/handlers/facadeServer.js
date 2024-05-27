const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext")

    const streamStartFacadesMap = new Map()
    ipcMain.handle("cancel-StartFacades", handlerHelper.cancelHandler(streamStartFacadesMap))
    ipcMain.handle("StartFacades", (e, params, token) => {
        let stream = getClient().StartFacades(params)
        handlerHelper.registerHandler(win, stream, streamStartFacadesMap, token)
    })
    const streamStartFacadesWithYsoObjectMap = new Map()
    ipcMain.handle("cancel-StartFacadesWithYsoObject", handlerHelper.cancelHandler(streamStartFacadesWithYsoObjectMap))
    ipcMain.handle("StartFacadesWithYsoObject", (e, params, token) => {
        let stream = getClient().StartFacadesWithYsoObject(params)
        handlerHelper.registerHandler(win, stream, streamStartFacadesWithYsoObjectMap, token)
    })

    let globalConfigServer = null
    ipcMain.handle("get-global-reverse-server-status", (e) => {
        return !!globalConfigServer
    })
    ipcMain.handle("cancel-global-reverse-server-status", (e) => {
        if (globalConfigServer) {
            globalConfigServer.cancel()
            console.info("Cancel Global Reverse Conn Config")
            globalConfigServer = null
        }
    })
    ipcMain.handle("ConfigGlobalReverse", (e, params) => {
        if (globalConfigServer) {
            console.info("Global Reverse Conn Config Exists")
            // Config Local IP Usually
            let stream = getClient().ConfigGlobalReverse(params)
            setTimeout(() => stream.cancel(), 3000)
            return
        }
        console.info("Start Global Reverse Conn Config")
        globalConfigServer = getClient().ConfigGlobalReverse(params)
        globalConfigServer.on("data", (data) => {
            if (!win) {
                return
            }
            win.webContents.send(`global-reverse-data`, data)
        })
        globalConfigServer.on("error", (error) => {
            if (!win) {
                return
            }
            console.info("Global Reverse Conn Config Failed")
            /** Closure or Unexpected Shutdown Triggers This Listener Event */
            // console.info(error)
            win.webContents.send(`global-reverse-error`, error && error.details)
        })
        globalConfigServer.on("end", () => {
            console.info("Global Reverse Conn Config Done, Cache Cleared")
            globalConfigServer = null
            if (!win) {
                return
            }
            win.webContents.send(`global-reverse-end`)
        })
    })

    // asyncAvailableLocalAddr wrapper
    const asyncAvailableLocalAddr = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AvailableLocalAddr(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AvailableLocalAddr", async (e, params) => {
        return await asyncAvailableLocalAddr(params)
    })

    // asyncGetGlobalReverseServer wrapper
    const asyncGetGlobalReverseServer = (params) => {
        return new Promise((resolve, reject) => {
            try {
                getClient().GetGlobalReverseServer(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            } catch (e) {
                reject(e)
            }
        })
    }
    ipcMain.handle("GetGlobalReverseServer", async (e, params) => {
        return await asyncGetGlobalReverseServer(params)
    })

    // asyncSetYakBridgeLogServer wrapper
    const asyncSetYakBridgeLogServer = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetYakBridgeLogServer(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetYakBridgeLogServer", async (e, params) => {
        return await asyncSetYakBridgeLogServer(params)
    })
}
