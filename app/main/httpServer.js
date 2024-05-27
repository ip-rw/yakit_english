const axios = require("axios")
const https = require('https');
const {ipcMain, webContents} = require("electron")
const {USER_INFO, HttpSetting} = require("./state")

// Request timeout
const DefaultTimeOut = 30 * 1000

ipcMain.on("sync-edit-baseUrl", (event, arg) => {
    HttpSetting.httpBaseURL = arg.baseUrl
    event.returnValue = arg
})

const service = axios.create({
    // baseURL: "http://onlinecs.vaiwan.cn/api/",
    baseURL: `${HttpSetting.httpBaseURL}/api/`,
    timeout: DefaultTimeOut, // Request timeout
    maxBodyLength: Infinity, //Set appropriate size
    httpsAgent: new https.Agent({rejectUnauthorized: false}), // Ignore HTTPS errors
})

// Request interceptor - intercept each request to add headers
service.interceptors.request.use(
    (config) => {
        config.baseURL = config.diyHome ? `${config.diyHome}/api/` : `${HttpSetting.httpBaseURL}/api/`
        if (USER_INFO.isLogin && USER_INFO.token) config.headers["Authorization"] = USER_INFO.token
        // console.log('request-config',config);
        return config
    },
    (error) => {
        Promise.reject(error)
    }
)

// Response interceptor - intercept all responses for preliminary checks
service.interceptors.response.use(
    (response) => {
        const res = {
            code: response.status,
            data: response.data
        }
        // console.log("response__1", response)
        return res
    },
    (error) => {
        // console.log("error_1", error)
        if (error.response && error.response.data && error.response.data.message === "Token expired") {
            const res = {
                code: 401,
                message: error.response.data.message,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response && error.response.status === 401) {
            const res = {
                code: 401,
                message: error.response.data.reason,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response && error.response.data && error.response.data.code === 401) {
            const res = {
                code: 401,
                message: error.response.data.message,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if(error.response && error.response.status === 501 && error.response.data){
            const res = {
                code: 501,
                message: error.response.data,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response) {
            return Promise.resolve(error.response.data)
        }
        return Promise.reject(error)
    }
)

function httpApi(method, url, params, headers, isAddParams = true,timeout = DefaultTimeOut) {
    if (!["get", "post"].includes(method)) {
        return Promise.reject(`call yak echo failed: ${e}`)
    }
    return service({
        url: url,
        method: method,
        headers,
        params: isAddParams ? params : undefined,
        data: method === "post" ? params : undefined,
        timeout
    })
}

module.exports = {
    service,
    httpApi
}
