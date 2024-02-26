import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import React, {useState, useRef, useMemo, useEffect} from "react"
import {LocalPluginExecuteDetailHeard} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {LocalPluginExecuteProps} from "./PluginsLocalType"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import styles from "./PluginsLocalDetail.module.scss"
import {ExpandAndRetractExcessiveState} from "../operator/expandAndRetract/ExpandAndRetract"

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
    const {plugin, headExtraNode} = props
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [runtimeId, setRuntimeId] = useState<string>("")

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
                setIsExecuting(false)
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })
    const isShowResult = useMemo(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])

    return (
        <>
            <LocalPluginExecuteDetailHeard
                token={tokenRef.current}
                plugin={plugin}
                extraNode={headExtraNode}
                isExecuting={isExecuting}
                setIsExecuting={setIsExecuting}
                debugPluginStreamEvent={debugPluginStreamEvent}
                progressList={streamInfo.progressState}
                runtimeId={runtimeId}
                setRuntimeId={setRuntimeId}
                executeStatus={executeStatus}
                setExecuteStatus={setExecuteStatus}
            />
            {isShowResult && (
                <PluginExecuteResult
                    streamInfo={streamInfo}
                    runtimeId={runtimeId}
                    loading={isExecuting}
                    pluginType={plugin.Type}
                    pluginExecuteResultWrapper={styles["plugin-execute-result-wrapper"]}
                />
            )}
        </>
    )
})
