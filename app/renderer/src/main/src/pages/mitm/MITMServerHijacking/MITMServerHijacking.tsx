import React, {Ref, useEffect, useRef, useState} from "react"
import {Divider, Form, Modal, notification, Typography} from "antd"
import emiter from "@/utils/eventBus/eventBus"
import ChromeLauncherButton from "@/pages/mitm/MITMChromeLauncher"
import {failed, info} from "@/utils/notification"
import {useHotkeys} from "react-hotkeys-hook"
import {useGetState, useLatest, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import {MITMFilterSchema} from "@/pages/mitm/MITMServerStartForm/MITMFilters"
import {ExecResult} from "@/pages/invoker/schema"
import {ExtractExecResultMessage} from "@/components/yakitLogSchema"
import {MITMResponse, MITMServer} from "@/pages/mitm/MITMPage"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import style from "./MITMServerHijacking.module.scss"
import {QuitIcon} from "@/assets/newIcon"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {AgentConfigModal} from "../MITMServerStartForm/MITMServerStartForm"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"

type MITMStatus = "hijacking" | "hijacked" | "idle"
const {Text} = Typography

export interface MITMServerHijackingProp {
    addr: string
    host: string
    port: number
    status: MITMStatus
    enableInitialMITMPlugin?: boolean
    defaultPlugins?: string[]
    setStatus: (status: MITMStatus) => any
    onLoading?: (loading: boolean) => any
    setVisible: (b: boolean) => void
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
    tip: string
    onSetTip: (tip: string) => void
}

const {ipcRenderer} = window.require("electron")

export interface CaCertData {
    CaCerts: Uint8Array
    LocalFile: string
}

const MITMFiltersModal = React.lazy(() => import("../MITMServerStartForm/MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("../MITMServerStartForm/MITMCertificateDownloadModal"))

export const MITMServerHijacking: React.FC<MITMServerHijackingProp> = (props) => {
    const {host, port, addr, status, setStatus, setVisible, logs, statusCards, tip, onSetTip} = props

    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)
    const [filterWebsocket, setFilterWebsocket] = useState<boolean>(false)

    useEffect(() => {
        if (!!props.enableInitialMITMPlugin && (props?.defaultPlugins || []).length > 0) {
            enableMITMPluginMode(props.defaultPlugins).then(() => {
                info("Start Initial MITM Plugin Success")
            })
        }
    }, [props.enableInitialMITMPlugin, props.defaultPlugins])

    const stop = useMemoizedFn(() => {
        // setLoading(true)
        ipcRenderer
            .invoke("mitm-stop-call")
            .then(() => {
                setStatus("idle")
            })
            .catch((e: any) => {
                notification["error"]({message: `Stop MITM Failure：${e}`})
            })
            .finally(() => {
                // setLoading(false)
            })
    })

    useEffect(() => {
        // Get WS Switch Status
        getRemoteValue(MITMConsts.MITMDefaultFilterWebsocket).then((e) => {
            const v = e === "true" ? true : false
            setFilterWebsocket(v)
        })
    }, [])

    const [downStreamAgentModalVisible, setDownStreamAgentModalVisible] = useState<boolean>(false)

    return (
        <div className={style["mitm-server"]}>
            <div className={style["mitm-server-heard"]}>
                <div className={style["mitm-server-title"]}>
                    <div className={style["mitm-server-heard-name"]}>Hijack HTTP Request</div>
                    <div className={classNames(style["mitm-server-heard-addr"], "content-ellipsis")}>
                        <span style={{marginRight: 8}}>{addr}</span>
                        {tip
                            .split("|")
                            .filter((item) => item)
                            .map((item) =>
                                !item.startsWith("Downstream Proxy") ? (
                                    <YakitTag color='success'>{item}</YakitTag>
                                ) : (
                                    <YakitTag>{item}</YakitTag>
                                )
                            )}
                    </div>
                </div>
                <div className={style["mitm-server-extra"]}>
                    <div className={style["mitm-server-links"]}>
                        <div style={{display: "flex", alignItems: "center"}}>
                            <label>
                                Filter WebSocket：
                                <YakitSwitch
                                    size='middle'
                                    checked={filterWebsocket}
                                    onChange={(value) => {
                                        setFilterWebsocket(value)
                                        setRemoteValue(MITMConsts.MITMDefaultFilterWebsocket, `${value}`)
                                        ipcRenderer.invoke("mitm-filter-websocket", value)
                                    }}
                                />
                            </label>
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setDownStreamAgentModalVisible(true)}>
                            Downstream Proxy
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setVisible(true)}>
                            Rule Config
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setFiltersVisible(true)}>
                            Filter
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setDownloadVisible(true)}>
                            Cert Download
                        </div>
                    </div>
                    {/*<YakitButton*/}
                    {/*    onClick={() => {*/}
                    {/*        showConfigSystemProxyForm(`${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`)*/}
                    {/*    }}*/}
                    {/*    type='outline2'*/}
                    {/*>*/}
                    {/*    System Proxy*/}
                    {/*</YakitButton>*/}
                    <div className={style["mitm-server-chrome"]}>
                        <ChromeLauncherButton isStartMITM={true} host={host} port={port} />
                    </div>
                    <div className={style["mitm-server-quit-icon"]}>
                        <QuitIcon onClick={() => stop()} />
                    </div>
                </div>
            </div>
            <DownStreamAgentModal
                downStreamAgentModalVisible={downStreamAgentModalVisible}
                onCloseModal={() => setDownStreamAgentModalVisible(false)}
                tip={tip}
                onSetTip={onSetTip}
            ></DownStreamAgentModal>
            <Divider style={{margin: "8px 0"}} />
            <div className={style["mitm-server-body"]}>
                <MITMServer status={status} setStatus={setStatus} logs={logs} statusCards={statusCards} />
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFiltersModal visible={filtersVisible} setVisible={setFiltersVisible} isStartMITM={true} />
                <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
            </React.Suspense>
        </div>
    )
}

interface DownStreamAgentModalProp {
    downStreamAgentModalVisible: boolean
    onCloseModal: () => void
    tip: string
    onSetTip: (tip: string) => void
}

const DownStreamAgentModal: React.FC<DownStreamAgentModalProp> = React.memo((props) => {
    const {downStreamAgentModalVisible, onCloseModal, tip, onSetTip} = props
    const [form] = Form.useForm()
    const onOKFun = useMemoizedFn(async () => {
        const tipArr = tip.split("|")
        const downstreamProxy = form.getFieldsValue().downstreamProxy
        downstreamProxyRef.current.onSetRemoteValues(downstreamProxy)
        ipcRenderer.invoke("mitm-set-downstream-proxy", downstreamProxy)
        if (downstreamProxy) {
            if (tip.indexOf("Downstream Proxy") === -1) {
                onSetTip(`Downstream Proxy${downstreamProxy}` + (tip.indexOf("|") === 0 ? tip : `|${tip}`))
            } else {
                const tipStr = tipArr
                    .map((item) => {
                        if (item.startsWith("Downstream Proxy")) {
                            return `Downstream Proxy：${downstreamProxy}`
                        } else {
                            return item
                        }
                    })
                    .join("|")
                onSetTip(tipStr)
            }
        } else {
            const tipStr = tipArr.filter((item) => !item.startsWith("Downstream Proxy")).join("|")
            onSetTip(tipStr)
        }
        onClose()
    })

    const onClose = useMemoizedFn(() => {
        onCloseModal()
    })

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
    const downstreamProxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        onGetRemoteValues: () => {},
        onSetRemoteValues: (s: string) => {}
    })

    return (
        <>
            <YakitModal
                visible={downStreamAgentModalVisible}
                title='Downstream Proxy'
                width={506}
                maskClosable={false}
                destroyOnClose={true}
                closable
                centered
                okText='Confirm'
                onCancel={onClose}
                onOk={onOKFun}
                bodyStyle={{padding: 0}}
            >
                <div style={{padding: 15}}>
                    <Form
                        form={form}
                        colon={false}
                        onSubmitCapture={(e) => e.preventDefault()}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 18}}
                        style={{height: "100%"}}
                    >
                        <Form.Item
                            label='Downstream Proxy'
                            name='downstreamProxy'
                            help={
                                <div
                                    className={style["agent-down-stream-proxy"]}
                                    onClick={() => setAgentConfigModalVisible(true)}
                                >
                                    Configure Proxy Auth
                                </div>
                            }
                        >
                            <YakitAutoComplete
                                ref={downstreamProxyRef}
                                placeholder='E.g., http://127.0.0.1:7890 or socks5://127.0.0.1:7890'
                                cacheHistoryDataKey={MITMConsts.MITMDefaultDownstreamProxyHistory}
                            />
                        </Form.Item>
                    </Form>
                </div>
            </YakitModal>
            <AgentConfigModal
                agentConfigModalVisible={agentConfigModalVisible}
                onCloseModal={() => setAgentConfigModalVisible(false)}
                generateURL={(url) => {
                    form.setFieldsValue({downstreamProxy: url})
                }}
            ></AgentConfigModal>
        </>
    )
})

export const enableMITMPluginMode = (initPluginNames?: string[]) => {
    return ipcRenderer.invoke("mitm-enable-plugin-mode", initPluginNames)
}
