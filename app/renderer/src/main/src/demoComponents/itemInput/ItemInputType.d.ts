import {YakitFormDraggerProps} from "@/components/yakitUI/YakitForm/YakitFormType"
import {YakitInputProps} from "@/components/yakitUI/YakitInput/YakitInputType"
import {YakitInputNumberProps} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {TextAreaProps} from "antd/lib/input"
import {CSSProperties, ReactNode} from "react"

interface ItemProps {
    label?: string | ReactNode
    help?: ReactNode
    formItemStyle?: CSSProperties
    required?: boolean
}

export interface ItemInputProps extends ItemProps {
    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean
    type?: LiteralUnion<
        | "button"
        | "checkbox"
        | "color"
        | "date"
        | "datetime-local"
        | "email"
        | "file"
        | "hidden"
        | "image"
        | "month"
        | "number"
        | "password"
        | "radio"
        | "range"
        | "reset"
        | "search"
        | "submit"
        | "tel"
        | "text"
        | "time"
        | "url"
        | "week",
        string
    >

    prefix?: React.ReactNode
    suffix?: React.ReactNode

    // Prevent Event Bubbling
    isBubbing?: boolean

    value?: string
    setValue?: (value: string) => any
}

export interface ItemTextAreaProps extends ItemProps {
    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean
    textareaRow?: number
    autoSize?: TextAreaProps["autoSize"]

    // Prevent Event Bubbling
    isBubbing?: boolean

    value?: string
    setValue?: (value: string) => any
}

export interface ItemAutoCompleteProps extends ItemProps {
    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean
    autoComplete?: string[]

    // Prevent Event Bubbling
    isBubbing?: boolean

    value?: string
    setValue?: (value: string) => any
}

export interface ItemInputIntegerProps extends ItemProps {
    width?: string | number
    size?: YakitInputNumberProps["size"]
    min?: number
    max?: number
    defaultValue?: number
    disable?: boolean
    value?: number
    setValue?: (value: number) => any
}
export interface ItemInputFloatProps extends ItemInputIntegerProps {
    precision?: number
}

export interface ItemInputDraggerPathProps extends ItemProps {
    /** Display Component Input|Text Area */
    renderType?: YakitFormDraggerProps["renderType"]
    /** Select Type File|Folder */
    selectType?: YakitFormDraggerProps["selectType"]

    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean

    // input
    /** Valid for Input Only */
    size?: YakitInputProps["size"]

    // textarea
    textareaRow?: number
    autoSize?: TextAreaProps["autoSize"]

    value?: string
    setValue?: (value: string) => any
}
