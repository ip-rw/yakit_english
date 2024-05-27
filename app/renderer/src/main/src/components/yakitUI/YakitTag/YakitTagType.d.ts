import {TagProps} from "antd"
import {CheckableTagProps} from "antd/lib/tag"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description TagProps Attributes
 * @augments TagProps Inherits antd's Default TagProps
 * @param {middle|large|small} size Default: Middle
 * @param {"danger" | "info" | "success" | "warning" |"serious"|"yellow"| "purple" | "blue" | "cyan" | "bluePurple"|"white"} color Color
 * @param {boolean} disable
 * @param {boolean} enableCopy Copy Enabled
 * @param {(e:MouseEvent) => void} onAfterCopy Post-Copy Event if enableCopy is true
 * @param {string} copyText Copy Text
 * @param {string} iconColor Copy Icon Color
 */

export type YakitTagColor =
    | "danger"
    | "info"
    | "success"
    | "warning"
    | "serious"
    | "yellow"
    | "purple"
    | "blue"
    | "cyan"
    | "bluePurple"
    | "white"

export interface YakitTagProps extends Omit<TagProps, "color"> {
    size?: YakitSizeType
    color?: YakitTagColor
    disable?: boolean
    enableCopy?: boolean
    onAfterCopy?: (e: MouseEvent) => void
    copyText?: string
    iconColor?: string
}
/**
 * @description: Copy Text
 * @param {string} className Wrapper Class
 * @param {(e:MouseEvent) => void} onAfterCopy Post-Copy Event
 * @param {string} copyText Copy Text
 * @param {string} iconColor Copy Icon Color
 */
export interface CopyComponentsProps {
    className?: string
    onAfterCopy?: (e: MouseEvent) => void
    copyText: string
    iconColor?: string
}

/**
 * @description: Multi-select Tag
 * @param {ReactNode} children
 * @param {string} wrapClassName
 * @param {boolean} disable
 */
export interface YakitCheckableTagProps extends CheckableTagProps {
    children?: ReactNode
    wrapClassName?: string
    disable?: boolean
}
