import {yakitNotify} from "@/utils/notification"
import {PortScanExecuteExtraFormValue} from "./NewPortScanType"
import {StartBruteParams} from "@/pages/brute/BrutePage"

const {ipcRenderer} = window.require("electron")

/**
 * @description Port Scan Method Community
 */
export const apiPortScan: (params: PortScanExecuteExtraFormValue, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams: PortScanExecuteExtraFormValue = {
            ...params
        }
        ipcRenderer
            .invoke("PortScan", executeParams, token)
            .then(() => {
                yakitNotify("info", "Task Started")
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Port Scan Execution Failed:" + e)
                reject(e)
            })
    })
}

/**
 * @description Cancel PortScan
 */
export const apiCancelPortScan: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-PortScan`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Cancel Port Scan Execution Failed:" + e)
                reject(e)
            })
    })
}

export interface LastRecordProps {
    ExtraInfo: string
    YakScriptOnlineGroup: string
    Percent: number
    LastRecordPtr: number
}
export interface RecordPortScanRequest {
    LastRecord?: LastRecordProps
    StartBruteParams?: StartBruteParams
    PortScanRequest: PortScanExecuteExtraFormValue
}
/**
 * @description Port Scan Method Enterprise
 */
export const apiSimpleDetect: (params: RecordPortScanRequest, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams = {
            ...params
        }
        ipcRenderer
            .invoke("SimpleDetect", executeParams, token)
            .then(() => {
                yakitNotify("info", "Task Started")
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Port Scan Execution Failed:" + e)
                reject(e)
            })
    })
}

/**
 * @description Cancel SimpleDetect
 */
export const apiCancelSimpleDetect: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-SimpleDetect`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Cancel Port Scan Execution Failed:" + e)
                reject(e)
            })
    })
}

export interface ExecParamItem {
    Key: string
    Value: string
}
export interface CreatReportRequest {
    ReportName: string
    RuntimeId: string
}
/**
 * @description Generate Report Enterprise
 */
export const apiSimpleDetectCreatReport: (params: CreatReportRequest, token: string) => Promise<null> = (
    params,
    token
) => {
    return new Promise((resolve, reject) => {
        let executeParams: CreatReportRequest = {
            ...params
        }
        ipcRenderer
            .invoke("SimpleDetectCreatReport", executeParams, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Report Generation Failed:" + e)
                reject(e)
            })
    })
}

/**
 * @description Cancel SimpleDetectCreatReport
 */
export const apiCancelSimpleDetectCreatReport: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-SimpleDetectCreatReport`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Cancel Report Generation Failed:" + e)
                reject(e)
            })
    })
}
