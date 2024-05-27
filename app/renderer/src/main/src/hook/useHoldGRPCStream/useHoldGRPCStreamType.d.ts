import { HybridScanActiveTask } from "@/models/HybridScan"
import {Risk as RiskProps} from "@/pages/risks/schema"

/** @Hooks Logic Data */
export declare namespace HoldGRPCStreamProps {
    /** @Buffer Data - Card */
    export interface CacheCard {
        Id: string
        Data: string
        Timestamp: number
        Tags?: string[]
    }
    /** @Buffer Data - Table Data Type */
    export interface CacheTable {
        name: string
        columns: {title: string; dataKey: string}[]
        data: Map<string, Record<string, any>>
    }

    /** @Hook Data Info - Card Type */
    export interface InfoCard {
        Id: string
        Data: string
        Timestamp: number
        Tag?: string
    }
    /** @Hook Data Info - Card Collection */
    export interface InfoCards {
        tag: string
        info: InfoCard[]
    }

    /** @Hook Data Info - Custom Tabs */
    export interface InfoTab {
        tabName: string
        type: string
    }

    /** @Hook Data Info - Custom Table */
    export interface InfoTable {
        name: string
        columns: {title: string; dataKey: string}[]
        data: Record<string, any>[]
    }

    /** @Hook Data Info - Custom Text */
    export interface InfoText {
        content: string
    }
}

/** @Hook DataFlow Info Collection */
export interface HoldGRPCStreamInfo {
    progressState: StreamResult.Progress[]
    cardState: HoldGRPCStreamProps.InfoCards[]
    tabsState: HoldGRPCStreamProps.InfoTab[]
    tabsInfoState: {
        [key: string]: StreamResult.WebSite | HoldGRPCStreamProps.InfoTable | HoldGRPCStreamProps.InfoText | any
    }
    riskState: StreamResult.Risk[]
    logState: StreamResult.Log[]
}

/** @DataFlow Result */
export declare namespace StreamResult {
    /** @DataFlow Result (Progress Bar)) */
    export interface BaseProsp {
        Hash: string
        OutputJson: string
        Raw: Uint8Array
        IsMessage: boolean
        Message: Uint8Array
        Id?: number
        Progress: number
        RuntimeID?: string
    }

    /** @DataFlow Result (Progress Bar)) */
    export interface Progress {
        progress: number
        id: string
    }

    /** @DataFlow Result (Card Type)) */
    export interface Card {
        id: string
        data: string
        tags?: string[]
    }

    /** @DataFlow Result (Log Info Type)) */
    export interface Log {
        level: string
        /** @DataFlow Info (JSON)) */
        data: string | any
        timestamp: number
    }

    /** @DataFlow Result (Data Structure)) */
    export interface Message {
        type: "log" | "progress" | string
        content: Log | Progress
    }

    /** @DataFlow Result (Auto-Increment Table Build Info)) */
    export interface Table {
        columns: string[]
        table_name: string
    }
    /** @DataFlow Result (Auto-Increment Table Data)) */
    export interface TableDataOpt {
        table_name: string
        data: {
            uuid: string
            [key: string]: any
        }
    }

    /** @DataFlow Result (Site Tree Data)) */
    export interface WebSite {
        refresh_interval: number
        targets: string
    }

    /** @DataFlow Result (Text Build Info)) */
    export interface Text {
        at_head: boolean
        tab_name: string
    }

    /** @DataFlow Result (Text Data)) */
    export interface TextData {
        data: string
        table_name: string
    }

    /** @DataFlow Result (Risk Data)) */
    export interface Risk extends Omit<RiskProps, "Id"> {}

    /** @DataFlow Result (Plugin Exec Log in Batch)) */
    export interface PluginExecuteLog extends HybridScanActiveTask {
        /**First Time Received ID, Frontend Log */
        startTime: number
    }
}
