import React from "react"

import styles from "./yakitEllipsis.module.scss"

export interface YakitEllipsisProp {
    text: string
    width?: number
}
/**
 * Major flaws, not recommended for frequent use
 */
export const YakitEllipsis: React.FC<YakitEllipsisProp> = (props) => {
    const {text, width = 260} = props

    return (
        <span style={{maxWidth: width}} className={styles["yakit-ellipsis-wrapper"]} title={text}>
            {text}
        </span>
    )
}
