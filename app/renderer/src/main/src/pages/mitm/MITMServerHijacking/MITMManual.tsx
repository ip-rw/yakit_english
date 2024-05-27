import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {Divider} from "antd"
import React, {useEffect, useState, useMemo} from "react"
import {MITMStatus} from "./MITMHijackedContent"
import styles from "./MITMServerHijacking.module.scss"
import classNames from "classnames"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {OtherMenuListProps, YakitEditorKeyCode} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {availableColors} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {EditorMenuItemType} from "@/components/yakitUI/YakitEditor/EditorMenu"
import { Uint8ArrayToString } from "@/utils/str"

const {ipcRenderer} = window.require("electron")

interface MITMManualHeardExtraProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    hijackResponseType: "onlyOne" | "all" | "never"
    setHijackResponseType: (v: "onlyOne" | "all" | "never") => void
    onDiscardRequest: () => void
    onSubmitData: () => void
    width: number
    calloutColor: string
    onSetCalloutColor: (calloutColor: string) => void
    beautifyOpen: boolean
    onSetBeautifyOpen: (beautifyOpen: boolean) => void
}
export const MITMManualHeardExtra: React.FC<MITMManualHeardExtraProps> = React.memo((props) => {
    const {
        urlInfo,
        ipInfo,
        status,
        currentIsWebsocket,
        currentIsForResponse,
        hijackResponseType,
        setHijackResponseType,
        onDiscardRequest,
        onSubmitData,
        width,
        calloutColor,
        onSetCalloutColor,
        beautifyOpen,
        onSetBeautifyOpen
    } = props
    return (
        <div className={styles["autoForward-manual"]}>
            {width > 900 && (
                <ManualUrlInfo
                    urlInfo={urlInfo}
                    ipInfo={ipInfo}
                    status={status}
                    currentIsWebsocket={currentIsWebsocket}
                    currentIsForResponse={currentIsForResponse}
                />
            )}
            <div
                className={classNames(styles["autoForward-manual-right"], {
                    [styles["autoForward-manual-right-sm"]]: width < 900
                })}
            >
                <div className={styles["manual-select"]}>
                    <div className={styles["manual-select-label"]} style={{minWidth: 60}}>
                        Color Tag:
                    </div>
                    <YakitSelect
                        size='small'
                        value={calloutColor}
                        wrapperStyle={{width: 100}}
                        onChange={(value) => {
                            onSetCalloutColor(value || "")
                        }}
                    >
                        <YakitSelect.Option value={""}>
                            <div style={{paddingLeft: 20}}>None</div>
                        </YakitSelect.Option>
                        {availableColors.map((item) => (
                            <YakitSelect.Option value={item.searchWord} key={item.searchWord}>
                                {item.render}
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </div>
                <div className={styles["manual-select"]}>
                    <span className={styles["manual-select-label"]}>Beautify:</span>
                    <YakitSwitch
                        checked={beautifyOpen}
                        onChange={onSetBeautifyOpen}
                    />
                </div>
                <div className={styles["manual-select"]}>
                    <span className={styles["manual-select-label"]}>Hijack Response:</span>
                    {/* <YakitSegmented
                        value={hijackResponseType}
                        onChange={(v) => {
                            setHijackResponseType(v as "onlyOne" | "all" | "never")
                        }}
                        options={[
                            {
                                label: "Current Request",
                                value: "onlyOne"
                            },
                            {
                                label: "All",
                                value: "all"
                            },
                            {
                                label: "Never",
                                value: "never"
                            }
                        ]}
                    /> */}
                    <YakitSwitch
                        checked={hijackResponseType === "all"}
                        onChange={(val: boolean) => {
                            if (val) setHijackResponseType("all")
                            else setHijackResponseType("never")
                        }}
                    />
                </div>
                <YakitButton
                    type='outline1'
                    colors='danger'
                    disabled={status === "hijacking"}
                    onClick={() => onDiscardRequest()}
                >
                    Drop Data
                </YakitButton>
                <YakitButton disabled={status === "hijacking"} onClick={() => onSubmitData()}>
                    Submit Data
                </YakitButton>
            </div>
        </div>
    )
})

interface ManualUrlInfoProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    className?: string
}
export const ManualUrlInfo: React.FC<ManualUrlInfoProps> = React.memo((props) => {
    const {urlInfo, ipInfo, status, currentIsWebsocket, currentIsForResponse, className} = props
    return (
        <div className={classNames(styles["autoForward-manual-urlInfo"], className)}>
            <div className={classNames(styles["manual-url-info"], "content-ellipsis")}>
                {status === "hijacking" ? "Target: Listening..." : `Target：${urlInfo}`}
            </div>
            {ipInfo && status !== "hijacking" && (
                <>
                    <Divider type='vertical' style={{margin: "0 8px", top: 0}} />
                    <span className={styles["manual-ip-info"]}>
                        <span>{ipInfo}</span> <CopyComponents copyText={ipInfo} />
                    </span>
                </>
            )}

            {currentIsWebsocket && status !== "hijacking" ? (
                <YakitTag
                    color='danger'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    Websocket {currentIsForResponse ? "Response" : "Request"}
                </YakitTag>
            ) : currentIsForResponse && status !== "hijacking" ? (
                <YakitTag
                    color='success'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    HTTP Response
                </YakitTag>
            ) : (
                <>
                    <YakitTag
                        color='success'
                        style={{
                            marginLeft: 8,
                            alignSelf: "center",
                            maxWidth: 140,
                            cursor: "pointer"
                        }}
                        size='small'
                    >
                        HTTP Request
                    </YakitTag>
                </>
            )}
        </div>
    )
})
interface MITMManualEditorProps {
    isHttp: boolean
    currentIsWebsocket: boolean
    currentPacket: Uint8Array
    setModifiedPacket: (u: Uint8Array) => void
    forResponse: boolean
    currentPacketId: number
    handleAutoForward: (v: "manual" | "log" | "passive") => void
    autoForward: "manual" | "log" | "passive"
    forward: () => void
    hijacking: () => void
    status: MITMStatus
    onSetHijackResponseType: (s: string) => void
    currentIsForResponse: boolean
    requestPacket: Uint8Array
    beautifyOpen: boolean
}
export const MITMManualEditor: React.FC<MITMManualEditorProps> = React.memo((props) => {
    const {
        isHttp,
        currentIsWebsocket,
        currentPacket,
        setModifiedPacket,
        forResponse,
        currentPacketId,
        handleAutoForward,
        autoForward,
        forward,
        hijacking,
        status,
        onSetHijackResponseType,
        currentIsForResponse,
        requestPacket,
        beautifyOpen
    } = props
    // OS Type
    const [system, setSystem] = useState<string>()

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])

    const mitmManualRightMenu: OtherMenuListProps = useMemo(() => {
        if (forResponse) {
            const menu: EditorMenuItemType[] = [
                {type: "divider"},
                {
                    key: "trigger-auto-hijacked",
                    label: "Switch to Auto Hijack Mode",
                    keybindings: [
                        YakitEditorKeyCode.Shift,
                        system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                        YakitEditorKeyCode.KEY_T
                    ]
                },
                {
                    key: "forward-response",
                    label: "Pass this HTTP Response"
                },
                {
                    key: "drop-response",
                    label: "Drop this HTTP Response"
                }
            ]
            return {
                forResponseMITMMenu: {
                    menu: menu,
                    onRun: (editor: any, key) => {
                        switch (key) {
                            case "trigger-auto-hijacked":
                                handleAutoForward(autoForward === "manual" ? "log" : "manual")
                                break
                            case "forward-response":
                                forward()
                                break
                            case "drop-response":
                                hijacking()
                                dropResponse(currentPacketId).finally(() => {
                                    // setTimeout(
                                    //     () => setLoading(false),
                                    //     300
                                    // )
                                })
                                break
                            default:
                                break
                        }
                    }
                }
            }
        } else {
            const menu: EditorMenuItemType[] = [
                {type: "divider"},
                {
                    key: "trigger-auto-hijacked",
                    label: "Switch to Auto Hijack Mode",
                    keybindings: [
                        YakitEditorKeyCode.Shift,
                        system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                        YakitEditorKeyCode.KEY_T
                    ]
                },
                {
                    key: "forward-response",
                    label: "Pass this HTTP Response",
                    keybindings: [
                        YakitEditorKeyCode.Shift,
                        system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                        YakitEditorKeyCode.KEY_F
                    ]
                },
                {
                    key: "drop-response",
                    label: "Drop this HTTP Response"
                },
                {
                    key: "hijack-current-response",
                    label: "Hijack Corresponding Response"
                }
            ]

            return {
                forResponseMITMMenu: {
                    menu: menu,
                    onRun: (editor: any, key) => {
                        switch (key) {
                            case "trigger-auto-hijacked":
                                handleAutoForward(autoForward === "manual" ? "log" : "manual")
                                break
                            case "forward-response":
                                forward()
                                break
                            case "drop-response":
                                hijacking()
                                dropResponse(currentPacketId).finally(() => {
                                    // setTimeout(
                                    //     () => setLoading(false),
                                    //     300
                                    // )
                                })
                                break
                            case "hijack-current-response":
                                onSetHijackResponseType("onlyOne")
                                setTimeout(() => {
                                    forward()
                                }, 200)
                                break
                            default:
                                break
                        }
                    }
                }
            }
        }
    }, [forResponse, isHttp])

    return (
        <NewHTTPPacketEditor
            defaultHttps={isHttp}
            originValue={currentPacket}
            noHeader={true}
            isResponse={new Buffer(currentPacket.subarray(0, 5)).toString("utf8").startsWith("HTTP/")}
            bordered={false}
            onChange={setModifiedPacket}
            noPacketModifier={true}
            readOnly={status === "hijacking"}
            refreshTrigger={(forResponse ? `rsp` : `req`) + `${currentPacketId}${Uint8ArrayToString(currentPacket)}${beautifyOpen}`}
            contextMenu={mitmManualRightMenu}
            editorOperationRecord='MITM_Manual_EDITOR_RECORF'
            isWebSocket={currentIsWebsocket && status !== "hijacking"}
            webSocketValue={requestPacket}
            webSocketToServer={currentPacket}
            webFuzzerValue={currentIsForResponse ? requestPacket : undefined}
            extraEditorProps={{
                isShowSelectRangeMenu: true
            }}
        />
    )
})

export const dropRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-request", id)
}

export const dropResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-response", id)
}
