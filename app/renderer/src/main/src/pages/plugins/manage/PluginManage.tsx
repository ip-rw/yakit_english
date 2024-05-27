import React, {memo, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {PluginsContainer, PluginsLayout, statusTag} from "../baseTemplate"
import {
    AuthorImg,
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {TypeSelectOpt} from "../funcTemplateType"
import {
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlinePencilaltIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceFn, useGetState, useInViewport, useLatest, useLockFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {BackInfoProps, DetailRefProps, PluginManageDetail} from "./PluginManageDetail"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDeletePluginCheck,
    apiDownloadPluginCheck,
    apiFetchCheckList,
    apiFetchGroupStatisticsCheck,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams,
    excludeNoExistfilter
} from "../utils"
import {isCommunityEdition, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {NetWorkApi} from "@/services/fetch"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {DefaultStatusList, PluginGV, defaultPagemeta, defaultSearch} from "../builtInData"
import {useStore} from "@/store"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {PluginGroupList} from "../local/PluginsLocalType"

interface PluginManageProps {}

export const PluginManage: React.FC<PluginManageProps> = (props) => {
    // Check if page is visible to user
    const layoutRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(layoutRef)
    // Search filters
    const [initTotal, setInitTotal] = useState<number>(0)
    const getInitTotal = useMemoizedFn(() => {
        apiFetchCheckList({page: 1, limit: 50}).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    // Refresh counts & filters when visible
    useUpdateEffect(() => {
        getInitTotal()
        onInit(true)
    }, [inViewPort])

    // User Info
    const {userInfo} = useStore()

    // Get plugin list data logic
    /** Is load more */
    const [loading, setLoading] = useGetState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    /** Is initial load */
    const isLoadingRef = useRef<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    // Get filter bar visibility
    useEffect(() => {
        getRemoteValue(PluginGV.AuditFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
    }, [])
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(PluginGV.AuditFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })

    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
        status: [],
        tags: [],
        plugin_group: []
    })
    /** Homepage review status selection */
    const pluginStatusSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.status?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.status])
    const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [hasMore, setHasMore] = useState<boolean>(true)

    // Fetch plugin list data
    const fetchList = useDebounceFn(
        useMemoizedFn((reset?: boolean) => {
            // Skip search on detail page return
            if (isDetailBack.current) {
                isDetailBack.current = false
                return
            }

            if (latestLoadingRef.current) return
            if (reset) {
                isLoadingRef.current = true
                onCheck(false)
                setShowPluginIndex(0)
            }

            setLoading(true)
            const params: PluginListPageMeta = !!reset
                ? {...defaultPagemeta}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }
            // API request parameters
            const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, params)}

            apiFetchCheckList(query)
                .then((res) => {
                    if (!res.data) res.data = []
                    dispatch({
                        type: "add",
                        payload: {
                            response: {...res}
                        }
                    })

                    const dataLength = +res.pagemeta.page === 1 ? res.data : response.data.concat(res.data)
                    const isMore = res.data.length < res.pagemeta.limit || dataLength.length >= res.pagemeta.total
                    setHasMore(!isMore)

                    isLoadingRef.current = false
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                })
        }),
        {wait: 300}
    ).run

    const [pluginFilters, setPluginFilters] = useState<PluginGroupList[]>([])
    // Get all filter stats
    const fetchPluginFilters = useMemoizedFn(() => {
        apiFetchGroupStatisticsCheck().then((res) => {
            setPluginFilters(res.data)
        })
    })

    /**
     * @name init data
     * @param noRefresh do not refresh list on init
     */
    const onInit = useMemoizedFn((noRefresh?: boolean) => {
        fetchPluginFilters()
        if (!noRefresh) fetchList(true)
    })

    // Initial list request on page load
    useEffect(() => {
        getInitTotal()
        onInit()
    }, [])
    // Scroll for More Loading
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })

    // Keywords|Author search
    const onKeywordAndUser = useMemoizedFn((value: PluginSearchParams) => {
        fetchList(true)
    })

    // Selected plugin UUID collection
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, pluginFilters)
        if (updateFilterFlag) {
            setFilters(realFilter)
        }
    }, [filters, pluginFilters])

    // Group management visibility
    useUpdateEffect(() => {
        fetchList(true)
    }, [filters])
    const onFilter = useMemoizedFn((value: Record<string, API.PluginsSearchData[]>) => {
        setFilters({...value})
    })
    const onSetActive = useMemoizedFn((status: TypeSelectOpt[]) => {
        const newStatus: API.PluginsSearchData[] = status.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, status: newStatus})
    })

    // ----- Selected plugins -----
    const [allCheck, setAllcheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<YakitPluginOnlineDetail[]>([])
    // Selected Plugin UUIDs
    const selectUUIDs = useMemo(() => {
        return getSelectList().map((item) => item.uuid)
    }, [selectList])
    // Selected Plugin Count
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    // Fixes failure to iterate load_content on missing older version data|Deselect all
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllcheck(value)
    })

    // Clear selection & refresh list
    const onClearSelecteds = useMemoizedFn(() => {
        if (allCheck) setAllcheck(false)
        setSelectList([])
        onInit()
    })

    /** Get info for individual plugin delete */
    const showAuthState = useMemo(() => {
        if (userInfo.role === "superAdmin") {
            if (isCommunityEdition()) return true
            else return false
        }
        if (userInfo.role === "admin") {
            if (isCommunityEdition()) return true
            if (isEnpriTrace()) return true
            if (isEnpriTraceAgent()) return true
            return false
        }
        return false
    }, [userInfo.role])
    /** Batch modify plugin authors */
    const [showModifyAuthor, setShowModifyAuthor] = useState<boolean>(false)
    const onShowModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(true)
    })
    const onModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(false)
        onCheck(false)
        fetchList(true)
    })

    /** Batch download plugins */
    const [showBatchDownload, setShowBatchDownload] = useState<boolean>(false)
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    // Batch download (method shared by homepage & detail page))
    const onBatchDownload = useMemoizedFn((newParams?: BackInfoProps) => {
        // Selected plugin count
        let selectTotal: number = selectNum
        // Selected plugin UUIDs
        let selectUuids: string[] = [...selectUUIDs]
        // Search Content
        let downloadSearch: PluginSearchParams = {...searchs}
        // Selected total
        let downloadFilter: PluginFilterParams = {...filters}

        if (newParams) {
            selectTotal = newParams.allCheck ? response.pagemeta.total : newParams.selectList.length
            selectUuids = newParams.selectList.map((item) => item.uuid)
            downloadSearch = {...newParams.search}
            downloadFilter = {...newParams.filter}
        }

        if (selectTotal === 0) {
            // Download all
            setShowBatchDownload(true)
        } else {
            // Batch download
            let downloadRequest: DownloadOnlinePluginsRequest = {}
            if (allCheck) {
                downloadRequest = {...convertDownloadOnlinePluginBatchRequestParams(downloadFilter, downloadSearch)}
            } else {
                downloadRequest = {
                    UUID: selectUuids
                }
            }
            if (downloadLoading) return
            setDownloadLoading(true)
            apiDownloadPluginCheck(downloadRequest)
                .then(() => {
                    onCheck(false)
                })
                .finally(() => {
                    setTimeout(() => {
                        setDownloadLoading(false)
                    }, 200)
                })
        }
    })
    /** Home page, individual delete */
    const onDownload = useLockFn(async (value: YakitPluginOnlineDetail) => {
        let downloadRequest: DownloadOnlinePluginsRequest = {
            UUID: [value.uuid]
        }

        apiDownloadPluginCheck(downloadRequest).then(() => {})
    })

    /** Batch delete plugins */
    // Reason window (delete|Rejected)
    const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
        visible: false,
        type: "nopass"
    })
    // Single plugin delete
    const activeDelPlugin = useRef<YakitPluginOnlineDetail>()
    const onShowDelPlugin = useMemoizedFn(() => {
        setShowReason({visible: true, type: "del"})
    })
    const onCancelReason = useMemoizedFn(() => {
        activeDelPlugin.current = undefined
        activeDetailData.current = undefined
        setShowReason({visible: false, type: "nopass"})
    })
    // Search content
    const apiDelPlugins = useMemoizedFn(
        (params?: API.PluginsWhereDeleteRequest, thenCallback?: () => any, catchCallback?: () => any) => {
            apiDeletePluginCheck(params)
                .then(() => {
                    if (thenCallback) thenCallback()
                })
                .catch((e) => {
                    if (detailRef && detailRef.current) {
                        detailRef.current.onDelCallback([], false)
                    }
                    if (catchCallback) catchCallback()
                })
        }
    )
    // Filter condition search|Clear|Single|Shared delete method in detail)
    const onReasonCallback = useMemoizedFn((reason: string) => {
        const type = showReason.type

        // Is all selected
        let delAllCheck: boolean = allCheck
        // Selected plugin count
        let selectTotal: number = selectNum
        // Selected plugin UUIDs
        let selectUuids: string[] = [...selectUUIDs]
        // Search Content
        let delSearch: PluginSearchParams = {...searchs}
        // Selected total
        let delFilter: PluginFilterParams = {...filters}

        // If from detail page callback
        if (activeDetailData.current) {
            delAllCheck = activeDetailData.current.allCheck
            selectTotal = activeDetailData.current.allCheck
                ? response.pagemeta.total
                : activeDetailData.current.selectList.length
            selectUuids = activeDetailData.current.selectList.map((item) => item.uuid)
            delSearch = {...activeDetailData.current.search}
            delFilter = {...activeDetailData.current.filter}
        }

        // Fetch Plugin Info
        const onlyPlugin: YakitPluginOnlineDetail | undefined = activeDelPlugin.current
        onCancelReason()

        // Remove plugin logic
        if (type === "del") {
            // Clear action (ignores search conditions))
            if (selectTotal === 0 && !onlyPlugin) {
                apiDelPlugins({description: reason}, () => {
                    setSearchs({...delSearch})
                    setFilters({...delFilter})
                    onClearSelecteds()
                    if (!!plugin) setPlugin(undefined)
                })
            }
            // Delete single
            else if (!!onlyPlugin) {
                let delRequest: API.PluginsWhereDeleteRequest = {uuid: [onlyPlugin.uuid]}
                apiDelPlugins({...delRequest, description: reason}, () => {
                    // Current

                    const next: YakitPluginOnlineDetail = response.data[showPluginIndex.current + 1]
                    dispatch({
                        type: "remove",
                        payload: {
                            itemList: [onlyPlugin]
                        }
                    })

                    if (!!plugin) {
                        // Send delete result back to detail page
                        if (detailRef && detailRef.current) {
                            detailRef.current.onDelCallback([onlyPlugin], true)
                        }
                        setPlugin({...next})
                    } else {
                        // Plugin delete collection API
                        const index = selectUUIDs.findIndex((item) => item === onlyPlugin?.uuid)
                        if (index > -1) {
                            optCheck(onlyPlugin, false)
                        }
                    }
                    onInit(true)
                })
            }
            // Batch delete
            // Exclude accidentally deleted filters when switched to page
            else if (!activeDelPlugin.current) {
                let delRequest: API.PluginsWhereDeleteRequest = {}
                if (delAllCheck) {
                    delRequest = {...convertPluginsRequestParams(delFilter, delSearch), description: reason}
                } else {
                    delRequest = {uuid: selectUuids, description: reason}
                }
                apiDelPlugins(delRequest, () => {
                    setSearchs({...delSearch})
                    setFilters({...delFilter})
                    onClearSelecteds()
                    // Previous detail page logic
                    if (!!plugin) setPlugin(undefined)
                })
            }
        }
    })

    /** Plugin Display (List)|Grid) */
    const [isList, setIsList] = useState<boolean>(false)

    // Current plugin display sequence
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    /** Group Display Management */
    const magGroupState = useMemo(() => {
        if (["admin", "superAdmin"].includes(userInfo.role || "")) return true
        else return false
    }, [userInfo.role])

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail | undefined>()

    // Single item operations & display logic
    /** Single-Select|Deselect */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        // Fetch loading char with regex
        if (allCheck) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllcheck(false)
            return
        }
        // No history fetched if CS or vuln unselected by user
        if (value) setSelectList([...getSelectList(), data])
        else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
    })
    /** Extra Params Modal */
    const optSubTitle = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return statusTag[`${data.status}`]
    })
    /** Single item extra operations */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return (
            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                menu={{
                    data: [
                        {
                            key: "download",
                            label: "Download",
                            itemIcon: <OutlineClouddownloadIcon />
                        },
                        {type: "divider"},
                        {
                            key: "del",
                            label: "Delete",
                            type: "danger",
                            itemIcon: <OutlineTrashIcon />
                        }
                    ],
                    className: styles["func-filter-dropdown-menu"],
                    onClick: ({key}) => {
                        switch (key) {
                            case "del":
                                activeDelPlugin.current = data
                                setShowReason({visible: true, type: "del"})
                                return
                            case "download":
                                onDownload(data)
                                return
                            default:
                                return
                        }
                    }
                }}
                button={{
                    type: "text2"
                }}
                placement='bottomRight'
            />
        )
    })
    /** Single Item Callback */
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })

    // Detail page callback logic
    const detailRef = useRef<DetailRefProps>(null)
    // Auto-return to homepage after successful batch delete in details
    const isDetailBack = useRef<boolean>(false)
    /** Back event */
    const onBack = useMemoizedFn((data: BackInfoProps) => {
        isDetailBack.current = true
        setPlugin(undefined)
        setAllcheck(data.allCheck)
        setSelectList(data.selectList)
        setSearchs(data.search)
        setFilters(data.filter)
    })
    /** Search event */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        setSearchs({...detailSearch})
        // Delay to ensure search gets latest conditions
        setTimeout(() => {
            setFilters({...detailFilter})
        }, 100)
    })
    /** Modify author button visibility */
    const activeDetailData = useRef<BackInfoProps>()
    const onDetailDel = useMemoizedFn((detail: YakitPluginOnlineDetail | undefined, data: BackInfoProps) => {
        activeDelPlugin.current = detail
        activeDetailData.current = {...data}
        onShowDelPlugin()
    })
    /**Refresh button on empty initial data, refresh list & init total and group data */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        fetchPluginFilters()
    })
    return (
        <div ref={layoutRef} className={styles["plugin-manage-layout"]}>
            {!!plugin && (
                <PluginManageDetail
                    ref={detailRef}
                    spinLoading={isLoadingRef.current && loading}
                    listLoading={loading}
                    response={response}
                    dispatch={dispatch}
                    info={plugin}
                    defaultAllCheck={allCheck}
                    defaultSelectList={selectList}
                    defaultSearch={searchs}
                    defaultFilter={filters}
                    downloadLoading={downloadLoading}
                    onBatchDownload={onBatchDownload}
                    onPluginDel={onDetailDel}
                    currentIndex={showPluginIndex.current}
                    setCurrentIndex={setShowPluginIndex}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                    onDetailSearch={onDetailSearch}
                />
            )}

            <PluginsLayout
                title='Plugin Mgmt'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginStatusSelect} list={DefaultStatusList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch maxWidth={1000} value={searchs} onSearch={onKeywordAndUser} onChange={setSearchs} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            {showAuthState && (
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlinePencilaltIcon />}
                                    disabled={selectNum === 0 && !allCheck}
                                    type='outline2'
                                    size='large'
                                    name={"Modify author"}
                                    onClick={onShowModifyAuthor}
                                />
                            )}
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                loading={downloadLoading}
                                name={selectNum > 0 ? "Download" : "One-click download"}
                                onClick={() => onBatchDownload()}
                                disabled={initTotal === 0}
                            />
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineTrashIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "Delete" : "Clear"}
                                onClick={onShowDelPlugin}
                                disabled={initTotal === 0}
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
                    onSelect={onFilter}
                    groupList={pluginFilters.map((item) => {
                        if (item.groupKey === "plugin_group") {
                            item.groupExtraOptBtn = magGroupState ? (
                                <>
                                    <YakitButton
                                        type='text'
                                        onClick={() =>
                                            emiter.emit(
                                                "openPage",
                                                JSON.stringify({
                                                    route: YakitRoute.Plugin_Groups,
                                                    params: {pluginGroupType: "online"}
                                                })
                                            )
                                        }
                                    >
                                        Manage Groups
                                    </YakitButton>
                                    <div className={styles["divider-style"]} />
                                </>
                            ) : (
                                <></>
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
                        total={response.pagemeta.total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={onSetShowFilter}
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                id='pluginManage'
                                isList={isList}
                                data={response.data}
                                gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectUUIDs.includes(data.uuid)
                                    return (
                                        <GridLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            title={data.script_name}
                                            type={data.type}
                                            tags={data.tags}
                                            help={data.help || ""}
                                            img={data.head_img || ""}
                                            user={data.authors || ""}
                                            prImgs={(data.collaborator || []).map((ele) => ele.head_img)}
                                            time={data.updated_at}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={data.official}
                                            subTitle={optSubTitle}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectUUIDs.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.head_img}
                                            title={info.index + data.script_name}
                                            help={data.help || ""}
                                            time={data.updated_at}
                                            type={""}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={data.official}
                                            subTitle={optSubTitle}
                                            extraNode={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                listHeight={73}
                                loading={loading}
                                hasMore={hasMore}
                                updateList={onUpdateList}
                                showIndex={showPluginIndex.current}
                                setShowIndex={setShowPluginIndex}
                                isShowSearchResultEmpty={+response.pagemeta.total === 0}
                            />
                        ) : (
                            <div className={styles["plugin-manage-empty"]}>
                                <YakitEmpty title='No Data Available' />

                                <div className={styles["plugin-manage-buttons"]}>
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

            <ModifyAuthorModal
                visible={showModifyAuthor}
                setVisible={setShowModifyAuthor}
                plugins={selectUUIDs}
                onOK={onModifyAuthor}
            />
            <ReasonModal
                visible={showReason.visible}
                setVisible={onCancelReason}
                type={showReason.type}
                total={!!activeDelPlugin.current ? 1 : selectNum || response.pagemeta.total}
                onOK={onReasonCallback}
            />
            {showBatchDownload && (
                <YakitGetOnlinePlugin
                    listType='check'
                    visible={showBatchDownload}
                    setVisible={(v) => {
                        setShowBatchDownload(v)
                    }}
                />
            )}
        </div>
    )
}

interface ModifyAuthorModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    plugins: string[]
    onOK: () => any
}
/** @name batch modify plugin authors */
const ModifyAuthorModal: React.FC<ModifyAuthorModalProps> = memo((props) => {
    const {visible, setVisible, plugins, onOK} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [list, setList] = useState<API.UserList[]>([])
    const [value, setValue] = useState<number>()
    const onsearch = useDebounceFn(
        (value?: string) => {
            if (!value) {
                setList([])
                return
            }
            if (loading) return

            setLoading(true)
            NetWorkApi<{keywords: string}, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {keywords: value}
            })
                .then((res) => {
                    setList(res?.data || [])
                })
                .catch((err) => {
                    yakitNotify("error", "Get Ordinary User Failed：" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
        },
        {
            wait: 500
        }
    ).run

    const [submitLoading, setSubmitLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<"" | "error">("")
    const submit = useMemoizedFn(() => {
        if (!value) {
            setStatus("error")
            return
        }

        setSubmitLoading(true)
        NetWorkApi<API.UpPluginsUserRequest, API.ActionSucceeded>({
            method: "post",
            url: "up/plugins/user",
            data: {uuid: plugins, user_id: +value || 0}
        })
            .then((res) => {
                onOK()
            })
            .catch((err) => {
                yakitNotify("error", "Batch modify failed, reason:" + err)
            })
            .finally(() => {
                setTimeout(() => setSubmitLoading(false), 200)
            })
    })
    const cancel = useMemoizedFn(() => {
        if (submitLoading) return
        setVisible(false)
    })

    useEffect(() => {
        if (!visible) {
            setList([])
            setValue(undefined)
            setStatus("")
            setSubmitLoading(false)
        }
    }, [visible])

    return (
        <YakitModal
            title='Batch modify plugin authors'
            width={448}
            type='white'
            centered={true}
            closable={true}
            keyboard={false}
            visible={visible}
            cancelButtonProps={{loading: submitLoading}}
            confirmLoading={submitLoading}
            onCancel={cancel}
            onOk={submit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["modify-author-modal-body"]}>
                <Form.Item
                    labelCol={{span: 24}}
                    label={<>Author：</>}
                    help={
                        <>
                            Total Selected <span className={styles["modify-author-hint-span"]}>{plugins.length || 0}</span>{" "}
                            plugins
                        </>
                    }
                    validateStatus={status}
                >
                    <YakitSelect
                        placeholder='Enter username to search'
                        showArrow={false}
                        showSearch={true}
                        filterOption={false}
                        notFoundContent={loading ? <YakitSpin spinning={true} size='small' /> : ""}
                        allowClear={true}
                        value={value}
                        onSearch={onsearch}
                        onChange={(value, option: any) => {
                            setValue(value)
                            if (value) setStatus("")
                        }}
                    >
                        {list.map((item) => (
                            <YakitSelect.Option key={item.name} value={item.id} record={item}>
                                <div className={styles["modify-author-item-wrapper"]}>
                                    <AuthorImg size='small' src={item.head_img || ""} />
                                    {item.name}
                                </div>
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </Form.Item>
            </div>
        </YakitModal>
    )
})

interface ReasonModalProps {
    visible: boolean
    setVisible: () => any
    type?: string
    total?: number
    onOK: (reason: string) => any
}
/** @name reason */
export const ReasonModal: React.FC<ReasonModalProps> = memo((props) => {
    const {visible, setVisible, type = "nopass", total, onOK} = props

    const title = useMemo(() => {
        if (type === "nopass") return "Rejection reason"
        if (type === "del") return "Delete reason"
        return "Unknown error window, please close and retry!"
    }, [type])

    useEffect(() => {
        if (!visible) setValue("")
    }, [visible])

    const [value, setValue] = useState<string>("")
    const onSubmit = useMemoizedFn(() => {
        if (!value) {
            yakitNotify("error", "Enter deletion reason!")
            return
        }
        onOK(value)
    })

    return (
        <YakitModal
            title={title}
            width={448}
            type='white'
            centered={true}
            closable={true}
            maskClosable={false}
            keyboard={false}
            visible={visible}
            onCancel={setVisible}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["reason-modal-body"]}>
                <YakitInput.TextArea
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={value}
                    maxLength={150}
                    onChange={(e) => setValue(e.target.value)}
                />
                {total && (
                    <div className={styles["hint-wrapper"]}>
                        Total Selected <span className={styles["total-num"]}>{total || 0}</span> plugins
                    </div>
                )}
            </div>
        </YakitModal>
    )
})
