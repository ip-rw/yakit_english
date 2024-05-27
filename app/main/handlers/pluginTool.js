const { ipcMain } = require("electron")
const { USER_INFO } = require("../state")
const handlerHelper = require("./handleStreamWithContext")

module.exports = (win, getClient) => {
    const asyncSetOnlineProfile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetOnlineProfile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Set Private Domain
    ipcMain.handle("SetOnlineProfile", async (e, params) => {
        return await asyncSetOnlineProfile(params)
    })
    const asyncGetOnlineProfile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetOnlineProfile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Get Private Domain
    ipcMain.handle("GetOnlineProfile", async (e, params) => {
        return await asyncGetOnlineProfile(params)
    })
    const asyncDownloadOnlinePluginById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                if (params.OnlineID && params.UUID) win.webContents.send("ref-plugin-operator", { pluginOnlineId: params.OnlineID, pluginUUID: params.UUID })
                resolve(data)
            })
        })
    }
    // Download Plugin
    ipcMain.handle("DownloadOnlinePluginById", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginById(params)
    })

    const asyncDownloadOnlinePluginBatch = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginBatch(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // New-Download Plugin
    ipcMain.handle("DownloadOnlinePluginBatch", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginBatch(params)
    })

    // New-Download All Plugins, Add All
    const streamDownloadOnlinePluginsAll = new Map()
    ipcMain.handle("cancel-DownloadOnlinePlugins", handlerHelper.cancelHandler(streamDownloadOnlinePluginsAll))
    ipcMain.handle("DownloadOnlinePlugins", async (e, params, token) => {
        params.Token = USER_INFO.token
        let stream = getClient().DownloadOnlinePlugins(params)
        handlerHelper.registerHandler(win, stream, streamDownloadOnlinePluginsAll, token)
    })

    const asyncDownloadOnlinePluginByPluginName = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginByPluginName(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // New-Download Plugin by Name
    ipcMain.handle("DownloadOnlinePluginByPluginName", async (e, params) => {
        params.Token = USER_INFO.token
        return await asyncDownloadOnlinePluginByPluginName(params)
    })

    const asyncDeletePluginByUserID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePluginByUserID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Delete Plugin
    ipcMain.handle("DeletePluginByUserID", async (e, params) => {
        return await asyncDeletePluginByUserID(params)
    })
    const asyncDeleteAllLocalPlugins = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllLocalPlugins(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Delete Local Plugin Temporarily Deprecated
    ipcMain.handle("DeleteAllLocalPlugins", async (e, params) => {
        return await asyncDeleteAllLocalPlugins(params)
    })
    const asyncGetYakScriptByOnlineID = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptByOnlineID(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //Query Local Plugin Data by OnlineID
    ipcMain.handle("GetYakScriptByOnlineID", async (e, params) => {
        return await asyncGetYakScriptByOnlineID(params)
    })

    const asyncQueryYakScriptLocalAndUser = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptLocalAndUser(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //Get All Uploadable Plugins by OnlineBaseUrl & UserId
    ipcMain.handle("QueryYakScriptLocalAndUser", async (e, params) => {
        return await asyncQueryYakScriptLocalAndUser(params)
    })

    const asyncQueryYakScriptByOnlineGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptByOnlineGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //Query by OnlineGroup
    ipcMain.handle("QueryYakScriptByOnlineGroup", async (e, params) => {
        return await asyncQueryYakScriptByOnlineGroup(params)
    })

    const asyncQueryYakScriptLocalAll = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptLocalAll(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    //Enterprise Admin Get All Uploadable Plugins
    ipcMain.handle("QueryYakScriptLocalAll", async (e, params) => {
        return await asyncQueryYakScriptLocalAll(params)
    })

    const asyncGetYakScriptTagsAndType = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptTagsAndType(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Statistics
    ipcMain.handle("GetYakScriptTagsAndType", async (e, params) => {
        return await asyncGetYakScriptTagsAndType(params)
    })


    const asyncDeleteLocalPluginsByWhere = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteLocalPluginsByWhere(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Conditional Delete Local Plugin
    ipcMain.handle("DeleteLocalPluginsByWhere", async (e, params) => {
        return await asyncDeleteLocalPluginsByWhere(params)
    })

    const asyncQueryYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Get Plugin Group Data
    ipcMain.handle("QueryYakScriptGroup", async (e, params) => {
        return await asyncQueryYakScriptGroup(params)
    })

    const asyncRenameYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenameYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Rename Plugin Group
    ipcMain.handle("RenameYakScriptGroup", async (e, params) => {
        return await asyncRenameYakScriptGroup(params)
    })

    const asyncDeleteYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Delete Plugin Group
    ipcMain.handle("DeleteYakScriptGroup", async (e, params) => {
        return await asyncDeleteYakScriptGroup(params)
    })

    const asyncGetYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Get Plugin's Current Group & Other Groups
    ipcMain.handle("GetYakScriptGroup", async (e, params) => {
        return await asyncGetYakScriptGroup(params)
    })

    const asyncSaveYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Update Plugin Group & Add New Group
    ipcMain.handle("SaveYakScriptGroup", async (e, params) => {
        return await asyncSaveYakScriptGroup(params)
    })

    const asyncResetYakScriptGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetYakScriptGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Reset Plugin Group to Online
    ipcMain.handle("ResetYakScriptGroup", async (e, params) => {
        return await asyncResetYakScriptGroup(params)
    })
}
