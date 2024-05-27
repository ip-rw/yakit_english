const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    // asyncAddToMenu wrapper
    const asyncAddToMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddToMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddToMenu", async (e, params) => {
        return await asyncAddToMenu(params)
    })

    // asyncRemoveFromMenu wrapper
    const asyncRemoveFromMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RemoveFromMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RemoveFromMenu", async (e, params) => {
        return await asyncRemoveFromMenu(params)
    })

    // asyncYakScriptIsInMenu wrapper
    const asyncYakScriptIsInMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().YakScriptIsInMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("YakScriptIsInMenu", async (e, params) => {
        return await asyncYakScriptIsInMenu(params)
    })

    // asyncGetAllMenuItem wrapper
    const asyncGetAllMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllMenuItem", async (e, params) => {
        return await asyncGetAllMenuItem(params)
    })

    // asyncGetMenuItemById wrapper
    const asyncGetMenuItemById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMenuItemById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetMenuItemById", async (e, params) => {
        return await asyncGetMenuItemById(params)
    })

    // asyncQueryGroupsByYakScriptId wrapper
    const asyncQueryGroupsByYakScriptId = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryGroupsByYakScriptId(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryGroupsByYakScriptId", async (e, params) => {
        return await asyncQueryGroupsByYakScriptId(params)
    })

    // asyncDeleteAllMenuItem wrapper
    const asyncDeleteAllMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteAllMenuItem", async (e, params) => {
        return await asyncDeleteAllMenuItem(params)
    })

    // asyncImportMenuItem wrapper
    const asyncImportMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ImportMenuItem", async (e, params) => {
        return await asyncImportMenuItem(params)
    })

    // asyncExportMenuItem wrapper
    const asyncExportMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportMenuItem", async (e, params) => {
        return await asyncExportMenuItem(params)
    })

    // Add or Edit All Menus
    const asyncAddMenus = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddMenus(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddMenus", async (e, params) => {
        return await asyncAddMenus(params)
    })

    // Query All Menus
    const asyncQueryAllMenuItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAllMenuItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAllMenuItem", async (e, params) => {
        return await asyncQueryAllMenuItem(params)
    })

    // Query All Menus
    const asyncDownloadOnlinePluginByScriptNames = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadOnlinePluginByScriptNames(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DownloadOnlinePluginByScriptNames", async (e, params) => {
        return await asyncDownloadOnlinePluginByScriptNames(params)
    })

    // Delete All Menus
    const asyncDeleteAllMenu = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllMenu(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteAllMenu", async (e, params) => {
        return await asyncDeleteAllMenu(params)
    })

    // Retrieve Menu Data from DB
    const asyncGetAllNavigationItem = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllNavigationItem(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllNavigationItem", async (e, params) => {
        return await asyncGetAllNavigationItem(params)
    })

    // Update Menu Data in DB
    const asyncAddToNavigation = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddToNavigation(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddToNavigation", async (e, params) => {
        return await asyncAddToNavigation(params)
    })

    // Delete Menu Data from DB
    const asyncDeleteAllNavigation = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteAllNavigation(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteAllNavigation", async (e, params) => {
        return await asyncDeleteAllNavigation(params)
    })

    // Add Single Menu Item
    const asyncAddOneNavigation = (params) => {
        return new Promise((resolve, reject) => {
            getClient().AddOneNavigation(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("AddOneNavigation", async (e, params) => {
        return await asyncAddOneNavigation(params)
    })

    // Query All Primary Menu Items
    const asyncQueryNavigationGroups = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNavigationGroups(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryNavigationGroups", async (e, params) => {
        return await asyncQueryNavigationGroups(params)
    })
}
