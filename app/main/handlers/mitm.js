const { ipcMain } = require("electron");
const DNS = require("dns");


// module.exports = (win, originGetClient) => {
module.exports = (win, getClient) => {
    let stream;
    let currentPort;
    let currentHost;
    let currentDownstreamProxy;
    // Recover hijacking MITM state
    ipcMain.handle("mitm-have-current-stream", e => {
        return {
            haveStream: !!stream,
            host: currentHost,
            port: currentPort,
            downstreamProxy: currentDownstreamProxy,
        };
    })

    // Send session resume info for context return
    ipcMain.handle("mitm-recover", e => {
        if (stream) {
            stream.write({
                recover: true,
            })
        }
    });

    // Send session resume info for context return
    ipcMain.handle("mitm-reset-filter", e => {
        if (stream) {
            stream.write({
                setResetFilter: true,
            })
        }
    });

    //
    ipcMain.handle("mitm-auto-forward", (e, value) => {
        if (stream) {
            stream.write({ setAutoForward: true, autoForwardValue: value })
        }
    })

    // Discard message
    ipcMain.handle("mitm-drop-request", (e, id) => {
        if (stream) {
            stream.write({
                id,
                drop: true,
            })
        }
    })

    // Discard response
    ipcMain.handle("mitm-drop-response", (e, id) => {
        if (stream) {
            stream.write({
                responseId: id,
                drop: true,
            })
        }
    })

    // Forward as-is
    ipcMain.handle("mitm-forward-response", (e, id) => {
        if (stream) {
            stream.write({
                responseId: id,
                forward: true,
            })
        }
    })

    // Forward request as-is
    ipcMain.handle("mitm-forward-request", (e, id) => {
        if (stream) {
            stream.write({
                id: id,
                forward: true,
            })
        }
    })

    // Send message to hijack current request
    ipcMain.handle("mitm-hijacked-current-response", (e, id, should) => {
        if (stream) {
            if (should) {
                stream.write({
                    id: id,
                    hijackResponse: true,
                })
            } else {
                stream.write({
                    id: id,
                    cancelhijackResponse: true,
                })
            }
        }
    })


    ipcMain.handle("mitm-enable-plugin-mode", (e, initPluginNames) => {
        if (stream) {
            stream.write({
                setPluginMode: true,
                initPluginNames,
            })
        }
    })

    // Close MITM hijacking stream
    ipcMain.handle("mitm-close-stream", e => {
        if (stream) {
            stream.cancel()
            stream = null;
        }
    })

    // MITM forwarding
    ipcMain.handle("mitm-forward-modified-request", (e, request, id, tags) => {
        if (stream) {
            stream.write({
                id,
                request: Buffer.from(request),
                Tags: tags
            })
        }
    })
    // MITM forwarding - HTTP response
    ipcMain.handle("mitm-forward-modified-response", (e, response, id) => {
        if (stream) {
            stream.write({
                responseId: id,
                response: response,
            })
        }
    })

    // MITM enable plugin
    ipcMain.handle("mitm-exec-script-content", (e, content) => {
        if (stream) {
            stream.write({
                setYakScript: true,
                yakScriptContent: content,
            })
        }
    })

    // MITM enable plugin by ID
    ipcMain.handle("mitm-exec-script-by-id", (e, id, params) => {
        if (stream) {
            stream.write({
                setYakScript: true,
                yakScriptID: `${id}`,
                yakScriptParams: params,
            })
        }
    })

    // MITM get enabled plugins
    ipcMain.handle("mitm-get-current-hook", (e, id, params) => {
        if (stream) {
            stream.write({
                getCurrentHook: true,
            })
        }
    })

    // MITM remove plugin
    ipcMain.handle("mitm-remove-hook", (e, params) => {
        if (stream) {
            stream.write({
                removeHook: true,
                removeHookParams: params,
            })
        }
    })

    // Set filter
    ipcMain.handle("mitm-filter", (e, filter) => {
        if (stream) {
            stream.write(filter)
        }
    })

    // Set regex replace
    ipcMain.handle("mitm-content-replacers", (e, filter) => {
        if (stream) {
            stream.write({ ...filter, setContentReplacers: true })
        }
    })

    // Clear MITM plugin cache
    ipcMain.handle("mitm-clear-plugin-cache", () => {
        if (stream) {
            stream.write({
                setClearMITMPluginContext: true,
            })
        }
    })

    // Filter ws
    ipcMain.handle("mitm-filter-websocket", (e, filterWebsocket) => {
        if (stream) {
            stream.write({
                filterWebsocket,
                updateFilterWebsocket: true
            })
        }
    })

    // Downstream proxy
    ipcMain.handle("mitm-set-downstream-proxy", (e, downstreamProxy) => {
        if (stream) {
            stream.write({
                downstreamProxy
            })
        }
    })

    // Start MITM call, set stream
    let isFirstData = true
    ipcMain.handle("mitm-start-call", (e, host, port, downstreamProxy, enableHttp2, certificates, extra) => {
        if (stream) {
            if (win) {
                win.webContents.send("client-mitm-start-success")
            }
            return
        }

        isFirstData = true;
        stream = getClient().MITM();
        // Set callback for server messages
        stream.on("data", data => {
            // Process first message
            // The input you've provided does not seem to contain non-English text requiring translation. Could you please provide the Chinese text that you need translated into English, so I may assist you accurately?。。。
            if (win && isFirstData) {
                isFirstData = false;
                win.webContents.send("client-mitm-start-success")
            }

            // MITM controls client load state
            if (win && data["haveLoadingSetter"]) {
                win.webContents.send("client-mitm-loading", !!(data["loadingFlag"]))
            }

            // MITM server sends client prompt
            if (win && data["haveNotification"]) {
                win.webContents.send("client-mitm-notification", data["notificationContent"])
            }

            // Check substitution rule issues, no BUG if not empty
            if (win && (data?.replacers || []).length > 0) {
                win.webContents.send("client-mitm-content-replacer-update", data)
            }

            // Trigger force update here
            if (win && data?.justContentReplacer) {
                win.webContents.send("client-mitm-content-replacer-update", data)
            }

            // Check if exec result, correspond field should be
            if (win && data["haveMessage"]) {
                win.webContents.send("client-mitm-message", data["message"]);
                return
            }

            // Check current system hooks
            if (win && data["getCurrentHook"]) {
                win.webContents.send("client-mitm-hooks", data["hooks"])
                return
            }

            // Auto-update HTTP Flow table
            if (win && data.refresh) {
                win.webContents.send("client-mitm-history-update", data)
                return
            }

            // Send hijacked info to frontend
            if (win) {
                if (data.justFilter) {
                    win.webContents.send("client-mitm-filter", { ...data })
                    return
                }
                if (data.id == "0" && data.responseId == "0") return
                win.webContents.send("client-mitm-hijacked", { ...data })
            }
        })
        stream.on("error", (err) => {
            stream = null
            if (err.code && win) {
                switch (err.code) {
                    case 1:
                        win.webContents.send("client-mitm-error", "")
                        return;
                    default:
                        win.webContents.send("client-mitm-error", err.details || `${err}`)
                        return;
                }
            }
        })
        stream.on("end", () => {
            if (stream) {
                stream.cancel()
            }
            stream = undefined
        })
        currentHost = host
        currentPort = port
        currentDownstreamProxy = downstreamProxy
        if (stream) {
            stream.write({
                host, port, downstreamProxy,
                enableHttp2, certificates,
                ...extra,
            })
        }
    })
    ipcMain.handle("mitm-stop-call", () => {
        if (stream) {
            stream.cancel()
            stream = null;
            mitmClient = null;
        }
    })

    // const asyncFetchHostIp = (params) => {
    //     return new Promise((resolve, reject) => {
    //         DNS.lookup(params, function (err, address) {
    //             if (err) {
    //                 reject(err)
    //                 return
    //             }
    //             resolve(address)
    //         });
    //     })
    // }
    // Get URL IP address
    // ipcMain.handle("fetch-url-ip", async (e, params) => {
    //     return await asyncFetchHostIp(params)
    // })

    // asyncDownloadMITMCert wrapper
    const asyncDownloadMITMCert = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadMITMCert(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DownloadMITMCert", async (e, params) => {
        return await asyncDownloadMITMCert(params)
    })

    // asyncExportMITMReplacerRules wrapper
    const asyncExportMITMReplacerRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportMITMReplacerRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportMITMReplacerRules", async (e, params) => {
        return await asyncExportMITMReplacerRules(params)
    })

    // asyncImportMITMReplacerRules wrapper
    const asyncImportMITMReplacerRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportMITMReplacerRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ImportMITMReplacerRules", async (e, params) => {
        return await asyncImportMITMReplacerRules(params)
    })

    // asyncGetCurrentRules wrapper
    const asyncGetCurrentRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetCurrentRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetCurrentRules", async (e, params) => {
        return await asyncGetCurrentRules(params)
    })

    // asyncSetCurrentRules wrapper
    const asyncSetCurrentRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetCurrentRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetCurrentRules", async (e, params) => {
        return await asyncSetCurrentRules(params)
    })

    // Set MITM filter
    const asyncSetMITMFilter = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetMITMFilter(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve(data)
            })
        })
    }

    ipcMain.handle("mitm-set-filter", async (e, params) => {
        if (stream) {
            stream.write({ ...params, updateFilter: true })
        }
        return await asyncSetMITMFilter(params)
    })
    // Get MITM filter
    const asyncGetMITMFilter = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetMITMFilter(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve(data)
            })
        })
    }
    ipcMain.handle("mitm-get-filter", async (e, params) => {
        return await asyncGetMITMFilter(params)
    })
    // Proxy interception
    const asyncGenerateURL = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateURL(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve(data)
            })
        })
    }
    ipcMain.handle("mitm-agent-hijacking-config", async (e, params) => {
        return await asyncGenerateURL(params)
    })
}
