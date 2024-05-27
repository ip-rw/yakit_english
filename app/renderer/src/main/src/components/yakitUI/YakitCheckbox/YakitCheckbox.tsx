import {Checkbox} from "antd"
import React from "react"
import {YakitCheckboxProps} from "./YakitCheckboxType"
import styles from "./YakitCheckbox.module.scss"
import classNames from "classnames"
import "./yakitCheckBoxAnimation.scss"

/**
 * Update Notes
 * 1. Load theme color from env var
 * 2. Add color variables
 */

/**
 * @description: Dual-mode Number Input
 * @augments CheckboxProps Inherits default CheckboxProps from antd
 * @param {string} wrapperClassName
 */
export const YakitCheckbox: React.FC<YakitCheckboxProps> = (props) => {
    const {wrapperClassName} = props
    return props.children ? (
        <span className={classNames(styles["yakit-checkbox-children-wrapper"],styles["yakit-checkbox-wrapper"], wrapperClassName)}>
            <Checkbox {...props}>{props.children}</Checkbox>
        </span>
    ) : (
        <span className={classNames(styles["yakit-checkbox-wrapper"], wrapperClassName)}>
            <Checkbox {...props} />
        </span>
    )
}
