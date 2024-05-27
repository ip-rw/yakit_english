import React from "react"
import {Tabs, TabsProps} from "antd"

import styles from "./PluginTabs.module.scss"

const {TabPane} = Tabs

interface PluginTabsProps extends Omit<TabsProps, "size" | "type"> {
    /** @deprecated Component can't set this property, default to default */
    size?: "default"
    /** @deprecated Component can't set this property, default to card */
    type?: "card"
}

const PluginTabs: React.FC<PluginTabsProps> = (props) => {
    const {children, size = "default", type = "card", ...rest} = props

    return (
        <div className={styles["plugin-tabs"]}>
            <Tabs {...rest} type='card'>
                {children}
            </Tabs>
        </div>
    )
}

/** @name Plugin Function Page Tabs Component */
export default Object.assign(PluginTabs, {TabPane})
