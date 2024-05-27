import {info} from "@/utils/notification";
import {setRemoteValue} from "@/utils/kv";
import {RemoteGV} from "@/yakitGV";

enum PRODUCT_RELEASE_EDITION {
    Yakit = 0,
    /**@name Enterprise Edition */
    EnpriTrace = 1,
    /**@name Portable Edition/Basic Edition */
    EnpriTraceAgent = 2,
    BreachTrace = 3,
}

export const shouldOverrideMenuItem = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return true
        default:
            return false
    }
}

export const getReleaseEditionName = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return "EnpriTrace"
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return "EnpriTraceAgent"
        case PRODUCT_RELEASE_EDITION.BreachTrace:
            return "BAS"
        default:
            return "Yakit"
    }
}

export const isEnpriTrace = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
}

export const isEnpriTraceAgent = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTraceAgent
}

export const isBreachTrace = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.BreachTrace
}

export const isCommunityEdition = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit
}


export const isEnterpriseEdition = () => {
    return !isCommunityEdition()
}

export const shouldVerifyEnpriTraceLogin = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return true
    }
    return false
}

export const GetReleaseEdition = () => {
    switch (fetchEnv()) {
        case "enterprise":
        case "enpritrace":
            return PRODUCT_RELEASE_EDITION.EnpriTrace
        case "simple-enterprise":
        case "etraceagent":
            return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
        case "breachtrace":
            return PRODUCT_RELEASE_EDITION.BreachTrace
        default:
            return PRODUCT_RELEASE_EDITION.Yakit
    }
}

const fetchEnv = () => {
    try {
        return process.env["REACT_APP_PLATFORM"]
    } catch (e) {
        return ""
    }
}

/*
* Set immediately upon import, no need to wait for component loading
* */
const {ipcRenderer} = window.require("electron");
ipcRenderer.invoke("set-release-edition-raw", fetchEnv() || "").then(() => {
    if (isEnpriTraceAgent()) {
        info(`Settings ${getReleaseEditionName()} Release successful`)
    }
})

/** Show Developer Tools? */
export const showDevTool = () => {
    const devTool = process.env?.REACT_APP_DEVTOOL || ""
    return devTool && devTool === "true"
}

export const globalUserLogout = () => {
    if (isCommunityEdition()) {
        return setRemoteValue(RemoteGV.TokenOnline, "")
    } else {
        return setRemoteValue(RemoteGV.TokenOnlineEnterprise, "")
    }
}

export const globalUserLogin = (token: any) => {
    if (isCommunityEdition()) {
        return setRemoteValue(RemoteGV.TokenOnline, token)
    } else {
        return setRemoteValue(RemoteGV.TokenOnlineEnterprise, token)
    }
}