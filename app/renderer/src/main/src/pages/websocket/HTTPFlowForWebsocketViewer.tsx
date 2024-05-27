import React, {useMemo, useState} from "react"
import {Card} from "antd"
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {Uint8ArrayToString} from "@/utils/str"
import {ThunderboltOutlined} from "@ant-design/icons"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {OtherMenuListProps, YakitEditorKeyCode} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {callCopyToClipboard} from "@/utils/basic"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {HTTPHistorySourcePageType} from "@/components/HTTPHistory"
import {OutlineLog2Icon} from "@/assets/icon/outline"
import styles from "./HTTPFlowForWebsocketViewer.module.scss"

export interface HTTPFlowForWebsocketViewerProp {
    pageType?: HTTPHistorySourcePageType
    historyId?: string
    flow: HTTPFlow
}

export const HTTPFlowForWebsocketViewer: React.FC<HTTPFlowForWebsocketViewerProp> = (props) => {
    const [mode, setMode] = useState<"request" | "response">("request")
    const {flow, historyId, pageType} = props

    const onScrollTo = useMemoizedFn(() => {
        if (historyId) {
            emiter.emit("onScrollToByClick", JSON.stringify({historyId, id: flow.Id}))
        }
    })

    const handleJumpWebTree = useMemoizedFn(() => {
        try {
            let url = new URL(flow.Url)
            emiter.emit("onHistoryJumpWebTree", JSON.stringify({host: url.host}))
        } catch (error) {
            return ""
        }
    })

    return (
        <Card
            size={"small"}
            className={styles["hTTPFlow-websocket-viewer"]}
            headStyle={{
                background: "#fff",
                height: 32,
                minHeight: 32,
                boxSizing: "content-box",
                borderBottom: "1px solid var(--yakit-border-color);"
            }}
            bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
            title={
                <div className={styles["hTTPFlow-websocket-viewer-title-wrap"]}>
                    <div className={styles["hTTPFlow-websocket-viewer-title-wrap-label"]}>Websocket</div>
                    <YakitTag color={"info"} style={{cursor: "pointer", marginRight: 0}} onClick={onScrollTo}>
                        id：{flow.Id}
                    </YakitTag>
                    <YakitRadioButtons
                        size='small'
                        buttonStyle='solid'
                        value={mode}
                        options={[
                            {value: "request", label: "Request"},
                            {value: "response", label: "Response"}
                        ]}
                        onChange={(e) => setMode(e.target.value)}
                    />
                    <YakitTag color={"info"}>
                        {mode === "request"
                            ? `Request Size：${flow.RequestSizeVerbose}`
                            : `Body Size: ${flow.BodySizeVerbose}`}
                    </YakitTag>
                    {pageType === "History" && (
                        <OutlineLog2Icon className={styles["jump-web-tree"]} onClick={handleJumpWebTree} />
                    )}
                </div>
            }
            extra={
                <div style={{display: "flex", gap: 2, alignItems: "center"}}>
                    <YakitButton
                        type={"primary"}
                        size={"small"}
                        icon={<ThunderboltOutlined />}
                        onClick={() => {
                            newWebsocketFuzzerTab(flow.IsHTTPS, flow.Request)
                        }}
                    >
                        FUZZ
                    </YakitButton>
                </div>
            }
        >
            <div style={{flex: 1, overflow: "hidden", height: "100%"}}>
                {mode === "request" && <WebSocketEditor flow={flow} value={Uint8ArrayToString(flow.Request)} />}
                {mode === "response" && <WebSocketEditor flow={flow} value={Uint8ArrayToString(flow.Response)} />}
            </div>
        </Card>
    )
}

interface WebSocketEditorProps {
    value: string
    flow: HTTPFlow
    contextMenu?: OtherMenuListProps
}
export const WebSocketEditor: React.FC<WebSocketEditorProps> = (props) => {
    const {flow, value, contextMenu = {}} = props
    // Editor Copy Url Menu Item
    const copyUrlMenuItem: OtherMenuListProps = useMemo(() => {
        return {
            copyUrl: {
                menu: [
                    {
                        key: "copy-url",
                        label: "Copy URL"
                    }
                ],
                onRun: (editor, key) => {
                    callCopyToClipboard(flow.Url || "")
                }
            }
        }
    }, [flow.Url])

    // Send to WS Fuzzer
    const sendWebSocketMenuItem: OtherMenuListProps = useMemo(() => {
        return {
            newSocket: {
                menu: [
                    {
                        key: "new-web-socket-tab",
                        label: "Send to WS Fuzzer",
                        children: [
                            {
                                key: "Send & Redirect",
                                label: "Send & Redirect",
                                keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                            },
                            {
                                key: "Send Only",
                                label: "Send Only",
                                keybindings: [
                                    YakitEditorKeyCode.Control,
                                    YakitEditorKeyCode.Shift,
                                    YakitEditorKeyCode.KEY_R
                                ]
                            }
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    try {
                        const text = flow.Request
                        if (!Uint8ArrayToString(text)) {
                            yakitNotify("info", "Packet Empty")
                            return
                        }
                        if (key === "Send & Redirect") {
                            newWebsocketFuzzerTab(flow.IsHTTPS, text)
                        } else if (key === "Send Only") {
                            newWebsocketFuzzerTab(flow.IsHTTPS, text, false)
                        }
                    } catch (e) {
                        yakitNotify("error", "editor exec new-open-fuzzer failed")
                    }
                }
            }
        }
    }, [flow.Request, flow.IsHTTPS])

    return (
        <YakitEditor
            type='http'
            value={value}
            readOnly={true}
            noMiniMap={true}
            contextMenu={{
                ...contextMenu,
                ...copyUrlMenuItem,
                ...sendWebSocketMenuItem
            }}
        />
    )
}
