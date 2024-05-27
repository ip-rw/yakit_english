import {InputNumberProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

export declare type YakitSizeType = "small" | "middle" | "large" | "maxLarge" | undefined
export declare type ValueType = string | number

/**
 * @description YakitInputNumberProps attributes
 * @augments InputNumberProps Inherits antd's InputNumber default attributes
 * @param {horizontal | vertical} type  Default: vertical
 * @param {YakitSizeType} size  Default: middle
 * @param {string} wrapperClassName  Default: middle
 */
export interface YakitInputNumberProps extends Omit<InputNumberProps, "size"> {
    type?: "horizontal" | "vertical"
    size?: YakitSizeType
    ref?: any
    wrapperClassName?: string
}

/**
 * @description: Two modes of number input
 * @augments InputNumberProps Inherits antd's InputNumber default attributes
 */
export interface YakitInputNumberHorizontalProps extends Omit<InputNumberProps, "size" | "bordered"> {
    size?: YakitSizeType
}
