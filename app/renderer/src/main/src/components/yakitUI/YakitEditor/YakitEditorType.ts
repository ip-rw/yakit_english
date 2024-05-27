import { ReactElement } from "react"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import { EditorMenuItemType } from "./EditorMenu"
import { EditorDetailInfoProps } from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import { HighLightText } from "@/components/HTTPFlowDetail"

/** Monaco-Editor APIs */
export type YakitSelection = monacoEditor.Selection
export type YakitIMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor
export type YakitIMonacoCodeEditor = monacoEditor.editor.ICodeEditor
export type YakitITextModel = monacoEditor.editor.ITextModel
export type YakitIModelDecoration = monacoEditor.editor.IModelDecoration

/** @Built-in Menu Group Options */
export type YakitEditorExtraRightMenuType = "code" | "decode" | "http" | "customhttp" | "customcontextmenu"

export interface YakitEditorProps {
    /** @Update Menu Each Time? */
    forceRenderMenu?: boolean

    /** @Built-in Menu Group Options (Multi-select) */
    menuType?: YakitEditorExtraRightMenuType[]

    /** @Content Type Is Bytecode */
    isBytes?: boolean
    /** @Editor Content (String Type) */
    value?: string
    /** @Editor Content (Bytecode Type) */
    valueBytes?: Uint8Array
    /** @Change Editor Content Callback */
    setValue?: (content: string) => any

    /** @File Type */
    type?: "html" | "http" | "yak" | string
    /** @Editor Theme */
    theme?: string

    /** @Editor Loaded Callback */
    editorDidMount?: (editor: YakitIMonacoEditor) => any

    /** @Custom Extra Context Menu Group */
    contextMenu?: OtherMenuListProps
    /** @Context Menu Click Callback */
    onContextMenu?: (editor: YakitIMonacoEditor, key: string) => any

    /** @Config-Disable */
    disabled?: boolean
    /** @Config-Enable Read-Only Mode */
    readOnly?: boolean
    /** @Config-Disable Wrap for Long Content */
    noWordWrap?: boolean
    /** @Config-Disable Code Minimap */
    noMiniMap?: boolean
    /** @Config-Disable Line Numbers */
    noLineNumber?: boolean
    /** @Config-Display Line Numbers Digits (Default: 5) */
    lineNumbersMinChars?: number
    /** @Config-Font Size (Default: 12) */
    fontSize?: number

    /** @Show Line Break Characters (If [type="http"]Applies Below, Disable in Context Menu) */
    showLineBreaks?: boolean

    /** @Config-Operation Log (Tracks Font Size & Newlines) */
    editorOperationRecord?: string

    /** Config-Built-in Editor On Click/Selection) Menu (Default Insert Tag/Encode/Decode) */
    /** @Config-Show Built-in Editor Options On Click/Selection) Menu (Default: Hide) */
    isShowSelectRangeMenu?: boolean
    /** @Config-Menu Hide Over n Lines (Default: 3) */
    overLine?: number
    /** @Config-Click Popup Content (Default: Insert Tag) */
    selectNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement
    /** @Config-Selection Popup Content (Default: Code/Decode-Readable in Editor) */
    rangeNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement

    /** @Config-Font Option (If present/Line Break Updates by Emitter) */
    editorId?: string

    highLightText?: HighLightText[]
}

/**
 * @Custom Menu Group
 * @Note!!! Key Value Must Match Primary Menu Key
 */
export interface OtherMenuListProps {
    [key: string]: {
        menu: EditorMenuItemType[]
        // Custom Args for Context Menu - Check for AI Plugin
        onRun: (editor: YakitIMonacoEditor, key: string, pageId?: string, data?: any) => any
        /** Menu Order Weight 0-First, 1-Second, Negatives-Last */
        order?: number
    }
}

/** @Editor-Key Mapping Enum (Letters & F1-12)) */
export enum YakitEditorKeyCode {
    Control = 17,
    Shift = 16,
    Meta = 93,
    Alt = 18,

    KEY_A = 65,
    KEY_B = 66,
    KEY_C = 67,
    KEY_D = 68,
    KEY_E = 69,
    KEY_F = 70,
    KEY_G = 71,
    KEY_H = 72,
    KEY_I = 73,
    KEY_J = 74,
    KEY_K = 75,
    KEY_L = 76,
    KEY_M = 77,
    KEY_N = 78,
    KEY_O = 79,
    KEY_P = 80,
    KEY_Q = 81,
    KEY_R = 82,
    KEY_S = 83,
    KEY_T = 84,
    KEY_U = 85,
    KEY_V = 86,
    KEY_W = 87,
    KEY_X = 88,
    KEY_Y = 89,
    KEY_Z = 90,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123
}
/** Custom Shortcut Key Menu Item */
export interface KeyboardToFuncProps {
    [key: string]: string[]
}

/** Operation Log Storage */
export interface OperationRecord {
    [key: string]: number | boolean
}

export interface OperationRecordRes {
    fontSize?: number
    showBreak?: boolean
}