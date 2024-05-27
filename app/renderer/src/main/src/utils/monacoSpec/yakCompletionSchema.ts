import { editor, IRange, languages, Position } from "monaco-editor";
import { CancellationToken } from "typescript";
import { removeRepeatedParams } from "@/pages/invoker/YakScriptParamsSetter";
import { YakExecutorParam } from "@/pages/invoker/YakExecutorParams";
import { monaco } from "react-monaco-editor";
import { log } from "console";
import { getModelContext } from "./yakEditor";

const { ipcRenderer } = window.require("electron");


export interface Range {
    Code: string
    StartLine: number
    StartColumn: number
    EndLine: number
    EndColumn: number
}

export interface SuggestionDescription {
    Label: string
    Description: string
    InsertText: string
    JustAppend: boolean
    DefinitionVerbose: string
    Kind: string
}
export interface YaklangLanguageSuggestionRequest {
    InspectType: "completion" | "hover" | "signature" | "definition" | "reference"
    YakScriptType: "yak" | "mitm" | "port-scan" | "codec"
    YakScriptCode: string
    Range: Range
}


export interface YaklangLanguageSuggestionResponse {
    SuggestionMessage: SuggestionDescription[]
}

export interface YaklangLanguageFindResponse {
    URI: string
    Ranges: Range[]
}

export interface CompletionSchema {
    libName: string
    prefix: string
    functions: {
        functionName: string
        document?: string
        definitionStr: string
    }[]
}

export interface FieldsCompletion {
    isMethod: boolean
    fieldName: string
    fieldTypeVerbose: string
    libName?: string
    structName: string
    structNameShort: string
    methodsCompletion: string
    methodsCompletionVerbose: string
    isGolangBuildOrigin: string
}

export interface CompletionTotal {
    libNames: string[]
    libCompletions: CompletionSchema[]
    fieldsCompletions: FieldsCompletion[]
    libToFieldCompletions: { [index: string]: FieldsCompletion[] }
}

const getSortTextByKindAndLabel = (kind: string, label: string): string => {
    let sortText = "";
    switch (getCompletionItemKindByName(kind)) {
        case languages.CompletionItemKind.Variable:
            sortText = "0";
            break;
        case languages.CompletionItemKind.Field:
            sortText = "1";
            break;
        case languages.CompletionItemKind.Function:
            sortText = "2";
            break;
        case languages.CompletionItemKind.Method:
            sortText = "3";
            break;
        case languages.CompletionItemKind.Module:
            sortText = "4";
            break;
        case languages.CompletionItemKind.Constant:
            sortText = "5";
            break;
        case languages.CompletionItemKind.Keyword:
            sortText = "6";
            break;
        default:
            sortText = "7";
            break;
    }
    sortText += label;
    return sortText;
}




let globalSuggestions: languages.CompletionItem[] = [];
let completions: CompletionTotal = { libCompletions: [], fieldsCompletions: [], libNames: [], libToFieldCompletions: {} };
let maxLibLength = 1;

export const extraSuggestions: languages.CompletionItem[] = [
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "fn closure",
        insertText: "fn{\n" +
            "    defer fn{\n" +
            "        err := recover()\n" +
            "        if err != nil {\n" +
            "            log.error(`recover from panic: %v`, err)\n" +
            "        }\n" +
            "    }\n" +
            "    ${1}\n" +
            "}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "Snippets For Try-Catch-Finally"
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "try-catch-finally",
        insertText: "try {\n" +
            "    ${1}\n" +
            "} catch err {\n" +
            "    ${2}\n" +
            "} finally {\n" +
            "    ${3}\n" +
            "}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "Snippets For Try-Catch-Finally"
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "try-catch",
        insertText: "try {\n" +
            "    ${1}\n" +
            "} catch err {\n" +
            "    ${2}\n" +
            "}${3}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "Snippets For Try-Catch"
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "err",
        insertText: "if ${1:err} != nil { die(${1:err}) }",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "Snippets for input err quickly",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "aes-cbc-pkcs7(pkcs) encrypt",
        insertText: "data = \"${1:your-data}\"\n" +
            "data = codec.PKCS7Padding([]byte(data))\n" +
            "\n" +
            "key, _ = codec.DecodeBase64(\"${2:key-base64}\")\n" +
            "// key = codec.PKCS5Padding(key, 16)\n" +
            "key = codec.PKCS7Padding(key)\n" +
            "\n" +
            "// Set iv" +
            "// Assume on failed completion function(\"your-iv\")\n" +
            "iv, _ = codec.DecodeBase64(\"${3:iv-base64}\")\n" +
            "// iv = codec.PKCS5Padding(iv, 16)\n" +
            "iv = codec.PKCS7Padding(iv)\n" +
            "\n" +
            "// Start encryption function" +
            "encryptData, err = codec.AESCBCEncrypt(key, data, iv)\n" +
            "base64Encrypted = codec.EncodeBase64(encryptData) /zIFnAH2Pw==\n" +
            "Align definition with monaco editor suggestion" +
            "base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) " +
            "\n",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "AES CBC PKCS7(PKCS5)",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "aes-ecb-pkcs7 encrypt",
        insertText: "# Text to encrypt\ndata = \"this is data\"\n" +
            "# AES KEY for decoding if base64, else use key = []byte(`your-aes-key...`)\nkey, err = codec.DecodeBase64(\"${1}\")\nkey = codec.PKCS7Padding(key)\n" +
            "# PKCS7Padding(data) / PKCS5Padding(data, 16/*block size*/)\ndata = codec.PKCS7Padding([]byte(data))\n\n" +
            "# Encrypt with AES ECB, check err for failure reasons" +
            "base64Encrypted = codec.EncodeBase64(encryptData) /zIFnAH2Pw==\n" +
            "Align definition with monaco editor suggestion" +
            "base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) ",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "AES ECB PKCS7",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "aes-ecb-pkcs5 encrypt",
        insertText: "# Text to encrypt\ndata = \"this is data\"\n" +
            "# AES KEY for decoding if base64, else use key = []byte(`your-aes-key...`)\nkey, err = codec.DecodeBase64(\"${1}\")\nkey = codec.PKCS5Padding(key, 16)\n" +
            "# PKCS7Padding(data) / PKCS5Padding(data, 16/*block size*/)\ndata = codec.PKCS5Padding([]byte(data), 16)\n\n" +
            "# Encrypt with AES ECB, check err for failure reasons" +
            "base64Encrypted = codec.EncodeBase64(encryptData) /zIFnAH2Pw==\n" +
            "Align definition with monaco editor suggestion" +
            "base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) ",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "AES ECB PKCS5",
    } as languages.CompletionItem,
]
    ;

export interface MethodSuggestion {
    Verbose: string
    FuzzKeywords: string[]
    ExactKeywords: string[]
    Regexp: string[]
    /*
    *
// Fix last range
message SuggestionDescription {
  string Label = 1;
  string Description = 2;
  string InsertText = 3;
  bool JustAppend = 4;
  string DefinitionVerbose = 5; // Display defined content, usually InsertText suffices
  string Kind = 6; // Completion type
}
    * */
    Suggestions: MethodSuggestionItem[]
}

interface MethodSuggestionItem {
    Label: string
    Description: string
    InsertText: string
    JustAppend: boolean
    DefinitionVerbose: string
    Kind: string
}

let YaklangBuildInMethodCompletion: MethodSuggestion[] = [];


export function getCompletionItemKindByName(name: string): languages.CompletionItemKind {
    const itemKind = languages.CompletionItemKind[name as keyof typeof languages.CompletionItemKind];
    return itemKind !== undefined ? itemKind : languages.CompletionItemKind.Snippet;
}

export const setYaklangBuildInMethodCompletion = (methods: MethodSuggestion[]) => {
    YaklangBuildInMethodCompletion = methods;
}

export const setYaklangCompletions = (data: CompletionTotal) => {
    if (!data.libToFieldCompletions) {
        data.libToFieldCompletions = {}
    }

    data.libToFieldCompletions[`__global__`] = [];
    completions = {
        libCompletions: data.libCompletions.filter(i => !i.libName.startsWith("_")),
        fieldsCompletions: [],
        libNames: data.libNames.filter(i => !i.startsWith("_")),
        libToFieldCompletions: data.libToFieldCompletions,
    };

    completions.libNames.map(i => {
        if (i.length > maxLibLength) {
            maxLibLength = i.length
        }
    })

    const globalLibs = data.libCompletions.filter(i => i.libName === "__global__");
    if (globalLibs.length <= 0) {
        return
    }
    globalSuggestions = globalLibs[0].functions.map(i => {
        return {
            kind: languages.CompletionItemKind.Function,
            label: i.functionName,
            documentation: i.definitionStr,
            insertText: i.functionName,
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        } as languages.CompletionItem;
    })
}

export const getCompletions = () => {
    return completions
}

export const getGlobalCompletions = (): languages.CompletionItem[] => {
    return globalSuggestions
};

export const getDefaultCompletions = (position: Position): languages.CompletionItem[] => {
    return [
        ...globalSuggestions,
        ...extraSuggestions,
    ].map(i => {
        return {
            ...i, range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column || 0,
                endColumn: position.column || 0,
            },
        }
    })
};

export const getDefaultCompletionsWithRange = (range: IRange): languages.CompletionItem[] => {
    return [
        ...globalSuggestions,
        ...extraSuggestions,
    ].map(i => {
        return {
            ...i,
            range,
        }
    })
};

const removeRepeatedSuggestions = (params: languages.CompletionItem[]): languages.CompletionItem[] => {
    const results: languages.CompletionItem[] = [];
    const labels: string[] = [];

    params.forEach(i => {
        const key = `${i.label}`;
        if (labels.includes(key)) {
            return
        }
        labels.push(key)
        results.push(i)
    });
    return results
}

const loadMethodFromCaller = (caller: string, prefix: string, range: IRange): languages.CompletionItem[] => {
    if (!YaklangBuildInMethodCompletion) {
        return []
    }

    if (prefix.endsWith("].") || prefix.endsWith(").")) {
        // Set iv = []byte if difficult with base64
        caller = "raw"
    } else if (prefix.endsWith(`".`) || prefix.endsWith("`.")) {
        // Consider as a string
        caller = "s"
    } else if (prefix.endsWith(`}.`)) {
        // Consider contents and function results as raw
        caller = "m"
    }

    const items: languages.CompletionItem[] = [];
    const pushCompletion = (i: MethodSuggestion, desc: MethodSuggestionItem) => {
        const labelDef = (!!desc.DefinitionVerbose) ? `${desc.DefinitionVerbose}` : `${desc.InsertText}`
        items.push({
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            insertText: desc.InsertText,
            kind: languages.CompletionItemKind.Snippet,
            label: i.Verbose === "" ? `${labelDef}: ${desc.Description}` : `${i.Verbose}.${labelDef}:  ${desc.Description}`,
            detail: `${i.Verbose}`,
            range: range,
            documentation: desc.Description,
        })
    }

    YaklangBuildInMethodCompletion.forEach(i => {
        // Match variable for completion
        if (i.ExactKeywords.includes(caller)) {
            i.Suggestions.forEach(desc => {
                pushCompletion(i, desc)
            })
            return
        }

        for (let j = 0; j < i.FuzzKeywords.length; j++) {
            const m = i.FuzzKeywords[j];
            if (caller.toLowerCase().includes(m.toLowerCase())) {
                i.Suggestions.forEach(desc => {
                    pushCompletion(i, desc);
                })
                return;
            }
        }
    })
    return items
}

export const yaklangCompletionHandlerProvider = (model: editor.ITextModel, position: Position, context: languages.CompletionContext, token: CancellationToken): { suggestions: any[] } => {
    if (position === undefined) {
        return { suggestions: [] }
    }
    const { column, lineNumber } = position;
    if (column === undefined || lineNumber === undefined) {
        return { suggestions: [] };
    }

    if ((position?.column || 0) <= 0) {
        return { suggestions: [] };
    }
    const beforeCursor = position.column - 1;
    const line = model.getLineContent(position.lineNumber).substring(0, beforeCursor);
    const words = Array.from(line.matchAll(/\w+/g), m => m[0]);
    const lastWord = words.length > 0 ? words[words.length - 1] : "";

    const startColumn = position.column - lastWord.length;
    const replaceRange: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: startColumn > 0 ? startColumn : 0,
        endColumn: position.column || 0,
    };
    const insertRange: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column || 0,
        endColumn: position.column || 0,
    };

    /*
    * Find prev word
    * */
    let items: languages.CompletionItem[] = [];
    const libCompletions = (completions.libCompletions || []);
    for (let i = 0; i < libCompletions.length; i++) {
        const currentLib = libCompletions[i];
        if (lastWord === currentLib.libName) {
            currentLib.functions.forEach(f => {
                let compLabel = f.definitionStr.startsWith("func ") ? f.definitionStr.substring(5) : f.definitionStr;
                compLabel = compLabel.startsWith(currentLib.libName + ".") ? compLabel.substring((currentLib.libName + ".").length) : compLabel;
                items.push({
                    insertText: f.functionName,
                    detail: f.document,
                    label: compLabel,
                    kind: languages.CompletionItemKind.Snippet,
                    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: insertRange,
                })
            })
            return {
                suggestions: [...items, ...loadMethodFromCaller(lastWord, line, insertRange)],
            }
        }
    }

    if (items.length <= 0) {
        if (!line.endsWith(".")) {
            /*
            * Consider as a map
            * If last char before cursor isn’t ., enter global completion
            * */
            return {
                suggestions: [...completions.libNames.map(i => {
                    return {
                        insertText: i,
                        detail: i,
                        label: i,
                        kind: languages.CompletionItemKind.Struct,
                        range: replaceRange,
                    }
                }),
                ...getDefaultCompletionsWithRange(replaceRange)
                ].filter(i => {
                    return `${i.label}`.includes(lastWord)
                })
            }
        } else {
            // hexEncrypted = codec.EncodeToHex(encryptData) 
            try {
                let value = model.getValueInRange({
                    endColumn: position.column,
                    endLineNumber: position.lineNumber,
                    startColumn: 0,
                    startLineNumber: 0
                });
                if (value.length > 10000) {
                    value = value.substring(value.length - 9999)
                }
                const fieldCompletion: FieldsCompletion[] = [];
                const included = new Map<string, boolean>();
                const methodMerged = new Map<string, FieldsCompletion>();
                const fieldMerged = new Map<string, FieldsCompletion>();
                Array.from(value.matchAll(/[a-z]+/g), m => m[0]).map(i => {
                    if (i === "") {
                        return
                    }
                    if (i.length > maxLibLength) {
                        return
                    }

                    if (!!included.get(i)) {
                        return
                    } else {
                        included.set(i, true)
                    }
                    if (!!completions.libToFieldCompletions[i]) {
                        completions.libToFieldCompletions[i].map(comp => {
                            if (comp.isMethod) {
                                const k = comp.methodsCompletionVerbose;
                                if (methodMerged.has(k)) {
                                    const e = methodMerged.get(k);
                                    if (e === undefined) {
                                        return
                                    }
                                    e.structNameShort = `${e.structNameShort}/${comp.structNameShort}`
                                } else {
                                    methodMerged.set(k, { ...comp })
                                }
                            } else {
                                const k = `${comp.fieldName}: ${comp.fieldTypeVerbose}`;
                                if (fieldMerged.has(k)) {
                                    const e = fieldMerged.get(k)
                                    if (e === undefined) {
                                        return
                                    }
                                    e.structNameShort = `${e.structNameShort}/${comp.structNameShort}`
                                } else {
                                    fieldMerged.set(k, { ...comp })
                                }
                            }
                        })
                    }
                });

                fieldCompletion.push(...Array.from(fieldMerged.values()))
                fieldCompletion.push(...Array.from(methodMerged.values()))

                let suggestions: languages.CompletionItem[] = fieldCompletion.map(i => {
                    if (i.isMethod) {
                        return {
                            insertText: i.methodsCompletion,
                            detail: `Method:${i.structNameShort}`,
                            label: `${i.methodsCompletionVerbose}`,
                            kind: languages.CompletionItemKind.Function,
                            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: insertRange,
                        }
                    }
                    return {
                        insertText: i.fieldName,
                        detail: `Field:${i.structNameShort}`,
                        label: `${i.fieldName}: ${i.fieldTypeVerbose}`,
                        kind: languages.CompletionItemKind.Field,
                        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: insertRange,
                    }
                });

                suggestions = [...suggestions, ...loadMethodFromCaller(lastWord, line, insertRange)]
                return { suggestions: removeRepeatedSuggestions(suggestions) }
            } catch (e) {
                console.info(e)
            }
        }
    }

    // If . exists, filter content to try populating field names
    return {
        suggestions: [],
    } as any;
}


export const newYaklangCompletionHandlerProvider = (model: editor.ITextModel, position: Position, context: languages.CompletionContext, token: CancellationToken): Promise<{ incomplete: boolean, suggestions: languages.CompletionItem[] }> => {
    return new Promise(async (resolve, reject) => {
        if (position === undefined) {
            resolve({ incomplete: false, suggestions: [] });
            return
        }
        const { column, lineNumber } = position;
        if (column === undefined || lineNumber === undefined) {
            resolve({ incomplete: false, suggestions: [] });
            return
        }

        if ((position?.column || 0) <= 0) {
            resolve({ incomplete: false, suggestions: [] });
            return
        }
        const iWord = getWordWithPointAtPosition(model, position);
        const type = getModelContext(model, "plugin") || "yak"

        await ipcRenderer.invoke("YaklangLanguageSuggestion", {
            InspectType: "completion",
            YakScriptType: type,
            YakScriptCode: model.getValue(),
            ModelID: model.id,
            Range: {
                Code: iWord.word,
                StartLine: position.lineNumber,
                EndLine: position.lineNumber,
                StartColumn: iWord.startColumn,
                EndColumn: iWord.endColumn,
            } as Range,
        } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
            if (r.SuggestionMessage.length > 0) {
                let range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: iWord.startColumn,
                    endColumn: iWord.endColumn,
                }
                // Set completion: Library completion
                if (iWord.word.endsWith(".")) {
                    range.startColumn = position.column;
                    range.endColumn = position.column;
                } else if (iWord.word.indexOf(".") > 0) {
                    const index = iWord.word.lastIndexOf(".");
                    range.startColumn = range.startColumn + index + 1;
                }

                let suggestions = r.SuggestionMessage.map(i => {
                    return {
                        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: i.InsertText,
                        kind: getCompletionItemKindByName(i.Kind),
                        label: i.Label,
                        detail: i.DefinitionVerbose,
                        documentation: { value: i.Description, isTrusted: true },
                        range: range,
                        sortText: getSortTextByKindAndLabel(i.Kind, i.Label),
                    } as languages.CompletionItem
                })

                resolve({
                    incomplete: false,
                    suggestions: suggestions,
                });
            }
            resolve({ incomplete: false, suggestions: [] });
        })
    })
}

// Get word at cursor, if preceded by ., find prev word
// E.g., at cursor on d in a.b.c.d, returns c.d
export const getWordWithPointAtPosition = (model: monaco.editor.ITextModel, position: monaco.Position): editor.IWordAtPosition => {
    let iWord = model.getWordAtPosition(position);
    if (iWord === null) {
        iWord = { word: "", startColumn: position.column, endColumn: position.column };
    }
    let word = iWord.word;
    let lastChar = model.getValueInRange({
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: iWord.startColumn - 1,
        endColumn: iWord.startColumn,
    });
    if (lastChar === ".") {
        // encryptData, err = codec.AESECBEncrypt(key, data, nil)
        let lastWord = model.getWordAtPosition(new monaco.Position(position.lineNumber, iWord.startColumn - 2));
        if (lastWord !== null) {
            iWord = { word: lastWord.word + "." + word, startColumn: lastWord.startColumn, endColumn: iWord.endColumn };
        } else {
            iWord = { word: "." + word, startColumn: iWord.startColumn - 1, endColumn: iWord.endColumn };
        }
    }


    return iWord;
}