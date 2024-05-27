import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {
    ExportParamsProps,
    LocalExtraOperateProps,
    PluginGroupList,
    PluginLocalBackProps,
    PluginsLocalProps
} from "./PluginsLocalType"
import {SolidChevrondownIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import {useMemoizedFn, useInViewport, useDebounceFn, useLatest, useUpdateEffect, useThrottleFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginsLayout, PluginsContainer} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {
    TypeSelect,
    FuncSearch,
    FuncBtn,
    PluginsList,
    FuncFilterPopover,
    ListShowContainer,
    GridLayoutOpt,
    ListLayoutOpt
} from "../funcTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {
    OutlineClouduploadIcon,
    OutlineExportIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useStore} from "@/store"
import {PluginsLocalDetail} from "./PluginsLocalDetail"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {TypeSelectOpt} from "../funcTemplateType"
import {API} from "@/services/swagger/resposeType"
import {Tooltip} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import {
    DeleteLocalPluginsByWhereRequestProps,
    DeleteYakScriptRequestByIdsProps,
    apiDeleteLocalPluginsByWhere,
    apiDeleteYakScriptByIds,
    apiFetchGroupStatisticsLocal,
    apiGetYakScriptByOnlineID,
    apiQueryYakScript,
    apiQueryYakScriptByYakScriptName,
    apiQueryYakScriptTotal,
    convertDeleteLocalPluginsByWhereRequestParams,
    convertLocalPluginsRequestParams,
    excludeNoExistfilter,
    onToEditPlugin
} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import emiter from "@/utils/eventBus/eventBus"
import {PluginLocalUpload, PluginLocalUploadSingle} from "./PluginLocalUpload"
import {YakitRoute} from "@/routes/newRoute"
import {DefaultTypeList, PluginGV, defaultFilter, defaultSearch} from "../builtInData"
import {RemoteGV} from "@/yakitGV"
import {randomString} from "@/utils/randomUtil"
import usePluginUploadHooks, {SaveYakScriptToOnlineRequest} from "../pluginUploadHooks"
import {shallow} from "zustand/shallow"
import {usePageInfo} from "@/store/pageInfo"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {SavePluginInfoSignalProps} from "../editDetails/PluginEditDetails"
import "../plugins.scss"
import styles from "./PluginsLocal.module.scss"
import {PluginLocalExport} from "./PluginLocalExportProps"

const {ipcRenderer} = window.require("electron")

const initExportLocalParams: ExportParamsProps = {
    OutputDir: "",
    YakScriptIds: [],
    Keywords: "",
    Type: "",
    UserName: "",
    Tags: ""
}

export const PluginsLocal: React.FC<PluginsLocalProps> = React.memo((props) => {
    // Get plugin list data - related logic
    /** Is Load More */
    const [loading, setLoading] = useState<boolean>(false)
    /** Plugin Display (List)|Grid) */
    const [isList, setIsList] = useState<boolean>(false)

    const [plugin, setPlugin] = useState<YakScript>()
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)

    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<YakScript[]>([])

    const [pluginGroupList, setPluginGroupList] = useState<PluginGroupList[]>([])

    const [pluginRemoveCheck, setPluginRemoveCheck] = useState<boolean>(false)
    const [removeCheckVisible, setRemoveCheckVisible] = useState<boolean>(false)

    const [uploadLoading, setUploadLoading] = useState<boolean>(false) //Uploading spinner

    const [privateDomain, setPrivateDomain] = useState<string>("") // Execution Complete

    /** Is First Load */
    const isLoadingRef = useRef<boolean>(true)
    const pluginsLocalRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsLocalRef)
    const removePluginRef = useRef<YakScript>()
    const removePluginDetailRef = useRef<YakScript>()
    const filtersDetailRef = useRef<PluginFilterParams>() // Filter condition in details
    const searchDetailRef = useRef<PluginSearchParams>() // Search condition in details
    const taskTokenRef = useRef(randomString(40))
    const uploadPluginRef = useRef<YakScript>() //Upload stored plugin data
    const externalIncomingPluginsRef = useRef<YakScript>() // 1. Plugin Store/My plugin details, click to use passed temp data 2. New plugin/Edit plugin: update local data, refresh list page accordingly

    const latestLoadingRef = useLatest(loading)

    // Check if import performed in details page
    const [importInDetail, setImportInDetail] = useState<boolean>(false)

    // Export local plugin
    const [exportStatusModalVisible, setExportStatusModalVisible] = useState<boolean>(false)
    const [exportParams, setExportParams] = useState<ExportParamsProps>(initExportLocalParams)
    const exportCallbackRef = useRef<() => void>()

    // Selected Plugin Count
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])

    const userInfo = useStore((s) => s.userInfo)
    // Get filter bar display status
    useEffect(() => {
        getRemoteValue(PluginGV.LocalFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
        getPrivateDomainAndRefList()
    }, [])
    useEffect(() => {
        emiter.on("onRefLocalPluginList", onRefLocalPluginList)
        emiter.on("savePluginInfoSignal", onRefPlugin)
        emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        emiter.on("onImportRefLocalPluginList", onImportRefLocalPluginList)
        return () => {
            emiter.off("onRefLocalPluginList", onRefLocalPluginList)
            emiter.off("savePluginInfoSignal", onRefPlugin)
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
            emiter.off("onImportRefLocalPluginList", onImportRefLocalPluginList)
        }
    }, [])
    useEffect(() => {
        getInitTotal()
        getPluginRemoveCheck()
        getPluginGroupListLocal()
    }, [userInfo.isLogin, inViewport])
    // Trigger onChange: userInfo.isLogin, filters; Init request in getPrivateDomainAndRefList
    useUpdateEffect(() => {
        fetchList(true)
    }, [userInfo.isLogin, filters])

    // Exclude deleted filters unexpectedly from plugin list when navigating back
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, pluginGroupList)
        if (updateFilterFlag) {
            setFilters(realFilter)
        }
    }, [filters, pluginGroupList])

    const {pluginLocalPageData, clearDataByRoute} = usePageInfo(
        (s) => ({
            pluginLocalPageData: s.pages?.get(YakitRoute.Plugin_Local) || {
                pageList: [],
                routeKey: "",
                singleNode: true
            },
            clearDataByRoute: s.clearDataByRoute
        }),
        shallow
    )

    /**Fetch latest private domain and refresh list */
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                setPrivateDomain(values.BaseUrl)
                setTimeout(() => {
                    fetchList(true)
                }, 200)
            }
        })
    })
    /**Edit plugin: after saving changes, refresh local list and detail data */
    const onRefPlugin = useMemoizedFn((data: string) => {
        try {
            const pluginInfo: SavePluginInfoSignalProps = JSON.parse(data)
            apiQueryYakScriptByYakScriptName({
                pluginName: pluginInfo.pluginName
            }).then((item: YakScript) => {
                const newItem = {...item, isLocalPlugin: privateDomain !== item.OnlineBaseUrl}
                // Local list sorted by update time; if not present, refresh to see at top of first page
                const index = response.Data.findIndex((ele) => ele.ScriptName === item.ScriptName)
                if (index === -1) {
                    fetchList(true)
                } else {
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...newItem}
                        }
                    })
                }
                if (plugin) {
                    setShowPluginIndex(index)
                    setPlugin({...newItem})
                }
            })
        } catch (error) {}
    })
    const onSetExternalIncomingPluginsRef = useMemoizedFn((item?: YakScript) => {
        externalIncomingPluginsRef.current = item
    })
    /** Pass online UUID to local details for use */
    const onJumpToLocalPluginDetailByUUID = useMemoizedFn((uid?: string) => {
        let uuid = uid
        if (!uuid) {
            const pageList = pluginLocalPageData?.pageList || []
            if (pageList.length === 0) return
            uuid = pageList[0].pageParamsInfo?.pluginLocalPageInfo?.uuid || ""
        }
        if (!uuid) return
        apiGetYakScriptByOnlineID({UUID: uuid})
            .then((item) => {
                const index = response.Data.findIndex((ele) => ele.ScriptName === item.ScriptName)
                if (index === -1) {
                    // NotExist, forcibly add to list
                    dispatch({
                        type: "unshift",
                        payload: {
                            item
                        }
                    })
                    setShowPluginIndex(0)
                } else {
                    //Directly select to jump to details
                    setShowPluginIndex(index)
                }
                onSetExternalIncomingPluginsRef(item)
                setPlugin(item)
            })
            .finally(() => {
                // Clear cache uuid after search, currently only uuid, so clear this route's cache
                clearDataByRoute(YakitRoute.Plugin_Local)
            })
    })

    /**Update list data after successful upload */
    const onUploadSuccess = useMemoizedFn(() => {
        if (uploadPluginRef.current) {
            ipcRenderer
                .invoke("GetYakScriptByName", {Name: uploadPluginRef.current.ScriptName})
                .then((i: YakScript) => {
                    const newItem = {...i, isLocalPlugin: privateDomain !== i.OnlineBaseUrl}
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...newItem}
                        }
                    })
                })
                .catch(() => {
                    fetchList(true)
                    yakitNotify("error", "Failed to query latest local data, auto-refresh list")
                })
        }
    })
    const {onStart: onStartUploadPlugin} = usePluginUploadHooks({
        isSingle: true,
        taskToken: taskTokenRef.current,
        onUploadData: () => {},
        onUploadSuccess: onUploadSuccess,
        onUploadEnd: () => {
            setTimeout(() => {
                setUploadLoading(false)
            }, 200)
        },
        onUploadError: () => {
            yakitNotify("error", "Upload failed")
        }
    })
    const onRefLocalPluginList = useMemoizedFn(() => {
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })

    // Reset conditions for plugin list search
    const resetAllQueryRefLocalList = () => {
        filtersDetailRef.current = undefined
        searchDetailRef.current = undefined
        setFilters(defaultFilter)
        setSearch(cloneDeep(defaultSearch))
        setTimeout(() => {
            getInitTotal()
            getPluginGroupListLocal()
            fetchList(true)
        }, 200)
    }
    // Refresh list when importing plugin outside details page
    const onImportRefLocalPluginList = useMemoizedFn(() => {
        if (!plugin) {
            resetAllQueryRefLocalList()
        } else {
            setImportInDetail(true)
            yakitNotify("success", "Successfully imported local plugin")
        }
    })

    /**Get plugin deletion prompt status */
    const getPluginRemoveCheck = useMemoizedFn(() => {
        getRemoteValue(PluginGV.LocalPluginRemoveCheck).then((data) => {
            setPluginRemoveCheck(data === "true" ? true : false)
        })
    })

    const getInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal().then((res) => {
            setInitTotal(+res.Total)
        })
    })

    /**Fetch group statistics list */
    const getPluginGroupListLocal = useMemoizedFn(() => {
        apiFetchGroupStatisticsLocal().then((res: API.PluginsSearchResponse) => {
            setPluginGroupList(res.data)
        })
    })

    // Real query params for backend, for potential other uses
    const queryFetchList = useRef<QueryYakScriptRequest>()
    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            // if (latestLoadingRef.current) return //Comment Out, Affects More Loading in Details
            if (reset) {
                isLoadingRef.current = true
                onSetExternalIncomingPluginsRef(undefined)
                setShowPluginIndex(0)
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const queryFilters = filtersDetailRef.current ? filtersDetailRef.current : filters
            const querySearch = searchDetailRef.current ? searchDetailRef.current : search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({filter: queryFilters, search: querySearch, pageParams: params})
            }
            if (queryFilters.plugin_group?.length) {
                query.ExcludeTypes = ["yak", "codec"]
            }
            queryFetchList.current = query
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                const newData = res.Data.filter(
                    (ele) => ele.ScriptName !== externalIncomingPluginsRef.current?.ScriptName
                ).map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomain !== ele.OnlineBaseUrl
                }))
                dispatch({
                    type: "add",
                    payload: {
                        response: {
                            ...res,
                            Data: newData
                        }
                    }
                })
                if (+res.Pagination.Page === 1) {
                    setAllCheck(false)
                    setSelectList([])
                    // Plugin store, local plugin page not opened/Use my plugin, load first page data, and prepend cache to array
                    setTimeout(() => {
                        onJumpToLocalPluginDetailByUUID()
                    }, 200)
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run
    // Scroll for More Loading
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })
    const onSetActive = useMemoizedFn((type: TypeSelectOpt[]) => {
        const newType: API.PluginsSearchData[] = type.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, plugin_type: newType})
    })
    /**Fixes failure to iterate load_content on missing older version data */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

    // Current plugin display sequence
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    /** Single-Select|Deselect */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // Fetch loading char with regex
        if (allCheck) {
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllCheck(false)
            return
        }
        // No history fetched if CS or vuln unselected by user
        if (value) setSelectList([...selectList, data])
        else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
    })

    /** Extra Params Modal */
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })
    /** Extra action component per item */
    const optExtraNode = useMemoizedFn((data: YakScript) => {
        return (
            <LocalExtraOperate
                data={data}
                isOwn={userInfo.user_id === +data.UserId || +data.UserId === 0}
                onRemovePlugin={() => onRemovePluginBefore(data)}
                onExportPlugin={() => onExportPlugin(data)}
                onUploadPlugin={() => onUploadPlugin(data)}
            />
        )
    })

    /** Upload */
    const onUploadPlugin = useMemoizedFn(async (data: YakScript) => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "Upload plugin after login")
            return
        }
        uploadPluginRef.current = data
        // Use isLocalPlugin to determine
        if (data.OnlineBaseUrl === privateDomain) {
            const params: SaveYakScriptToOnlineRequest = {
                ScriptNames: [data.ScriptName],
                IsPrivate: !!data.OnlineIsPrivate
            }
            setUploadLoading(true)
            onStartUploadPlugin(params)
        } else {
            const m = showYakitModal({
                type: "white",
                title: "Upload Plugin",
                content: (
                    <PluginLocalUploadSingle
                        plugin={data}
                        onUploadSuccess={onUploadSuccess}
                        onClose={() => {
                            m.destroy()
                        }}
                    />
                ),
                footer: null
            })
        }
    })

    /**Export */
    const onExportPlugin = useMemoizedFn((data: YakScript) => {
        onExport([data.Id])
    })
    /**Pre-delete plugin operation  */
    const onRemovePluginBefore = useMemoizedFn((data: YakScript) => {
        removePluginRef.current = data
        if (pluginRemoveCheck) {
            onRemovePluginSingle(data)
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /** Single Item Callback */
    const optClick = useMemoizedFn((data: YakScript, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })
    /**Create New Plugin */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Local}})
        )
    })
    const onBack = useMemoizedFn((backValues: PluginLocalBackProps) => {
        searchDetailRef.current = undefined
        filtersDetailRef.current = undefined
        setPlugin(undefined)
        if (importInDetail) {
            setAllCheck(false)
            setSelectList([])
            setImportInDetail(false)
            resetAllQueryRefLocalList()
        } else {
            setSearch(backValues.search)
            setFilters(backValues.filter)
            setAllCheck(backValues.allCheck)
            setSelectList(backValues.selectList)
        }
    })
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })
    const pluginTypeSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.plugin_type?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.plugin_type])
    /**Pre-batch delete operation  */
    const onRemovePluginBatchBefore = useMemoizedFn(() => {
        if (pluginRemoveCheck) {
            onRemovePluginBatch()
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /**Batch delete */
    const onRemovePluginBatch = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            if (allCheck) {
                //Delete all with conditions
                const deleteAllParams: DeleteLocalPluginsByWhereRequestProps = {
                    ...convertDeleteLocalPluginsByWhereRequestParams(filters, search)
                }
                await apiDeleteLocalPluginsByWhere(deleteAllParams)
            } else {
                // Batch delete
                let deleteBatchParams: DeleteYakScriptRequestByIdsProps = {
                    Ids: (selectList || []).map((ele) => ele.Id)
                }
                await apiDeleteYakScriptByIds(deleteBatchParams)
            }
        } catch (error) {}
        setRemoveCheckVisible(false)
        setSelectList([])
        if (allCheck) {
            setAllCheck(false)
        }
        getInitTotal()
        getPluginGroupListLocal()
        setRemoteValue(PluginGV.LocalPluginRemoveCheck, `${pluginRemoveCheck}`)
        setRemoveLoading(false)
        fetchList(true)
    })
    /**Delete confirmation dialog */
    const onPluginRemoveCheckOk = useMemoizedFn(() => {
        if (removePluginDetailRef.current) {
            onRemovePluginDetailSingle(removePluginDetailRef.current)
            return
        }
        if (removePluginRef.current) {
            onRemovePluginSingle(removePluginRef.current)
            return
        }
        onRemovePluginBatch()
    })
    /**Delete single from list */
    const onRemovePluginSingle = useMemoizedFn((data: YakScript) => {
        onRemovePluginSingleBase(data).then(() => {
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        })
    })
    /**Single delete basic */
    const onRemovePluginSingleBase = useMemoizedFn((data: YakScript) => {
        let deleteParams: DeleteYakScriptRequestByIdsProps = {
            Ids: [data.Id]
        }
        return new Promise<void>((resolve, reject) => {
            apiDeleteYakScriptByIds(deleteParams)
                .then(() => {
                    const index = selectList.findIndex((ele) => ele.ScriptName === data.ScriptName)
                    if (index !== -1) {
                        optCheck(data, false)
                    }
                    removePluginRef.current = undefined
                    removePluginDetailRef.current = undefined
                    setRemoveCheckVisible(false)
                    getInitTotal()
                    getPluginGroupListLocal()
                    setRemoteValue(PluginGV.LocalPluginRemoveCheck, `${pluginRemoveCheck}`)
                    resolve()
                })
                .catch(reject)
        })
    })

    const onExport = useMemoizedFn(async (Ids: number[], callback?: () => void) => {
        try {
            const showSaveDialogRes = await ipcRenderer.invoke("openDialog", {properties: ["openDirectory"]})
            if (showSaveDialogRes.canceled) return
            if (queryFetchList.current) {
                const params: ExportParamsProps = {
                    OutputDir: showSaveDialogRes.filePaths[0],
                    YakScriptIds: Ids,
                    Keywords: queryFetchList.current.Keyword || "",
                    Type: queryFetchList.current.Type || "",
                    UserName: queryFetchList.current.UserName || "",
                    Tags: queryFetchList.current.Tag + ""
                }
                setExportParams(params)
                setExportStatusModalVisible(true)
                exportCallbackRef.current = callback
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    })
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    const onRemovePluginDetailSingleBefore = useMemoizedFn((data: YakScript) => {
        removePluginDetailRef.current = data
        if (pluginRemoveCheck) {
            onRemovePluginDetailSingle(data)
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /**Delete called in details */
    const onRemovePluginDetailSingle = useMemoizedFn((data) => {
        setRemoveLoading(true)
        onRemovePluginSingleBase(data)
            .then(() => {
                if (response.Data.length === 1) {
                    // If last item deleted, return to empty list page
                    setPlugin(undefined)
                } else {
                    const index = response.Data.findIndex((ele) => ele.ScriptName === data.ScriptName)
                    if (index === -1) return
                    if (index === Number(response.Total) - 1) {
                        // If selected item is last, select second to last after deletion
                        setPlugin({
                            ...response.Data[index - 1]
                        })
                    } else {
                        //Select Next
                        setPlugin({
                            ...response.Data[index + 1]
                        })
                    }
                }
                dispatch({
                    type: "remove",
                    payload: {
                        itemList: [data]
                    }
                })
            })
            .finally(() =>
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            )
    })
    /** Detail Search Event */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        searchDetailRef.current = detailSearch
        filtersDetailRef.current = detailFilter
        fetchList(true)
    })
    // /**Batch delete in details */
    // const onDetailsBatchRemove = useMemoizedFn((newParams: PluginLocalDetailBackProps) => {
    //     setAllCheck(newParams.allCheck)
    //     setFilters(newParams.filter)
    //     setSearch(newParams.search)
    //     setSelectList(newParams.selectList)
    //     setTimeout(() => {
    //         onRemovePluginBatchBefore()
    //     }, 200)
    // })
    const onBatchUpload = useMemoizedFn((selectScriptNameList: string[]) => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "Upload after login")
            return
        }
        if (selectScriptNameList.length === 0) return
        const m = showYakitModal({
            type: "white",
            title: "Batch upload plugins",
            content: (
                <PluginLocalUpload
                    pluginNames={selectScriptNameList}
                    onClose={() => {
                        m.destroy()
                        setTimeout(() => {
                            fetchList(true)
                        }, 200)
                    }}
                />
            ),
            footer: null,
            modalAfterClose: () => {
                onCheck(false)
            }
        })
    })
    const onDetailsBatchUpload = useMemoizedFn((names) => {
        onBatchUpload(names)
    })
    const onDetailsBatchSingle = useMemoizedFn((plugin: YakScript) => {
        onUploadPlugin(plugin)
    })
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(PluginGV.LocalFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })
    /**Refresh on initial empty data: button, list, initial total, and group data */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        getPluginGroupListLocal()
    })
    return (
        <>
            {!!plugin && (
                <PluginsLocalDetail
                    pageWrapId='plugins-local-detail'
                    info={plugin}
                    defaultAllCheck={allCheck}
                    loading={loading}
                    defaultSelectList={selectList}
                    response={response}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                    defaultSearchValue={search}
                    defaultFilter={filters}
                    dispatch={dispatch}
                    onRemovePluginDetailSingleBefore={onRemovePluginDetailSingleBefore}
                    onDetailExport={onExport}
                    onDetailSearch={onDetailSearch}
                    spinLoading={loading && isLoadingRef.current}
                    // onDetailsBatchRemove={onDetailsBatchRemove}
                    onDetailsBatchUpload={onDetailsBatchUpload}
                    onDetailsBatchSingle={onDetailsBatchSingle}
                    currentIndex={showPluginIndex.current}
                    setCurrentIndex={setShowPluginIndex}
                    removeLoading={removeLoading}
                    onJumpToLocalPluginDetailByUUID={onJumpToLocalPluginDetailByUUID}
                    uploadLoading={uploadLoading}
                    privateDomain={privateDomain}
                />
            )}
            <PluginsLayout
                pageWrapId='plugins-local'
                title='Local Plugins'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginTypeSelect} list={DefaultTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper' ref={pluginsLocalRef}>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            <FuncFilterPopover
                                maxWidth={1200}
                                icon={<SolidChevrondownIcon />}
                                name='Batch Operation'
                                disabled={selectNum === 0}
                                button={{
                                    type: "outline2",
                                    size: "large"
                                }}
                                menu={{
                                    type: "primary",
                                    data: [
                                        {key: "export", label: "Export"},
                                        {key: "upload", label: "Upload", disabled: allCheck},
                                        {key: "remove", label: "Delete"}
                                    ],
                                    onClick: ({key}) => {
                                        switch (key) {
                                            case "export":
                                                const Ids: number[] = selectList.map((ele) => Number(ele.Id))
                                                onExport(Ids)
                                                break
                                            case "upload":
                                                const pluginNames = selectList.map((ele) => ele.ScriptName) || []
                                                onBatchUpload(pluginNames)
                                                break
                                            case "remove":
                                                onRemovePluginBatchBefore()
                                                break
                                            default:
                                                return
                                        }
                                    }
                                }}
                                placement='bottomRight'
                            />
                            <FuncBtn
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='Create New Plugin'
                                onClick={onNewAddPlugin}
                            />
                        </div>
                    </div>
                }
            >
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={onSetShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
                    onSelect={setFilters}
                    groupList={pluginGroupList.map((item) => {
                        if (item.groupKey === "plugin_group") {
                            item.groupExtraOptBtn = (
                                <>
                                    <YakitButton
                                        type='text'
                                        onClick={() =>
                                            emiter.emit(
                                                "menuOpenPage",
                                                JSON.stringify({route: YakitRoute.Plugin_Groups})
                                            )
                                        }
                                    >
                                        Manage Groups
                                    </YakitButton>
                                    <div className={styles["divider-style"]} />
                                </>
                            )
                        }
                        return item
                    })}
                >
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.Total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={onSetShowFilter}
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakScript>
                                id='local'
                                isList={isList}
                                data={response.Data || []}
                                gridNode={(info: {index: number; data: YakScript}) => {
                                    const {index, data} = info
                                    const check = allCheck || checkList.includes(data.ScriptName)
                                    return (
                                        <GridLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            title={data.ScriptName}
                                            type={data.Type}
                                            tags={data.Tags}
                                            help={data.Help || ""}
                                            img={data.HeadImg || ""}
                                            user={data.Author || ""}
                                            isCorePlugin={!!data.IsCorePlugin}
                                            official={!!data.OnlineOfficial}
                                            prImgs={(data.CollaboratorInfo || []).map((ele) => ele.HeadImg)}
                                            time={data.UpdatedAt || 0}
                                            extraFooter={optExtraNode}
                                            subTitle={optSubTitle}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakScript}) => {
                                    const {index, data} = info
                                    const check = allCheck || checkList.includes(data.ScriptName)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.HeadImg || ""}
                                            title={data.ScriptName}
                                            help={data.Help || ""}
                                            time={data.UpdatedAt || 0}
                                            type={data.Type}
                                            isCorePlugin={!!data.IsCorePlugin}
                                            official={!!data.OnlineOfficial}
                                            extraNode={optExtraNode}
                                            onClick={optClick}
                                            subTitle={optSubTitle}
                                        />
                                    )
                                }}
                                listHeight={73}
                                loading={loading}
                                hasMore={hasMore}
                                updateList={onUpdateList}
                                isShowSearchResultEmpty={+response.Total === 0}
                                showIndex={showPluginIndex.current}
                                setShowIndex={setShowPluginIndex}
                                keyName='ScriptName'
                            />
                        ) : (
                            <div className={styles["plugin-local-empty"]}>
                                <YakitEmpty
                                    title='No Data Available'
                                    description='Create new plugin to sync with cloud, make your own'
                                    style={{marginTop: 80}}
                                />
                                <div className={styles["plugin-local-buttons"]}>
                                    <YakitButton type='outline1' icon={<OutlinePlusIcon />} onClick={onNewAddPlugin}>
                                        Create New Plugin
                                    </YakitButton>
                                    <YakitButton
                                        type='outline1'
                                        icon={<OutlineRefreshIcon />}
                                        onClick={onRefListAndTotalAndGroup}
                                    >
                                        Refresh
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </PluginsList>
                </PluginsContainer>
            </PluginsLayout>
            <YakitHint
                visible={removeCheckVisible}
                title='Confirm plugin deletion'
                content='Plugin deleted permanently after confirmation'
                onOk={onPluginRemoveCheckOk}
                onCancel={() => setRemoveCheckVisible(false)}
                footerExtra={
                    <YakitCheckbox checked={pluginRemoveCheck} onChange={(e) => setPluginRemoveCheck(e.target.checked)}>
                        Do not remind again
                    </YakitCheckbox>
                }
            />
            <PluginLocalExport
                visible={exportStatusModalVisible}
                getContainer={
                    document.getElementById(!!plugin ? "plugins-local-detail" : "plugins-local") || document.body
                }
                exportLocalParams={exportParams}
                onClose={() => {
                    setExportStatusModalVisible(false)
                    setExportParams(initExportLocalParams)
                    const callback = exportCallbackRef.current
                    callback && callback()
                    onCheck(false)
                }}
            ></PluginLocalExport>
        </>
    )
})

export const LocalExtraOperate: React.FC<LocalExtraOperateProps> = React.memo((props) => {
    const {data, isOwn, onRemovePlugin, onExportPlugin, onUploadPlugin} = props
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const onRemove = useMemoizedFn(async (e) => {
        e.stopPropagation()
        setRemoveLoading(true)
        try {
            await onRemovePlugin()
        } catch (error) {}
        setTimeout(() => {
            setRemoveLoading(false)
        }, 200)
    })
    const onExport = useMemoizedFn((e) => {
        e.stopPropagation()
        onExportPlugin()
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        onToEditPlugin(data)
    })
    const onUpload = useMemoizedFn(async (e) => {
        e.stopPropagation()

        setUploadLoading(true)
        try {
            await onUploadPlugin()
        } catch (error) {}
        setTimeout(() => {
            setUploadLoading(false)
        }, 200)
    })
    const isShowUpload = useMemo(() => {
        if (!!data.IsCorePlugin) return false
        // if (isLocalPlugin) return true

        return !!data.isLocalPlugin
    }, [data.isLocalPlugin, data.IsCorePlugin, isOwn])
    return (
        <div className={styles["local-extra-operate-wrapper"]}>
            {removeLoading ? (
                <LoadingOutlined className={styles["loading-icon"]} />
            ) : (
                <Tooltip title='Delete' destroyTooltipOnHide={true}>
                    <YakitButton type='text2' icon={<OutlineTrashIcon onClick={onRemove} />} />
                </Tooltip>
            )}
            <div className='divider-style' />
            <Tooltip title='Export' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlineExportIcon onClick={onExport} />} />
            </Tooltip>
            <div className='divider-style' />
            <Tooltip title='Edit' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlinePencilaltIcon onClick={onEdit} />} />
            </Tooltip>
            {isShowUpload && (
                <>
                    <div className='divider-style' />
                    <YakitButton
                        icon={<OutlineClouduploadIcon />}
                        onClick={onUpload}
                        className={styles["cloud-upload-icon"]}
                        loading={uploadLoading}
                    >
                        Upload
                    </YakitButton>
                </>
            )}
        </div>
    )
})
