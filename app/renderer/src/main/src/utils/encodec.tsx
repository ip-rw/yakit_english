import React, {useEffect, useState} from "react"
import {showModal} from "./showModal"
import {Button, Space} from "antd"
import {IMonacoActionDescriptor, IMonacoCodeEditor, YakEditor} from "./editors"
import {monacoEditorClear, monacoEditorReplace, monacoEditorWrite} from "../pages/fuzzer/fuzzerTemplates"
import {failed} from "./notification"
import {AutoCard} from "../components/AutoCard"
import {Buffer} from "buffer"
import {useGetState, useMemoizedFn} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"

export type CodecType =
    | "fuzz"
    | "md5"
    | "sha1"
    | "sha256"
    | "sha512"
    | "base64"
    | "base64-decode"
    | "htmlencode"
    | "htmldecode"
    | "htmlescape"
    | "urlencode"
    | "urlunescape"
    | "double-urlencode"
    | "double-urldecode"
    | "hex-encode"
    | "hex-decode"
    | "packet-to-curl"
    | any

const {ipcRenderer} = window.require("electron")

const editorCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || ""
            execCodec(typeStr, text, false, e)
        } catch (e) {
            failed("editor exec codec failed")
        }
    }
}

const editorFullCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || ""
            if (!!text) {
                execCodec(typeStr, text, false, e)
            } else {
                const model = e.getModel()
                const fullText = model?.getValue()
                execCodec(typeStr, fullText || "", false, e, true)
            }
        } catch (e) {
            failed("editor exec codec failed")
            console.error(e)
        }
    }
}

export interface MutateHTTPRequestParams {
    Request: Uint8Array
    FuzzMethods: string[]
    ChunkEncode: boolean
    UploadEncode: boolean
}

export interface MutateHTTPRequestResponse {
    Result: Uint8Array
    ExtraResults: Uint8Array[]
}

export const mutateRequest = (params: MutateHTTPRequestParams, editor?: IMonacoCodeEditor) => {
    ipcRenderer.invoke("HTTPRequestMutate", params).then((result: MutateHTTPRequestResponse) => {
        if (editor) {
            monacoEditorClear(editor)
            monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"))
            return
        }
    })
}

const editorMutateHTTPRequestHandlerFactory = (params: MutateHTTPRequestParams) => {
    return (e: IMonacoCodeEditor) => {
        try {
            const model = e.getModel()
            const fullText = model?.getValue()
            mutateRequest({...params, Request: new Buffer(fullText || "")}, e)
        } catch (e) {
            failed(`mutate request failed: ${e}`)
        }
    }
}

export interface MonacoEditorActions extends IMonacoActionDescriptor {
    id: CodecType | string
    label: string
    contextMenuGroupId: "codec" | string
    run: (editor: IMonacoCodeEditor) => any
    keybindings?: any[]
}

export const MonacoEditorCodecActions: MonacoEditorActions[] = [
    {id: "urlencode", label: "URL Encode"},
    {id: "urlescape", label: "URL Encode (Special Chars Only))"},
    {id: "base64", label: "Base64 Encode"},
    {id: "base64-decode", label: "Base64 Decode"},
    {id: "htmlencode", label: "HTML Encode"},
    {id: "htmldecode", label: "HTML Decode"},
    {id: "urlunescape", label: "URL Decode"},
    {id: "double-urlencode", label: "Double URL Encode"},
    {id: "unicode-decode", label: "Unicode Decode (\\uXXXX)）"},
    {id: "unicode-encode", label: "Unicode Encode (\\uXXXX)）"},
    {id: "base64-url-encode", label: "Base64 then URL Encode"},
    {id: "url-base64-decode", label: "URL then Base64 Decode"},
    {id: "hex-decode", label: "HEX Decode）"},
    {id: "hex-encode", label: "HEX Encode）"},
    {id: "jwt-parse-weak", label: "JWT Decode (Weak Key Test)）"}
].map((i) => {
    return {id: i.id, label: i.label, contextMenuGroupId: "codec", run: editorCodecHandlerFactory(i.id as CodecType)}
})

export const MonacoEditorMutateHTTPRequestActions: {
    id: CodecType | string
    label: string
    contextMenuGroupId: "codec" | string
    run: (editor: IMonacoCodeEditor) => any
}[] = [
    {
        id: "mutate-http-method-get",
        label: "Change Method to GET",
        params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-post",
        label: "Change Method to POST",
        params: {FuzzMethods: ["POST"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-head",
        label: "Change Method to HEAD",
        params: {FuzzMethods: ["HEAD"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-chunked",
        label: "HTTP Chunk Encode",
        params: {ChunkEncode: true} as MutateHTTPRequestParams
    },
    {
        id: "mutate-upload",
        label: "Change to Upload Packet",
        params: {UploadEncode: true} as MutateHTTPRequestParams
    }
].map((i) => {
    return {
        id: i.id,
        label: i.label,
        contextMenuGroupId: "mutate-http-request",
        run: editorMutateHTTPRequestHandlerFactory(i.params)
    }
})

export interface AutoDecodeResult {
    Type: string
    TypeVerbose: string
    Origin: Uint8Array
    Result: Uint8Array
    Modify: boolean
}
const AutoDecode: React.FC<{data: AutoDecodeResult[]}> = React.memo((prop: {data: AutoDecodeResult[]}) => {
    const {data} = prop
    const [result, setResult, getResult] = useGetState<AutoDecodeResult[]>(data)
    return (
        <Space style={{width: "100%"}} direction={"vertical"}>
            {result.map((i, index) => {
                return (
                    <AutoCard
                        title={`Decoding Steps[${index + 1}]: ${i.TypeVerbose}(${i.Type})`}
                        size={"small"}
                        extra={
                            <Button
                                size={"small"}
                                onClick={() => {
                                    showModal({
                                        title: "Original Text",
                                        width: "50%",
                                        content: (
                                            <div style={{height: 280}}>
                                                <YakEditor
                                                    type={"html"}
                                                    noMiniMap={true}
                                                    readOnly={true}
                                                    value={new Buffer(i.Origin).toString("utf8")}
                                                />
                                            </div>
                                        )
                                    })
                                }}
                            >
                                View Original Encoding Text
                            </Button>
                        }
                    >
                        <div style={{height: 120}}>
                            <YakEditor
                                noMiniMap={true}
                                type={"html"}
                                value={new Buffer(i.Result).toString("utf8")}
                                setValue={(s) => {
                                    const req = getResult()
                                    req[index].Modify = true
                                    req[index].Result = StringToUint8Array(s)
                                    ipcRenderer
                                        .invoke("AutoDecode", {ModifyResult: req})
                                        .then((e: {Results: AutoDecodeResult[]}) => {
                                            setResult(e.Results)
                                        })
                                        .catch((e) => {
                                            failed(`AutoDecode Failed：${e}`)
                                        })
                                }}
                            />
                        </div>
                    </AutoCard>
                )
            })}
        </Space>
    )
})
export const execAutoDecode = async (text: string) => {
    return ipcRenderer
        .invoke("AutoDecode", {Data: text})
        .then((e: {Results: AutoDecodeResult[]}) => {
            showModal({
                title: "Auto Decode (Smart Decode)）",
                width: "60%",
                content: <AutoDecode data={e.Results}></AutoDecode>
            })
        })
        .catch((e) => {
            failed(`AutoDecode Failed：${e}`)
        })
}

export const execCodec = async (
    typeStr: CodecType,
    text: string,
    noPrompt?: boolean,
    replaceEditor?: IMonacoCodeEditor,
    clear?: boolean,
    extraParams?: {
        Key: string
        Value: string
    }[]
) => {
    return ipcRenderer
        .invoke("Codec", {Text: text, Type: typeStr, Params: extraParams})
        .then((result: {Result: string}) => {
            if (replaceEditor) {
                let m = showModal({
                    width: "50%",
                    content: (
                        <AutoCard
                            title={"Encoding Result"}
                            bordered={false}
                            extra={
                                <Button
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
                                    size={"small"}
                                >
                                    Replace Content
                                </Button>
                            }
                            size={"small"}
                        >
                            <div style={{width: "100%", height: 300}}>
                                <YakEditor type={"http"} readOnly={true} value={result.Result} />
                            </div>
                        </AutoCard>
                    )
                })
            }

            if (noPrompt) {
                showModal({
                    title: "Encoding Result",
                    width: "50%",
                    content: (
                        <div style={{width: "100%"}}>
                            <Space style={{width: "100%"}} direction={"vertical"}>
                                <div style={{height: 300}}>
                                    <YakEditor fontSize={20} type={"html"} readOnly={true} value={result.Result} />
                                </div>
                            </Space>
                        </div>
                    )
                })
            }
            return result?.Result || ""
        })
        .catch((e: any) => {
            failed(`CODEC[${typeStr}] Exec Failure：${e}`)
        })
}
