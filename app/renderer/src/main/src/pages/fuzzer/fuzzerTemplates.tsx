import {IMonacoCodeEditor, IMonacoEditor} from "../../utils/editors"
import {RandInt, RandStrWithLen, RandStrWithMax, RandStrWIthRepeat} from "./templates/Rand"
import {FuzzWithRange, RangeChar} from "./templates/Range"
import {EncodeTag, SingleTag} from "./templates/SingleTag"
import {IRange} from "monaco-editor"
import "./style.css"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

export interface FuzzOperatorItem {
    name: string
    tag?: string
    callback?: (editor: IMonacoEditor) => any
    params?: []
    optionsRender: (s: string, callback: (s: string) => any) => any
}

export interface FuzzOperatorParam {
    key: string
    defaultValue?: string
    optional?: string
}

export const monacoEditorWrite = (editor: IMonacoEditor | IMonacoCodeEditor, text: string, range?: IRange | null) => {
    if (editor) {
        if (range) {
            editor.executeEdits(editor.getValue(), [{range: range, text: text}])
            return
        }

        const selection = editor.getSelection()
        if (selection) {
            editor.executeEdits(editor.getValue(), [{range: selection, text: text}])
        }
    }
}

export const monacoEditorReplace = (editor: IMonacoEditor | IMonacoCodeEditor, text: string) => {
    if (editor) editor.setValue(text)
}

export const monacoEditorClear = (editor?: IMonacoEditor | IMonacoCodeEditor) => {
    if (editor) {
        editor.getModel()?.setValue("")
    }
}

const highlightRanges: any[] = []

export const monacoEditorRemoveAllHighlight = (editor?: IMonacoEditor) => {
    if (editor && highlightRanges.length > 0) {
        editor.deltaDecorations(
            [],
            highlightRanges.map((i) => {
                return {range: i, options: {inlineClassName: undefined}} as any
            })
        )
    }
}

export const fuzzOperators: FuzzOperatorItem[] = [
    {
        name: "Gen a char",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{char(a-z)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    help={"Gen a char, e.g. {{char(a-z)}}，Use - to split, parse char range"}
                    origin={origin}
                    setOrigin={setOrigin}
                    tag={"char"}
                    defaultInput={"a-z"}
                    label={"Char range"}
                    enableInput={true}
                    exampleInput={"{{char(a-z)}}"}
                />
            )
        }
    },
    {
        name: "Repeat empty string",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{repeat(10)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    help={"Control repeat count Tag, typically {{repeat(10)}} Refers to generating data 10x"}
                    origin={origin}
                    setOrigin={setOrigin}
                    tag={"repeat"}
                    defaultInput={"10"}
                    label={"Repeat count"}
                    enableInput={true}
                    exampleInput={"E.g.：{{repeat(10)}}"}
                />
            )
        }
    },
    {
        name: "Repeat string",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{repeatstr(abc|3)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    help={"Control repeat render of data, with |n To input count, typically {{repeatstr(abc|3)}} Render as abcabcabc"}
                    origin={origin}
                    setOrigin={setOrigin}
                    tag={"repeatstr"}
                    defaultInput={"abc|3"}
                    label={"Repeat count"}
                    enableInput={true}
                    exampleInput={"E.g.：{{repeatstr(abc|3)}} -> abcabcabc"}
                />
            )
        }
    },
    {
        name: "Build array (list)）",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{list(1|2|3)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    origin={origin}
                    setOrigin={setOrigin}
                    enableInput={true}
                    help={"Slice data & render into payload, default use | Split"}
                    tag={"list"}
                    defaultInput={"1|2|3"}
                    label={"Split strings (or combine fuzztag)）"}
                    exampleInput={"E.g.：{{list(1|2|3)}} Parse as [1,2,3]"}
                />
            )
        }
    },
    {
        name: "Random string (fixed length))",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWithLen setOrigin={setOrigin} origin={origin} />
        }
    },
    {
        name: "Random string (specified length))",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWithMax setOrigin={setOrigin} origin={origin} />
        }
    },
    {
        name: "Random string (multi-render))",
        callback: (editor) => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWIthRepeat setOrigin={setOrigin} origin={origin} />
        }
    },
    {
        name: "Integer (free range) - also for ports",
        callback: (editor) => {},
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <Form.Item label={"Input range"}>
                    <YakitInput
                        onChange={(v) => {
                            setOrigin(`{{int(${v.target.value})}}`)
                        }}
                    />
                </Form.Item>
            )
        }
    },
    {
        name: "Random integer (range))",
        callback: (editor) => {},
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandInt {...{origin, setOrigin}} />
        }
    },
    {
        name: "IP/IP range/Network/Domain(s), comma-separated)",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => (
            <FuzzWithRange
                label={"IP/Subnet/Domain group"}
                origin={origin}
                setOrigin={setOrigin}
                tag={"network"}
                help={"Typically to separate scan targets, e.g., 192.168.0.1/24,example.com,10.1.11.1"}
            />
        )
    },
    {
        name: "Create .ico header",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag {...{origin, setOrigin}} help={"Create .ico header, for uploading"} tag={"ico"} />
            )
        },
        tag: "ico"
    },
    {
        name: "Create .png header",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag {...{origin, setOrigin}} help={"Create .png header, for uploading"} tag={"png"} />
            )
        },
        tag: "png"
    },
    {
        name: "Create .gif header",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag {...{origin, setOrigin}} help={"Create .gif header, for uploading"} tag={"gif"} />
            )
        },
        tag: "gif"
    },
    {
        name: "Create .tiff header",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag
                    {...{origin, setOrigin}}
                    help={"Create .tiff header, for uploading"}
                    tag={"tiff"}
                />
            )
        },
        tag: "tiff"
    },
    {
        name: "Create .jpeg(jpg) header",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag
                    {...{origin, setOrigin}}
                    help={"Create a .jpeg/jpg file header, for uploading"}
                    tag={"jpegstart"}
                />
            )
        },
        tag: "jpegstart"
    },
    {
        name: "Create .jpeg(jpg) footer",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag
                    {...{origin, setOrigin}}
                    help={"Create a .jpeg/jpg file footer, for uploading"}
                    tag={"jpegend"}
                />
            )
        },
        tag: "jpegend"
    },
    {
        name: "Any char (ASCII range)）",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return <RangeChar {...{origin, setOrigin}} />
        }
    },
    {
        name: "Gen all special chars",
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return <SingleTag {...{origin, setOrigin}} help={"Gen all special chars, for fuzz testing"} tag={"punc"} />
        },
        tag: "punc"
    }
]

export const encodeOperators: FuzzOperatorItem[] = [
    {
        name: "All to uppercase",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"upper"} help={"Encode tag content uppercase"} />
        ),
        tag: "upper"
    },
    {
        name: "All to lowercase",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"lower"} help={"Encode tag content lowercase"} />
        ),
        tag: "lower"
    },
    {
        name: `Parse as string (e.g.{{str(\\xA0\\x45)}}）`,
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"str"}
                help={'Parse as string (e.g.{{str("\xA0\x45")}}），Convert invisible chars'}
            />
        ),
        tag: "str"
    },
    {
        name: "Base64 encode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"base64enc"} help={"Encode tag content Base64"} />
        ),
        tag: "base64enc"
    },
    {
        name: "Base64 decode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"base64dec"} help={"Decode tag content Base64"} />
        ),
        tag: "base64dec"
    },
    {
        name: "Hex encode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"hex"} help={"Convert tag content to Hex"} />
        ),
        tag: "hex"
    },
    {
        name: "Hex decode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"hexdec"} help={"Decode tag content Hex"} />
        ),
        tag: "hexdec"
    },
    {
        name: "Calc SHA1",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha1"} help={"Calc tag Sha1"} />
        ),
        tag: "sha1"
    },
    {
        name: "Calc SHA256",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha256"} help={"Calc tag SHA256"} />
        ),
        tag: "sha256"
    },
    {
        name: "Calc SHA512",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha512"} help={"Calc tag Sha512"} />
        ),
        tag: "sha512"
    },
    {
        name: "URL encode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"urlenc"} help={"Convert tag content to URL encode"} />
        ),
        tag: "urlenc"
    },
    {
        name: "URL decode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"urldec"} help={"Decode tag content by URL"} />
        ),
        tag: "urldec"
    },
    {
        name: "'Double URL'Encode",
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"doubleurlenc"}
                help={"Convert tag content to'Double URL'Encode"}
            />
        ),
        tag: "doubleurlenc"
    },
    {
        name: "'Double URL'Decode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"doubleurldec"} help={"Sort tag content by'Double URL'Decode"} />
        ),
        tag: "doubleurldec"
    },
    {
        name: "HTML(&#xxxx;)Encode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"html"} help={"Convert tag content to HTML(&#xxxx;)Encode"} />
        ),
        tag: "html"
    },
    {
        name: "HTML(&#xAAAA;)Encode - Hex",
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"htmlhex"}
                help={"Convert tag content to HTML(&#xAAAA;)Encode"}
            />
        ),
        tag: "htmlhex"
    },
    {
        name: "HTML(&#xxxx;)Decode",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"htmldec"} help={"Decode tag content HTML(&#xxxx;)Decode"} />
        ),
        tag: "htmldec"
    },
    {
        name: "'ASCII'Encode",
        tag: "ascii",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"ascii"} help={"Convert tag content to'ASCII'Encode"} />
        )
    },
    {
        name: "'ASCII'Decode",
        tag: "asciidec",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"asciidec"} help={"Sort tag content by'ASCII'Decode"} />
        )
    }
]
