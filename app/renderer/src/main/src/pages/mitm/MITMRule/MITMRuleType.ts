import { YakitInputProps } from "@/components/yakitUI/YakitInput/YakitInputType"
import { ReactNode } from "react"
import { HTTPCookieSetting, HTTPHeader } from "../MITMContentReplacerHeaderOperator"

export interface MITMContentReplacerRule {
    // Text string, regex/Re2/String Hard Match
    Id: number
    Index: number
    Rule: string
    NoReplace: boolean
    Result: string
    Color: "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan" | ""
    EnableForRequest: boolean
    EnableForResponse: boolean
    EnableForBody: boolean
    EnableForHeader: boolean
    EnableForURI: boolean
    ExtraRepeat: boolean
    Drop: boolean
    ExtraTag: string[]
    Disabled: boolean
    VerboseName: string

    // Set Extra Headers
    ExtraHeaders: HTTPHeader[]
    ExtraCookies: HTTPCookieSetting[]
}

export interface MITMRuleProp {
    status: "idle" | "hijacked" | "hijacking"
    visible: boolean
    setVisible: (b: boolean) => void
    getContainer?: HTMLElement | (() => HTMLElement) | false
}

export interface ButtonTextProps {
    onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    label: string
    icon?: ReactNode
}

export interface MITMRuleFromModalProps {
    defaultIndex?: number
    isEdit: boolean
    modalVisible: boolean
    onClose: () => void
    onSave: (m: MITMContentReplacerRule) => void
    currentItem?: MITMContentReplacerRule
    rules: MITMContentReplacerRule[]
}

export interface ExtractRegularProps {
    onSave: (s: string) => void
    /**@Default code for name extraction rule */
    defaultCode?:string
}

export interface ExtraHTTPSelectProps {
    list: HTTPHeader[]
    tip: string
    onSave: (h: HTTPHeader) => any
    onRemove: (h: number) => any
}

export interface InputHTTPHeaderFormProps {
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (h: HTTPHeader) => any
}

export interface YakitSelectMemoProps {
    value: "" | "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan"
    disabled: boolean
    onSelect: (c: "" | "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan") => void
}

export interface YakitCheckboxProps {
    checked: boolean
    disabled: boolean
    onChange: (e) => void
}
export interface YakitSwitchMemoProps {
    checked: boolean
    disabled: boolean
    onChange: (e) => void
    Result: string
    ExtraHeaders: HTTPHeader[]
    ExtraCookies: HTTPCookieSetting[]
}

export interface CloseTipModalProps {
    visible: boolean
    onOK: (b: boolean) => void
    onCancel: (b: boolean) => void
}

export interface RuleContentProps {
    ref?: any
    /**@Default code for name extraction rule */
    defaultCode?:string
    getRule: (s: string) => void
    inputProps?: YakitInputProps
    /**@name Avoid passing complex nodes, preferably just an icon, Currently, regex Modal triggers only: icon and default component cases */
    children?: ReactNode
}

export interface RuleExportAndImportButtonProps {
    onOkImport?: () => void
    onBeforeNode?: ReactNode
    ref?: any
    isUseDefRules?: boolean
    setIsUseDefRules?: (b: boolean) => void
}
