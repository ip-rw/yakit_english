import React, {useEffect, useMemo, useRef, useState} from "react"
import MonacoEditor, {monaco} from "react-monaco-editor"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import HexEditor from "react-hex-editor"
// yak register
import "./monacoSpec/theme"
import "./monacoSpec/fuzzHTTP"
import "./monacoSpec/yakEditor"
import "./monacoSpec/html"
import {Button, Card, Form, Input, Modal, Popover, Space, Tag, Tooltip, Row, Col, Switch} from "antd"
import {SelectOne} from "./inputUtil"
import {EnterOutlined, FullscreenOutlined, SettingOutlined, ThunderboltFilled} from "@ant-design/icons"
import {showDrawer} from "./showModal"
import {
    execAutoDecode,
    MonacoEditorActions,
    MonacoEditorCodecActions,
    MonacoEditorMutateHTTPRequestActions
} from "./encodec"
import {HTTPPacketFuzzable} from "../components/HTTPHistory"
import ReactResizeDetector from "react-resize-detector"

import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {Buffer} from "buffer"
import {failed, info} from "./notification"
import {StringToUint8Array, Uint8ArrayToString} from "./str"
import {newWebFuzzerTab} from "../pages/fuzzer/HTTPFuzzerPage"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {editor, IPosition, IRange} from "monaco-editor"
import {generateCSRFPocByRequest} from "@/pages/invoker/fromPacketToYakCode"
import {callCopyToClipboard} from "@/utils/basic"
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers"
import ITextModel = editor.ITextModel
import {YAK_FORMATTER_COMMAND_ID, setEditorContext} from "@/utils/monacoSpec/yakEditor"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import IModelDecoration = editor.IModelDecoration
import {
    OperationRecordRes,
    OtherMenuListProps,
    YakitEditorProps
} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {HTTPPacketYakitEditor} from "@/components/yakitUI/YakitEditor/extraYakitEditor"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {formatPacketRender, prettifyPacketCode, prettifyPacketRender} from "./prettifyPacket"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import styles from "./editors.module.scss"
import classNames from "classnames"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {DataCompareModal} from "@/pages/compare/DataCompare"
import emiter from "./eventBus/eventBus"
import {v4 as uuidv4} from "uuid"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import { HighLightText } from "@/components/HTTPFlowDetail"

const {ipcRenderer} = window.require("electron")

export type IMonacoActionDescriptor = monaco.editor.IActionDescriptor

export type IMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor
export type IMonacoCodeEditor = monacoEditor.editor.ICodeEditor

export interface EditorProps {
    loading?: boolean
    value?: string
    bytes?: boolean
    valueBytes?: Uint8Array
    setValue?: (e: string) => any
    readOnly?: boolean
    editorDidMount?: (editor: IMonacoEditor) => any
    type?: "html" | "http" | "yak" | string
    theme?: string
    fontSize?: number

    // Auto Wrap? true for No Wrap, false for Wrap
    noWordWrap?: boolean
    /**@name Displays Line Breaks */
    showLineBreaks?: boolean

    noMiniMap?: boolean
    noLineNumber?: boolean
    lineNumbersMinChars?: number

    actions?: IMonacoActionDescriptor[]
    triggerId?: any

    full?: boolean
}

export interface YakHTTPPacketViewer {
    value: Uint8Array
    isRequest?: boolean
    isResponse?: boolean
    raw?: EditorProps
}

export const YakHTTPPacketViewer: React.FC<YakHTTPPacketViewer> = (props) => {
    return (
        <YakEditor
            {...props.raw}
            type={props.isRequest ? "http" : props.isResponse ? "html" : "http"}
            readOnly={true}
            value={new Buffer(props.value).toString("utf8")}
        />
    )
}

export interface YakInteractiveEditorProp {
    yakEditorProp: EditorProps
}

export const YakEditor: React.FC<EditorProps> = (props) => {
    const [editor, setEditor] = useState<IMonacoEditor>()
    const [reload, setReload] = useState(false)
    const [triggerId, setTrigger] = useState<any>()
    // Height Cache
    const [prevHeight, setPrevHeight] = useState(0)
    const [preWidth, setPreWidth] = useState(0)
    // const [editorHeight, setEditorHeight] = useState(0);
    const outterContainer = useRef(null)
    const [loading, setLoading] = useState(true)

    /** Editor Language */
    const language = useMemo(() => {
        return GetPluginLanguage(props.type || "http")
    }, [props.type])

    useMemo(() => {
        if (editor) {
            setEditorContext(editor, "plugin", props.type || "")
        }
    }, [props.type, editor])

    useEffect(() => {
        if (props.triggerId !== triggerId) {
            setTrigger(props.triggerId)
            setReload(true)
        }
    }, [props.triggerId])

    const triggerReload = useMemoizedFn(() => {
        setReload(true)
    })

    useEffect(() => {
        if (!reload) {
            return
        }
        setTimeout(() => setReload(false), 100)
    }, [reload])

    useEffect(() => {
        if (!editor) {
            return
        }

        setTimeout(() => {
            setLoading(false)
        }, 200)

        const model = editor.getModel()
        if (!model) {
            return
        }

        if (props.type === "http") {
            if (!model) {
                return
            }
            let current: string[] = []

            const applyContentLength = () => {
                const text = model.getValue()
                const match = /\nContent-Length:\s*?\d+/.exec(text)
                if (!match) {
                    return
                }
                const start = model.getPositionAt(match.index)
                const end = model.getPositionAt(match.index + match[0].indexOf(":"))
                current = model.deltaDecorations(current, [
                    {
                        id: "keyword" + match.index,
                        ownerId: 0,
                        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                        options: {afterContentClassName: "content-length"}
                    } as IModelDecoration
                ])
            }
            const applyUnicodeDecode = () => {
                const text = model.getValue()
                let match
                const regex = /(\\u[\dabcdef]{4})+/gi

                while ((match = regex.exec(text)) !== null) {
                    const start = model.getPositionAt(match.index)
                    const end = model.getPositionAt(match.index + match[0].length)
                    const decoded = match[0]
                        .split("\\u")
                        .filter(Boolean)
                        .map((hex) => String.fromCharCode(parseInt(hex, 16)))
                        .join("")
                    current = model.deltaDecorations(current, [
                        {
                            id: "decode" + match.index,
                            ownerId: 0,
                            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                            options: {
                                className: "unicode-decode",
                                hoverMessage: {value: decoded},
                                afterContentClassName: "unicode-decode",
                                after: {content: decoded, inlineClassName: "unicode-decode-after"}
                            }
                        } as IModelDecoration
                    ])
                }
            }
            const applyKeywordDecoration = () => {
                const text = model.getValue()
                const keywordRegExp = /\r?\n/g
                const decorations: IModelDecoration[] = []
                let match

                while ((match = keywordRegExp.exec(text)) !== null) {
                    const start = model.getPositionAt(match.index)
                    const className: "crlf" | "lf" = match[0] === "\r\n" ? "crlf" : "lf"
                    const end = model.getPositionAt(match.index + match[0].length)
                    decorations.push({
                        id: "keyword" + match.index,
                        ownerId: 2,
                        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                        options: {beforeContentClassName: className}
                    } as IModelDecoration)
                }
                // Apply decorations with deltaDecorations
                current = model.deltaDecorations(current, decorations)
            }
            model.onDidChangeContent((e) => {
                applyContentLength()
                applyUnicodeDecode()
                applyKeywordDecoration()
            })
            applyContentLength()
            applyUnicodeDecode()
            applyKeywordDecoration()
        }

        if (language === "yak") {
            editor.addAction({
                contextMenuGroupId: "yaklang",
                id: YAK_FORMATTER_COMMAND_ID,
                label: "Yak Code Formatter",
                run: () => {
                    yakCompileAndFormat.run(editor, model)
                    return undefined
                }
            })
        }

        if (props.actions) {
            // Register Context Menu
            props.actions.forEach((e) => {
                editor.addAction(e)
            })
        }
    }, [editor])

    const handleEditorMount = (editor: IMonacoEditor, monaco: any) => {
        editor.onDidChangeModelDecorations(() => {
            updateEditorHeight() // typing
            requestAnimationFrame(updateEditorHeight) // folding
        })

        const updateEditorHeight = () => {
            const editorElement = editor.getDomNode()

            if (!editorElement) {
                return
            }

            const padding = 40

            const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
            const lineCount = editor.getModel()?.getLineCount() || 1
            const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight + padding

            if (prevHeight !== height) {
                setPrevHeight(height)
                editorElement.style.height = `${height}px`
                editor.layout()
            }
        }
    }

    const fixContextMenu = useMemoizedFn((editor: IMonacoEditor) => {
        editor.onContextMenu((e) => {
            if (!outterContainer) {
                return
            }
            if (!outterContainer.current) {
                return
            }

            // Inject Context Menu Styling
            const divElement = outterContainer.current as HTMLDivElement
            const host = divElement.querySelector(".shadow-root-host")
            // adds the custom stylesheet once per editor
            if (host && host.shadowRoot && !host.shadowRoot.querySelector(".custom")) {
                const style = document.createElement("style")

                style.setAttribute("class", "custom")
                style.innerHTML = `
.context-view.monaco-menu-container > .monaco-scrollable-element {
    margin-left: 2px;
}
`
                host.shadowRoot.prepend(style)
            }
        })
    })

    const yakCompileAndFormat = useDebounceFn(
        useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
            const allContent = model.getValue()
            ipcRenderer
                .invoke("YaklangCompileAndFormat", {Code: allContent})
                .then((e: {Errors: YakStaticAnalyzeErrorResult[]; Code: string}) => {
                    console.info(e)
                    if (e.Code !== "") {
                        model.setValue(e.Code)
                        triggerReload()
                    }

                    if (e && e.Errors.length > 0) {
                        const markers = e.Errors.map(ConvertYakStaticAnalyzeErrorToMarker)
                        monaco.editor.setModelMarkers(model, "owner", markers)
                    } else {
                        monaco.editor.setModelMarkers(model, "owner", [])
                    }
                })
                .catch((e) => {
                    console.info(e)
                })
        }),
        {wait: 500}
    )

    const yakStaticAnalyze = useDebounceFn(
        useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
            const allContent = model.getValue()
            const type = props.type || ""
            if (language === "yak") {
                ipcRenderer
                    .invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent), PluginType: type})
                    .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                        if (e && e.Result.length > 0) {
                            const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                            monaco.editor.setModelMarkers(model, "owner", markers)
                        } else {
                            monaco.editor.setModelMarkers(model, "owner", [])
                        }
                    })
            }
        }),
        {wait: 300}
    )

    return (
        <>
            {!reload && (
                <div style={{height: "100%", width: "100%", overflow: "hidden"}} ref={outterContainer}>
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (props.full) {
                                return
                            }
                            if (!width || !height) {
                                return
                            }

                            if (editor) {
                                editor.layout({height, width})
                            }
                            setPrevHeight(height)
                            setPreWidth(width)
                        }}
                        handleWidth={true}
                        handleHeight={true}
                        refreshMode={"debounce"}
                        refreshRate={30}
                    >
                        <div
                            className={classNames({
                                [styles["monaco-editor-style"]]: !props.showLineBreaks
                            })}
                            style={{height: "100%", width: "100%", overflow: "hidden"}}
                        >
                            <MonacoEditor
                                theme={props.theme || "kurior"}
                                value={
                                    props.bytes
                                        ? new Buffer((props.valueBytes || []) as Uint8Array).toString()
                                        : props.value
                                }
                                onChange={props.setValue}
                                language={language || "http"}
                                height={100}
                                editorDidMount={(editor: IMonacoEditor, monaco: any) => {
                                    setEditor(editor)
                                    editor.setSelection({
                                        startColumn: 0,
                                        startLineNumber: 0,
                                        endColumn: 0,
                                        endLineNumber: 0
                                    })

                                    if (editor) {
                                        const model = editor.getModel()
                                        if (model) {
                                            yakStaticAnalyze.run(editor, model)
                                            model.onDidChangeContent(() => {
                                                yakStaticAnalyze.run(editor, model)
                                            })
                                        }
                                    }

                                    fixContextMenu(editor)
                                    if (props.full) {
                                        handleEditorMount(editor, monaco)
                                    }
                                    if (props.editorDidMount) props.editorDidMount(editor)
                                }}
                                options={{
                                    readOnly: props.readOnly,
                                    scrollBeyondLastLine: false,
                                    fontWeight: "500",
                                    fontSize: props.fontSize || 12,
                                    showFoldingControls: "always",
                                    showUnused: true,
                                    wordWrap: props.noWordWrap ? "off" : "on",
                                    renderLineHighlight: "line",
                                    lineNumbers: props.noLineNumber ? "off" : "on",
                                    minimap: props.noMiniMap ? {enabled: false} : undefined,
                                    lineNumbersMinChars: props.lineNumbersMinChars || 5,
                                    renderWhitespace: "all",
                                    bracketPairColorization: {
                                        enabled: true,
                                        independentColorPoolPerBracketType: true
                                    },
                                    fixedOverflowWidgets: true
                                }}
                            />
                        </div>
                    </ReactResizeDetector>
                </div>
            )}
        </>
    )
}

export interface HTTPPacketEditorProp extends HTTPPacketFuzzable {
    readOnly?: boolean
    originValue: Uint8Array
    defaultStringValue?: string
    onChange?: (i: Buffer) => any
    disableFullscreen?: boolean
    defaultHeight?: number
    bordered?: boolean
    onEditor?: (editor: IMonacoEditor) => any
    onAddOverlayWidget?: (editor: IMonacoEditor, isShow?: boolean) => any
    hideSearch?: boolean
    extra?: React.ReactNode
    emptyOr?: React.ReactNode
    actions?: MonacoEditorActions[]

    refreshTrigger?: boolean | any
    simpleMode?: boolean
    noHeader?: boolean
    loading?: boolean
    noModeTag?: boolean

    noPacketModifier?: boolean
    noTitle?: boolean
    title?: React.ReactNode
    noHex?: boolean
    noMinimap?: boolean
    noLineNumber?: boolean
    lineNumbersMinChars?: number

    extraEditorProps?: EditorProps | any

    // lang
    language?: "html" | "http" | "yak" | any

    system?: string
    isResponse?: boolean
    utf8?: boolean

    defaultSearchKeyword?: string

    /**@name Controls Wrap State Externally */
    noWordWrapState?: boolean
    /**@name Controls Font Size Externally */
    fontSizeState?: number
    /**@name Displays Line Breaks */
    showLineBreaksState?: boolean
    /**@name Controls Addition of OverlayWidget */
    isAddOverlayWidget?: boolean
}

export const YakCodeEditor: React.FC<HTTPPacketEditorProp> = React.memo((props: HTTPPacketEditorProp) => {
    return (
        <HTTPPacketEditor
            noHeader={true}
            language={props.language || "yak"}
            {...props}
            noPacketModifier={true}
            utf8={true}
            isResponse={true}
        />
    )
})

export const YakInteractiveEditor: React.FC<YakInteractiveEditorProp> = React.memo(
    (props: YakInteractiveEditorProp) => {
        return (
            <>
                <Row style={{height: "100%"}}>
                    <Col span={16}>
                        <YakEditor {...{...props.yakEditorProp, noMiniMap: true}} />
                    </Col>
                    <Col span={8}>
                        <div style={{flex: 1}}>Variable Preview</div>
                    </Col>
                </Row>
            </>
        )
    }
)
/**@name Font Size */
export const HTTP_PACKET_EDITOR_FONT_SIZE = "HTTP_PACKET_EDITOR_FONT_SIZE"
/**@name Fetches Display State of Line Breaks */
export const HTTP_PACKET_EDITOR_Line_Breaks = "HTTP_PACKET_EDITOR_Line_Breaks"
/**@name Displays Response Info */
export const HTTP_PACKET_EDITOR_Response_Info = "HTTP_PACKET_EDITOR_Response_Info"

export const HTTPPacketEditor: React.FC<HTTPPacketEditorProp> = React.memo((props: HTTPPacketEditorProp) => {
    const isResponse = props.isResponse
    const getEncoding = (): "utf8" | "latin1" | "ascii" => {
        if (isResponse || props.readOnly || props.utf8) {
            return "utf8"
        }
        // return "latin1"
        return "utf8" // Defaults to UTF8 for Compatibility
    }
    const [mode, setMode] = useState("text")
    const [strValue, setStrValue] = useState(Uint8ArrayToString(props.originValue, getEncoding()))
    const [hexValue, setHexValue] = useState<Uint8Array>(new Uint8Array(props.originValue))
    const [searchValue, setSearchValue] = useState("")
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>()
    const [fontSize, setFontSize] = useState<undefined | number>()
    const [showLineBreaks, setShowLineBreaks] = useState<boolean>(true)
    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([])
    const [noWordwrap, setNoWordwrap] = useState(false)
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    // OS Type
    const [system, setSystem] = useState<string>()

    useUpdateEffect(() => {
        setNoWordwrap(props.noWordWrapState || false)
    }, [props.noWordWrapState])
    useUpdateEffect(() => {
        if (!props.fontSizeState) return
        setFontSize(props.fontSizeState)
    }, [props.fontSizeState])
    useUpdateEffect(() => {
        setShowLineBreaks(props.showLineBreaksState || false)
    }, [props.showLineBreaksState])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))

        // Sets Minimum to 12 Regardless
        getRemoteValue(HTTP_PACKET_EDITOR_FONT_SIZE)
            .then((data: string) => {
                try {
                    const size = parseInt(data)
                    if (size > 0) {
                        setFontSize(size)
                    } else {
                        setFontSize(12)
                    }
                } catch (e) {
                    setFontSize(12)
                }
            })
            .catch(() => {
                setFontSize(12)
            })
        getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
            .then((data) => {
                setShowLineBreaks(data === "true")
            })
            .catch(() => {
                setShowLineBreaks(true)
            })
    }, [])

    const highlightActive = useMemoizedFn((search: string, regexp?: boolean) => {
        if (!monacoEditor) {
            return
        }
    })

    /*Implement Highlights in Monaco Editor？*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0)
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback(
        (offset, value) => {
            hexValue[offset] = value
            setNonce((v) => v + 1)
            setHexValue(new Uint8Array(hexValue))
        },
        [hexValue]
    )

    useEffect(() => {
        if (!props.defaultHeight) {
            return
        }

        setStrValue(props.defaultStringValue || "")
        setHexValue(StringToUint8Array(props.defaultStringValue || "", getEncoding()))
    }, [props.defaultStringValue])

    useEffect(() => {
        if (monacoEditor) {
            props.onEditor && props.onEditor(monacoEditor)
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
        if (!props.simpleMode && !props.hideSearch && monacoEditor) {
            setHighlightDecorations(monacoEditor.deltaDecorations(highlightDecorations, []))
        }
    }, [monacoEditor])

    useEffect(() => {
        if (monacoEditor) {
            props.onAddOverlayWidget && props.onAddOverlayWidget(monacoEditor, props.isAddOverlayWidget)
        }
    }, [monacoEditor, props.isAddOverlayWidget])

    useEffect(() => {
        if (props.readOnly) {
            const value = Uint8ArrayToString(props.originValue, getEncoding())
            setStrValue(value)
            setHexValue(new Uint8Array(props.originValue))
        }
        if (props.readOnly && monacoEditor) {
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
    }, [
        props.originValue,
        props.readOnly
        // monacoEditor,
    ])

    useEffect(() => {
        if (props.readOnly) {
            return
        }
        setStrValue(Uint8ArrayToString(props.originValue, getEncoding()))
        setHexValue(new Uint8Array(props.originValue))
    }, [props.refreshTrigger])

    useEffect(() => {
        props.onChange && props.onChange(new Buffer(StringToUint8Array(strValue, getEncoding())))
    }, [strValue])

    useEffect(() => {
        props.onChange && props.onChange(new Buffer(hexValue))
    }, [hexValue])

    const empty = !!props.emptyOr && props.originValue.length == 0

    // Directly Opens Search Feature if Non-Empty
    useEffect(() => {
        if (!props.defaultSearchKeyword) {
            return
        }

        if (!monacoEditor) {
            return
        }

        try {
            const model = monacoEditor.getModel()
            // @ts-ignore
            const range: IRange = model.findNextMatch(
                props.defaultSearchKeyword,
                {lineNumber: 0, column: 0} as IPosition,
                false,
                false,
                null,
                false
            ).range
            monacoEditor.setSelection(range)
            monacoEditor.revealRangeNearTop(range)
            monacoEditor.trigger("", "actions.find", undefined)
        } catch (e) {
            console.info("Failed to Load Default Search String", props.defaultSearchKeyword)
        }
    }, [props.defaultSearchKeyword, monacoEditor])
    return (
        <div style={{width: "100%", height: "100%"}}>
            <Card
                className={"flex-card"}
                size={"small"}
                loading={props.loading}
                bordered={props.bordered}
                style={{height: "100%", width: "100%"}}
                title={
                    !props.noHeader && (
                        <Space>
                            {!props.noTitle &&
                                (!!props.title ? props.title : <span>{isResponse ? "Response" : "Request"}</span>)}
                            {!props.simpleMode
                                ? !props.noHex && (
                                      <SelectOne
                                          label={" "}
                                          colon={false}
                                          value={mode}
                                          setValue={(e) => {
                                              if (mode === "text" && e === "hex") {
                                                  console.info("Switch to HEX Mode")
                                                  setHexValue(StringToUint8Array(strValue, getEncoding()))
                                              }

                                              if (mode === "hex" && e === "text") {
                                                  console.info("Switch to TEXT Mode")
                                                  setStrValue(Uint8ArrayToString(hexValue, getEncoding()))
                                              }
                                              setMode(e)
                                          }}
                                          data={[
                                              {text: "TEXT", value: "text"},
                                              {text: "HEX", value: "hex"}
                                          ]}
                                          size={"small"}
                                          formItemStyle={{marginBottom: 0}}
                                      />
                                  )
                                : !props.noModeTag && (
                                      <Form.Item style={{marginBottom: 0}}>
                                          <Tag color={"geekblue"}>{mode.toUpperCase()}</Tag>
                                      </Form.Item>
                                  )}
                            {mode === "text" && !props.hideSearch && !props.simpleMode && (
                                <Input.Search
                                    size={"small"}
                                    value={searchValue}
                                    onChange={(e) => {
                                        setSearchValue(e.target.value)
                                    }}
                                    enterButton={true}
                                    onSearch={(e) => {
                                        highlightActive(searchValue)
                                    }}
                                />
                            )}
                        </Space>
                    )
                }
                bodyStyle={{padding: 0, width: "100%", display: "flex", flexDirection: "column"}}
                extra={
                    !props.noHeader && (
                        <Space size={2}>
                            {props.extra}
                            {props.sendToWebFuzzer && props.readOnly && (
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    icon={<ThunderboltFilled />}
                                    onClick={() => {
                                        ipcRenderer.invoke("send-to-tab", {
                                            type: "fuzzer",
                                            // Encoding Here is To Prevent Changes
                                            data: {
                                                isHttps: props.defaultHttps || false,
                                                request: props.defaultPacket
                                                    ? props.defaultPacket
                                                    : Uint8ArrayToString(props.originValue, "utf8")
                                            }
                                        })
                                    }}
                                >
                                    FUZZ
                                </YakitButton>
                            )}
                            <Tooltip title={"No Wrap"}>
                                <YakitButton
                                    size={"small"}
                                    type={noWordwrap ? "text" : "primary"}
                                    icon={<EnterOutlined />}
                                    onClick={() => {
                                        setNoWordwrap(!noWordwrap)
                                    }}
                                />
                            </Tooltip>
                            {!props.simpleMode && (
                                <Popover
                                    title={"Configure Editor"}
                                    content={
                                        <>
                                            <Form
                                                onSubmitCapture={(e) => {
                                                    e.preventDefault()
                                                }}
                                                size={"small"}
                                                layout={"horizontal"}
                                                wrapperCol={{span: 14}}
                                                labelCol={{span: 10}}
                                            >
                                                {(fontSize || 0) > 0 && (
                                                    <SelectOne
                                                        formItemStyle={{marginBottom: 4}}
                                                        label={"Font Size"}
                                                        data={[
                                                            {text: "Small", value: 12},
                                                            {text: "Medium", value: 16},
                                                            {text: "Large", value: 20}
                                                        ]}
                                                        oldTheme={false}
                                                        value={fontSize}
                                                        setValue={(size) => {
                                                            setRemoteValue(HTTP_PACKET_EDITOR_FONT_SIZE, `${size}`)
                                                            setFontSize(size)
                                                        }}
                                                    />
                                                )}
                                                <Form.Item label={"Fullscreen"} style={{marginBottom: 4}}>
                                                    <YakitButton
                                                        size={"small"}
                                                        type={"text"}
                                                        icon={<FullscreenOutlined />}
                                                        onClick={() => {
                                                            showDrawer({
                                                                title: "Fullscreen",
                                                                width: "100%",
                                                                content: (
                                                                    <div style={{height: "100%", width: "100%"}}>
                                                                        <HTTPPacketEditor
                                                                            {...props}
                                                                            disableFullscreen={true}
                                                                            defaultHeight={670}
                                                                        />
                                                                    </div>
                                                                )
                                                            })
                                                            setPopoverVisible(false)
                                                        }}
                                                    />
                                                </Form.Item>
                                                {(props.language === "http" || !isResponse) && (
                                                    <Form.Item
                                                        label='Displays Line Breaks'
                                                        style={{marginBottom: 4, lineHeight: "16px"}}
                                                    >
                                                        <YakitSwitch
                                                            checked={showLineBreaks}
                                                            onChange={(checked) => {
                                                                setRemoteValue(
                                                                    HTTP_PACKET_EDITOR_Line_Breaks,
                                                                    `${checked}`
                                                                )
                                                                setShowLineBreaks(checked)
                                                            }}
                                                        />
                                                    </Form.Item>
                                                )}
                                            </Form>
                                        </>
                                    }
                                    onVisibleChange={(v) => {
                                        setPopoverVisible(v)
                                    }}
                                    overlayInnerStyle={{width: 300}}
                                    visible={popoverVisible}
                                >
                                    <YakitButton icon={<SettingOutlined />} type={"text"} size={"small"} />
                                </Popover>
                            )}
                        </Space>
                    )
                }
            >
                <div style={{flex: 1}}>
                    {empty && props.emptyOr}
                    {mode === "text" && !empty && (
                        <YakEditor
                            noLineNumber={props.noLineNumber}
                            lineNumbersMinChars={props.lineNumbersMinChars}
                            noMiniMap={props.noMinimap}
                            loading={props.loading}
                            // type={"html"}
                            type={props.language || (isResponse ? "html" : "http")}
                            value={
                                props.readOnly && props.originValue.length > 0
                                    ? new Buffer(props.originValue).toString(getEncoding())
                                    : strValue
                                // Uint8ArrayToString(props.originValue, getEncoding()) : strValue
                            }
                            readOnly={props.readOnly}
                            setValue={setStrValue}
                            noWordWrap={noWordwrap}
                            fontSize={fontSize}
                            showLineBreaks={showLineBreaks}
                            actions={[
                                ...(props.actions || []),
                                ...[
                                    {
                                        label: "Send to WebFuzzer",
                                        contextMenuGroupId: "auto-suggestion",
                                        keybindings: [
                                            (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                                                monaco.KeyCode.KeyR
                                        ],
                                        id: "new-web-fuzzer-tab",
                                        run: (e) => {
                                            try {
                                                // @ts-ignore
                                                const text = e.getModel()?.getValue() || ""
                                                if (!text) {
                                                    info("Packet Empty")
                                                    return
                                                }
                                                newWebFuzzerTab(props.defaultHttps || false, text).finally(() => {
                                                    // info(`New WebFuzzer Tab Creation Requires HTTPS Decision by User`)
                                                    // Modal.info({
                                                    //     title: "Note",
                                                    //     content: (
                                                    //         <></>
                                                    //     )
                                                    // })
                                                })
                                            } catch (e) {
                                                failed("editor exec codec failed")
                                            }
                                        }
                                    },
                                    {
                                        label: "Smart AutoDecode (Inspector）",
                                        contextMenuGroupId: "auto-suggestion",
                                        id: "auto-decode",
                                        run: (e) => {
                                            try {
                                                // @ts-ignore
                                                const text =
                                                    e.getModel()?.getValueInRange(e.getSelection() as any) || ""
                                                if (!text) {
                                                    Modal.info({
                                                        title: "AutoDecode Failed",
                                                        content: <>{"Text Empty, Select Text to AutoDecode"}</>
                                                    })
                                                    return
                                                }
                                                execAutoDecode(text)
                                            } catch (e) {
                                                failed("editor exec codec failed")
                                            }
                                        }
                                    },
                                    {
                                        label: "Download Body",
                                        contextMenuGroupId: "auto-suggestion",
                                        id: "download-body",
                                        run: (e) => {
                                            try {
                                                if (props.readOnly && props.originValue) {
                                                    ipcRenderer
                                                        .invoke("GetHTTPPacketBody", {PacketRaw: props.originValue})
                                                        .then((bytes: {Raw: Uint8Array}) => {
                                                            saveABSFileToOpen("packet-body.txt", bytes.Raw)
                                                        })
                                                        .catch((e) => {
                                                            info(`Save Failed：${e}`)
                                                        })
                                                    return
                                                }
                                                // @ts-ignore
                                                const text = e.getModel()?.getValue()
                                                if (!text) {
                                                    Modal.info({
                                                        title: "Download Body Failed",
                                                        content: <>{"No Packet - Cannot Download Body"}</>
                                                    })
                                                    return
                                                }
                                                ipcRenderer
                                                    .invoke("GetHTTPPacketBody", {Packet: text})
                                                    .then((bytes: {Raw: Uint8Array}) => {
                                                        saveABSFileToOpen("packet-body.txt", bytes.Raw)
                                                    })
                                            } catch (e) {
                                                failed("editor exec download body failed")
                                            }
                                        }
                                    },
                                    {
                                        label: "Open in Browser",
                                        contextMenuGroupId: "auto-suggestion",
                                        id: "open-in-browser",
                                        run: (e) => {
                                            try {
                                                if (props.readOnly && props.originValue) {
                                                    showResponseViaResponseRaw(props.originValue)
                                                    return
                                                }
                                                // @ts-ignore
                                                const text = e.getModel()?.getValue()
                                                if (!text) {
                                                    failed("Cannot Retrieve Packet Content")
                                                    return
                                                }
                                                showResponseViaResponseRaw(props.originValue)
                                            } catch (e) {
                                                failed("editor exec show in browser failed")
                                            }
                                        }
                                    },
                                    {
                                        label: "Copy as CSRF PoC",
                                        contextMenuGroupId: "auto-suggestion",
                                        id: "csrfpoc",
                                        run: (e) => {
                                            try {
                                                // @ts-ignore
                                                const text = e.getModel()?.getValue() || ""
                                                if (!text) {
                                                    info("Packet Empty")
                                                    return
                                                }
                                                generateCSRFPocByRequest(
                                                    StringToUint8Array(text, "utf8"),
                                                    props.defaultHttps || false,
                                                    (code) => {
                                                        callCopyToClipboard(code)
                                                    }
                                                )
                                            } catch (e) {
                                                failed("Auto CSRF Generation Failed")
                                            }
                                        }
                                    },
                                    ...MonacoEditorCodecActions
                                ],
                                ...(props.noPacketModifier ? [] : MonacoEditorMutateHTTPRequestActions)
                            ].filter((i) => !!i)}
                            editorDidMount={(editor) => {
                                setMonacoEditor(editor)
                            }}
                            {...props.extraEditorProps}
                        />
                    )}
                    {mode === "hex" && !empty && (
                        <HexEditor
                            className={classNames({[styles["hex-editor-style"]]: props.system === "Windows_NT"})}
                            showAscii={true}
                            data={hexValue}
                            showRowLabels={true}
                            showColumnLabels={false}
                            nonce={nonce}
                            onSetValue={props.readOnly ? undefined : handleSetValue}
                        />
                    )}
                </div>
            </Card>
        </div>
    )
})

interface DataCompareProps {
    rightCode: Uint8Array
    /** Use leftCode if Exists, Otherwise Display showValue */
    leftCode?: Uint8Array
    leftTitle?: string
    rightTitle?: string
}

export interface NewHTTPPacketEditorProp extends HTTPPacketFuzzable {
    /** yakit-editor Base Attributes */
    disabled?: boolean
    readOnly?: boolean
    contextMenu?: OtherMenuListProps
    noLineNumber?: boolean
    lineNumbersMinChars?: number
    noMinimap?: boolean
    onAddOverlayWidget?: (editor: IMonacoEditor, isShow?: boolean) => any
    extraEditorProps?: YakitEditorProps | any

    highLightText?: HighLightText[]

    /** Extended Attributes */
    originValue: Uint8Array
    defaultStringValue?: string
    onChange?: (i: Buffer) => any
    disableFullscreen?: boolean
    defaultHeight?: number
    bordered?: boolean
    onEditor?: (editor: IMonacoEditor) => any
    hideSearch?: boolean
    extra?: React.ReactNode
    extraEnd?: React.ReactNode
    emptyOr?: React.ReactNode

    refreshTrigger?: boolean | any
    simpleMode?: boolean
    noHeader?: boolean
    loading?: boolean
    noModeTag?: boolean

    noPacketModifier?: boolean
    noTitle?: boolean
    title?: React.ReactNode
    noHex?: boolean

    // lang
    language?: "html" | "http" | "yak" | any

    system?: string
    isResponse?: boolean
    utf8?: boolean
    theme?: string

    defaultSearchKeyword?: string

    isWebSocket?: boolean
    webSocketValue?: Uint8Array
    webSocketToServer?: Uint8Array

    /**@name Controls Wrap State Externally */
    noWordWrapState?: boolean
    /**@name Controls Font Size Externally */
    fontSizeState?: number
    /**@name Displays Line Breaks */
    showLineBreaksState?: boolean
    /**@name Controls Addition of OverlayWidget */
    isAddOverlayWidget?: boolean
    /**@name Controls Operation Logging Externally (Including Font Size and Line Breaks)) */
    editorOperationRecord?: string
    /**@name Controls WebFuzzer Data Externally */
    webFuzzerValue?: Uint8Array
    /**@name Opens WebFuzzer Callback */
    webFuzzerCallBack?: () => void
    /**@name Displays Beautification/Render TYPE (Defaults to Display)) */
    isShowBeautifyRender?: boolean
    /**@name Displays Extra Options by Default */
    showDefaultExtra?: boolean
    /**@name Data Comparison (Defaults to None)) */
    dataCompare?: DataCompareProps
    /**Default to Beautify or Render on Selection */
    typeOptionVal?: RenderTypeOptionVal
    onTypeOptionVal?: (s?: RenderTypeOptionVal) => void
}

export type RenderTypeOptionVal = "beautify" | "render"

interface TypeOptionsProps {
    value: RenderTypeOptionVal
    label: string
}

interface RefreshEditorOperationRecordProps extends OperationRecordRes {
    editorId: string
}

export const NewHTTPPacketEditor: React.FC<NewHTTPPacketEditorProp> = React.memo((props: NewHTTPPacketEditorProp) => {
    const isResponse = props.isResponse
    const {
        originValue,
        isShowBeautifyRender = true,
        showDefaultExtra = true,
        dataCompare,
        editorOperationRecord,
        typeOptionVal,
        onTypeOptionVal,
        highLightText = []
    } = props
    
    const getEncoding = (): "utf8" | "latin1" | "ascii" => {
        if (isResponse || props.readOnly || props.utf8) {
            return "utf8"
        }
        // return "latin1"
        return "utf8" // Defaults to UTF8 for Compatibility
    }
    const [mode, setMode] = useState("text")
    const [strValue, setStrValue] = useState(Uint8ArrayToString(originValue, getEncoding()))
    const [hexValue, setHexValue] = useState<Uint8Array>(new Uint8Array(originValue))
    const [searchValue, setSearchValue] = useState("")
    const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>()
    const [fontSize, setFontSize] = useState<undefined | number>(12)
    const [showLineBreaks, setShowLineBreaks] = useState<boolean>(true)
    const [highlightDecorations, setHighlightDecorations] = useState<any[]>([])
    const [noWordwrap, setNoWordwrap] = useState(false)
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    const [type, setType] = useState<"beautify" | "render">()
    const [typeOptions, setTypeOptions] = useState<TypeOptionsProps[]>([])
    const [showValue, setShowValue] = useState<Uint8Array>(originValue)
    const [renderHtml, setRenderHTML] = useState<React.ReactNode>()
    const [typeLoading, setTypeLoading] = useState<boolean>(false)

    // Compare Loading
    const [compareLoading, setCompareLoading] = useState<boolean>(false)

    // OS Type
    const [system, setSystem] = useState<string>()

    // Editor ID for Identification
    const [editorId, setEditorId] = useState<string>(uuidv4())

    // Load Last Selected Font Size/Line Breaks
    const onRefreshEditorOperationRecord = useMemoizedFn((v) => {
        const obj: RefreshEditorOperationRecordProps = JSON.parse(v)
        if (obj.editorId === editorId) {
            if (obj?.fontSize) {
                setFontSize(obj.fontSize)
            } else {
                setShowLineBreaks(obj.showBreak || false)
            }
        }
    })

    useEffect(() => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                if (!data) return
                let obj: OperationRecordRes = JSON.parse(data)
                if (obj?.fontSize) {
                    setFontSize(obj?.fontSize)
                }
                if (typeof obj?.showBreak === "boolean") {
                    setShowLineBreaks(obj?.showBreak)
                }
            })
        }
    }, [])

    useEffect(() => {
        emiter.on("refreshEditorOperationRecord", onRefreshEditorOperationRecord)
        return () => {
            emiter.off("refreshEditorOperationRecord", onRefreshEditorOperationRecord)
        }
    }, [])

    useUpdateEffect(() => {
        setNoWordwrap(props.noWordWrapState || false)
    }, [props.noWordWrapState])
    useUpdateEffect(() => {
        if (!props.fontSizeState) return
        setFontSize(props.fontSizeState)
    }, [props.fontSizeState])
    useUpdateEffect(() => {
        setShowLineBreaks(props.showLineBreaksState || false)
    }, [props.showLineBreaksState])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
        getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
            .then((data) => {
                setShowLineBreaks(data === "true")
            })
            .catch(() => {
                setShowLineBreaks(true)
            })
    }, [])

    const highlightActive = useMemoizedFn((search: string, regexp?: boolean) => {
        if (!monacoEditor) {
            return
        }
    })

    /*Implement Highlights in Monaco Editor？*/
    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

    // hex editor
    const [nonce, setNonce] = useState(0)
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback(
        (offset, value) => {
            hexValue[offset] = value
            setNonce((v) => v + 1)
            setHexValue(new Uint8Array(hexValue))
        },
        [hexValue]
    )

    const openCompareModal = useMemoizedFn((dataCompare) => {
        setCompareLoading(true)
        setTimeout(() => {
            const m = showYakitModal({
                title: null,
                content: (
                    <DataCompareModal
                        onClose={() => m.destroy()}
                        rightTitle={dataCompare.rightTitle}
                        leftTitle={dataCompare.leftTitle}
                        leftCode={
                            dataCompare.leftCode
                                ? Uint8ArrayToString(dataCompare.leftCode)
                                : Uint8ArrayToString(showValue)
                        }
                        rightCode={Uint8ArrayToString(dataCompare.rightCode)}
                        loadCallBack={() => setCompareLoading(false)}
                    />
                ),
                onCancel: () => {
                    m.destroy()
                },
                width: 1200,
                footer: null,
                closable: false,
                hiddenHeader: true
            })
        }, 500)
    })

    useEffect(() => {
        if (!props.defaultHeight) {
            return
        }

        setStrValue(props.defaultStringValue || "")
        setHexValue(StringToUint8Array(props.defaultStringValue || "", getEncoding()))
    }, [props.defaultStringValue])

    useEffect(() => {
        if (monacoEditor) {
            props.onEditor && props.onEditor(monacoEditor)
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
        if (!props.simpleMode && !props.hideSearch && monacoEditor) {
            setHighlightDecorations(monacoEditor.deltaDecorations(highlightDecorations, []))
        }
    }, [monacoEditor])
    useEffect(() => {
        if (monacoEditor) {
            props.onAddOverlayWidget && props.onAddOverlayWidget(monacoEditor, props.isAddOverlayWidget)
        }
    }, [monacoEditor, props.isAddOverlayWidget])
    useEffect(() => {
        if (props.readOnly) {
            const value = Uint8ArrayToString(showValue, getEncoding())
            setStrValue(value)
            setHexValue(new Uint8Array(showValue))
        }
        if (props.readOnly && monacoEditor) {
            monacoEditor.setSelection({startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0})
        }
    }, [
        showValue,
        props.readOnly
        // monacoEditor,
    ])

    useEffect(() => {
        if (props.readOnly) {
            return
        }
        setStrValue(Uint8ArrayToString(originValue, getEncoding()))
        setHexValue(new Uint8Array(originValue))
    }, [props.refreshTrigger])

    useEffect(() => {
        props.onChange && props.onChange(new Buffer(StringToUint8Array(strValue, getEncoding())))
    }, [strValue])

    useEffect(() => {
        props.onChange && props.onChange(new Buffer(hexValue))
    }, [hexValue])

    const empty = !!props.emptyOr && originValue.length == 0

    // Directly Opens Search Feature if Non-Empty
    useEffect(() => {
        if (!props.defaultSearchKeyword) {
            return
        }

        if (!monacoEditor) {
            return
        }

        try {
            const model = monacoEditor.getModel()
            // @ts-ignore
            const range: IRange = model.findNextMatch(
                props.defaultSearchKeyword,
                {lineNumber: 0, column: 0} as IPosition,
                false,
                false,
                null,
                false
            ).range
            monacoEditor.setSelection(range)
            monacoEditor.revealRangeNearTop(range)
            monacoEditor.trigger("", "actions.find", undefined)
        } catch (e) {
            console.info("Failed to Load Default Search String", props.defaultSearchKeyword)
        }
    }, [props.defaultSearchKeyword, monacoEditor])

    useEffect(() => {
        setRenderHTML(undefined)
        setTypeOptions([])
        setShowValue(originValue)
        if (originValue.length > 0) {
            // Display originValue by Default
            const encoder = new TextEncoder()
            const bytes = encoder.encode(Uint8ArrayToString(originValue))
            const mb = bytes.length / 1024 / 1024
            // Only Beautify Contents Below 0.5MB
            if (isResponse) {
                formatPacketRender(originValue, (packet) => {
                    if (packet) {
                        if (mb > 0.5) {
                            setTypeOptions([
                                {
                                    value: "render",
                                    label: "Render"
                                }
                            ])
                            return
                        }
                        setTypeOptions([
                            {
                                value: "beautify",
                                label: "Beautify"
                            },
                            {
                                value: "render",
                                label: "Render"
                            }
                        ])
                    } else {
                        if (mb > 0.5) return
                        setTypeOptions([
                            {
                                value: "beautify",
                                label: "Beautify"
                            }
                        ])
                    }
                })
            } else {
                if (mb > 0.5) return
                setTypeOptions([
                    {
                        value: "beautify",
                        label: "Beautify"
                    }
                ])
            }
        } else {
            setTypeOptions([])
        }
    }, [originValue])

    const isShowBeautifyRenderRef = useRef<boolean>()
    useEffect(() => {
        isShowBeautifyRenderRef.current = isShowBeautifyRender
    }, [isShowBeautifyRender])

    useUpdateEffect(() => {
        setType(typeOptionVal)
        if (typeOptionVal === "beautify") {
            if (originValue) {
                beautifyCode()
            }
        } else if (typeOptionVal === "render") {
            if (originValue) {
                renderCode()
            }
        }
    }, [typeOptionVal, originValue])

    const beautifyCode = useDebounceFn(
        useMemoizedFn(async () => {
            if (!isShowBeautifyRenderRef.current || typeOptions.findIndex((i) => i.value === "beautify") === -1) return
            setTypeLoading(true)
            setRenderHTML(undefined)
            if (originValue.length > 0) {
                let beautifyValue = await prettifyPacketCode(new Buffer(originValue).toString("utf8"))
                setShowValue(beautifyValue as Uint8Array)
                setTypeLoading(false)
            } else {
                setShowValue(new Uint8Array())
                setTypeLoading(false)
            }
        }),
        {
            wait: 300
        }
    ).run

    const renderCode = useDebounceFn(
        useMemoizedFn(async () => {
            if (!isShowBeautifyRenderRef.current || typeOptions.findIndex((i) => i.value === "render") === -1) return
            setTypeLoading(true)
            let renderValue = await prettifyPacketRender(originValue)
            setRenderHTML(
                <iframe srcDoc={renderValue as string} style={{width: "100%", height: "100%", border: "none"}} />
            )
            setTypeLoading(false)
        }),
        {wait: 300}
    ).run

    useUpdateEffect(() => {
        onTypeOptionVal && onTypeOptionVal(type)
        if (originValue && type === undefined) {
            setRenderHTML(undefined)
            setShowValue(originValue)
        } else if (originValue && type === "beautify") {
            beautifyCode()
        } else if (originValue && type === "render") {
            renderCode()
        }
    }, [type])

    return (
        <div className={styles["new-http-packet-editor"]}>
            <Card
                className={"flex-card"}
                size={"small"}
                loading={props.loading || typeLoading}
                bordered={props.bordered}
                style={{height: "100%", width: "100%", backgroundColor: "#f0f2f5"}}
                title={
                    !props.noHeader && (
                        <div style={{display: "flex", gap: 2}}>
                            {!props.noTitle &&
                                (!!props.title ? (
                                    props.title
                                ) : (
                                    <span style={{fontSize: 12}}>{isResponse ? "Response" : "Request"}</span>
                                ))}
                            {!props.simpleMode
                                ? !props.noHex && (
                                      <SelectOne
                                          label={" "}
                                          colon={false}
                                          value={mode}
                                          setValue={(e) => {
                                              if (mode === "text" && e === "hex") {
                                                  console.info("Switch to HEX Mode")
                                                  setHexValue(StringToUint8Array(strValue, getEncoding()))
                                              }

                                              if (mode === "hex" && e === "text") {
                                                  console.info("Switch to TEXT Mode")
                                                  setStrValue(Uint8ArrayToString(hexValue, getEncoding()))
                                              }
                                              setMode(e)
                                          }}
                                          data={[
                                              {text: "TEXT", value: "text"},
                                              {text: "HEX", value: "hex"}
                                          ]}
                                          size={"small"}
                                          formItemStyle={{marginBottom: 0}}
                                      />
                                  )
                                : !props.noModeTag && (
                                      <Form.Item style={{marginBottom: 0}}>
                                          <Tag color={"geekblue"}>{mode.toUpperCase()}</Tag>
                                      </Form.Item>
                                  )}
                            {mode === "text" && !props.hideSearch && !props.simpleMode && (
                                <Input.Search
                                    size={"small"}
                                    value={searchValue}
                                    onChange={(e) => {
                                        setSearchValue(e.target.value)
                                    }}
                                    enterButton={true}
                                    onSearch={(e) => {
                                        highlightActive(searchValue)
                                    }}
                                />
                            )}
                        </div>
                    )
                }
                bodyStyle={{padding: 0, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}
                extra={
                    !props.noHeader && (
                        <div style={{display: "flex", gap: 2, alignItems: "center"}}>
                            {props.extra}
                            {isShowBeautifyRender && (
                                <div className={classNames(styles["type-options-checkable-tag"])}>
                                    {typeOptions.map((item) => (
                                        <YakitCheckableTag
                                            key={item.value}
                                            checked={type === item.value}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setType(item.value)
                                                } else {
                                                    setType(undefined)
                                                }
                                            }}
                                        >
                                            {item.label}
                                        </YakitCheckableTag>
                                    ))}
                                </div>
                            )}
                            {dataCompare && dataCompare.rightCode.length > 0 && (
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    loading={compareLoading}
                                    onClick={() => {
                                        // ipcRenderer
                                        // .invoke("send-to-tab", {
                                        //     type: "add-data-compare",
                                        //     data: {
                                        //         leftData:Uint8ArrayToString(showValue),
                                        //         rightData:Uint8ArrayToString(dataCompare)
                                        //     }
                                        // })
                                        openCompareModal(dataCompare)
                                    }}
                                >
                                    Compare
                                </YakitButton>
                            )}
                            {props.sendToWebFuzzer && props.readOnly && (
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    icon={<ThunderboltFilled />}
                                    onClick={() => {
                                        ipcRenderer.invoke("send-to-tab", {
                                            type: "fuzzer",
                                            // Encoding Here is To Prevent Changes
                                            data: {
                                                isHttps: props.defaultHttps || false,
                                                request: props.defaultPacket
                                                    ? props.defaultPacket
                                                    : Uint8ArrayToString(originValue, "utf8")
                                            }
                                        })
                                    }}
                                >
                                    FUZZ
                                </YakitButton>
                            )}
                            {showDefaultExtra && (
                                <>
                                    <Tooltip title={"No Wrap"}>
                                        <YakitButton
                                            size={"small"}
                                            type={noWordwrap ? "text" : "primary"}
                                            icon={<EnterOutlined />}
                                            onClick={() => {
                                                setNoWordwrap(!noWordwrap)
                                            }}
                                        />
                                    </Tooltip>
                                    {!props.simpleMode && (
                                        <Popover
                                            title={"Configure Editor"}
                                            content={
                                                <>
                                                    <Form
                                                        onSubmitCapture={(e) => {
                                                            e.preventDefault()
                                                        }}
                                                        size={"small"}
                                                        layout={"horizontal"}
                                                        wrapperCol={{span: 14}}
                                                        labelCol={{span: 10}}
                                                    >
                                                        {(fontSize || 0) > 0 && (
                                                            <SelectOne
                                                                formItemStyle={{marginBottom: 4}}
                                                                label={"Font Size"}
                                                                data={[
                                                                    {text: "Small", value: 12},
                                                                    {text: "Medium", value: 16},
                                                                    {text: "Large", value: 20}
                                                                ]}
                                                                oldTheme={false}
                                                                value={fontSize}
                                                                setValue={(size) => {
                                                                    setFontSize(size)
                                                                }}
                                                            />
                                                        )}
                                                        <Form.Item label={"Fullscreen"} style={{marginBottom: 4}}>
                                                            <YakitButton
                                                                size={"small"}
                                                                type={"text"}
                                                                icon={<FullscreenOutlined />}
                                                                onClick={() => {
                                                                    showDrawer({
                                                                        title: "Fullscreen",
                                                                        width: "100%",
                                                                        content: (
                                                                            <div
                                                                                style={{height: "100%", width: "100%"}}
                                                                            >
                                                                                <HTTPPacketEditor
                                                                                    {...props}
                                                                                    disableFullscreen={true}
                                                                                    defaultHeight={670}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    })
                                                                    setPopoverVisible(false)
                                                                }}
                                                            />
                                                        </Form.Item>
                                                        {(props.language === "http" || !isResponse) && (
                                                            <Form.Item
                                                                label='Displays Line Breaks'
                                                                style={{marginBottom: 4, lineHeight: "16px"}}
                                                            >
                                                                <YakitSwitch
                                                                    checked={showLineBreaks}
                                                                    onChange={(checked) => {
                                                                        setRemoteValue(
                                                                            HTTP_PACKET_EDITOR_Line_Breaks,
                                                                            `${checked}`
                                                                        )
                                                                        setShowLineBreaks(checked)
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                        )}
                                                    </Form>
                                                </>
                                            }
                                            onVisibleChange={(v) => {
                                                setPopoverVisible(v)
                                            }}
                                            overlayInnerStyle={{width: 300}}
                                            visible={popoverVisible}
                                        >
                                            <YakitButton icon={<SettingOutlined />} type={"text"} size={"small"} />
                                        </Popover>
                                    )}
                                </>
                            )}
                            {props.extraEnd}
                        </div>
                    )
                }
            >
                <div style={{flex: 1, overflow: "hidden"}}>
                    {empty && props.emptyOr}
                    {renderHtml}
                    {mode === "text" && !empty && !renderHtml && (
                        <HTTPPacketYakitEditor
                            theme={props.theme}
                            noLineNumber={props.noLineNumber}
                            lineNumbersMinChars={props.lineNumbersMinChars}
                            noMiniMap={props.noMinimap}
                            type={props.language || (isResponse ? "html" : "http")}
                            originValue={showValue}
                            value={
                                props.readOnly && showValue.length > 0
                                    ? new Buffer(showValue).toString(getEncoding())
                                    : strValue
                            }
                            readOnly={props.readOnly}
                            disabled={props.disabled}
                            setValue={setStrValue}
                            noWordWrap={noWordwrap}
                            fontSize={fontSize}
                            showLineBreaks={showLineBreaks}
                            contextMenu={props.contextMenu || {}}
                            noPacketModifier={props.noPacketModifier}
                            editorDidMount={(editor) => {
                                setMonacoEditor(editor)
                            }}
                            editorOperationRecord={editorOperationRecord}
                            defaultHttps={props.defaultHttps}
                            isWebSocket={props.isWebSocket}
                            webSocketValue={
                                props.webSocketValue && new Buffer(props.webSocketValue).toString(getEncoding())
                            }
                            webSocketToServer={
                                props.webSocketToServer && new Buffer(props.webSocketToServer).toString(getEncoding())
                            }
                            webFuzzerValue={
                                props.webFuzzerValue && new Buffer(props.webFuzzerValue).toString(getEncoding())
                            }
                            webFuzzerCallBack={props.webFuzzerCallBack}
                            editorId={editorId}
                            highLightText={type === undefined ? highLightText : []}
                            {...props.extraEditorProps}
                        />
                    )}
                    {mode === "hex" && !empty && !renderHtml && (
                        <HexEditor
                            className={classNames({[styles["hex-editor-style"]]: props.system === "Windows_NT"})}
                            showAscii={true}
                            data={hexValue}
                            showRowLabels={true}
                            showColumnLabels={false}
                            nonce={nonce}
                            onSetValue={props.readOnly ? undefined : handleSetValue}
                        />
                    )}
                </div>
            </Card>
        </div>
    )
})
