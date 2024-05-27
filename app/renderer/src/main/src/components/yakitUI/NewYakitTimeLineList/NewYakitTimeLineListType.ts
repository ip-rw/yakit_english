import { ReactNode } from "react"

export interface YakitTimeLineListProps<T> {
    ref?: React.ForwardedRef<YakitTimeLineListRefProps>
    loading?: boolean
    data: T[]
    /** Render Node Function */
    renderItem: (info: T, index: number) => ReactNode
    /** More Data to Load? */
    hasMore?: boolean
    /** Load More */
    loadMore?: () => any
    /** Time-line Item Default Height: 44px */
    DefaultItemHeight?: number
}
export interface YakitTimeLineListRefProps {
    /** Global Data Reset */
    onClear: () => any
    /** Jump to Index (Implemented, Unverified)) */
    onScrollToIndex: (index: number) => any
}

/** Dynamic Height Virtual List Info */
export interface YakitVirtualListProps {
    /** Container Height */
    viewHeight: number
    /** List Height */
    listHeight: number
    /** Start Index */
    startIndex: number
    /** Max Capacity */
    maxCount: number
    /** Cached Init Data Length */
    preLen: number
}
/** Dynamic Height Virtual List Position Calc */
export interface YakitVirtualListPositionProps {
    // Element Index at Current Pos
    key: number
    /** Element Top Position */
    top: number
    /** Element Bottom Position */
    bottom: number
    /** Element Height */
    height: number
    /**
     * Self Height Diff: Update Required?
     * Height Difference Explained
     */
    dHeight: number
}
