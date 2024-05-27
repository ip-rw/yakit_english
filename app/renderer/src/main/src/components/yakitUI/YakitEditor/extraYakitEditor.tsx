import React, {useEffect, useMemo, useState} from "react"
import {
    OtherMenuListProps,
    YakitEditorExtraRightMenuType,
    YakitEditorKeyCode,
    YakitEditorProps,
    YakitIMonacoEditor
} from "./YakitEditorType"
import {YakitEditor} from "./YakitEditor"
import {failed, info} from "@/utils/notification"
import {newWebFuzzerTab} from "@/pages/fuzzer/HTTPFuzzerPage"
import {generateCSRFPocByRequest} from "@/pages/invoker/fromPacketToYakCode"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {callCopyToClipboard} from "@/utils/basic"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {Modal} from "antd"
import {execAutoDecode} from "@/utils/encodec"
import {YakitSystem} from "@/yakitGVDefine"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"

const {ipcRenderer} = window.require("electron")

interface HTTPPacketYakitEditor extends Omit<YakitEditorProps, "menuType"> {
    defaultHttps?: boolean
    originValue: Uint8Array
    noPacketModifier?: boolean
    extraEditorProps?: YakitEditorProps | any
    isWebSocket?: boolean
    webSocketValue?: string
    webFuzzerValue?: string
    webSocketToServer?: string
    webFuzzerCallBack?: () => void
}

export const HTTPPacketYakitEditor: React.FC<HTTPPacketYakitEditor> = React.memo((props) => {
    const {
        defaultHttps = false,
        originValue,
        noPacketModifier = false,
        extraEditorProps,
        contextMenu,
        readOnly,
        isWebSocket = false,
        webSocketValue,
        webFuzzerValue,
        webSocketToServer,
        webFuzzerCallBack,
        ...restProps
    } = props

    const [system, setSystem] = useState<YakitSystem>("Darwin")

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            setSystem(systemType)
        })
    }, [])

    const rightMenuType: YakitEditorExtraRightMenuType[] = useMemo(() => {
        if (noPacketModifier) {
            return []
        } else {
            return ["http", "customhttp", "customcontextmenu"]
        }
    }, [noPacketModifier])

    const rightContextMenu: OtherMenuListProps = useMemo(() => {
        const menuItems: OtherMenuListProps = {
            ...(contextMenu || {}),
            copyCSRF: {
                menu: [
                    {type: "divider"},
                    {
                        key: "csrfpoc",
                        label: "Copy as CSRF PoC"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = editor.getModel()?.getValue() || ""
                        if (!text) {
                            info("Packet Empty")
                            return
                        }
                        generateCSRFPocByRequest(StringToUint8Array(text, "utf8"),defaultHttps, (code) => {
                            callCopyToClipboard(code)
                        })
                    } catch (e) {
                        failed("Auto CSRF Generation Failed")
                    }
                }
            },
            openBrowser: {
                menu: [
                    {
                        key: "open-in-browser",
                        label: "Open in Browser"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        if (readOnly && originValue) {
                            showResponseViaResponseRaw(originValue)
                            return
                        }
                        const text = editor.getModel()?.getValue()
                        if (!text) {
                            failed("Cannot Retrieve Packet Content")
                            return
                        }
                        showResponseViaResponseRaw(originValue)
                    } catch (e) {
                        failed("editor exec show in browser failed")
                    }
                }
            },
            downloadBody: {
                menu: [
                    {
                        key: "download-body",
                        label: "Download Body"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        if (readOnly && originValue) {
                            ipcRenderer
                                .invoke("GetHTTPPacketBody", {PacketRaw: originValue})
                                .then((bytes: {Raw: Uint8Array}) => {
                                    saveABSFileToOpen("packet-body.txt", bytes.Raw)
                                })
                                .catch((e) => {
                                    info(`Save Failed：${e}`)
                                })
                            return
                        }
                        const text = editor.getModel()?.getValue()
                        if (!text) {
                            Modal.info({
                                title: "Download Body Failed",
                                content: <>{"No Packet - Cannot Download Body"}</>
                            })
                            return
                        }
                        ipcRenderer.invoke("GetHTTPPacketBody", {Packet: text}).then((bytes: {Raw: Uint8Array}) => {
                            saveABSFileToOpen("packet-body.txt", bytes.Raw)
                        })
                    } catch (e) {
                        failed("editor exec download body failed")
                    }
                }
            },
            autoDecode: {
                menu: [
                    {
                        key: "auto-decode",
                        label: "Smart AutoDecode (Inspector）"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = editor.getModel()?.getValueInRange(editor.getSelection() as any) || ""
                        if (!text) {
                            Modal.info({
                                title: "AutoDecode Failed",
                                content: <>{"Text Empty, Select Text to AutoDecode"}</>
                            })
                            return
                        }
                        execAutoDecode(text)
                    } catch (e) {
                        failed("editor exec auto-decode failed")
                    }
                }
            }
        }
        if (isWebSocket) {
            menuItems.newSocket = {
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
                        const text = webSocketValue || editor.getModel()?.getValue() || ""
                        if (!text) {
                            info("Packet Empty")
                            return
                        }
                        if (key === "Send & Redirect") {
                            newWebsocketFuzzerTab(defaultHttps || false, StringToUint8Array(text), true, StringToUint8Array(webSocketToServer || ""))
                        } else if (key === "Send Only") {
                            newWebsocketFuzzerTab(defaultHttps || false, StringToUint8Array(text), false, StringToUint8Array(webSocketToServer || ""))
                        }
                    } catch (e) {
                        failed("editor exec new-open-fuzzer failed")
                    }
                }
            }
        } else {
            menuItems.newFuzzer = {
                menu: [
                    {
                        key: "new-web-fuzzer-tab",
                        label: "Send to WebFuzzer",
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
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = webFuzzerValue || editor.getModel()?.getValue() || ""
                        if (!text) {
                            info("Packet Empty")
                            return
                        }
                        if (key === "Send & Redirect") {
                            newWebFuzzerTab(defaultHttps || false, text).finally(() => {
                                webFuzzerCallBack && webFuzzerCallBack()
                            })
                        } else if (key === "Send Only") {
                            newWebFuzzerTab(defaultHttps || false, text, false).finally(() => {
                                webFuzzerCallBack && webFuzzerCallBack()
                            })
                        }
                    } catch (e) {
                        failed("editor exec new-open-fuzzer failed")
                    }
                }
            }
        }
        return menuItems
    }, [defaultHttps, system, originValue, contextMenu, readOnly, isWebSocket, webSocketValue, webFuzzerValue, webSocketToServer])

    return (
        <YakitEditor
            menuType={["code", "decode", ...rightMenuType]}
            readOnly={readOnly}
            contextMenu={{...rightContextMenu}}
            {...restProps}
            {...extraEditorProps}
        />
    )
})
