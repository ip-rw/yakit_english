import React, {MouseEventHandler, ReactNode} from "react"
import styles from "./ExpandAndRetract.module.scss"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import classNames from "classnames"

/** Show transition animation based on status */
export type ExpandAndRetractExcessiveState = "default" | "process" | "finished" | "error" | "paused"
interface ExpandAndRetractProps {
    onExpand: MouseEventHandler<HTMLDivElement>
    isExpand: boolean
    children?: ReactNode
    className?: string
    animationWrapperClassName?: string
    /**@default description/In process/Complete Show transition animation based on status */
    status?: ExpandAndRetractExcessiveState
}
export const ExpandAndRetract: React.FC<ExpandAndRetractProps> = React.memo((props) => {
    const {isExpand, onExpand, children, className = "", animationWrapperClassName = "", status = "default"} = props
    return (
        <div
            className={classNames(
                styles["expand-and-retract-header"],
                {
                    [styles["expand-and-retract-header-process"]]: status === "process",
                    [styles["expand-and-retract-header-finished"]]: status === "finished",
                    [styles["expand-and-retract-header-error"]]: status === "error"
                },
                className
            )}
            onClick={onExpand}
        >
            <div className={classNames(styles["expand-and-retract-header-icon-body"], animationWrapperClassName)}>
                {isExpand ? (
                    <>
                        <OutlineChevrondoubleupIcon className={styles["expand-and-retract-icon"]} />
                        <span className={styles["expand-and-retract-header-icon-text"]}>Collapse Params</span>
                    </>
                ) : (
                    <>
                        <OutlineChevrondoubledownIcon className={styles["expand-and-retract-icon"]} />
                        <span className={styles["expand-and-retract-header-icon-text"]}>Expand Params</span>
                    </>
                )}
            </div>
            {children}
        </div>
    )
})
