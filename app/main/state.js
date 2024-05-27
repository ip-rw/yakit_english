// user info
const USER_INFO = {
    /** LoggedIn? */
    isLogin: false,
    /** LoginPlatform */
    platform: null,
    githubName: null,
    githubHeadImg: null,
    wechatName: null,
    wechatHeadImg: null,
    companyName: null,
    companyHeadImg: null,
    qqName: null,
    qqHeadImg: null,
    /** Role */
    role: null,
    token: null,
    user_id: 0,
    /** PluginMgmtPermission? */
    checkPlugin: false
}
const HttpSetting = {
    httpBaseURL: "https://www.yaklang.com"
}

/**
 * YakEngineStatusConfig
 * @property {Boolean} EngineStarted?
 * @property {String} DefaultYakGRPCAddr)
 * @property {String} TempLocationProperty
 * @property {String} RemoteEngineCertKey
 */
const GLOBAL_YAK_SETTING = {
    status: false,
    sudo: false,
    defaultYakGRPCAddr: "127.0.0.1:8087",
    password: "",
    caPem: ""
}

module.exports = {
    USER_INFO,
    HttpSetting,
    GLOBAL_YAK_SETTING
}
