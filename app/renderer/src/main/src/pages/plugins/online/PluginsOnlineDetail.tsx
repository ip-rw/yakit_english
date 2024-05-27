import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem} from "../baseTemplate"
import {OutlineClouddownloadIcon, OutlineCursorclickIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FilterPopoverBtn, FuncBtn, OnlineExtraOperate} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {OnlineBackInfoProps, PluginsOnlineDetailProps, YakitPluginOnlineDetail} from "./PluginsOnlineType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import {thousandthConversion} from "../pluginReducer"
import {useStore} from "@/store"
import {LoadingOutlined} from "@ant-design/icons"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {onlineUseToLocalDetail} from "../utils"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {PluginLog} from "../log/PluginLog"

import "../plugins.scss"
import styles from "./PluginsOnlineDetail.module.scss"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {API} from "@/services/swagger/resposeType"
import {PluginComment} from "../baseComment"

const {ipcRenderer} = window.require("electron")

const {TabPane} = PluginTabs

const wrapperId = "plugin-online-detail"

export const PluginsOnlineDetail: React.FC<PluginsOnlineDetailProps> = (props) => {
    const {
        info,
        defaultAllCheck,
        // onCheck,
        defaultSelectList,
        // optCheck,
        response,
        onBack,
        loadMoreData,
        loading,
        defaultSearchValue,
        defaultFilter,
        dispatch,
        onBatchDownload,
        downloadLoading,
        onDetailSearch,
        spinLoading,
        currentIndex,
        setCurrentIndex
    } = props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)
    const [selectList, setSelectList] = useState<string[]>(defaultSelectList)
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    // Skip initial state due to non-execution of directional scroll in RollingLoadList
    const [scrollTo, setScrollTo] = useState<number>(0)

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()

    const userInfo = useStore((s) => s.userInfo)

    // Selected Plugin Count
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    useEffect(() => {
        if (info) {
            setPlugin({...info})
            // Add delay to prevent operation from being initial data for RollingLoadList
            setTimeout(() => {
                setScrollTo(currentIndex)
            }, 100)
        } else setPlugin(undefined)
    }, [info])
    /**Go to Use, Navigate to Local Plugin Details */
    const onUse = useMemoizedFn(() => {
        if (!plugin) return
        onlineUseToLocalDetail(plugin.uuid, "online")
    })
    // Back
    const onPluginBack = useMemoizedFn(() => {
        onBack({
            search,
            filter: filters,
            allCheck,
            selectList
        })
        setPlugin(undefined)
    })
    const onLikeClick = useMemoizedFn(() => {
        if (plugin) {
            const newLikeItem = {...plugin}
            if (newLikeItem.is_stars) {
                newLikeItem.is_stars = false
                newLikeItem.stars = newLikeItem.stars - 1
                newLikeItem.starsCountString = thousandthConversion(newLikeItem.stars)
            } else {
                newLikeItem.is_stars = true
                newLikeItem.stars = newLikeItem.stars + 1
                newLikeItem.starsCountString = thousandthConversion(newLikeItem.stars)
            }
            setPlugin({...newLikeItem})
        }
    })
    const onCommentClick = useMemoizedFn(() => {
        yakitNotify("success", "Comment~~~")
    })
    const onDownloadClick = useMemoizedFn(() => {
        if (plugin) {
            const newDownloadItem = {...plugin}
            newDownloadItem.downloaded_total = newDownloadItem.downloaded_total + 1
            newDownloadItem.downloadedTotalString = thousandthConversion(newDownloadItem.downloaded_total)
            setPlugin({...newDownloadItem})
        }
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
    const onPluginClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setCurrentIndex(index)
        setPlugin({...data})
    })
    const onDownload = useMemoizedFn(() => {
        const params: OnlineBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        onBatchDownload(params, () => {
            onCheck(false)
        })
    })
    /**Convert Group Parameter*/
    const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
        const realFilters: PluginFilterParams = {
            ...filter,
            plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
        }
        return realFilters
    }
    const onFilter = useMemoizedFn((value: PluginFilterParams) => {
        setFilters(value)
        onDetailSearch(search, value)
        setAllCheck(false)
        setSelectList([])
    })
    /** Create Plugin */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })
    /**Clear Selection for Search */
    const onSearch = useMemoizedFn(() => {
        onDetailSearch(search, filters)
        setAllCheck(false)
        setSelectList([])
    })

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
            title='Plugin Store'
            pageWrapId={wrapperId}
            filterNode={
                <>
                    <PluginGroup
                        isOnline={true}
                        selectGroup={selectGroup}
                        setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                        isShowGroupMagBtn={false}
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
                    <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='online' />
                    <div style={{height: 12}} className='divider-style'></div>
                    {downloadLoading ? (
                        <LoadingOutlined className='loading-icon' />
                    ) : (
                        <Tooltip title='Download Plugin' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineClouddownloadIcon />} onClick={onDownload} />
                        </Tooltip>
                    )}
                    <div style={{height: 12}} className='divider-style'></div>
                    <YakitButton type='text' onClick={onNewAddPlugin}>
                        Create Plugin
                    </YakitButton>
                </div>
            }
            checked={allCheck}
            onCheck={onCheck}
            total={response.pagemeta.total}
            selected={selectNum}
            listProps={{
                rowKey: "uuid",
                numberRoll: scrollTo,
                data: response.data,
                loadMoreData: loadMoreData,
                classNameRow: "plugin-details-opt-wrapper",
                renderRow: (info, i) => {
                    const check = allCheck || selectList.includes(info.uuid)
                    return (
                        <PluginDetailsListItem<YakitPluginOnlineDetail>
                            order={i}
                            plugin={info}
                            selectUUId={plugin.uuid}
                            check={check}
                            headImg={info.head_img}
                            pluginUUId={info.uuid}
                            pluginName={info.script_name}
                            help={info.help}
                            content={info.content}
                            optCheck={optCheck}
                            official={info.official}
                            isCorePlugin={!!info.isCorePlugin}
                            pluginType={info.type}
                            onPluginClick={onPluginClick}
                        />
                    )
                },
                page: response.pagemeta.page,
                hasMore: +response.pagemeta.total !== response.data.length,
                loading: loading,
                defItemHeight: 46,
                isRef: spinLoading
            }}
            onBack={onPluginBack}
            search={search}
            setSearch={setSearch}
            onSearch={onSearch}
            spinLoading={spinLoading}
        >
            <div className={styles["details-content-wrapper"]}>
                <PluginTabs tabPosition='right'>
                    <TabPane tab='Source Code' key='code'>
                        <div className={styles["plugin-info-wrapper"]}>
                            <PluginDetailHeader
                                pluginName={plugin.script_name}
                                help={plugin.help}
                                tags={plugin.tags}
                                extraNode={
                                    <div className={styles["plugin-info-extra-header"]}>
                                        <OnlineExtraOperate
                                            data={plugin}
                                            isLogin={userInfo.isLogin}
                                            dispatch={dispatch}
                                            likeProps={{
                                                active: plugin.is_stars,
                                                likeNumber: plugin.starsCountString || "",
                                                onLikeClick: onLikeClick
                                            }}
                                            commentProps={{
                                                commentNumber: plugin.commentCountString || ""
                                                // onCommentClick: onCommentClick
                                            }}
                                            downloadProps={{
                                                downloadNumber: plugin.downloadedTotalString || "",
                                                onDownloadClick: onDownloadClick
                                            }}
                                        />
                                        <FuncBtn
                                            maxWidth={1100}
                                            icon={<OutlineCursorclickIcon />}
                                            name={"Go to Use"}
                                            onClick={onUse}
                                        />
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
                            />
                            <div className={styles["details-editor-wrapper"]}>
                                <YakitEditor type={plugin.type} value={plugin.content} readOnly={true} />
                            </div>
                        </div>
                    </TabPane>
                    <TabPane tab='Comment' key='comment'>
                        <div className={styles["plugin-comment-wrapper"]}>
                            <PluginDetailHeader
                                pluginName={plugin.script_name}
                                help={plugin.help}
                                tags={plugin.tags}
                                wrapperClassName={styles["plugin-comment-detail-header"]}
                                extraNode={
                                    <div className={styles["plugin-info-extra-header"]}>
                                        <OnlineExtraOperate
                                            data={plugin}
                                            isLogin={userInfo.isLogin}
                                            dispatch={dispatch}
                                            likeProps={{
                                                active: plugin.is_stars,
                                                likeNumber: plugin.starsCountString || "",
                                                onLikeClick: onLikeClick
                                            }}
                                            commentProps={{
                                                commentNumber: plugin.commentCountString || ""
                                                // onCommentClick: onCommentClick
                                            }}
                                            downloadProps={{
                                                downloadNumber: plugin.downloadedTotalString || "",
                                                onDownloadClick: onDownloadClick
                                            }}
                                        />
                                        <FuncBtn
                                            maxWidth={1100}
                                            icon={<OutlineCursorclickIcon />}
                                            name={"Go to Use"}
                                            onClick={onUse}
                                        />
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
                            />
                            <PluginComment isLogin={userInfo.isLogin} plugin={{...plugin}} />
                        </div>
                    </TabPane>
                    <TabPane tab='Logs' key='log'>
                        <PluginLog uuid={plugin.uuid || ""} getContainer={wrapperId} />
                    </TabPane>
                </PluginTabs>
            </div>
        </PluginDetails>
    )
}
