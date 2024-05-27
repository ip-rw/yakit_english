const { ipcMain } = require("electron")
const childProcess = require("child_process")
const { HttpSetting } = require("../state")
const axios = require("axios")
const https = require('https');

/**
 * @name Determine Current Network Communication Status
 * @returns {boolean} true Available
 */
const asyncNetworkJudgment = (win, params) => {
    return new Promise((resolve, reject) => {
        try {
            childProcess.exec('ping cc.ai55.cc', (error, stdout, stderr) => {
                if (error) {
                    resolve(false)
                } else {
                    const data = stdout.toString()
                    if (data.indexOf('0% packet loss') > -1) {
                        // console.log('connecting ok');
                        resolve(true)
                    } else if (data.indexOf('100% packet loss') > -1) {
                        // console.log('connecting err ~');
                        resolve(false)
                    } else if (data.indexOf('Destination Host Unreachable') > -1) {
                        // console.log('Destination Host Unreachable ~');
                        resolve(false)
                    } else {
                        // console.log('connecting Intermittent ~');
                        resolve(true)
                    }
                }
            })
        } catch (e) {
            reject(e)
        }
    })
}
const asyncFetchPrivateDomainUrl = (win, params) => {
    return new Promise((resolve, reject) => {
        try {
            const service = axios.create({
                baseURL: `${HttpSetting.httpBaseURL}/api/`,
                timeout: 30 * 1000,
                maxBodyLength: Infinity, //Set Appropriate Size
                httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Ignore HTTPS Errors
            })
            service({
                url: "navigation/bars",
                method: 'get',
                timeout: 30 * 1000,
            })
                .then((res) => {
                    resolve({
                        code: 200,
                        message: 'ok',
                    })
                })
                .catch((err) => {
                    if (err.response) {
                        resolve({
                            code: err.response.status,
                            message: err.response.statusText,
                        })
                    } else {
                        // err.code === 'ECONNREFUSED':1. Server Not Running;
                        // Treat other cases as connection timeouts, indicating network issues
                        resolve({
                            code: err.code === 'ECONNREFUSED' ? 500 : -1,
                            message: err.message,
                        })
                    }
                })
        } catch (e) {
            reject(e)
        }
    })
}
module.exports = (win, getClient) => {
    /** Get Current Network Status */
    ipcMain.handle("fetch-netWork-status", async (e, params) => {
        return await asyncNetworkJudgment(win, params)
    })

    /** Retrieve Private Domain Address */
    ipcMain.handle("fetch-netWork-status-by-request-interface", async (e, params) => {
        return await asyncFetchPrivateDomainUrl(win, params)
    })
}
