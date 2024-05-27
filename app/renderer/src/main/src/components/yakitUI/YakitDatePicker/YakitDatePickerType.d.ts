import {CSSProperties} from "react"

import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description YakitInputSearchProps Properties
 * @augments DatePickerProps Inherits antd's Input SearchProps Default Properties
 * @param {YakitSizeType} size Default middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitDatePickerProps extends Omit<DatePickerProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}

/**
 * @description YakitInputSearchProps Properties
 * @augments DatePickerProps Inherits antd's Input SearchProps Default Properties
 * @param {YakitSizeType} size Default middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitRangePickerProps extends Omit<RangePickerProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}
