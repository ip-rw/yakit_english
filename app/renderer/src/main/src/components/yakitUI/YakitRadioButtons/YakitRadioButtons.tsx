import {Checkbox, Radio} from "antd"
import React from "react"
import {YakitRadioButtonsProps} from "./YakitRadioButtonsType"
import styles from "./YakitRadioButtons.module.scss"
import classNames from "classnames"

/**
 * Update Notes
 * 1. Load theme color from env var
 * 2. Optimize Solid Style
 * 4. Change Color Var
 * 5. Edit Border Color
 */

/**
 * @description: Btn Radio Props
 * @param {"small" | "middle" | "large" | "maxLarge"} Size (default: middle)
 * @augments RadioGroupProps Inherit antd RadioGroupProps default
 * @params {string} className RadioGroup  className
 */
export const YakitRadioButtons: React.FC<YakitRadioButtonsProps> = (props) => {
    const {className, size, wrapClassName, ...restProps} = props
    return (
        <div
            className={classNames(
                {
                    [styles["yakit-radio-buttons-solid"]]: props.buttonStyle === "solid"
                },
                wrapClassName
            )}
        >
            <Radio.Group
                {...restProps}
                size='middle'
                optionType='button'
                className={classNames(
                    styles["yakit-radio-buttons-middle"],
                    {
                        [styles["yakit-radio-buttons-solid"]]: props.buttonStyle === "solid",
                        [styles["yakit-radio-buttons-max-large"]]: size === "maxLarge",
                        [styles["yakit-radio-buttons-large"]]: size === "large",
                        [styles["yakit-radio-buttons-small"]]: size === "small"
                    },
                    className
                )}
            />
        </div>
    )
}
