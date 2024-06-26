const {ipcMain} = require("electron")

module.exports = {
    register: (win, getClient) => {
        // asyncRequireDNSLogDomain wrapper
        const asyncRequireDNSLogDomain = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireDNSLogDomain(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireDNSLogDomain", async (e, params) => {
            return await asyncRequireDNSLogDomain(params)
        })

        const asyncRequireDNSLogDomainByScript = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireDNSLogDomainByScript(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireDNSLogDomainByScript", async (e, params) => {
            return await asyncRequireDNSLogDomainByScript(params)
        })

        // asyncQuerySupportedDnsLogPlatforms wrapper
        const asyncQuerySupportedDnsLogPlatforms = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QuerySupportedDnsLogPlatforms(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QuerySupportedDnsLogPlatforms", async (e, params) => {
            return await asyncQuerySupportedDnsLogPlatforms(params)
        })


        // asyncQueryDNSLogByToken wrapper
        const asyncQueryDNSLogByToken = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryDNSLogByToken(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryDNSLogByToken", async (e, params) => {
            return await asyncQueryDNSLogByToken(params)
        })

        const asyncQueryDNSLogTokenByScript = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryDNSLogTokenByScript(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryDNSLogTokenByScript", async (e, params) => {
            return await asyncQueryDNSLogTokenByScript(params)
        })

        // dnslog-Page Asks If Menu Enabled & Fetches Params
        ipcMain.handle("dnslog-page-to-menu", async (e) => {
            win.webContents.send("dnslog-page-to-menu-callback")
            return
        })
        // dnslog-Menu Sends Params to Page
        ipcMain.handle("dnslog-menu-to-page", async (e, params) => {
            win.webContents.send("dnslog-menu-to-page-callback", params)
            return
        })
        // dnslog-Page Modifies Params & Syncs Menu Params
        ipcMain.handle("dnslog-page-change-menu", async (e, params) => {
            win.webContents.send("dnslog-page-change-menu-callback", params)
            return
        })
        // dnslog-Menu Click Details Page Redirect
        ipcMain.handle("dnslog-info-details", async (e, params) => {
            win.webContents.send("dnslog-info-details-callback", params)
            return
        })

        // asyncQueryICMPTrigger wrapper
        const asyncQueryICMPTrigger = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryICMPTrigger(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryICMPTrigger", async (e, params) => {
            return await asyncQueryICMPTrigger(params)
        })

        // asyncRequireICMPRandomLength wrapper
        const asyncRequireICMPRandomLength = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireICMPRandomLength(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireICMPRandomLength", async (e, params) => {
            return await asyncRequireICMPRandomLength(params)
        })

        // asyncRequireRandomPortToken wrapper
        const asyncRequireRandomPortToken = (params) => {
            return new Promise((resolve, reject) => {
                getClient().RequireRandomPortToken(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("RequireRandomPortToken", async (e, params) => {
            return await asyncRequireRandomPortToken(params)
        })

        // asyncQueryRandomPortTrigger wrapper
        const asyncQueryRandomPortTrigger = (params) => {
            return new Promise((resolve, reject) => {
                getClient().QueryRandomPortTrigger(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("QueryRandomPortTrigger", async (e, params) => {
            return await asyncQueryRandomPortTrigger(params)
        })
    }
}
