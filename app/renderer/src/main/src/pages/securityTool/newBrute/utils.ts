import {yakitNotify} from "@/utils/notification"
import {DataNode} from "antd/lib/tree"
import {BruteExecuteExtraFormValue} from "./NewBruteType"
import {PayloadGroupNodeProps} from "@/pages/payloadManager/newPayload"
import {StartBruteParams} from "@/pages/brute/BrutePage"
import cloneDeep from "lodash/cloneDeep"

const {ipcRenderer} = window.require("electron")
export interface Tree {
    Name: string
    Data: string
    Children: Tree[]
}
export interface GetAvailableBruteTypesResponse {
    /**@deprecated After new weak password, this field deprecated */
    Types: string[]
    TypesWithChild: Tree[]
}
/**
 * @description Get weak password type
 */
export const apiGetAvailableBruteTypes: () => Promise<DataNode[]> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAvailableBruteTypes", {})
            .then((res: GetAvailableBruteTypesResponse) => {
                const tree: DataNode[] = res.TypesWithChild.map((ele) => ({
                    key: ele.Data || `temporary-id-${ele.Name}`,
                    title: ele.Name,
                    children:
                        ele.Children && ele.Children.length > 0
                            ? ele.Children.map((ele) => ({key: ele.Data, title: ele.Name}))
                            : []
                }))
                resolve(tree)
            })
            .catch((e: any) => {
                yakitNotify("error", "Error getting weak password type:" + e)
                reject(e)
            })
    })
}

/**
 * @description GetAllPayloadGroup
 */
export const apiGetAllPayloadGroup: () => Promise<PayloadGroupNodeProps[]> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAllPayloadGroup", {})
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                resolve(res.Nodes || [])
            })
            .catch((e: any) => {
                yakitNotify("error", "Error getting weak password type:" + e)
                reject(e)
            })
    })
}

export interface CodecResponse {
    Result: string
    RawResult: string
}

/**
 * @description Process dictionary content
 */
export const apiPayloadByType: (value: string) => Promise<string> = (value) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("Codec", {Type: "fuzz", Text: `{{x(${value})}}`})
            .then((res: CodecResponse) => {
                resolve(res?.Result || "")
            })
            .catch((err) => {
                yakitNotify("error", `Failed to get dictionary content：${err.details}`)
            })
    })
}
/**
 * @name StartBrute Interface parameter conversion (frontend data to interface parameters)
 * @description StartBrute
 */
export const convertStartBruteParams = (params: BruteExecuteExtraFormValue): StartBruteParams => {
    const {usernames = "", passwords = "", Targets = ""} = params
    const usernamesArr = !!usernames ? usernames.split(/,|\r?\n/) : []
    const passwordsArr = !!passwords ? passwords.split(/,|\r?\n/) : []
    const newParams = cloneDeep(params)
    delete newParams.usernames
    delete newParams.passwords
    delete newParams.replaceDefaultUsernameDict
    delete newParams.replaceDefaultPasswordDict
    const data: StartBruteParams = {
        ...newParams,
        ReplaceDefaultUsernameDict: !!!params.replaceDefaultUsernameDict,
        ReplaceDefaultPasswordDict: !!!params.replaceDefaultPasswordDict,
        Usernames: usernamesArr.concat(params.UsernamesDict || []),
        Passwords: passwordsArr.concat(params.PasswordsDict || []),
        Targets: Targets.split(/,|\r?\n/).join("\n")
    }
    delete data.UsernamesDict
    delete data.PasswordsDict
    return data
}

/**
 * @description StartBrute Weak password check
 */
export const apiStartBrute: (params: StartBruteParams, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams: StartBruteParams = {
            ...params
        }
        ipcRenderer
            .invoke("StartBrute", executeParams, token)
            .then(() => {
                yakitNotify("info", `Launch successful, task ID: ${token}`)
                resolve(null)
            })
            .catch((error) => {
                yakitNotify("error", "Weak password check execution error:" + error)
                reject(error)
            })
    })
}

/**
 * @description Cancel StartBrute
 */
export const apiCancelStartBrute: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-StartBrute`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Weak password check execution error:" + e)
                reject(e)
            })
    })
}
