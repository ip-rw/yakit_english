const { ipcMain } = require("electron");
const FS = require("fs")
const xlsx = require("node-xlsx")
const handlerHelper = require("./handleStreamWithContext");
module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamPortScanMap = new Map();
    ipcMain.handle("cancel-PortScan", handlerHelper.cancelHandler(streamPortScanMap));
    ipcMain.handle("PortScan", (e, params, token) => {
        let stream = getClient().PortScan(params);
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })

    const asyncFetchFileContent = (params) => {
        return new Promise((resolve, reject) => {
            const type = params.split(".").pop()
            const typeArr = ['csv', 'xls', 'xlsx']
            // Read Excel
            if (typeArr.includes(type)) {
                // Read xlsx
                try {
                    const obj = xlsx.parse(params)
                    resolve(obj)
                } catch (error) {
                    reject(err)
                }
            }
            // Read txt
            else {
                FS.readFile(params, 'utf-8', function (err, data) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                });
            }

        })
    }

    // Fetch certificate (ps:asyncFetchFileContent might be incorrect)
    const asyncFetchCertificate = (params) => {
        return new Promise((resolve, reject) => {
            // Read .pfx file
            FS.readFile(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data)
                }

                // Process .pfx file content, e.g., parse certificate
                // May need to use `crypto` modules for further processing
                // e.g.: crypto.createCredentials
            });
        })
    }


    const streamSimpleDetectMap = new Map();

    ipcMain.handle("cancel-SimpleDetect", handlerHelper.cancelHandler(streamSimpleDetectMap));

    ipcMain.handle("SimpleDetect", (e, params, token) => {
        let stream = getClient().SimpleDetect(params);
        handlerHelper.registerHandler(win, stream, streamSimpleDetectMap, token)
    })

    const streamSimpleDetectCreatReportMap = new Map();

    ipcMain.handle("cancel-SimpleDetectCreatReport", handlerHelper.cancelHandler(streamSimpleDetectCreatReportMap));

    ipcMain.handle("SimpleDetectCreatReport", (e, params, token) => {
        let stream = getClient().SimpleDetectCreatReport(params);
        handlerHelper.registerHandler(win, stream, streamSimpleDetectCreatReportMap, token)
    })

    const asyncSaveCancelSimpleDetect = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveCancelSimpleDetect(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveCancelSimpleDetect", async (e, params) => {
        return await asyncSaveCancelSimpleDetect(params)
    })

    const asyncGetSimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncGetSimpleDetectUnfinishedTask(params)
    })

    const asyncGetSimpleDetectUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectUnfinishedTaskByUid", async (e, params) => {
        return await asyncGetSimpleDetectUnfinishedTaskByUid(params)
    })

    const asyncPopSimpleDetectUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PopSimpleDetectUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PopSimpleDetectUnfinishedTaskByUid", async (e, params) => {
        return await asyncPopSimpleDetectUnfinishedTaskByUid(params)
    })

    const streamRecoverSimpleDetectUnfinishedTaskMap = new Map()
    ipcMain.handle(
        "cancel-RecoverSimpleDetectUnfinishedTask",
        handlerHelper.cancelHandler(streamRecoverSimpleDetectUnfinishedTaskMap)
    )
    ipcMain.handle("RecoverSimpleDetectUnfinishedTask", (e, params, token) => {
        let stream = getClient().RecoverSimpleDetectUnfinishedTask(params)
        handlerHelper.registerHandler(win, stream, streamRecoverSimpleDetectUnfinishedTaskMap, token)
    })

    // Get URL IP address
    ipcMain.handle("fetch-file-content", async (e, params) => {
        return await asyncFetchFileContent(params)
    })

    // Get certificate content
    ipcMain.handle("fetch-certificate-content", async (e, params) => {
        return await asyncFetchCertificate(params)
    })
}