const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
module.exports = (win, getClient) => {
    const asyncQueryPayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Fetch Table List
    ipcMain.handle("QueryPayload", async (e, params) => {
        return await asyncQueryPayload(params)
    })

    const asyncQueryPayloadFromFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPayloadFromFile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    // Get Editor Content
    ipcMain.handle("QueryPayloadFromFile", async (e, params) => {
        return await asyncQueryPayloadFromFile(params)
    })

    const asyncUpdateAllPayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateAllPayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Update Order Array
    ipcMain.handle("UpdateAllPayloadGroup", async (e, params) => {
        return await asyncUpdateAllPayloadGroup(params)
    })

    const asyncRenamePayloadFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenamePayloadFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Rename Folder
    ipcMain.handle("RenamePayloadFolder", async (e, params) => {
        return await asyncRenamePayloadFolder(params)
    })

    const asyncRenamePayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenamePayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Rename Payload
    ipcMain.handle("RenamePayloadGroup", async (e, params) => {
        return await asyncRenamePayloadGroup(params)
    })

    const asyncCreatePayloadFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreatePayloadFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Create Folder
    ipcMain.handle("CreatePayloadFolder", async (e, params) => {
        return await asyncCreatePayloadFolder(params)
    })

    const asyncDeletePayloadByFolder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayloadByFolder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Delete Folder
    ipcMain.handle("DeletePayloadByFolder", async (e, params) => {
        return await asyncDeletePayloadByFolder(params)
    })

    const asyncDeletePayloadByGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayloadByGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Delete Payload
    ipcMain.handle("DeletePayloadByGroup", async (e, params) => {
        return await asyncDeletePayloadByGroup(params)
    })

    // message DeletePayloadByIdRequest {
    //     int64 Id = 1; // For Deleting One
    //     repeated int64 Ids = 2; // Delete Multiple
    //   }
    // asyncDeletePayload wrapper
    const asyncDeletePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePayload", async (e, params) => {
        return await asyncDeletePayload(params)
    })

    const handlerHelper = require("./handleStreamWithContext")

    // Database Storage
    const streamPayloadMap = new Map()
    ipcMain.handle("cancel-SavePayload", handlerHelper.cancelHandler(streamPayloadMap))
    ipcMain.handle("SavePayloadStream", (e, params, token) => {
        let stream = getClient().SavePayloadStream(params)
        handlerHelper.registerHandler(win, stream, streamPayloadMap, token)
    })

    // File Storage
    const streamPayloadFileMap = new Map()
    ipcMain.handle("cancel-SavePayloadFile", handlerHelper.cancelHandler(streamPayloadFileMap))
    ipcMain.handle("SavePayloadToFileStream", (e, params, token) => {
        let stream = getClient().SavePayloadToFileStream(params)
        handlerHelper.registerHandler(win, stream, streamPayloadFileMap, token)
    })

    // For Export
    const streamPayloadFromFileMap = new Map()
    ipcMain.handle("cancel-ExportAllPayloadFromFile", handlerHelper.cancelHandler(streamPayloadFromFileMap))
    ipcMain.handle("ExportAllPayloadFromFile", async (e, params, token) => {
        let stream = getClient().ExportAllPayloadFromFile(params)
        handlerHelper.registerHandler(win, stream, streamPayloadFromFileMap, token)
    })
    const streamAllPayloadMap = new Map()
    ipcMain.handle("cancel-ExportAllPayload", handlerHelper.cancelHandler(streamAllPayloadMap))
    ipcMain.handle("ExportAllPayload", async (e, params, token) => {
        let stream = getClient().ExportAllPayload(params)
        handlerHelper.registerHandler(win, stream, streamAllPayloadMap, token)
    })

    // For Deduplication
    const streamRemoveDuplicateMap = new Map()
    ipcMain.handle("cancel-RemoveDuplicatePayloads", handlerHelper.cancelHandler(streamRemoveDuplicateMap))
    ipcMain.handle("RemoveDuplicatePayloads", async (e, params, token) => {
        let stream = getClient().RemoveDuplicatePayloads(params)
        handlerHelper.registerHandler(win, stream, streamRemoveDuplicateMap, token)
    })

    // Convert to DB Save
    const streamGroupToDatabaseMap = new Map()
    ipcMain.handle("cancel-ConvertPayloadGroupToDatabase", handlerHelper.cancelHandler(streamGroupToDatabaseMap))
    ipcMain.handle("ConvertPayloadGroupToDatabase", async (e, params, token) => {
        let stream = getClient().ConvertPayloadGroupToDatabase(params)
        handlerHelper.registerHandler(win, stream, streamGroupToDatabaseMap, token)
    })

    // Migrate Data
    const streamMigratePayloadsMap = new Map()
    ipcMain.handle("cancel-MigratePayloads", handlerHelper.cancelHandler(streamMigratePayloadsMap))
    ipcMain.handle("MigratePayloads", async (e, params, token) => {
        let stream = getClient().MigratePayloads(params)
        handlerHelper.registerHandler(win, stream, streamMigratePayloadsMap, token)
    })

    const asyncUpdatePayload = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayload(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Backup to Other Dict/Modify Table Item
    ipcMain.handle("UpdatePayload", async (e, params) => {
        return await asyncUpdatePayload(params)
    })

    const asyncBackUpOrCopyPayloads = (params) => {
        return new Promise((resolve, reject) => {
            getClient().BackUpOrCopyPayloads(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Move/Copy to Other Dict
    ipcMain.handle("BackUpOrCopyPayloads", async (e, params) => {
        return await asyncBackUpOrCopyPayloads(params)
    })

    const asyncGetAllPayloadGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllPayloadGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Fetch Payload List
    ipcMain.handle("GetAllPayloadGroup", async (e, params) => {
        return await asyncGetAllPayloadGroup(params)
    })

    const asyncUpdatePayloadToFile = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdatePayloadToFile(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Update File Content
    ipcMain.handle("UpdatePayloadToFile", async (e, params) => {
        return await asyncUpdatePayloadToFile(params)
    })

    const asyncYakVersionAtLeast = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YakVersionAtLeast(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // Verify Version
    ipcMain.handle("YakVersionAtLeast", async (e, params) => {
        return await asyncYakVersionAtLeast(params)
    })
}
