import {FormInstance} from "antd"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"

export interface SimpleDetectProps {
    pageId: string
}

export interface SimpleDetectForm {
    Targets: string
    scanType: "Basic Scan" | "Targeted Scan"
    scanDeep: number
    SkippedHostAliveScan: boolean
    pluginGroup: string[]
}
export interface SimpleDetectFormContentProps {
    disabled: boolean
    inViewport: boolean
    form: FormInstance<SimpleDetectForm>
    refreshGroup:boolean
}
