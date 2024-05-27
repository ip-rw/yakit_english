import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    OnlineExtraOperate,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineSwitchverticalIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useControllableValue, useUpdateEffect, useInViewport, useLatest} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {
    DownloadArgumentProps,
    NavigationBars,
    OnlineBackInfoProps,
    OtherSearchProps,
    PluginOnlineDetailBackProps,
    PluginsOnlineHeardProps,
    PluginsOnlineListProps,
    PluginsOnlineProps,
    PluginsUploadAllProps,
    YakitCombinationSearchCircleProps,
    YakitPluginOnlineDetail
} from "./PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {API} from "@/services/swagger/resposeType"
import {PluginsContainer, PluginsLayout} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginsOnlineDetail} from "./PluginsOnlineDetail"
import {SolidClouduploadIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import styles from "./PluginsOnline.module.scss"
import {NetWorkApi} from "@/services/fetch"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDownloadPluginOnline,
    apiFetchGroupStatisticsOnline,
    apiFetchOnlineList,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams,
    excludeNoExistfilter
} from "../utils"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {TypeSelectOpt} from "../funcTemplateType"
import {DefaultTypeList, PluginGV, defaultSearch, funcSearchType, pluginTypeToName} from "../builtInData"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isCommunityEdition} from "@/utils/envfile"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {PluginUpload} from "../local/PluginLocalUpload"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import classNames from "classnames"
import "../plugins.scss"
import {CodeGV} from "@/yakitGV"

/**Handling Cached Search Params on Plugin Store Page */
const getPluginOnlinePageData = (pluginOnlinePageData) => {
    const pageList = pluginOnlinePageData?.pageList || []
    if (pageList.length === 0) {
        return {
            keyword: "",
            plugin_type: []
        }
    }
    const {keyword, plugin_type} = pageList[0].pageParamsInfo?.pluginOnlinePageInfo || {
        keyword: "",
        plugin_type: ""
    }
    const types = !!plugin_type ? plugin_type.split(",") : []
    const typeList: API.PluginsSearchData[] = types.map((ele) => ({
        value: ele,
        label: pluginTypeToName[ele]?.name || "",
        count: 0
    }))
    return {
        keyword,
        plugin_type: typeList || []
    }
}

export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    const {pluginOnlinePageData} = usePageInfo(
        (s) => ({
            pluginOnlinePageData: s.pages?.get(YakitRoute.Plugin_Store) || {
                pageList: [],
                routeKey: "",
                singleNode: true
            }
        }),
        shallow
    )
    const [isShowRoll, setIsShowRoll] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [search, setSearch] = useState<PluginSearchParams>(
        cloneDeep({
            ...defaultSearch,
            keyword: getPluginOnlinePageData(pluginOnlinePageData).keyword || ""
        })
    )
    const [refresh, setRefresh] = useState<boolean>(false)

    const pluginsOnlineRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineHeardRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsOnlineListRef)

    useEffect(() => {
        window.addEventListener("scroll", handleScroll, true)
        return () => {
            window.removeEventListener("scroll", handleScroll, true)
        }
    }, [])
    const handleScroll = useDebounceFn(
        useMemoizedFn((e) => {
            e.stopPropagation()
            const {scrollTop, id} = e.target
            if (id === "online-list" || id === "online-grid") {
                if (scrollTop === 1) {
                    setIsShowRoll(true)
                    if (pluginsOnlineRef.current) {
                        pluginsOnlineRef.current.scrollTop -= 54
                    }
                }
            }
            if (id === "pluginsOnline") {
                const {scrollHeight, clientHeight} = e.target
                const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
                if (Math.trunc(Math.abs(scrollTop - maxScrollTop)) <= 2) {
                    setIsShowRoll(false)
                } else {
                    setIsShowRoll(true)
                }
            }
        }),
        {wait: 200, leading: true}
    ).run
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            setRefresh(!refresh)
        }),
        {wait: 200, leading: true}
    ).run
    return (
        <>
            <div className={styles["plugins-online"]}>
                <div id='pluginsOnline' ref={pluginsOnlineRef} className={classNames(styles["plugins-online-body"])}>
                    <div
                        ref={pluginsOnlineHeardRef}
                        className={classNames({
                            [styles["plugin-online-heard-hidden"]]: plugin
                        })}
                    >
                        <PluginsOnlineHeard value={search} onChange={setSearch} onSearch={onSearch} />
                    </div>
                    <div className={styles["plugins-online-list"]} ref={pluginsOnlineListRef}>
                        <PluginsOnlineList
                            refresh={refresh}
                            inViewport={inViewport}
                            plugin={plugin}
                            setPlugin={setPlugin}
                            isShowRoll={isShowRoll}
                            searchValue={search}
                            setSearchValue={setSearch}
                        />
                    </div>
                </div>
            </div>
        </>
    )
})

const PluginsOnlineList: React.FC<PluginsOnlineListProps> = React.memo((props, ref) => {
    const {refresh, isShowRoll, plugin, setPlugin, inViewport} = props
    const {pluginOnlinePageData, clearDataByRoute} = usePageInfo(
        (s) => ({
            pluginOnlinePageData: s.pages?.get(YakitRoute.Plugin_Store) || {
                pageList: [],
                routeKey: "",
                singleNode: true
            },
            clearDataByRoute: s.clearDataByRoute
        }),
        shallow
    )
    /** Plugin Display (List)|Grid) */
    const [isList, setIsList] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)
    /** Load More Toggle */
    const [loading, setLoading] = useState<boolean>(false)
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: getPluginOnlinePageData(pluginOnlinePageData).plugin_type,
        tags: []
    })

    const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
        defaultValue: {
            ...props.searchValue
        },
        defaultValuePropName: "searchValue",
        valuePropName: "searchValue",
        trigger: "setSearchValue"
    })
    const [pluginGroupList, setPluginGroupList] = useState<API.PluginsSearch[]>([])

    const [otherSearch, setOtherSearch] = useState<OtherSearchProps>({
        timeType: {
            key: "allTimes",
            label: "All Time"
        },
        heatType: {
            key: "updated_at",
            label: "Default Sort"
        }
    })

    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [initTotal, setInitTotal] = useState<number>(0)

    const [hasMore, setHasMore] = useState<boolean>(true)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [visibleUploadAll, setVisibleUploadAll] = useState<boolean>(false)

    const [showFilter, setShowFilter] = useState<boolean>(true)

    const [menuExpand, setMenuExpand] = useState<boolean>(true)

    /** Is First Load */
    const isLoadingRef = useRef<boolean>(true)
    const latestLoadingRef = useLatest(loading)

    const userInfo = useStore((s) => s.userInfo)

    // Retrieve Filter Bar Visibility State
    useEffect(() => {
        getRemoteValue(PluginGV.StoreFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
    }, [])
    useUpdateEffect(() => {
        // Refresh Required for Plugin Store List+Stats
        onSwitchPrivateDomainRefOnlinePluginInit()
    }, [userInfo.isLogin])
    useEffect(() => {
        getInitTotal()
        getPluginGroupList()
    }, [inViewport])
    // Request Data
    useEffect(() => {
        fetchList(true)
    }, [refresh, filters, otherSearch])

    // Exclude Deleted Filter Conditions on Plugin List Navigation
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, pluginGroupList)
        if (updateFilterFlag) {
            setFilters(realFilter)
        }
    }, [filters, pluginGroupList])

    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        emiter.on("onRefOnlinePluginList", onRefOnlinePluginList)
        emiter.on("menuExpandSwitch", onMenuExpandSwitch)
        return () => {
            emiter.off("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
            emiter.off("onRefOnlinePluginList", onRefOnlinePluginList)
            emiter.off("menuExpandSwitch", onMenuExpandSwitch)
        }
    }, [])
    useEffect(() => {
        /**Home Page Clicks on Hotwords/Types, Update Cache Data, Need to Refresh Plugin Store List */
        if (pluginOnlinePageData.pageList.length > 0) {
            onRefOnlinePluginListByQuery()
        }
    }, [pluginOnlinePageData])
    useEffect(() => {
        getRemoteValue(CodeGV.MenuExpand).then((result: string) => {
            if (!result) setMenuExpand(true)
            onMenuExpandSwitch(result)
        })
    }, [])
    const onMenuExpandSwitch = useMemoizedFn((value) => {
        try {
            const expandResult: boolean = JSON.parse(value)
            setMenuExpand(expandResult)
        } catch (e) {
            setMenuExpand(true)
        }
    })
    /**Switch Private Domain, Refresh Initial Total & List Data, Return to List Page */
    const onSwitchPrivateDomainRefOnlinePluginInit = useMemoizedFn(() => {
        fetchList(true)
        getPluginGroupList()
        getInitTotal()
        setPlugin(undefined)
    })
    /**
     * @Description Refresh Search Conditions, Trigger Location (Home-Plugin Hotspot Trigger Plugin Store Search Filter))
     */
    /**Home Page Clicks on Hotwords/Types, Update Cache Data, Need to Refresh Plugin Store List */
    const onRefOnlinePluginListByQuery = useMemoizedFn(() => {
        const {keyword = "", plugin_type = []} = getPluginOnlinePageData(pluginOnlinePageData)
        if (!!keyword) {
            setSearch({
                userName: "",
                keyword: keyword,
                type: "keyword"
            })
            setTimeout(() => {
                fetchList(true)
            }, 200)
        }
        if (plugin_type.length > 0) {
            // Updates with useEffect After filters Modification
            setFilters({
                ...filters,
                plugin_type
            })
        }
        // Clear After Setting Search Conditions
        clearDataByRoute(YakitRoute.Plugin_Store)
    })
    const onRefOnlinePluginList = useMemoizedFn(() => {
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })

    // Selected Plugin Count
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList, response.pagemeta.total])

    const getInitTotal = useMemoizedFn(() => {
        apiFetchOnlineList({
            page: 1,
            limit: 1
        }).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    const filtersDetailRef = useRef<PluginFilterParams>() // Filter Condition in Details
    const searchDetailRef = useRef<PluginSearchParams>() // Search Condition in Details
    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            // if (latestLoadingRef.current) return //Comment Out, Affects More Loading in Details
            if (reset) {
                isLoadingRef.current = true
                setShowPluginIndex(0)
            }
            setLoading(true)
            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }
            const queryFilters = filtersDetailRef.current ? filtersDetailRef.current : filters
            const querySearch = searchDetailRef.current ? searchDetailRef.current : search
            const query: PluginsQueryProps = {
                ...convertPluginsRequestParams(queryFilters, querySearch, params),
                time_search: otherSearch.timeType.key === "allTimes" ? "" : otherSearch.timeType.key,
                order_by: otherSearch.heatType.key
            }
            try {
                const res = await apiFetchOnlineList(query)
                if (!res.data) res.data = []
                const length = +res.pagemeta.page === 1 ? res.data.length : res.data.length + response.data.length
                setHasMore(length < +res.pagemeta.total)
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                if (+res.pagemeta.page === 1) {
                    setAllCheck(false)
                    setSelectList([])
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run

    /**Retrieve Group Statistic List */
    const getPluginGroupList = useMemoizedFn(() => {
        apiFetchGroupStatisticsOnline().then((res) => {
            setPluginGroupList(res.data)
        })
    })

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
    const onDownloadBefore = useMemoizedFn(() => {
        const downloadParams: DownloadArgumentProps = {
            allCheckArgument: allCheck,
            filtersArgument: filters,
            searchArgument: search,
            selectListArgument: selectList,
            selectNumArgument: selectNum
        }
        onDownload(downloadParams)
    })
    /**Download */
    const onDownload = useMemoizedFn((downloadArgument: DownloadArgumentProps, callback?: () => void) => {
        const {filtersArgument, searchArgument, selectListArgument, selectNumArgument, allCheckArgument} =
            downloadArgument
        if (selectNumArgument === 0) {
            // Download All
            setVisibleOnline(true)
        } else {
            // Batch Download
            let downloadParams: DownloadOnlinePluginsRequest = {}
            if (allCheckArgument) {
                downloadParams = {
                    ...convertDownloadOnlinePluginBatchRequestParams(filtersArgument, searchArgument)
                }
            } else {
                downloadParams = {
                    UUID: selectListArgument
                }
            }
            setDownloadLoading(true)
            apiDownloadPluginOnline(downloadParams).finally(() => {
                if (callback) callback()
                setTimeout(() => {
                    onCheck(false)
                    setDownloadLoading(false)
                }, 200)
            })
        }
    })

    // Current plugin display sequence
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    /** Single-Select|Deselect */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        try {
            // Fetch loading char with regex
            if (allCheck) {
                setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
                setAllCheck(false)
                return
            }
            // No history fetched if CS or vuln unselected by user
            if (value) setSelectList([...selectList, data.uuid])
            else setSelectList(selectList.filter((item) => item !== data.uuid))
        } catch (error) {
            yakitNotify("error", "Auto-rename to first QA if unchanged:" + error)
        }
    })
    /**Fixes failure to iterate load_content on missing older version data */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

    /** Single Extra Operation Component */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return (
            <OnlineExtraOperate
                data={data}
                isLogin={userInfo.isLogin}
                dispatch={dispatch}
                likeProps={{
                    active: data.is_stars,
                    likeNumber: data.starsCountString || ""
                    // onLikeClick: () => onLikeClick(data)
                }}
                commentProps={{
                    commentNumber: data.commentCountString || ""
                    // onCommentClick: () => onCommentClick(data)
                }}
                downloadProps={{
                    downloadNumber: data.downloadedTotalString || ""
                    // onDownloadClick: () => onDownloadClick(data)
                }}
            />
        )
    })
    /** Single Item Callback */
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })
    /**Create Plugin */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })

    const onBack = useMemoizedFn((backValues: PluginOnlineDetailBackProps) => {
        searchDetailRef.current = undefined
        filtersDetailRef.current = undefined
        setPlugin(undefined)
        setSearch(backValues.search)
        setFilters(backValues.filter)
        setAllCheck(backValues.allCheck)
        setSelectList(backValues.selectList)
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
    const onBatchDownload = useMemoizedFn((newParams: OnlineBackInfoProps, callback: () => void) => {
        const batchDownloadParams: DownloadArgumentProps = {
            allCheckArgument: newParams.allCheck,
            filtersArgument: newParams.filter,
            searchArgument: newParams.search,
            selectListArgument: newParams.selectList,
            selectNumArgument: newParams.selectNum
        }
        onDownload(batchDownloadParams, callback)
    })
    /** Detailed Search Event */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        searchDetailRef.current = detailSearch
        filtersDetailRef.current = detailFilter
        fetchList(true)
    })
    const onUploadAll = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "Please login")
            return
        }
        if (userInfo.role !== "admin") {
            yakitNotify("error", "No Permission")
            return
        }
        setVisibleUploadAll(true)
    })
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(PluginGV.StoreFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })
    /**Refresh Button When Initial Data is Empty, Refresh List & Initial Total, and Group Data */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        getPluginGroupList()
    })
    return (
        <>
            {!!plugin && (
                <div
                    className={classNames(styles["plugins-online-detail"], {
                        [styles["plugins-online-detail-ee-or-es"]]: !isCommunityEdition(),
                        [styles["plugins-online-detail-ee-or-es-menu-retract"]]: !isCommunityEdition() && !menuExpand,
                        [styles["plugins-online-detail-menu-retract"]]: isCommunityEdition() && !menuExpand
                    })}
                >
                    <PluginsOnlineDetail
                        info={plugin}
                        defaultSelectList={selectList}
                        defaultAllCheck={allCheck}
                        loading={loading}
                        spinLoading={loading && isLoadingRef.current}
                        response={response}
                        onBack={onBack}
                        loadMoreData={onUpdateList}
                        defaultSearchValue={search}
                        dispatch={dispatch}
                        onBatchDownload={onBatchDownload}
                        defaultFilter={filters}
                        downloadLoading={downloadLoading}
                        onDetailSearch={onDetailSearch}
                        currentIndex={showPluginIndex.current}
                        setCurrentIndex={setShowPluginIndex}
                    />
                </div>
            )}
            <PluginsLayout
                title={
                    <div
                        className={classNames(styles["plugin-heard-title"], {
                            [styles["plugin-heard-title-hidden"]]: isShowRoll
                        })}
                    >
                        Plugin Store
                    </div>
                }
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginTypeSelect} list={DefaultTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <div
                            className={classNames(styles["extra-header-search-wrapper"], {
                                [styles["extra-header-search-wrapper-hidden"]]: isShowRoll
                            })}
                        >
                            <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                            <div className='divider-style'></div>
                        </div>

                        <div className='btn-group-wrapper'>
                            <FuncBtn
                                maxWidth={1050}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "Download" : "One-click download"}
                                onClick={onDownloadBefore}
                                loading={downloadLoading}
                                disabled={initTotal === 0}
                            />
                            <FuncBtn
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='Create Plugin'
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
                    groupList={pluginGroupList}
                    filterClassName={classNames({
                        [styles["list-overflow-hidden"]]: isShowRoll
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
                        extraHeader={
                            <div className={styles["plugin-list-extra-heard"]}>
                                <FuncFilterPopover
                                    maxWidth={1200}
                                    icon={<OutlineCalendarIcon />}
                                    name={otherSearch.timeType.label as string}
                                    menu={{
                                        type: "grey",
                                        data: [
                                            {key: "day", label: "Today"},
                                            {key: "week", label: "This Week"},
                                            {key: "month", label: "This Month"},
                                            {key: "allTimes", label: "All Time"}
                                        ],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "day":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "day",
                                                            label: "Today"
                                                        }
                                                    })
                                                    break
                                                case "week":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "week",
                                                            label: "This Week"
                                                        }
                                                    })
                                                    break
                                                case "month":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "month",
                                                            label: "This Month"
                                                        }
                                                    })
                                                    break
                                                case "allTimes":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "allTimes",
                                                            label: "All Time"
                                                        }
                                                    })
                                                    break
                                                default:
                                                    return
                                            }
                                        }
                                    }}
                                    button={{type: "text2", style: {padding: "3px 4px"}}}
                                    placement='bottomRight'
                                />
                                <FuncFilterPopover
                                    maxWidth={1200}
                                    icon={<OutlineSwitchverticalIcon />}
                                    name={otherSearch.heatType.label as string}
                                    menu={{
                                        data: [
                                            {key: "updated_at", label: "Default Sort"},
                                            {key: "stars", label: "Most Liked"},
                                            {key: "download_total", label: "Most Downloaded"}
                                        ],
                                        className: styles["func-filter-dropdown-menu"],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "updated_at":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        heatType: {
                                                            key: "updated_at",
                                                            label: "Default Sort"
                                                        }
                                                    })
                                                    break
                                                case "stars":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        heatType: {
                                                            key: "stars",
                                                            label: "Most Liked"
                                                        }
                                                    })
                                                    break
                                                case "download_total":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        heatType: {
                                                            key: "download_total",
                                                            label: "Most Downloaded"
                                                        }
                                                    })
                                                    break
                                                default:
                                                    return
                                            }
                                        }
                                    }}
                                    button={{type: "text2", style: {padding: "3px 4px"}}}
                                    placement='bottomRight'
                                />
                                <div className='divider-style' style={{marginLeft: 4}} />
                            </div>
                        }
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                id='online'
                                isList={isList}
                                data={response.data}
                                listClassName={classNames({
                                    [styles["list-overflow-hidden"]]: isShowRoll
                                })}
                                gridClassName={classNames({
                                    [styles["list-overflow-hidden"]]: isShowRoll
                                })}
                                gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
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
                                            official={!!data.official}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.head_img}
                                            title={data.script_name}
                                            help={data.help || ""}
                                            time={data.updated_at}
                                            type={data.type}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={!!data.official}
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
                            <div className={styles["plugin-online-empty"]}>
                                <YakitEmpty
                                    title='No Data Available'
                                    description={isCommunityEdition() ? "" : "One-click Upload of All Local Plugins"}
                                />
                                <div className={styles["plugin-online-buttons"]}>
                                    {userInfo.role === "admin" && (
                                        <YakitButton
                                            type='outline1'
                                            icon={<OutlineClouduploadIcon />}
                                            onClick={onUploadAll}
                                        >
                                            One-click Upload
                                        </YakitButton>
                                    )}
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
            {visibleOnline && <YakitGetOnlinePlugin visible={visibleOnline} setVisible={setVisibleOnline} />}
            {visibleUploadAll && <PluginsUploadAll visible={visibleUploadAll} setVisible={setVisibleUploadAll} />}
        </>
    )
})

const PluginsUploadAll: React.FC<PluginsUploadAllProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })
    return (
        <YakitHint
            visible={visible}
            title='One-click Upload'
            heardIcon={<SolidClouduploadIcon style={{color: "var(--yakit-warning-5)"}} />}
            footer={null}
            isDrag={true}
            mask={false}
        >
            <PluginUpload
                isUploadAll={true}
                isPrivate={false}
                onSave={onCancel}
                onCancel={onCancel}
                pluginNames={[]}
                show={visible}
                footerClassName={styles["upload-all-btns"]}
            />
        </YakitHint>
    )
})

const PluginsOnlineHeard: React.FC<PluginsOnlineHeardProps> = React.memo((props) => {
    const {onSearch} = props
    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const [visibleQRCode, setVisibleQRCode] = useState<boolean>(false)
    const [codeUrl, setCodeUrl] = useState<string>("")
    const [cardImg, setCardImg] = useState<API.NavigationBarsListResponse[]>([])
    useEffect(() => {
        getBars()
    }, [])
    /**Retrieve Navigation Card */
    const getBars = useMemoizedFn(() => {
        NetWorkApi<NavigationBars, API.NavigationBarsResponse>({
            method: "get",
            url: "navigation/bars"
        })
            .then((res: API.NavigationBarsResponse) => {
                setCardImg(res.data || [])
            })
            .catch((err) => {
                yakitNotify("error", "Failed to Retrieve Card Navigation:" + err)
            })
            .finally(() => {})
    })
    const onImgClick = useMemoizedFn((ele) => {
        if (ele.otherLink) {
            setCodeUrl(ele.otherLink)
            setVisibleQRCode(true)
        } else {
            openExternalWebsite(ele.link)
        }
    })
    return (
        <div className={styles["plugin-online-heard"]}>
            <div className={styles["plugin-online-heard-bg"]} />
            <div className={styles["plugin-online-heard-content"]}>
                <div className={styles["plugin-online-heard-content-top"]}>
                    <div className={styles["plugin-online-heard-content-top-tip"]}>您好，大家好! 👋</div>
                    <div className={styles["plugin-online-heard-content-top-title"]}>Yakit Plugin Store</div>
                    <div className={styles["plugin-online-heard-content-top-subTitle"]}>
                        Unclosed Bull Head ;&nbsp;YAK&nbsp;Waiting for Your Contribution
                    </div>
                    <YakitCombinationSearchCircle value={search} onChange={setSearch} onSearch={onSearch} />
                </div>
            </div>
            <div className={styles["plugin-online-heard-card"]}>
                {cardImg.map((ele) => (
                    <img
                        key={ele.card}
                        className={styles["plugin-online-heard-card-img"]}
                        src={ele.card}
                        alt=''
                        onClick={() => onImgClick(ele)}
                    />
                ))}
            </div>
            <YakitModal
                visible={visibleQRCode}
                title={null}
                footer={null}
                centered={true}
                width={368}
                onCancel={() => setVisibleQRCode(false)}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <div className={styles["yakit-modal-code"]}>
                    <div className={styles["yakit-modal-code-heard"]}>
                        <div className={styles["yakit-modal-code-heard-title"]}>
                            <SolidYakCattleNoBackColorIcon className={styles["yakit-modal-code-heard-title-icon"]} />
                            <span className={styles["yakit-modal-code-heard-title-text"]}>Yak Project</span>
                        </div>
                        <div
                            className={styles["yakit-modal-code-heard-remove"]}
                            onClick={() => setVisibleQRCode(false)}
                        >
                            <OutlineXIcon />
                        </div>
                    </div>
                    <div className={styles["yakit-modal-code-content"]}>
                        <img alt='' src={codeUrl} className={styles["yakit-modal-code-content-url"]} />
                        <span className={styles["yakit-modal-code-content-tip"]}>WeChat QR Follow</span>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})
const YakitCombinationSearchCircle: React.FC<YakitCombinationSearchCircleProps> = React.memo((props) => {
    const {value, onSearch} = props
    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const keyword = useMemo(() => {
        if (search.type === "keyword") {
            return search.keyword
        } else {
            return search.userName
        }
    }, [search])
    const onSelect = useMemoizedFn((type) => {
        setSearch({
            ...value,
            type
        })
    })
    const onChangeInput = useMemoizedFn((e) => {
        if (value.type === "keyword") {
            setSearch({
                ...value,
                keyword: e.target.value
            })
        } else {
            setSearch({
                ...value,
                userName: e.target.value
            })
        }
    })
    const onClickSearch = useMemoizedFn(() => {
        onSearch()
    })
    return (
        <div className={styles["yakit-combination-search-circle"]}>
            <YakitSelect
                defaultValue='keyword'
                wrapperStyle={{width: 75}}
                wrapperClassName={styles["yakit-combination-search-circle-select-wrapper"]}
                bordered={false}
                options={funcSearchType}
                value={search.type}
                onSelect={onSelect}
                size='large'
            />
            <div className={styles["yakit-combination-search-circle-line"]} />
            <YakitInput
                className={styles["yakit-combination-search-circle-input"]}
                wrapperClassName={styles["yakit-combination-search-circle-input-wrapper"]}
                bordered={false}
                placeholder='Enter Keywords to Search Plugins'
                value={keyword}
                onChange={onChangeInput}
                onPressEnter={onSearch}
            />
            <div className={classNames(styles["yakit-combination-search-circle-icon"])} onClick={onClickSearch}>
                <OutlineSearchIcon />
            </div>
        </div>
    )
})
