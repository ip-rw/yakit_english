const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")

module.exports = (win, getClient) => {
    // asyncQueryPorts wrapper
    const asyncQueryPorts = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPorts(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPorts", async (e, params) => {
        return await asyncQueryPorts(params)
    })

    // asyncDeletePorts wrapper
    const asyncDeletePorts = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePorts(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePorts", async (e, params) => {
        return await asyncDeletePorts(params)
    })

    // asyncGenerateWebsiteTree wrapper
    const asyncGenerateWebsiteTree = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateWebsiteTree(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateWebsiteTree", async (e, params) => {
        return await asyncGenerateWebsiteTree(params)
    })

    // asyncQueryDomains wrapper
    const asyncQueryDomains = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryDomains(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryDomains", async (e, params) => {
        return await asyncQueryDomains(params)
    })

    // asyncQueryDomains wrapper
    const asyncDeleteDomains = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteDomains(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteDomains", async (e, params) => {
        return await asyncDeleteDomains(params)
    })

    // asyncQueryDomains wrapper
    const asyncQueryPortsGroup = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPortsGroup(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPortsGroup", async (e, params) => {
        return await asyncQueryPortsGroup(params)
    })

    // asyncQueryRisks wrapper
    const asyncQueryRisks = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRisks(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRisks", async (e, params) => {
        return await asyncQueryRisks(params)
    })

    // asyncQueryRisk wrapper
    const asyncQueryRisk = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRisk(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRisk", async (e, params) => {
        return await asyncQueryRisk(params)
    })

    // asyncDeleteRisk wrapper
    const asyncDeleteRisk = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteRisk(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteRisk", async (e, params) => {
        return await asyncDeleteRisk(params)
    })

    // asyncQueryAvailableRiskType wrapper
    const asyncQueryAvailableRiskType = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableRiskType(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableRiskType", async (e, params) => {
        return await asyncQueryAvailableRiskType(params)
    })

    // asyncQueryAvailableRiskLevel wrapper
    const asyncQueryAvailableRiskLevel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableRiskLevel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableRiskLevel", async (e, params) => {
        return await asyncQueryAvailableRiskLevel(params)
    })

    // asyncQueryRiskTableStats wrapper
    const asyncQueryRiskTableStats = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryRiskTableStats(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryRiskTableStats", async (e, params) => {
        return await asyncQueryRiskTableStats(params)
    })

    // asyncResetRiskTableStats wrapper
    const asyncResetRiskTableStats = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ResetRiskTableStats(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ResetRiskTableStats", async (e, params) => {
        return await asyncResetRiskTableStats(params)
    })

    /** Get latest risk and vulnerability data */
    const asyncFetchLatestRisk = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryNewRisk(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("fetch-latest-risk-info", async (e, params) => {
        return await asyncFetchLatestRisk(params)
    })

    const asyncSetRiskInfoRead = (params) => {
        return new Promise((resolve, reject) => {
            getClient().NewRiskRead(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    /** Copy single item/Mark all risk data as read */
    ipcMain.handle("set-risk-info-read", async (e, params) => {
        return await asyncSetRiskInfoRead(params)
    })

    const asyncUploadRiskToOnline = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UploadRiskToOnline(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    /** Sync data */
    ipcMain.handle("upload-risk-to-online", async (e, params) => {
        return await asyncUploadRiskToOnline(params)
    })

    // asyncDeleteHistoryHTTPFuzzerTask wrapper
    const asyncDeleteHistoryHTTPFuzzerTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteHistoryHTTPFuzzerTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteHistoryHTTPFuzzerTask", async (e, params) => {
        return await asyncDeleteHistoryHTTPFuzzerTask(params)
    })

    // asyncQueryReports wrapper
    const asyncQueryReports = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReports(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReports", async (e, params) => {
        return await asyncQueryReports(params)
    })

    // asyncQueryReport wrapper
    const asyncQueryReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReport", async (e, params) => {
        return await asyncQueryReport(params)
    })

    // If folder exists, clear previous content
    const copyFileByDir = (src1, src2) => {
        return new Promise((resolve, reject) => {
            fs.readFile(src1, (err, data) => {
                if (err) return reject(err)
                fs.writeFile(src2, data, (err) => {
                    if (err) return reject(err)
                    resolve("Copy file succeeded")
                })
            })
        })
    }

    // Delete all files in folder
    const delDir = (path) => {
        let files = []
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path)
            files.forEach((file, index) => {
                let curPath = path + "/" + file
                if (fs.statSync(curPath).isDirectory()) {
                    delDir(curPath) //Recursively delete folder
                } else {
                    fs.unlinkSync(curPath) //Delete file
                }
            })
            fs.rmdirSync(path)
        }
    }

    const asyncDownloadHtmlReport = (params) => {
        return new Promise(async (resolve, reject) => {
            const {outputDir, JsonRaw, reportName} = params
            const inputFile = path.join(htmlTemplateDir, "template.zip")
            const outputFile = path.join(outputDir, "template.zip")
            const reportNameFile = reportName.replaceAll(/\\|\/|\:|\*|\?|\"|\<|\>|\|/g, "") || "HTML report"
            // Check if report name exists
            const ReportItemName = path.join(outputDir, reportNameFile)
            const judgeReportName = fs.existsSync(ReportItemName)
            let isCreatDir = false
            try {
                // Copy template to output directory
                await copyFileByDir(inputFile, outputFile)
                // Delete file
                if (judgeReportName) delDir(ReportItemName)
                if (!judgeReportName) {
                    fs.mkdirSync(ReportItemName)
                    isCreatDir = true
                }
                // Unzip template
                await compressing.zip.uncompress(outputFile, ReportItemName)
                // Delete zip
                fs.unlinkSync(outputFile)
                // Modify template entry file
                const initDir = path.join(ReportItemName, "js", "init.js")
                // Inject template source
                fs.writeFileSync(initDir, `let initData = ${JSON.stringify(JsonRaw)}`)
                resolve({
                    ok: true,
                    outputDir: ReportItemName
                })
            } catch (error) {
                // If error, delete created folder
                if (isCreatDir) delDir(ReportItemName)
                reject(error)
            }
        })
    }
    ipcMain.handle("DownloadHtmlReport", async (e, params) => {
        return await asyncDownloadHtmlReport(params)
    })

    // asyncDeleteReport wrapper
    const asyncDeleteReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteReport", async (e, params) => {
        return await asyncDeleteReport(params)
    })

    // asyncQueryAvailableReportFrom wrapper
    const asyncQueryAvailableReportFrom = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableReportFrom(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableReportFrom", async (e, params) => {
        return await asyncQueryAvailableReportFrom(params)
    })

    // asyncQueryChaosMakerRule wrapper
    const asyncQueryChaosMakerRule = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryChaosMakerRule(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // asyncIsScrecorderReady wrapper
    const asyncIsScrecorderReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsScrecorderReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("QueryChaosMakerRules", async (e, params) => {
        return await asyncQueryChaosMakerRule(params)
    })
    ipcMain.handle("QueryChaosMakerRule", async (e, params) => {
        return await asyncQueryChaosMakerRule(params)
    })

    // asyncImportChaosMakerRules wrapper
    const asyncImportChaosMakerRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportChaosMakerRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }

    ipcMain.handle("IsScrecorderReady", async (e, params) => {
        return await asyncIsScrecorderReady(params)
    })

    // asyncQueryScreenRecorders wrapper
    const asyncQueryScreenRecorders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryScreenRecorders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ImportChaosMakerRules", async (e, params) => {
        return await asyncImportChaosMakerRules(params)
    })

    const handlerHelper = require("./handleStreamWithContext")

    const streamExecuteChaosMakerRuleMap = new Map()
    ipcMain.handle("cancel-ExecuteChaosMakerRule", handlerHelper.cancelHandler(streamExecuteChaosMakerRuleMap))
    ipcMain.handle("ExecuteChaosMakerRule", (e, params, token) => {
        let stream = getClient().ExecuteChaosMakerRule(params)
        handlerHelper.registerHandler(win, stream, streamExecuteChaosMakerRuleMap, token)
    })

    ipcMain.handle("QueryScreenRecorders", async (e, params) => {
        return await asyncQueryScreenRecorders(params)
    })

    const asyncUploadScreenRecorders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UploadScreenRecorders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UploadScreenRecorders", async (e, params) => {
        return await asyncUploadScreenRecorders(params)
    })

    const asyncGetOneScreenRecorders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetOneScreenRecorders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetOneScreenRecorders", async (e, params) => {
        return await asyncGetOneScreenRecorders(params)
    })

    const asyncUpdateScreenRecorders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateScreenRecorders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateScreenRecorders", async (e, params) => {
        return await asyncUpdateScreenRecorders(params)
    })

    const asyncDeleteScreenRecorders = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteScreenRecorders(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteScreenRecorders", async (e, params) => {
        return await asyncDeleteScreenRecorders(params)
    })

    const streamInstallScrecorderMap = new Map()
    ipcMain.handle("cancel-InstallScrecorder", handlerHelper.cancelHandler(streamInstallScrecorderMap))
    ipcMain.handle("InstallScrecorder", (e, params, token) => {
        let stream = getClient().InstallScrecorder(params)
        handlerHelper.registerHandler(win, stream, streamInstallScrecorderMap, token)
    })

    const streamStartScrecorderMap = new Map()
    ipcMain.handle("cancel-StartScrecorder", handlerHelper.cancelHandler(streamStartScrecorderMap))
    ipcMain.handle("StartScrecorder", (e, params, token) => {
        let stream = getClient().StartScrecorder(params)
        handlerHelper.registerHandler(win, stream, streamStartScrecorderMap, token)
    })
    // asyncQueryCVE wrapper
    const asyncQueryCVE = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryCVE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryCVE", async (e, params) => {
        return await asyncQueryCVE(params)
    })

    // asyncGetCVE wrapper
    const asyncGetCVE = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetCVE(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetCVE", async (e, params) => {
        return await asyncGetCVE(params)
    })
}
