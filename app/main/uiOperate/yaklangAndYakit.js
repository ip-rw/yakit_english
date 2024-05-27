const {ipcMain, app} = require("electron")
const path = require("path")
const fs = require("fs")
const https = require("https")
const {getLocalYaklangEngine, loadExtraFilePath} = require("../filePath")
const {fetchLatestYakEngineVersion} = require("../handlers/utils/network")

module.exports = (win, getClient) => {
    /** Is Yaklang Engine Installed */
    ipcMain.handle("is-yaklang-engine-installed", () => {
        /** @returns {Boolean} */
        return fs.existsSync(getLocalYaklangEngine())
    })

    /** Get Latest Yaklang Engine Version */
    const asyncFetchLatestYaklangVersion = () => {
        return new Promise((resolve, reject) => {
            fetchLatestYakEngineVersion()
                .then((version) => {
                    resolve(`${version}`.trim())
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }
    /** Get Latest Yaklang Engine Version */
    ipcMain.handle("fetch-latest-yaklang-version", async (e) => {
        return await asyncFetchLatestYaklangVersion()
    })

    /** Get Latest Yakit Version */
    const asyncFetchLatestYakitVersion = () => {
        return new Promise((resolve, reject) => {
            let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yakit-version.txt")
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                }).on("error", (err) => reject(err))
            })
            rsp.on("error", reject)
        })
    }
    /** Get Latest Yakit Version */
    ipcMain.handle("fetch-latest-yakit-version", async (e) => {
        return await asyncFetchLatestYakitVersion()
    })

    /** Get Local Yakit Version */
    ipcMain.handle("fetch-yakit-version", async (e) => {
        return app.getVersion()
    })

    /** Update Engine Without Terminating Old Version in Memory (Mac)) */
    ipcMain.handle("kill-old-engine-process", (e, type) => {
        win.webContents.send("kill-old-engine-process-callback", type)
    })

    /** Get Engine Version for Current Software Version */
    ipcMain.handle("fetch-built-in-engine-version", (e) => {
        const versionPath = loadExtraFilePath(path.join("bins", "engine-version.txt"))
        if (fs.existsSync(versionPath)) {
            try {
                return fs.readFileSync(versionPath).toString("utf8")
            } catch (error) {
                return ""
            }
        } else {
            return ""
        }
    })

    /** Get All Yaklang Versions */
    const asyncFetchYaklangVersionList = () => {
        return new Promise((resolve, reject) => {
            let rsp = https.get("https://aliyun-oss.yaklang.com/yak/version-info/active_versions.txt")
            rsp.on("response", (rsp) => {
                rsp.on("data", (data) => {
                    resolve(Buffer.from(data).toString("utf8"))
                }).on("error", (err) => reject(err))
            })
            rsp.on("error", reject)
        })
    }
    /** Get All Yaklang Versions */
    ipcMain.handle("fetch-yaklang-version-list", async (e) => {
        return await asyncFetchYaklangVersionList()
    })
}
