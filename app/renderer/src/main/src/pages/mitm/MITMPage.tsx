import React, {useEffect, useRef, useState, useMemo} from "react"
import {Form, notification} from "antd"
import {failed, info, success, yakitFailed} from "../../utils/notification"
import {MITMFilterSchema} from "./MITMServerStartForm/MITMFilters"
import {ExecResult, QueryYakScriptRequest} from "../invoker/schema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import style from "./MITMPage.module.scss"
import {useCreation, useDebounceEffect, useGetState, useInViewport, useLatest, useMemoizedFn} from "ahooks"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {enableMITMPluginMode, MITMServerHijacking} from "@/pages/mitm/MITMServerHijacking/MITMServerHijacking"
import {Uint8ArrayToString} from "@/utils/str"
import {MITMRule} from "./MITMRule/MITMRule"
import {MITMContentReplacerRule} from "./MITMRule/MITMRuleType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {loadNucleiPoCFromLocal, loadYakitPluginCode} from "../yakitStore/YakitStorePage"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {StartExecYakCodeModal, YakScriptParam} from "@/utils/basic"
import MITMHijackedContent, {MITMStatus} from "./MITMServerHijacking/MITMHijackedContent"
import {MITMPluginHijackContent} from "./MITMServerHijacking/MITMPluginHijackContent"
import {
    MITMPluginLocalList,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMServerHijacking/MITMPluginLocalList"
import {ClientCertificate, MITMServerStartForm} from "./MITMServerStartForm/MITMServerStartForm"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    LogListInfo,
    SaveProgressStream,
    UploadList,
    YakitUploadComponent
} from "@/components/YakitUploadModal/YakitUploadModal"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {v4 as uuidv4} from "uuid"
import {apiDownloadPluginOther, apiQueryYakScript} from "../plugins/utils"
const {ipcRenderer} = window.require("electron")

export interface MITMPageProp {}

export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean
    request: Uint8Array
    url: string
    RemoteAddr?: string
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number

    justContentReplacer?: boolean
    replacers?: MITMContentReplacerRule[]

    isWebsocket?: boolean
    Payload: Uint8Array
}

export const CONST_DEFAULT_ENABLE_INITIAL_PLUGIN = "CONST_DEFAULT_ENABLE_INITIAL_PLUGIN"

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    // Overall Hijacking Status
    const [status, setStatus, getStatus] = useGetState<"idle" | "hijacked" | "hijacking">("idle")

    // Through Start Form Content
    const [addr, setAddr] = useState("")
    const [host, setHost] = useState("127.0.0.1")
    const [port, setPort] = useState(8083)
    const [enableInitialMITMPlugin, setEnableInitialMITMPlugin] = useState(false)
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([])
    const [tip, setTip] = useState("")

    // yakit log message
    const [logs, setLogs] = useState<ExecResultLog[]>([])
    const latestLogs = useLatest<ExecResultLog[]>(logs)
    const [_, setLatestStatusHash, getLatestStatusHash] = useGetState("")
    const [statusCards, setStatusCards] = useState<StatusCardProps[]>([])
    // Check Hijacking Status
    useEffect(() => {
        // Receive First Message After MITM Start, Indicates Successful Start
        ipcRenderer.on("client-mitm-start-success", () => {
            setStatus("hijacking")
        })

        ipcRenderer.on("client-mitm-notification", (_, i: Uint8Array) => {
            try {
                info(Uint8ArrayToString(i))
            } catch (e) {}
        })

        return () => {
            ipcRenderer.invoke("mitm-stop-call")
            ipcRenderer.removeAllListeners("client-mitm-start-success")
            ipcRenderer.removeAllListeners("client-mitm-notification")
        }
    }, [])
    // Receiving Backend Messages
    useEffect(() => {
        // For Frontend State Recovery
        ipcRenderer
            .invoke("mitm-have-current-stream")
            .then((data) => {
                const {haveStream, host, port} = data
                if (haveStream) {
                    setStatus("hijacking")
                    setHost(host)
                    setPort(port)
                }
            })
            .finally(() => {
                recover()
            })

        // Message for MITM (YakitLog)）
        const messages: ExecResultLog[] = []
        const statusMap = new Map<string, StatusCardProps>()
        let lastStatusHash = ""
        ipcRenderer.on("client-mitm-message", (e, data: ExecResult) => {
            let msg = ExtractExecResultMessage(data)
            if (msg !== undefined) {
                const currentLog = msg as ExecResultLog
                if (currentLog.level === "feature-status-card-data") {
                    lastStatusHash = `${currentLog.timestamp}-${currentLog.data}`

                    try {
                        // Parse Object
                        const obj = JSON.parse(currentLog.data)
                        const {id, data} = obj
                        if (!data) {
                            statusMap.delete(`${id}`)
                        } else {
                            statusMap.set(`${id}`, {Data: data, Id: id, Timestamp: currentLog.timestamp})
                        }
                    } catch (e) {}
                    return
                }
                messages.push(currentLog)
                if (messages.length > 25) {
                    messages.shift()
                }
            }
        })

        // let currentFlow: HTTPFlow[] = []
        ipcRenderer.on("client-mitm-history-update", (e: any, data: any) => {
            // currentFlow.push(data.historyHTTPFlow as HTTPFlow)
            //
            // if (currentFlow.length > 30) {
            //     currentFlow = [...currentFlow.slice(0, 30)]
            // }
            // setFlows([...currentFlow])
        })

        ipcRenderer.on("client-mitm-error", (e, msg) => {
            if (!msg) {
                info("MITM Hijacking Server Closed")
            } else {
                failed("MITM Hijacking Server Error or Closed")
                const m = showYakitModal({
                    title: "MITM Server Startup ERROR!",
                    type: "white",
                    cancelButtonProps: {style: {display: "none"}},
                    content: <div style={{padding: "12px 24px"}}>{msg}</div>,
                    onOkText: "OK",
                    onOk: () => {
                        m.destroy()
                    }
                })
            }
            ipcRenderer.invoke("mitm-stop-call")
            setStatus("idle")
        })

        const updateLogs = () => {
            if (latestLogs.current.length !== messages.length) {
                setLogs([...messages])
                return
            }

            if (latestLogs.current.length > 0 && messages.length > 0) {
                if (latestLogs.current[0].data !== messages[0].data) {
                    setLogs([...messages])
                    return
                }
            }

            if (getLatestStatusHash() !== lastStatusHash) {
                setLatestStatusHash(lastStatusHash)

                const tmpCurrent: StatusCardProps[] = []
                statusMap.forEach((value, key) => {
                    tmpCurrent.push(value)
                })
                setStatusCards(tmpCurrent.sort((a, b) => a.Id.localeCompare(b.Id)))
            }
        }
        updateLogs()
        let id = setInterval(() => {
            updateLogs()
        }, 1000)

        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners("client-mitm-error")
            ipcRenderer.removeAllListeners("client-mitm-history-update")
            ipcRenderer.removeAllListeners("mitm-have-current-stream")
            ipcRenderer.removeAllListeners("client-mitm-message")
        }
    }, [])

    const recover = useMemoizedFn(() => {
        ipcRenderer.invoke("mitm-recover").then(() => {
            // success("MITM Session Recovered Successfully")
        })
    })
    // Start MITM Hijacking via gRPC Call
    const startMITMServer = useMemoizedFn(
        (
            targetHost,
            targetPort,
            downstreamProxy,
            enableHttp2,
            certs: ClientCertificate[],
            extra?: ExtraMITMServerProps
        ) => {
            return ipcRenderer
                .invoke("mitm-start-call", targetHost, targetPort, downstreamProxy, enableHttp2, certs, extra)
                .catch((e: any) => {
                    notification["error"]({message: `MITM Hijacking Start Failed：${e}`})
                })
        }
    )

    // Set Start Server Handler Function
    const startMITMServerHandler = useMemoizedFn(
        (
            host,
            port,
            downstreamProxy,
            enableInitialPlugin,
            plugins,
            enableHttp2,
            certs: ClientCertificate[],
            extra?: ExtraMITMServerProps
        ) => {
            setAddr(`http://${host}:${port} or socks5://${host}:${port}`)
            setHost(host)
            setPort(port)
            setDefaultPlugins(plugins)
            setEnableInitialMITMPlugin(enableInitialPlugin)
            startMITMServer(host, port, downstreamProxy, enableHttp2, certs, extra)
            let tip = ""
            if (downstreamProxy) {
                tip += `Downstream Proxy：${downstreamProxy}`
            }
            if (extra) {
                if (extra.onlyEnableGMTLS) {
                    tip += "|SM TLS Only"
                }
                if (extra.enableProxyAuth) {
                    tip += "|Enable Proxy Authentication"
                }
            }
            setTip(tip)
        }
    )

    const [visible, setVisible] = useState<boolean>(false)
    const mitmPageRef = useRef<any>()
    const [inViewport] = useInViewport(mitmPageRef)

    const onRenderMITM = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                // status === "idle" Render Task Form Before Starting
                return (
                    <MITMServer
                        visible={visible}
                        onStartMITMServer={startMITMServerHandler}
                        setVisible={setVisible}
                        status={status}
                        setStatus={setStatus}
                        logs={[]}
                        statusCards={[]}
                    />
                )

            default:
                return (
                    <MITMServerHijacking
                        port={port}
                        addr={addr}
                        host={host}
                        status={status}
                        setStatus={setStatus}
                        defaultPlugins={defaultPlugins}
                        enableInitialMITMPlugin={enableInitialMITMPlugin}
                        setVisible={setVisible}
                        logs={logs}
                        statusCards={statusCards}
                        tip={tip}
                        onSetTip={setTip}
                    />
                )
        }
    })

    // useEffect(() => {
    //     if (status !== "idle") {
    //         getRules()
    //     }
    // }, [status, visible])
    // const getRules = useMemoizedFn(() => {
    //     ipcRenderer
    //         .invoke("GetCurrentRules", {})
    //         .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
    //             const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
    //             const findOpenRepRule = newRules.find(
    //                 (item) => !item.Disabled && (!item.NoReplace || item.Drop || item.ExtraRepeat)
    //             )
    //             if (findOpenRepRule !== undefined) {
    //                 if (tip.indexOf("Enable Replacement Rules") === -1) {
    //                     setTip(tip + "|Enable Replacement Rules")
    //                 }
    //             } else {
    //                 setTip(tip.replace("|Enable Replacement Rules", ""))
    //             }
    //         })
    //         .catch((e) => yakitFailed("Failed to Fetch Rule List:" + e))
    // })

    return (
        <>
            <div
                className={style["mitm-page"]}
                ref={mitmPageRef}
                style={status === "idle" ? {padding: "0px 16px"} : {padding: "8px 16px 0px 0px"}}
            >
                {onRenderMITM()}
            </div>
            <MITMRule status={status} visible={visible && !!inViewport} setVisible={setVisible} />
        </>
    )
}

export interface ExtraMITMServerProps {
    /**@name SM Hijacking*/
    enableGMTLS: boolean
    /**@name Proxy Authentication */
    enableProxyAuth: boolean
    /**@name SM TLS Only */
    onlyEnableGMTLS: boolean
    /**@name SM TLS Priority TLS */
    preferGMTLS: boolean
    proxyPassword: string
    proxyUsername: string
    dnsServers: string[]
    hosts: {Key: string; Value: string}[]
    /**@name Filter WebSocket */
    filterWebsocket: boolean
}

interface MITMServerProps {
    onStartMITMServer?: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        defaultPlugins: string[],
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[],
        extra?: ExtraMITMServerProps
    ) => any
    visible?: boolean
    setVisible?: (b: boolean) => void
    status: "idle" | "hijacked" | "hijacking"
    // After Hijacking Enabled
    setStatus: (status: MITMStatus) => any
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
}
export const MITMServer: React.FC<MITMServerProps> = React.memo((props) => {
    const {visible, setVisible, status, setStatus, logs, statusCards} = props

    const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(true)
    /**
     * @Plugin Checkbox Description
     */
    const [checkList, setCheckList] = useState<string[]>([])
    const [enableInitialPlugin, setEnableInitialPlugin] = useState<boolean>(false)
    const [isFullScreenSecondNode, setIsFullScreenSecondNode] = useState<boolean>(false)
    const [isFullScreenFirstNode, setIsFullScreenFirstNode] = useState<boolean>(false)

    const [triggerSearch, setTriggerSearch] = useState<boolean>(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [tags, setTags] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [groupNames, setGroupNames] = useState<string[]>([]) // Search Plugin Names in Stored Plugin Group

    const [total, setTotal] = useState<number>(0)
    /**
     * Selected Plugin Group
     */
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    const [listNames, setListNames] = useState<string[]>([]) // All Stored Local Plugins

    const onSubmitYakScriptId = useMemoizedFn((id: number, params: YakExecutorParam[]) => {
        info(`Load MITM Plugin[${id}]`)
        ipcRenderer.invoke("mitm-exec-script-by-id", id, params)
    })
    const onStartMITMServer = useMemoizedFn(
        (
            host,
            port,
            downstreamProxy,
            enableInitialPlugin,
            enableHttp2,
            certs: ClientCertificate[],
            extra?: ExtraMITMServerProps
        ) => {
            if (props.onStartMITMServer)
                props.onStartMITMServer(
                    host,
                    port,
                    downstreamProxy,
                    enableInitialPlugin,
                    enableInitialPlugin ? checkList : [],
                    enableHttp2,
                    certs,
                    extra
                )
        }
    )
    /**
     * @Select All Plugins Before MITM Start, Execute Up to 200
     */
    const onSelectAll = useMemoizedFn((checked: boolean) => {
        switch (status) {
            case "idle":
                onSelectAllIdle(checked)
                break
            case "hijacked":
            case "hijacking":
                onSelectAllHijacking(checked)
                break
            default:
                break
        }
    })
    /**
     * @Select All Before Hijacking Start
     */
    const onSelectAllIdle = useMemoizedFn((checked: boolean) => {
        if (checked) {
            setCheckList(listNames)
        } else {
            setCheckList([])
        }
        setIsSelectAll(checked)
        setEnableInitialPlugin(checked)
    })
    /**
     * @Select All After Hijacking Start, Launch Plugin
     */
    const onSelectAllHijacking = useMemoizedFn((checked: boolean) => {
        if (checked) {
            ipcRenderer
                .invoke("mitm-remove-hook", {
                    HookName: [],
                    RemoveHookID: listNames.concat(checkList)
                } as any)
                .then(() => {
                    onEnableMITMPluginMode(checked)
                    setIsSelectAll(checked)
                })
                .catch((err) => {
                    yakitFailed("Clear Failure:" + err)
                })
        } else {
            ipcRenderer
                .invoke("mitm-remove-hook", {
                    HookName: [],
                    RemoveHookID: listNames.concat(checkList)
                } as any)
                .then(() => {
                    setIsSelectAll(checked)
                })
                .catch((err) => {
                    yakitFailed("Clear Failure:" + err)
                })
        }
    })

    const onEnableMITMPluginMode = useMemoizedFn((checked: boolean) => {
        enableMITMPluginMode(listNames)
            .then(() => {
                setIsSelectAll(checked)
                info("MITM Plugin Started Successfully")
            })
            .catch((err) => {
                yakitFailed("MITM Plugin Start Failed:" + err)
            })
    })

    const getAllSatisfyScript = useMemoizedFn((limit: number) => {
        const query: QueryYakScriptRequest = {
            Pagination: {
                Limit: limit || 200,
                Page: 1,
                OrderBy: "updated_at",
                Order: "desc"
            },
            Keyword: searchKeyword,
            Type: "mitm,port-scan",
            Tag: tags,
            ExcludeTypes: ["yak", "codec"],
            Group: {UnSetGroup: false, Group: groupNames}
        }
        apiQueryYakScript(query).then((res) => {
            const data = res.Data || []
            setListNames(data.map((i) => i.ScriptName))
        })
    })
    const onRenderFirstNode = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                return (
                    <>
                        <PluginGroup selectGroup={selectGroup} setSelectGroup={setSelectGroup} excludeType={['yak', 'codec', 'nuclei']}/>
                        <div style={{paddingRight: 9}}>
                            <PluginSearch
                                tag={tags}
                                searchKeyword={searchKeyword}
                                setTag={setTags}
                                setSearchKeyword={setSearchKeyword}
                                onSearch={() => {
                                    setTriggerSearch(!triggerSearch)
                                }}
                            />
                        </div>
                        <div style={{display: "flex", justifyContent: "space-between", paddingRight: 10}}>
                            <YakModuleListHeard
                                onSelectAll={onSelectAll}
                                setIsSelectAll={setIsSelectAll}
                                isSelectAll={isSelectAll}
                                total={total}
                                length={checkList.length}
                            />
                            <YakitButton
                                type='text'
                                colors='danger'
                                onClick={() => {
                                    if (checkList.length > 0) onSelectAll(false)
                                }}
                                disabled={checkList.length === 0}
                                className={style["empty-button"]}
                            >
                                Clear
                            </YakitButton>
                        </div>
                        <MITMPluginLocalList
                            onSubmitYakScriptId={onSubmitYakScriptId}
                            status={status}
                            checkList={checkList}
                            setCheckList={(list) => {
                                if (list.length === 0) {
                                    setEnableInitialPlugin(false)
                                } else {
                                    setEnableInitialPlugin(true)
                                }
                                setCheckList(list)
                            }}
                            tags={tags}
                            setTags={setTags}
                            searchKeyword={searchKeyword}
                            triggerSearch={triggerSearch}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            setIsSelectAll={setIsSelectAll}
                            isSelectAll={isSelectAll}
                            total={total}
                            setTotal={(t) => {
                                setTotal(t)
                                getAllSatisfyScript(t)
                            }}
                            hooks={new Map<string, boolean>()}
                            onSelectAll={onSelectAll}
                            groupNames={groupNames}
                            setGroupNames={setGroupNames}
                        />
                    </>
                )

            default:
                return (
                    <MITMPluginHijackContent
                        setTags={setTags}
                        tags={tags}
                        searchKeyword={searchKeyword}
                        setSearchKeyword={setSearchKeyword}
                        onSubmitYakScriptId={onSubmitYakScriptId}
                        status={status}
                        checkList={checkList}
                        setCheckList={(list) => {
                            if (list.length === 0) {
                                setEnableInitialPlugin(false)
                            } else {
                                setEnableInitialPlugin(true)
                            }
                            setCheckList(list)
                        }}
                        isFullScreen={isFullScreenFirstNode}
                        setIsFullScreen={setIsFullScreenFirstNode}
                        isSelectAll={isSelectAll}
                        onSelectAll={onSelectAll}
                        setIsSelectAll={setIsSelectAll}
                        total={total}
                        setTotal={(t) => {
                            setTotal(t)
                            getAllSatisfyScript(t)
                        }}
                        groupNames={groupNames}
                        setGroupNames={setGroupNames}
                        onSetOpenTabsFlag={setOpenTabsFlag}
                    />
                )
        }
    })
    const onRenderSecondNode = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                return (
                    <MITMServerStartForm
                        status={status}
                        onStartMITMServer={onStartMITMServer}
                        visible={visible || false}
                        setVisible={(v) => {
                            if (setVisible) setVisible(v)
                        }}
                        enableInitialPlugin={enableInitialPlugin}
                        setEnableInitialPlugin={(checked) => {
                            if (!checked) {
                                setCheckList([])
                                setIsSelectAll(false)
                            }
                            setEnableInitialPlugin(checked)
                        }}
                    />
                )
            default:
                return (
                    <MITMHijackedContent
                        setStatus={setStatus}
                        status={status}
                        isFullScreen={isFullScreenSecondNode}
                        setIsFullScreen={setIsFullScreenSecondNode}
                        logs={logs}
                        statusCards={statusCards}
                    />
                )
        }
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "25%",
            secondRatio: "50%"
        }

        if (openTabsFlag) {
            p.firstRatio = "25%"
        } else {
            p.firstRatio = "24px"
        }

        if (isFullScreenSecondNode) {
            p.firstRatio = "0%"
        }
        if (isFullScreenFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "calc(100% + 6px)"
        }
        return p
    }, [isFullScreenSecondNode, isFullScreenFirstNode, openTabsFlag])

    return (
        <YakitResizeBox
            isVer={false}
            freeze={openTabsFlag}
            isRecalculateWH={openTabsFlag}
            firstNode={() => (
                <div
                    className={style["mitm-server-start-pre-first"]}
                    style={{display: isFullScreenSecondNode ? "none" : "", marginTop: status === "idle" ? 12 : 0}}
                >
                    {onRenderFirstNode()}
                </div>
            )}
            lineStyle={{display: isFullScreenSecondNode || isFullScreenFirstNode ? "none" : ""}}
            firstMinSize={openTabsFlag ? "340px" : "24px"}
            secondMinSize={620}
            secondNode={() => (
                <div
                    className={style["mitm-server-start-pre-second"]}
                    style={{display: isFullScreenFirstNode ? "none" : ""}}
                >
                    {onRenderSecondNode()}
                </div>
            )}
            secondNodeStyle={{
                padding: isFullScreenFirstNode ? 0 : undefined,
                display: isFullScreenFirstNode ? "none" : ""
            }}
            firstNodeStyle={{
                padding: isFullScreenSecondNode ? 0 : undefined,
                display: isFullScreenSecondNode ? "none" : ""
            }}
            {...ResizeBoxProps}
        />
    )
})

export type LoadPluginMode = "giturl" | "local" | "local-nuclei" | "uploadId"
export const loadModeInfo = [
    {
        value: "giturl",
        label: "Online Nuclei",
        width: 544
    },
    {
        value: "local",
        label: "Local Plugins",
        width: 680
    },
    {
        value: "local-nuclei",
        label: "Local Nuclei",
        width: 680
    },
    {
        value: "uploadId",
        label: "Plugin ID",
        width: 448
    }
]
interface ImportYakScriptResult {
    Progress: number
    Message: string
    MessageType: string
}
interface ImportLocalPluginProps {
    visible: boolean
    setVisible: (b: boolean) => void
    loadPluginMode?: LoadPluginMode
    sendPluginLocal?: boolean
}
export const ImportLocalPlugin: React.FC<ImportLocalPluginProps> = React.memo((props) => {
    const {visible, setVisible, loadPluginMode, sendPluginLocal = false} = props
    const [form] = Form.useForm()
    const [loadMode, setLoadMode] = useState<LoadPluginMode>(loadPluginMode || "giturl")
    const [localNucleiPath, setLocalNucleiPath] = useState<string>("") // localNucleiPath
    const [localImportStep, setLocalImportStep] = useState<1 | 2>(1)
    const [localUploadList, setLocalUploadList] = useState<UploadList[]>([])
    const [localStreamData, setLocalStreamData] = useState<SaveProgressStream>()
    const localStreamDataRef = useRef<SaveProgressStream>()
    const [locallogListInfo, setLocallogListInfo] = useState<LogListInfo[]>([])
    const locallogListInfoRef = useRef<LogListInfo[]>([])

    const [startExecYakCodeModalVisible, setStartExecYakCodeModalVisible] = useState<boolean>(false)
    const [startExecYakCodeVerbose, setStartExecYakCodeVerbose] = useState<string>("")
    const [startExecYakCodeParams, setStartExecYakCodeParams] = useState<YakScriptParam>()

    useDebounceEffect(
        () => {
            if (visible) {
                form.resetFields()
                setLocalNucleiPath("")

                if (loadMode === "local") {
                    let timer
                    timer = setInterval(() => {
                        setLocalStreamData(localStreamDataRef.current)
                        setLocallogListInfo([...locallogListInfoRef.current])
                    }, 200)

                    ipcRenderer.on("import-yak-script-data", async (e, data: ImportYakScriptResult) => {
                        setLocalImportStep(2)
                        localStreamDataRef.current = {Progress: data.Progress}
                        // Display Error Log
                        if (data.MessageType === "error" || data.Progress === 1) {
                            locallogListInfoRef.current.unshift({
                                message: data.Message,
                                isError: ["error", "finalError"].includes(data.MessageType),
                                key: uuidv4()
                            })
                        }

                        if (["success", "finished"].includes(data.MessageType) && data.Progress === 1) {
                            setTimeout(() => {
                                handleImportLocalPluginFinish()
                            }, 300)
                        }
                    })

                    return () => {
                        resetLocalImport()
                        clearInterval(timer)
                        ipcRenderer.invoke("cancel-importYakScript")
                        ipcRenderer.removeAllListeners("import-yak-script-data")
                    }
                }
            }
        },
        [visible, loadMode],
        {wait: 300}
    )

    useEffect(() => {
        setLoadMode(loadPluginMode || "giturl")
    }, [loadPluginMode])

    const resetLocalImport = () => {
        setLocalImportStep(1)
        setLocalUploadList([])
        setLocalStreamData(undefined)
        localStreamDataRef.current = undefined
        locallogListInfoRef.current = []
        setLocallogListInfo([])
    }

    // Operation After Importing Local Plugin
    const handleImportLocalPluginFinish = () => {
        resetLocalImport()
        setVisible(false)
        sendMsgToLocalPlugin()
    }

    // Send Event Locally
    const sendMsgToLocalPlugin = () => {
        if (sendPluginLocal) {
            emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.Plugin_Local}))
            emiter.emit("onImportRefLocalPluginList", "")
        }
    }

    const getRenderByLoadMode = useMemoizedFn((type: string) => {
        switch (type) {
            case "giturl":
                return (
                    <>
                        <div className={style.giturlInfoBox}>
                            Switch to Third-Party Repo Source for Network Issues: Gitee, ghproxy.com
                        </div>
                        <Form.Item
                            labelCol={{span: 3}}
                            wrapperCol={{span: 21}}
                            name='nucleiGitUrl'
                            label='Plugin Source'
                            rules={[{required: true, message: "Required Field"}]}
                            initialValue='https://github.com/projectdiscovery/nuclei-templates'
                        >
                            <YakitSelect
                                options={[
                                    {
                                        label: "https://github.com/projectdiscovery/nuclei-templates",
                                        value: "https://github.com/projectdiscovery/nuclei-templates"
                                    },
                                    {
                                        label: "https://ghproxy.com/https://github.com/projectdiscovery/nuclei-templates",
                                        value: "https://ghproxy.com/https://github.com/projectdiscovery/nuclei-templates"
                                    }
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            labelCol={{span: 3}}
                            wrapperCol={{span: 21}}
                            name='proxy'
                            label='Proxy'
                            help='Access Code Repositories Blocked in Mainland China via Proxy: e.g., http://127.0.0.1:7890'
                        >
                            <YakitInput />
                        </Form.Item>
                    </>
                )
            case "local":
                return (
                    <YakitUploadComponent
                        step={localImportStep}
                        stepOneSubTitle={<>Select Plugin-Type Named Folder for Bulk Upload</>}
                        fileRegexInfo={{
                            fileNameRegex: /^(yak_codec|yak_mitm|yak_module|yak_nuclei|yak_portscan)$/,
                            fileNameErrorMsg: "Folder Format Not Met, Re-upload"
                        }}
                        uploadList={localUploadList}
                        onUploadList={setLocalUploadList}
                        nextTitle='Importing Plugin'
                        streamData={localStreamData}
                        logListInfo={locallogListInfo}
                    />
                )
            case "local-nuclei":
                return (
                    <>
                        <YakitFormDragger
                            key='localNucleiPath'
                            formItemProps={{
                                name: "localNucleiPath",
                                label: "Nuclei PoC Local Path",
                                labelCol: {span: 5},
                                wrapperCol: {span: 19}
                            }}
                            selectType='folder'
                            // showUploadList={false}
                            onChange={(val) => {
                                setLocalNucleiPath(val)
                                form.setFieldsValue({localNucleiPath: val})
                            }}
                            value={localNucleiPath}
                        />
                    </>
                )
            case "uploadId":
                return (
                    <>
                        <Form.Item labelCol={{span: 3}} wrapperCol={{span: 21}} name='localId' label='Plugin ID'>
                            {/* placeholder='Enter Plugin ID, Separate Multiple IDs With”English Comma“or”New Line“Split...' */}
                            <YakitInput.TextArea />
                        </Form.Item>
                    </>
                )
            default:
                break
        }
    })

    const onOk = useMemoizedFn(async () => {
        const formValue = form.getFieldsValue()

        if (loadMode === "giturl") {
            const params: YakExecutorParam[] = [
                {Key: "giturl", Value: ""},
                {Key: "nuclei-templates-giturl", Value: formValue.nucleiGitUrl}
            ]
            if (formValue.proxy?.trim() !== "") {
                params.push({Value: formValue.proxy?.trim(), Key: "proxy"})
            }

            setStartExecYakCodeModalVisible(true)
            setStartExecYakCodeVerbose("Import Online Nuclei")
            setStartExecYakCodeParams({
                Script: loadYakitPluginCode,
                Params: params
            })
        }

        if (loadMode === "local") {
            try {
                await ipcRenderer.invoke("ImportYakScript", {
                    Dirs: localUploadList.map((item) => item.path)
                })
            } catch (error) {
                yakitFailed(error + "")
            }
        }

        if (loadMode === "local-nuclei") {
            if (!formValue.localNucleiPath) {
                failed(`Enter Nuclei PoC Local Path`)
                return
            }

            setStartExecYakCodeModalVisible(true)
            setStartExecYakCodeVerbose("Import Local Nuclei")
            setStartExecYakCodeParams({
                Script: loadNucleiPoCFromLocal,
                Params: [{Key: "local-path", Value: formValue.localNucleiPath}]
            })
        }

        if (loadMode === "uploadId") {
            apiDownloadPluginOther({
                UUID: [formValue.localId]
            }).then(() => {
                setVisible(false)
                success("Plugin Imported Successfully")
            })
        }
    })

    const onCancel = useMemoizedFn(() => {
        if (loadMode === "local") {
            localStreamData && handleImportLocalPluginFinish()
        }
        setVisible(false)
    })

    const getLoadModeInfo = (key: string) => {
        const obj = loadModeInfo.find((item) => item.value === loadPluginMode)
        return obj ? obj[key] : ""
    }

    // Confirm Button Disabled
    const okBtnDisabled = useMemo(() => {
        if (loadMode === "local") {
            return !localUploadList.length
        }
        return false
    }, [loadMode, localUploadList])

    const execYakCodeReset = useMemoizedFn(() => {
        setVisible(false)
        setStartExecYakCodeModalVisible(false)
        setStartExecYakCodeVerbose("")
        setStartExecYakCodeParams(undefined)
    })

    return (
        <>
            <YakitModal
                type='white'
                visible={visible}
                onCancel={onCancel}
                width={getLoadModeInfo("width") || 680}
                closable={true}
                maskClosable={false}
                destroyOnClose={true}
                title={!loadPluginMode ? "Plugin Import Method" : <>Import{getLoadModeInfo("label")}</>}
                className={style["import-local-plugin-modal"]}
                subTitle={
                    loadPluginMode ? (
                        <></>
                    ) : (
                        <YakitRadioButtons
                            wrapClassName={style["import-local-plugin-subTitle"]}
                            buttonStyle='solid'
                            value={loadMode}
                            disabled={!!localStreamData}
                            onChange={(e) => {
                                setLoadMode(e.target.value)
                            }}
                            options={loadModeInfo.map((item) => ({value: item.value, label: item.label}))}
                        ></YakitRadioButtons>
                    )
                }
                bodyStyle={{padding: 0}}
                footerStyle={{justifyContent: "flex-end"}}
                footer={
                    <>
                        <YakitButton type={"outline2"} onClick={onCancel}>
                            {loadMode === "local" && localStreamData?.Progress === 1 ? "Complete" : "Cancel"}
                        </YakitButton>
                        <div style={{marginLeft: 12, display: localStreamData ? "none" : "block"}}>
                            <YakitButton disabled={okBtnDisabled} onClick={onOk}>
                                Import
                            </YakitButton>
                        </div>
                    </>
                }
            >
                <Form form={form} className={style["import-local-plugin-form"]}>
                    {getRenderByLoadMode(loadMode)}
                </Form>
            </YakitModal>
            <StartExecYakCodeModal
                visible={startExecYakCodeModalVisible}
                verbose={startExecYakCodeVerbose}
                params={startExecYakCodeParams as YakScriptParam}
                onClose={execYakCodeReset}
                noErrorsLogCallBack={sendMsgToLocalPlugin}
                successInfo={false}
            ></StartExecYakCodeModal>
        </>
    )
})
