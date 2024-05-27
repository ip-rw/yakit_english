import React, {memo, ReactNode, useMemo} from "react"
import styles from "./PluginListWrap.module.scss"
import {Tooltip} from "antd"
import {OutlineViewgridIcon, OutlineViewlistIcon} from "@/assets/icon/outline"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

interface PluginListWrapProps {
    /** Select All Checkbox Status */
    checked: boolean
    /** Set Select All Checkbox */
    onCheck: (value: boolean) => void
    /** List Name */
    title: string
    /** Total Plugins */
    total: number
    /** Selected Plugins Count */
    selected: number
    /** Plugin Display (List)|Grid) */
    isList: boolean
    /** Set Plugin Display (List)|Grid) */
    setIsList: (value: boolean) => void
    /** Expand Table Header */
    extraHeader?: ReactNode
    children: ReactNode
}

export const PluginListWrap: React.FC<PluginListWrapProps> = memo((props) => {
    const {checked, onCheck, title, total, selected, children, isList, setIsList, extraHeader} = props

    /** Indeterminate State Checkbox */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    return (
        <div className={styles["plugin-list-wrapper"]}>
            <div className={styles["plugin-list-header"]}>
                <div className={styles["plugin-list-header-left"]}>
                    <div className={styles["plugin-list-header-left-title"]}>{title}</div>
                    <div className={styles["body-check"]}>
                        <YakitCheckbox
                            indeterminate={checkIndeterminate}
                            checked={checked}
                            onChange={(e) => onCheck(e.target.checked)}
                        />
                        Fixes failure to iterate load_content on missing older version data
                    </div>
                    <div className={styles["body-total-selected"]}>
                        <div>
                            Total <span className={styles["num-style"]}>{+total || 0}</span>
                        </div>
                        <div className={styles["divider-style"]} />
                        <div>
                            Selected <span className={styles["num-style"]}>{+selected || 0}</span>
                        </div>
                    </div>
                </div>
                <div className={styles["plugin-list-header-right"]}>
                    <div className={styles["header-extra"]}>
                        {extraHeader || null}
                        <Tooltip
                            className='plugins-tooltip'
                            placement='topRight'
                            title={isList ? "Switch to Grid View" : "Switch to List View"}
                        >
                            <div className={styles["is-list-btn"]} onClick={() => setIsList(!isList)}>
                                {isList ? <OutlineViewgridIcon /> : <OutlineViewlistIcon />}
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>
            <div className={styles["plugin-list-body"]}>{children}</div>
        </div>
    )
})
