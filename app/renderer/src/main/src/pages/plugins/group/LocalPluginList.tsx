import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {useMemoizedFn, useInViewport, useDebounceFn, useLatest, useUpdateEffect} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {FuncSearch, ListShowContainer, GridLayoutOpt, ListLayoutOpt, FuncBtn} from "../funcTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {OutlinePluscircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useStore} from "@/store"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {
    apiFetchGetYakScriptGroupLocal,
    apiFetchSaveYakScriptGroupLocal,
    apiQueryYakScript,
    apiQueryYakScriptTotal,
    convertLocalPluginsRequestParams
} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import {RemoteGV} from "@/yakitGV"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import "../plugins.scss"
import {PluginListWrap} from "./PluginListWrap"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList, UpdateGroupListItem} from "./UpdateGroupList"
import {GroupListItem} from "./PluginGroupList"
import styles from "./LocalPluginList.module.scss"
import {defaultFilter, defaultSearch} from "../builtInData"

interface PluginLocalGroupsListProps {
    pluginsGroupsInViewport: boolean
    activeGroup: GroupListItem
}
export const LocalPluginList: React.FC<PluginLocalGroupsListProps> = React.memo((props) => {
    const {pluginsGroupsInViewport, activeGroup} = props
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<YakScript[]>([])
    const showPluginIndex = useRef<number>(0) // Current plugin display sequence
    const [isList, setIsList] = useState<boolean>(false) // Toggle between grid and list
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const userInfo = useStore((s) => s.userInfo)
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [loading, setLoading] = useState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    const isLoadingRef = useRef<boolean>(true) // First load check
    const pluginsLocalListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsLocalListRef)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [privateDomain, setPrivateDomain] = useState<string>("") // Execution Complete
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([]) // Group Data
    const updateGroupListRef = useRef<any>()

    useUpdateEffect(() => {
        const groups =
            activeGroup.default && activeGroup.id === "Deselect"
                ? []
                : [{value: activeGroup.name, count: activeGroup.number, label: activeGroup.name}]
        setFilters({...filters, plugin_group: groups})
    }, [activeGroup])

    useUpdateEffect(() => {
        refreshLocalPluginList()
    }, [filters])

    useEffect(() => {
        getInitTotal()
    }, [userInfo.isLogin, inViewport])

    // Fetch plugin total
    const getInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal().then((res) => {
            setInitTotal(+res.Total)
        })
    })

    useEffect(() => {
        getPrivateDomainAndRefList()
    }, [])

    useUpdateEffect(() => {
        refreshLocalPluginList()
    }, [pluginsGroupsInViewport])

    useEffect(() => {
        emiter.on("onRefPluginGroupMagLocalPluginList", refreshLocalPluginList)
        emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        return () => {
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
            emiter.off("onRefPluginGroupMagLocalPluginList", refreshLocalPluginList)
        }
    }, [])

    const refreshLocalPluginList = () => {
        fetchList(true)
    }

    // Fetch private domain
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                setPrivateDomain(values.BaseUrl)
                setTimeout(() => {
                    refreshLocalPluginList()
                }, 200)
            }
        })
    })

    // Scroll for more loading
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })

    // Click to refresh data
    const onRefListAndTotal = useMemoizedFn(() => {
        getInitTotal()
        refreshLocalPluginList()
    })

    // Fetch plugin list data
    const queryFetchList = useRef<QueryYakScriptRequest>()
    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            // if (latestLoadingRef.current) return //Comment first, affects more loading in details
            if (reset) {
                isLoadingRef.current = true
                setShowPluginIndex(0)
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const queryFilters = filters
            const querySearch = search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({filter: queryFilters, search: querySearch, pageParams: params}),
                ExcludeTypes: ["yak", "codec"] // Filter conditions, exclude Yak, codec from groups
            }

            // Ungrouped plugin query
            if (activeGroup.default && activeGroup.id === "Ungrouped" && query.Group) {
                query.Group.UnSetGroup = true
            }
            queryFetchList.current = query
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                const newData = res.Data.map((ele) => ({
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
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run

    // Search
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            refreshLocalPluginList()
        }, 200)
    })

    // Fixes failure to iterate load_content on missing older version data
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

    // deletion not supported
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

    // Selected plugin count
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])

    // Mainly for adding checkmark style
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])

    // For grid list plugin switch positioning
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    // Item click callback
    const optClick = useMemoizedFn((data: YakScript, index: number) => {
        setShowPluginIndex(index)
    })

    // Extra Params Modal
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })

    // Locally get plugin's group and other groups
    const scriptNameRef = useRef<string[]>([])
    const getYakScriptGroupLocal = (scriptName: string[]) => {
        scriptNameRef.current = scriptName
        if (!queryFetchList.current) return
        const query = structuredClone(queryFetchList.current)
        query.IncludedScriptNames = scriptName
        apiFetchGetYakScriptGroupLocal(query).then((res) => {
            const copySetGroup = [...res.SetGroup]
            const newSetGroup = copySetGroup.map((name) => ({
                groupName: name,
                checked: true
            }))
            let copyAllGroup = [...res.AllGroup]
            const newAllGroup = copyAllGroup.map((name) => ({
                groupName: name,
                checked: false
            }))
            setGroupList([...newSetGroup, ...newAllGroup])
        })
    }

    // Update Group Data
    const updateGroupList = () => {
        const latestGroupList: UpdateGroupListItem[] = updateGroupListRef.current.latestGroupList

        // New
        const checkedGroup = latestGroupList.filter((item) => item.checked).map((item) => item.groupName)
        const unCheckedGroup = latestGroupList.filter((item) => !item.checked).map((item) => item.groupName)

        // Old
        const originCheckedGroup = groupList.filter((item) => item.checked).map((item) => item.groupName)

        let saveGroup: string[] = []
        let removeGroup: string[] = []
        checkedGroup.forEach((groupName: string) => {
            saveGroup.push(groupName)
        })
        unCheckedGroup.forEach((groupName: string) => {
            if (originCheckedGroup.includes(groupName)) {
                removeGroup.push(groupName)
            }
        })
        if ((!saveGroup.length && !removeGroup.length) || !queryFetchList.current) return
        const query = structuredClone(queryFetchList.current)
        query.IncludedScriptNames = scriptNameRef.current
        apiFetchSaveYakScriptGroupLocal({
            Filter: query,
            SaveGroup: saveGroup,
            RemoveGroup: removeGroup
        }).then(() => {
            if (activeGroup.id !== "Deselect") {
                refreshLocalPluginList()
            }
            emiter.emit("onRefLocalPluginList", "") // Refresh local plugin list
            emiter.emit("onRefPluginGroupMagLocalQueryYakScriptGroup", "")
        })
    }

    // Item additional operations
    const optExtraNode = useMemoizedFn((data, index) => {
        return (
            <div onClick={(e) => e.stopPropagation()}>
                <YakitPopover
                    overlayClassName={styles["add-group-popover"]}
                    placement='bottomRight'
                    trigger='click'
                    content={<UpdateGroupList ref={updateGroupListRef} originGroupList={groupList}></UpdateGroupList>}
                    onVisibleChange={(visible) => {
                        if (visible) {
                            getYakScriptGroupLocal([data.ScriptName])
                        } else {
                            updateGroupList()
                        }
                    }}
                >
                    <OutlinePluscircleIcon
                        className={styles["add-group-icon"]}
                        onClick={(e) => {
                            e.stopPropagation()
                            optClick(data, index)
                        }}
                    />
                </YakitPopover>
            </div>
        )
    })

    return (
        <div className={styles["plugin-local-list-wrapper"]} ref={pluginsLocalListRef}>
            <PluginListWrap
                checked={allCheck}
                onCheck={onCheck}
                title={activeGroup.name}
                total={response.Total}
                selected={selectNum}
                isList={isList}
                setIsList={setIsList}
                extraHeader={
                    <div className='extra-header-wrapper' onClick={(e) => e.stopPropagation()}>
                        <YakitPopover
                            overlayClassName={styles["add-group-popover"]}
                            placement='bottomRight'
                            trigger='click'
                            content={
                                <UpdateGroupList ref={updateGroupListRef} originGroupList={groupList}></UpdateGroupList>
                            }
                            onVisibleChange={(visible) => {
                                if (visible) {
                                    getYakScriptGroupLocal(selectList.map((item) => item.ScriptName))
                                } else {
                                    updateGroupList()
                                }
                            }}
                        >
                            <FuncBtn
                                disabled={!selectList.length && !allCheck}
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='Add to Group...'
                            />
                        </YakitPopover>

                        <div className='divider-style'></div>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                    </div>
                }
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
                                    extraFooter={(data) => optExtraNode(data, index)}
                                    subTitle={optSubTitle}
                                    onClick={(data, index, value) => optCheck(data, value)}
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
                                    extraNode={(data) => optExtraNode(data, index)}
                                    onClick={(data, index, value) => optCheck(data, value)}
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
                        <YakitEmpty title='No Data Available' style={{marginTop: 80}} />
                        <div className={styles["plugin-local-buttons"]}>
                            <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefListAndTotal}>
                                Refresh
                            </YakitButton>
                        </div>
                    </div>
                )}
            </PluginListWrap>
        </div>
    )
})
