import {ReactNode} from "react"

export interface ColumnProps<T> {
    /** Display Field */
    key: string
    /** Header Title(Default Key) */
    headerTitle?: ReactNode
    /** Display Content(Default Value by Key) */
    colRender?: (info: T) => ReactNode
    width?: number
}

export interface VirtualTableProps<T> {
    /** Hide Table Header */
    isHideHeader?: boolean
    /** Auto-Load on Reach Top(Default Bottom) */
    isTopLoadMore?: boolean
    /** Stop Auto-Load */
    isStop?: boolean
    /**
     * Scrollbar Real-Time Update(Only for Bottom Auto-Load)
     * Manual Update via isStop if Scrollbar Not Real-Time
     */
    isScrollUpdate?: boolean
    /** Trigger Data Clear */
    triggerClear?: boolean
    /** Auto-Load Delay(Default 1000ms) */
    wait?: number
    /** Unique Row Key */
    rowKey: string
    loadMore: (fromInfo?: T) => Promise<{data: T[]}>
    columns: ColumnProps<T>[]
    /** Row Click Callback */
    rowClick?: (info: T) => any

    onTouchTop?: () => any
    onTouchBottom?: () => any
}
