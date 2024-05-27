import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {HybridScanModeType, HybridScanTask, HybridScanTaskSourceType} from "@/models/HybridScan"
import {
    DeleteHybridScanTaskRequest,
    QueryHybridScanTaskRequest,
    QueryHybridScanTaskResponse,
    apiDeleteHybridScanTask,
    apiQueryHybridScanTask
} from "./utils"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {OutlineLoadingIcon, OutlineQuestionmarkcircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {Divider, Tooltip} from "antd"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {SolidCheckCircleIcon, SolidPlayIcon, SolidXcircleIcon} from "@/assets/icon/solid"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

interface PluginBatchRaskListDrawerProps {
    visible: boolean
    setVisible: (b: boolean) => void
    hybridScanTaskSource: HybridScanTaskSourceType
}
const PluginBatchRaskListDrawer: React.FC<PluginBatchRaskListDrawerProps> = React.memo((props) => {
    const {visible, setVisible, hybridScanTaskSource} = props

    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const pluginBatchRaskListRef = useRef<PluginBatchRaskListForwardedRefProps>({
        onRemove: () => {}
    })

    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    const onRemove = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            await pluginBatchRaskListRef.current.onRemove()
        } catch (error) {}

        setTimeout(() => {
            setRemoveLoading(false)
        }, 300)
    })
    return (
        <YakitDrawer
            visible={visible}
            onClose={onClose}
            width='45%'
            title='Task List'
            extra={
                <>
                    {selectedRowKeys.length === 0 ? (
                        <YakitPopconfirm title='This operation will clear all below data' onConfirm={onRemove}>
                            <YakitButton loading={removeLoading} type='primary' danger>
                                Clear
                            </YakitButton>
                        </YakitPopconfirm>
                    ) : (
                        <YakitPopconfirm title='This operation will delete selected data' onConfirm={onRemove}>
                            <YakitButton loading={removeLoading} type='primary' danger>
                                Delete
                            </YakitButton>
                        </YakitPopconfirm>
                    )}
                </>
            }
            bodyStyle={{overflow: "hidden"}}
        >
            <PluginBatchRaskList
                visible={visible}
                setVisible={setVisible}
                ref={pluginBatchRaskListRef}
                selectedRowKeys={selectedRowKeys}
                setSelectedRowKeys={setSelectedRowKeys}
                hybridScanTaskSource={hybridScanTaskSource}
            />
        </YakitDrawer>
    )
})
export default PluginBatchRaskListDrawer

interface PluginBatchRaskListForwardedRefProps {
    onRemove: () => void
}
interface PluginBatchRaskListProps {
    ref?: ForwardedRef<PluginBatchRaskListForwardedRefProps>
    visible: boolean
    setVisible: (b: boolean) => void
    selectedRowKeys: string[]
    setSelectedRowKeys: (s: string[]) => void
    hybridScanTaskSource?: HybridScanTaskSourceType
}
const PluginBatchRaskList: React.FC<PluginBatchRaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {getBatchExecutorByRuntimeId} = usePageInfo(
            (s) => ({
                getBatchExecutorByRuntimeId: s.getBatchExecutorByRuntimeId
            }),
            shallow
        )
        const {visible, setVisible, hybridScanTaskSource} = props
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [params, setParams] = useState<QueryHybridScanTaskRequest>({
            Pagination: genDefaultPagination(20, 1),
            Filter: {
                HybridScanTaskSource: !!hybridScanTaskSource ? [hybridScanTaskSource] : []
            }
        })
        const [loading, setLoading] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<QueryHybridScanTaskResponse>({
            Pagination: genDefaultPagination(),
            Data: [],
            Total: 0
        })
        const [selectedRowKeys, setSelectedRowKeys] = useControllableValue<string[]>(props, {
            defaultValue: [],
            valuePropName: "selectedRowKeys",
            trigger: "setSelectedRowKeys"
        })
        useImperativeHandle(
            ref,
            () => ({
                onRemove: () => {
                    onBatchRemove()
                }
            }),
            []
        )
        useEffect(() => {
            update(1)
        }, [visible])
        const getStatusNode = useMemoizedFn((record: HybridScanTask) => {
            switch (record.Status) {
                case "done":
                    return (
                        <div className={styles["table-status-item"]}>
                            <SolidCheckCircleIcon className={styles["icon-success"]} />
                            <span className={styles["status-text"]}>Completed</span>
                        </div>
                    )
                case "executing":
                    return (
                        <div className={styles["table-status-item"]}>
                            <OutlineLoadingIcon className={styles["icon-primary"]} />
                            <span className={styles["status-text"]}>Executing</span>
                        </div>
                    )
                case "paused":
                    return (
                        <div className={styles["table-status-item"]}>
                            <SolidPlayIcon className={styles["icon-helper"]} />
                            <span className={styles["status-text"]}>Pause</span>
                        </div>
                    )
                default:
                    return (
                        <div className={styles["table-status-item"]}>
                            <SolidXcircleIcon className={styles["icon-danger"]} />
                            <span className={styles["status-text"]}>Failed</span>
                            <Tooltip title={record.Reason || "Unknown Reason"}>
                                <OutlineQuestionmarkcircleIcon className={styles["icon-question"]} />
                            </Tooltip>
                        </div>
                    )
            }
        })
        const getAction = useMemoizedFn((record: HybridScanTask) => {
            switch (record.Status) {
                case "executing":
                    return (
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                onPaused(record)
                            }}
                        >
                            Pause
                        </YakitButton>
                    )
                case "paused":
                    return (
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                onContinue(record)
                            }}
                        >
                            Continue
                        </YakitButton>
                    )
                default:
                    return (
                        <YakitButton
                            type='text'
                            danger
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSingle(record.TaskId)
                            }}
                        >
                            Delete
                        </YakitButton>
                    )
            }
        })
        const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
            return [
                {
                    title: "Scan Target",
                    dataKey: "FirstTarget",
                    width: 160,
                    fixed: "left",
                    filterProps: {
                        filtersType: "input",
                        filterKey: "Target"
                    }
                },
                {
                    title: "Status",
                    dataKey: "Status",
                    width: 90,
                    render: (_, record: HybridScanTask) => getStatusNode(record),
                    filterProps: {
                        filtersType: "select",
                        filtersSelectAll: {
                            isAll: true
                        },
                        filterKey: "StatusType",
                        filters: [
                            {
                                label: "Completed",
                                value: "done"
                            },
                            {
                                label: "Executing",
                                value: "executing"
                            },
                            {
                                label: "Pause",
                                value: "paused"
                            },
                            {
                                label: "Failed",
                                value: "error"
                            }
                        ]
                    }
                },

                {
                    title: "Created time",
                    dataKey: "CreatedAt",
                    render: (v) => (v ? formatTimestamp(v) : "-"),
                    sorterProps: {
                        sorterKey: "created_at",
                        sorter: true
                    }
                },
                {
                    title: "Update Time",
                    dataKey: "UpdatedAt",
                    render: (v) => (v ? formatTimestamp(v) : "-"),
                    sorterProps: {
                        sorterKey: "updated_at",
                        sorter: true
                    }
                },
                {
                    title: "Action",
                    dataKey: "action",
                    fixed: "right",
                    width: 120,
                    render: (_, record: HybridScanTask) => (
                        <>
                            {getAction(record)}

                            <Divider type='vertical' style={{margin: 0}} />
                            {record.Status === "error" ? (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDetails(record.TaskId, "new")
                                    }}
                                >
                                    Retry
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDetails(record.TaskId, "status")
                                    }}
                                >
                                    View
                                </YakitButton>
                            )}
                        </>
                    )
                }
            ]
        }, [visible, isRefresh])
        const update = useMemoizedFn((page?: number, limit?: number) => {
            const paginationProps = {
                ...params.Pagination,
                Page: page || 1,
                Limit: limit || params.Pagination.Limit
            }
            setLoading(true)
            const finalParams: QueryHybridScanTaskRequest = {
                ...params,
                Pagination: paginationProps
            }
            apiQueryHybridScanTask(finalParams)
                .then((res) => {
                    const newPage = +res.Pagination.Page
                    const d = newPage === 1 ? res.Data : (response?.Data || []).concat(res.Data)
                    setResponse({
                        ...res,
                        Data: d
                    })
                    if (newPage === 1) {
                        setIsRefresh(!isRefresh)
                        setSelectedRowKeys([])
                        setIsAllSelect(false)
                    }
                    if (+res.Total !== selectedRowKeys.length) {
                        setIsAllSelect(false)
                    }
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        })
        const onTableChange = useDebounceFn(
            (page: number, limit: number, sorter: SortProps, filter: any) => {
                setParams((oldParams) => ({
                    Pagination: {
                        ...oldParams.Pagination,
                        Order: sorter.order === "asc" ? "asc" : "desc",
                        OrderBy: sorter.order === "none" ? "updated_at" : sorter.orderBy
                    },
                    Filter: {
                        ...oldParams.Filter,
                        ...filter,
                        Status: !!filter.StatusType ? [filter.StatusType] : []
                    }
                }))
                setTimeout(() => {
                    update(1, limit)
                }, 100)
            },
            {wait: 500}
        ).run
        const onRefresh = useMemoizedFn(() => {
            update(1)
        })
        const onDetails = useMemoizedFn((runtimeId: string, hybridScanMode: HybridScanModeType) => {
            const current: PageNodeItemProps | undefined = getBatchExecutorByRuntimeId(runtimeId)
            // RetryNew creates a new page
            if (!!current && hybridScanMode !== "new") {
                emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId}))
                setTimeout(() => {
                    // Switch submenu only, no data requery needed if page open
                    if (hybridScanMode !== "status") {
                        emiter.emit(
                            "switchTaskStatus",
                            JSON.stringify({runtimeId, hybridScanMode, pageId: current.pageId})
                        )
                    }
                }, 200)
            } else {
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.BatchExecutorPage,
                        params: {
                            runtimeId,
                            hybridScanMode
                        }
                    })
                )
            }
            setVisible(false)
        })
        const onRemoveSingle = useMemoizedFn((taskId: string) => {
            const removeParams: DeleteHybridScanTaskRequest = {
                Filter: {
                    TaskId: [taskId],
                    Status: [],
                    Target: ""
                }
            }
            apiDeleteHybridScanTask(removeParams)
                .then(() => {
                    setResponse({
                        ...response,
                        Total: response.Total - 1,
                        Data: response.Data.filter((item) => item.TaskId !== taskId)
                    })
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        const onBatchRemove = useMemoizedFn(() => {
            const filter = isAllSelect ? {...params.Filter} : {}
            const removeParams: DeleteHybridScanTaskRequest = {
                Filter: {
                    ...filter,
                    TaskId: isAllSelect ? [] : selectedRowKeys
                }
            }
            setLoading(true)
            apiDeleteHybridScanTask(removeParams)
                .then(() => {
                    update(1)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        const onSelectAll = (newSelectedRowKeys: string[], selected: HybridScanTask[], checked: boolean) => {
            setIsAllSelect(checked)
            setSelectedRowKeys(newSelectedRowKeys)
        }
        const onChangeCheckboxSingle = useMemoizedFn((c: boolean, keys: string) => {
            if (c) {
                setSelectedRowKeys((s) => [...s, keys])
            } else {
                setSelectedRowKeys((s) => s.filter((ele) => ele !== keys))
                setIsAllSelect(false)
            }
        })
        /**Pause Task */
        const onPaused = useMemoizedFn((record: HybridScanTask) => {
            onDetails(record.TaskId, "pause")
        })
        /**Continue Task */
        const onContinue = useMemoizedFn((record: HybridScanTask) => {
            onDetails(record.TaskId, "resume")
        })
        return (
            <TableVirtualResize<HybridScanTask>
                query={params.Filter}
                size='middle'
                extra={<YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />}
                isRefresh={isRefresh}
                renderKey='TaskId'
                data={response?.Data || []}
                loading={loading}
                enableDrag={true}
                columns={columns}
                pagination={{
                    page: response?.Pagination.Page || 0,
                    limit: response?.Pagination.Limit || 20,
                    total: response?.Total && response?.Total > 0 ? Number(response.Total) : 0,
                    onChange: update
                }}
                onChange={onTableChange}
                isShowTotal={true}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys: selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle
                }}
            />
        )
    })
)
