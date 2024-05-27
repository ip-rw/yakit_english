import {ReactNode} from "react"

export interface YakitRoundCornerTagProps {
    wrapperClassName?: string
    /**
     * round-corner-tag color
     * @default primary (essentially gray))
     * @description primary | blue | green
     */
    color?: "primary" | "blue" | "green"
    children?: ReactNode
}
