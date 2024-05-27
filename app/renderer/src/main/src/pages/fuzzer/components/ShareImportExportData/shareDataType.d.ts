import {FuzzerRequestProps} from "../../HTTPFuzzerPage"

export interface ShareDataProps {
    module: string // New Tab Type
    getShareContent?: (callback: any) => void
    getFuzzerRequestParams: () => FuzzerRequestProps[] | FuzzerRequestProps
    supportShare?: boolean
    supportExport?: boolean
    supportImport?: boolean
}

export interface HTTPFlowsShareRequest {
    Ids: string[]
    LimitNum?: number
    ExpiredTime: number
    Pwd: boolean
    ShareId?: string
    Token: string
    Module: string
}

export interface HTTPFlowsShareResponse {
    ShareId: string
    ExtractCode: string
}
