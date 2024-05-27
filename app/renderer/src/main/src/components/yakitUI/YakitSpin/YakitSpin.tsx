import {Spin} from "antd"
import React from "react"
import {YakitSpinProps} from "./YakitSpinType"
import styles from "./YakitSpin.module.scss"
import classNames from "classnames"

/**
 * Update Notes
 * 1. Load theme color from env var
 * 2. Add color variables
 */

/**
 * @description YakitSpinProps Properties
 * @augments YakitSpinProps Inherits default SpinProps from antd
 */
export const YakitSpin: React.FC<YakitSpinProps> = (props) => {
    return (
        <Spin
            {...props}
            className={classNames(styles["yakit-spin"], props.wrapperClassName)}
            wrapperClassName={classNames(styles["yakit-spin"], props.wrapperClassName)}
        ></Spin>
    )
}
