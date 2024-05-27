import {Segmented} from "antd"
import React from "react"
import {YakitSegmentedProps} from "./YakitSegmentedType"
import styles from "./YakitSegmented.module.scss"
import classNames from "classnames"

/**
 * Current
 * small size height:24 same as antd
 * middle size height:28
 */

/**
 * @description YakitSegmentedProps attributes
 * @augments YakitSegmentedProps
 */
export const YakitSegmented = React.forwardRef<HTMLDivElement, YakitSegmentedProps>((props, ref) => {
    const {wrapClassName, size = "middle", className = "", ...resProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-segmented-small-wrapper"],
                {
                    [styles["yakit-segmented-middle-wrapper"]]: size === "middle"
                },
                wrapClassName
            )}
        >
            <Segmented
                {...resProps}
                size='small'
                ref={ref}
                className={classNames(styles["yakit-segmented"], className)}
            />
        </div>
    )
})
