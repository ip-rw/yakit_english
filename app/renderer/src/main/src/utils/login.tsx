import {UserInfoProps} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {getLocalValue,getRemoteValue, setRemoteValue} from "./kv"
import {GetReleaseEdition, isCommunityEdition, globalUserLogout, isEnpriTraceAgent, isEnpriTrace} from "@/utils/envfile"
import {RemoteGV} from "@/yakitGV"
import {NowProjectDescription} from "@/pages/globalVariable"
import emiter from "./eventBus/eventBus"
import {LocalGVS} from "@/enums/localGlobal"
const {ipcRenderer} = window.require("electron")

export const loginOut = async (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    // Abnormal Logout Call Time Here
    // await aboutLoginUpload(userInfo.token)
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "logout/online",
        headers: {
            Authorization: userInfo.token
        }
    })
        .then((res) => {
            loginOutLocal(userInfo)
        })
        .catch((e) => {})
        .finally(globalUserLogout)
}

export const loginOutLocal = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    getRemoteValue("httpSetting").then(async (setting) => {
        if (!setting) return
        const values = JSON.parse(setting)
        const OnlineBaseUrl: string = values.BaseUrl

        let isDelPrivate: boolean = false
        try {
            isDelPrivate = !!(await getLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout))
        } catch (error) {}

        if (isDelPrivate) {
            ipcRenderer
                .invoke("DeletePluginByUserID", {
                    UserID: userInfo.user_id,
                    OnlineBaseUrl
                })
                .finally(() => {
                    ipcRenderer.send("user-sign-out")
                    emiter.emit("onRefLocalPluginList", "")
                })
        } else {
            ipcRenderer.send("user-sign-out")
        }
    })
}

export const refreshToken = (userInfo: UserInfoProps) => {
    if (!userInfo.isLogin) return
    NetWorkApi<null, API.ActionSucceeded>({
        method: "get",
        url: "refresh/token/online"
    })
        .then((res) => {})
        .catch((e) => {})
}

// Enterprise/Lite Sync Before Login
export const aboutLoginUpload = (Token: string) => {
    if ((isEnpriTraceAgent() || isEnpriTrace()) && NowProjectDescription) {
        const {ProjectName} = NowProjectDescription
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("upload-risk-to-online", {Token, ProjectName})
                .then((res) => {})
                .finally(() => {
                    resolve(true)
                })
        })
    }
}

// Enterprise/Lite Sync Before Login
export const loginHTTPFlowsToOnline = (Token: string) => {
    if ((isEnpriTraceAgent() || isEnpriTrace()) && NowProjectDescription) {
        const {ProjectName} = NowProjectDescription
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("HTTPFlowsToOnline", {Token, ProjectName})
                .then((res) => {})
                .finally(() => {})
        })
    }
}
