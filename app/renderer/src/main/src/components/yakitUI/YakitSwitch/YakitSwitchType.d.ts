import {SwitchProps} from "antd"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description YakitInputNumberProps properties
 * @inherits SwitchProps Inherits antd's SwitchProps default properties
 * @param {YakitSizeType} size  Default: middle
 * @param {boolean} showInnerText Display "on" text inside/offText Text for "off" 
 * @param {boolean} showInnerIcon Display icon inside 
 * @param {string} wrapperClassName className for Switch wrapper div
 */
export interface YakitSwitchProps extends Omit<SwitchProps, "size"> {
    size?: YakitSizeType
    showInnerText?:boolean
    showInnerIcon?:boolean
    wrapperClassName?:string
}
