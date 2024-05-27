import {Collapse} from "antd"
import React, {useState} from "react"
import styles from "./YakitCollapse.module.scss"
import classNames from "classnames"
import {YakitCollapseProps, YakitPanelProps} from "./YakitCollapseType"
import {SolidChevrondownIcon, SolidChevronrightIcon} from "@/assets/icon/solid"

const {Panel} = Collapse

/**
 * @description: Collapsible Panel
 * @augments  Inherits default CollapseProps from antd
 */
const YakitCollapse: React.FC<YakitCollapseProps> = (props) => {
    const {expandIcon, bordered, className = "", ...restProps} = props

    return (
        <Collapse
            {...restProps}
            className={classNames(
                styles["yakit-collapse"],
                {
                    [styles["yakit-collapse-bordered-hidden"]]: bordered === false,
                    [styles["yakit-collapse-bordered"]]: bordered !== false
                },
                className
            )}
            ghost
            expandIcon={
                expandIcon ? expandIcon : (e) => (e.isActive ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />)
            }
        />
    )
}

/**
 * @description: Collapsible Panel
 * @augments  Inherits default CollapsePanelProps from antd
 */
const YakitPanel: React.FC<YakitPanelProps> = (props) => {
    const {...restProps} = props
    return <Panel {...restProps} />
}

export default Object.assign(YakitCollapse, {YakitPanel})
