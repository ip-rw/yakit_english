import {InputProps, SelectProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

import {PasswordProps, SearchProps, TextAreaProps} from "antd/lib/input"
import {CSSProperties} from "react"

import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {YakitSelectProps} from "../YakitSelect/YakitSelectType"

/**
 * @description YakitInputNumberProps properties
 * @augments InputProps Inherits antd's Input default properties
 * @param {YakitSizeType} size Default middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitInputProps extends Omit<InputProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}
/**
 * @description YakitInputSearchProps properties
 * @augments InputProps Inherits antd's Input SearchProps default properties
 * @param {YakitSizeType} size Default middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitInputSearchProps extends Omit<SearchProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}
/**
 * @description InternalTextAreaProps properties
 * @augments InternalTextAreaProps Inherits antd's Input TextAreaProps default properties
 * @param {string} wrapperClassName
 * @param {string} resizeClassName
 * @param {CSSProperties} wrapperStyle
 * @param {boolean} isShowResize Show drag icon in bottom right corner, false to hide both icon and functionality
 */
export interface InternalTextAreaProps extends TextAreaProps {
    wrapperClassName?: string
    resizeClassName?: string
    wrapperStyle?: React.CSSProperties
    isShowResize?: boolean
}

/**
 * @description InternalInputPasswordProps properties
 * @augments InternalInputPasswordProps Inherits antd's Input PasswordProps default properties
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface InternalInputPasswordProps extends Omit<PasswordProps, "size"> {
    wrapperClassName?: string
    size?: YakitSizeType
    wrapperStyle?: React.CSSProperties
}
