import {ArrowCircleRightSvgIcon, FilterIcon} from "@/assets/newIcon"
import {DurationMsToColor, RangeInputNumberTable, StatusCodeToColor} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {compareAsc, compareDesc} from "@/pages/yakitStore/viewers/base"
import {
    HTTP_PACKET_EDITOR_Response_Info,
    IMonacoEditor,
    NewHTTPPacketEditor,
    RenderTypeOptionVal
} from "@/utils/editors"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {failed, yakitFailed} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {formatTimestamp} from "@/utils/timeUtil"
import {useCreation, useDebounceFn, useMemoizedFn, useThrottleEffect, useUpdateEffect} from "ahooks"
import classNames from "classnames"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {analyzeFuzzerResponse, FuzzerResponse, onAddOverlayWidget} from "../../HTTPFuzzerPage"
import styles from "./HTTPFuzzerPageTable.module.scss"
import {HollowLightningBoltIcon} from "@/assets/newIcon"
import {Alert, Divider, Tooltip} from "antd"
import {ExtractionResultsContent} from "../../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import emiter from "@/utils/eventBus/eventBus"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import {RemoteGV} from "@/yakitGV"
import ReactResizeDetector from "react-resize-detector"
import {useCampare} from "@/hook/useCompare/useCompare"
import {DefFuzzerTableMaxData} from "@/defaultConstants/HTTPFuzzerPage"

const {ipcRenderer} = window.require("electron")

interface HTTPFuzzerPageTableProps {
    ref?: any
    query?: HTTPFuzzerPageTableQuery
    data: FuzzerResponse[]
    success?: boolean
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    isRefresh?: boolean
    /**@Name Extracted data */
    extractedMap: Map<string, string>
    /**@Name data transfer complete */
    isEnd: boolean
    setExportData?: (v: FuzzerResponse[]) => void
    /**@Name Debug matcher or extractor usable */
    isShowDebug?: boolean
    /**Click for debug callback */
    onDebug?: (res: string) => void
    pageId?: string
    /**Data exceeds limit, show alert */
    moreLimtAlertMsg?: React.ReactNode
    tableKeyUpDownEnabled?: boolean
    fuzzerTableMaxData?: number
}

/**
 * @Description B to kB M
 * @returns {string}
 */
const convertBodyLength = (val: string) => {
    const limit = parseInt(val)
    let size = ""
    if (limit < 0.1 * 1024) {
        //Less than 0.1KB, convert to B
        size = limit.toFixed(2) + "B"
    } else if (limit < 0.1 * 1024 * 1024) {
        //Less than 0.1MB, convert to KB
        size = (limit / 1024).toFixed(2) + "KB"
    } else if (limit < 0.1 * 1024 * 1024 * 1024) {
        //Less than 0.1GB, convert to MB
        size = (limit / (1024 * 1024)).toFixed(2) + "MB"
    }
    return size
}

export interface HTTPFuzzerPageTableQuery {
    keyWord?: string
    afterBodyLength?: number
    beforeBodyLength?: number
    StatusCode?: string[]
    Color?: string[]
    // bodyLengthUnit: "B" | "k" | "M"
}

// Check if array values are numeric incl. numeric strings
const isNumericArray = (arr) => {
    // Match using regex
    var regex = /^\d+$/
    for (var i = 0; i < arr.length; i++) {
        if (!regex.test(arr[i])) {
            return false
        }
    }
    return true
}

export const sorterFunction = (list, sorterTable, defSorter = "Count") => {
    // ------------  Sort start  ------------
    let newList = list
    // Check if sort column contains both numbers & letters
    const isNumber = isNumericArray(
        list.map((item) => (sorterTable?.orderBy == "" ? item[defSorter] + "" : item[sorterTable?.orderBy] + ""))
    )
    // Reset
    if (sorterTable?.order === "none") {
        newList = list.sort((a, b) => compareAsc(a, b, defSorter, isNumber))
    }
    // Ascending
    if (sorterTable?.order === "asc") {
        newList = list.sort((a, b) => compareAsc(a, b, sorterTable?.orderBy, isNumber))
    }
    // Descend
    if (sorterTable?.order === "desc") {
        newList = list.sort((a, b) => compareDesc(a, b, sorterTable?.orderBy, isNumber))
    }
    // ------------  Sort end  ------------
    return newList
}

export const HTTPFuzzerPageTable: React.FC<HTTPFuzzerPageTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            data,
            success,
            query = {},
            setQuery,
            isRefresh,
            extractedMap,
            isEnd,
            setExportData,
            isShowDebug,
            onDebug,
            pageId,
            moreLimtAlertMsg,
            tableKeyUpDownEnabled = true,
            fuzzerTableMaxData = DefFuzzerTableMaxData
        } = props
        const [listTable, setListTable] = useState<FuzzerResponse[]>([])
        const listTableRef = useRef<FuzzerResponse[]>([])
        const [loading, setLoading] = useState<boolean>(false)
        const [sorterTable, setSorterTable] = useState<SortProps>()
        const sorterTableRef = useRef<SortProps>()

        const [firstFull, setFirstFull] = useState<boolean>(true) // Table fullscreen?
        const [currentSelectItem, setCurrentSelectItem] = useState<FuzzerResponse>() //Selected table items
        const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response">("response") //Selected table items

        const [isHaveData, setIsHaveData] = useState<boolean>(false) // Data query not empty

        const [editor, setEditor] = useState<IMonacoEditor>()
        const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)

        const bodyLengthRef = useRef<any>()
        const tableRef = useRef<any>(null)

        const [scrollToIndex, setScrollToIndex] = useState<number>()
        const [alertClose, setAlertClose] = useState<boolean>(false)
        const [alertHeight, setAlertHeight] = useState<number>(0)

        useEffect(() => {
            sorterTableRef.current = sorterTable
        }, [sorterTable])
        useEffect(() => {
            listTableRef.current = listTable
        }, [listTable])

        // useThrottleEffect(
        //     () => {
        //             setListTable([...data]);
        //             const dataLength = data.length
        //             if(dataLength>0){scrollUpdate(dataLength)}
        //     },
        //     [data],
        //     {
        //       wait: 500,
        //     },
        //   );

        const scrollUpdate = useMemoizedFn((dataLength) => {
            const scrollTop = tableRef.current?.containerRef?.scrollTop
            const clientHeight = tableRef.current?.containerRef?.clientHeight
            const scrollHeight = tableRef.current?.containerRef?.scrollHeight
            let scrollBottom: number | undefined = undefined
            if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
                scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
                const isScroll: boolean = scrollHeight > clientHeight
                if (scrollBottom <= 2 && isScroll) {
                    setScrollToIndex(dataLength)
                }
            }
        })

        useImperativeHandle(
            ref,
            () => ({
                // Reduce parent component's DOM attributes, only expose needed methods to parent
                setCurrentSelectItem,
                setFirstFull
            }),
            []
        )

        const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
            return success
                ? [
                      {
                          title: "Request",
                          dataKey: "Count",
                          render: (v) => {
                              return v + 1
                          },
                          width: 80,
                          sorterProps: {
                              sorter: true
                          },
                          fixed: "left"
                      },
                      {
                          title: "Method",
                          dataKey: "Method",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "Status",
                          dataKey: "StatusCode",
                          render: (v, rowData) =>
                              v ? (
                                  <div
                                      style={{
                                          color: !hasRedOpacityBg(rowData.cellClassName) ? StatusCodeToColor(v) : ""
                                      }}
                                  >{`${v}`}</div>
                              ) : (
                                  "-"
                              ),
                          width: 90,
                          sorterProps: {
                              sorter: true
                          },
                          filterProps: {
                              filterMultiple: true,
                              filtersType: "select",
                              filters: [
                                  {
                                      value: "100-200",
                                      label: "100-200"
                                  },
                                  {
                                      value: "200-300",
                                      label: "200-300"
                                  },
                                  {
                                      value: "300-400",
                                      label: "300-400"
                                  },
                                  {
                                      value: "400-500",
                                      label: "400-500"
                                  },
                                  {
                                      value: "500-600",
                                      label: "500-600"
                                  }
                              ]
                          }
                      },
                      {
                          title: "Response Size",
                          dataKey: "BodyLength",
                          width: 120,
                          sorterProps: {
                              sorter: true
                          },
                          filterProps: {
                              filterKey: "bodyLength",
                              filterIcon: (
                                  <FilterIcon
                                      className={classNames(styles["filter-icon"], {
                                          [styles["active-icon"]]: query?.afterBodyLength || query?.beforeBodyLength
                                      })}
                                  />
                              ),
                              filterRender: () => (
                                  <BodyLengthInputNumber
                                      ref={bodyLengthRef}
                                      query={query}
                                      setQuery={(q) => {
                                          setQuery({
                                              ...q
                                          })
                                      }}
                                      onSure={() => {
                                          setTimeout(() => {
                                              update()
                                          }, 100)
                                      }}
                                      showFooter={true}
                                  />
                              )
                          }
                      },
                      {
                          title: "Latency (ms))",
                          dataKey: "DurationMs",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          },
                          render: (v, rowData) =>
                              v ? (
                                  <div
                                      style={{
                                          color: !hasRedOpacityBg(rowData.cellClassName) ? DurationMsToColor(v) : ""
                                      }}
                                  >{`${v}`}</div>
                              ) : (
                                  "-"
                              )
                      },
                      {
                          title: "Payloads",
                          dataKey: "Payloads",
                          width: 300,
                          sorterProps: {
                              sorter: true
                          },
                          render: (v) => {
                              return v ? v.join(",") : "-"
                          }
                      },
                      {
                          title: "Extract Data",
                          dataKey: "ExtractedResults",
                          width: 300,
                          beforeIconExtra: (
                              <div className={classNames(styles["extracted-checkbox"])}>
                                  <YakitCheckbox
                                      checked={isHaveData}
                                      onChange={(e) => setIsHaveData(e.target.checked)}
                                  />
                                  <span className={styles["tip"]}>NotEmpty</span>
                              </div>
                          ),
                          render: (item, record) =>
                              extractedMap.size > 0 ? (
                                  extractedMap.get(record["UUID"]) || "-"
                              ) : item?.length > 0 ? (
                                  <div className={styles["table-item-extracted-results"]}>
                                      <span className={styles["extracted-results-text"]}>
                                          {item.map((i) => `${i.Key}: ${i.Value} `)}
                                      </span>
                                      {item?.length > 1 && (
                                          <YakitButton
                                              type='text'
                                              size='small'
                                              onClick={(e) => {
                                                  e.stopPropagation()
                                                  onViewExecResults(item)
                                              }}
                                              style={{
                                                  color: !hasRedOpacityBg(record.cellClassName) ? undefined : "#fff"
                                              }}
                                          >
                                              Details
                                          </YakitButton>
                                      )}
                                  </div>
                              ) : (
                                  "-"
                              )
                      },
                      {
                          title: "Response Similarity",
                          dataKey: "BodySimilarity",
                          width: 120,
                          render: (v, rowData) => {
                              const text = parseFloat(`${v}`).toFixed(3)
                              return text ? (
                                  <div
                                      style={{
                                          color:
                                              !hasRedOpacityBg(rowData.cellClassName) && text.startsWith("1.00")
                                                  ? "var(--yakit-success-5)"
                                                  : undefined
                                      }}
                                  >
                                      {text}
                                  </div>
                              ) : (
                                  "-"
                              )
                          },
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "HTTP Header Similarity",
                          dataKey: "HeaderSimilarity",
                          render: (v) => (v ? parseFloat(`${v}`).toFixed(3) : "-"),
                          width: 120,
                          sorterProps: {
                              sorter: true
                          }
                      },

                      {
                          title: "Content-Type",
                          dataKey: "ContentType",
                          width: 300
                      },
                      {
                          title: "time",
                          dataKey: "Timestamp",
                          width: 165,
                          render: (text) => (text ? formatTimestamp(text) : "-"),
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "Action",
                          dataKey: "UUID",
                          fixed: "right",
                          width: isShowDebug !== false ? 85 : 60,
                          render: (_, record, index: number) => {
                              return (
                                  <div className={styles["operate-icons"]}>
                                      {isShowDebug !== false && (
                                          <>
                                              <Tooltip title='Debug'>
                                                  <HollowLightningBoltIcon
                                                      onClick={(e) => {
                                                          e.stopPropagation()
                                                          if (onDebug) {
                                                              onDebug(Uint8ArrayToString(record.ResponseRaw))
                                                          } else {
                                                              const value = {
                                                                  httpResponseCode: Uint8ArrayToString(
                                                                      record.ResponseRaw
                                                                  )
                                                              }
                                                              emiter.emit(
                                                                  "openMatcherAndExtraction",
                                                                  JSON.stringify(value)
                                                              )
                                                          }
                                                      }}
                                                      style={{
                                                          color: !hasRedOpacityBg(record.cellClassName) ? "" : "#fff"
                                                      }}
                                                  />
                                              </Tooltip>
                                              <Divider type='vertical' style={{margin: 0}} />
                                          </>
                                      )}

                                      <ArrowCircleRightSvgIcon
                                          style={{
                                              color: !hasRedOpacityBg(record.cellClassName) ? "" : "#fff"
                                          }}
                                          onClick={(e) => {
                                              e.stopPropagation()
                                              onDetails(record, index)
                                          }}
                                      />
                                  </div>
                              )
                          }
                      }
                  ]
                : [
                      {
                          title: "Method",
                          dataKey: "Method",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "Failure Reason",
                          dataKey: "Reason",
                          render: (v) => {
                              return v ? (
                                  <YakitTag color='danger' style={{maxWidth: "100%"}}>
                                      <span className={styles["fail-reason"]}>{v}</span>
                                      <CopyComponents copyText={v} />
                                  </YakitTag>
                              ) : (
                                  "-"
                              )
                          }
                      },
                      {
                          title: "Payloads",
                          dataKey: "Payloads",
                          sorterProps: {
                              sorter: true
                          },
                          render: (v) => {
                              return v ? v.join(",") : "-"
                          }
                      }
                  ]
        }, [success, query?.afterBodyLength, query?.beforeBodyLength, extractedMap, isHaveData, isShowDebug])

        // Red Background Mark
        const hasRedOpacityBg = (cellClassName: string) => cellClassName.indexOf("color-opacity-bg-red") !== -1

        const compareSorterTable = useCampare(sorterTable)
        useThrottleEffect(
            () => {
                queryData()
            },
            [data, isEnd, compareSorterTable],
            {wait: 500}
        )

        const compareQuery = useCampare(query)
        useEffect(() => {
            update()
        }, [isRefresh])
        useUpdateEffect(() => {
            update()
        }, [compareQuery, isHaveData])
        useEffect(() => {
            getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
                .then((data) => {
                    setShowResponseInfoSecondEditor(data === "false" ? false : true)
                })
                .catch(() => {
                    setShowResponseInfoSecondEditor(true)
                })
        }, [])
        const onViewExecResults = useMemoizedFn((list) => {
            showYakitModal({
                title: "Extraction Result",
                width: "60%",
                footer: <></>,
                content: <ExtractionResultsContent list={list} />
            })
        })
        const onDetails = useMemoizedFn((record, index: number) => {
            analyzeFuzzerResponse(record, index, data)
        })
        const onTableChange = useMemoizedFn(
            (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
                const l = bodyLengthRef?.current?.getValue() || {}
                setQuery({
                    ...query,
                    ...filters,
                    ...l
                })
                setSorterTable(sorter)
            }
        )

        const update = useDebounceFn(
            () => {
                setLoading(true)
                new Promise((resolve, reject) => {
                    try {
                        queryData()
                        resolve(true)
                    } catch (error) {
                        reject(error)
                    }
                })
                    .catch((e) => {
                        yakitFailed("Search failed:" + e)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            },
            {
                wait: 200
            }
        ).run

        /**
         * @Description Frontend Search
         */
        const queryData = useMemoizedFn(() => {
            try {
                // ------------  Search start  ------------
                // Loop if search criteria exist
                if (
                    query?.keyWord ||
                    (query?.StatusCode && query?.StatusCode?.length > 0) ||
                    (query?.Color && query?.Color?.length > 0) ||
                    query?.afterBodyLength ||
                    query?.beforeBodyLength ||
                    isHaveData
                ) {
                    const newDataTable = sorterFunction(data, sorterTable) || []
                    const l = newDataTable.length
                    const searchList: FuzzerResponse[] = []
                    for (let index = 0; index < l; index++) {
                        const record = newDataTable[index]
                        // Keywords search satisfied by default, push new array if true for both
                        let keyWordIsPush = true
                        let statusCodeIsPush = true
                        let bodyLengthMinIsPush = true
                        let bodyLengthMaxIsPush = true
                        let isHaveDataIsPush = true
                        let colorIsPush = true
                        // Intersection of search criteria
                        // Color search
                        if (query?.Color && query?.Color?.length > 0) {
                            const cLength = query.Color
                            const colorIsPushArr: boolean[] = []
                            for (let index = 0; index < cLength.length; index++) {
                                const element = query.Color[index]
                                if (record.MatchedByMatcher && record.HitColor.toUpperCase() === element) {
                                    colorIsPushArr.push(true)
                                } else {
                                    colorIsPushArr.push(false)
                                }
                            }
                            colorIsPush = colorIsPushArr.includes(true)
                        }
                        // Keyword search
                        if (query?.keyWord) {
                            const responseString = Uint8ArrayToString(record.ResponseRaw)
                            const payloadsString = (record.Payloads || []).join("")
                            keyWordIsPush = (responseString + payloadsString).includes(query.keyWord)
                        }
                        // Status code search
                        if (query?.StatusCode && query?.StatusCode?.length > 0) {
                            const cLength = query.StatusCode
                            const codeIsPushArr: boolean[] = []
                            for (let index = 0; index < cLength.length; index++) {
                                const element = query.StatusCode[index]
                                const codeArr = element.split("-")
                                if (record.StatusCode >= codeArr[0] && record.StatusCode <= codeArr[1]) {
                                    codeIsPushArr.push(true)
                                } else {
                                    codeIsPushArr.push(false)
                                }
                            }
                            statusCodeIsPush = codeIsPushArr.includes(true)
                        }
                        // Response size search
                        if (query?.afterBodyLength) {
                            // Min
                            bodyLengthMinIsPush = Number(record.BodyLength) >= query.afterBodyLength
                        }
                        if (query?.beforeBodyLength) {
                            // Max
                            bodyLengthMaxIsPush = Number(record.BodyLength) <= query.beforeBodyLength
                        }
                        // Data extracted?
                        if (isHaveData) {
                            if (extractedMap.size > 0) {
                                isHaveDataIsPush = !!extractedMap.get(record["UUID"])
                            } else {
                                isHaveDataIsPush = record.ExtractedResults.length > 0
                            }
                        }
                        // Push new array if search true simultaneously
                        if (
                            colorIsPush &&
                            keyWordIsPush &&
                            statusCodeIsPush &&
                            bodyLengthMinIsPush &&
                            bodyLengthMaxIsPush &&
                            isHaveDataIsPush
                        ) {
                            searchList.push(record)
                        }
                    }
                    setExportData && setExportData([...searchList])
                    setListTable([...searchList])
                    if (searchList.length > 0) {
                        scrollUpdate(searchList.length)
                    }
                } else {
                    const newData = sorterFunction(data, sorterTable) || []
                    setExportData && setExportData([...newData])
                    setListTable([...newData])
                    if (newData.length > 0) {
                        scrollUpdate(newData.length)
                    }
                }
                // ------------  Search end  ------------
            } catch (error) {
                yakitFailed("Search failed:" + error)
            }
        })

        const onGetExportFuzzerEvent = useMemoizedFn((v: string) => {
            try {
                const obj: {pageId: string; type: "all" | "payload"} = JSON.parse(v)
                if (pageId === obj.pageId) {
                    // Handling Uint8Array data loss/transformation after JSON.parse(JSON.stringify())
                    const newListTable = listTable.map((item) => ({
                        ...item,
                        RequestRaw: Uint8ArrayToString(item.RequestRaw),
                        ResponseRaw: Uint8ArrayToString(item.ResponseRaw)
                    }))
                    emiter.emit(
                        "onGetExportFuzzerCallBack",
                        JSON.stringify({listTable: newListTable, type: obj.type, pageId})
                    )
                }
            } catch (error) {}
        })

        // Get latest table values for filtering
        useEffect(() => {
            emiter.on("onGetExportFuzzer", onGetExportFuzzerEvent)
            return () => {
                emiter.off("onGetExportFuzzer", onGetExportFuzzerEvent)
            }
        }, [])

        const onRowClick = useMemoizedFn((val) => {
            if (val) {
                setCurrentSelectItem(val)
                setFirstFull(false)
            } else {
                setCurrentSelectItem(undefined)
                setFirstFull(true)
            }
        })

        const onSetCurrentRow = useDebounceFn(
            (rowDate: FuzzerResponse) => {
                onRowClick(rowDate)
            },
            {wait: 200}
        ).run

        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "50%",
                secondRatio: "50%"
            }
            if (firstFull) {
                p.secondRatio = "0%"
                p.firstRatio = "100%"
            }
            return p
        }, [firstFull])

        const responseEditorRightMenu: OtherMenuListProps = useMemo(() => {
            return {
                overlayWidgetv: {
                    menu: [
                        {
                            key: "is-show-add-overlay-widgetv",
                            label: showResponseInfoSecondEditor ? "Hide response info" : "Display response info"
                        }
                    ],
                    onRun: () => {
                        setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                        setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                    }
                }
            }
        }, [showResponseInfoSecondEditor])
        useEffect(() => {
            if (!editor || !currentSelectItem) return
            onAddOverlayWidget(editor, currentSelectItem, showResponseInfoSecondEditor)
        }, [currentSelectItem, showResponseInfoSecondEditor])
        const onExecResults = useMemoizedFn(() => {
            if (currentSelectItem) {
                onViewExecResults(currentSelectItem.ExtractedResults)
            }
        })

        const [typeOptionVal, setTypeOptionVal] = useState<RenderTypeOptionVal>()
        useEffect(() => {
            if (currentSelectItem) {
                getRemoteValue(RemoteGV.WebFuzzerEditorBeautify).then((res) => {
                    if (!!res) {
                        setTypeOptionVal(res)
                    } else {
                        setTypeOptionVal(undefined)
                    }
                })
            }
        }, [currentSelectItem, currentSelectShowType])

        return (
            <div className={styles["http-fuzzer-page-table"]} style={{overflowY: "hidden", height: "100%"}}>
                <YakitResizeBox
                    isVer={true}
                    lineDirection='bottom'
                    lineStyle={{display: firstFull ? "none" : ""}}
                    secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                    firstNode={
                        <div className={styles["fuzzer-page-table-wrap"]}>
                            {moreLimtAlertMsg && data.length >= fuzzerTableMaxData && (
                                <div style={{padding: "0 2px"}}>
                                    <ReactResizeDetector
                                        onResize={(w, h) => {
                                            if (!w || !h) {
                                                return
                                            }
                                            setAlertHeight(h)
                                        }}
                                        handleHeight={true}
                                        refreshMode={"debounce"}
                                        refreshRate={50}
                                    />
                                    <Alert
                                        message={moreLimtAlertMsg}
                                        type='warning'
                                        // closable
                                        // closeIcon={
                                        //     <YakitButton
                                        //         style={{float: "right"}}
                                        //         type='text2'
                                        //         size={"middle"}
                                        //         icon={<OutlineXIcon />}
                                        //     />
                                        // }
                                        style={{margin: "2px 0"}}
                                        // onClose={(e) => {
                                        //     setAlertClose(true)
                                        // }}
                                    />
                                </div>
                            )}
                            <div
                                style={{
                                    height:
                                        moreLimtAlertMsg && data.length >= fuzzerTableMaxData && !alertClose
                                            ? `calc(100% - ${alertHeight + 10}px)`
                                            : "100%"
                                }}
                            >
                                <TableVirtualResize<FuzzerResponse>
                                    ref={tableRef}
                                    query={query}
                                    isRefresh={isRefresh || loading}
                                    titleHeight={0.01}
                                    renderTitle={<></>}
                                    renderKey='UUID'
                                    data={listTable}
                                    loading={loading}
                                    enableDrag={true}
                                    columns={columns}
                                    onChange={onTableChange}
                                    containerClassName={classNames(styles["table-container"], {
                                        [styles["table-container-border"]]: currentSelectItem?.ResponseRaw
                                    })}
                                    currentSelectItem={currentSelectItem}
                                    onSetCurrentRow={onSetCurrentRow}
                                    useUpAndDown={tableKeyUpDownEnabled}
                                    scrollToIndex={scrollToIndex}
                                />
                            </div>
                        </div>
                    }
                    secondNode={
                        <NewHTTPPacketEditor
                            language={currentSelectItem?.DisableRenderStyles ? "text" : undefined}
                            isShowBeautifyRender={!currentSelectItem?.IsTooLargeResponse}
                            title={
                                <div className={styles["second-node-title-wrapper"]}>
                                    <span className={styles["second-node-title-text"]}>Quick Preview</span>
                                    <div className={styles["second-node-title-btns"]}>
                                        <YakitRadioButtons
                                            size='small'
                                            value={currentSelectShowType}
                                            onChange={(e) => {
                                                setCurrentSelectShowType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "request",
                                                    label: "Request"
                                                },
                                                {
                                                    value: "response",
                                                    label: "Response"
                                                }
                                            ]}
                                        />
                                        {currentSelectItem?.IsTooLargeResponse && (
                                            <YakitTag style={{marginLeft: 8}} color='danger'>
                                                Oversized Response
                                            </YakitTag>
                                        )}
                                    </div>
                                </div>
                            }
                            defaultHttps={currentSelectItem?.IsHTTPS}
                            isResponse={true}
                            readOnly={true}
                            hideSearch={true}
                            noHex={true}
                            // noHeader={true}
                            originValue={
                                (currentSelectShowType === "request"
                                    ? currentSelectItem?.RequestRaw
                                    : currentSelectItem?.ResponseRaw) || new Buffer([])
                            }
                            onAddOverlayWidget={(editor) => {
                                setEditor(editor)
                            }}
                            isAddOverlayWidget={showResponseInfoSecondEditor}
                            contextMenu={responseEditorRightMenu}
                            webFuzzerValue={currentSelectItem?.RequestRaw || new Buffer([])}
                            extraEditorProps={{
                                isShowSelectRangeMenu: true
                            }}
                            extra={[
                                currentSelectItem?.IsTooLargeResponse && (
                                    <YakitDropdownMenu
                                        key='allRes'
                                        menu={{
                                            data: [
                                                {key: "tooLargeResponseHeaderFile", label: "View Header"},
                                                {key: "tooLargeResponseBodyFile", label: "View Body"}
                                            ],
                                            onClick: ({key}) => {
                                                switch (key) {
                                                    case "tooLargeResponseHeaderFile":
                                                        ipcRenderer
                                                            .invoke(
                                                                "is-file-exists",
                                                                currentSelectItem.TooLargeResponseHeaderFile
                                                            )
                                                            .then((flag: boolean) => {
                                                                if (flag) {
                                                                    openABSFileLocated(
                                                                        currentSelectItem.TooLargeResponseHeaderFile
                                                                    )
                                                                } else {
                                                                    failed("Target file no longer exists!")
                                                                }
                                                            })
                                                            .catch(() => {})
                                                        break
                                                    case "tooLargeResponseBodyFile":
                                                        ipcRenderer
                                                            .invoke(
                                                                "is-file-exists",
                                                                currentSelectItem.TooLargeResponseBodyFile
                                                            )
                                                            .then((flag: boolean) => {
                                                                if (flag) {
                                                                    openABSFileLocated(
                                                                        currentSelectItem.TooLargeResponseBodyFile
                                                                    )
                                                                } else {
                                                                    failed("Target file no longer exists!")
                                                                }
                                                            })
                                                            .catch(() => {})
                                                        break
                                                    default:
                                                        break
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottom"
                                        }}
                                    >
                                        <YakitButton type='primary' size='small'>
                                            Full Response
                                        </YakitButton>
                                    </YakitDropdownMenu>
                                ),
                                <YakitButton size='small' onClick={onExecResults} key='extractData'>
                                    Extract Data
                                </YakitButton>
                            ]}
                            typeOptionVal={typeOptionVal}
                            onTypeOptionVal={(typeOptionVal) => {
                                if (typeOptionVal !== undefined) {
                                    setTypeOptionVal(typeOptionVal)
                                    setRemoteValue(RemoteGV.WebFuzzerEditorBeautify, typeOptionVal)
                                } else {
                                    setTypeOptionVal(undefined)
                                    setRemoteValue(RemoteGV.WebFuzzerEditorBeautify, "")
                                }
                            }}
                        />
                    }
                    {...ResizeBoxProps}
                />
            </div>
        )
    })
)

interface BodyLengthInputNumberProps {
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    onSure?: () => void
    showFooter?: boolean
    ref?: any
}

export const BodyLengthInputNumber: React.FC<BodyLengthInputNumberProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {query, setQuery, showFooter} = props
        // Response Size
        const [afterBodyLength, setAfterBodyLength] = useState<number>()
        const [beforeBodyLength, setBeforeBodyLength] = useState<number>()
        useEffect(() => {
            setAfterBodyLength(query?.afterBodyLength)
            setBeforeBodyLength(query?.beforeBodyLength)
        }, [query])
        useImperativeHandle(
            ref,
            () => ({
                getValue: () => {
                    const objLength = {
                        afterBodyLength,
                        beforeBodyLength
                    }
                    return objLength
                }
            }),
            [afterBodyLength, beforeBodyLength]
        )
        return (
            <div className={styles["range-input-number"]}>
                <RangeInputNumberTable
                    showFooter={showFooter}
                    minNumber={afterBodyLength}
                    setMinNumber={setAfterBodyLength}
                    maxNumber={beforeBodyLength}
                    setMaxNumber={setBeforeBodyLength}
                    onReset={() => {
                        setQuery({
                            ...query,
                            afterBodyLength,
                            beforeBodyLength
                        })
                        setBeforeBodyLength(undefined)
                        setAfterBodyLength(undefined)
                    }}
                    onSure={() => {
                        setQuery({
                            ...query,
                            afterBodyLength,
                            beforeBodyLength
                        })
                    }}
                />
            </div>
        )
    })
)
