import React, {useRef, useState, useEffect, forwardRef, useImperativeHandle} from "react"
import {useMemoizedFn, useCreation, useUpdateEffect, useInViewport, useControllableValue} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import {
    HybridScanRequest,
    PluginBatchExecutorInputValueProps,
    PluginInfoProps,
    PluginBatchExecutorTaskProps,
    apiHybridScan,
    apiHybridScanByMode,
    apiCancelHybridScan,
    convertHybridScanParams,
    hybridScanParamsConvertToInputValue
} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {Form} from "antd"

import "../plugins.scss"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {
    PluginExecuteProgress,
    PluginFixFormParams
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {
    PluginExecuteExtraFormValue,
    RequestType
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {HybridScanControlAfterRequest, HybridScanModeType, HybridScanTaskSourceType} from "@/models/HybridScan"
import {randomString} from "@/utils/randomUtil"
import useHoldBatchGRPCStream from "@/hook/useHoldBatchGRPCStream/useHoldBatchGRPCStream"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../operator/expandAndRetract/ExpandAndRetract"
import {PageNodeItemProps, PluginBatchExecutorPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {PluginLocalListDetails} from "../operator/PluginLocalListDetails/PluginLocalListDetails"
import {PluginExecuteLog} from "@/pages/securityTool/yakPoC/YakPoC"
import {Uint8ArrayToString} from "@/utils/str"
import {yakitNotify} from "@/utils/notification"
import {
    defPluginBatchExecuteExtraFormValue,
    defaultPluginBatchExecutorPageInfo,
    pluginTypeFilterList
} from "@/defaultConstants/PluginBatchExecutor"
import {defaultFilter, defaultSearch} from "../builtInData"

const PluginBatchExecuteExtraParamsDrawer = React.lazy(() => import("./PluginBatchExecuteExtraParams"))
const PluginBatchRaskListDrawer = React.lazy(() => import("./PluginBatchRaskListDrawer"))

interface PluginBatchExecutorProps {
    id: string
}

export const isEmpty = (uint8Array: Uint8Array) => {
    return !(uint8Array && Object.keys(uint8Array).length > 0)
}
export interface PluginBatchExecuteExtraFormValue extends PluginExecuteExtraFormValue, PluginBatchExecutorTaskProps {}

export const PluginBatchExecutor: React.FC<PluginBatchExecutorProps> = React.memo((props) => {
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    /**Fetch Page Data from Data Center */
    const initPluginBatchExecutorPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.BatchExecutorPage, props.id)
        if (currentItem && currentItem.pageParamsInfo.pluginBatchExecutorPageInfo) {
            return currentItem.pageParamsInfo.pluginBatchExecutorPageInfo
        } else {
            return {
                ...defaultPluginBatchExecutorPageInfo
            }
        }
    })
    const [pageInfo, setPageInfo] = useState<PluginBatchExecutorPageInfoProps>(initPluginBatchExecutorPageInfo())

    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)

    // Hide Plugin List
    const [hidden, setHidden] = useState<boolean>(false)
    /**Is Expanded/Collapse */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**Is Executing */
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    /**Pause */
    const [pauseLoading, setPauseLoading] = useState<boolean>(false)
    /**Continue */
    const [continueLoading, setContinueLoading] = useState<boolean>(false)

    const [refreshList, setRefreshList] = useState<boolean>(false)
    const [selectNum, setSelectNum] = useState<number>(0)
    const [pluginExecuteLog, setPluginExecuteLog] = useState<StreamResult.PluginExecuteLog[]>([])

    // Task List Drawer
    const [visibleRaskList, setVisibleRaskList] = useState<boolean>(false)

    const userInfo = useStore((s) => s.userInfo)

    /** Is First Load */
    const pluginBatchExecuteContentRef = useRef<PluginBatchExecuteContentRefProps>(null)

    const batchExecuteDomRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(batchExecuteDomRef)

    // Trigger on userInfo.isLogin, filters Change；
    useUpdateEffect(() => {
        setRefreshList(!refreshList)
    }, [userInfo.isLogin])
    useEffect(() => {
        if (inViewport) {
            emiter.on("onRefLocalPluginList", onRefLocalPluginList)
        }
        return () => {
            emiter.off("onRefLocalPluginList", onRefLocalPluginList)
        }
    }, [inViewport])

    /**Refresh Related Data in List Based on value after Setting Initial Value for Input Module */
    const onInitInputValueAfter = useMemoizedFn((value: HybridScanControlAfterRequest) => {
        try {
            const inputValue: PluginBatchExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {pluginInfo} = inputValue
            // Plugin Data
            if (pluginInfo.selectPluginName.length > 0) {
                setSelectList(pluginInfo.selectPluginName)
            } else {
                setSelectList([])
                if (pluginInfo.search) setSearch(pluginInfo.search)
                if (pluginInfo.filters) setFilters(pluginInfo.filters)
                setAllCheck(true)
                setTimeout(() => {
                    setRefreshList(!refreshList)
                }, 200)
            }
        } catch (error) {}
    })
    const fetchListInPageFirstAfter = useMemoizedFn(() => {
        onActionHybridScanByRuntimeId(pageInfo.runtimeId)
    })
    /** Query Record Detail by runtimeId */
    const onActionHybridScanByRuntimeId = useMemoizedFn((runtimeId: string) => {
        if (!runtimeId) return
        pluginBatchExecuteContentRef.current
            ?.onActionHybridScanByRuntimeId(runtimeId, pageInfo.hybridScanMode)
            .then(() => {
                setIsExpand(false)
            })
    })

    const onRefLocalPluginList = useMemoizedFn(() => {
        setTimeout(() => {
            setRefreshList(!refreshList)
        }, 200)
    })

    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectList([])
    })

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onStopExecute = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onStopExecute()
    })
    const onPause = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onPause()
    })

    const onContinue = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onContinue()
    })
    /**Execute Button at Top */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        pluginBatchExecuteContentRef.current?.onStartExecute()
    })
    const pluginInfo = useCreation(() => {
        return {
            selectPluginName: selectList,
            search,
            filters
        }
    }, [selectList, search, filters])
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])
    const isShowPluginLog = useCreation(() => {
        return pluginExecuteLog.length > 0 || isExecuting
    }, [pluginExecuteLog, isExecuting])
    const dataScanParams = useCreation(() => {
        return {
            https: pageInfo.https,
            httpFlowIds: pageInfo.httpFlowIds,
            request: pageInfo.request
        }
    }, [pageInfo])
    return (
        <PluginLocalListDetails
            hidden={hidden}
            selectList={selectList}
            setSelectList={setSelectList}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            allCheck={allCheck}
            setAllCheck={setAllCheck}
            defaultFilters={{
                plugin_type: cloneDeep(pluginTypeFilterList)
            }}
            pluginDetailsProps={{
                title: "Select Plugin",
                bodyClassName: styles["plugin-batch-executor-body"]
            }}
            fetchListInPageFirstAfter={fetchListInPageFirstAfter}
            selectNum={selectNum}
            setSelectNum={setSelectNum}
        >
            <div className={styles["right-wrapper"]}>
                {isShowPluginLog && (
                    <div className={styles["log-wrapper"]}>
                        <div className={styles["log-heard"]}>Plugin Logs</div>
                        <PluginExecuteLog
                            hidden={false}
                            pluginExecuteLog={pluginExecuteLog}
                            isExecuting={executeStatus === "process"}
                        />
                    </div>
                )}
                <div className={styles["plugin-batch-executor-wrapper"]}>
                    <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                        <div className={styles["plugin-batch-executor-title"]} ref={batchExecuteDomRef}>
                            <span className={styles["plugin-batch-executor-title-text"]}>Selected Plugin</span>
                            {selectNum > 0 && (
                                <YakitTag closable onClose={onRemove} color='info'>
                                    {selectNum}
                                </YakitTag>
                            )}
                        </div>
                        <div className={styles["plugin-batch-executor-btn"]}>
                            {progressList.length === 1 && (
                                <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                            )}
                            <YakitButton
                                type='text'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setVisibleRaskList(true)
                                }}
                                style={{padding: 0}}
                            >
                                Task List
                            </YakitButton>
                            {isExecuting
                                ? !isExpand && (
                                      <>
                                          {executeStatus === "paused" && !pauseLoading && (
                                              <YakitButton onClick={onContinue} loading={continueLoading}>
                                                  Continue
                                              </YakitButton>
                                          )}
                                          {(executeStatus === "process" || pauseLoading) && (
                                              <YakitButton onClick={onPause} loading={pauseLoading}>
                                                  Pause
                                              </YakitButton>
                                          )}
                                          <YakitButton
                                              danger
                                              onClick={onStopExecute}
                                              disabled={pauseLoading || continueLoading}
                                          >
                                              Exec Plugin Names Array
                                          </YakitButton>
                                          <div className={styles["divider-style"]}></div>
                                      </>
                                  )
                                : !isExpand && (
                                      <>
                                          <YakitButton onClick={onExecuteInTop} disabled={selectNum === 0}>
                                              Risk Items
                                          </YakitButton>
                                          <div className={styles["divider-style"]}></div>
                                      </>
                                  )}
                            <YakitButton
                                type='text2'
                                icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setHidden(!hidden)
                                }}
                            />
                        </div>
                    </ExpandAndRetract>
                    <div className={styles["plugin-batch-executor-body"]}>
                        <PluginBatchExecuteContent
                            ref={pluginBatchExecuteContentRef}
                            selectNum={selectNum}
                            isExpand={isExpand}
                            setIsExpand={setIsExpand}
                            defaultActiveKey={pageInfo.defaultActiveKey}
                            onInitInputValueAfter={onInitInputValueAfter}
                            setProgressList={setProgressList}
                            pauseLoading={pauseLoading}
                            setPauseLoading={setPauseLoading}
                            continueLoading={continueLoading}
                            setContinueLoading={setContinueLoading}
                            pluginInfo={pluginInfo}
                            executeStatus={executeStatus}
                            setExecuteStatus={setExecuteStatus}
                            setPluginExecuteLog={setPluginExecuteLog}
                            pluginExecuteResultWrapper={styles["plugin-executor-result-wrapper"]}
                            dataScanParams={dataScanParams}
                            pageId={props.id}
                            initRuntimeId={pageInfo.runtimeId}
                            hybridScanTaskSource='pluginBatch'
                        />
                    </div>
                </div>
            </div>
            <React.Suspense fallback={<>loading...</>}>
                {visibleRaskList && (
                    <PluginBatchRaskListDrawer
                        visible={visibleRaskList}
                        setVisible={setVisibleRaskList}
                        hybridScanTaskSource='pluginBatch'
                    />
                )}
            </React.Suspense>
        </PluginLocalListDetails>
    )
})
export interface DataScanParamsProps {
    /**Is HTTPS */
    https: boolean
    /**Selected Data History ID */
    httpFlowIds: []
    /**Request Packet */
    request: Uint8Array
}
interface PluginBatchExecuteContentProps {
    ref?: React.ForwardedRef<PluginBatchExecuteContentRefProps>
    pluginInfo: PluginInfoProps
    /**Number of Selected Plugins */
    selectNum: number
    /**Default Selected tabKey for Plugin Execution Output */
    defaultActiveKey?: string
    /** Callback after Setting Initial Value for Input Module, e.g., Refresh Plugin List on Plugin Batch Execution Page) */
    onInitInputValueAfter?: (value: HybridScanControlAfterRequest) => void
    /**Progress Bar Fresh */
    setProgressList: (s: StreamResult.Progress[]) => void

    /**Exec Plugin Names Array */
    pauseLoading: boolean
    setPauseLoading: (value: boolean) => void

    /**Continue */
    continueLoading?: boolean
    setContinueLoading?: (value: boolean) => void

    /**Expand/Collapse Form Content */
    isExpand: boolean
    setIsExpand: (value: boolean) => void

    /**Execution Status */
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (value: ExpandAndRetractExcessiveState) => void

    /**Plugin Execution Log */
    setPluginExecuteLog?: (s: StreamResult.PluginExecuteLog[]) => void

    pluginExecuteResultWrapper?: string
    /**Set Visibility for Parts, eg: Show/Hide in poc Settings */
    setHidden?: (value: boolean) => void
    dataScanParams?: DataScanParamsProps
    pageId?: string
    /**Runtime ID */
    initRuntimeId?: string

    hybridScanTaskSource: HybridScanTaskSourceType
}
export interface PluginBatchExecuteContentRefProps {
    onActionHybridScanByRuntimeId: (runtimeId: string, hybridScanMode: HybridScanModeType) => Promise<null>
    onStopExecute: () => void
    onStartExecute: () => void
    onInitInputValue: (v: HybridScanControlAfterRequest) => void
    onPause: () => void
    onContinue: () => void
}
export const PluginBatchExecuteContent: React.FC<PluginBatchExecuteContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            selectNum,
            pluginInfo,
            defaultActiveKey,
            onInitInputValueAfter,
            setProgressList,
            setPluginExecuteLog,
            pluginExecuteResultWrapper = "",
            setHidden,
            dataScanParams,
            pageId,
            initRuntimeId,
            hybridScanTaskSource
        } = props
        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )
        const [form] = Form.useForm()
        const requestType = Form.useWatch("requestType", form)
        useImperativeHandle(
            ref,
            () => ({
                onActionHybridScanByRuntimeId,
                onStopExecute,
                onPause,
                onContinue,
                onStartExecute: () => {
                    form.validateFields()
                        .then(onStartExecute)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                },
                onInitInputValue
            }),
            [form]
        )
        /**For cache modification */
        const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
        const [extraParamsValue, setExtraParamsValue] = useState<PluginBatchExecuteExtraFormValue>({
            ...cloneDeep(defPluginBatchExecuteExtraFormValue)
        })
        /**Initial Raw HTTP Request Data, unaffected by RawHTTPRequest in additional parameters */
        const [initRawHTTPRequest, setInitRawHTTPRequest] = useState<string>("")

        const [pauseLoading, setPauseLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "pauseLoading",
            trigger: "setPauseLoading"
        })
        const [continueLoading, setContinueLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "continueLoading",
            trigger: "setContinueLoading"
        })
        /**Is Expanded/Collapse */
        const [isExpand, setIsExpand] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "isExpand",
            trigger: "setIsExpand"
        })
        /**Execution Status */
        const [executeStatus, setExecuteStatus] = useControllableValue<ExpandAndRetractExcessiveState>(props, {
            defaultValue: "default",
            valuePropName: "executeStatus",
            trigger: "setExecuteStatus"
        })
        const [runtimeId, setRuntimeId] = useState<string>(initRuntimeId || "")

        const tokenRef = useRef<string>(randomString(40))
        const isRetryRef = useRef<boolean>(false) //Is Retry
        const batchExecuteFormRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(batchExecuteFormRef)

        const [streamInfo, hybridScanStreamEvent] = useHoldBatchGRPCStream({
            taskName: "hybrid-scan",
            apiKey: "HybridScan",
            token: tokenRef.current,
            onEnd: () => {
                hybridScanStreamEvent.stop()
                setTimeout(() => {
                    setPauseLoading(false)
                    setContinueLoading(false)
                }, 200)
            },
            onError: (error) => {
                hybridScanStreamEvent.stop()
                setTimeout(() => {
                    setExecuteStatus("error")
                    setPauseLoading(false)
                    setContinueLoading(false)
                }, 200)
                yakitNotify("error", `[Mod] hybrid-scan error: ${error}`)
            },
            setRuntimeId: (rId) => {
                setRuntimeId(rId)
                if (runtimeId !== rId) {
                    onUpdatePluginBatchExecutorPageInfo(rId)
                }
            },
            setTaskStatus: (val) => {
                switch (val) {
                    case "default":
                        setExecuteStatus("default")
                        break
                    case "done":
                        setExecuteStatus("finished")
                        break
                    case "error":
                        setExecuteStatus("error")
                        break
                    case "executing":
                        setPauseLoading(false)
                        setContinueLoading(false)
                        setExecuteStatus("process")
                        break
                    case "paused":
                        setExecuteStatus("paused")
                        break
                    default:
                        break
                }
            },
            onGetInputValue: (v) => onInitInputValue(v)
        })
        const progressList = useCreation(() => {
            return streamInfo.progressState
        }, [streamInfo.progressState])

        useEffect(() => {
            setProgressList(progressList)
        }, [progressList])
        useEffect(() => {
            if (setPluginExecuteLog) setPluginExecuteLog(streamInfo.pluginExecuteLog)
        }, [streamInfo.pluginExecuteLog])

        useEffect(() => {
            onSetScanData()
        }, [dataScanParams])
        useEffect(() => {
            if (inViewport) {
                emiter.on("switchTaskStatus", onSwitchTaskStatus)
            }
            return () => {
                emiter.off("switchTaskStatus", onSwitchTaskStatus)
            }
        }, [inViewport])
        /**Toggle Task Status */
        const onSwitchTaskStatus = useMemoizedFn((res) => {
            try {
                const value = JSON.parse(res)
                const {runtimeId, hybridScanMode, pageId: pId} = value
                if (pageId !== pId) return
                if (!runtimeId) {
                    yakitNotify("error", "No Valid runtimeId Set")
                    return
                }
                if (hybridScanMode == "new") {
                    yakitNotify("error", "Retry (new) Bypass, Please Provide Correct hybridScanMode")
                    return
                }
                apiHybridScanByMode(runtimeId, hybridScanMode, tokenRef.current)
                    .then(() => {
                        if (hybridScanMode === "pause") {
                            setPauseLoading(true)
                        }
                        if (hybridScanMode === "resume") {
                            setContinueLoading(true)
                            hybridScanStreamEvent.start()
                        }
                    })
                    .catch((error) => {
                        yakitNotify("error", `apiHybridScanByMode Failed${error}`)
                    })
            } catch (error) {
                yakitNotify("error", `Task Operation Parameter Parsing Failed${error}`)
            }
        })
        /**Update Latest runtimeId for Page */
        const onUpdatePluginBatchExecutorPageInfo = useMemoizedFn((runtimeId: string) => {
            if (!pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.BatchExecutorPage, pageId)
            if (!currentItem) return
            const newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageParamsInfo: {
                    pluginBatchExecutorPageInfo: {
                        ...defaultPluginBatchExecutorPageInfo,
                        ...currentItem.pageParamsInfo.pluginBatchExecutorPageInfo,
                        runtimeId
                    }
                }
            }
            updatePagesDataCacheById(YakitRoute.BatchExecutorPage, {...newCurrentItem})
        })

        const onSetScanData = useMemoizedFn(() => {
            if (!dataScanParams) return
            const {https, httpFlowIds, request} = dataScanParams
            const formValue = {
                IsHttps: https,
                httpFlowId: httpFlowIds.length > 0 ? httpFlowIds.join(",") : "",
                IsHttpFlowId: httpFlowIds.length > 0,
                requestType: (httpFlowIds.length > 0
                    ? "httpFlowId"
                    : isEmpty(request)
                    ? "input"
                    : "original") as RequestType,
                IsRawHTTPRequest: isEmpty(request),
                RawHTTPRequest: isEmpty(request) ? new Uint8Array() : request
            }
            const initRawHTTPRequestString = Uint8ArrayToString(formValue.RawHTTPRequest)
            setExtraParamsValue((v) => ({...v, ...formValue}))
            /**Only webfuzzer Enters poc with Data Packet Parameters */
            setInitRawHTTPRequest(initRawHTTPRequestString)
            form.setFieldsValue({
                ...formValue,
                RawHTTPRequest: initRawHTTPRequestString
            })
        })

        /**
         * @First-time Open Function
         * Operate Record by runtimeId
         * */
        const onActionHybridScanByRuntimeId: (runtimeId: string, hybridScanMode: HybridScanModeType) => Promise<null> =
            useMemoizedFn((runtimeId, hybridScanMode) => {
                return new Promise((resolve, reject) => {
                    if (!runtimeId) reject("No Valid runtimeId Set")
                    hybridScanStreamEvent.reset()
                    const action = (mode) => {
                        apiHybridScanByMode(runtimeId, mode, tokenRef.current)
                            .then(() => {
                                hybridScanStreamEvent.start()
                                resolve(null)
                            })
                            .catch(reject)
                    }
                    switch (hybridScanMode) {
                        case "status":
                        case "pause":
                        case "resume":
                            action(hybridScanMode)
                            break
                        case "new":
                            //Retry Fetch Input Module's Value, Use This Value to Create New Task, Logic in Set Input Module(after onInitInputValue)
                            isRetryRef.current = true
                            action("status")
                            break
                        default:
                            resolve(null)
                            break
                    }
                })
            })
        /**Set Initial Value for Input Module */
        const onInitInputValue = useMemoizedFn((value: HybridScanControlAfterRequest) => {
            const inputValue: PluginBatchExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {params} = inputValue
            const isRawHTTPRequest = !!params.HTTPRequestTemplate.IsRawHTTPRequest
            const isHttpFlowId = !!params.HTTPRequestTemplate.IsHttpFlowId
            const httpFlowId = !!params.HTTPRequestTemplate.HTTPFlowId
                ? params.HTTPRequestTemplate.HTTPFlowId.join(",")
                : ""
            // Request Type Added Request ID, Backward Compatible
            const requestType = {
                IsRawHTTPRequest: isRawHTTPRequest,
                IsHttpFlowId: isHttpFlowId,
                httpFlowId,
                requestType: (isHttpFlowId ? "httpFlowId" : isRawHTTPRequest ? "original" : "input") as RequestType
            }
            // Form Data
            const extraForm = {
                ...params.HTTPRequestTemplate,
                ...requestType,
                Proxy: params.Proxy,
                Concurrent: params.Concurrent,
                TotalTimeoutSecond: params.TotalTimeoutSecond
            }
            const initRawHTTPRequestString = Uint8ArrayToString(params.HTTPRequestTemplate.RawHTTPRequest)
            const formValue = {
                Input: params.Input,
                IsHttps: params.HTTPRequestTemplate.IsHttps,
                RawHTTPRequest: initRawHTTPRequestString,
                ...requestType
            }
            form.setFieldsValue({...formValue})
            setExtraParamsValue(extraForm)
            setInitRawHTTPRequest(initRawHTTPRequestString)
            // Retry
            if (isRetryRef.current) {
                isRetryRef.current = false
                onStartExecute(formValue)
            }
            if (onInitInputValueAfter) onInitInputValueAfter(value)
        })
        const getHybridScanParams: (value) => HybridScanControlAfterRequest = useMemoizedFn((value) => {
            // Clear AI Plugin
            const taskParams: PluginBatchExecutorTaskProps = {
                Concurrent: extraParamsValue.Concurrent,
                TotalTimeoutSecond: extraParamsValue.TotalTimeoutSecond,
                Proxy: extraParamsValue.Proxy
            }
            const hTTPFlowId = value.requestType === "httpFlowId" && value.httpFlowId ? value.httpFlowId.split(",") : []
            const params: HybridScanRequest = {
                Input: value.Input,
                ...taskParams,
                HTTPRequestTemplate: {
                    ...extraParamsValue,
                    IsHttps: !!value.IsHttps,
                    IsRawHTTPRequest: value.requestType === "original",
                    IsHttpFlowId: value.requestType === "httpFlowId",
                    HTTPFlowId: hTTPFlowId.map((ele) => Number(ele)).filter((ele) => !!ele),
                    RawHTTPRequest: value.RawHTTPRequest
                        ? Buffer.from(value.RawHTTPRequest, "utf8")
                        : Buffer.from("", "utf8")
                }
            }
            return convertHybridScanParams(params, pluginInfo)
        })
        /**Start Execution */
        const onStartExecute = useMemoizedFn(async (value) => {
            const hybridScanParams: HybridScanControlAfterRequest = {
                ...getHybridScanParams(value),
                HybridScanTaskSource: hybridScanTaskSource
            }
            hybridScanStreamEvent.reset()
            apiHybridScan(hybridScanParams, tokenRef.current).then(() => {
                setIsExpand(false)
                setExecuteStatus("process")
                if (setHidden) setHidden(true)
                hybridScanStreamEvent.start()
            })
        })
        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsVisible(true)
        })
        /**Save Extra Parameters */
        const onSaveExtraParams = useMemoizedFn((v: PluginBatchExecuteExtraFormValue) => {
            setExtraParamsValue((val) => ({...val, ...v}) as PluginBatchExecuteExtraFormValue)
            setExtraParamsVisible(false)
        })
        /**Code Gen */
        const onStopExecute = useMemoizedFn(() => {
            apiCancelHybridScan(tokenRef.current).then(() => {
                setExecuteStatus("finished")
            })
        })
        /**Pause */
        const onPause = useMemoizedFn(() => {
            setPauseLoading(true)
            apiHybridScanByMode(runtimeId, "pause", tokenRef.current)
        })
        /**Continue */
        const onContinue = useMemoizedFn(() => {
            setContinueLoading(true)
            hybridScanStreamEvent.reset()
            apiHybridScanByMode(runtimeId, "resume", tokenRef.current).then(() => {
                hybridScanStreamEvent.start()
            })
        })
        const isExecuting = useCreation(() => {
            if (executeStatus === "process") return true
            if (executeStatus === "paused") return true
            return false
        }, [executeStatus])
        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId
        }, [isExecuting, runtimeId])
        return (
            <>
                <div
                    className={classNames(styles["plugin-batch-execute-form-wrapper"], {
                        [styles["plugin-batch-execute-form-wrapper-hidden"]]: !isExpand
                    })}
                    ref={batchExecuteFormRef}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //Center Input Field
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} Required Field"
                        }}
                        labelWrap={true}
                    >
                        <PluginFixFormParams
                            form={form}
                            disabled={isExecuting}
                            type='batch'
                            rawHTTPRequest={initRawHTTPRequest}
                        />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["plugin-execute-form-operate"]}>
                                {isExecuting ? (
                                    <>
                                        {executeStatus === "paused" && !pauseLoading && (
                                            <YakitButton size='large' onClick={onContinue} loading={continueLoading}>
                                                Continue
                                            </YakitButton>
                                        )}
                                        {(executeStatus === "process" || pauseLoading) && (
                                            <YakitButton size='large' onClick={onPause} loading={pauseLoading}>
                                                Pause
                                            </YakitButton>
                                        )}
                                        <YakitButton
                                            danger
                                            onClick={onStopExecute}
                                            size='large'
                                            disabled={pauseLoading || continueLoading}
                                        >
                                            Exec Plugin Names Array
                                        </YakitButton>
                                    </>
                                ) : (
                                    <>
                                        <YakitButton htmlType='submit' size='large' disabled={selectNum === 0}>
                                            Start Execution
                                        </YakitButton>
                                    </>
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isExecuting}
                                    size='large'
                                >
                                    Extra params
                                </YakitButton>
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {isShowResult && (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey={defaultActiveKey}
                        pluginExecuteResultWrapper={pluginExecuteResultWrapper}
                    />
                )}
                <React.Suspense fallback={<div>loading...</div>}>
                    <PluginBatchExecuteExtraParamsDrawer
                        isRawHTTPRequest={requestType !== "input"}
                        extraParamsValue={extraParamsValue}
                        visible={extraParamsVisible}
                        setVisible={setExtraParamsVisible}
                        onSave={onSaveExtraParams}
                    />
                </React.Suspense>
            </>
        )
    })
)
