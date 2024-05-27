import React, {useEffect, useState, useRef, ReactNode, useMemo} from "react"
import ReactResizeDetector from "react-resize-detector"
import {useDebounceEffect, useMemoizedFn, useSize, useThrottleFn, useVirtualList, useDeepCompareEffect} from "ahooks"
import {LoadingOutlined} from "@ant-design/icons"
import "./RollingLoadList.scss"

export interface RollingLoadListProps<T> {
    rowKey?: string
    data: T[]
    loadMoreData: () => void
    renderRow: (r: T, i: number) => ReactNode
    page: number
    hasMore: boolean
    loading: boolean
    scrollToNumber?: number
    isRef?: boolean // Refresh all
    classNameRow?: string
    classNameList?: string
    defItemHeight: number
    numberRoll?: number
    isGridLayout?: boolean
    defCol?: number
    defOverscan?: number
    recalculation?: boolean //Refresh partial, recalculate on item update in data
    targetRef?: React.RefObject<any>
}

const classNameWidth = {
    2: "width-50",
    3: "width-33",
    4: "width-25",
    5: "width-20"
}

export const RollingLoadList = <T extends any>(props: RollingLoadListProps<T>) => {
    const {
        data,
        loadMoreData,
        renderRow,
        page,
        hasMore,
        rowKey,
        loading,
        isRef,
        classNameRow,
        classNameList,
        defItemHeight,
        defOverscan,
        numberRoll,
        isGridLayout,
        defCol,
        recalculation,
        targetRef
    } = props
    const [vlistHeigth, setVListHeight] = useState(600)
    const [col, setCol] = useState<number>()
    const [computeOriginalList, setComputeOriginalList] = useState(false)
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    let indexMapRef = useRef<Map<string, number>>(new Map<string, number>())
    let preLength = useRef<number>(0)
    let preData = useRef<any>([])
    const resetPre = useMemoizedFn(() => {
        preLength.current = 0
        preData.current = []
        setComputeOriginalList(!computeOriginalList)
    })
    let originalList = useMemo(() => {
        if (!col) return []
        if (data.length < preLength.current) {
            resetPre()
        }
        const listByLength: any[] = []
        const length = data.length
        const remainder = preLength.current % col
        if (remainder !== 0) {
            preLength.current = preLength.current - remainder
            const removeList = preData.current.pop()
            removeList.forEach((element) => {
                indexMapRef.current?.delete(`${element[rowKey || "Id"]}`)
            })
        }
        for (let index = preLength.current; index < length; index += col) {
            if (index % col === 0) {
                const arr: any = []
                for (let j = 0; j < col; j++) {
                    if (data[index + j]) {
                        const item = data[index + j]
                        indexMapRef.current?.set(`${item[rowKey || "Id"]}`, index + j)
                        arr.push(item)
                    }
                }
                listByLength.push(arr)
            }
        }
        preLength.current = length
        preData.current = preData.current.concat(listByLength)
        return preData.current
    }, [data.length, col, computeOriginalList])
    const [list, scrollTo] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: defItemHeight,
        overscan: defOverscan || 5
    })
    useDebounceEffect(
        () => {
            if (!hasMore) return
            if (!containerRef || !wrapperRef) return
            // If wrapperRef data does not fill containerRef, request more data
            const containerHeight = containerRef.current?.clientHeight
            const wrapperHeight = wrapperRef.current?.clientHeight
            if (wrapperHeight && wrapperHeight <= containerHeight) {
                loadMoreData()
            }
        },
        [wrapperRef.current?.clientHeight, isRef, hasMore],
        {wait: 200}
    )
    useEffect(() => {
        resetPre()
    }, [recalculation])
    useEffect(() => {
        resetPre()
        scrollTo(0)
    }, [isRef])
    const isFirstNumberRoll = useRef(true) // Do not execute initially
    useEffect(() => {
        onRollNumber()
    }, [numberRoll, col])
    const onRollNumber = useMemoizedFn(() => {
        if (isFirstNumberRoll.current) {
            isFirstNumberRoll.current = false
        } else {
            if (!numberRoll) return
            // Do not execute initially; Add delay, else element may not load
            setTimeout(() => {
                scrollTo(numberRoll)
            }, 100)
        }
    })

    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    useDebounceEffect(
        () => {
            resetPre()
            if (isGridLayout) {
                onComputeItemHeight()
            } else {
                setCol(defCol || 1)
            }
        },
        [isGridLayout, width],
        {wait: 200, leading: true}
    )
    const onComputeItemHeight = useMemoizedFn(() => {
        if (!width) return
        if (defCol) {
            setCol(defCol)
            return
        }
        const computeCol = 1
        if (width <= 1024) {
            setCol(computeCol * 2)
        } else if (width >= 1024 && width < 1440) {
            setCol(computeCol * 3)
        } else if (width >= 1440) {
            setCol(computeCol * 4)
        }
    })

    const onScrollCapture = useThrottleFn(
        () => {
            if (wrapperRef && containerRef && !loading && hasMore) {
                const dom = containerRef.current || {
                    scrollTop: 0,
                    clientHeight: 0,
                    scrollHeight: 0
                }
                const contentScrollTop = dom.scrollTop //Scrollbar distance to top
                const clientHeight = dom.clientHeight //Viewport
                const scrollHeight = dom.scrollHeight //Scrollbar total height
                const scrollBottom = scrollHeight - contentScrollTop - clientHeight
                if (scrollBottom <= 500) {
                    loadMoreData() // Fetch data method
                }
            }
        },
        {wait: 200, leading: false}
    )
    return (
        <>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!height) {
                        return
                    }
                    setVListHeight(height)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
                targetRef={targetRef}
            />
            <div
                className={`container ${classNameList || ""}`}
                style={{height: vlistHeigth}}
                ref={containerRef}
                onScroll={() => onScrollCapture.run()}
            >
                <div ref={wrapperRef}>
                    {((isGridLayout && col && col > 1) || (!isGridLayout && col === 1)) &&
                        list.map((i, index) => {
                            const itemArr = i.data as any
                            if (isGridLayout && col && col > 1) {
                                return (
                                    <div
                                        className='display-flex'
                                        key={itemArr.map((ele) => ele[rowKey || "Id"]).join("-") + "-" + index}
                                    >
                                        {itemArr.map((ele, number) => (
                                            <div
                                                className={`${(col && classNameWidth[col]) || ""} ${
                                                    classNameRow || ""
                                                }`}
                                                key={ele[rowKey || "Id"] + "--" + index}
                                            >
                                                {renderRow(
                                                    ele,
                                                    indexMapRef.current?.get(`${ele[rowKey || "Id"]}`) || 0
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                            return itemArr.map((ele, number) => (
                                <div
                                    className={`${(col && classNameWidth[col]) || ""} ${classNameRow || ""}`}
                                    key={ele[rowKey || "Id"] + "--" + index}
                                >
                                    {renderRow(ele, indexMapRef.current?.get(`${ele[rowKey || "Id"]}`) || 0)}
                                </div>
                            ))
                        })}
                    {loading && hasMore && (
                        <div className='grid-block text-center'>
                            <LoadingOutlined />
                        </div>
                    )}
                    {!loading && !hasMore && (page || 0) > 0 && (
                        <div className='grid-block text-center no-more-text'>No more data</div>
                    )}
                </div>
            </div>
        </>
    )
}
