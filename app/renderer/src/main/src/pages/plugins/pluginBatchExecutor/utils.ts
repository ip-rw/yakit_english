import {HybridScanTask, HybridScanTaskSourceType} from "@/models/HybridScan"
import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
const {ipcRenderer} = window.require("electron")

interface HybridScanTaskFilter {
    TaskId?: string[]
    Status?: string[]
    Target?: string
    FromId?: number
    UntilId?: number
    HybridScanTaskSource?: HybridScanTaskSourceType[]
    /**Frontend Status Currently Single Selection, Field Used in Frontend */
    StatusType?: string
}
export interface QueryHybridScanTaskRequest {
    Pagination: Paging
    Filter: HybridScanTaskFilter
}

export interface QueryHybridScanTaskResponse {
    Pagination: Paging
    Data: HybridScanTask[]
    Total: number
}

/**Bulk Plugin Task Execution List */
export const apiQueryHybridScanTask: (query: QueryHybridScanTaskRequest) => Promise<QueryHybridScanTaskResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryHybridScanTask", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "Failed to Retrieve Task List:" + e)
                reject(e)
            })
    })
}

export interface DeleteHybridScanTaskRequest {
    /**@deprecated */
    TaskId?: string
    /**@deprecated */
    DeleteAll?: boolean
    Filter: HybridScanTaskFilter
}
/**Bulk Plugin Tasks Delete Interface */
export const apiDeleteHybridScanTask: (query: DeleteHybridScanTaskRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteHybridScanTask", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "Failed to Delete Task List:" + e)
                reject(e)
            })
    })
}
