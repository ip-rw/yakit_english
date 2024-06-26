import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    AuthorImgProps,
    CodeScoreModalProps,
    CodeScoreModuleProps,
    CodeScoreSmokingEvaluateResponseProps,
    FilterPopoverBtnProps,
    FuncBtnProps,
    FuncFilterPopoverProps,
    FuncSearchProps,
    GridLayoutOptProps,
    GridListProps,
    ListLayoutOptProps,
    ListListProps,
    ListShowContainerProps,
    OnlineExtraOperateProps,
    OnlineRecycleExtraOperateProps,
    PluginDiffEditorModalProps,
    PluginEditorModalProps,
    PluginTypeTagProps,
    PluginsListProps,
    TagShowOpt,
    TagsListShowProps,
    TypeSelectProps
} from "./funcTemplateType"
import {
    useControllableValue,
    useDebounceFn,
    useGetState,
    useInViewport,
    useMemoizedFn,
    useSize,
    useThrottleFn,
    useVirtualList
} from "ahooks"
import {
    OutlineArrowscollapseIcon,
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineDatabasebackupIcon,
    OutlineDotshorizontalIcon,
    OutlineFilterIcon,
    OutlineOpenIcon,
    OutlineSearchIcon,
    OutlineThumbupIcon,
    OutlineTrashIcon,
    OutlineViewgridIcon,
    OutlineViewlistIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidCheckIcon, SolidExclamationIcon, SolidThumbupIcon} from "@/assets/icon/solid"
import {
    SolidOfficialpluginIcon,
    SolidYakitPluginIcon,
    SolidPluginYakMitmIcon,
    SolidPluginProtScanIcon,
    SolidSparklesPluginIcon,
    SolidDocumentSearchPluginIcon,
    SolidCollectionPluginIcon
} from "@/assets/icon/colors"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Dropdown, Form, Radio, Tooltip} from "antd"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {formatDate} from "@/utils/timeUtil"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {PluginTestErrorIcon, PluginTestWarningIcon, PluginsGridCheckIcon} from "./icon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import YakitLogo from "@/assets/yakitLogo.png"
import {PluginFilterParams, PluginSearchParams} from "./baseTemplateType"
import {yakitNotify} from "@/utils/notification"
import {
    DownloadOnlinePluginsRequest,
    PluginStarsRequest,
    apiDownloadPluginOnline,
    apiFetchGroupStatisticsCheck,
    apiFetchGroupStatisticsLocal,
    apiFetchGroupStatisticsMine,
    apiFetchGroupStatisticsOnline,
    apiPluginStars
} from "./utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import {API} from "@/services/swagger/resposeType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {funcSearchType, pluginTypeToName} from "./builtInData"
import UnLogin from "@/assets/unLogin.png"
import {v4 as uuidv4} from "uuid"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import has from "lodash/has"

import classNames from "classnames"
import "./plugins.scss"
import styles from "./funcTemplate.module.scss"

const {ipcRenderer} = window.require("electron")

/** @Name: Title Bar Search Component */
export const TypeSelect: React.FC<TypeSelectProps> = memo((props) => {
    const {active, list, setActive} = props

    const divRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(divRef)

    const [visible, setVisible, getVisible] = useGetState<boolean>(false)

    const isEllipsis = useMemo(() => {
        return inViewport
    }, [inViewport])

    useEffect(() => {
        if (isEllipsis && getVisible()) setVisible(false)
    }, [isEllipsis])

    return (
        <div className={styles["type-select-wrapper"]}>
            {list.map((item, index) => {
                const select = active.findIndex((ele) => ele.key === item.key) !== -1
                return (
                    <div
                        key={item.key}
                        className={classNames(styles["type-select-opt"], {
                            [styles["type-select-active"]]: select
                        })}
                        onClick={() => {
                            if (select) setActive(active.filter((el) => el.key !== item.key))
                            else
                                setActive(
                                    active.concat([
                                        {
                                            key: item.key,
                                            name: item.name
                                        }
                                    ])
                                )
                        }}
                    >
                        {item.icon}
                        <div className={styles["content-style"]}>
                            {item.name}
                            {index === list.length - 1 && <div ref={divRef} className={styles["mask-wrapper"]}></div>}
                        </div>
                    </div>
                )
            })}

            {!isEllipsis && (
                <div className={styles["ellipsis-wrapper"]}>
                    <YakitPopover
                        overlayClassName={styles["ellipsis-type-select-popover"]}
                        trigger={"click"}
                        placement='bottomRight'
                        visible={visible}
                        onVisibleChange={(value) => setVisible(value)}
                        content={
                            <div className={styles["ellipsis-type-select-wrapper"]}>
                                <div className={styles["list-wrapper"]}>
                                    {list.map((item) => {
                                        return (
                                            <div
                                                key={item.key}
                                                className={classNames(styles["opt-wrapper"], {
                                                    [styles["opt-active"]]:
                                                        active.findIndex((ele) => ele.key === item.key) !== -1
                                                })}
                                                onClick={() => {
                                                    if (active.findIndex((ele) => ele.key === item.key) !== -1)
                                                        setActive(active.filter((el) => el.key !== item.key))
                                                    else
                                                        setActive(
                                                            active.concat([
                                                                {
                                                                    key: item.key,
                                                                    name: item.name
                                                                }
                                                            ])
                                                        )
                                                }}
                                            >
                                                {item.name}
                                                <SolidCheckIcon />
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className={styles["list-btn-wrapper"]}>
                                    <div className={styles["btn-style"]} onClick={() => setActive([])}>
                                        Reset
                                    </div>
                                </div>
                            </div>
                        }
                    >
                        <div className={classNames(styles["ellipsis-body"], {[styles["ellipsis-active"]]: visible})}>
                            <OutlineDotshorizontalIcon />
                        </div>
                    </YakitPopover>
                </div>
            )}
        </div>
    )
})

/** @Name: Adaptive Button Component */
export const FuncBtn: React.FC<FuncBtnProps> = memo((props) => {
    const {name, maxWidth, className, ...rest} = props

    const [isIcon, setIsIcon, getIsIcon] = useGetState<boolean>(false)
    const mediaHandle = useMemoizedFn((e) => {
        let value = !!e.matches
        if (getIsIcon() === value) return
        setIsIcon(value)
    })
    useEffect(() => {
        if (!maxWidth) return
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)
        setIsIcon(!!mediaQuery.matches)

        mediaQuery.addEventListener("change", mediaHandle)
        return () => {
            mediaQuery.removeEventListener("change", mediaHandle)
        }
    }, [])

    return isIcon ? (
        <Tooltip title={name} overlayClassName='plugins-tooltip'>
            <YakitButton {...rest}></YakitButton>
        </Tooltip>
    ) : (
        <YakitButton {...rest}>
            <span className={styles["title-style"]}>{name}</span>
        </YakitButton>
    )
})

/** @Name: Adaptive Search Content Component */
export const FuncSearch: React.FC<FuncSearchProps> = memo((props) => {
    const {maxWidth, onSearch: onsearch} = props

    const [isIcon, setIsIcon, getIsIcon] = useGetState<boolean>(false)
    const mediaHandle = useMemoizedFn((e) => {
        let value = !!e.matches
        if (getIsIcon() === value) return
        if (showPopver && !value) setShowPopver(false)
        setIsIcon(value)
    })
    useEffect(() => {
        if (!maxWidth) return
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)
        setIsIcon(!!mediaQuery.matches)

        mediaQuery.addEventListener("change", mediaHandle)
        return () => {
            mediaQuery.removeEventListener("change", mediaHandle)
        }
    }, [])

    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const [showPopver, setShowPopver] = useState<boolean>(false)

    const onTypeChange = useMemoizedFn((value: string) => {
        setSearch({
            ...search,
            type: value as "keyword" | "userName"
        })
    })
    const onValueChange = useMemoizedFn((e) => {
        if (search.type === "keyword") {
            const keywordSearch: PluginSearchParams = {
                ...search,
                keyword: e.target.value
            }
            setSearch({
                ...keywordSearch
            })
        } else {
            const userNameSearch: PluginSearchParams = {
                ...search,
                userName: e.target.value
            }
            setSearch({
                ...userNameSearch
            })
        }
    })
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            onsearch(search)
        }),
        {wait: 0}
    ).run
    const searchValue = useMemo(() => {
        if (search.type === "keyword") {
            return search.keyword
        } else {
            return search.userName
        }
    }, [search])
    return (
        <div className={isIcon ? styles["func-search-icon-wrapper"] : styles["func-search-wrapper"]}>
            <YakitCombinationSearch
                wrapperClassName={styles["search-body"]}
                valueBeforeOption={search.type}
                addonBeforeOption={funcSearchType}
                onSelectBeforeOption={onTypeChange}
                inputSearchModuleTypeProps={{
                    value: searchValue,
                    onChange: onValueChange,
                    onSearch: onSearch
                }}
            />
            <YakitPopover
                overlayClassName={styles["func-search-popver"]}
                content={
                    <YakitCombinationSearch
                        valueBeforeOption={search.type}
                        addonBeforeOption={funcSearchType}
                        onSelectBeforeOption={onTypeChange}
                        inputSearchModuleTypeProps={{
                            value: searchValue,
                            onChange: onValueChange,
                            onSearch: onSearch
                        }}
                    />
                }
                trigger='click'
                visible={showPopver}
                onVisibleChange={setShowPopver}
                placement='bottomRight'
            >
                <YakitButton
                    className={styles["search-icon"]}
                    size='large'
                    type='outline2'
                    icon={<OutlineSearchIcon />}
                    isActive={showPopver}
                ></YakitButton>
            </YakitPopover>
        </div>
    )
})

/** @Name: Dropdown Button Component */
export const FuncFilterPopover: React.FC<FuncFilterPopoverProps> = memo((props) => {
    const {
        maxWidth,
        icon,
        name,
        menu: {onClick, type = "grey", ...menurest},
        button,
        disabled,
        placement = "bottom"
    } = props

    const [isIcon, setIsIcon, getIsIcon] = useGetState<boolean>(false)
    const mediaHandle = useMemoizedFn((e) => {
        let value = !!e.matches
        if (getIsIcon() === value) return
        setIsIcon(value)
    })
    useEffect(() => {
        if (!maxWidth) return
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)
        setIsIcon(!!mediaQuery.matches)

        mediaQuery.addEventListener("change", mediaHandle)
        return () => {
            mediaQuery.removeEventListener("change", mediaHandle)
        }
    }, [])

    /** Determine if component is icon-only or contains content */
    const nameAndIcon = useMemo(() => {
        if (!name) return false
        if (isIcon) return false
        return true
    }, [name, isIcon])

    const [show, setShow] = useState<boolean>(false)

    const overlay = useMemo(() => {
        return (
            <YakitMenu
                {...menurest}
                type={type}
                onClick={(e) => {
                    e.domEvent.stopPropagation()
                    if (onClick) onClick(e)
                    setShow(false)
                }}
            />
        )
    }, [onClick, type, menurest])
    return (
        <Dropdown
            overlayClassName={styles["func-filter-popover"]}
            overlay={overlay}
            placement={placement}
            onVisibleChange={setShow}
            disabled={disabled}
        >
            {nameAndIcon ? (
                <YakitButton
                    // style={{padding: "3px 4px"}}
                    isActive={show}
                    onClick={(e) => e.stopPropagation()}
                    {...(button || {})}
                >
                    {name}
                    {icon}
                </YakitButton>
            ) : (
                <YakitButton
                    isActive={show}
                    icon={icon}
                    onClick={(e) => e.stopPropagation()}
                    {...(button || {})}
                ></YakitButton>
            )}
        </Dropdown>
    )
})

/** @Name: Author ICON */
export const AuthorIcon: React.FC<{}> = memo((props) => {
    return <div className={styles["author-icon-wrapper"]}>Author</div>
})
/** @Name: Applicant ICON */
export const ApplicantIcon: React.FC<{}> = memo((props) => {
    return <div className={styles["applicant-icon-wrapper"]}>Applicant</div>
})

/** @Name: Plugin Main Component */
export const PluginsList: React.FC<PluginsListProps> = memo((props) => {
    const {
        checked,
        onCheck,
        isList,
        setIsList,
        total,
        selected,
        filters,
        setFilters,
        extraHeader,
        children,
        visible,
        setVisible
    } = props

    /** Indeterminate State Checkbox */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    const [tagShow, setTagShow] = useState<boolean>(false)
    const onExpend = useMemoizedFn(() => {
        setVisible(true)
    })

    const onDelTag = useMemoizedFn((value: TagShowOpt) => {
        if (has(filters,value.tagType)) {
            const list: TagShowOpt[] = filters[value.tagType]
            filters[value.tagType] = list.filter((ele) => ele.value !== value.value)
            setFilters({...filters})
        }
    })
    const onDelAllTag = useMemoizedFn(() => {
        let newFilters: PluginFilterParams = {}
        Object.keys(filters).forEach((key) => {
            newFilters[key] = []
        })
        setFilters(newFilters)
    })

    const showTagList = useMemo(() => {
        let list: TagShowOpt[] = []
        try {
            Object.entries(filters).forEach(([key, value]) => {
                const itemList = (value || []).map((ele) => ({tagType: key, label: ele.label, value: ele.value}))
                if (itemList.length > 0) {
                    list = [...list, ...itemList]
                }
            })
        } catch (error) {}
        return list
    }, [filters])
    const tagLength = useMemo(() => {
        return showTagList.length
    }, [showTagList])
    return (
        <div className={styles["plugins-list"]}>
            <div className={styles["list-header"]}>
                <div className={styles["header-body"]}>
                    {!visible && (
                        <div className={styles["header-body-filter"]}>
                            <Tooltip title='Expand Filters' placement='topLeft' overlayClassName='plugins-tooltip'>
                                <YakitButton
                                    type='text2'
                                    onClick={onExpend}
                                    icon={
                                        <OutlineOpenIcon className={styles["panel-header-icon"]} onClick={onExpend} />
                                    }
                                ></YakitButton>
                            </Tooltip>
                        </div>
                    )}
                    <div className={styles["body-check"]}>
                        <YakitCheckbox
                            indeterminate={checkIndeterminate}
                            checked={checked}
                            onChange={(e) => onCheck(e.target.checked)}
                        />
                        Fixes failure to iterate load_content on missing older version data
                    </div>
                    <div className={styles["body-total-selected"]}>
                        <div>
                            Total <span className={styles["num-style"]}>{+total || 0}</span>
                        </div>
                        <div className={styles["divider-style"]} />
                        <div>
                            Selected <span className={styles["num-style"]}>{+selected || 0}</span>
                        </div>
                    </div>
                    {tagLength > 0 && (
                        <div className={styles["body-filter-tag"]}>
                            {tagLength <= 2 ? (
                                showTagList.map((item) => {
                                    return (
                                        <YakitTag key={item.value} color='info' closable onClose={() => onDelTag(item)}>
                                            {item.label}
                                        </YakitTag>
                                    )
                                })
                            ) : (
                                <YakitPopover
                                    overlayClassName={styles["plugins-list-tag-total-popover"]}
                                    content={
                                        <div className={styles["plugins-list-tag-total"]}>
                                            {showTagList.map((item) => {
                                                return (
                                                    <Tooltip
                                                        title={item.label}
                                                        placement='top'
                                                        overlayClassName='plugins-tooltip'
                                                        key={item.value}
                                                    >
                                                        <YakitTag closable onClose={() => onDelTag(item)}>
                                                            {item.label}
                                                        </YakitTag>
                                                    </Tooltip>
                                                )
                                            })}
                                        </div>
                                    }
                                    trigger='hover'
                                    onVisibleChange={setTagShow}
                                    placement='bottomLeft'
                                >
                                    <div
                                        className={classNames(styles["tag-total"], {
                                            [styles["tag-total-active"]]: tagShow
                                        })}
                                    >
                                        <span>
                                            Filter Criteria <span className={styles["total-style"]}>{tagLength}</span>
                                        </span>
                                        <OutlineXIcon onClick={() => onDelAllTag()} />
                                    </div>
                                </YakitPopover>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles["header-extra"]}>
                    {extraHeader || null}
                    <Tooltip
                        className='plugins-tooltip'
                        placement='topRight'
                        title={isList ? "Switch to Grid View" : "Switch to ListView"}
                    >
                        <div className={styles["is-list-btn"]} onClick={() => setIsList(!isList)}>
                            {isList ? <OutlineViewgridIcon /> : <OutlineViewlistIcon />}
                        </div>
                    </Tooltip>
                </div>
            </div>

            <div className={styles["list-body"]}>{children}</div>
        </div>
    )
})

/** @Name: Plugin List Component */
export const ListShowContainer: <T>(props: ListShowContainerProps<T>) => any = memo((props) => {
    const {
        isList,
        data,
        keyName = "uuid",
        gridNode,
        gridHeight,
        listNode,
        listHeight,
        loading,
        hasMore,
        updateList,
        id,
        listClassName,
        gridClassName,
        showIndex,
        setShowIndex,
        isShowSearchResultEmpty
    } = props

    // useWhyDidYouUpdate("ListShowContainer", {...props})

    const listId = useMemo(() => {
        if (id) {
            return `${id}-list`
        }
    }, [id])
    const gridId = useMemo(() => {
        if (id) {
            return `${id}-grid`
        }
    }, [id])
    return isShowSearchResultEmpty ? (
        <YakitEmpty
            image={SearchResultEmpty}
            imageStyle={{width: 274, height: 180, marginBottom: 24}}
            title='Search Results“Empty”'
            style={{paddingTop: "10%"}}
            className={styles["empty-list"]}
        />
    ) : (
        <div className={styles["list-show-container"]}>
            <div
                tabIndex={isList ? 0 : -1}
                className={classNames(styles["tab-panel"], {[styles["tab-hidden-panel"]]: !isList})}
            >
                <ListList
                    id={listId}
                    isList={isList}
                    data={data}
                    keyName={keyName}
                    render={listNode}
                    optHeight={listHeight}
                    loading={loading}
                    hasMore={hasMore}
                    updateList={updateList}
                    listClassName={listClassName}
                    showIndex={showIndex}
                    setShowIndex={setShowIndex}
                />
            </div>
            <div
                tabIndex={isList ? -1 : 0}
                className={classNames(styles["tab-panel"], {[styles["tab-hidden-panel"]]: isList})}
            >
                <GridList
                    id={gridId}
                    isList={isList}
                    data={data}
                    keyName={keyName}
                    render={gridNode}
                    optHeight={gridHeight}
                    loading={loading}
                    hasMore={hasMore}
                    updateList={updateList}
                    gridClassName={gridClassName}
                    showIndex={showIndex}
                    setShowIndex={setShowIndex}
                />
            </div>
        </div>
    )
})

/** @Name: Plugin List Layout List */
export const ListList: <T>(props: ListListProps<T>) => any = memo((props) => {
    const {
        isList,
        data,
        render,
        keyName,
        optHeight,
        loading,
        hasMore,
        updateList,
        id,
        listClassName,
        showIndex,
        setShowIndex
    } = props

    // useWhyDidYouUpdate("ListList", {...props})

    // List Layout Variables
    const listContainerRef = useRef<HTMLDivElement>(null)
    // Get Component Height Data
    const fetchListHeight = useMemoizedFn(() => {
        const {scrollTop, clientHeight, scrollHeight} = listContainerRef.current || {
            scrollTop: 0,
            clientHeight: 0,
            scrollHeight: 0
        }
        return {scrollTop, clientHeight, scrollHeight}
    })
    const listwrapperRef = useRef<HTMLDivElement>(null)
    const [list, scrollTo] = useVirtualList(data, {
        containerTarget: listContainerRef,
        wrapperTarget: listwrapperRef,
        itemHeight: optHeight || 73,
        overscan: 50
    })

    const [inView] = useInViewport(listContainerRef)
    const oldInView = useRef<boolean>(!!inView)
    useEffect(() => {
        if (!oldInView.current && inView) {
            scrollTo(showIndex || 0)
        }
        // Data Reset Refresh
        if (oldInView.current && inView && showIndex === 0) {
            scrollTo(0)
        }
        oldInView.current = !!inView
    }, [inView, showIndex])

    const onScrollCapture = useThrottleFn(
        useMemoizedFn(() => {
            // Skip Non-List Logic
            if (!isList) return

            if (loading) return
            if (!hasMore) return

            if (listContainerRef && listContainerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListHeight()
                if (setShowIndex) setShowIndex(Math.round(scrollTop / optHeight))

                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= optHeight * 3) {
                    updateList()
                }
            }
        }),
        {wait: 200, leading: false}
    )

    useEffect(() => {
        // Skip Non-List Logic
        if (!isList) return

        if (loading) return
        if (!hasMore) return

        if (listContainerRef && listContainerRef.current && listwrapperRef && listwrapperRef.current) {
            const {clientHeight} = fetchListHeight()
            const bodyHeight = listwrapperRef.current?.clientHeight
            if (bodyHeight + optHeight * 2 <= clientHeight) {
                updateList()
            }
        }
    }, [loading, listContainerRef.current?.clientHeight, listwrapperRef.current?.clientHeight])

    return (
        <div
            ref={listContainerRef}
            id={id}
            className={classNames(styles["list-list-warpper"], listClassName)}
            onScroll={() => onScrollCapture.run()}
        >
            <div ref={listwrapperRef}>
                {list.map((ele) => {
                    return (
                        <div key={(ele.data || {})[keyName]} className={styles["list-opt"]}>
                            {render(ele)}
                        </div>
                    )
                })}
                {!loading && !hasMore && <div className={styles["no-more-wrapper"]}>No More Data</div>}
                {data.length > 0 && loading && (
                    <div className={styles["loading-wrapper"]}>
                        <YakitSpin wrapperClassName={styles["loading-style"]} />
                    </div>
                )}
            </div>
        </div>
    )
})
/** @Name: Plugin List Item Component */
export const ListLayoutOpt: React.FC<ListLayoutOptProps> = memo((props) => {
    const {
        order,
        data,
        checked,
        onCheck,
        img,
        title,
        help,
        time,
        type,
        isCorePlugin,
        official,
        subTitle,
        extraNode,
        onClick
    } = props

    // Subtitle Component
    const subtitle = useMemoizedFn(() => {
        if (subTitle) return subTitle(data)
        return null
    })
    // Extension Component
    const extra = useMemoizedFn(() => {
        if (extraNode) return extraNode(data)
        return null
    })
    // Component Click Callback
    const onclick = useMemoizedFn(() => {
        if (onClick) return onClick(data, order, !checked)
        return null
    })

    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[type].icon} />
        }
        return <AuthorImg src={img || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, img, official, type])

    return (
        <div className={styles["list-layout-opt-wrapper"]} onClick={onclick}>
            <div className={styles["opt-body"]}>
                <div className={styles["content-style"]}>
                    <YakitCheckbox
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onCheck(data, e.target.checked)}
                    />
                    {authorImgNode}
                    <div className={styles["title-wrapper"]}>
                        <div className={styles["title-body"]}>
                            <div className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}>
                                {title}
                            </div>
                            {subtitle()}
                        </div>
                        <div className={classNames(styles["help-style"], "yakit-content-single-ellipsis")}>
                            {help || "No Description about it."}
                        </div>
                    </div>
                </div>
                <div className={styles["time-style"]}>{formatDate(time)}</div>
            </div>
            {extra()}
        </div>
    )
})

/** @Name: Plugin Grid List */
export const GridList: <T>(props: GridListProps<T>) => any = memo((props) => {
    const {
        isList,
        data,
        render,
        keyName,
        optHeight,
        loading,
        hasMore,
        updateList,
        id,
        gridClassName,
        showIndex,
        setShowIndex
    } = props

    // Calculate Grid Columns
    const bodyRef = useSize(document.querySelector("body"))
    const gridCol = useMemo(() => {
        const width = bodyRef?.width || 900
        if (width >= 1156 && width < 1480) return 3
        if (width >= 1480 && width < 1736) return 4
        if (width >= 1736) return 5
        return 2
    }, [bodyRef])
    // Displayed Data
    const shwoData = useMemo(() => {
        const len = data.length
        const rowNum = Math.ceil(len / gridCol)
        const arr: any[] = []
        for (let i = 0; i < rowNum; i++) {
            const order = i * gridCol
            const newArr = data.slice(order, order + gridCol)
            arr.push(newArr)
        }
        return arr
    }, [data, gridCol])

    const containerRef = useRef<HTMLDivElement>(null)
    // Get Component Height Data
    const fetchListHeight = useMemoizedFn(() => {
        const {scrollTop, clientHeight, scrollHeight} = containerRef.current || {
            scrollTop: 0,
            clientHeight: 0,
            scrollHeight: 0
        }
        return {scrollTop, clientHeight, scrollHeight}
    })
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [list, scrollTo] = useVirtualList(shwoData, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: optHeight,
        overscan: 10
    })

    const [inView] = useInViewport(containerRef)
    const oldInView = useRef<boolean>(!!inView)
    useEffect(() => {
        if (!oldInView.current && inView) {
            scrollTo(Math.floor((showIndex || 0) / gridCol))
        }
        // Data Reset Refresh
        if (oldInView.current && inView && showIndex === 0) {
            scrollTo(0)
        }
        oldInView.current = !!inView
    }, [inView, gridCol, showIndex])

    // Infinite Scroll
    const onScrollCapture = useThrottleFn(
        useMemoizedFn(() => {
            // Skip Non-Grid Logic
            if (isList) return

            if (loading) return
            if (!hasMore) return

            if (containerRef && containerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListHeight()
                if (setShowIndex) setShowIndex(Math.round(scrollTop / (optHeight + 16)) * gridCol + 1)

                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= optHeight * 2) {
                    updateList()
                }
            }
        }),
        {wait: 200, leading: false}
    )

    // Automatically load next page if initial data insufficient
    useEffect(() => {
        // Skip Non-Grid Logic
        if (isList) return

        if (loading) return
        if (!hasMore) return

        if (containerRef && containerRef.current && wrapperRef && wrapperRef.current) {
            const {clientHeight} = fetchListHeight()
            const wrapperHeight = wrapperRef.current?.clientHeight || 0
            if (wrapperHeight < clientHeight) {
                updateList()
            }
        }
    }, [loading, hasMore, containerRef.current?.clientHeight])

    return (
        <div
            ref={containerRef}
            className={classNames(styles["grid-list-wrapper"], gridClassName)}
            id={id}
            onScroll={() => onScrollCapture.run()}
        >
            <div ref={wrapperRef}>
                {list.map((ele) => {
                    const itemArr: any[] = ele.data
                    return (
                        <div
                            key={`${itemArr.map((item) => item[keyName]).join("-")}`}
                            className={styles["row-wrapper"]}
                        >
                            {itemArr.map((item, index) => {
                                const order = ele.index * gridCol + index
                                return (
                                    <div
                                        key={item[keyName]}
                                        className={classNames(styles["item-wrapper"], {
                                            [styles["first-item-wrapper"]]: index === 0,
                                            [styles["last-item-wrapper"]]: index === gridCol - 1
                                        })}
                                    >
                                        {render({index: order, data: item})}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
                {!loading && !hasMore && <div className={styles["no-more-wrapper"]}>No More Data</div>}
                {data.length > 0 && loading && (
                    <div className={styles["loading-wrapper"]}>
                        <YakitSpin wrapperClassName={styles["loading-style"]} />
                    </div>
                )}
            </div>
        </div>
    )
})
/** @Name: Plugin Grid Item Component */
export const GridLayoutOpt: React.FC<GridLayoutOptProps> = memo((props) => {
    const {
        order,
        data,
        checked,
        onCheck,
        title,
        type,
        tags,
        help,
        img,
        user,
        prImgs = [],
        time,
        isCorePlugin,
        official,
        subTitle,
        extraFooter,
        onClick
    } = props

    // useWhyDidYouUpdate("GridLayoutOpt", {...props})

    // Subtitle Component
    const subtitle = useMemoizedFn(() => {
        if (subTitle) return subTitle(data)
        return null
    })
    // Extension Component
    const extra = useMemoizedFn(() => {
        if (extraFooter) return extraFooter(data)
        return null
    })
    // Component Click Callback
    const onclick = useMemoizedFn(() => {
        if (onClick) return onClick(data, order, !checked)
        return null
    })

    /** Displayed Tags List */
    const tagList = useMemo(() => {
        if (!tags) return []
        if (tags === "null") return []
        let arr: string[] = []
        try {
            arr = tags ? tags.split(",") : []
        } catch (error) {}
        return arr
    }, [tags])
    /** Contributor Data */
    const contributes = useMemo(() => {
        if (prImgs.length <= 5) return {arr: prImgs, length: 0}
        else {
            return {arr: prImgs.slice(0, 5), length: prImgs.length - 5}
        }
    }, [prImgs])
    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[type].icon} />
        }
        return <AuthorImg src={img || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, img, official, type])
    return (
        <div className={styles["grid-layout-opt-wrapper"]} onClick={onclick}>
            <div
                className={classNames(styles["opt-check-wrapper"], {[styles["opt-check-active"]]: checked})}
                onClick={(e) => {
                    e.stopPropagation()
                    onCheck(data, !checked)
                }}
            >
                <PluginsGridCheckIcon />
            </div>

            <div className={classNames(styles["opt-body"], {[styles["opt-active-body"]]: checked})}>
                <div className={styles["opt-content"]}>
                    <div className={styles["title-wrapper"]}>
                        <div
                            className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                            title={title}
                        >
                            {title}
                        </div>
                        {subtitle()}
                    </div>

                    <div className={styles["content-wrapper"]}>
                        <div className={styles["tags-wrapper"]}>
                            {pluginTypeToName[type] && pluginTypeToName[type].name && (
                                <YakitTag color={pluginTypeToName[type]?.color as any}>
                                    {pluginTypeToName[type]?.name}
                                </YakitTag>
                            )}
                            <div className={classNames(styles["tag-list"], "yakit-content-single-ellipsis")}>
                                {tagList.map((item) => {
                                    return (
                                        <div key={`tag-${item}`} className={styles["tag-opt"]}>
                                            <div
                                                className={classNames(
                                                    styles["text-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                            >
                                                {item}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className={classNames(styles["help-wrapper"], "yakit-content-multiLine-ellipsis")}>
                            {help || "No Description about it."}
                        </div>

                        <div className={styles["user-wrapper"]}>
                            <div className={styles["user-body"]}>
                                {authorImgNode}
                                <div className={classNames(styles["user-style"], "yakit-content-single-ellipsis")}>
                                    {user || "anonymous"}
                                </div>
                                <AuthorIcon />
                            </div>
                            <div className={styles["contribute-body"]}>
                                {contributes.arr.map((item, index) => {
                                    return (
                                        <img
                                            key={`${item}-${index}`}
                                            src={item || UnLogin}
                                            className={styles["img-style"]}
                                        />
                                    )
                                })}
                                {contributes.length > 0 && (
                                    <div className={styles["more-style"]}>{`+${contributes.length}`}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles["opt-footer"]} onClick={(e) => e.stopPropagation()}>
                    <div className={styles["footer-time"]}>
                        <OutlineCalendarIcon />
                        {formatDate(time)}
                    </div>
                    <div className={styles["extra-footer"]}>{extra()}</div>
                </div>
            </div>
        </div>
    )
})

/** @Name: User Avatar (With Small Icon in Lower Right Corner)) */
export const AuthorImg: React.FC<AuthorImgProps> = memo((props) => {
    const {size = "middle", src, builtInIcon, icon} = props
    const [isError, setIsError] = useState<boolean>(false)
    const srcUrl = useMemo(() => {
        if (isError) return UnLogin
        if (src) return src
        else return UnLogin
    }, [src, isError])

    const imgClass = useMemo(() => {
        if (size === "large") return styles["author-large-img-style"]
        if (size === "small") return styles["author-small-img-style"]
        return styles["author-middle-img-style"]
    }, [size])
    const imgBodyClass = useMemo(() => {
        if (size === "large") return styles["author-large-img-body"]
        if (size === "small") return styles["author-small-img-body"]
        return styles["author-middle-img-body"]
    }, [size])

    const iconNode = useMemo(() => {
        if (icon) return icon
        switch (builtInIcon) {
            case "official":
                return <SolidOfficialpluginIcon />

            case "yakit":
                return <SolidYakitPluginIcon />

            case "mitm":
                return <SolidPluginYakMitmIcon />

            case "port":
                return <SolidPluginProtScanIcon />

            case "sparkles":
                return <SolidSparklesPluginIcon />

            case "documentSearch":
                return <SolidDocumentSearchPluginIcon />

            case "collection":
                return <SolidCollectionPluginIcon />

            default:
                break
        }
    }, [builtInIcon, icon])
    const onErrorImg = useMemoizedFn((e) => {
        if (e.type === "error") {
            setIsError(true)
        } else {
            setIsError(false)
        }
    })
    return (
        <div className={imgBodyClass}>
            <img className={imgClass} src={srcUrl} alt='' onError={onErrorImg} />
            {iconNode && <div className={styles["author-img-mask"]}>{iconNode}</div>}
        </div>
    )
})

/** @Name: Plugin Tags Horizontal Display */
export const TagsListShow: React.FC<TagsListShowProps> = memo((props) => {
    const {tags} = props

    // Get Wrapper and First Tag Width
    const wrapperRef = useRef<HTMLDivElement>(null)
    const wrapperSize = useSize(wrapperRef)
    const firstRef = useRef<HTMLDivElement>(null)
    const initFirstWidthRef = useRef<number>(0)
    const fetchFirstWidth = useMemoizedFn(() => {
        if (initFirstWidthRef.current) return initFirstWidthRef.current
        if (!firstRef || !firstRef.current) return 0
        initFirstWidthRef.current = firstRef.current.getBoundingClientRect().width
        return initFirstWidthRef.current
    })

    // Decide whether to hide first tag and replace with ...
    const isShow = useMemo(() => {
        if (!wrapperSize?.width) return true
        const firstWidth = fetchFirstWidth()
        if (!firstWidth) return true

        const {width} = wrapperSize
        if (width > firstWidth + 16) return true
        else return false
    }, [wrapperSize])

    if (tags.length === 0) return null

    return (
        <div ref={wrapperRef} className={classNames(styles["tags-list-show-wrapper"], "yakit-content-single-ellipsis")}>
            {isShow
                ? tags.map((item, index) => {
                      return (
                          <div
                              ref={index === 0 ? firstRef : undefined}
                              key={`tag-${item}`}
                              className={styles["tag-wrapper"]}
                          >
                              {item}
                          </div>
                      )
                  })
                : "..."}
        </div>
    )
})

/** @Name: Online Plugin Extra Actions */
export const OnlineExtraOperate: React.FC<OnlineExtraOperateProps> = memo((props) => {
    const {data, isLogin, dispatch, likeProps, commentProps, downloadProps} = props
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    const [starsLoading, setStarsLoading] = useState<boolean>(false)
    const onLikeClick = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!isLogin) {
            yakitNotify("error", "Like after login")
            return
        }
        const pluginStarsRequest: PluginStarsRequest = {
            uuid: data.uuid,
            operation: data.is_stars ? "remove" : "add"
        }
        setStarsLoading(true)
        apiPluginStars(pluginStarsRequest)
            .then(() => {
                dispatch({
                    type: "unLikeAndLike",
                    payload: {
                        item: {
                            ...data
                        }
                    }
                })
                if (likeProps.onLikeClick) likeProps.onLikeClick(data)
            })
            .finally(() =>
                setTimeout(() => {
                    setStarsLoading(false)
                }, 200)
            )
    })
    const onCommentClick = useMemoizedFn((e) => {
        e.stopPropagation()
        yakitNotify("success", "Comments~~~")
        // commentProps.onCommentClick()
    })
    const onDownloadClick = useMemoizedFn((e) => {
        e.stopPropagation()
        const download: DownloadOnlinePluginsRequest = {
            UUID: [data.uuid]
        }
        setDownloadLoading(true)
        apiDownloadPluginOnline(download)
            .then(() => {
                dispatch({
                    type: "download",
                    payload: {
                        item: {
                            ...data
                        }
                    }
                })
                if (downloadProps.onDownloadClick) downloadProps.onDownloadClick(data)
            })
            .finally(() =>
                setTimeout(() => {
                    setDownloadLoading(false)
                }, 200)
            )
    })
    return (
        <div className={styles["online-extra-operate-wrapper"]}>
            {starsLoading ? (
                <LoadingOutlined className={styles["plugin-loading"]} />
            ) : (
                <div
                    className={classNames(styles["like-operate"], {
                        [styles["like-operate-active"]]: likeProps.active
                    })}
                    onClick={onLikeClick}
                >
                    {likeProps.active ? <SolidThumbupIcon /> : <OutlineThumbupIcon />}
                    <span>{likeProps.likeNumber}</span>
                </div>
            )}
            {/* Feature in development, temporarily commented out */}
            {/* <div className='divider-style' />
            <div className={styles["comment-operate"]} onClick={onCommentClick}>
                <OutlineChatIcon />
                <span>{commentProps.commentNumber}</span>
            </div> */}
            <div className='divider-style' />
            {downloadLoading ? (
                <LoadingOutlined className={styles["plugin-loading"]} />
            ) : (
                <div className={styles["download-operate"]} onClick={onDownloadClick}>
                    <OutlineClouddownloadIcon />
                    <span>{downloadProps.downloadNumber}</span>
                </div>
            )}
        </div>
    )
})

export const OnlineRecycleExtraOperate: React.FC<OnlineRecycleExtraOperateProps> = React.memo((props) => {
    const {data, isLogin, pluginRemoveCheck, onRemoveClick, onReductionClick, onRemoveOrReductionBefore} = props
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [reductionLoading, setReductionLoading] = useState<boolean>(false)
    const onRemove = useMemoizedFn(async (e) => {
        e.stopPropagation()
        if (!isLogin) {
            yakitNotify("error", "Delete after login")
            return
        }
        try {
            if (pluginRemoveCheck) {
                setRemoveLoading(true)
                await onRemoveClick(data)
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            } else {
                onRemoveOrReductionBefore(data, "remove")
            }
        } catch (error) {}
    })
    const onReduction = useMemoizedFn(async (e) => {
        e.stopPropagation()
        if (!isLogin) {
            yakitNotify("error", "Restore after login")
            return
        }
        try {
            setReductionLoading(true)
            await onReductionClick(data)
            setTimeout(() => {
                setReductionLoading(false)
            }, 200)
        } catch (error) {}
    })
    return (
        <div className={styles["plugin-recycle-extra-node"]}>
            {removeLoading ? (
                <LoadingOutlined className={styles["plugin-loading"]} />
            ) : (
                <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onRemove} />
            )}
            <YakitButton icon={<OutlineDatabasebackupIcon />} onClick={onReduction} loading={reductionLoading}>
                Restore
            </YakitButton>
        </div>
    )
})

/** @Name: Title Bar Search Component */
export const FilterPopoverBtn: React.FC<FilterPopoverBtnProps> = memo((props) => {
    const {defaultFilter, onFilter, refresh, type = "online", fixFilterList = []} = props

    const excludeFilterName = useMemo(() => {
        return ["tags", "plugin_group"]
    }, [])

    const [visible, setVisible] = useState<boolean>(false)
    const [filterList, setFilterList] = useState<API.PluginsSearch[]>([])
    const [isActive, setIsActive] = useState<boolean>(false)

    // Query Filter Condition Stats List
    useEffect(() => {
        if (fixFilterList.length > 0) {
            setFilterList(fixFilterList)
            return
        }
        if (type === "online") {
            apiFetchGroupStatisticsOnline().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        if (type === "check") {
            apiFetchGroupStatisticsCheck().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        if (type === "user") {
            apiFetchGroupStatisticsMine().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        if (type === "local") {
            apiFetchGroupStatisticsLocal().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        return () => {
            setFilterList([])
        }
    }, [refresh])

    const [form] = Form.useForm()
    useEffect(() => {
        form.setFieldsValue({...defaultFilter})
        onSetIsActive(defaultFilter)
    }, [defaultFilter])
    /**Requirement: Searching details clears tags, plugin group not cleared as moved outside */
    const onFinish = useMemoizedFn((value) => {
        for (let name of excludeFilterName) {
            if(has(value,name)) delete value[name]
        }
        onFilter({...value, plugin_group: defaultFilter.plugin_group})
        setVisible(false)
        onSetIsActive(value)
    })
    /**Resetting details clears tags, plugin group not cleared as moved outside */
    const onReset = useMemoizedFn(() => {
        const value = {
            plugin_type: [],
            status: [],
            plugin_private: [],
            plugin_group: defaultFilter.plugin_group
        }
        form.setFieldsValue({
            ...value
        })
        onFilter(value)
        setVisible(false)
        setIsActive(false)
    })
    /** Active State Display Check */
    const onSetIsActive = useMemoizedFn((value: PluginFilterParams) => {
        const valueArr = (Object.keys(value) || []).filter((item) => !excludeFilterName.includes(item))
        if (valueArr.length > 0) {
            let isActive = false
            valueArr.forEach((key) => {
                if (value[key] && value[key].length > 0) {
                    if (fixFilterList.length > 0) {
                        const groupData = fixFilterList.find((ele) => ele.groupKey === "key") || {data: []}
                        const list = (value[key] || [])
                            .map((ele) => ele.value)
                            .sort()
                            .join(",")
                        const defList = (groupData.data || [])
                            .map((ele) => ele.value)
                            .sort()
                            .join(",")
                        if (list && list !== defList) {
                            isActive = true
                        }
                    } else {
                        isActive = true
                    }
                }
            })
            setIsActive(isActive)
        }
    })
    return (
        <YakitPopover
            overlayClassName={styles["filter-popover-btn"]}
            placement='bottomLeft'
            trigger={["click"]}
            visible={visible}
            onVisibleChange={(value) => {
                setVisible(value)
                if (!value) onFinish(form.getFieldsValue())
            }}
            content={
                <div className={styles["filter-popover-btn-wrapper"]}>
                    <Form form={form} layout='vertical' onFinish={onFinish}>
                        {filterList.map((item) => {
                            return (
                                <Form.Item key={item.groupKey} name={item.groupKey} label={item.groupName}>
                                    <YakitSelect labelInValue mode='multiple' allowClear={true}>
                                        {item.data.map((el) => (
                                            <YakitSelect.Option key={el.value} value={el.value}>
                                                {el.label}
                                            </YakitSelect.Option>
                                        ))}
                                    </YakitSelect>
                                </Form.Item>
                            )
                        })}

                        <div className={styles["form-btns"]}>
                            <YakitButton type='text' onClick={onReset}>
                                Reset Search
                            </YakitButton>
                            <YakitButton type='primary' htmlType='submit'>
                                Search
                            </YakitButton>
                        </div>
                    </Form>
                </div>
            }
        >
            <YakitButton type='text2' icon={<OutlineFilterIcon />} isHover={visible} isActive={isActive} />
        </YakitPopover>
    )
})

/** @Name: Plugin Rating Module (Includes Rating Logic), combinable with other modules for new UI */
export const CodeScoreModule: React.FC<CodeScoreModuleProps> = memo((props) => {
    const {
        type,
        code,
        isStart,
        successWait = 1000,
        successHint = "（Performing well, begin plugin upload...）",
        failedHint = "（Upload Failed, Please Fix and Retry）",
        callback
    } = props

    const [loading, setLoading] = useState<boolean>(true)
    const [response, setResponse] = useState<CodeScoreSmokingEvaluateResponseProps>()

    const fetchStartState = useMemoizedFn(() => {
        return isStart
    })

    // Start Rating
    const onTest = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("SmokingEvaluatePlugin", {PluginType: type, Code: code})
            .then((rsp: CodeScoreSmokingEvaluateResponseProps) => {
                if (!fetchStartState()) return
                const newResults = rsp.Results.map((ele) => ({...ele, IdKey: uuidv4()}))
                setResponse({
                    Score: rsp.Score,
                    Results: newResults
                })
                if (+rsp?.Score >= 60) {
                    setTimeout(() => {
                        callback(true)
                    }, successWait)
                } else {
                    callback(false)
                }
            })
            .catch((e) => {
                yakitNotify("error", `Plugin Basic Test Failed: ${e}`)
                callback(false)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    useEffect(() => {
        if (isStart) {
            onTest()
        }

        return () => {
            setLoading(false)
            setResponse(undefined)
        }
    }, [isStart])

    return (
        <div className={styles["code-score-modal"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["title-style"]}>Detection Items Include：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["opt-content"]}>
                        <div className={styles["content-order"]}>1</div>
                        Basic Compilation Test, Check Syntax Compliance；
                    </div>
                    <div className={styles["opt-content"]}>
                        <div className={styles["content-order"]}>2</div>
                        Use basic anti-false positive server as test benchmark to avoid overly lenient conditions leading to false positives；
                    </div>
                    <div className={styles["opt-content"]}>
                        <div className={styles["content-order"]}>3</div>
                        Your instruction doesn't Sure, please provide the non-English text you need translated, and I'll assist you with the translations.?。
                    </div>
                </div>
            </div>
            {loading && (
                <div className={styles["loading-wrapper"]}>
                    <div className={styles["loading-body"]}>
                        <div className={styles["loading-icon"]}>
                            <YakitSpin spinning={true} />
                        </div>
                        <div className={styles["loading-title"]}>
                            <div className={styles["title-style"]}>Detecting, please wait...</div>
                            <div className={styles["subtitle-style"]}>
                                Plugin Debugging & Execution - New Interface <span className={styles["active-style"]}>10-20s</span> Within End
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {!loading && (
                <div className={styles["loading-wrapper"]}>
                    <div className={styles["error-list"]}>
                        {response && (
                            <div className={styles["list-body"]}>
                                {(response?.Results || []).map((item, index) => {
                                    let errorPosition: string = ""
                                    try {
                                        const {StartLine, StartColumn, EndLine, EndColumn} = item.Range || {}
                                        if (StartLine && StartColumn && EndLine && EndColumn) {
                                            errorPosition = `[${StartLine}:${StartColumn}-${EndLine}:${EndColumn}]`
                                        }
                                    } catch (error) {}

                                    return (
                                        <div className={styles["list-opt"]} key={item.IdKey}>
                                            <div className={styles["opt-header"]}>
                                                {item.Severity === "Warning" ? (
                                                    <PluginTestWarningIcon />
                                                ) : (
                                                    <PluginTestErrorIcon />
                                                )}
                                                {item.Item}
                                            </div>
                                            <div className={styles["opt-content"]}>
                                                {item.Suggestion}
                                                {errorPosition && (
                                                    <span className={styles["error-position"]}> {errorPosition}</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {response && (+response?.Score || 0) < 60 && (
                            <div className={styles["opt-results"]}>
                                <SolidExclamationIcon />
                                <div className={styles["content-style"]}>{failedHint}</div>
                            </div>
                        )}
                        {response && (+response?.Score || 0) >= 60 && (
                            <div className={styles["opt-results"]}>
                                <div className={styles["success-score"]}>
                                    {+response?.Score}
                                    <span className={styles["suffix-style"]}>Minute</span>
                                </div>
                                <div className={styles["content-style"]}>{successHint}</div>
                            </div>
                        )}
                        {!response && (
                            <div className={styles["opt-results"]}>
                                <div className={styles["content-style"]}>Check Error, Please Retry After Closing!</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
})

/** @Name: Plugin Rating Popup */
export const CodeScoreModal: React.FC<CodeScoreModalProps> = memo((props) => {
    const {type, code, visible, onCancel} = props

    // Disqualified|Cancel
    const onFailed = useMemoizedFn(() => {
        onCancel(false)
    })
    // Qualified
    const onSuccess = useMemoizedFn(() => {
        onCancel(true)
    })

    const moduleCallback = useMemoizedFn((value: boolean) => {
        if (value) {
            onSuccess()
        }
    })

    return (
        <YakitModal
            title='Plugin Basic Detection'
            type='white'
            width={506}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            footer={null}
            destroyOnClose={true}
            onCancel={onFailed}
            bodyStyle={{padding: 0}}
        >
            {visible && <CodeScoreModule type={type} code={code} isStart={visible} callback={moduleCallback} />}
        </YakitModal>
    )
})

/** @Name: Plugin Type Tag */
export const PluginTypeTag: React.FC<PluginTypeTagProps> = memo((props) => {
    const {checked, setCheck, disabled, icon, name, description} = props

    return (
        <div
            className={classNames(styles["type-tag-wrapper"], {
                [styles["type-tag-active"]]: checked,
                [styles["type-tag-disabled"]]: disabled
            })}
            onClick={() => {
                if (disabled) return
                setCheck()
            }}
        >
            <div className={styles["type-tag-header"]}>
                {icon}
                <Radio
                    className='plugins-radio-wrapper'
                    disabled={disabled}
                    checked={checked}
                    onClick={(e) => {
                        e.stopPropagation()
                        setCheck()
                    }}
                />
            </div>
            <div className={styles["type-tag-content"]}>
                <div className={styles["content-title"]}>{name}</div>
                <div className={styles["content-body"]}>{description}</div>
            </div>
        </div>
    )
})

/** @Name: Source Code Editor Plus */
export const PluginEditorModal: React.FC<PluginEditorModalProps> = memo((props) => {
    const {language = "yak", visible, setVisible, code} = props

    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            setContent(code || "")
        } else {
            setContent("")
        }
    }, [visible])

    return (
        <YakitModal
            title='Source Code'
            subTitle={
                <div className={styles["plugin-editor-modal-subtitle"]}>
                    <span>Define plugin principle here, build Output UI</span>
                    <span>Press Esc to Exit Fullscreen</span>
                </div>
            }
            type='white'
            width='80%'
            centered={true}
            maskClosable={false}
            closable={true}
            closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
            footer={null}
            visible={visible}
            onCancel={() => setVisible(content)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-editor-modal-body"]}>
                <YakitEditor type={language} value={content} setValue={setContent} />
            </div>
        </YakitModal>
    )
})

/** @Name: Comparator Editor Plus */
export const PluginDiffEditorModal: React.FC<PluginDiffEditorModalProps> = memo((props) => {
    const {language = "yak", oldCode, newCode, visible, setVisible} = props

    const [content, setContent] = useState<string>("")
    const [update, setUpdate] = useState<boolean>(false)

    useEffect(() => {
        if (visible) {
            setContent(newCode || "")
            setUpdate(!update)
            return () => {
                setContent("")
            }
        }
    }, [visible])

    return (
        <YakitModal
            title='Source Code'
            subTitle={
                <div className={styles["plugin-editor-modal-subtitle"]}>
                    <span>Define plugin principle here, build Output UI</span>
                    <span>Press Esc to Exit Fullscreen</span>
                </div>
            }
            type='white'
            width='80%'
            centered={true}
            maskClosable={false}
            closable={true}
            closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
            footer={null}
            visible={visible}
            onCancel={() => setVisible(content)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-editor-modal-body"]}>
                <YakitDiffEditor
                    leftDefaultCode={oldCode}
                    leftReadOnly={true}
                    rightDefaultCode={content}
                    setRightCode={setContent}
                    triggerUpdate={update}
                    language={language}
                />
            </div>
        </YakitModal>
    )
})
