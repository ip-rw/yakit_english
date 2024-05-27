import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {FuncBtn, FuncSearch, GridLayoutOpt, ListLayoutOpt, ListShowContainer} from "../funcTemplate"
import {OutlinePluscircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useInViewport, useLatest, useUpdateEffect} from "ahooks"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {
    PluginsQueryProps,
    apiFetchGetYakScriptGroupOnline,
    apiFetchOnlineList,
    apiFetchSaveYakScriptGroupOnline,
    convertPluginsRequestParams
} from "../utils"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import "../plugins.scss"
import {PluginListWrap} from "./PluginListWrap"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList, UpdateGroupListItem} from "./UpdateGroupList"
import {GroupListItem} from "./PluginGroupList"
import {YakScript} from "@/pages/invoker/schema"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import styles from "./OnlinePluginList.module.scss"
import {API} from "@/services/swagger/resposeType"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {RcFile} from "antd/lib/upload"
import {Spin} from "antd"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {defaultFilter, defaultSearch} from "../builtInData"
const {ipcRenderer} = window.require("electron")

interface PluginOnlineGroupsListProps {
    pluginsGroupsInViewport: boolean
    activeGroup: GroupListItem
}
export const OnlinePluginList: React.FC<PluginOnlineGroupsListProps> = React.memo((props) => {
    const {pluginsGroupsInViewport, activeGroup} = props
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    const showPluginIndex = useRef<number>(0)
    const [isList, setIsList] = useState<boolean>(false) // Determine Grid or List
    const [search, setSearch] = useState<PluginSearchParams>(
        cloneDeep({
            ...defaultSearch,
            keyword: ""
        })
    )
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const userInfo = useStore((s) => s.userInfo)
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [loading, setLoading] = useState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    const isLoadingRef = useRef<boolean>(true) // Is First Load
    const pluginsOnlineGroupsListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsOnlineGroupsListRef)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([]) // Group Data
    const updateGroupListRef = useRef<any>()

    // Import Group Modal
    const [groupVisible, setGroupVisible] = useState<boolean>(false)

    useUpdateEffect(() => {
        const groups =
            activeGroup.default && activeGroup.id === "Deselect"
                ? []
                : [{value: activeGroup.name, count: activeGroup.number, label: activeGroup.name}]
        setFilters({...filters, plugin_group: groups})
    }, [activeGroup])

    useUpdateEffect(() => {
        refreshOnlinePluginList()
    }, [filters])

    useEffect(() => {
        getInitTotal()
    }, [userInfo.isLogin, inViewport])

    // Fetch Total
    const getInitTotal = useMemoizedFn(() => {
        apiFetchOnlineList({
            page: 1,
            limit: 1
        }).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })

    useEffect(() => {
        onSwitchPrivateDomainRefOnlinePluginInit()
    }, [])

    useUpdateEffect(() => {
        refreshOnlinePluginList()
    }, [pluginsGroupsInViewport])

    useEffect(() => {
        emiter.on("onRefPluginGroupMagOnlinePluginList", refreshOnlinePluginList)
        emiter.on("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        return () => {
            emiter.off("onRefPluginGroupMagOnlinePluginList", refreshOnlinePluginList)
            emiter.off("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        }
    }, [])

    const refreshOnlinePluginList = () => {
        fetchList(true)
    }

    // Switch to Private Domain, Refresh Initial Total and List Data
    const onSwitchPrivateDomainRefOnlinePluginInit = useMemoizedFn(() => {
        onRefListAndTotal()
    })

    // Scroll for More Loading
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })

    // Click Refresh Button
    const onRefListAndTotal = useMemoizedFn(() => {
        getInitTotal()
        refreshOnlinePluginList()
    })

    const queryFetchList = useRef<PluginsQueryProps>()
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
            const queryFilters = filters
            const querySearch = search
            const query: PluginsQueryProps = {
                ...convertPluginsRequestParams(queryFilters, querySearch, params),
                excludePluginTypes: ["yak", "codec"] // Filter Conditions, Exclude Yak, codec from Plugin Groups
            }
            // Unsorted Plugin Query
            if (activeGroup.default && activeGroup.id === "Unsorted" && query.pluginGroup) {
                query.pluginGroup.unSetGroup = true
            }
            queryFetchList.current = query
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

    // Search
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            refreshOnlinePluginList()
        }, 200)
    })

    // Fixes failure to iterate load_content on missing older version data
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

    // Single-Select|Deselect
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

    // Selected Plugin Count
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList, response.pagemeta.total])

    // For Grid, List, Plugin Switching Positioning
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    // Single Item Callback
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
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

    // Fetch Online Plugin's Current and Other Groups
    const pluginUuidRef = useRef<string[]>([])
    const getYakScriptGroupOnline = (uuid: string[]) => {
        pluginUuidRef.current = uuid
        if (!queryFetchList.current) return
        const query = structuredClone(queryFetchList.current)
        apiFetchGetYakScriptGroupOnline({...query, uuid}).then((res) => {
            const copySetGroup = Array.isArray(res.setGroup) ? [...res.setGroup] : []
            const newSetGroup = copySetGroup.map((name) => ({
                groupName: name,
                checked: true
            }))
            let copyAllGroup = Array.isArray(res.allGroup) ? [...res.allGroup] : []
            // Portable Version, Add Basic Scan if Absent
            if (isEnpriTraceAgent()) {
                const index = copySetGroup.findIndex((name) => name === "Basic Scan")
                const index2 = copyAllGroup.findIndex((name) => name === "Basic Scan")

                if (index === -1 && index2 === -1) {
                    copyAllGroup = [...copyAllGroup, "Basic Scan"]
                }
            }
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
        const params: API.GroupRequest = {
            ...queryFetchList.current,
            uuid: pluginUuidRef.current,
            saveGroup,
            removeGroup
        }
        apiFetchSaveYakScriptGroupOnline(params).then(() => {
            if (activeGroup.id !== "Deselect") {
                refreshOnlinePluginList()
            }
            emiter.emit("onRefLocalPluginList", "") // Refresh Online Plugin List
            emiter.emit("onRefPluginGroupMagOnlineQueryYakScriptGroup", "")
        })
    }

    // Single Item Extra Action
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
                            getYakScriptGroupOnline([data.uuid])
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
        <div className={styles["plugin-online-list-wrapper"]} ref={pluginsOnlineGroupsListRef}>
            <PluginListWrap
                checked={allCheck}
                onCheck={onCheck}
                title={activeGroup.name}
                total={response.pagemeta.total}
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
                                    getYakScriptGroupOnline(selectList)
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
                        <YakitButton type='primary' size='large' onClick={() => setGroupVisible(true)}>
                            Import Group
                        </YakitButton>
                        <div className='divider-style'></div>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                    </div>
                }
            >
                {initTotal > 0 ? (
                    <ListShowContainer<YakitPluginOnlineDetail>
                        id='online'
                        isList={isList}
                        data={response.data}
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
                                    extraFooter={(data) => optExtraNode(data, index)}
                                    onClick={(data, index, value) => optCheck(data, value)}
                                    subTitle={optSubTitle}
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
                        showIndex={showPluginIndex.current}
                        setShowIndex={setShowPluginIndex}
                        isShowSearchResultEmpty={+response.pagemeta.total === 0}
                    />
                ) : (
                    <div className={styles["plugin-online-empty"]}>
                        <YakitEmpty title='No Data Available' style={{marginTop: 80}} />
                        <div className={styles["plugin-online-buttons"]}>
                            <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefListAndTotal}>
                                Refresh
                            </YakitButton>
                        </div>
                    </div>
                )}
            </PluginListWrap>
            {groupVisible && (
                <YakitModal
                    title='Import Group'
                    // hiddenHeader={true}
                    closable={true}
                    visible={groupVisible}
                    maskClosable={false}
                    onCancel={() => setGroupVisible(false)}
                    footer={null}
                >
                    <UploadGroupModal onClose={() => setGroupVisible(false)} />
                </YakitModal>
            )}
        </div>
    )
})

interface UploadGroupModalProps {
    onClose: () => void
}

const UploadGroupModal: React.FC<UploadGroupModalProps> = (props) => {
    const {onClose} = props
    const [file, setFile] = useState<RcFile>()
    const [loading, setLoading] = useState<boolean>(false)
    const isCancelRef = useRef<boolean>(false)

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }

    const UploadDataPackage = useMemoizedFn(async () => {
        isCancelRef.current = false
        if (file) {
            setLoading(true)
            ipcRenderer
                // @ts-ignore
                .invoke("upload-group-data", {path: file.path})
                .then((res) => {
                    if (res.code === 200 && !isCancelRef.current) {
                        emiter.emit("onRefpluginGroupList")
                        yakitNotify("success", "Import Group Upload Success")
                        onClose()
                    }
                })
                .catch((err) => {
                    !isCancelRef.current && yakitNotify("error", "Import Group Upload Failed")
                })
                .finally(() => {
                    isCancelRef.current && setTimeout(() => setLoading(false), 200)
                })
        }
    })

    return (
        <div className={styles["upload-yakit-ee"]}>
            <Spin spinning={loading}>
                <div className={styles["upload-dragger-box"]}>
                    <Dragger
                        className={styles["upload-dragger"]}
                        multiple={false}
                        maxCount={1}
                        showUploadList={false}
                        accept={".xlsx,.xls,.csv"}
                        beforeUpload={(f) => {
                            const file_name = f.name
                            const suffix = suffixFun(file_name)
                            const typeArr: string[] = [
                                ".csv",
                                ".xls",
                                ".xlsx",
                                "application/vnd.ms-excel",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            ]
                            if (!typeArr.includes(suffix)) {
                                setFile(undefined)
                                yakitNotify("warning", "File Upload Error, Retry")
                                return false
                            }
                            setFile(f)
                            return false
                        }}
                    >
                        <div className={styles["upload-info"]}>
                            <div className={styles["add-file-icon"]}>
                                <PropertyIcon />
                            </div>
                            {file ? (
                                file.name
                            ) : (
                                <div className={styles["content"]}>
                                    <div className={styles["title"]}>
                                        Drag Files Here, or
                                        <span className={styles["hight-light"]}>Click to Import</span>
                                    </div>
                                    <div className={styles["sub-title"]}>Supports Only Excel Files</div>
                                </div>
                            )}
                        </div>
                    </Dragger>
                </div>
            </Spin>
            <div style={{textAlign: "center", marginTop: 16}}>
                {loading ? (
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        onClick={() => {
                            isCancelRef.current = true
                            setFile(undefined)
                            setLoading(false)
                        }}
                    >
                        Cancel
                    </YakitButton>
                ) : (
                    <YakitButton
                        className={styles["btn-style"]}
                        type='primary'
                        size='large'
                        disabled={!file}
                        onClick={() => {
                            UploadDataPackage()
                        }}
                    >
                        Confirm
                    </YakitButton>
                )}
            </div>
        </div>
    )
}
