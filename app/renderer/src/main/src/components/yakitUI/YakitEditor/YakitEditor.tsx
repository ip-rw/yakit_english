import React, {useEffect, useMemo, useRef, useState} from "react"
import ReactDOM from "react-dom"
import {
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useKeyPress,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect,
    useInViewport
} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import MonacoEditor, {monaco} from "react-monaco-editor"
// Editor Registration
import "@/utils/monacoSpec/theme"
import "@/utils/monacoSpec/fuzzHTTP"
import "@/utils/monacoSpec/yakEditor"
import "@/utils/monacoSpec/html"

import {
    YakitIMonacoEditor,
    YakitEditorProps,
    YakitITextModel,
    YakitEditorKeyCode,
    KeyboardToFuncProps,
    YakitIModelDecoration,
    OperationRecord,
    OperationRecordRes,
    OtherMenuListProps
} from "./YakitEditorType"
import {showByRightContext} from "../YakitMenu/showByRightContext"
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers"
import {StringToUint8Array} from "@/utils/str"
import {baseMenuLists, extraMenuLists} from "./contextMenus"
import {EditorMenu, EditorMenuItemDividerProps, EditorMenuItemProps, EditorMenuItemType} from "./EditorMenu"
import {YakitSystem} from "@/yakitGVDefine"
import cloneDeep from "lodash/cloneDeep"
import {convertKeyboard, keySortHandle} from "./editorUtils"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"

import classNames from "classnames"
import styles from "./YakitEditor.module.scss"
import "./StaticYakitEditor.scss"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {YakScript} from "@/pages/invoker/schema"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {v4 as uuidv4} from "uuid"
import {editor as newEditor} from "monaco-editor"
import IModelDecoration = newEditor.IModelDecoration
import {
    CountDirectionProps,
    HTTPFuzzerClickEditorMenu,
    HTTPFuzzerRangeEditorMenu,
    HTTPFuzzerRangeReadOnlyEditorMenu
} from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import {QueryFuzzerLabelResponseProps} from "@/pages/fuzzer/StringFuzzer"
import {insertFileFuzzTag, insertTemporaryFileFuzzTag} from "@/pages/fuzzer/InsertFileFuzzTag"
import {monacoEditorWrite} from "@/pages/fuzzer/fuzzerTemplates"
import {onInsertYakFuzzer, showDictsAndSelect} from "@/pages/fuzzer/HTTPFuzzerPage"
import {openExternalWebsite} from "@/utils/openWebsite"
import emiter from "@/utils/eventBus/eventBus"
import {GetPluginLanguage, PluginGV} from "@/pages/plugins/builtInData"
import {createRoot} from "react-dom/client"
import {setEditorContext} from "@/utils/monacoSpec/yakEditor"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"
import {HighLightText} from "@/components/HTTPFlowDetail"

interface CodecTypeProps {
    key?: string
    verbose: string
    subTypes?: CodecTypeProps[]
    params?: YakParamProps[]
    help?: React.ReactNode
    isYakScript?: boolean
}

interface contextMenuProps{
    key: string
    value: string
    isAiPlugin: boolean
}

const { ipcRenderer } = window.require("electron")

/** @name Font Key to Size */
const keyToFontSize: Record<string, number> = {
    "font-size-small": 12,
    "font-size-middle": 16,
    "font-size-large": 20
}

/** Default Right Menu - Top */
const DefaultMenuTop: EditorMenuItemType[] = [
    {
        key: "font-size",
        label: "Font Size",
        children: [
            {key: "font-size-small", label: "Small"},
            {key: "font-size-middle", label: "Medium"},
            {key: "font-size-large", label: "Large"}
        ]
    }
]

/** Default Right Menu - Bottom */
const DefaultMenuBottom: EditorMenuItemType[] = [
    {key: "cut", label: "Cut"},
    {key: "copy", label: "Copy"},
    {key: "paste", label: "Paste"}
]

export const YakitEditor: React.FC<YakitEditorProps> = React.memo((props) => {
    const {
        forceRenderMenu = false,
        menuType = [],
        isBytes = false,
        value,
        valueBytes,
        setValue,
        type,
        theme = "kurior",
        editorDidMount,
        contextMenu = {},
        onContextMenu,
        readOnly = false,
        disabled = false,
        noWordWrap = false,
        noMiniMap = false,
        noLineNumber = false,
        lineNumbersMinChars = 5,
        fontSize = 12,
        showLineBreaks = false,
        editorOperationRecord,
        isShowSelectRangeMenu = false,
        selectNode,
        rangeNode,
        overLine = 3,
        editorId,
        highLightText = []
    } = props

    const systemRef = useRef<YakitSystem>("Darwin")
    const wrapperRef = useRef<HTMLDivElement>(null)
    const isInitRef = useRef<boolean>(false)

    const [editor, setEditor] = useState<YakitIMonacoEditor>()
    const preWidthRef = useRef<number>(0)
    const preHeightRef = useRef<number>(0)

    /** Editor Language */
    const language = useMemo(() => {
        return GetPluginLanguage(type || "http")
    }, [type])

    useMemo(() => {
        if (editor) {
            setEditorContext(editor, "plugin", props.type || "")
        }
    }, [props.type, editor])

    /** @name Records Context Menu Info */
    const rightContextMenu = useRef<EditorMenuItemType[]>([...DefaultMenuTop, ...DefaultMenuBottom])
    /** @name Records Key of Shortcut Item in Context Menu */
    const keyBindingRef = useRef<KeyboardToFuncProps>({})
    /** @name Menu Relationship [Group Key-Item Keys Array]] */
    const keyToOnRunRef = useRef<Record<string, string[]>>({})

    const [showBreak, setShowBreak, getShowBreak] = useGetState<boolean>(showLineBreaks)
    const [nowFontsize, setNowFontsize] = useState<number>(fontSize)

    useEffect(() => {
        // Editor Blur Control
        if (disabled) {
            const fakeInput = document.createElement("input")
            document.body.appendChild(fakeInput)
            fakeInput.focus()
            document.body.removeChild(fakeInput)
        }
    }, [disabled])

    // Block URL Clicks, Open in System Browser
    useEffect(() => {
        monaco.editor.registerLinkOpener({
            open: (link) => {
                // Open Link in System Browser
                openExternalWebsite(link.toString())
                return true
            }
        })
    }, [])

    useUpdateEffect(() => {
        if (fontSize) {
            setNowFontsize(fontSize)
            onOperationRecord("fontSize", fontSize)
        }
    }, [fontSize])

    useUpdateEffect(() => {
        setShowBreak(showLineBreaks)
        onOperationRecord("showBreak", showLineBreaks)
    }, [showLineBreaks])

    // Custom HTTP Payload Transformation
    const [customHTTPMutatePlugin, setCustomHTTPMutatePlugin] = useState<CodecTypeProps[]>([])
    const searchCodecCustomHTTPMutatePlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                setCustomHTTPMutatePlugin(
                    i.map((script) => {
                        return {
                            key: script.ScriptName,
                            verbose: "CODEC Community Plugin: " + script.ScriptName,
                            isYakScript: true
                        } as CodecTypeProps
                    })
                )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [PluginGV.PluginCodecHttpSwitch]
        )
    })

    // Execute Custom Context Menu
    const [contextMenuPlugin, setContextMenuPlugin] = useState<contextMenuProps[]>([])
    const searchCodecCustomContextMenuPlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                setContextMenuPlugin(
                    i.map((script) => {
                        const isAiPlugin:boolean = script.Tags.includes("AI Tools")
                        return {
                            key: script.ScriptName,
                            value: script.ScriptName,
                            isAiPlugin
                        } as contextMenuProps
                    })
                )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [PluginGV.PluginCodecContextMenuExecuteSwitch]
        )
    })

    const ref = useRef(null);
    const [inViewport] = useInViewport(ref);

    useEffect(() => {
        if(inViewport){
            searchCodecCustomHTTPMutatePlugin()
            searchCodecCustomContextMenuPlugin()
        }
    }, [inViewport])

    /**
     * Map Context Menu Relationships
     * Menu Group Key to Item Keys
     */
    useEffect(() => {
        // Inject Codec Plugin to Menu Group
        try {
            // Custom HTTP Payload Transformation
            ;(extraMenuLists["customhttp"].menu[0] as EditorMenuItemProps).children = customHTTPMutatePlugin.map(
                (item) => {
                    return {
                        key: item.key,
                        label: item.key
                    } as EditorMenuItemProps
                }
            )
            // Execute Custom Context Menu
            ; (extraMenuLists["customcontextmenu"].menu[0] as EditorMenuItemProps).children = contextMenuPlugin.map((item) => {
                return {
                    key: item.value,
                    label: item.key,
                    isAiPlugin: item.isAiPlugin
                } as EditorMenuItemProps
            })
        } catch (e) {
            failed(`get custom plugin failed: ${e}`)
        }

        const keyToRun: Record<string, string[]> = {}
        const allMenu = {...baseMenuLists, ...extraMenuLists, ...contextMenu}

        for (let key in allMenu) {
            const keys: string[] = []
            for (let item of allMenu[key].menu) {
                if ((item as EditorMenuItemProps)?.key) keys.push((item as EditorMenuItemProps)?.key)
            }
            keyToRun[key] = keys
        }

        keyToOnRunRef.current = { ...keyToRun }
    }, [contextMenu,customHTTPMutatePlugin,contextMenuPlugin])

    const {getCurrentSelectPageId} = usePageInfo((s) => ({getCurrentSelectPageId: s.getCurrentSelectPageId}), shallow)

    /** Menu Item Click Event */
    const {run: menuItemHandle} = useDebounceFn(
        useMemoizedFn((key: string, keyPath: string[]) => {
            if (!editor) return
            /** Method Executed (onRightContextMenu)) */
            let executeFunc = false

            if (keyPath.length === 2) {
                const menuName = keyPath[1]
                const menuItemName = keyPath[0]
                for (let name in keyToOnRunRef.current) {
                    if (keyToOnRunRef.current[name].includes(menuName)) {
                        const allMenu = { ...baseMenuLists, ...extraMenuLists, ...contextMenu }
                        let pageId:string|undefined
                        let isAiPlugin: boolean = false
                        // Execute Custom Right-Click with Params
                        if(keyPath.includes("customcontextmenu")){
                            // Get Page Unique Identifier
                            pageId = getCurrentSelectPageId(YakitRoute.HTTPFuzzer)
                            // AI Plugin Check
                            try {
                                // @ts-ignore
                               allMenu[name].menu[0]?.children.map((item)=>{
                                    if(item.key === menuItemName&&item.isAiPlugin){
                                        isAiPlugin = true
                                    }
                                }) 
                            } catch (error) {}
                        }
                        
                        allMenu[name].onRun(editor, menuItemName,pageId,isAiPlugin)
                        executeFunc = true
                        onRightContextMenu(menuItemName)
                        break
                    }
                }
            }
            // Block customhttp/customcontextmenu on Single Layer
            if (keyPath.length === 1) {
                if (keyPath.includes("customhttp") || keyPath.includes("customcontextmenu")) return
                const menuName = keyPath[0]
                for (let name in keyToOnRunRef.current) {
                    if (keyToOnRunRef.current[name].includes(menuName)) {
                        const allMenu = {...baseMenuLists, ...extraMenuLists, ...contextMenu}
                        allMenu[name].onRun(editor, menuName)
                        executeFunc = true
                        onRightContextMenu(menuName)
                        break
                    }
                }
            }

            if (!executeFunc) onRightContextMenu(key)
            return
        }),
        {wait: 300}
    )
    /** Operation Log Storage */
    const onOperationRecord = (type: "fontSize" | "showBreak", value: number | boolean) => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                if (!data) {
                    let obj: OperationRecord = {
                        [type]: value
                    }
                    setRemoteValue(editorOperationRecord, JSON.stringify(obj))
                } else {
                    let obj: OperationRecord = JSON.parse(data)
                    obj[type] = value
                    setRemoteValue(editorOperationRecord, JSON.stringify(obj))
                }
            })
        }
    }

    /** Context Menu Item Click Callback */
    const onRightContextMenu = useMemoizedFn((key: string) => {
        /** Get ITextModel Instance */
        const model = editor?.getModel()

        switch (key) {
            case "font-size-small":
            case "font-size-middle":
            case "font-size-large":
                if (editor?.updateOptions) {
                    onOperationRecord("fontSize", keyToFontSize[key] || 12)
                    if (editorId) {
                        emiter.emit(
                            "refreshEditorOperationRecord",
                            JSON.stringify({
                                editorId,
                                fontSize: keyToFontSize[key] || 12
                            })
                        )
                    } else {
                        setNowFontsize(keyToFontSize[key] || 12)
                    }
                }
                return
            case "http-show-break":
                onOperationRecord("showBreak", getShowBreak())
                if (editorId) {
                    emiter.emit(
                        "refreshEditorOperationRecord",
                        JSON.stringify({
                            editorId,
                            showBreak: !getShowBreak()
                        })
                    )
                } else {
                    setShowBreak(!getShowBreak())
                }
                return
            case "yak-formatter":
                if (!model) return
                yakCompileAndFormat.run(editor, model)
                return

            default:
                if (onContextMenu && editor) onContextMenu(editor, key)
                return
        }
    })

    /** Menu Shortcut Key Render Event */
    const contextMenuKeybindingHandle = useMemoizedFn((parentKey: string, data: EditorMenuItemType[]) => {
        const menus: EditorMenuItemType[] = []
        for (let item of data) {
            /** Hide Menu Divider */
            if (typeof (data as any as EditorMenuItemDividerProps)["type"] !== "undefined") {
                const info: EditorMenuItemDividerProps = {type: "divider"}
                menus.push(info)
            } else {
                /** Process Shortcut Menu Item */
                const info = item as EditorMenuItemProps
                if (info.children && info.children.length > 0) {
                    info.children = contextMenuKeybindingHandle(info.key, info.children)
                } else {
                    if (info.key === "cut" && info.label === "Cut") {
                        const keysContent = convertKeyboard(systemRef.current, [
                            systemRef.current === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                            YakitEditorKeyCode.KEY_X
                        ])

                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>Cut</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                    if (info.key === "copy" && info.label === "Copy") {
                        const keysContent = convertKeyboard(systemRef.current, [
                            systemRef.current === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                            YakitEditorKeyCode.KEY_C
                        ])
                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>Copy</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                    if (info.key === "paste" && info.label === "Paste") {
                        const keysContent = convertKeyboard(systemRef.current, [
                            systemRef.current === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                            YakitEditorKeyCode.KEY_V
                        ])
                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>Paste</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }

                    if (info.keybindings && info.keybindings.length > 0) {
                        const keysContent = convertKeyboard(systemRef.current, info.keybindings)

                        // Shortcut Key Callback Recording
                        if (keysContent) {
                            let sortKeys = keySortHandle(info.keybindings)
                            keyBindingRef.current[sortKeys.join("-")] = parentKey ? [info.key, parentKey] : [info.key]
                        }

                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>{info.label}</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                }
                menus.push(info)
            }
        }
        return menus
    })

    const sortMenuFun = useMemoizedFn((dataSource, sortData) => {
        const result = sortData.reduce(
            (acc, item) => {
                if (item.order >= 0) {
                    acc.splice(item.order, 0, ...item.menu)
                } else {
                    acc.push(...item.menu)
                }
                return acc
            },
            [...dataSource]
        )
        return result
    })
    /** Right-Click Add in .yak Files'Yak Code Formatter'Feature */
    useEffect(() => {
        /**
         * @description Effect of Logic Below on Context Menu Rendering
         */
        // if (isInitRef.current) return

        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            systemRef.current = systemType

            rightContextMenu.current = [...DefaultMenuTop]
            keyBindingRef.current = {}

            if (type === "http") {
                rightContextMenu.current = rightContextMenu.current.concat([
                    {key: "http-show-break", label: getShowBreak() ? "Hide Newline" : "Show Newline"}
                ])
            }
            if (language === "yak") {
                rightContextMenu.current = rightContextMenu.current.concat([
                    {type: "divider"},
                    {key: "yak-formatter", label: "Yak Code Formatter"}
                ])
            }
            if (menuType.length > 0) {
                const types = Array.from(new Set(menuType))
                for (let key of types)
                    rightContextMenu.current = rightContextMenu.current.concat([
                        {type: "divider"},
                        cloneDeep(extraMenuLists[key].menu[0])
                    ])
            }

            // Cache Sortable Custom Menus
            let sortContextMenu: OtherMenuListProps[] = []
            for (let menus in contextMenu) {
                /* Sortable Items */
                if (typeof contextMenu[menus].order === "number") {
                    sortContextMenu = sortContextMenu.concat(cloneDeep(contextMenu[menus]))
                } else {
                    /** Performance Issue with reactnode in cloneDeep */
                    rightContextMenu.current = rightContextMenu.current.concat(cloneDeep(contextMenu[menus].menu))
                }
            }

            // Default Bottom Menu
            rightContextMenu.current = rightContextMenu.current.concat([...DefaultMenuBottom])

            // Sorting Required for order Items
            if (sortContextMenu.length > 0) {
                rightContextMenu.current = sortMenuFun(rightContextMenu.current, sortContextMenu)
            }

            rightContextMenu.current = contextMenuKeybindingHandle("", rightContextMenu.current)

            if (!forceRenderMenu) isInitRef.current = true
        })
    }, [forceRenderMenu, menuType, contextMenu])

    /**
     * Editor Extra Rendering:
     * Visualize Newlines
     */
    const pasteWarning = useThrottleFn(
        () => {
            failed("Paste Delay Message")
        },
        {wait: 500}
    )

    const deltaDecorationsRef = useRef<() => any>()
    const highLightTextFun = useMemoizedFn(() => highLightText)
    useEffect(() => {
        if (!editor) {
            return
        }
        const model = editor.getModel()
        if (!model) {
            return
        }
        let current: string[] = []
        if (props.type === "http" || props.type === "html") {
            /** Random Context ID */
            const randomStr = randomString(10)
            /** Context ID for Custom Commands */
            let yakitEditor = editor.createContextKey(randomStr, false)
            // @ts-ignore
            yakitEditor.set(true)
            /* limited paste by interval */
            let lastPasteTime = 0
            let pasteLimitInterval = 80
            editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
                () => {
                    const current = new Date().getTime()
                    const currentInterval = current - lastPasteTime
                    if (currentInterval < pasteLimitInterval) {
                        pasteWarning.run()
                    } else {
                        lastPasteTime = current
                        editor.trigger("keyboard", "editor.action.clipboardPasteAction", {})
                    }
                },
                randomStr
            )
            const generateDecorations = (): YakitIModelDecoration[] => {
                // const text = model.getValue();
                const endsp = model.getPositionAt(1800)
                const text =
                    endsp.lineNumber === 1
                        ? model.getValueInRange({
                              startLineNumber: 1,
                              startColumn: 1,
                              endLineNumber: 1,
                              endColumn: endsp.column
                          })
                        : model.getValueInRange({
                              startLineNumber: 1,
                              startColumn: 1,
                              endLineNumber: endsp.lineNumber,
                              endColumn: endsp.column
                          })

                const dec: YakitIModelDecoration[] = []
                if (props.type === "http") {
                    ;(() => {
                        try {
                            ;[{regexp: /\nContent-Length:\s*?\d+/, classType: "content-length"}].map((detail) => {
                                // handle content-length
                                const match = detail.regexp.exec(text)
                                if (!match) {
                                    return
                                }
                                const start = model.getPositionAt(match.index)
                                const end = model.getPositionAt(match.index + match[0].indexOf(":"))
                                dec.push({
                                    id: detail.classType + match.index,
                                    ownerId: 0,
                                    range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                    options: {afterContentClassName: detail.classType}
                                } as YakitIModelDecoration)
                            })
                        } catch (e) {}
                    })()
                    ;(() => {
                        try {
                            ;[{regexp: /\nHost:\s*?.+/, classType: "host"}].map((detail) => {
                                // handle host
                                const match = detail.regexp.exec(text)
                                if (!match) {
                                    return
                                }
                                const start = model.getPositionAt(match.index)
                                const end = model.getPositionAt(match.index + match[0].indexOf(":"))
                                dec.push({
                                    id: detail.classType + match.index,
                                    ownerId: 0,
                                    range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                    options: {afterContentClassName: detail.classType}
                                } as YakitIModelDecoration)
                            })
                        } catch (e) {}
                    })()
                }
                if (props.type === "html" || props.type === "http") {
                    ;(() => {
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
                            dec.push({
                                id: "decode" + match.index,
                                ownerId: 1,
                                range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                options: {
                                    className: "unicode-decode",
                                    hoverMessage: {value: decoded},
                                    afterContentClassName: "unicode-decode",
                                    after: {content: decoded, inlineClassName: "unicode-decode-after"}
                                }
                            } as IModelDecoration)
                        }
                    })()
                }
                ;(() => {
                    const keywordRegExp = /\r?\n/g
                    let match
                    let count = 0
                    while ((match = keywordRegExp.exec(text)) !== null) {
                        count++
                        const start = model.getPositionAt(match.index)
                        const className: "crlf" | "lf" = match[0] === "\r\n" ? "crlf" : "lf"
                        const end = model.getPositionAt(match.index + match[0].length)
                        dec.push({
                            id: "keyword" + match.index,
                            ownerId: 2,
                            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                            options: {beforeContentClassName: className}
                        } as YakitIModelDecoration)
                        if (count > 19) {
                            return
                        }
                    }
                })()
                ;(() => {
                    highLightTextFun().forEach(({startOffset = 0, highlightLength = 0, hoverVal = ""}) => {
                        // GetPosition by Offset
                        const startPosition = model.getPositionAt(Number(startOffset))
                        const endPosition = model.getPositionAt(Number(startOffset) + Number(highlightLength))

                        // Create Decoration Option
                        dec.push({
                            id: "hight-light-text_" + startOffset + "_" + highlightLength + "_" + hoverVal,
                            ownerId: 3,
                            range: new monaco.Range(
                                startPosition.lineNumber,
                                startPosition.column,
                                endPosition.lineNumber,
                                endPosition.column
                            ),
                            options: {
                                isWholeLine: false,
                                className: "hight-light-bg-color",
                                hoverMessage: [{value: hoverVal, isTrusted: true}]
                            }
                        } as IModelDecoration)
                    })
                })()

                return dec
            }
            
            deltaDecorationsRef.current = () => {
                current = model.deltaDecorations(current, generateDecorations())
            }
            editor.onDidChangeModelContent(() => {
                current = model.deltaDecorations(current, generateDecorations())
            })
            current = model.deltaDecorations(current, generateDecorations())
        }
        return () => {
            try {
                editor.dispose()
            } catch (e) {}
        }
    }, [editor])
    useEffect(() => {
        if (deltaDecorationsRef.current) {
            deltaDecorationsRef.current()
        }
    }, [JSON.stringify(highLightText)])

    /** Rt-Menu Newline Render Toggle Text */
    useEffect(() => {
        const flag = rightContextMenu.current.filter((item) => {
            return (item as EditorMenuItemProps)?.key === "http-show-break"
        })
        if (flag.length > 0 && type === "http") {
            for (let item of rightContextMenu.current) {
                const info = item as EditorMenuItemProps
                if (info?.key === "http-show-break") info.label = getShowBreak() ? "Hide Newline" : "Show Newline"
            }
        }
    }, [showBreak])

    const showContextMenu = useMemoizedFn(() => {
        showByRightContext(
            <EditorMenu
                size='rightMenu'
                data={[...rightContextMenu.current]}
                onClick={({key, keyPath}) => menuItemHandle(key, keyPath)}
            />
        )
    })

    /** Shortcut Key Listener */
    useKeyPress(
        (e) => true,
        (e) => {
            const filterKey = [16, 17, 18, 93]
            if (filterKey.includes(e.keyCode)) return

            let activeKey: number[] = []
            if (e.shiftKey) activeKey.push(16)
            if (e.ctrlKey) activeKey.push(17)
            if (e.altKey) activeKey.push(18)
            if (e.metaKey) activeKey.push(93)
            activeKey.push(e.keyCode)
            if (activeKey.length <= 1) return
            activeKey = keySortHandle(activeKey)

            const keyToMenu = keyBindingRef.current[activeKey.join("-")]
            if (!keyToMenu) return

            e.stopPropagation()
            menuItemHandle(keyToMenu[0], keyToMenu)
        },
        {target: wrapperRef}
    )

    /** Editor Height Issue, Use ref not state */
    const handleEditorMount = (editor: YakitIMonacoEditor, monaco: any) => {
        editor.onDidChangeModelDecorations(() => {
            updateEditorHeight() // typing
            /**
             * @description Auto Screen Refresh Rate for Timers (IE9+)
             */
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

            if (preHeightRef.current !== height) {
                preHeightRef.current = height
                // setPreHeight(height)
                editorElement.style.height = `${height}px`
                editor.layout()
            }
        }
    }

    /** Yak Code Formatter Implementation */
    const yakCompileAndFormat = useDebounceFn(
        useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
            const allContent = model.getValue()
            ipcRenderer
                .invoke("YaklangCompileAndFormat", {Code: allContent})
                .then((e: {Errors: YakStaticAnalyzeErrorResult[]; Code: string}) => {
                    if (e.Code !== "") {
                        model.setValue(e.Code)
                    }

                    /** Error Marker in Editor */
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
        {wait: 500, leading: true, trailing: false}
    )
    /** Yak Error Check and Marker */
    const yakStaticAnalyze = useDebounceFn(
        useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
            if (language === "yak") {
                const allContent = model.getValue()
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
            } else {
                monaco.editor.setModelMarkers(model, "owner", [])
            }
        }),
        {wait: 300}
    )

    const downPosY = useRef<number>()
    const upPosY = useRef<number>()
    const onScrollTop = useRef<number>()
    // Editor Info (Dimensions))
    const editorInfo = useRef<any>()
    useEffect(() => {
        if (editor && isShowSelectRangeMenu) {
            editerMenuFun(editor)
        }
    }, [editor, isShowSelectRangeMenu])
    // Dismiss Timer
    const fizzSelectTimeoutId = useRef<NodeJS.Timeout>()
    const fizzRangeTimeoutId = useRef<NodeJS.Timeout>()
    // Editor Menu
    const editerMenuFun = (editor: YakitIMonacoEditor) => {
        // Editor’s Unique Popup Click ID
        const selectId: string = `monaco.fizz.select.widget-${uuidv4()}`
        // Editor’s Unique Selection Popup ID
        const rangeId: string = `monaco.fizz.range.widget-${uuidv4()}`
        // Insert Tag
        const insertLabelFun = (v: QueryFuzzerLabelResponseProps) => {
            if (v.Label) {
                editor && editor.trigger("keyboard", "type", {text: v.Label})
            } else if (v.DefaultDescription === "Insert File-fixed") {
                editor && insertFileFuzzTag((i) => monacoEditorWrite(editor, i), "file:line")
            } else if (v.DefaultDescription === "Insert Payload-fixed") {
                editor &&
                    showDictsAndSelect((i) => {
                        monacoEditorWrite(editor, i, editor.getSelection())
                    })
            } else if (v.DefaultDescription === "Insert Temp Dictionary-fixed") {
                editor && insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
            }
        }

        // Menu Displayed on Click in Editor
        const fizzSelectWidget = {
            isOpen: false,
            getId: function () {
                return selectId
            },
            getDomNode: function () {
                // Convert TSX to DOM Node
                const domNode = document.createElement("div")
                // Solve Mouse Wheel Scrolling Issue in Popup
                domNode.onwheel = (e) => e.stopPropagation()
                if (selectNode) {
                    createRoot(domNode).render(selectNode(closeFizzSelectWidget, editorInfo.current))
                } else {
                    createRoot(domNode).render(
                        <HTTPFuzzerClickEditorMenu
                            editorInfo={editorInfo.current}
                            close={() => closeFizzSelectWidget()}
                            fizzSelectTimeoutId={fizzSelectTimeoutId}
                            insert={(v: QueryFuzzerLabelResponseProps) => {
                                insertLabelFun(v)
                                closeFizzSelectWidget()
                            }}
                            addLabel={() => {
                                closeFizzSelectWidget()
                                onInsertYakFuzzer(editor)
                            }}
                        />
                    )
                }
                return domNode
            },
            getPosition: function () {
                const currentPos = editor.getPosition()
                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // Update Widget Position
                this.getPosition()
                editor.layoutContentWidget(this)
            }
        }
        // Menu Displayed on Selection in Editor
        const fizzRangeWidget = {
            isOpen: false,
            getId: function () {
                return rangeId
            },
            getDomNode: function () {
                // Convert TSX to DOM Node
                const domNode = document.createElement("div")
                // Solve Mouse Wheel Scrolling Issue in Popup
                domNode.onwheel = (e) => e.stopPropagation()
                if (rangeNode) {
                    createRoot(domNode).render(rangeNode(closeFizzRangeWidget, editorInfo.current))
                } else {
                    readOnly
                        ? createRoot(domNode).render(
                              <HTTPFuzzerRangeReadOnlyEditorMenu
                                  editorInfo={editorInfo.current}
                                  rangeValue={
                                      (editor && editor.getModel()?.getValueInRange(editor.getSelection() as any)) || ""
                                  }
                                  close={() => closeFizzRangeWidget()}
                                  fizzRangeTimeoutId={fizzRangeTimeoutId}
                              />
                          )
                        : createRoot(domNode).render(
                              <HTTPFuzzerRangeEditorMenu
                                  editorInfo={editorInfo.current}
                                  close={() => closeFizzRangeWidget()}
                                  insert={(fun: any) => {
                                      if (editor) {
                                          const selectedText =
                                              editor.getModel()?.getValueInRange(editor.getSelection() as any) || ""
                                          if (selectedText.length > 0) {
                                              ipcRenderer
                                                  .invoke("QueryFuzzerLabel")
                                                  .then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
                                                      const {Data} = data
                                                      let newSelectedText: string = selectedText
                                                      if (Array.isArray(Data) && Data.length > 0) {
                                                          // Selection in Tags
                                                          let isHave: boolean = Data.map((item) => item.Label).includes(
                                                              selectedText
                                                          )
                                                          if (isHave) {
                                                              newSelectedText = selectedText.replace(/{{|}}/g, "")
                                                          }
                                                      }
                                                      const text: string = fun(newSelectedText)
                                                      editor.trigger("keyboard", "type", {text})
                                                  })
                                          }
                                      }
                                  }}
                                  replace={(text: string) => {
                                      if (editor) {
                                          editor.trigger("keyboard", "paste", {text})
                                          closeFizzRangeWidget()
                                      }
                                  }}
                                  rangeValue={
                                      (editor && editor.getModel()?.getValueInRange(editor.getSelection() as any)) || ""
                                  }
                                  fizzRangeTimeoutId={fizzRangeTimeoutId}
                                  hTTPFuzzerClickEditorMenuProps={
                                      readOnly
                                          ? undefined
                                          : {
                                                editorInfo: editorInfo.current,
                                                close: () => closeFizzRangeWidget(),
                                                insert: (v: QueryFuzzerLabelResponseProps) => {
                                                    insertLabelFun(v)
                                                    closeFizzRangeWidget()
                                                },
                                                addLabel: () => {
                                                    closeFizzRangeWidget()
                                                    onInsertYakFuzzer(editor)
                                                }
                                            }
                                  }
                              />
                          )
                }
                return domNode
            },
            getPosition: function () {
                const currentPos = editor.getPosition()

                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // Update Widget Position
                this.getPosition()
                editor.layoutContentWidget(this)
            }
        }
        // Menu Visibility
        // if (false) {
        //     closeFizzSelectWidget()
        //     return
        // }

        // Close Clicked Menu
        const closeFizzSelectWidget = () => {
            fizzSelectWidget.isOpen = false
            fizzSelectTimeoutId.current && clearTimeout(fizzSelectTimeoutId.current)
            editor.removeContentWidget(fizzSelectWidget)
        }
        // Close Selected Menu
        const closeFizzRangeWidget = () => {
            fizzRangeWidget.isOpen = false
            fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
            editor.removeContentWidget(fizzRangeWidget)
        }

        // Editor Update Before Close
        closeFizzSelectWidget()
        closeFizzRangeWidget()

        editor?.getModel()?.pushEOL(newEditor.EndOfLineSequence.CRLF)
        editor.onMouseMove((e) => {
            try {
                // const pos = e.target.position
                // if (pos?.lineNumber) {
                //     const lineOffset = pos.lineNumber - (editor.getPosition()?.lineNumber || 0)
                //     // Remove Menu if Out of Range
                //     if (lineOffset > 2 || lineOffset < -2) {
                //         // console.log("Within Two Lines");
                //         closeFizzSelectWidget()
                //         closeFizzRangeWidget()
                //     }
                // }

                const {target, event} = e
                const {posy} = event
                const detail =
                    target.type === newEditor.MouseTargetType.CONTENT_WIDGET ||
                    target.type === newEditor.MouseTargetType.OVERLAY_WIDGET
                        ? target.detail
                        : undefined
                const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
                if (detail !== selectId && detail !== rangeId && downPosY.current && upPosY.current) {
                    const overHeight = overLine * lineHeight
                    if (fizzSelectWidget.isOpen) {
                        if (posy < upPosY.current - overHeight || posy > upPosY.current + overHeight) {
                            closeFizzSelectWidget()
                        }
                    } else if (fizzRangeWidget.isOpen) {
                        // Selection Range From Top to Bottom
                        if (
                            downPosY.current < upPosY.current &&
                            (posy < downPosY.current - overHeight || posy > upPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                        // Selection Range From Bottom to Top
                        else if (
                            downPosY.current > upPosY.current &&
                            (posy < upPosY.current - overHeight || posy > downPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            }
        })

        // Trigger on Exiting Editor
        // editor.onMouseLeave(() => {
        //     closeFizzSelectWidget()
        //     closeFizzRangeWidget()
        // })

        editor.onMouseDown((e) => {
            const {leftButton, posy} = e.event
            // When Neither are Open
            if (leftButton && !fizzSelectWidget.isOpen && !fizzRangeWidget.isOpen) {
                // Record posy Position
                downPosY.current = posy
            }
        })

        editor.onMouseUp((e) => {
            // @ts-ignore
            const {leftButton, rightButton, posx, posy, editorPos} = e.event
            // Get Editor’s x, y, Dimensions
            const {x, y} = editorPos
            const editorHeight = editorPos.height
            const editorWidth = editorPos.width

            // Calculate Focus Coordinates
            let a: any = editor.getPosition()
            const position = editor.getScrolledVisiblePosition(a)
            if (position) {
                // Get Focus Position in Editor, Height per Line Varies with Font Size）
                const {top, left, height} = position

                // Solution 1
                // Get Focus Position to Determine Editor Location (Top, Bottom, Left, Right) for Popup Direction
                // Issue: Need Focus Position to Calculate. How to Get? Only Line and Column Numbers Found, No Exact Coordinates
                // console.log("Focus Position：", e, x, left, y, top, x + left, y + top)
                const focusX = x + left
                const focusY = y + top

                // Focus and Lift-Off Coordinates Within Bounds
                const isOver: boolean = overLine * height < Math.abs(focusY - posy)
                if (leftButton && !isOver) {
                    // Get Editor Container Info to Determine Specific Position in Editor
                    const editorContainer = editor.getDomNode()
                    if (editorContainer) {
                        const editorContainerInfo = editorContainer.getBoundingClientRect()
                        const {top, bottom, left, right} = editorContainerInfo
                        // Display Based on Editor Size (Hide if Width < 250 or Height < 200))
                        const isShowByLimit = right - left > 250 && bottom - top > 200
                        // Determine Focus Position
                        const isTopHalf = focusY < (top + bottom) / 2
                        const isLeftHalf = focusX < (left + right) / 2
                        // Line Height
                        // const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)

                        let countDirection: CountDirectionProps = {}
                        if (isTopHalf) {
                            // Mouse on Top Half of Editor
                            countDirection.y = "top"
                        } else {
                            // Mouse on Bottom Half of Editor
                            countDirection.y = "bottom"
                        }
                        if (Math.abs(focusX - (left + right) / 2) < 50) {
                            // Mouse in Middle of Editor
                            countDirection.x = "middle"
                        } else if (isLeftHalf) {
                            // Mouse on Left Half of Editor
                            countDirection.x = "left"
                        } else {
                            // Mouse on Right Half of Editor
                            countDirection.x = "right"
                        }

                        editorInfo.current = {
                            direction: countDirection,
                            top,
                            bottom,
                            left,
                            right,
                            focusX,
                            focusY,
                            lineHeight: height,
                            scrollTop: onScrollTop.current
                        }

                        upPosY.current = posy
                        const selection = editor.getSelection()
                        if (selection && isShowByLimit) {
                            const selectedText = editor.getModel()?.getValueInRange(selection) || ""
                            if (fizzSelectWidget.isOpen && selectedText.length === 0) {
                                // Update Clicked Menu Widget Position
                                fizzSelectWidget.update()
                            } else if (fizzRangeWidget.isOpen && selectedText.length !== 0) {
                                fizzRangeWidget.update()
                            } else if (selectedText.length === 0) {
                                if (!readOnly) {
                                    closeFizzRangeWidget()
                                    // Display Clicked Menu
                                    selectId && editor.addContentWidget(fizzSelectWidget)
                                    fizzSelectWidget.isOpen = true
                                }
                            } else {
                                closeFizzSelectWidget()
                                // Display Selected Menu
                                rangeId && editor.addContentWidget(fizzRangeWidget)
                                fizzRangeWidget.isOpen = true
                            }
                        } else {
                            closeFizzRangeWidget()
                            closeFizzSelectWidget()
                        }
                    }
                }
                if (rightButton) {
                    closeFizzRangeWidget()
                    closeFizzSelectWidget()
                }
            }
        })
        editor.onDidScrollChange((e) => {
            const {scrollTop} = e
            onScrollTop.current = scrollTop
        })

        // Listen to Cursor Movement
        editor.onDidChangeCursorPosition((e) => {
            closeFizzRangeWidget()
            closeFizzSelectWidget()
            // const { position } = e;
            // console.log('Current Cursor Position：', position);
        })
    }
    return (
        <div
            ref={ref}
            className={classNames("yakit-editor-code", styles["yakit-editor-wrapper"], {
                "yakit-editor-wrap-style": !showBreak,
                [styles["yakit-editor-disabled"]]: disabled
            })}
        >
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    /** Redraw Editor Size */
                    if (editor) editor.layout({height, width})
                    /** Record Editor Border Size */
                    preWidthRef.current = width
                    preHeightRef.current = height
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={30}
            />
            {disabled && <div className={styles["yakit-editor-shade"]}></div>}
            <div
                ref={wrapperRef}
                className={styles["yakit-editor-container"]}
                onContextMenu={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    showContextMenu()
                }}
            >
                <MonacoEditor
                    // height={100}
                    theme={theme || "kurior"}
                    value={isBytes ? new Buffer((valueBytes || []) as Uint8Array).toString() : value}
                    onChange={setValue}
                    language={language}
                    editorDidMount={(editor: YakitIMonacoEditor, monaco: any) => {
                        setEditor(editor)
                        /** Editor Init Cursor at 0 */
                        editor.setSelection({
                            startColumn: 0,
                            startLineNumber: 0,
                            endColumn: 0,
                            endLineNumber: 0
                        })

                        if (editor) {
                            /** Yak Error Check */
                            const model = editor.getModel()
                            if (model) {
                                yakStaticAnalyze.run(editor, model)
                                model.onDidChangeContent(() => {
                                    yakStaticAnalyze.run(editor, model)
                                })
                            }
                        }

                        if (editorDidMount) editorDidMount(editor)
                    }}
                    options={{
                        readOnly: readOnly,
                        scrollBeyondLastLine: false,
                        fontWeight: "500",
                        fontSize: nowFontsize || 12,
                        showFoldingControls: "always",
                        showUnused: true,
                        wordWrap: noWordWrap ? "off" : "on",
                        renderLineHighlight: "line",
                        lineNumbers: noLineNumber ? "off" : "on",
                        minimap: noMiniMap ? {enabled: false} : undefined,
                        lineNumbersMinChars: lineNumbersMinChars || 5,
                        contextmenu: false,
                        renderWhitespace: "all",
                        bracketPairColorization: {
                            enabled: true,
                            independentColorPoolPerBracketType: true
                        },
                        fixedOverflowWidgets: true
                    }}
                />
            </div>
        </div>
    )
})
