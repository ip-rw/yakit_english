import {
    memo,
    useMemo,
    useRef,
    useState,
    CSSProperties,
    useLayoutEffect,
    useEffect,
    forwardRef,
    useImperativeHandle
} from "react"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitSpin} from "../YakitSpin/YakitSpin"
import {YakitTimeLineListProps, YakitVirtualListPositionProps, YakitVirtualListProps} from "./NewYakitTimeLineListType"
import {YakitTimeLineItemIcon} from "./icon"

import styles from "./NewYakitTimeLineList.module.scss"

/** List State Initial Value */
const DefaultState: YakitVirtualListProps = {
    viewHeight: 0,
    listHeight: 0,
    startIndex: 0,
    maxCount: 0,
    preLen: 0
}

/**
 * @Name VarHeight VirtualList - Timeline
 * Note：
 * Comp Supports Only Data Addition, Not Deletion|Swap, No View Update in Subsequent Ops
 *
 * Indef-H VirtualList Can't Auto-Calc Data Qty Reduction,
 * Thus, Users Must Manually Clear VirtualList Position Info (See Method: onClear))
 */
export const NewYakitTimeLineList: <T>(props: YakitTimeLineListProps<T>) => any = memo(
    forwardRef((props, ref) => {
        const {loading = false, data = [], renderItem, hasMore = true, loadMore, DefaultItemHeight = 44} = props

        useImperativeHandle(
            ref,
            () => ({
                onClear: onClear,
                onScrollToIndex: onScrollToIndex
            }),
            []
        )

        const onClear = useMemoizedFn(() => {
            if (positions.current.length > 0) {
                handleSetState({...DefaultState})
                positions.current = []
                init()
            }
        })
        const onScrollToIndex = useMemoizedFn((start: number) => {
            handleSetState({...latestState.current, startIndex: start})
            if (wrapperRef && wrapperRef.current) {
                wrapperRef.current.scrollTop = positions.current[start].top
            }
        })

        const dataSource = useMemo(() => {
            return data.map((item, index) => {
                return {index: index, data: item}
            })
        }, [data])

        const wrapperRef = useRef<HTMLDivElement>(null)
        const bodyRef = useRef<HTMLDivElement>(null)

        /** Record Item Position */
        const positions = useRef<YakitVirtualListPositionProps[]>([])

        /** Base Info */
        const [state, setState] = useState<YakitVirtualListProps>({...DefaultState})
        /** Latest Base Info */
        const latestState = useRef<YakitVirtualListProps>({...DefaultState})
        const handleSetState = useMemoizedFn((value: YakitVirtualListProps) => {
            latestState.current = {...value}
            setState({...value})
        })

        // Last Viewport Index
        const endIndex = useMemo(() => {
            return Math.min(dataSource.length, state.startIndex + state.maxCount)
        }, [dataSource, state.startIndex, state.maxCount])
        // Viewport Render List Data
        const renderList = useMemo(() => {
            return dataSource.slice(state.startIndex, endIndex)
        }, [dataSource, state.startIndex, endIndex])
        // Viewport Offset
        const offsetDis = useMemo(() => {
            if (positions.current.length === 0) return 0
            return state.startIndex > 0 ? positions.current[state.startIndex - 1].bottom : 0
        }, [state.startIndex])

        // Scroll Style
        const scrollStyle = useMemo(() => {
            return {
                height: `${state.listHeight - offsetDis}px`,
                transform: `translate3d(0,${offsetDis}px,0)`
            } as CSSProperties
        }, [state.listHeight, offsetDis])

        // Data Source Change Initialization
        useLayoutEffect(() => {
            initPosition()
        }, [dataSource])
        // Actual Data Collection Post-DataSource Render
        // Delay Needed to Access Initial Data Node DOM
        useEffect(() => {
            setTimeout(() => {
                setPosition()
            }, 300)
        }, [dataSource])

        // Initialize Position Info
        const initPosition = useMemoizedFn(() => {
            const pos: YakitVirtualListPositionProps[] = []
            const disLen = dataSource.length - latestState.current.preLen
            const currentLen = positions.current.length
            const preBottom = positions.current[currentLen - 1] ? positions.current[currentLen - 1].bottom : 0
            for (let i = 0; i < disLen; i++) {
                pos.push({
                    key: i + latestState.current.preLen,
                    height: DefaultItemHeight,
                    top: preBottom ? preBottom + (i + 1) * DefaultItemHeight : i * DefaultItemHeight,
                    bottom: preBottom ? preBottom + (i + 1) * DefaultItemHeight : (i + 1) * DefaultItemHeight,
                    dHeight: 0
                })
            }
            positions.current = [...positions.current, ...pos]
            handleSetState({...latestState.current, preLen: dataSource.length})
        })
        // Update Actual Height Post Data Item Render
        const setPosition = useMemoizedFn(() => {
            if (!bodyRef || !bodyRef.current) return
            const nodes = bodyRef.current.children
            if (!nodes || !nodes.length) return
            // Trigger Viewport Position Calc on Position Reset
            if (positions.current.length === 0) return

            // First Viewport Element Index
            let viewFirst: number = -1
            ;[...nodes].forEach((node) => {
                const rect = node.getBoundingClientRect()

                let key: number = -1
                // Get Node Index
                const {attributes} = node || {}
                if (!attributes) return
                for (let el of attributes) {
                    if (el.name.indexOf("data-yakit-time-line-item-key") > -1) {
                        try {
                            let strs = el.value.split("-")
                            key = +strs[strs.length - 1] === 0 ? 0 : +strs[strs.length - 1] || -1
                            // For Setting Real Position Below
                            if (viewFirst === -1 && key !== -1) viewFirst = key
                        } catch (error) {}
                        break
                    }
                }

                if (key === -1) return

                const item = positions.current[key]
                const dHeight = item.height - rect.height
                if (dHeight) {
                    item.height = rect.height
                    item.bottom = item.bottom - dHeight
                    item.dHeight = dHeight
                }
            })

            const len = positions.current.length
            let startHeight = positions.current[viewFirst].dHeight
            positions.current[viewFirst].dHeight = 0
            for (let i = viewFirst + 1; i < len; i++) {
                const item = positions.current[i]
                item.top = positions.current[i - 1].bottom
                item.bottom = item.bottom - startHeight
                if (item.dHeight !== 0) {
                    startHeight += item.dHeight
                    item.dHeight = 0
                }
            }
            handleSetState({...latestState.current, listHeight: positions.current[len - 1].bottom})

            // Auto-load More on Insufficient Data to Fill Page
            if (wrapperRef && wrapperRef.current) {
                try {
                    const rect = wrapperRef.current.getBoundingClientRect()
                    if (latestState.current.listHeight <= rect.height) {
                        if (!loading && hasMore && loadMore) loadMore()
                    }
                } catch (error) {}
            }
        })

        useUpdateEffect(() => {
            setPosition()
        }, [state.startIndex])

        // Scroll Event
        const handleScroll = useMemoizedFn(() => {
            if (wrapperRef && wrapperRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = wrapperRef.current
                handleSetState({...latestState.current, startIndex: binarySearch(positions.current, scrollTop)})
                const bottom = scrollHeight - clientHeight - scrollTop
                if (bottom <= 20) {
                    if (!loading && hasMore && loadMore) loadMore()
                }
            }
        })
        // Binary Search for startIndex
        const binarySearch = (list: YakitVirtualListPositionProps[], value: number) => {
            let left = 0,
                right = list.length - 1,
                templateIndex = -1
            while (left < right) {
                const midIndex = Math.floor((left + right) / 2)
                const midValue = list[midIndex].bottom
                if (midValue === value) return midIndex + 1
                else if (midValue < value) left = midIndex + 1
                else if (midValue > value) {
                    if (templateIndex === -1 || templateIndex > midIndex) templateIndex = midIndex
                    right = midIndex
                }
            }
            return templateIndex === -1 ? 0 : templateIndex
        }

        // Initialize Base Info
        const init = useMemoizedFn(() => {
            if (wrapperRef && wrapperRef.current) {
                const view = wrapperRef.current.offsetHeight || 0
                const max = Math.ceil(view / DefaultItemHeight) + 1
                handleSetState({...latestState.current, viewHeight: view, maxCount: max})
            }
        })

        useLayoutEffect(() => {
            init()

            if (wrapperRef && wrapperRef.current) {
                wrapperRef.current.addEventListener("scroll", handleScroll)
            }
            return () => {
                if (wrapperRef && wrapperRef.current) {
                    wrapperRef.current.removeEventListener("scroll", handleScroll)
                }
            }
        }, [])

        return (
            <div ref={wrapperRef} className={styles["yakit-time-line-list-wrapper"]}>
                <div ref={bodyRef} style={scrollStyle}>
                    {renderList.map((el) => {
                        const isShowTail = el.index !== dataSource.length - 1
                        return (
                            <div
                                data-yakit-time-line-item-key={`time-line-item-${el.index}`}
                                key={`time-line-item-${el.index}`}
                                className={styles["time-line-item-wrapper"]}
                            >
                                <div className={styles["time-line-content"]}>{renderItem(el.data, el.index)}</div>
                            </div>
                        )
                    })}
                    {loading && (
                        <div className={styles["time-line-item-loading"]}>
                            <YakitSpin spinning={true} wrapperClassName={styles["spin-style"]} />
                        </div>
                    )}
                    {!loading && !hasMore && <div className={styles["time-line-item-bottom"]}>Reached Bottom ~</div>}
                </div>
            </div>
        )
    })
)
