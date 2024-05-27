import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {ExecResult, QueryYakScriptRequest} from "@/pages/invoker/schema"

export type HybridScanModeType = "new" | "resume" | "pause" | "status"
export type HybridScanTaskSourceType = "pluginBatch" | "yakPoc"
export interface HybridScanControlRequest extends HybridScanControlAfterRequest {
    // Control frame field
    Control: boolean
    // new: New task
    // resume: Resume task
    // pause: Pause task
    // status: Query task status
    HybridScanMode: HybridScanModeType
    ResumeTaskId: string
}

/**Parameters passed after sending HybridScanMode*/
export interface HybridScanControlAfterRequest {
    // Other parameters
    Concurrent?: number
    TotalTimeoutSecond?: number
    Proxy?: string
    SingleTimeoutSecond?: number
    Plugin?: HybridScanPluginConfig
    Targets?: HybridScanInputTarget
    HybridScanTaskSource?: HybridScanTaskSourceType
}

export interface HybridScanInputTarget {
    Input: string
    InputFile: string[]
    HTTPRequestTemplate: HTTPRequestBuilderParams
}

export interface HybridScanPluginConfig {
    PluginNames: string[]
    Filter?: QueryYakScriptRequest
}

export interface HybridScanStatisticResponse {
    // Calculate overall task progress
    TotalTargets: number
    TotalPlugins: number
    TotalTasks: number
    FinishedTasks: number
    FinishedTargets: number
    ActiveTasks: number
    ActiveTargets: number

    // Hybrid scan task ID, generally used to resume or pause tasks
    HybridScanTaskId: string
}

export interface HybridScanResponse extends HybridScanStatisticResponse {
    CurrentPluginName: string
    ExecResult: ExecResult

    UpdateActiveTask?: HybridScanActiveTask
    /**@deprecated Backend deprecated */
    ScanConfig?: string
    HybridScanConfig?: HybridScanControlRequest
}

export interface HybridScanActiveTask {
    Operator: "create" | "remove"
    Index: string

    IsHttps: boolean
    HTTPRequest: Uint8Array
    PluginName: string
    Url: string
}

export interface HybridScanTask {
    Id: number
    CreatedAt: number
    UpdatedAt: number
    TaskId: string
    Status: "executing" | "paused" | "done" | "error" // If Status has fixed values, use union type
    TotalTargets: number
    TotalPlugins: number
    TotalTasks: number
    FinishedTasks: number
    FinishedTargets: number
    FirstTarget: string
    Reason: string
}
