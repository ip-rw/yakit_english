import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {SpaceEngineStartParams, SpaceEngineStatus} from "@/models/SpaceEngine"
import { PcapMetadata } from "@/models/Traffic"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface GetSpaceEngineStatusProps {
    Type: string
}
/**
 * @Get Space Engine State
 */
export const apiGetSpaceEngineStatus: (params: GetSpaceEngineStatusProps) => Promise<SpaceEngineStatus> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSpaceEngineStatus", {...params})
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "Get Space Engine Error:" + e)
                reject(e)
            })
    })
}
export interface GetSpaceEngineAccountStatusRequest {
    Type: string
    Key: string
    Account: string
}
/**
 * @Verify Engine State, Based on Frontend Value
 */
export const apiGetSpaceEngineAccountStatus: (
    params: GetSpaceEngineAccountStatusRequest
) => Promise<SpaceEngineStatus> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetSpaceEngineAccountStatus", {...params})
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "Engine Verification Failed:" + e)
                reject(e)
            })
    })
}
/**Get Global Config */
export const apiGetGlobalNetworkConfig: () => Promise<GlobalNetworkConfig> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetGlobalNetworkConfig")
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "Get Global Config Error:" + e)
                reject(e)
            })
    })
}

/**Set Global Configuration */
export const apiSetGlobalNetworkConfig: (params: GlobalNetworkConfig) => Promise<GlobalNetworkConfig> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SetGlobalNetworkConfig", params)
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "Global Configuration Setting Error:" + e)
                reject(e)
            })
    })
}

/** GetPcapMetadata */
export const apiGetPcapMetadata: () => Promise<PcapMetadata> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetPcapMetadata", {})
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "GetPcapMetadata Data Retrieval Error:" + e)
                reject(e)
            })
    })
}

/**
 * @Space Engine Execution Interface
 */
export const apiFetchPortAssetFromSpaceEngine: (params: SpaceEngineStartParams, token: string) => Promise<null> = (
    params,
    token
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("FetchPortAssetFromSpaceEngine", {...params}, token)
            .then(() => {
                yakitNotify("info", "Task Launched Successfully")
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Space Engine Execution Error:" + e)
                reject(e)
            })
    })
}

/**
 * @Cancel FetchPortAssetFromSpaceEngine
 */
export const apiCancelFetchPortAssetFromSpaceEngine: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-FetchPortAssetFromSpaceEngine`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Cancel Space Engine Execution Error:" + e)
                reject(e)
            })
    })
}
