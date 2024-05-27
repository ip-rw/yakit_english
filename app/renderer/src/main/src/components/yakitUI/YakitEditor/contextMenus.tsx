import { OtherMenuListProps, YakitEditorKeyCode, YakitIMonacoEditor } from "./YakitEditorType"
import { EditorMenuItemType } from "./EditorMenu"
import { Space } from "antd"
import { showModal } from "@/utils/showModal"
import { AutoCard } from "../../AutoCard"
import { YakitEditor } from "./YakitEditor"
import { YakitButton } from "../YakitButton/YakitButton"
import { monacoEditorClear, monacoEditorWrite } from "@/pages/fuzzer/fuzzerTemplates"
import { failed, yakitNotify } from "@/utils/notification"
import { fetchCursorContent, fetchSelectionRange } from "./editorUtils"
import { useEffect, useRef, useState } from "react"
import { AutoSpin } from "@/components/AutoSpin"
import { YakitSpin } from "../YakitSpin/YakitSpin"
import { showYakitModal } from "../YakitModal/YakitModalConfirm"
import { YakitRoute } from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"

const { ipcRenderer } = window.require("electron")

/** @name Base Menu Config */
export const baseMenuLists: OtherMenuListProps = {
    fontSize: {
        menu: [
            {
                key: "font-size",
                label: "Font Size",
                children: [
                    { key: "font-size-small", label: "Small" },
                    { key: "font-size-middle", label: "Medium" },
                    { key: "font-size-large", label: "Large" }
                ]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => { }
    },
    cut: {
        menu: [{ key: "cut", label: "Cut" }],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            if (editor?.executeEdits) {
                /** Get Cut Range */
                const position = fetchSelectionRange(editor, true)
                if (!position) return
                /** Get Cut Content */
                const content = fetchCursorContent(editor, true)

                const flag = editor.executeEdits("", [
                    {
                        range: position,
                        text: "",
                        forceMoveMarkers: true
                    }
                ])
                if (flag) {
                    ipcRenderer.invoke("set-copy-clipboard", `${content}`)
                    editor.focus()
                }
            }
            return
        }
    },
    copy: {
        menu: [{ key: "copy", label: "Copy" }],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            if (editor) ipcRenderer.invoke("set-copy-clipboard", `${fetchCursorContent(editor, true)}`)
            return
        }
    },
    paste: {
        menu: [{ key: "paste", label: "Paste" }],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            if (!editor) return

            /** Get Paste Range */
            const position = fetchSelectionRange(editor, false)
            if (!position) return

            ipcRenderer
                .invoke("get-copy-clipboard")
                .then((str: string) => {
                    if (editor?.executeEdits) {
                        editor.executeEdits("", [
                            {
                                range: position,
                                text: str || "",
                                forceMoveMarkers: true
                            }
                        ])
                        editor.focus()
                    }
                })
                .catch(() => { })

            return
        }
    }
}

interface MutateHTTPRequestParams {
    Request: Uint8Array
    FuzzMethods: string[]
    ChunkEncode: boolean
    UploadEncode: boolean
}

/** @name Encoding Submenu */
const codeSubmenu: { key: string; label: string }[] = [
    { key: "double-urlencode", label: "Double URL Encode" },
    { key: "base64-url-encode", label: "Base64 then URL Encode" },
    { key: "base64", label: "Base64 Encode" },
    { key: "hex-encode", label: "HEX Encode）" },
    { key: "htmlencode", label: "HTML Encode" },
    { key: "unicode-encode", label: "Unicode Encode (\\uXXXX)）" },
    { key: "urlencode", label: "URL Encode" },
    { key: "urlescape", label: "URL Encode (Special Chars Only))" }
]
/** @name Decode Submenu */
const decodeSubmenu: { key: string; label: string }[] = [
    { key: "url-base64-decode", label: "URL then Base64 Decode" },
    { key: "base64-decode", label: "Base64 Decode" },
    { key: "hex-decode", label: "HEX Decode）" },
    { key: "htmldecode", label: "HTML Decode" },
    { key: "jwt-parse-weak", label: "JWT Decode (Weak Key Test)）" },
    { key: "unicode-decode", label: "Unicode Decode (\\uXXXX)）" },
    { key: "urlunescape", label: "URL Decode" }
]
/** @name HTTP Transform Submenu */
const httpSubmenu: {
    key: string
    label: string
    params?: MutateHTTPRequestParams
    keybindings?: YakitEditorKeyCode[]
}[] = [
        {
            key: "mutate-http-method-get",
            label: "Change Method to GET",
            params: { FuzzMethods: ["GET"] } as MutateHTTPRequestParams,
            keybindings: [
                process.platform === "darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                YakitEditorKeyCode.Shift,
                YakitEditorKeyCode.KEY_H
            ]
        },
        {
            key: "mutate-http-method-post",
            label: "Change Method to POST",
            params: { FuzzMethods: ["POST"] } as MutateHTTPRequestParams
        },
        {
            key: "mutate-http-method-head",
            label: "Change Method to HEAD",
            params: { FuzzMethods: ["HEAD"] } as MutateHTTPRequestParams
        },
        { key: "mutate-chunked", label: "HTTP Chunk Encode", params: { ChunkEncode: true } as MutateHTTPRequestParams },
        { key: "mutate-upload", label: "Change to Upload Packet", params: { UploadEncode: true } as MutateHTTPRequestParams }
    ]
/** @name Built-in Menu Config */

export const extraMenuLists: OtherMenuListProps = {
    code: {
        menu: [
            {
                key: "code",
                label: "Encode",
                children: [...codeSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                // @ts-ignore
                const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                execCodec(key, text, false, editor)
            } catch (e) {
                failed(`editor exec code failed ${e}`)
            }
        }
    },
    decode: {
        menu: [
            {
                key: "decode",
                label: "Decode",
                children: [...decodeSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                // @ts-ignore
                const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                execCodec(key, text, false, editor)
            } catch (e) {
                failed(`editor exec decode failed ${e}`)
            }
        }
    },
    http: {
        menu: [
            {
                key: "http",
                label: "HTTP Transform",
                children: [...httpSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            const params = httpSubmenu.filter((item) => item.key === key)[0]?.params || ({} as MutateHTTPRequestParams)

            try {
                const model = editor.getModel()
                const fullText = model?.getValue()
                mutateRequest({ ...params, Request: new Buffer(fullText || "") }, editor)
            } catch (e) {
                failed(`mutate request failed: ${e}`)
            }
        }
    },
    customhttp: {
        menu: [
            {
                key: "customhttp",
                label: "Custom HTTP Transform",
                //  generate from YakitEditor.tsx
                children: [],
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                customMutateRequest(key, editor.getModel()?.getValue(), editor)
            } catch (e) {
                failed(`custom mutate request failed: ${e}`)
            }
        }
    },
    customcontextmenu: {
        menu: [
            {
                key: "customcontextmenu",
                label: "Custom Context Menu Action",
                //  generate from YakitEditor.tsx
                children: [],
            }
        ],
        onRun: (editor: YakitIMonacoEditor, scriptName: string,pageId,isAiPlugin:boolean) => {
            try {
                const model = editor.getModel();
                const selection = editor.getSelection()
                let text = model?.getValue()
                if (selection) {
                    let selectText = model?.getValueInRange(selection)||""
                    if (selectText.length > 0) {
                        text = selectText
                    }
                }
                emiter.emit("onOpenFuzzerModal",JSON.stringify({text,scriptName,pageId,isAiPlugin}))
            } catch (e) {
                failed(`custom context menu execute failed: ${e}`)
            }
        }
    },
}




/** @name Codec & JSON Beautify Function */
const execCodec = async (
    typeStr: string,
    text: string,
    noPrompt?: boolean,
    replaceEditor?: YakitIMonacoEditor,
    clear?: boolean,
    scriptName?: string,
    title?: string,
) => {
    return ipcRenderer
        .invoke("Codec", { Text: text, Type: typeStr, ScriptName: scriptName })
        .then((result: { Result: string }) => {
            if (replaceEditor) {
                let m = showModal({
                    width: "50%",
                    content: (
                        <AutoCard
                            title={title || "Encoding Result"}
                            bordered={false}
                            extra={
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        if (clear) {
                                            monacoEditorClear(replaceEditor)
                                            replaceEditor.getModel()?.setValue(result.Result)
                                        } else {
                                            monacoEditorWrite(replaceEditor, result.Result)
                                        }
                                        m.destroy()
                                    }}
                                >
                                    Replace Content
                                </YakitButton>
                            }
                            size={"small"}
                        >
                            <div style={{ width: "100%", height: 300 }}>
                                <YakitEditor type={"http"} readOnly={true} value={result.Result} />
                            </div>
                        </AutoCard>
                    )
                })
            }

            if (noPrompt) {
                showModal({
                    title: title || "Encoding Result",
                    width: "50%",
                    content: (
                        <div style={{ width: "100%" }}>
                            <Space style={{ width: "100%" }} direction={"vertical"}>
                                <div style={{ height: 300 }}>
                                    <YakitEditor fontSize={20} type={"html"} readOnly={true} value={result.Result} />
                                </div>
                            </Space>
                        </div>
                    )
                })
            }
        })
        .catch((e: any) => { })
}

interface MutateHTTPRequestResponse {
    Result: Uint8Array
    ExtraResults: Uint8Array[]
}
/** @name HTTP Transform Function */
const mutateRequest = (params: MutateHTTPRequestParams, editor?: YakitIMonacoEditor) => {
    ipcRenderer.invoke("HTTPRequestMutate", params).then((result: MutateHTTPRequestResponse) => {
        if (editor) {

            // monacoEditorClear(editor)
            // monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"))
            monacoEditorWrite(editor, new Buffer(result.Result).toString("utf8"), editor.getModel()?.getFullModelRange())
            return
        }
    })
}
/** @name Custom HTTP Transform Function */
const customMutateRequest = (key: string, text?: string, editor?: YakitIMonacoEditor) => {
    if (!editor) {
        return
    }
    ipcRenderer
        .invoke("Codec", { Type: key, Text: text, Params: [], ScriptName: key })
        .then((res) => {
            monacoEditorWrite(editor, new Buffer(res?.Result || "").toString("utf8"), editor.getModel()?.getFullModelRange())
        })
        .catch((err) => {
            if (err) throw err;
        })
}



