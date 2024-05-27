const {ipcMain} = require("electron")
const handlerHelper = require("./handleStreamWithContext")
const {USER_INFO} = require("../state")

module.exports = (win, getClient) => {
    // get plugins risk list
    const asyncGetRiskList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YakScriptRiskTypeList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PluginsGetRiskList", async (e, params) => {
        return await asyncGetRiskList(params)
    })

    // get plugins risk info
    const asyncGetRiskInfo = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptRiskDetailByCWE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PluginsGetRiskInfo", async (e, params) => {
        return await asyncGetRiskInfo(params)
    })

    // save local plugin
    const asyncSaveLocalPlugin = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveNewYakScript(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveNewYakScript", async (e, params) => {
        return await asyncSaveLocalPlugin(params)
    })

    // Batch Plugin Upload
    const streamSaveYakScriptToOnline = new Map()
    ipcMain.handle("cancel-SaveYakScriptToOnline", handlerHelper.cancelHandler(streamSaveYakScriptToOnline))
    ipcMain.handle("SaveYakScriptToOnline", async (e, params, token) => {
        params.Token = USER_INFO.token || ""
        let stream = getClient().SaveYakScriptToOnline(params)
        handlerHelper.registerHandler(win, stream, streamSaveYakScriptToOnline, token)
    })

    const streamSmokingEvaluatePluginBatch = new Map()
    ipcMain.handle("cancel-SmokingEvaluatePluginBatch", handlerHelper.cancelHandler(streamSmokingEvaluatePluginBatch))
    ipcMain.handle("SmokingEvaluatePluginBatch", async (e, params, token) => {
        let stream = getClient().SmokingEvaluatePluginBatch(params)
        handlerHelper.registerHandler(win, stream, streamSmokingEvaluatePluginBatch, token)
    })

    // Batch Local Plugin Import
    let importYakScriptStream
    ipcMain.handle("ImportYakScript", async (e, params) => {
        importYakScriptStream = getClient().ImportYakScript(params)

        importYakScriptStream.on("data", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("import-yak-script-data", e)
        })
        importYakScriptStream.on("error", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("import-yak-script-error", e)
        })
        importYakScriptStream.on("end", () => {
            importYakScriptStream.cancel()
            importYakScriptStream = null
            if (!win) {
                return
            }
            win.webContents.send("import-yak-script-end")
        })
    })
    ipcMain.handle("cancel-importYakScript", async () => {
        if (importYakScriptStream) importYakScriptStream.cancel()
    })

    // Batch Export Local Plugins
    let exportYakScriptStream
    ipcMain.handle("ExportLocalYakScriptStream", async (e, params) => {
        exportYakScriptStream = getClient().ExportLocalYakScriptStream(params)
        exportYakScriptStream.on("data", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("export-yak-script-data", e)
        })
        exportYakScriptStream.on("error", (e) => {
            if (!win) {
                return
            }
            win.webContents.send("export-yak-script-error", e)
        })
        exportYakScriptStream.on("end", () => {
            exportYakScriptStream.cancel()
            exportYakScriptStream = null
            if (!win) {
                return
            }
            win.webContents.send("export-yak-script-end")
        })
    })
    ipcMain.handle("cancel-exportYakScript", async () => {
        if (exportYakScriptStream) exportYakScriptStream.cancel()
    })

    // Check if Plugin Has Legacy Data for Migration Prompt
    const asyncYaklangGetCliCodeFromDatabase = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YaklangGetCliCodeFromDatabase(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YaklangGetCliCodeFromDatabase", async (e, params) => {
        return await asyncYaklangGetCliCodeFromDatabase(params)
    })

    // Code to Parameters & Risk
    const asyncYaklangInspectInformation = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YaklangInspectInformation(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YaklangInspectInformation", async (e, params) => {
        return await asyncYaklangInspectInformation(params)
    })
}
