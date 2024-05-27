export interface YakitTimeLineListProps<T> {
    ref?: React.ForwardedRef<YakitTimeLineListRefProps>
    loading?: boolean
    data: T[]
    icon?: (info: T) => ReactNode
    /** Render Node Fn */
    renderItem: (info: T, index: number) => ReactNode
    /** More Data To Load? */
    hasMore?: boolean
    /** Load More */
    loadMore?: () => any
}
export interface YakitTimeLineListRefProps {
    /** Global Data Reset */
    onClear: () => any
    /** Scroll To Index (Implemented, Unverified)) */
    onScrollToIndex: (index: number) => any
}

/** Dynamic Virt List Info */
export interface YakitVirtualListProps {
    /** Container Height */
    viewHeight: number
    /** List Height */
    listHeight: number
    /** Start Index */
    startIndex: number
    /** Max Capacity */
    maxCount: number
    /** Cached Data Length */
    preLen: number
}
/** Dynamic List Position Calc */
export interface YakitVirtualListPositionProps {
    // Current pos Index
    key: number
    /** Element Top Position */
    top: number
    /** Element Bottom Position */
    bottom: number
    /** Element Height */
    height: number
    /**
     * Self Height Diff: Update Needed?
     * Height Difference Explained
     */
    dHeight: number
}
