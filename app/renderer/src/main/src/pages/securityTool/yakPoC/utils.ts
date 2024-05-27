import {GroupCount, QueryYakScriptGroupResponse} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface QueryYakScriptGroupRequest {
    All?: boolean
    PageId: string
    /** Default is false, for specialized vulnerabilities keyword groups pass true to return data, not passing in plugin management won't return poc built-in groups */
    IsPocBuiltIn?: boolean
    ExcludeType?: string[]
}
/**poc keyword search group data */
export const apiFetchQueryYakScriptGroupLocalByPoc: (params: QueryYakScriptGroupRequest) => Promise<GroupCount[]> = (
    params
) => {
    return new Promise((resolve, reject) => {
        const queryParams = {
            All: false,
            IsPocBuiltIn: true,
            ExcludeType: ["yak", "codec"],
            ...params
        }
        ipcRenderer
            .invoke("QueryYakScriptGroup", queryParams)
            .then((res: QueryYakScriptGroupResponse) => {
                resolve(res.Group)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "Failed to retrieve keyword groups：" + e)
            })
    })
}
