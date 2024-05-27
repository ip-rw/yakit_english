import {Switch} from "antd"
import React from "react"
import {YakitSwitchProps} from "./YakitSwitchType"
import styles from "./YakitSwitch.module.scss"
import classNames from "classnames"
import {CheckIcon, RemoveIcon} from "@/assets/newIcon"
import "./yakitSwitchAnimation.scss"

/**
 * Update Notes
 * 1. Load theme color from env var
 * 2. Fix disabled state not graying when checked
 * 3. Animation issue when toggling disabled state
 * 4. Change Color Var
 */

/**
 * @description: tag
 * @augments TagProps Inherits default TagProps from antd
 * @param {"small" | "middle" | "large" | "maxLarge" } size default middle, small default when showInnerText ineffective
 * @private checkedChildren
 * @private unCheckedChildren
 * @param {boolean} showInnerText Show inner text when On/Text for Off, support only["large", "middle"]
 * @param {boolean} showInnerIcon Show inner icon, support only["large", "middle"]
 * @param {string} wrapperClassName Switch decorator div className
 */

const showExtraSize: string[] = ["large", "middle"]
export const YakitSwitch: React.FC<YakitSwitchProps> = (props) => {
    const {size = "middle", showInnerText, showInnerIcon, className = "", wrapperClassName = "",...reset} = props
    let children = {}
    if (showInnerText && showExtraSize.findIndex((ele) => ele === size) !== -1) {
        children = {
            checkedChildren: "On",
            unCheckedChildren: "Off"
        }
    }
    if (showInnerIcon && showExtraSize.findIndex((ele) => ele === size) !== -1) {
        children = {
            checkedChildren: (
                <CheckIcon
                    className={classNames({
                        [styles["yakit-switch-large-icon"]]: size === "large",
                        [styles["yakit-switch-middle-icon"]]: size === "middle"
                    })}
                />
            ),
            unCheckedChildren: (
                <RemoveIcon
                    className={classNames({
                        [styles["yakit-switch-large-icon"]]: size === "large",
                        [styles["yakit-switch-middle-icon"]]: size === "middle"
                    })}
                />
            )
        }
    }
    return (
        <div
            className={classNames(
                styles["yakit-switch-wrapper-item"],
                {
                    [styles["yakit-switch-wrapper-max-large"]]: size === "maxLarge",
                    [styles["yakit-switch-wrapper-large"]]: size === "large",
                    [styles["yakit-switch-wrapper-middle"]]: size === "middle",
                    [styles["yakit-switch-wrapper-small"]]: size === "small"
                },
                wrapperClassName
            )}
        >
            <Switch
                {...reset}
                {...children}
                size='default'
                className={classNames(styles["yakit-switch-item"], {
                    [styles["yakit-switch-max-large"]]: size === "maxLarge",
                    [styles["yakit-switch-large"]]: size === "large",
                    [styles["yakit-switch-middle"]]: size === "middle",
                    [styles["yakit-switch-small"]]: size === "small",
                    className
                })}
            />
        </div>
    )
}