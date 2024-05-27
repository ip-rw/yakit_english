import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import React, {useState, useRef, useMemo, useEffect} from "react"
import {LocalPluginExecuteDetailHeard} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {LocalPluginExecuteProps} from "./PluginsLocalType"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import styles from "./PluginsLocalDetail.module.scss"
import {ExpandAndRetractExcessiveState} from "../operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useMemoizedFn} from "ahooks"
import {apiDownloadPluginOther} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
    const {plugin, headExtraNode, linkPluginConfig} = props
    /**Execution Status */
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [downLoading, setDownLoading] = useState<boolean>(false)

    const tokenRef = useRef<string>(randomString(40))
    useEffect(() => {
        setExecuteStatus("default")
    }, [plugin.ScriptName])

    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `Debug Task ID on Start: ${rId}`)
            setRuntimeId(rId)
        }
    })
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    const isShowResult = useMemo(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    /**Update: Download Plugin */
    const onDownPlugin = useMemoizedFn(() => {
        if (!plugin.UUID) return
        setDownLoading(true)
        apiDownloadPluginOther({
            UUID: [plugin.UUID]
        })
            .then(() => {
                // Refresh Plugin Page
                emiter.emit("onRefLocalDetailSelectPlugin", plugin.UUID)
                // Refresh Plugin Data in Execution Page
                emiter.emit("onRefSinglePluginExecution", plugin.UUID)
                yakitNotify("success", "Download Complete")
            })
            .finally(() =>
                setTimeout(() => {
                    setDownLoading(false)
                }, 200)
            )
    })
    return (
        <YakitSpin spinning={downLoading}>
            <LocalPluginExecuteDetailHeard
                token={tokenRef.current}
                plugin={plugin}
                extraNode={headExtraNode}
                debugPluginStreamEvent={debugPluginStreamEvent}
                progressList={streamInfo.progressState}
                runtimeId={runtimeId}
                setRuntimeId={setRuntimeId}
                executeStatus={executeStatus}
                setExecuteStatus={setExecuteStatus}
                linkPluginConfig={linkPluginConfig}
                onDownPlugin={onDownPlugin}
            />
            {isShowResult && (
                <PluginExecuteResult
                    streamInfo={streamInfo}
                    runtimeId={runtimeId}
                    loading={isExecuting}
                    defaultActiveKey={plugin.Type === "yak" ? "Logs" : undefined}
                    pluginExecuteResultWrapper={styles["plugin-execute-result-wrapper"]}
                />
            )}
        </YakitSpin>
    )
})
