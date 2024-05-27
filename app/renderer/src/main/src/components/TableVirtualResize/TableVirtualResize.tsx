import React, {ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    useClickAway,
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useDeepCompareEffect,
    useGetState,
    useMemoizedFn,
    useScroll,
    useThrottleFn,
    useUpdateEffect,
    useVirtualList,
    useInViewport
} from "ahooks"
import classNames from "classnames"
import {
    ColumnsTypeProps,
    FiltersItemProps,
    RowSelectionProps,
    ScrollProps,
    SelectSearchProps,
    SortProps,
    TableVirtualResizeProps
} from "./TableVirtualResizeType"
import ReactResizeDetector from "react-resize-detector"
import styles from "./TableVirtualResize.module.scss"
import {DatePicker, Divider, Popover, RadioChangeEvent, Spin, Tag, Tooltip} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import {
    FilterIcon,
    SorterDownIcon,
    SorterUpIcon,
    DisableSorterIcon,
    QuestionMarkCircleIcon,
    DragSortIcon,
    CheckIcon
} from "@/assets/newIcon"
import {useHotkeys} from "react-hotkeys-hook"
import moment, {Moment} from "moment"
// import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {useDrag, useDrop, DndProvider} from "react-dnd"
import {HTML5Backend} from "react-dnd-html5-backend"
import type {Identifier, XYCoord} from "dnd-core"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitProtoCheckbox, YakitProtoCheckboxProps} from "./YakitProtoCheckbox/YakitProtoCheckbox"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {randomString} from "@/utils/randomUtil"
import cloneDeep from "lodash/cloneDeep"
const {RangePicker} = DatePicker

/**
 * @Description: Update notes
 * 1.Update data changes, cell state unchanged, dataKey must correspond to modified value
 */
interface tablePosition {
    bottom?: number
    height?: number
    left: number
    right?: number
    top: number
    width?: number
    x?: number
    y?: number
}

interface DragItem {
    index: number
    id: string
    type: string
}

function TableVirtualResizeFunction<T>(props: TableVirtualResizeProps<T>, ref: React.ForwardedRef<any>) {
    const containerRef = useRef<any>(null)
    useImperativeHandle(
        ref,
        () => ({
            containerRef: containerRef.current
        }),
        [containerRef.current]
    )
    const getTableRef = useMemoizedFn((cRef) => {
        containerRef.current = cRef
    })
    return <Table<T> {...props} getTableRef={getTableRef} />
}

const defMinWidth = 60

const Table = <T extends any>(props: TableVirtualResizeProps<T>) => {
    const defPagination = useCreation(
        () => ({
            page: 1,
            limit: 20,
            total: 0,
            onChange: () => {}
        }),
        []
    )
    const {
        size = "small",
        data,
        rowSelection,
        renderKey,
        enableDrag,
        pagination = defPagination,
        title,
        extra,
        loading,
        scrollToBottom,
        isReset,
        titleHeight,
        renderTitle,
        isShowTitle = true,
        getTableRef,
        scrollToIndex,
        currentIndex,
        setCurrentIndex,
        isRefresh,
        disableSorting,
        query,
        currentSelectItem,
        onSetCurrentRow,
        onMoveRow,
        enableDragSort,
        onMoveRowEnd,
        useUpAndDown,
        containerClassName,
        isRightClickBatchOperate
    } = props
    const defItemHeight = useCreation(() => {
        if (size === "middle") return 32
        return 28
    }, [size])
    const [currentRow, setCurrentRow] = useState<T>()
    const [selectedRows, setSelectedRows] = useState<T[]>([])
    const [width, setWidth] = useState<number>(0) //Table div width
    const [height, setHeight] = useState<number>(300) //Table div height
    const [defColumns, setDefColumns] = useState<ColumnsTypeProps[]>(props.columns) // Header
    const [columns, setColumns, getColumns] = useGetState<ColumnsTypeProps[]>(props.columns) // Header
    const [lineLeft, setLineLeft] = useState<number>(0) // Drag Line Left
    const [hoverLine, setHoverLine] = useState<boolean>(false) // Drag Line Hover State
    // const [tableWidth, setTableWidth] = useState<number>(0) // Table div width, Actual width
    const [lineIndex, setLineIndex] = useState<number>(-1) // Dragged columns index
    const [scroll, setScroll] = useState<ScrollProps>({
        scrollLeft: 0,
        scrollBottom: 0,
        scrollRight: 2 //Initial value must be >1
    }) // Scrollbar Margin
    const [sort, setSort] = useState<SortProps>({
        order: "none",
        orderBy: ""
    }) // Dragged columns index
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    const columnsRef = useRef(null)
    const tableRef = useRef<any>(null)
    const lineStartX = useRef<number>(0) // Drag Line Start Position
    const lineEndX = useRef<number>(0) // Drag Line End Position
    const tablePosition = useRef<tablePosition>({
        left: 0,
        top: 0
    }) // Table Distance from Left
    const containerRefPosition = useRef<tablePosition>({
        left: 0,
        top: 0
    })

    const [list, scrollTo] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: defItemHeight,
        overscan: 10
    })

    const checkboxPropsMap = useCreation(() => {
        const map = new Map<React.Key, Partial<YakitProtoCheckboxProps>>()
        const {getCheckboxProps} = rowSelection || {}
        if (!!getCheckboxProps) {
            data.forEach((record, index) => {
                const key = record[renderKey]
                const checkboxProps = getCheckboxProps(record) || {}
                map.set(key, checkboxProps)
            })
        }
        return map
    }, [data, rowSelection?.getCheckboxProps])

    useEffect(() => {
        setCurrentRow(currentSelectItem)
    }, [currentSelectItem])
    useEffect(() => {
        scrollTo(0)
    }, [isRefresh])

    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
            const target = entry.target
            containerRefPosition.current = target.getBoundingClientRect()
        })
    })

    useUpdateEffect(() => {
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }
    }, [containerRef.current, height])

    useDebounceEffect(
        () => {
            //To display scrollbar for loading
            if (!containerRef || !wrapperRef) return
            // Data in containerRef doesn't fill tableRef, need more data
            const containerHeight = containerRef.current?.clientHeight
            const tableHeight = tableRef.current?.clientHeight
            if (pagination && pagination.onChange && containerHeight && containerHeight <= tableHeight) {
                const hasMore = pagination.total == data.length
                if (!hasMore) pagination.onChange(Number(pagination.page) + 1, pagination.limit)
            }
        },
        [tableRef.current?.clientHeight, isRefresh],
        {wait: 200}
    )
    useEffect(() => {
        if (currentIndex === undefined) {
            setCurrentRow(undefined)
            return
        }
    }, [currentIndex])

    // Scroll to Specific Index
    useEffect(() => {
        if (scrollToIndex !== undefined) {
            if (typeof scrollToIndex === "string") {
                const indexStr = scrollToIndex.split("_")[0]
                scrollTo(+indexStr)
            } else {
                scrollTo(scrollToIndex)
            }
        }
    }, [scrollToIndex])

    const [inViewport] = useInViewport(containerRef)

    // Use Up Arrow
    useHotkeys(
        "up",
        () => {
            if (!setCurrentRow) return
            const dataLength = data.length
            if (dataLength <= 0) {
                return
            }
            if (!currentRow) {
                setCurrentIndex && setCurrentIndex(0)
                setCurrentRow(data[0])
                if (onSetCurrentRow) onSetCurrentRow(data[0])
                return
            }
            let index
            // If above, select updated content
            for (let i = 0; i < dataLength; i++) {
                if (data[i][renderKey] === currentRow[renderKey]) {
                    if (i === 0) {
                        index = i
                        break
                    } else {
                        index = i - 1
                        break
                    }
                }
            }
            if (index >= 0) {
                setCurrentIndex && setCurrentIndex(index)
                setCurrentRow(data[index])
                if (onSetCurrentRow) onSetCurrentRow(data[index])
                setTimeout(() => {
                    upKey(index)
                }, 50)
            }
        },
        {enabled: inViewport && useUpAndDown},
        [data, currentRow, containerRef.current]
    )
    const upKey = useDebounceFn(
        (index: number) => {
            if (!currentRow) {
                return
            }
            const currentDom = document.getElementById(currentRow[renderKey])
            if (!currentDom) {
                const dom = containerRef.current
                //  Press and Hold Up
                // scrollTo(index) // Slow Scroll
                if (dom) dom.scrollTop = index * defItemHeight //Immediate Scroll
                return
            }
            const currentPosition: tablePosition = currentDom.getBoundingClientRect()
            const top = containerRefPosition.current.top + (containerRefPosition.current.height || 0)
            const inViewport =
                currentPosition.top - 28 <= top && currentPosition.top - 28 >= containerRefPosition.current.top

            if (!inViewport) scrollTo(index)
        },
        {wait: 100, leading: true}
    ).run
    // Use Down Arrow
    useHotkeys(
        "down",
        () => {
            if (!setCurrentRow) return
            const dataLength = data.length
            if (dataLength <= 0) {
                return
            }
            if (!currentRow) {
                setCurrentRow(data[0])
                setCurrentIndex && setCurrentIndex(0)
                if (onSetCurrentRow) onSetCurrentRow(data[0])
                return
            }

            let index
            // If above, select updated content
            for (let i = 0; i < dataLength; i++) {
                if (data[i][renderKey] === currentRow[renderKey]) {
                    if (i === dataLength - 1) {
                        index = i
                        break
                    } else {
                        index = i + 1
                        break
                    }
                }
            }

            if (index) {
                setCurrentRow(data[index])
                setCurrentIndex && setCurrentIndex(index)
                if (onSetCurrentRow) onSetCurrentRow(data[index])
                setTimeout(() => {
                    downKey(index)
                }, 50)
            }
        },
        {enabled: inViewport && useUpAndDown},
        [data, currentRow, containerRef.current]
    )
    const downKey = useDebounceFn(
        (index: number) => {
            if (!currentRow) {
                return
            }
            const dom = containerRef.current
            const currentDom = document.getElementById(currentRow[renderKey])
            if (!currentDom) {
                //  Press and Hold Up
                scrollTo(index)
                // if (dom) dom.scrollTop = index * defItemHeight
                return
            }

            const currentPosition: tablePosition = currentDom.getBoundingClientRect()
            const rowNumber = (containerRef.current.clientHeight - 28) / defItemHeight // 28 Header Height
            const y = 1 - (rowNumber - Math.trunc(rowNumber))
            const top = containerRefPosition.current.top + (containerRefPosition.current.height || 0)
            const inViewport =
                currentPosition.top + 28 <= top && currentPosition.top + 28 >= containerRefPosition.current.top
            if (!inViewport) dom.scrollTop = (index - Math.floor(rowNumber) + y) * defItemHeight + 1 + 6 // 1px border hidden by outer border, +1, scrollbar corner height 6
        },
        {wait: 200, leading: true}
    ).run
    useEffect(() => {
        if (isRightClickBatchOperate) document.addEventListener("mousedown", handleShiftMousedown)
        return () => {
            document.removeEventListener("mousedown", handleShiftMousedown)
        }
    }, [isRightClickBatchOperate])
    useUpdateEffect(() => {
        if (pagination.page == 1 && pagination.total == 0) {
            scrollTo(0)
            setScroll({
                ...scroll,
                scrollBottom: 0
            })
        }
    }, [pagination.page, pagination.total])
    useDeepCompareEffect(() => {
        const newColumns = props.columns.map((ele) => {
            const defColumnItem = columns.find((c) => c.dataKey === ele.dataKey)
            if (!defColumnItem) {
                return ele
            }
            // Keep width of previous columnsItem if columns updated
            return {...ele, width: defColumnItem.width || ele.width}
        })
        setColumns([...newColumns])
        setDefColumns([...newColumns])
    }, [props.columns])
    useDeepCompareEffect(() => {
        getLeftOrRightFixedWidth()
    }, [columns])
    useEffect(() => {
        // if (!width) return
        getTableWidthAndColWidth(0)
    }, [width])
    useEffect(() => {
        getTableRef(containerRef.current)
    }, [containerRef.current])
    useEffect(() => {
        setTimeout(() => {
            if (tableRef.current && tableRef.current.getBoundingClientRect()) {
                tablePosition.current = tableRef.current.getBoundingClientRect()
            }
        }, 200)
    }, [tableRef.current, width])
    useClickAway(() => {
        setSelectedRows([])
        preSelectRef.current = undefined
    }, [wrapperRef])
    // Calculate fixed column widths
    const getLeftOrRightFixedWidth = useMemoizedFn(() => {
        const newColumns: ColumnsTypeProps[] = []
        columns.forEach((l, index) => {
            const ele = {...l}
            if (ele.fixed === "left") {
                if (index > 0) {
                    const leftList = columns
                        .filter((e, i) => i < index && e.fixed === "left")
                        .map((c, n) => {
                            if ((c.minWidth || 0) > (c.width || 0)) {
                                return c.minWidth || 0
                            } else {
                                return c.width || getColWidth()
                            }
                        })
                    const left: number = leftList.length > 1 ? leftList.reduce((p, c) => p + c) : leftList[0] || 0
                    ele.left = left
                }
            }
            if (ele.fixed === "right") {
                if (index > 0) {
                    const rightList = columns
                        .filter((e, i) => i > index && e.fixed === "right")
                        .map((c, n) => {
                            if ((c.minWidth || 0) > (c.width || 0)) {
                                return c.minWidth || 0
                            } else {
                                return c.width || getColWidth()
                            }
                        })
                    const right: number = rightList.length > 1 ? rightList.reduce((p, c) => p + c) : rightList[0] || 0
                    ele.right = right
                }
            }
            newColumns.push(ele)
        })
        setColumns([...newColumns])
    })
    const [colWidth, setColWidth, getColWidth] = useGetState<number>(0)
    // Initialize table and column widths
    const getTableWidthAndColWidth = useMemoizedFn((scrollBarWidth: number) => {
        const cLength = props.columns.length
        if (!width || cLength <= 0) return
        let total: number = 0
        let columnsAllWidth = 0
        defColumns.forEach((item) => {
            if (item.width || item.minWidth) {
                columnsAllWidth += item.width || item.minWidth || 0
                total += 1
            }
        })
        if (columnsAllWidth > width) {
            columnsAllWidth = 0
            total = 0
        }
        let w = (width - columnsAllWidth) / (cLength - total || 1)
        const cw = w - scrollBarWidth / (cLength - total || 1) + 32
        const newColumns = getColumns().map((ele, index) => {
            if (ele.isDefWidth) {
                return {
                    ...ele,
                    width: cw
                }
            }
            if (cLength - total === 0 && index === getColumns().length - 2) {
                // Second to last, extra width added to penultimate column if outer div widens
                return {
                    ...ele,
                    width: (ele.width || cw) + cw
                }
            }
            return {
                ...ele,
                isDefWidth: !ele.width,
                width: ele.width || cw
            }
        })

        setColWidth(cw)
        setColumns([...newColumns])
        // }
        recalculatedTableWidth(scrollBarWidth)
    })
    // Recompute table width after drag
    const recalculatedTableWidth = useMemoizedFn((scrollBarWidth: number, lastColWidth?: boolean) => {
        const cLength = columns.length
        if (cLength <= 0) return
        const tWidth: number = columns.map((ele) => ele.width || ele.minWidth || 0).reduce((p, c) => p + c)
        if (tWidth < width - scrollBarWidth) {
            if (lastColWidth) {
                if (lineIndex > 1) {
                    columns[lineIndex + 1].width =
                        (columns[lineIndex + 1].width || columns[lineIndex - 1].minWidth || 0) + width - tWidth
                } else {
                    // First drag unable to fill table width
                    columns[cLength - 1].width =
                        (columns[cLength - 1].width || columns[cLength - 1].minWidth || 0) + width - tWidth
                }
            }
        }
        setLineIndex(-1)
        setTimeout(() => {
            getLeftOrRightFixedWidth()
        }, 50)
    })
    const onChangeRadio = useMemoizedFn((e: RadioChangeEvent) => {})
    const onChangeCheckbox = useMemoizedFn((checked: boolean) => {
        if (!rowSelection) return
        if (!rowSelection.onSelectAll) return
        if (checked) {
            const keys = data.map((ele, index) => (renderKey ? ele[renderKey] : index))
            rowSelection.onSelectAll(keys, data, checked)
        } else {
            rowSelection.onSelectAll([], [], checked)
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((checked: boolean, key: string, row: T) => {
        if (!rowSelection) return
        if (!rowSelection.onChangeCheckboxSingle) return
        rowSelection.onChangeCheckboxSingle(checked, key, row)
    })

    const onMouseMoveLine = useMemoizedFn((e) => {
        if (!tablePosition.current.left) return
        if (lineIndex < 0) return
        if (!lineLeft) return
        const left = e.clientX - tablePosition.current.left
        const moveLeftX = lineStartX.current - e.clientX
        const changeWidth = (columns[lineIndex].width || 0) - moveLeftX
        if (Math.abs(changeWidth) < (columns[lineIndex].minWidth || 0)) {
            // Minimum drag width not moving
            return
        }
        setLineLeft(left)
    })
    const onMouseDown = useMemoizedFn((e, index: number) => {
        if (!tablePosition.current.left) return
        const left = e.clientX - tablePosition.current.left
        lineStartX.current = e.clientX
        setLineLeft(left)
        setLineIndex(index)
    })

    const onMouseUp = useMemoizedFn((e) => {
        lineEndX.current = e.clientX
        if (!columns[lineIndex]) return
        const minWidth = columns[lineIndex].minWidth || defMinWidth
        const width = columns[lineIndex].width || colWidth
        if (lineStartX.current > lineEndX.current) {
            // Move Left
            const moveLeftX = lineStartX.current - lineEndX.current
            const changeWidth = (minWidth > width ? minWidth : width) - moveLeftX
            if (changeWidth < minWidth) {
                columns[lineIndex].width = minWidth
            } else {
                columns[lineIndex].width = changeWidth
            }
            recalculatedTableWidth(0, true)
        } else {
            // Move Right
            const moveRightX = lineEndX.current - lineStartX.current
            if (lineIndex === columns.length - 2) {
                // Last drag line, last cell
                const lastColumnsWidth = columns[columns.length - 1].width || 0
                const lastColumnsMinWidth = columns[columns.length - 1].minWidth || defMinWidth
                columns[columns.length - 1].width =
                    lastColumnsMinWidth > lastColumnsWidth - moveRightX
                        ? lastColumnsMinWidth
                        : lastColumnsWidth - moveRightX
            }
            columns[lineIndex].width = minWidth > width ? minWidth : width + moveRightX
            recalculatedTableWidth(0)
        }
    })
    const preScrollLeft = useRef<number>(0)
    const preScrollBottom = useRef<number>(0)
    const prePage = useRef<number>(1)
    useScroll(containerRef, (val) => {
        return onScrollContainer()
    })

    const onScrollContainer = useThrottleFn(
        () => {
            if (!containerRef.current) return false
            const {
                scrollTop: contentScrollTop,
                clientHeight,
                scrollHeight,
                scrollWidth,
                scrollLeft,
                clientWidth
            } = containerRef.current
            // const contentScrollTop = dom.scrollTop // Scrollbar Distance from Top
            // const clientHeight = dom.clientHeight // Viewport
            // const scrollHeight = dom.scrollHeight // Scrollbar total height
            const scrollBottom = scrollHeight - contentScrollTop - clientHeight
            const scrollRight = scrollWidth - scrollLeft - clientWidth
            // Performance Optimization
            if (preScrollLeft.current !== scrollLeft) {
                preScrollLeft.current = scrollLeft
                if (scrollLeft < 50 || scrollRight < 50) {
                    setScroll({
                        ...scroll,
                        scrollLeft: scrollLeft,
                        scrollRight: scrollRight
                    })
                }
                return false
            }
            if (preScrollBottom.current !== scrollBottom) {
                if (wrapperRef && containerRef && pagination) {
                    const hasMore = pagination.total == data.length
                    //Avoid frequent set
                    if (scroll.scrollBottom < 50 && scrollBottom > 50) {
                        // Hide No Data
                        setScroll({
                            ...scroll,
                            scrollBottom: scrollBottom
                        })
                    }
                    if (scrollBottom < 50) {
                        //Show No Data
                        setScroll({
                            ...scroll,
                            scrollBottom: scrollBottom
                        })
                    }
                    //Scroll Down
                    if (
                        preScrollBottom.current > scrollBottom &&
                        scrollBottom <= (scrollToBottom || 300) &&
                        !hasMore &&
                        prePage.current != pagination.page
                    ) {
                        prePage.current = Number(pagination.page)
                        pagination.onChange(Number(pagination.page) + 1, pagination.limit)
                    }
                }
                preScrollBottom.current = scrollBottom
            }
            return false
        },
        {
            wait: 200
        }
    ).run
    const preSelectRef = useRef<T>() //Store first target item for Shift+Click
    const onRowClick = useMemoizedFn((record: T, rowIndex: number) => {
        if (preSelectRef.current) {
            // Multi-select, Batch selection
            const startKey = preSelectRef.current[renderKey]
            const endKey = record[renderKey]
            const startKeyIndex = data.findIndex((s) => s[renderKey] === startKey)
            const endKeyIndex = data.findIndex((s) => s[renderKey] === endKey)
            if (startKeyIndex === -1 || endKeyIndex === -1) return
            const max = Math.max(startKeyIndex, endKeyIndex)
            const min = Math.min(startKeyIndex, endKeyIndex)
            const selectList = data.filter((_, index) => index >= min && index <= max)
            setSelectedRows(selectList)
            setCurrentIndex && setCurrentIndex(undefined)
            setCurrentRow(undefined)
            if (onSetCurrentRow) onSetCurrentRow(undefined)
            preSelectRef.current = undefined
        } else {
            setSelectedRows([])
            setCurrentIndex && setCurrentIndex(rowIndex)
            // if (onSetCurrentRow) onSetCurrentRow(record)
            if (props.onRowClick) {
                props.onRowClick(record)
            }
            // Deselect
            if (currentRow && currentRow[renderKey] === record[renderKey]) {
                setCurrentRow(undefined)
                onSetCurrentRow && onSetCurrentRow(undefined)
            } else {
                setCurrentRow(record)
                onSetCurrentRow && onSetCurrentRow(record)
            }
        }
    })

    /**Multi-select with Shift+Click*/
    const handleShiftMousedown = useMemoizedFn((event) => {
        if (event.shiftKey && event.button === 0) {
            preSelectRef.current = currentRow
            //Remove Text Selection
            window?.getSelection()?.removeAllRanges()
        }
    })
    const onRowContextMenu = useMemoizedFn((record: T, e: React.MouseEvent, rowIndex: number) => {
        if ((selectedRows?.length || 0) > 0) {
            const index = selectedRows.findIndex((ele) => ele[renderKey] === record[renderKey])
            // Right-click in multi-select area, if not, clear multi-select and select right-clicked item
            if (index === -1) {
                setSelectedRows([])
                setCurrentIndex && setCurrentIndex(rowIndex)
                setCurrentRow(record)
                if (props.onRowContextMenu) props.onRowContextMenu(record, [], e)
                return
            }
        } else {
            setCurrentIndex && setCurrentIndex(rowIndex)
            setCurrentRow(record)
        }

        if (props.onRowContextMenu) props.onRowContextMenu(record, selectedRows, e)
    })
    const [filters, setFilters] = useState<any>(query || {})
    const [opensPopover, setOpensPopover] = useState<any>({})
    useEffect(() => {
        setFilters(cloneDeep(query))
    }, [query])
    useEffect(() => {
        setFilters({})
        setSort({
            order: "none",
            orderBy: ""
        })
        scrollTo(0)
    }, [isReset])
    const onChangTable = useMemoizedFn(() => {
        if (props.onChange) props.onChange(1, pagination.limit, sort, filters)
    })
    const onSorter = useMemoizedFn((s: SortProps) => {
        let newOrder: "none" | "asc" | "desc" = s.order
        if (sort.orderBy !== s.orderBy) {
            newOrder = "asc"
        } else if (s.order === "asc") {
            newOrder = "desc"
        } else if (s.order === "desc") {
            newOrder = "none"
        } else {
            newOrder = "asc"
        }
        sort.order = newOrder
        sort.orderBy = newOrder === "none" ? "" : s.orderBy
        setSort({...sort})
        if (props.onChange) props.onChange(1, pagination.limit, sort, filters)
    })

    const onSelectSearch = useMemoizedFn((valueSearch: string | string[], colKey: string) => {
        const newFilters = {
            ...filters,
            [colKey]: valueSearch === "all" ? "" : valueSearch
        }
        setFilters({...newFilters})
        // if (props.onChange) props.onChange(1, pagination.limit, sort, newFilters)
    })

    const onDateTimeSearch = useMemoizedFn((dates: [Moment, Moment] | null, colKey: string) => {
        const newFilters = {
            ...filters,
            [colKey]: dates ? [moment(dates[0]).unix(), moment(dates[1]).unix()] : undefined, //Output time as timestamp seconds, antd time component needs milliseconds
            [`${colKey}-time`]: dates ? [moment(dates[0]).valueOf(), moment(dates[1]).valueOf()] : undefined //antd time displayed in timestamp seconds, antd time values in milliseconds
        }
        setFilters({...newFilters})
        // if (props.onChange) props.onChange(1, pagination.limit, sort, newFilters)
    })

    const renderFilterPopover = (
        columnsItem: ColumnsTypeProps,
        filterKey: string,
        filtersType?: "select" | "input" | "dateTime"
    ) => {
        switch (filtersType) {
            case "select":
                return renderSelect(columnsItem, filterKey)
            case "input":
                return renderInput(columnsItem, filterKey)
            case "dateTime":
                return renderDatePicker(columnsItem, filterKey)
            default:
                break
        }
    }

    /**
     * @Search Description
     */
    const renderSelect = useMemoizedFn((columnsItem: ColumnsTypeProps, filterKey: string) => {
        return (
            <SelectSearch
                filterProps={columnsItem?.filterProps}
                originalList={columnsItem?.filterProps?.filters || []}
                onSelect={(v) => onSelectSearch(v, filterKey)}
                value={filters[filterKey]}
                onClose={() => {
                    setOpensPopover({
                        ...opensPopover,
                        [filterKey]: false
                    })
                }}
                onQuery={() => {
                    if (onChangTable) onChangTable()
                }}
            />
        )
    })
    /**
     * @Search Box Description
     */
    const renderInput = useMemoizedFn((columnsItem: ColumnsTypeProps, filterKey: string) => {
        return (
            <div className={styles["input-search"]}>
                <YakitInput
                    allowClear={true}
                    {...columnsItem.filterProps?.filterInputProps}
                    value={filters[filterKey]}
                    onChange={(e) => {
                        setFilters({
                            ...filters,
                            [filterKey]: e.target.value
                        })
                    }}
                />
            </div>
        )
    })
    const onResetDatePicker = useMemoizedFn((filterKey: string) => {
        setFilters({
            ...filters,
            [filterKey]: undefined,
            [`${filterKey}-time`]: undefined
        })
    })
    const onSureDatePicker = useMemoizedFn((filterKey: string) => {
        setOpensPopover({
            ...opensPopover,
            [filterKey]: false
        })
        if (onChangTable) onChangTable()
    })
    const renderDatePicker = useMemoizedFn((columnsItem: ColumnsTypeProps, filterKey: string) => {
        return (
            <>
                <div className={styles["date-time-search"]}>
                    <RangePicker
                        size='small'
                        ranges={{
                            "1 Minute": [moment().subtract(1, "minute"), moment()],
                            "1 Hour": [moment().subtract(1, "hours"), moment()],
                            "1 Day": [moment().subtract(1, "day"), moment()]
                        }}
                        onChange={(time) => {
                            onDateTimeSearch(time as [Moment, Moment] | null, filterKey)
                        }}
                        value={
                            filters[`${filterKey}-time`]
                                ? [moment(filters[`${filterKey}-time`][0]), moment(filters[`${filterKey}-time`][1])]
                                : undefined
                        }
                    />
                    <div className={styles["time-rang"]}>
                        <YakitTag
                            color='info'
                            onClick={() => onDateTimeSearch([moment().subtract(1, "minute"), moment()], filterKey)}
                        >
                            1 Minute
                        </YakitTag>
                        <YakitTag
                            color='info'
                            onClick={() => onDateTimeSearch([moment().subtract(1, "hours"), moment()], filterKey)}
                        >
                            1 Hour
                        </YakitTag>
                        <YakitTag
                            color='info'
                            onClick={() => onDateTimeSearch([moment().subtract(1, "day"), moment()], filterKey)}
                        >
                            1 Day
                        </YakitTag>
                    </div>
                </div>
                <FooterBottom
                    className={styles["date-time-search-footer"]}
                    onReset={() => onResetDatePicker(filterKey)}
                    onSure={() => onSureDatePicker(filterKey)}
                />
            </>
        )
    })

    const renderSort = useMemoizedFn((sorterKey: string) => (
        <div
            className={classNames(styles["virtual-table-sorter"], {
                [styles["virtual-table-sorter-active"]]:
                    sort.orderBy === sorterKey && (sort.order === "desc" || sort.order === "asc")
            })}
        >
            {sort.order === "desc" ? <SorterDownIcon /> : <SorterUpIcon />}
        </div>
    ))

    useEffect(() => {
        const popoverKeys = Object.keys(opensPopover)
        if (popoverKeys.length > 0 && popoverKeys.filter((key) => opensPopover[key]).length === 0) {
            if (onChangTable) onChangTable()
        }
    }, [opensPopover])

    const [mouseCellId, setMouseCellId] = useState<string | number>()

    const onMouseEnterCell = useMemoizedFn((id: string | number) => {
        setMouseCellId(id)
    })
    const oMouseLeaveCell = useMemoizedFn(() => {
        setMouseCellId(undefined)
    })

    const moveRow = useMemoizedFn((dragIndex: number, hoverIndex: number) => {
        if (onMoveRow) onMoveRow(dragIndex, hoverIndex)
    })
    const moveRowEnd = useMemoizedFn(() => {
        if (onMoveRowEnd) onMoveRowEnd()
    })

    return (
        <div
            className={classNames(styles["virtual-table"])}
            ref={tableRef}
            tabIndex={-1}
            onMouseMove={(e) => onMouseMoveLine(e)}
        >
            <ReactResizeDetector
                onResize={(w, h) => {
                    if (!w || !h) {
                        return
                    }
                    onScrollContainer()
                    setWidth(w)
                    setHeight(h)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            {isShowTitle && (
                <>
                    {renderTitle ? (
                        renderTitle
                    ) : (
                        <div className={classNames(styles["virtual-table-heard"])}>
                            <div className={classNames(styles["virtual-table-heard-left"])}>
                                {title && typeof title === "string" && (
                                    <div className={classNames(styles["virtual-table-heard-title"])}>{title}</div>
                                )}
                                {title && React.isValidElement(title) && title}
                                {props.isShowTotal && pagination?.total>=0 && (
                                    <div className={styles["virtual-table-heard-right"]}>
                                        <div className={styles["virtual-table-heard-right-item"]}>
                                            <span className={styles["virtual-table-heard-right-text"]}>Total</span>
                                            <span className={styles["virtual-table-heard-right-number"]}>
                                                {pagination?.total || 0}
                                            </span>
                                        </div>
                                        <Divider type='vertical' />
                                        <div className={styles["virtual-table-heard-right-item"]}>
                                            <span className={styles["virtual-table-heard-right-text"]}>Selected</span>
                                            <span className={styles["virtual-table-heard-right-number"]}>
                                                {rowSelection?.isAll
                                                    ? pagination?.total || 0
                                                    : rowSelection?.selectedRowKeys?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {extra && React.isValidElement(extra) && (
                                <div className={classNames(styles["virtual-table-heard-right"])}>{extra}</div>
                            )}
                        </div>
                    )}
                </>
            )}
            {(width === 0 && <Spin spinning={true} tip='Loading...'></Spin>) || (
                <Spin spinning={loading !== undefined ? loading && pagination?.page == 1 : false}>
                    <div
                        className={classNames(styles["virtual-table-body"])}
                        style={{
                            maxHeight:
                                ((renderTitle || title || extra) &&
                                    isShowTitle &&
                                    `calc(100% - ${titleHeight ? titleHeight : 42}px)`) ||
                                "100%"
                        }}
                    >
                        {enableDrag && lineIndex > -1 && (
                            <div
                                className={classNames(styles["drag-line"])}
                                style={{left: lineLeft}}
                                onMouseUp={(e) => onMouseUp(e)}
                            />
                        )}
                        <div
                            ref={containerRef}
                            className={classNames(
                                styles["virtual-table-list-container"],
                                {
                                    [styles["virtual-table-container-none-select"]]: lineIndex > -1
                                },
                                containerClassName
                            )}
                        >
                            <div ref={columnsRef} className={classNames(styles["virtual-table-col"])}>
                                {columns.map((columnsItem, cIndex) => (
                                    <ColumnsItemRender
                                        key={`${columnsItem.dataKey}-title`}
                                        columnsItem={columnsItem}
                                        colWidth={colWidth}
                                        scroll={scroll}
                                        rowSelection={rowSelection as RowSelectionProps<any>}
                                        cIndex={cIndex}
                                        onChangeCheckbox={onChangeCheckbox}
                                        // isAll={list.length > 0 && rowSelection?.selectedRowKeys?.length === data.length}
                                        isAll={
                                            rowSelection?.isAll ||
                                            (list.length > 0 && rowSelection?.selectedRowKeys?.length === data.length)
                                        }
                                        disableSorting={disableSorting}
                                        sort={sort}
                                        onSorter={onSorter}
                                        renderSort={renderSort}
                                        setOpensPopover={setOpensPopover}
                                        opensPopover={opensPopover}
                                        onChangTable={onChangTable}
                                        renderFilterPopover={renderFilterPopover}
                                        filters={filters}
                                        enableDrag={enableDrag}
                                        columns={columns}
                                        onMouseDown={onMouseDown}
                                        height={height}
                                        setHoverLine={setHoverLine}
                                        hoverLine={hoverLine}
                                        size={size}
                                    />
                                ))}
                            </div>
                            {/* <DndProvider backend={HTML5Backend}> */}
                            <div ref={wrapperRef} className={classNames(styles["virtual-table-list"])}>
                                {columns.map((columnsItem, index) => (
                                    <ColRender
                                        colIndex={index}
                                        currentRow={currentRow}
                                        selectedRows={selectedRows}
                                        key={`${columnsItem.dataKey}-${index}` || index}
                                        columnsItem={columnsItem}
                                        list={list}
                                        colWidth={colWidth}
                                        renderKey={renderKey}
                                        isLastItem={index === columns.length - 1}
                                        onRowClick={onRowClick}
                                        onRowContextMenu={(data, e, rowIndex) => {
                                            onRowContextMenu(data, e, rowIndex)
                                        }}
                                        rowSelection={rowSelection as any}
                                        onChangeCheckboxSingle={onChangeCheckboxSingle}
                                        scroll={scroll}
                                        setMouseEnter={onMouseEnterCell}
                                        setMouseLeave={oMouseLeaveCell}
                                        mouseCellId={mouseCellId}
                                        moveRow={moveRow}
                                        width={width}
                                        enableDragSort={enableDragSort}
                                        moveRowEnd={moveRowEnd}
                                        size={size}
                                        checkboxPropsMap={checkboxPropsMap}
                                    />
                                ))}
                            </div>
                            {/* </DndProvider> */}
                        </div>
                        <div
                            className={classNames(styles["virtual-table-list-pagination"])}
                            style={{display: scroll.scrollBottom <= 10 ? "" : "none"}}
                        >
                            {loading && !(pagination?.total == data.length) && (
                                <div className={classNames(styles["pagination-loading"])}>
                                    <LoadingOutlined />
                                </div>
                            )}
                            {!loading && pagination?.total == data.length && (pagination?.page || 0) > 0 && (
                                <div
                                    className={classNames(styles["pagination-text"], {
                                        [styles["pagination-text-show"]]: scroll.scrollBottom < 10 || list.length === 0
                                    })}
                                >
                                    No More Data
                                </div>
                            )}
                        </div>
                    </div>
                </Spin>
            )}
        </div>
    )
}

interface ColumnsItemRenderProps {
    columnsItem: ColumnsTypeProps
    colWidth: number
    scroll: ScrollProps
    rowSelection: RowSelectionProps<any>
    cIndex: number
    onChangeCheckbox: (checked: boolean) => void
    isAll: boolean
    disableSorting?: boolean
    sort: SortProps
    onSorter: (s: SortProps) => void
    renderSort: (sorterKey: string) => ReactNode
    setOpensPopover: (a: any) => void
    opensPopover: any
    onChangTable: () => void
    renderFilterPopover: (
        columnsItem: ColumnsTypeProps,
        filterKey: string,
        filtersType?: "select" | "input" | "dateTime"
    ) => ReactNode
    filters: any
    enableDrag?: boolean
    columns: ColumnsTypeProps[]
    onMouseDown: (e: any, index: number) => void
    height: number
    hoverLine: boolean
    setHoverLine: (b: boolean) => void
    size: "small" | "middle" | "large"
}
const ColumnsItemRender = React.memo((props: ColumnsItemRenderProps) => {
    const {
        columnsItem,
        colWidth,
        scroll,
        rowSelection,
        cIndex,
        isAll,
        onChangeCheckbox,
        disableSorting,
        sort,
        onSorter,
        renderSort,
        setOpensPopover,
        opensPopover,
        onChangTable,
        renderFilterPopover,
        filters,
        enableDrag,
        columns,
        onMouseDown,
        height,
        setHoverLine,
        hoverLine,
        size
    } = props
    const filterKey = columnsItem?.filterProps?.filterKey || columnsItem.dataKey
    const sorterKey = columnsItem?.sorterProps?.sorterKey || columnsItem.dataKey

    return (
        <div
            key={`${columnsItem.dataKey}-title`}
            className={classNames(styles["virtual-table-title"], {
                [styles["virtual-table-title-middle"]]: size === "middle",
                [styles["virtual-table-row-left"]]: columnsItem.align === "left",
                [styles["virtual-table-row-center"]]: columnsItem.align === "center",
                [styles["virtual-table-row-right"]]: columnsItem.align === "right",
                [styles["virtual-table-title-fixed-right"]]: columnsItem.fixed === "right",
                [styles["virtual-table-title-fixed-right-left-0"]]:
                    columnsItem.fixed === "right" && scroll.scrollRight <= 1,
                [styles["virtual-table-title-fixed-left"]]: columnsItem.fixed === "left",
                [styles["virtual-table-title-fixed-left-box-show-none"]]:
                    columnsItem.fixed === "left" && scroll.scrollLeft <= 0
            })}
            style={{
                width: columnsItem.width || colWidth,
                ...(columnsItem.fixed === "left" &&
                    scroll.scrollLeft > 0 && {
                        left: columnsItem.left
                    }),
                ...(columnsItem.fixed === "right" && {
                    right: columnsItem.right
                })
            }}
        >
            <div className={classNames(styles["justify-content-between"])}>
                <div className={styles["virtual-title"]}>
                    {/* Don't use module for minimum drag width*/}
                    <div className='virtual-col-title' style={{width: "100%", display: "flex", alignItems: "center"}}>
                        {cIndex === 0 && rowSelection && rowSelection?.isShowAll !== false && (
                            <>
                                {rowSelection.type !== "radio" && (
                                    <YakitProtoCheckbox
                                        checked={isAll}
                                        indeterminate={!isAll && (rowSelection?.selectedRowKeys?.length || 0) > 0}
                                        onChange={(e) => {
                                            onChangeCheckbox(e.target.checked)
                                        }}
                                        wrapperClassName={styles["check"]}
                                    />
                                )}
                            </>
                        )}
                        <div className={styles["ellipsis-1"]} style={{maxWidth: "90%"}}>
                            {columnsItem.title}
                        </div>
                    </div>
                    {columnsItem.tip && (
                        <Tooltip title={columnsItem.tip}>
                            <QuestionMarkCircleIcon className={styles["icon-question"]} />
                        </Tooltip>
                    )}
                </div>
                <div className={styles["virtual-table-title-icon"]}>
                    {columnsItem.beforeIconExtra}
                    {columnsItem.sorterProps?.sorter && (
                        <>
                            {disableSorting ? (
                                <div className={classNames(styles["virtual-table-sorter-disable"])}>
                                    <DisableSorterIcon />
                                </div>
                            ) : (
                                <div
                                    onClick={() =>
                                        onSorter({
                                            orderBy: sorterKey,
                                            order: sort.order
                                        })
                                    }
                                >
                                    {renderSort(sorterKey)}
                                </div>
                            )}
                        </>
                    )}
                    {columnsItem?.filterProps && (
                        <>
                            <Popover
                                placement='bottom'
                                trigger='click'
                                content={
                                    <div className={styles["popover-content"]}>
                                        {columnsItem?.filterProps?.filterRender
                                            ? columnsItem?.filterProps?.filterRender(() => {
                                                  setOpensPopover({
                                                      ...opensPopover,
                                                      [filterKey]: false
                                                  })
                                              })
                                            : renderFilterPopover(
                                                  columnsItem,
                                                  filterKey,
                                                  columnsItem?.filterProps?.filtersType
                                              )}
                                    </div>
                                }
                                overlayClassName={styles["search-popover"]}
                                visible={opensPopover[filterKey]}
                                onVisibleChange={(v) => {
                                    setOpensPopover({
                                        ...opensPopover,
                                        [filterKey]: v
                                    })
                                }}
                            >
                                <div
                                    className={classNames(styles["virtual-table-filter"], {
                                        [styles["virtual-table-filter-value"]]: columnsItem.filterProps.filterMultiple
                                            ? filters[filterKey] && filters[filterKey].length > 0
                                            : filters[filterKey] &&
                                              filters[filterKey] !==
                                                  (columnsItem.filterProps.filtersSelectAll?.textAll || "all")
                                    })}
                                    onClick={() => {
                                        setOpensPopover({
                                            ...opensPopover,
                                            [filterKey]: !opensPopover[filterKey]
                                        })
                                    }}
                                >
                                    {columnsItem.filterProps.filterIcon ? (
                                        columnsItem.filterProps.filterIcon
                                    ) : (
                                        <FilterIcon />
                                    )}
                                </div>
                            </Popover>
                        </>
                    )}
                    {columnsItem.afterIconExtra}
                    {/* {columnsItem.extra} */}
                </div>
                {enableDrag && columnsItem.enableDrag !== false && cIndex < columns.length - 1 && (
                    <div
                        className={classNames(styles["virtual-table-title-drag"])}
                        style={{height: hoverLine ? height : 28}}
                        onMouseEnter={() => setHoverLine(true)}
                        onMouseLeave={() => setHoverLine(false)}
                        onMouseDown={(e) => onMouseDown(e, cIndex)}
                    />
                )}
            </div>
        </div>
    )
})
interface ColRenderProps {
    colIndex: number
    columnsItem: ColumnsTypeProps
    colWidth: number
    list: {data: any; index: number}[]
    renderKey: string
    isLastItem: boolean
    onRowClick: (r: any, rowIndex: number) => void
    onRowContextMenu: (r: any, e: any, rowIndex: number) => void
    currentRow: any
    selectedRows?: any[]
    rowSelection: RowSelectionProps<any>
    onChangeCheckboxSingle: (checked: boolean, key: string, row: any) => void
    scroll: ScrollProps
    setMouseEnter: (a: any) => void
    setMouseLeave: () => void
    mouseCellId?: string | number
    moveRow?: (dragIndex: number, hoverIndex: number) => void
    width: number
    enableDragSort?: boolean
    moveRowEnd?: () => void
    size: "small" | "middle" | "large"
    checkboxPropsMap: Map<React.Key, Partial<YakitProtoCheckboxProps>>
}
const ColRender = React.memo((props: ColRenderProps) => {
    const {
        columnsItem,
        colWidth,
        list,
        renderKey,
        isLastItem,
        onRowClick,
        onRowContextMenu,
        currentRow,
        selectedRows,
        colIndex,
        rowSelection,
        onChangeCheckboxSingle,
        scroll,
        setMouseEnter,
        setMouseLeave,
        mouseCellId,
        moveRow,
        width,
        enableDragSort,
        moveRowEnd,
        size,
        checkboxPropsMap
    } = props

    return (
        <div
            className={classNames(styles["virtual-table-row-content"], {
                [styles["virtual-table-row-fixed-left"]]: columnsItem.fixed === "left",
                [styles["virtual-table-row-fixed-left-box-show-none"]]:
                    columnsItem.fixed === "left" && scroll.scrollLeft <= 0,
                [styles["virtual-table-row-fixed-right"]]: columnsItem.fixed === "right",
                [styles["virtual-table-row-fixed-right-left-0"]]:
                    columnsItem.fixed === "right" && scroll.scrollRight <= 1,
                [styles["virtual-table-row-center"]]: columnsItem.align === "center",
                [styles["virtual-table-row-right"]]: columnsItem.align === "right"
            })}
            style={{
                width: columnsItem.width || colWidth,
                ...(columnsItem.fixed === "left" && {
                    left: columnsItem.left
                }),
                ...(columnsItem.fixed === "right" && {
                    right: columnsItem.right
                })
            }}
        >
            {list.length !== 0 &&
                list.map((item, number) => {
                    return (
                        <React.Fragment key={`${item.data[renderKey]}-${colIndex}` || number}>
                            {(colIndex === 0 && (
                                <CellRenderDrop
                                    colIndex={colIndex}
                                    key={`${item.data[renderKey]}-${colIndex}` || number}
                                    item={item}
                                    columnsItem={columnsItem}
                                    number={item.index}
                                    isLastItem={isLastItem}
                                    onRowClick={() => onRowClick(item.data, item.index)}
                                    onRowContextMenu={(e) => onRowContextMenu(item.data, e, item.index)}
                                    currentRow={currentRow}
                                    selectedRows={selectedRows}
                                    // isSelect={currentRow && currentRow[renderKey] === item.data[renderKey]}
                                    renderKey={renderKey}
                                    rowSelection={rowSelection}
                                    onChangeCheckboxSingle={onChangeCheckboxSingle}
                                    setMouseEnter={setMouseEnter}
                                    setMouseLeave={setMouseLeave}
                                    mouseCellId={mouseCellId}
                                    moveRow={moveRow}
                                    width={width}
                                    enableDragSort={enableDragSort}
                                    moveRowEnd={moveRowEnd}
                                    size={size}
                                    checkboxPropsMap={checkboxPropsMap}
                                />
                            )) || (
                                <CellRender
                                    colIndex={colIndex}
                                    key={`${item.data[renderKey]}-${colIndex}` || number}
                                    item={item}
                                    columnsItem={columnsItem}
                                    number={item.index}
                                    isLastItem={isLastItem}
                                    onRowClick={() => onRowClick(item.data, item.index)}
                                    onRowContextMenu={(e) => onRowContextMenu(item.data, e, item.index)}
                                    currentRow={currentRow}
                                    selectedRows={selectedRows}
                                    // isSelect={currentRow && currentRow[renderKey] === item.data[renderKey]}
                                    renderKey={renderKey}
                                    rowSelection={rowSelection}
                                    onChangeCheckboxSingle={onChangeCheckboxSingle}
                                    setMouseEnter={setMouseEnter}
                                    setMouseLeave={setMouseLeave}
                                    mouseCellId={mouseCellId}
                                    size={size}
                                />
                            )}
                        </React.Fragment>
                    )
                })}
        </div>
    )
})

interface CellRenderProps {
    colIndex: number
    item: {data: any; index: number}
    columnsItem: ColumnsTypeProps
    number: number
    isLastItem: boolean
    onRowClick: () => void
    onRowContextMenu: (e: any) => void
    currentRow: any
    selectedRows?: any[]
    // isSelect: boolean
    renderKey: string
    rowSelection: RowSelectionProps<any>
    onChangeCheckboxSingle: (checked: boolean, key: string, row: any) => void
    setMouseEnter: (a: any) => void
    setMouseLeave: () => void
    mouseCellId?: string | number
    moveRow?: (dragIndex: number, hoverIndex: number) => void
    width?: number
    enableDragSort?: boolean
    moveRowEnd?: () => void
    size: "small" | "middle" | "large"
}
const CellRender = React.memo(
    (props: CellRenderProps) => {
        const {
            item,
            columnsItem,
            number,
            isLastItem,
            onRowClick,
            onRowContextMenu,
            // isSelect,
            colIndex,
            renderKey,
            rowSelection,
            onChangeCheckboxSingle,
            setMouseEnter,
            setMouseLeave,
            mouseCellId,
            size,
            currentRow,
            selectedRows
        } = props
        const isSelect = useCreation(() => {
            return currentRow && currentRow[renderKey] === item.data[renderKey]
        }, [currentRow])
        const batchActive = useCreation(() => {
            if ((selectedRows?.length || 0) > 0) {
                return selectedRows?.findIndex((i) => i[renderKey] === item.data[renderKey]) !== -1
            }
            return false
        }, [selectedRows])

        const rowBgColorFlagFun = (color: string) => {
            return item.data["cellClassName"] && item.data["cellClassName"].indexOf(`color-opacity-bg-${color}`) !== -1
        }
        return (
            <div
                className={classNames(styles["virtual-table-row-cell"], item.data["cellClassName"], {
                    [styles["virtual-table-row-cell-middle"]]: size === "middle",
                    [styles["virtual-table-active-row"]]: isSelect,
                    [styles["virtual-table-active-row-red"]]: isSelect && rowBgColorFlagFun("red"),
                    [styles["virtual-table-active-row-green"]]: isSelect && rowBgColorFlagFun("green"),
                    [styles["virtual-table-active-row-blue"]]: isSelect && rowBgColorFlagFun("blue"),
                    [styles["virtual-table-active-row-yellow"]]: isSelect && rowBgColorFlagFun("yellow"),
                    [styles["virtual-table-active-row-orange"]]: isSelect && rowBgColorFlagFun("orange"),
                    [styles["virtual-table-active-row-purple"]]: isSelect && rowBgColorFlagFun("purple"),
                    [styles["virtual-table-active-row-lakeBlue"]]: isSelect && rowBgColorFlagFun("lakeBlue"),
                    [styles["virtual-table-active-row-cyan"]]: isSelect && rowBgColorFlagFun("cyan"),
                    [styles["virtual-table-active-row-bluePurple"]]: isSelect && rowBgColorFlagFun("bluePurple"),
                    [styles["virtual-table-active-row-grey"]]: isSelect && rowBgColorFlagFun("grey"),
                    [styles["virtual-table-batch-active-row"]]: batchActive,
                    [styles["virtual-table-hover-row"]]: mouseCellId === item.data[renderKey],
                    [styles["virtual-table-hover-row-red"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("red"),
                    [styles["virtual-table-hover-row-green"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("green"),
                    [styles["virtual-table-hover-row-blue"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("blue"),
                    [styles["virtual-table-hover-row-yellow"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("yellow"),
                    [styles["virtual-table-hover-row-orange"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("orange"),
                    [styles["virtual-table-hover-row-purple"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("purple"),
                    [styles["virtual-table-hover-row-lakeBlue"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("lakeBlue"),
                    [styles["virtual-table-hover-row-cyan"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("cyan"),
                    [styles["virtual-table-hover-row-bluePurple"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("bluePurple"),
                    [styles["virtual-table-hover-row-grey"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("grey"),
                    [styles["virtual-table-row-cell-border-right-0"]]: isLastItem,
                    [styles["virtual-table-row-cell-border-right-1"]]: (batchActive || isSelect) && isLastItem,
                    [styles["virtual-table-row-cell-border-left-1"]]: (batchActive || isSelect) && colIndex === 0,
                    [styles["virtual-table-row-cell-disabled"]]: item.data["disabled"] || item.data["Disabled"]
                })}
                onClick={(e) => {
                    // @ts-ignore
                    if (e.target.nodeName === "INPUT") return
                    onRowClick()
                }}
                onContextMenu={(e) => {
                    onRowContextMenu(e)
                }}
                id={(isSelect && colIndex === 0 && item.data[renderKey]) || ""}
                onMouseEnter={() => {
                    setMouseEnter(item.data[renderKey])
                }}
                onMouseLeave={() => {
                    setMouseLeave()
                }}
            >
                {colIndex === 0 && rowSelection && (
                    <span className={classNames(styles["check"])}>
                        {rowSelection.type !== "radio" && (
                            <YakitProtoCheckbox
                                onChange={(e) => {
                                    onChangeCheckboxSingle(
                                        e.target.checked,
                                        renderKey ? item.data[renderKey] : number,
                                        item.data
                                    )
                                }}
                                checked={
                                    rowSelection?.selectedRowKeys?.findIndex(
                                        (ele) => ele === (renderKey ? item.data[renderKey] : number)
                                    ) !== -1
                                }
                                disabled={item.data["disabled"] || item.data["Disabled"]}
                            />
                        )}
                    </span>
                )}
                <div
                    className={classNames({
                        [styles["virtual-table-row-ellipsis"]]: columnsItem.ellipsis === false ? false : true,
                        [styles["virtual-table-row-no-ellipsis"]]: columnsItem.ellipsis === false ? true : false
                    })}
                >
                    {columnsItem.render
                        ? columnsItem.render(item.data[columnsItem.dataKey], item.data, number)
                        : item.data[columnsItem.dataKey] || "-"}
                </div>
            </div>
        )
    },
    (preProps, nextProps) => {
        // return true; 	Do Not Render
        // return false;	Render

        // if (preProps.isSelect !== nextProps.isSelect) {
        //     return false
        // }
        if (preProps.currentRow !== nextProps.currentRow || preProps.selectedRows !== nextProps.selectedRows) {
            return false
        }
        if (preProps.rowSelection?.selectedRowKeys !== nextProps.rowSelection?.selectedRowKeys) {
            return false
        }
        if (preProps.mouseCellId !== nextProps.mouseCellId) {
            return false
        }
        if (preProps.item.data !== nextProps.item.data) {
            return false
        }
        return true
    }
)
interface CellRenderDropProps extends CellRenderProps {
    checkboxPropsMap: Map<React.Key, Partial<YakitProtoCheckboxProps>>
}
const CellRenderDrop = React.memo(
    (props: CellRenderDropProps) => {
        const {
            item,
            columnsItem,
            number,
            isLastItem,
            onRowClick,
            onRowContextMenu,
            // isSelect,
            colIndex,
            renderKey,
            rowSelection,
            onChangeCheckboxSingle,
            setMouseEnter,
            setMouseLeave,
            mouseCellId,
            moveRow,
            width,
            enableDragSort,
            moveRowEnd,
            size,
            currentRow,
            selectedRows,
            checkboxPropsMap
        } = props
        const dragRef = useRef<any>()

        const [{handlerId}, drop] = useDrop<DragItem, void, {handlerId: Identifier | null}>(
            {
                accept: "row",
                collect(monitor) {
                    return {
                        handlerId: monitor.getHandlerId()
                    }
                },
                hover(item: DragItem, monitor) {
                    if (!dragRef.current) {
                        return
                    }
                    const dragIndex = item.index
                    const hoverIndex = number || 0

                    // Don't replace items with themselves
                    if (dragIndex === hoverIndex) {
                        return
                    }

                    // Determine rectangle on screen
                    const hoverBoundingRect = dragRef.current?.getBoundingClientRect()

                    // Get vertical middle
                    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

                    // Determine mouse position
                    const clientOffset = monitor.getClientOffset()

                    // Get pixels to the top
                    const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top

                    // Dragging downwards
                    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                        return
                    }

                    // Dragging upwards
                    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                        return
                    }
                    if (moveRow) moveRow(dragIndex, hoverIndex)
                    item.index = hoverIndex
                }
            },
            [number]
        )
        const [{isDragging}, drag] = useDrag(
            {
                type: "row",
                item: () => {
                    return {id: item.data[renderKey], index: number}
                },
                collect: (monitor: any) => ({
                    isDragging: monitor.isDragging()
                })
            },
            [number]
        )
        useUpdateEffect(() => {
            if (isDragging) return
            if (moveRowEnd) moveRowEnd()
        }, [isDragging, number])
        drag(drop(dragRef))

        const styleDrag =
            (enableDragSort &&
                isDragging && {
                    width
                }) ||
            {}
        const isSelect = useCreation(() => {
            return currentRow && currentRow[renderKey] === item.data[renderKey]
        }, [currentRow])
        const batchActive = useCreation(() => {
            if ((selectedRows?.length || 0) > 0) {
                return selectedRows?.findIndex((i) => i[renderKey] === item.data[renderKey]) !== -1
            }
            return false
        }, [selectedRows])

        const rowBgColorFlagFun = (color: string) => {
            return item.data["cellClassName"] && item.data["cellClassName"].indexOf(`color-opacity-bg-${color}`) !== -1
        }
        const checkboxProps: YakitProtoCheckboxProps = useCreation(() => {
            return checkboxPropsMap.get(item.data[renderKey]) || {}
        }, [checkboxPropsMap])
        return (
            <div
                data-handler-id={handlerId}
                className={classNames(styles["virtual-table-row-cell"], item.data["cellClassName"], {
                    [styles["virtual-table-row-cell-middle"]]: size === "middle",
                    [styles["virtual-table-active-row"]]: isSelect,
                    [styles["virtual-table-active-row-red"]]: isSelect && rowBgColorFlagFun("red"),
                    [styles["virtual-table-active-row-green"]]: isSelect && rowBgColorFlagFun("green"),
                    [styles["virtual-table-active-row-blue"]]: isSelect && rowBgColorFlagFun("blue"),
                    [styles["virtual-table-active-row-yellow"]]: isSelect && rowBgColorFlagFun("yellow"),
                    [styles["virtual-table-active-row-orange"]]: isSelect && rowBgColorFlagFun("orange"),
                    [styles["virtual-table-active-row-purple"]]: isSelect && rowBgColorFlagFun("purple"),
                    [styles["virtual-table-active-row-lakeBlue"]]: isSelect && rowBgColorFlagFun("lakeBlue"),
                    [styles["virtual-table-active-row-cyan"]]: isSelect && rowBgColorFlagFun("cyan"),
                    [styles["virtual-table-active-row-bluePurple"]]: isSelect && rowBgColorFlagFun("bluePurple"),
                    [styles["virtual-table-active-row-grey"]]: isSelect && rowBgColorFlagFun("grey"),
                    [styles["virtual-table-batch-active-row"]]: batchActive,
                    [styles["virtual-table-hover-row"]]: mouseCellId === item.data[renderKey],
                    [styles["virtual-table-hover-row-red"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("red"),
                    [styles["virtual-table-hover-row-green"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("green"),
                    [styles["virtual-table-hover-row-blue"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("blue"),
                    [styles["virtual-table-hover-row-yellow"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("yellow"),
                    [styles["virtual-table-hover-row-orange"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("orange"),
                    [styles["virtual-table-hover-row-purple"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("purple"),
                    [styles["virtual-table-hover-row-lakeBlue"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("lakeBlue"),
                    [styles["virtual-table-hover-row-cyan"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("cyan"),
                    [styles["virtual-table-hover-row-bluePurple"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("bluePurple"),
                    [styles["virtual-table-hover-row-grey"]]:
                        mouseCellId === item.data[renderKey] && rowBgColorFlagFun("grey"),
                    [styles["virtual-table-row-cell-border-right-0"]]: isLastItem,
                    [styles["virtual-table-row-cell-border-right-1"]]: (batchActive || isSelect) && isLastItem,
                    [styles["virtual-table-row-cell-border-left-1"]]: (batchActive || isSelect) && colIndex === 0,
                    [styles["virtual-table-row-cell-disabled"]]: item.data["disabled"] || item.data["Disabled"],
                    [styles["virtual-table-row-cell-move"]]: enableDragSort && colIndex === 0
                })}
                onClick={(e) => {
                    // @ts-ignore
                    if (e.target.nodeName === "INPUT") return
                    onRowClick()
                }}
                onContextMenu={(e) => {
                    onRowContextMenu(e)
                }}
                id={(isSelect && colIndex === 0 && item.data[renderKey]) || ""}
                onMouseEnter={() => {
                    setMouseEnter(item.data[renderKey])
                }}
                onMouseLeave={() => {
                    setMouseLeave()
                }}
                ref={enableDragSort ? dragRef : null}
                onDragStart={() => {
                    onRowClick()
                }}
            >
                {enableDragSort && isDragging && (
                    <div
                        className={classNames({
                            [styles["virtual-table-row-cell-isDragging"]]: isDragging
                        })}
                        style={{height: 28, left: 0, position: "absolute", ...styleDrag}}
                    />
                )}
                {enableDragSort && colIndex === 0 && (
                    <DragSortIcon
                        className={classNames(styles["drag-sort-icon"], {
                            [styles["drag-sort-icon-active"]]: isSelect || isDragging
                        })}
                    />
                )}
                {colIndex === 0 && rowSelection && (
                    <span className={classNames(styles["check"])}>
                        {rowSelection.type !== "radio" && (
                            <YakitProtoCheckbox
                                onChange={(e) => {
                                    onChangeCheckboxSingle(
                                        e.target.checked,
                                        renderKey ? item.data[renderKey] : number,
                                        item.data
                                    )
                                }}
                                checked={
                                    rowSelection?.selectedRowKeys?.findIndex(
                                        (ele) => ele === (renderKey ? item.data[renderKey] : number)
                                    ) !== -1
                                }
                                disabled={item.data["disabled"] || item.data["Disabled"]}
                                {...checkboxProps}
                            />
                        )}
                    </span>
                )}
                <div
                    className={classNames({
                        [styles["virtual-table-row-ellipsis"]]: columnsItem.ellipsis === false ? false : true,
                        [styles["virtual-table-row-no-ellipsis"]]: columnsItem.ellipsis === false ? true : false
                    })}
                >
                    {columnsItem.render
                        ? columnsItem.render(item.data[columnsItem.dataKey], item.data, number)
                        : item.data[columnsItem.dataKey] || "-"}
                </div>
            </div>
        )
    },
    (preProps, nextProps) => {
        // return true; 	Do Not Render
        // return false;	Render
        // if (preProps.isSelect !== nextProps.isSelect) {
        //     return false
        // }
        if (preProps.currentRow !== nextProps.currentRow || preProps.selectedRows !== nextProps.selectedRows) {
            return false
        }
        if (preProps.rowSelection?.selectedRowKeys !== nextProps.rowSelection?.selectedRowKeys) {
            return false
        }
        if (preProps.mouseCellId !== nextProps.mouseCellId) {
            return false
        }
        if (preProps.item.data !== nextProps.item.data) {
            return false
        }
        return true
    }
)
/**
 * @Description: Props of table, parent of virtual table must set height
 * @ref: Scrollbar's div element returned
 * @title: Table top title, left. Type: string | ReactNode
 * @extra: Table top title, right. Type: ReactNode
 * @renderTitle: Custom table top title. Type: ReactNode
 * @titleHeight: Custom top height if using renderTitle, pass in height or virtual scroll might break. Type: ReactNode
 * @data: Array, Type: T[]
 * @renderKey: Unique key per row, Type: string
 * @columns: Column Params, Type: ColumnsTypeProps[]
 * @rowSelection: Multi-select/Single select mode, currently supports multi-select. Type: RowSelectionProps<T>
 * @enableDrag:true, draggable between columns except last. Can set individually in columns. Type: boolean
 * @onRowClick: Left-click row event, returns selected row data. Type: (record: T) => void
 * @onRowContextMenu: Right-click row event, returns selected row data and e, Type: (record: T, e: React.MouseEvent)) => void
 * @pagination: Pagination settings. Type: PaginationProps
 * @onChange: Query condition change. Type: (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => void
 * @loading: Loading state. Type: boolean
 * @scrollToBottom: Load next page px from bottom, default 300 Type: number
 * @isReset: Reset table conditions, scroll to 0. Type: boolean
 * @isShowTotal: Display built-in total; true shows, false hides. Type: boolean
 * @currentIndex: Current row index. Type: number
 * @isRefresh: boolean, Refresh table, scroll to 0
 * @disableSorting: boolean, Sorting disabled
 * @Query: Search conditions
 * @property {boolean}  isRightClickBatchOperate, Batch operation with right-click, supports Shift + Left Click
 * @return {*}
 */
export const TableVirtualResize = React.forwardRef(TableVirtualResizeFunction) as <T>(
    props: TableVirtualResizeProps<T> & {ref?: React.ForwardedRef<HTMLUListElement>}
) => ReturnType<typeof TableVirtualResizeFunction>

export const SelectSearch: React.FC<SelectSearchProps> = React.memo((props) => {
    const {originalList, onSelect, value, filterProps, onClose, onQuery} = props
    const {
        filterOptionRender,
        filtersSelectAll,
        filterMultiple,
        filterSearch,
        filterSearchInputProps = {},
        filterMultipleProps = {}
    } = filterProps || {}

    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const scrollDomRef = useRef<any>(null)
    const selectRef = useRef<any>(null)

    const [data, setData] = useState<FiltersItemProps[]>(originalList)
    useEffect(() => {
        setData(originalList)
    }, [originalList])
    useEffect(() => {
        // Transition method for new UI components
        const scrollDom = selectRef.current?.firstChild?.firstChild?.firstChild
        if (!scrollDom) return
        scrollDomRef.current = scrollDom
    }, [])
    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 34,
        overscan: 15
    })
    const onSearch = useDebounceFn(
        useMemoizedFn((label: string) => {
            if (label) {
                const newData = originalList.filter((ele) => ele.label.includes(label))
                setData(newData)
            } else {
                setData(originalList)
            }
        }),
        {wait: 200}
    ).run

    const onSelectSingle = useMemoizedFn((f: string, record?: FiltersItemProps) => {
        onSelect(f, record)
    })

    const renderSingle = useMemoizedFn(() => {
        return (
            <div className={styles["select-search-single"]}>
                {filterSearch && (
                    <div
                        className={classNames(styles["select-search-input"], {
                            [styles["select-search-input-icon"]]: filterSearchInputProps.isShowIcon === true
                        })}
                    >
                        <YakitInput.Search
                            size='small'
                            onSearch={onSearch}
                            onChange={(e) => onSearch(e.target.value)}
                            {...filterSearchInputProps}
                        />
                    </div>
                )}
                {filtersSelectAll?.isAll && (
                    <div
                        className={classNames(styles["select-item"], {})}
                        onClick={() =>
                            onSelect(filtersSelectAll.valueAll || "all", {
                                value: filtersSelectAll.valueAll || "all",
                                label: filtersSelectAll.textAll || "all"
                            })
                        }
                    >
                        {filtersSelectAll.textAll || "all"}
                    </div>
                )}
                <div ref={containerRef} className={styles["select-container"]}>
                    <div ref={wrapperRef}>
                        {(list.length > 0 &&
                            list.map((item) => (
                                <div
                                    key={item.data.value}
                                    className={classNames(styles["select-item"], {
                                        [styles["select-item-active-single"]]: value === item.data.value
                                    })}
                                    onClick={() => onSelectSingle(item.data.value, item.data)}
                                >
                                    {filterOptionRender
                                        ? filterOptionRender(item.data)
                                        : item.data.label || item.data.value}
                                </div>
                            ))) || <div className={classNames(styles["no-data"])}>No Data</div>}
                    </div>
                </div>
            </div>
        )
    })

    const onHandleScroll = useDebounceFn(
        useMemoizedFn(() => {
            scrollDomRef.current.scrollLeft = scrollDomRef.current.scrollWidth
        }),
        {wait: 500}
    ).run

    const onChangeSelect = useDebounceFn(
        useMemoizedFn((values: string[], option: FiltersItemProps[]) => {
            onSelect(values, option)
            // Scroll to Far Right
            if (filterSearch) onHandleScroll()
        }),
        {wait: 200}
    ).run
    const onSelectMultiple = useMemoizedFn((selectItem: FiltersItemProps) => {
        if (value) {
            if (!Array.isArray(value)) return
            const index = value.findIndex((ele) => ele === selectItem.value)
            if (index === -1) {
                onSelect([...value, selectItem.value], selectItem)
            } else {
                value.splice(index, 1)
                onSelect(value, selectItem)
            }
        } else {
            onSelect([selectItem.value], selectItem)
        }
        setTimeout(() => {
            if (filterSearch) onHandleScroll()
        }, 50)
    })

    const onReset = useMemoizedFn(() => {
        onSelect([])
        setTimeout(() => {
            onQuery()
        }, 200)
    })

    const onSure = useMemoizedFn(() => {
        onClose()
        onQuery()
    })

    const renderMultiple = useMemoizedFn(() => {
        return (
            <div
                className={classNames(styles["select-search-multiple"], {
                    [styles["select-search-multiple-filterSearch"]]: filterSearch
                })}
            >
                {filterSearch && (
                    <div className={styles["select-heard"]} ref={selectRef}>
                        <YakitSelect
                            size='small'
                            mode='tags'
                            wrapperStyle={{width: 124}}
                            onChange={onChangeSelect}
                            allowClear
                            value={Array.isArray(value) ? [...value] : []}
                            {...filterMultipleProps}
                            dropdownStyle={{height: 0, padding: 0}}
                            options={data}
                            className='select-small'
                            onFocus={() => onHandleScroll()}
                        />
                    </div>
                )}
                <div ref={containerRef} className={styles["select-container"]}>
                    <div ref={wrapperRef} className={styles["select-wrapper"]}>
                        {(list.length > 0 &&
                            list.map((item) => {
                                const checked = Array.isArray(value)
                                    ? value?.findIndex((ele) => ele === item.data.value) !== -1
                                    : false
                                return (
                                    <div
                                        key={item.data.value}
                                        className={classNames(styles["select-item"], {
                                            [styles["select-item-active"]]: checked
                                        })}
                                        onClick={() => onSelectMultiple(item.data)}
                                    >
                                        <span className={classNames(styles["select-item-text"], "content-ellipsis")}>
                                            {item.data.label}
                                        </span>
                                        {checked && <CheckIcon className={styles["check-icon"]} />}
                                    </div>
                                )
                            })) || <div className={classNames(styles["no-data"])}>No Data</div>}
                    </div>
                    <FooterBottom onReset={onReset} onSure={onSure} />
                </div>
            </div>
        )
    })

    return <div className={styles["select-search"]}>{(filterMultiple && renderMultiple()) || renderSingle()}</div>
})

interface FooterBottomProps {
    onReset: () => void
    onSure: () => void
    className?: string
}
export const FooterBottom: React.FC<FooterBottomProps> = React.memo((props) => {
    const {onReset, onSure, className} = props
    return (
        <div className={classNames(styles["select-footer"], className)}>
            <div className={classNames(styles["footer-bottom"], styles["select-reset"])} onClick={() => onReset()}>
                Reset
            </div>
            <div className={classNames(styles["footer-bottom"], styles["select-sure"])} onClick={() => onSure()}>
                Confirm
            </div>
        </div>
    )
})
