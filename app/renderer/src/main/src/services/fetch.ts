import {UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {setRemoteValue} from "@/utils/kv"
import {loginOutLocal} from "@/utils/login"
import {failed} from "@/utils/notification"
import {AxiosRequestConfig, AxiosResponse} from "./axios"
import {globalUserLogout} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

interface AxiosResponseInfoProps {
    message?: string
    reason?: string
    userInfo?: UserInfoProps
}

// Bulk overwrite
type Merge<M, N> = Omit<M, Extract<keyof M, keyof N>> & N

type AxiosResponseProps<T = any, D = any> = Merge<
    AxiosResponse<T, D>,
    {
        code?: number
        message?: string
    }
>

export interface requestConfig<T = any> extends AxiosRequestConfig<T> {
    params?: T
    /** @Custom API domain */
    diyHome?: string
}

export function NetWorkApi<T, D>(params: requestConfig<T>): Promise<D> {
    return new Promise((resolve, reject) => {
        // console.log("request-params", params)
        ipcRenderer
            .invoke("axios-api", params)
            .then((res) => {
                // Tracking, must not affect UI/interaction
                if(params.url==="tourist"&&params.method==="POST"){
                    resolve("" as any)
                    return
                }
                handleAxios(res, resolve, reject)
            })
            .catch((err: any) => {
                // console.log("request-err", err)
                reject(err)
            })
    })
}

export const handleAxios = (res: AxiosResponseProps<AxiosResponseInfoProps>, resolve, reject) => {
    const {code, message, data} = res
    // console.log("Back", res)
    if (!code) {
        failed("Timeout, retry")
        reject("Timeout, retry")
        return
    }
    switch (code) {
        case 200:
            resolve(data)
            break
        case 209:
            reject(data.reason)
            break
        case 401:
            tokenOverdue(res)
            reject(message)
            break
        default:
            reject(message)
            break
    }
}

// Token expired, logout
const tokenOverdue = (res) => {
    if (res.userInfo) loginOutLocal(res.userInfo)
    // Expired, cannot update status, remote logout only
    ipcRenderer.invoke("lougin-out-dynamic-control",{loginOut:false})
    globalUserLogout()
    failed("401, session expired/Not logged in, please login again")
}
