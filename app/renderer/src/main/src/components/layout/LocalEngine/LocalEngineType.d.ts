import React from "react"
import {YakitSystem} from "@/yakitGVDefine"

export interface LocalEngineProps {
    ref?: React.ForwardedRef<LocalEngineLinkFuncProps>
    system: YakitSystem
    setLog: (log: string[]) => any
    onLinkEngine: (port: number) => any
    setYakitStatus: (v: YakitStatusType) => any
}

export interface LocalEngineLinkFuncProps {
    /** Init & Check Pre-reqs for Local Connection */
    init: () => any
    /** Post Engine Version Check Local Connection */
    link: () => any
}
