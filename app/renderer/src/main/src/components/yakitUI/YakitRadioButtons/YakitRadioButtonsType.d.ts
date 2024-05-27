import {RadioGroupProps} from "antd"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description: Button Radio Props
 * @augments RadioGroupProps Inherits antd's RadioGroupProps Default Properties
 * @property {YakitSizeType} size Default: middle
 * @property {string} className
 * @property {string} wrapClassName
 */
export interface YakitRadioButtonsProps extends Omit<RadioGroupProps, "size" | "optionType"> {
    size?: YakitSizeType
    className?: string
    wrapClassName?: string
}
