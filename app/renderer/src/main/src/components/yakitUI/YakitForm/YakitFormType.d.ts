import {YakitAutoCompleteProps} from './../YakitAutoComplete/YakitAutoCompleteType.d';
import {FormItemProps, InputProps} from "antd"
import {DraggerProps} from "antd/lib/upload"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {InternalTextAreaProps} from "../YakitInput/YakitInputType"
import {ReactNode} from "react"

type YakitDragger = Omit<DraggerProps, "beforeUpload" | "onChange">

/**Drag Props */
export interface FileDraggerProps {
    /**Disabled */
    disabled?: boolean
    /**Multi-select Allowed? */
    multiple?: boolean
    className?: string
    children?: ReactNode
    onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
}
export interface YakitFormDraggerProps extends YakitDraggerProps {
    formItemClassName?: string
    formItemProps?: FormItemProps
}
/**Draggable/File Click Props */
export interface YakitDraggerProps extends FileDraggerProps {
    size?: YakitSizeType
    inputProps?: InputProps
    /**@Valid Only for selectType=file*/
    setContent?: (s: string) => void
    help?: ReactDOM
    showDefHelp?: boolean
    /**Echoed Text Value */
    value?: string
    /**Echo Text Callback */
    onChange?: (s: string) => void
    /**All: Files & Folders, No accept; File Only; Folder Only;a */
    selectType?: "file" | "folder" | "all"
    /** Display Component Input|textarea|autoComplete */
    renderType?: "input" | "textarea" | "autoComplete"
    /** AutoComplete Props */
    autoCompleteProps?: YakitAutoCompleteProps
    /** Textarea Props */
    textareaProps?: InternalTextAreaProps
    /**Display Path Count? */
    isShowPathNumber?: boolean

    /**Accepted File Types */
    accept?: string
    /**Prompt for Valid Path? */
    showFailedFlag?: boolean
}

export interface YakitDraggerContentProps
    extends Omit<YakitDragger, "showUploadList" | "directory" | "multiple" | "beforeUpload" | "onChange"> {
    /** Textarea Props */
    textareaProps?: InternalTextAreaProps
    size?: YakitSizeType
    /**Echoed Text Value */
    value?: string
    /**@Echo Text Callback*/
    onChange?: (s: string) => void
    help?: ReactDOM
    showDefHelp?: boolean
    // InputProps?: InputProps
    // /** Display Component Input|textarea */
    // renderType?: "input" | "textarea"
    /**@default 500k */
    fileLimit?: number
    /**Value Separator @default ',' */
    valueSeparator?: string
}

export interface YakitFormDraggerContentProps extends YakitDraggerContentProps {
    formItemClassName?: string
    formItemProps?: FormItemProps
}
