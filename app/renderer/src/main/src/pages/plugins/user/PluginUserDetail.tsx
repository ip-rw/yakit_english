import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem, statusTag} from "../baseTemplate"
import {OutlineClouddownloadIcon, OutlineCursorclickIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FilterPopoverBtn, FuncBtn} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {OnlineUserExtraOperate} from "./PluginUser"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import {PluginUserDetailProps, UserBackInfoProps} from "./PluginUserType"
import {useStore} from "@/store"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {onlineUseToLocalDetail} from "../utils"
import {LoadingOutlined} from "@ant-design/icons"
import {SolidPrivatepluginIcon} from "@/assets/icon/colors"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {PluginLog} from "../log/PluginLog"

import "../plugins.scss"
import styles from "./PluginUserDetail.module.scss"

const {TabPane} = PluginTabs

const wrapperId = "plugin-user-detail"

export const PluginUserDetail: React.FC<PluginUserDetailProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            info,
            defaultAllCheck,
            defaultSelectList,
            defaultFilter,
            response,
            onBack,
            loadMoreData,
            defaultSearchValue,
            dispatch,
            onRemovePluginDetailSingleBefore,
            onDetailSearch,
            currentIndex,
            setCurrentIndex,
            onDetailsBatchDownload,
            // onDetailsBatchRemove,
            // removeLoading,
            downloadLoading
        } = props
        const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
        const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
        const [selectList, setSelectList] = useState<string[]>(defaultSelectList)
        const [loading, setLoading] = useState<boolean>(false)
        const [spinLoading, setSpinLoading] = useState<boolean>(false)
        const [recalculation, setRecalculation] = useState<boolean>(false) // Refresh Virtual List After Item Update
        const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

        const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)

        // Skip initial state due to non-execution of directional scroll in RollingLoadList
        const [scrollTo, setScrollTo] = useState<number>(0)

        const userInfo = useStore((s) => s.userInfo)

        // Selected Plugin Count
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList])

        useImperativeHandle(
            ref,
            () => ({
                onRecalculation
            }),
            [allCheck, selectList]
        )

        useEffect(() => {
            if (info) {
                setPlugin({...info})
                // Add delay to prevent operation from being initial data for RollingLoadList
                setTimeout(() => {
                    setScrollTo(currentIndex)
                }, 100)
            } else setPlugin(undefined)
        }, [info])

        /**Refresh My Plugin List */
        const onRecalculation = useMemoizedFn(() => {
            setRecalculation(!recalculation)
        })
        /**Go to Use, Navigate to Local Plugin Details */
        const onUse = useMemoizedFn(() => {
            if (!plugin) return
            onlineUseToLocalDetail(plugin.uuid, "mine")
        })
        // Back
        const onPluginBack = useMemoizedFn(() => {
            onBack({
                search,
                filter: filters,
                selectList,
                allCheck
            })
            setPlugin(undefined)
        })

        const onUserDetailSelect = useMemoizedFn((key) => {
            switch (key) {
                case "editState":
                    onEditState()
                    break
                case "remove":
                    onRemove()
                    break
                default:
                    break
            }
        })
        const onEditState = useMemoizedFn(() => {
            if (!plugin) return
            const isPrivate: boolean = !plugin.is_private
            let status: number = 0
            if (userInfo.role === "ordinary") {
                // Pending Review
                status = 0
            } else {
                // Approved
                if (!isPrivate) status = 1
            }
            const editPlugin = {...plugin, is_private: isPrivate, status}

            setPlugin({
                ...editPlugin
            })
            setRecalculation(!recalculation)
        })
        const onRemove = useMemoizedFn(() => {
            if (!plugin) return
            onRemovePluginDetailSingleBefore(plugin)
        })
        const onLoadMoreData = useMemoizedFn(async () => {
            if (loading) return
            setLoading(true)
            await loadMoreData()
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })
        /** Extra Params Modal */
        const optExtra = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            return data.is_private ? <SolidPrivatepluginIcon className='icon-svg-16' /> : statusTag[`${data.status}`]
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
        const onFilter = useMemoizedFn(async (value: PluginFilterParams) => {
            setSpinLoading(true)
            try {
                setFilters(value)
                await onDetailSearch(search, value)
                setAllCheck(false)
                setSelectList([])
            } catch (error) {}
            setTimeout(() => {
                setSpinLoading(false)
            }, 200)
        })
        /** Create New Plugin */
        const onNewAddPlugin = useMemoizedFn(() => {
            emiter.emit(
                "openPage",
                JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Owner}})
            )
        })
        /**Clear Selection for Search */
        const onSearch = useMemoizedFn(async () => {
            setSpinLoading(true)
            try {
                await onDetailSearch(search, filters)
            } catch (error) {}
            setAllCheck(false)
            setSelectList([])
            setTimeout(() => {
                setSpinLoading(false)
            }, 200)
        })
        /**Detail Bulk Delete */
        // const onBatchRemove = useMemoizedFn(async () => {
        //     const params: UserBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        //     onDetailsBatchRemove(params)
        //     setAllCheck(false)
        //     setSelectList([])
        // })
        /**Batch Download Details */
        const onBatchDownload = useMemoizedFn(async () => {
            const params: UserBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
            onDetailsBatchDownload(params)
            setAllCheck(false)
            setSelectList([])
        })
        if (!plugin) return null
        return (
            <>
                <PluginDetails<YakitPluginOnlineDetail>
                    title='My Cloud Plugin'
                    pageWrapId={wrapperId}
                    filterExtra={
                        <div className={"details-filter-extra-wrapper"}>
                            <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='user' />
                            <div style={{height: 12}} className='divider-style'></div>
                            {downloadLoading ? (
                                <LoadingOutlined className='loading-icon' />
                            ) : (
                                <Tooltip title='Download Plugin' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineClouddownloadIcon />}
                                        onClick={onBatchDownload}
                                    />
                                </Tooltip>
                            )}
                            {/* <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='Delete Plugin' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onBatchRemove} />
                        </Tooltip> */}
                            <div style={{height: 12}} className='divider-style'></div>
                            <YakitButton type='text' onClick={onNewAddPlugin}>
                                Create New Plugin
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
                        loadMoreData: onLoadMoreData,
                        classNameRow: "plugin-details-opt-wrapper",
                        recalculation,
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
                                    extra={optExtra}
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
                                                <OnlineUserExtraOperate
                                                    dispatch={dispatch}
                                                    userInfoRole={userInfo.role || ""}
                                                    plugin={plugin}
                                                    onSelect={onUserDetailSelect}
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
                                        basePluginName={plugin.base_script_name}
                                    />
                                    <div className={styles["details-editor-wrapper"]}>
                                        <YakitEditor type={plugin.type} value={plugin.content} readOnly={true} />
                                    </div>
                                </div>
                            </TabPane>
                            <TabPane tab='Logs' key='log'>
                                <PluginLog uuid={plugin.uuid || ""} getContainer={wrapperId} />
                            </TabPane>
                        </PluginTabs>
                    </div>
                </PluginDetails>
            </>
        )
    })
)
