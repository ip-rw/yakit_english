import React, {ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    PluginDetailHeader,
    PluginDetails,
    PluginDetailsListItem,
    PluginEditorDiff,
    PluginModifyInfo,
    PluginModifySetting,
    statusTag
} from "../baseTemplate"
import {SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"
import {
    OutlineClouddownloadIcon,
    OutlineCodeIcon,
    OutlineLightbulbIcon,
    OutlinePencilIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginFilterParams, PluginInfoRefProps, PluginSearchParams, PluginSettingRefProps} from "../baseTemplateType"
import {ReasonModal} from "./PluginManage"
import {ApplicantIcon, AuthorImg, FilterPopoverBtn, FuncBtn} from "../funcTemplate"
import {PluginBaseParamProps, PluginDataProps, PluginSettingParamProps} from "../pluginsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {OnlinePluginAppAction} from "../pluginReducer"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {apiAuditPluginDetaiCheck, apiFetchPluginDetailCheck} from "../utils"
import {convertRemoteToLocalRisks, convertRemoteToRemoteInfo, onCodeToInfo} from "../editDetails/utils"
import {yakitNotify} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {PluginDebug} from "../pluginDebug/PluginDebug"
import {GetPluginLanguage} from "../builtInData"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {useStore} from "@/store"

const {TabPane} = PluginTabs

const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

/** Details to List with Linked Data */
export interface BackInfoProps {
    /** Select All */
    allCheck: boolean
    /** Selected Plugins */
    selectList: YakitPluginOnlineDetail[]
    /** Search Conditions */
    search: PluginSearchParams
    /** Search Filters */
    filter: PluginFilterParams
}

export interface DetailRefProps {
    /**
     * @Delete Callback
     * @param value Deleted Plugins
     * @param isFailed
     */
    onDelCallback: (value: YakitPluginOnlineDetail[], isFailed?: boolean) => any
}

interface PluginManageDetailProps {
    ref?: ForwardedRef<any>
    /** Initial Load Status */
    spinLoading: boolean
    /** Load More Status */
    listLoading: boolean
    /** All Data */
    response: YakitPluginListOnlineResponse
    /** All Data Ops */
    dispatch: React.Dispatch<OnlinePluginAppAction>
    /** Initial Plugin Click Data */
    info: YakitPluginOnlineDetail
    /** Initial Select All */
    defaultAllCheck: boolean
    /** Initial Plugin Selection */
    defaultSelectList: YakitPluginOnlineDetail[]
    /** Initial Search */
    defaultSearch: PluginSearchParams
    /** Initial Filters */
    defaultFilter: PluginFilterParams
    /** Batch Download Loading */
    downloadLoading: boolean
    /** Batch Download Callback */
    onBatchDownload: (data?: BackInfoProps) => any
    /** Delete Callback */
    onPluginDel: (info: YakitPluginOnlineDetail | undefined, data: BackInfoProps) => any
    /** Displayed Plugin Index */
    currentIndex: number
    setCurrentIndex: (index: number) => any
    /** Back */
    onBack: (data: BackInfoProps) => any
    /** Load More Data */
    loadMoreData: () => any
    /** Search Callback */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => any
}

export const PluginManageDetail: React.FC<PluginManageDetailProps> = memo(
    forwardRef((props, ref) => {
        const {
            spinLoading,
            listLoading,
            response,
            dispatch,
            info,
            defaultAllCheck,
            defaultSelectList,
            defaultSearch,
            defaultFilter,
            downloadLoading,
            onBatchDownload,
            onPluginDel,
            currentIndex,
            setCurrentIndex,
            onBack,
            loadMoreData,
            onDetailSearch
        } = props
        const userInfo = useStore((s) => s.userInfo)
        /**Filters for API*/
        const getRealFilters = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
            const realFilters: PluginFilterParams = {
                ...filter,
                plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
            }
            return realFilters
        }
        const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
        const onSearch = useMemoizedFn((value: PluginSearchParams) => {
            onDetailSearch(value, filters)
            setSelectList([])
            setAllcheck(false)
        })
        const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
        const onFilter = useMemoizedFn((value: PluginFilterParams) => {
            setFilters(value)
            onDetailSearch(searchs, value)
            setSelectList([])
            setAllcheck(false)
        })

        /**Convert Group Parameter*/
        const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
            const realFilters: PluginFilterParams = {
                ...filter,
                plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
            }
            return realFilters
        }

        // Get Plugin Details
        const onDetail = useMemoizedFn((info: YakitPluginOnlineDetail) => {
            if (loading) return

            setLoading(true)
            apiFetchPluginDetailCheck({uuid: info.uuid, list_type: "check"})
                .then(async (res) => {
                    if (res) {
                        // console.log("Plugin Detail", res)
                        setPlugin({...res})
                        setOldContent("")
                        // Source Code
                        setContent(res.content)
                        if (+res.status !== 0) return
                        // Set Editor
                        setApply({
                            name: res.apply_user_name || "",
                            img: res.apply_user_head_img || "",
                            description: res.logDescription || ""
                        })
                        // Set Basic Info
                        let infoData: PluginBaseParamProps = {
                            ScriptName: res.script_name,
                            Help: res.help,
                            RiskDetail: convertRemoteToLocalRisks(res.riskInfo),
                            Tags: []
                        }
                        let tags: string[] = []
                        try {
                            tags = (res.tags || "").split(",") || []
                        } catch (error) {}
                        const codeInfo =
                            GetPluginLanguage(res.type) === "yak" ? await onCodeToInfo(res.type, res.content) : null
                        if (codeInfo && codeInfo.Tags.length > 0) {
                            // De-duplicate
                            tags = filter([...tags, ...codeInfo.Tags])
                        }
                        infoData.Tags = [...tags]

                        setInfoParams({...infoData})
                        setCacheTags(infoData?.Tags || [])
                        // Set Config Info
                        let settingData: PluginSettingParamProps = {
                            EnablePluginSelector: !!res.enable_plugin_selector,
                            PluginSelectorTypes: res.plugin_selector_types,
                            Content: res.content || ""
                        }
                        setSettingParams({...settingData})

                        if (res.merge_before_plugins) setOldContent(res.merge_before_plugins.content || "")
                    }
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        })

        // Skip initial state due to non-execution of directional scroll in RollingLoadList
        const [scrollTo, setScrollTo] = useState<number>(0)

        useEffect(() => {
            if (info) {
                onDetail(info)
                // Add delay to prevent operation from being initial data for RollingLoadList
                setTimeout(() => {
                    setScrollTo(currentIndex)
                }, 100)
            }
        }, [info])

        // Loading Detail Page
        const [loading, setLoading] = useState<boolean>(false)

        const [allCheck, setAllcheck] = useState<boolean>(defaultAllCheck)
        const onAllCheck = useMemoizedFn((check: boolean) => {
            setSelectList([])
            setAllcheck(check)
        })

        const [selectList, setSelectList, getSelectList] = useGetState<YakitPluginOnlineDetail[]>(defaultSelectList)
        // Selected Plugin UUIDs
        const selectUUIDs = useMemo(() => {
            return getSelectList().map((item) => item.uuid)
        }, [selectList])
        // Selected Plugin Count
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList])
        // Checkbox Ticked
        const onOptCheck = useMemoizedFn((data: YakitPluginOnlineDetail, check: boolean) => {
            if (allCheck) {
                setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
                setAllcheck(false)
            }
            if (check) setSelectList([...getSelectList(), data])
            else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
        })
        // View Plugin Details
        const onOptClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
            setCurrentIndex(index)
            onDetail(data)
        })

        // Batch Download|One-click download
        const onDownload = useMemoizedFn(() => {
            onBatchDownload({allCheck, selectList, search: searchs, filter: filters})
        })

        // Delete Button
        const [delLoading, setDelLoading] = useState<boolean>(false)
        // (Batch|Single Delete|Clear
        const onBatchDel = useMemoizedFn((info?: YakitPluginOnlineDetail) => {
            onPluginDel(info, {allCheck, selectList, search: searchs, filter: filters})
            setTimeout(() => {
                setDelLoading(false)
            }, 300)
        })

        // Delete Result Callback
        const onDelCallback: DetailRefProps["onDelCallback"] = useMemoizedFn((value, isFailed) => {
            if (!isFailed) {
                if (value.length > 0) {
                    const index = selectUUIDs.findIndex((item) => value[0]?.uuid === item)
                    if (index > -1) {
                        onOptCheck(value[0], false)
                    }
                }
            }
            setTimeout(() => {
                setDelLoading(false)
            }, 200)
        })

        useImperativeHandle(
            ref,
            () => ({
                onDelCallback: onDelCallback
            }),
            []
        )

        const [plugin, setPlugin] = useState<API.PluginsAuditDetailResponse>()

        // Modifier Info
        const [apply, setApply] = useState<{name: string; img: string; description: string}>()
        const isApply = useMemo(() => !!(apply && apply.name), [apply])

        // Plugin Basics - Logic
        const infoRef = useRef<PluginInfoRefProps>(null)
        const [infoParams, setInfoParams, getInfoParams] = useGetState<PluginBaseParamProps>({
            ScriptName: ""
        })
        // Get Basic Data (No Validation)
        const fetchInfoData = useMemoizedFn(() => {
            if (infoRef.current) {
                return infoRef.current.onGetValue()
            }
            return undefined
        })
        const [cacheTags, setCacheTags] = useState<string[]>()
        // Deleting Tags Triggers DNSLog & HTTP Packet Switch
        const onTagsCallback = useMemoizedFn((v: string[]) => {
            setCacheTags(v || [])
        })
        // DNSLog & HTTP Packet Switch Impact on Tags
        const onSwitchToTags = useMemoizedFn((value: string[]) => {
            setInfoParams({
                ...(fetchInfoData() || getInfoParams()),
                Tags: value
            })
            setCacheTags(value)
        })

        // Plugin Config Logic
        const settingRef = useRef<PluginSettingRefProps>(null)
        const [settingParams, setSettingParams] = useState<PluginSettingParamProps>({
            Content: ""
        })

        // Force Update Comparator
        const [updateDiff, setUpdateDiff] = useState<boolean>(false)
        // Plugin Source Code
        const [content, setContent] = useState<string>("")
        // Old Plugin Code
        const [oldContent, setOldContent] = useState<string>("")

        // Extract and Convert Component Data
        const convertPluginInfo = useMemoizedFn(async () => {
            if (!plugin) return undefined

            if (+plugin.status !== 0) {
                const obj = convertRemoteToRemoteInfo(plugin)
                return obj
            }

            const data: PluginDataProps = {
                ScriptName: plugin.script_name,
                Type: plugin.type,
                Content: plugin.content
            }
            // Base Info
            if (!infoRef.current) {
                yakitNotify("error", "Basic Info Unavailable, Retry")
                return
            }
            const info = await infoRef.current.onSubmit()
            if (!info) {
                yakitNotify("error", "Complete Required Basic Info")
                return
            } else {
                data.Help = info?.Help
                data.Tags = (info?.Tags || []).join(",") || undefined
            }
            // Config Info
            if (!settingRef.current) {
                yakitNotify("error", "Config Info Unavailable, Retry")
                return
            }
            const setting = await settingRef.current.onSubmit()
            if (!setting) {
                yakitNotify("error", "Complete Required Config Info")
                return
            } else {
                data.EnablePluginSelector = setting?.EnablePluginSelector
                data.PluginSelectorTypes = setting?.PluginSelectorTypes
            }
            data.Content = content

            const codeInfo = GetPluginLanguage(data.Type) === "yak" ? await onCodeToInfo(data.Type, data.Content) : null
            let tags: string = data.Tags || ""
            if (codeInfo && codeInfo.Tags.length > 0) {
                tags += `,${codeInfo.Tags.join(",")}`
                // De-duplicate
                tags = filter(tags.split(",")).join(",")
            }
            data.Tags = tags || undefined

            // yak Type - Analyze Code for Params and Risks
            if (data.Type === "yak" && codeInfo) {
                data.RiskDetail = codeInfo.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
                data.Params = codeInfo.CliParameter
            } else {
                // Non-yak Type - Exclude Params and Risks
                data.RiskDetail = []
                data.Params = []
            }

            const obj = convertRemoteToRemoteInfo(plugin, data)

            return obj
        })

        // Approved|No API Request
        const onChangeStatus = useMemoizedFn(
            async (
                param: {
                    isPass: boolean
                    description?: string
                },
                callback?: (value?: API.PluginsAuditDetailResponse) => any
            ) => {
                const {isPass, description = ""} = param

                if (plugin) {
                    const audit: API.PluginsAudit = {
                        listType: "check",
                        status: isPass ? "true" : "false",
                        uuid: plugin.uuid,
                        logDescription: description || undefined,
                        upPluginLogId: plugin.up_log_id || 0
                    }
                    const info: API.PluginsRequest | undefined = await convertPluginInfo()
                    if (!info) {
                        if (callback) callback()
                        return
                    }

                    apiAuditPluginDetaiCheck({...info, ...audit})
                        .then(() => {
                            if (callback)
                                callback({
                                    ...(info as any),
                                    tags: (info.tags || []).join(","),
                                    downloaded_total: info.download_total || 0
                                })
                        })
                        .catch(() => {
                            if (callback) callback()
                        })
                } else {
                    if (callback) callback()
                }
            }
        )
        // Refresh List After Item Update
        const [recalculation, setRecalculation] = useState<boolean>(false)
        // Reason Window
        const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
            visible: false,
            type: "nopass"
        })
        // Approval Button
        const [statusLoading, setStatusLoading] = useState<boolean>(false)
        // Open Reason Window
        const onOpenReason = useMemoizedFn(() => {
            if (statusLoading) return
            setStatusLoading(true)
            setShowReason({visible: true, type: "nopass"})
        })
        // Close Reason Window
        const onCancelReason = useMemoizedFn((loading?: boolean) => {
            setShowReason({visible: false, type: "del"})
            if (typeof loading !== "boolean" || !loading) {
                setTimeout(() => {
                    setStatusLoading(false)
                }, 200)
            }
        })
        const onReasonCallback = useMemoizedFn((reason: string) => {
            const type = showReason.type
            onCancelReason(true)

            if (type === "nopass") {
                setStatusLoading(true)
                onChangeStatus({isPass: false, description: reason}, (value) => {
                    if (value) {
                        setPlugin({...value, status: 2})
                        dispatch({
                            type: "update",
                            payload: {
                                item: {...value, status: 2}
                            }
                        })
                        setTimeout(() => {
                            setRecalculation(!recalculation)
                        }, 200)
                    }
                    setTimeout(() => {
                        setStatusLoading(false)
                    }, 200)
                })
            }
        })
        // Approved
        const onPass = useMemoizedFn(() => {
            if (statusLoading) return
            setStatusLoading(true)
            onChangeStatus({isPass: true}, (value) => {
                if (value) {
                    setPlugin({...value, status: 1})
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...value, status: 1}
                        }
                    })
                    setTimeout(() => {
                        setRecalculation(!recalculation)
                    }, 200)
                }
                setTimeout(() => {
                    setStatusLoading(false)
                }, 200)
            })
        })

        /** --------------- Plugin Debug Start --------------- */
        const [debugPlugin, setDebugPlugin] = useState<PluginDataProps>()
        const [debugShow, setDebugShow] = useState<boolean>(false)

        const onCancelDebug = useMemoizedFn(() => {
            if (debugShow) setDebugShow(false)
        })
        const onMerge = useMemoizedFn((v: string) => {
            setContent(v)
            setUpdateDiff(!updateDiff)
            setDebugShow(false)
            setDebugPlugin(undefined)
        })

        // Convert Page to Debug Info
        const convertDebug = useMemoizedFn(() => {
            return new Promise(async (resolve, reject) => {
                setDebugPlugin(undefined)
                try {
                    if (!plugin) {
                        resolve("false")
                        return
                    }

                    const paramsList =
                        GetPluginLanguage(plugin.type) === "yak"
                            ? await onCodeToInfo(plugin.type, content)
                            : {CliParameter: []}
                    if (!paramsList) {
                        resolve("false")
                        return
                    }
                    const info: PluginDataProps = {
                        ScriptName: plugin.script_name,
                        Type: plugin.type,
                        Params: paramsList.CliParameter,
                        Content: content
                    }
                    setDebugPlugin({...info})

                    resolve("true")
                } catch (error) {
                    resolve("false")
                }
            })
        })

        // Debug
        const onDebug = useMemoizedFn(async () => {
            if (!plugin) return
            if (debugShow) return

            const result = await convertDebug()
            // Plugin Info Error
            if (result === "false") return
            setDebugShow(true)
        })
        /** --------------- Plugin Debug End --------------- */

        // Back
        const onPluginBack = useMemoizedFn(() => {
            onBack({allCheck, selectList, search: searchs, filter: filters})
        })

        const optExtra = useMemoizedFn((data: API.PluginsDetail) => {
            return statusTag[`${data.status}`]
        })

        /** Group Display Management */
        const magGroupState = useMemo(() => {
            if (["admin", "superAdmin"].includes(userInfo.role || "")) return true
            else return false
        }, [userInfo.role])

        /**Selected Group */
        const selectGroup = useMemo(() => {
            const group: YakFilterRemoteObj[] = cloneDeep(filters).plugin_group?.map((item: API.PluginsSearchData) => ({
                name: item.value,
                total: item.count
            }))
            return group || []
        }, [filters])

        if (!plugin) return null

        return (
            <PluginDetails<YakitPluginOnlineDetail>
                pageWrapId='plugin-manage-detail'
                title='Plugin Mgmt'
                spinLoading={spinLoading}
                search={searchs}
                setSearch={setSearchs}
                onSearch={onSearch}
                filterNode={
                    <>
                        <PluginGroup
                            isOnline={true}
                            selectGroup={selectGroup}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                            isShowGroupMagBtn={magGroupState}
                        />
                    </>
                }
                filterBodyBottomNode={
                    <div style={{marginTop: 8}}>
                        <TagsAndGroupRender
                            wrapStyle={{marginBottom: 0}}
                            selectGroup={selectGroup}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                        />
                    </div>
                }
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='check' />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title={selectNum > 0 ? "Batch Download" : "One-click download"} overlayClassName='plugins-tooltip'>
                            <YakitButton
                                loading={downloadLoading}
                                type='text2'
                                icon={<OutlineClouddownloadIcon />}
                                onClick={onDownload}
                            />
                        </Tooltip>
                        {/* <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='Delete Plugin' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                type='text2'
                                loading={delLoading}
                                icon={<OutlineTrashIcon />}
                                onClick={() => {
                                    onBatchDel()
                                }}
                            />
                        </Tooltip> */}
                    </div>
                }
                checked={allCheck}
                onCheck={onAllCheck}
                total={response.pagemeta.total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    numberRoll: scrollTo,
                    data: response.data,
                    loadMoreData: loadMoreData,
                    recalculation: recalculation,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || selectUUIDs.includes(info.uuid)
                        return (
                            <PluginDetailsListItem<API.PluginsDetail>
                                order={i}
                                plugin={info as any}
                                selectUUId={plugin.uuid}
                                check={check}
                                headImg={info.head_img}
                                pluginUUId={info.uuid}
                                pluginName={info.script_name}
                                help={info.help}
                                content={info.content}
                                optCheck={onOptCheck}
                                extra={optExtra}
                                official={info.official}
                                isCorePlugin={!!info.isCorePlugin}
                                pluginType={info.type}
                                onPluginClick={onOptClick}
                            />
                        )
                    },
                    page: response.pagemeta.page,
                    hasMore: response.pagemeta.total !== response.data.length,
                    loading: listLoading,
                    defItemHeight: 46,
                    isRef: spinLoading
                }}
                onBack={onPluginBack}
            >
                <div className={styles["details-content-wrapper"]}>
                    <PluginTabs tabPosition='right'>
                        <TabPane tab='Source Code' key='code'>
                            <YakitSpin spinning={loading}>
                                <div className={styles["plugin-info-wrapper"]}>
                                    <PluginDetailHeader
                                        pluginName={plugin.script_name}
                                        help={plugin.help}
                                        titleNode={statusTag[+plugin.status]}
                                        tags={plugin.tags}
                                        extraNode={
                                            <div className={styles["plugin-info-extra-header"]}>
                                                {+plugin.status !== 0 && (
                                                    <>
                                                        <Tooltip
                                                            title={+plugin.status === 1 ? "Mark as Unapproved" : "Mark as Approved"}
                                                            overlayClassName='plugins-tooltip'
                                                        >
                                                            <YakitButton
                                                                loading={statusLoading}
                                                                type='text2'
                                                                icon={<OutlinePencilIcon />}
                                                                onClick={() => {
                                                                    if (+plugin.status === 1) onOpenReason()
                                                                    else onPass()
                                                                }}
                                                            />
                                                        </Tooltip>
                                                        <div style={{height: 12}} className='divider-style'></div>
                                                    </>
                                                )}
                                                <Tooltip title='Delete Plugin' overlayClassName='plugins-tooltip'>
                                                    <YakitButton
                                                        type='text2'
                                                        icon={<OutlineTrashIcon />}
                                                        loading={delLoading}
                                                        onClick={() => {
                                                            if (delLoading) return
                                                            setDelLoading(true)
                                                            onBatchDel(plugin)
                                                        }}
                                                    />
                                                </Tooltip>

                                                {+plugin.status === 0 && (
                                                    <>
                                                        <FuncBtn
                                                            maxWidth={1100}
                                                            type='outline1'
                                                            colors='danger'
                                                            icon={<SolidBanIcon />}
                                                            loading={statusLoading}
                                                            name={"Bypass"}
                                                            onClick={onOpenReason}
                                                        />
                                                        <FuncBtn
                                                            maxWidth={1100}
                                                            colors='success'
                                                            icon={<SolidBadgecheckIcon />}
                                                            loading={statusLoading}
                                                            name={"Approved"}
                                                            onClick={onPass}
                                                        />
                                                        <FuncBtn
                                                            maxWidth={1100}
                                                            icon={<OutlineCodeIcon />}
                                                            name={"Debug"}
                                                            onClick={onDebug}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        }
                                        img={plugin.head_img}
                                        user={plugin.authors}
                                        pluginId={plugin.uuid}
                                        updated_at={plugin.updated_at}
                                        prImgs={(plugin.collaborator || []).map((ele) => ({
                                            headImg: ele.head_img,
                                            userName: ele.user_name
                                        }))}
                                        type={plugin.type}
                                        wrapperClassName={styles["plugin-info-header"]}
                                    />

                                    {+plugin.status === 0 ? (
                                        <div className={styles["plugin-info-body"]}>
                                            <div className={styles["plugin-modify-info"]}>
                                                {isApply && (
                                                    <div className={styles["modify-advice"]}>
                                                        <div className={styles["advice-icon"]}>
                                                            <OutlineLightbulbIcon />
                                                        </div>
                                                        <div className={styles["advice-body"]}>
                                                            <div className={styles["advice-content"]}>
                                                                <div className={styles["content-title"]}>
                                                                    Edit Description
                                                                </div>
                                                                <div className={styles["content-style"]}>
                                                                    {apply?.description || ""}
                                                                </div>
                                                            </div>
                                                            <div className={styles["advice-user"]}>
                                                                <AuthorImg src={apply?.img || ""} />
                                                                {apply?.name || ""}
                                                                <ApplicantIcon />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <PluginModifyInfo
                                                    ref={infoRef}
                                                    isEdit={true}
                                                    data={infoParams}
                                                    tagsCallback={onTagsCallback}
                                                />
                                            </div>
                                            <div className={styles["plugin-setting-info"]}>
                                                <div className={styles["setting-header"]}>Plugin Config</div>
                                                <div className={styles["setting-body"]}>
                                                    <PluginModifySetting
                                                        ref={settingRef}
                                                        type={plugin.type}
                                                        tags={cacheTags || []}
                                                        setTags={onSwitchToTags}
                                                        data={settingParams}
                                                    />
                                                    <PluginEditorDiff
                                                        language={plugin.type}
                                                        isDiff={isApply}
                                                        newCode={content}
                                                        oldCode={oldContent}
                                                        setCode={setContent}
                                                        triggerUpdate={updateDiff}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles["details-editor-wrapper"]}>
                                            <YakitEditor type={plugin.type} value={content} readOnly={true} />
                                        </div>
                                    )}

                                    {debugShow && (
                                        <PluginDebug
                                            getContainer={document.getElementById("plugin-manage-detail") || undefined}
                                            plugin={debugPlugin}
                                            visible={debugShow}
                                            onClose={onCancelDebug}
                                            onMerge={onMerge}
                                        />
                                    )}
                                </div>
                            </YakitSpin>
                        </TabPane>
                    </PluginTabs>
                </div>

                <ReasonModal
                    visible={showReason.visible}
                    setVisible={onCancelReason}
                    type={showReason.type}
                    onOK={onReasonCallback}
                />
            </PluginDetails>
        )
    })
)
