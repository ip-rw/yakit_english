import { CheckboxProps } from "antd";


/**
 * @description YakitCheckboxProps Properties
 * @augments CheckboxProps Inherits antd's CheckboxProps default properties
 * @param {string} wrapperClassName  
 */
export interface YakitCheckboxProps extends CheckboxProps{
    wrapperClassName?:string
}