import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    HeardMenuProps,
    RouteMenuDataItemProps,
    SubMenuProps,
    CollapseMenuProp,
    privateUnionMenus,
    EnhancedPrivateRouteMenuProps,
    privateExchangeProps,
    privateConvertDatabase,
    jsonDataConvertMenus
} from "./HeardMenuType"
import {
    AcademicCapIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CursorClickIcon,
    DotsHorizontalIcon,
    SaveIcon,
    SortAscendingIcon,
    SortDescendingIcon,
    UserIcon
} from "@/assets/newIcon"
import ReactResizeDetector from "react-resize-detector"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {Divider, Dropdown, Tabs, Tooltip, Form} from "antd"
import {MenuPayloadIcon, MenuYakRunnerIcon} from "@/pages/customizeMenu/icon/menuIcon"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakCodeEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitFormDragger, YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {failed, yakitNotify} from "@/utils/notification"
import {YakScript} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useStore} from "@/store"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {
    DatabaseFirstMenuProps,
    DatabaseMenuItemProps,
    InvalidFirstMenuItem,
    InvalidPageMenuItem,
    PrivateExpertRouteMenu,
    PrivateScanRouteMenu,
    PrivateSimpleRouteMenu,
    YakitRoute,
    databaseConvertData
} from "@/routes/newRoute"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {
    DownloadOnlinePluginByScriptNamesResponse,
    keyToRouteInfo,
    menusConvertKey,
    routeConvertKey,
    routeInfoToKey,
    routeToMenu
} from "../publicMenu/utils"

import classNames from "classnames"
import style from "./HeardMenu.module.scss"
import {ExtraMenu} from "../publicMenu/ExtraMenu"
import emiter from "@/utils/eventBus/eventBus"
import {SolidPayloadIcon} from "@/assets/icon/solid"

const {ipcRenderer} = window.require("electron")

const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {defaultExpand, onRouteMenuSelect, setRouteToLabel} = props
    // Expert mode menu data
    const ExpertMenus = useMemo(() => {
        return privateExchangeProps(PrivateExpertRouteMenu)
    }, [])
    // Scan mode menu data
    const ScanMenus = useMemo(() => {
        return privateExchangeProps(PrivateScanRouteMenu)
    }, [])
    // Simplified Mode Menu
    const SimpleMenus = useMemo(() => {
        return privateExchangeProps(PrivateSimpleRouteMenu)
    }, [])

    // Component Init Flag
    const isInitRef = useRef<boolean>(true)

    /** @Menu Mode (Expert)|Scan) */
    const [patternMenu, setPatternMenu, getPatternMenu] = useGetState<"expert" | "new">("expert")
    /** Default Menu */
    const DefaultMenu = useMemo(() => {
        if (patternMenu === "new") return ScanMenus
        return ExpertMenus
    }, [patternMenu])

    /** @Menu Data */
    const [routeMenu, setRouteMenu] = useState<EnhancedPrivateRouteMenuProps[]>([])
    /** @Display Submenu in Expanded State */
    const [subMenuData, setSubMenuData] = useState<EnhancedPrivateRouteMenuProps[]>([])
    /** @Selected Top-Level Menu in Expanded State */
    const [menuId, setMenuId] = useState<string>("")
    /** @Collapsed Partial Submenu Logic on Insufficient Width */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<EnhancedPrivateRouteMenuProps[]>([])
    /** @Menu Integration Logic for Insufficient Width */
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const [moreLeft, setMoreLeft] = useState<number>(0) // More Text Left

    const [isExpand, setIsExpand] = useState<boolean>(defaultExpand)
    useEffect(() => {
        setIsExpand(isExpand)
    }, [defaultExpand])

    const [customizeVisible, setCustomizeVisible] = useState<boolean>(false)

    const [loading, setLoading] = useState<boolean>(true)

    const menuLeftRef = useRef<any>()
    const menuLeftInnerRef = useRef<any>()

    const routeToName = useRef<Map<string, string>>(new Map<string, string>())
    useUpdateEffect(() => {
        getRouteKeyToLabel()
    }, [routeMenu])
    /** @Log Menu Updates */
    const getRouteKeyToLabel = useMemoizedFn(() => {
        const names = menusConvertKey(routeMenu)
        names.forEach((value, key) => routeToName.current.set(key, value))
        setRouteToLabel(routeToName.current)
    })

    /** Login User Info */
    const {userInfo} = useStore()
    useEffect(() => {
        setRouteMenu([...DefaultMenu])
        setSubMenuData(DefaultMenu[0].children || [])
        setMenuId(DefaultMenu[0].label)
        // Simplified Enterprise Edition
        if (isEnpriTraceAgent()) {
            let currentMenuList: EnhancedPrivateRouteMenuProps[] = [...SimpleMenus]
            if (userInfo.role !== "admin") {
                // Simplified Enterprise Non-Admin No Plugin Access
                currentMenuList = currentMenuList.filter((item) => item.label !== "Plugin")
            }
            setRouteMenu(currentMenuList)
            setSubMenuData(currentMenuList[0]?.children || [])
            setMenuId(currentMenuList[0]?.label)
            return
        } else {
            // Fetch Application Menu Mode
            getRemoteValue(RemoteGV.PatternMenu).then((patternMenu) => {
                const menuMode = patternMenu || "expert"
                setRemoteValue(RemoteGV.PatternMenu, menuMode)
                setPatternMenu(menuMode)
                init(menuMode)
            })
        }
    }, [])

    useEffect(() => {
        // Update Menu Excluding Simplified Version
        if (!isEnpriTraceAgent()) {
            ipcRenderer.on("fetch-new-main-menu", (e) => {
                init(getPatternMenu())
            })
            return () => {
                ipcRenderer.removeAllListeners("fetch-new-main-menu")
            }
        }
    }, [])

    /**
     * @Init Menu
     * @Fetch Mode Menu-Add Default on Empty
     */
    const init = useMemoizedFn((menuMode: string) => {
        setLoading(true)

        ipcRenderer
            .invoke("GetAllNavigationItem", {Mode: menuMode})
            .then((res: {Data: DatabaseFirstMenuProps[]}) => {
                const database = databaseConvertData(res.Data || [])

                // Filtered User Data After Invalid Item Removal
                const caches: DatabaseMenuItemProps[] = []
                for (let item of database) {
                    // Filter invalid top-level menu items
                    if (InvalidFirstMenuItem.indexOf(item.menuName) > -1) continue

                    const menus: DatabaseMenuItemProps = {...item}
                    if (item.children && item.children.length > 0) {
                        menus.children = item.children.filter(
                            // Filter invalid submenu items
                            (item) => InvalidPageMenuItem.indexOf(item.menuName) === -1
                        )
                    }
                    caches.push(menus)
                }

                let filterLocal: EnhancedPrivateRouteMenuProps[] = []
                getRemoteValue(RemoteGV.UserDeleteMenu)
                    .then((val) => {
                        if (val !== "{}") {
                            let filters: string[] = []
                            try {
                                filters = (JSON.parse(val) || {})[menuMode] || []
                            } catch (error) {}
                            for (let item of DefaultMenu) {
                                if (filters.includes(item.menuName)) continue
                                const menu: EnhancedPrivateRouteMenuProps = {...item, children: []}
                                if (item.children && item.children.length > 0) {
                                    for (let subitem of item.children) {
                                        if (!filters.includes(`${item.menuName}-${subitem.menuName}`)) {
                                            menu.children?.push({...subitem})
                                        }
                                    }
                                }
                                filterLocal.push(menu)
                            }
                        } else {
                            filterLocal = [...DefaultMenu]
                        }
                    })
                    .catch(() => {
                        filterLocal = [...DefaultMenu]
                    })
                    .finally(async () => {
                        let allowModify = await getRemoteValue(RemoteGV.IsImportJSONMenu)
                        try {
                            allowModify = JSON.parse(allowModify) || {}
                        } catch (error) {
                            allowModify = {}
                        }
                        if (!!allowModify[menuMode]) filterLocal = []

                        // menus-Render Data;isUpdate-Database Update Needed;Download Plugin Name
                        const {menus, isUpdate, pluginName} = privateUnionMenus(filterLocal, caches)

                        if (isInitRef.current) {
                            isInitRef.current = false
                            if (pluginName.length > 0) batchDownloadPlugin(menus, pluginName)
                            else {
                                setRouteMenu(menus)
                                setSubMenuData(menus[0]?.children || [])
                                setMenuId(menus[0]?.label || "")
                                setTimeout(() => setLoading(false), 300)
                            }
                            if (isUpdate) updateMenus(menus)
                        } else {
                            if (isUpdate) updateMenus(menus)
                            else setTimeout(() => setLoading(false), 300)
                            setRouteMenu(menus)
                            setSubMenuData(menus[0]?.children || [])
                            setMenuId(menus[0]?.label || "")
                        }
                    })
            })
            .catch((err) => {
                failed("Menu retrieval failed：" + err)
                setTimeout(() => setLoading(false), 300)
            })
    })
    /**
     * @Batch Download Plugins
     * @Common Plugin Data
     * @Download Plugin Name Set
     */
    const batchDownloadPlugin = useMemoizedFn((menus: EnhancedPrivateRouteMenuProps[], pluginName: string[]) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByPluginName", {
                ScriptNames: pluginName,
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    // Plugin Name-Content Mapping
                    const pluginToinfo: Record<string, {ScriptName: string; Id: string; HeadImg: string}> = {}
                    for (let item of rsp.Data) pluginToinfo[item.ScriptName] = item

                    // Update Menu ID
                    menus.forEach((item) => {
                        if (item.children && item.children.length > 0) {
                            item.children.forEach((subItem) => {
                                if (
                                    subItem.page === YakitRoute.Plugin_OP &&
                                    pluginToinfo[subItem.yakScripName || subItem.menuName]
                                ) {
                                    subItem.yakScriptId =
                                        +pluginToinfo[subItem.yakScripName || subItem.menuName].Id || 0
                                }
                            })
                        }
                    })
                    setRouteMenu(menus)
                    setSubMenuData(menus[0]?.children || [])
                    setMenuId(menus[0]?.label || "")
                }
            })
            .catch((err) => {
                yakitNotify("error", "Download Menu Plugin Failure：" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })
    /** Update Database Menu Data (All)) */
    const updateMenus = useMemoizedFn((data: EnhancedPrivateRouteMenuProps[]) => {
        const menus = privateConvertDatabase(data, patternMenu)

        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: patternMenu})
            .then(() => {
                ipcRenderer
                    .invoke("AddToNavigation", {Data: menus})
                    .then((rsp) => {})
                    .catch((e) => {
                        yakitNotify("error", `Menu save failed：${e}`)
                    })
                    .finally(() => {
                        setTimeout(() => setLoading(false), 300)
                    })
            })
            .catch((e: any) => {
                yakitNotify("error", `Menu update failed:${e}`)
                setTimeout(() => setLoading(false), 300)
            })
    })
    /** Expanded Menu Click Event */
    const onTabClick = useMemoizedFn((key) => {
        const data = keyToRouteInfo(key)
        if (data) {
            if (data.route === YakitRoute.Plugin_OP) {
                onCheckPlugin(data)
            } else {
                onRouteMenuSelect(data)
            }
        }
    })
    /** More Menu Click Event */
    const onClickMoreMenu = useMemoizedFn((info: RouteToPageProps) => {
        if (!info.route) return

        if (info.route !== YakitRoute.Plugin_OP) onRouteMenuSelect(info)
        else {
            if (!info.pluginName) return
            onCheckPlugin(info)
        }
    })
    /** Collapsed Menu Click Event */
    const onClickMenu = useMemoizedFn((info: EnhancedPrivateRouteMenuProps) => {
        if (!info.page) return

        const page: RouteToPageProps = {
            route: info.page,
            pluginId: info.yakScriptId || 0,
            pluginName: info.yakScripName || ""
        }
        if (page.route !== YakitRoute.Plugin_OP) onRouteMenuSelect(page)
        else {
            if (!page.pluginName) return
            onCheckPlugin(page)
        }
    })
    /** Plugin Menu-Availability Check */
    const onCheckPlugin = useMemoizedFn((info: RouteToPageProps) => {
        if (!info.pluginName) return
        if (info.pluginId === 0) {
            onOpenDownModal(info)
            return
        }

        ipcRenderer
            .invoke("GetYakScriptByName", {Name: info.pluginName})
            .then((i: YakScript) => {
                const lastId = +i.Id || 0
                // Plugin Not in Local Database
                if (lastId === 0) {
                    updateSingleMenu({pluginName: i.ScriptName, pluginId: 0})
                    onOpenDownModal(info)
                    return
                }
                // Open Page
                onRouteMenuSelect({
                    ...info,
                    pluginId: info.pluginId !== lastId ? lastId : info.pluginId
                })
                // Sync Menu ID Changes in Front-End Data
                if (info.pluginId !== lastId) {
                    updateSingleMenu({pluginName: i.ScriptName, pluginId: lastId})
                }
            })
            .catch((err) => onOpenDownModal(info))
    })
    /** Update Front-End Menu Data (Single)) */
    const updateSingleMenu = useMemoizedFn((info: {pluginName: string; pluginId: number}) => {
        const menus = [...routeMenu]
        menus.forEach((item) => {
            ;(item.children || []).forEach((subItem) => {
                if (subItem.yakScripName === info.pluginName) {
                    subItem.yakScriptId = info.pluginId
                }
            })
        })
        setRouteMenu(menus)
    })
    /** Plugin Menu Download Prompt */
    const onOpenDownModal = useMemoizedFn((menuItem: RouteToPageProps) => {
        if (!menuItem.pluginName) return
        const showName =
            routeToName.current.get(routeConvertKey(menuItem.route, menuItem.pluginName || "")) || menuItem.pluginName
        const m = YakitModalConfirm({
            width: 420,
            closable: false,
            title: "Plugin Load Failure",
            showConfirmLoading: true,
            type: "white",
            content: (
                <div className={style["modal-content"]}>
                    {showName}Menu Missing-Reinstall or Check Plugin Store
                    <span className={style["menuItem-yakScripName"]}>{menuItem.pluginName}</span>
                    Plugin
                </div>
            ),
            onOkText: "Re-download",
            onOk: () => {
                singleDownloadPlugin(menuItem, () => {
                    // Auto-Destroy Popup on Download Success
                    m.destroy()
                })
            }
        })
    })
    /** Download Single Plugin Menu */
    const singleDownloadPlugin = useMemoizedFn((menuItem: RouteToPageProps, callback?: () => any) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByPluginName", {
                ScriptNames: [menuItem.pluginName],
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    const info = rsp.Data[0]
                    // Open Page
                    onRouteMenuSelect({
                        route: YakitRoute.Plugin_OP,
                        pluginId: +info.Id || 0,
                        pluginName: info.ScriptName || menuItem.pluginName
                    })
                    updateSingleMenu({pluginName: info.ScriptName, pluginId: +info.Id || 0})
                    if (callback) setTimeout(() => callback(), 200)
                }
            })
            .catch((err) => yakitNotify("error", "Download Menu Plugin Failure：" + err))
    })

    useEffect(() => {
        if (!width) return
        toMove()
    }, [width, routeMenu])
    /**
     * @Calculate Top-Level Collapse Menu Display
     */
    const toMove = useMemoizedFn(() => {
        const menuWidth = menuLeftRef.current.clientWidth
        let childrenList: any[] = menuLeftInnerRef.current.children
        let childWidthAll = 0
        let n = -1
        let clientWidth: number[] = []
        for (let index = 0; index < childrenList.length; index++) {
            const element = childrenList[index]
            childWidthAll += element.clientWidth
            if (childWidthAll > menuWidth) {
                n = index
                break
            }
            clientWidth[index] = element.clientWidth
        }
        setNumber(n)
        if (clientWidth.length > 0) {
            setMoreLeft(clientWidth.reduce((p, c) => p + c))
        }
        if (n < 0) {
            setRouteMenuDataAfter([])
            return
        }
        const afterRoute: EnhancedPrivateRouteMenuProps[] = []
        const beforeRoute: EnhancedPrivateRouteMenuProps[] = []
        routeMenu.forEach((ele, index) => {
            if (ele.children && ele.children.length > 0) {
                if (index < n) {
                    beforeRoute.push(ele)
                } else {
                    afterRoute.push(ele)
                }
            }
        })
        setRouteMenuDataAfter(afterRoute)
    })
    const onExpand = useMemoizedFn((checked) => {
        const value = JSON.stringify(checked)
        setIsExpand(checked)
        setRemoteValue(CodeGV.MenuExpand, value)
        emiter.emit("menuExpandSwitch", value)
        if (!menuId && routeMenu.length > 0) {
            setSubMenuData(routeMenu[0]?.children || [])
            setMenuId(routeMenu[0]?.label || "")
        }
    })
    /** Menu Mode Switch */
    const onCustomizeMenuClick = useMemoizedFn((key: string) => {
        setRemoteValue(RemoteGV.PatternMenu, key)
            .then(() => {
                setPatternMenu(key as "expert" | "new")
                isInitRef.current = true
                setTimeout(() => {
                    init(key)
                }, 100)
            })
            .catch((e: any) => {
                failed(`Menu Mode Switch Failure:${e}`)
            })
    })
    /** @Edit Menu */
    const onGoCustomize = useMemoizedFn(() => {
        ipcRenderer.invoke("open-customize-menu")
    })
    /**
     * @Restore Menu
     */
    const onRestoreMenu = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: patternMenu})
            .then(async () => {
                // Init Flag Reset
                isInitRef.current = true
                // Delete Cached System Default Menu Deletion
                let deleteCache: any = await getRemoteValue(RemoteGV.UserDeleteMenu)
                try {
                    deleteCache = JSON.parse(deleteCache) || {}
                } catch (error) {
                    deleteCache = {}
                }
                delete deleteCache[patternMenu]

                setRemoteValue(RemoteGV.UserDeleteMenu, JSON.stringify(deleteCache)).finally(async () => {
                    // Cancel Non-Updatable Menu Marker (JSON Import))
                    let allowModify = await getRemoteValue(RemoteGV.IsImportJSONMenu)
                    try {
                        allowModify = JSON.parse(allowModify) || {}
                    } catch (error) {
                        allowModify = {}
                    }
                    delete allowModify[patternMenu]
                    setRemoteValue(RemoteGV.IsImportJSONMenu, JSON.stringify(allowModify))
                    setTimeout(() => {
                        ipcRenderer.invoke("change-main-menu")
                    }, 50)
                })
            })
            .catch((e: any) => {
                failed(`Delete Menu Failure:${e}`)
            })
    })
    const CustomizeMenuData = [
        {
            key: "new",
            label: "Scan Mode",
            itemIcon: <UserIcon />,
            tip: "Restore Scan Mode",
            onRestoreMenu: () => onRestoreMenu()
        },
        {
            key: "expert",
            label: "Expert Mode",
            itemIcon: <AcademicCapIcon />,
            tip: "Restore Expert Mode",
            onRestoreMenu: () => onRestoreMenu()
        }
    ]

    // Menu JSON Import Logic
    const [importLoading, setImportLoading] = useState<boolean>(false)
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [menuDataString, setMenuDataString] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    /** Import Menu JSON */
    const onImportJSON = useMemoizedFn(() => {
        if (!menuDataString) {
            failed("Data Cannot Be Empty")
            return
        }
        try {
            const {menus, isError} = jsonDataConvertMenus(JSON.parse(menuDataString))
            setImportLoading(true)
            ipcRenderer
                .invoke("DeleteAllNavigation", {Mode: patternMenu})
                .then(() => {
                    const menuLists = privateConvertDatabase(menus, patternMenu)

                    ipcRenderer
                        .invoke("AddToNavigation", {Data: menuLists})
                        .then(async () => {
                            let allowModify = await getRemoteValue(RemoteGV.IsImportJSONMenu)
                            try {
                                allowModify = JSON.parse(allowModify) || {}
                            } catch (error) {
                                allowModify = {}
                            }
                            allowModify[patternMenu] = 1
                            // Cache Menu Data Source for Init Comparison
                            setRemoteValue(RemoteGV.IsImportJSONMenu, JSON.stringify(allowModify))
                            setVisibleImport(false)
                            // isError-Partial Data Conversion Failure Flag
                            if (isError) yakitNotify("error", "Auto-Discard Partial Data Conversion Errors")
                            setRouteMenu(menus)
                            setSubMenuData(menus[0]?.children || [])
                            setMenuId(menus[0]?.label || "")
                        })
                        .catch((err) => {
                            yakitNotify("error", "Menu save failed：" + err)
                        })
                        .finally(() => {
                            setTimeout(() => {
                                setImportLoading(false)
                            }, 300)
                        })
                })
                .catch((e: any) => {
                    yakitNotify("error", `Delete Menu Failure:${e}`)
                    setTimeout(() => {
                        setImportLoading(false)
                    }, 300)
                })
        } catch (error) {
            yakitNotify("error", `Import Data Failure Handling: ${error}`)
        }
    })

    return (
        <div className={style["heard-menu-body"]}>
            <div
                className={classNames(style["heard-menu"], {
                    [style["heard-menu-expand"]]: isExpand
                })}
            >
                <ReactResizeDetector
                    onResize={(w) => {
                        if (!w) {
                            return
                        }
                        setWidth(w)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <div className={classNames(style["heard-menu-left"])} ref={menuLeftRef}>
                    <div className={classNames(style["heard-menu-left-inner"])} ref={menuLeftInnerRef}>
                        {routeMenu
                            .filter((ele) => ele.children && ele.children?.length > 0)
                            .map((menuItem, index) => {
                                return (
                                    <RouteMenuDataItem
                                        key={`menuItem-${menuItem.label}`}
                                        menuItem={menuItem}
                                        isShow={number > 0 ? number <= index : false}
                                        onSelect={onClickMenu}
                                        isExpand={isExpand}
                                        setSubMenuData={(menu) => {
                                            setSubMenuData(menu.children || [])
                                            setMenuId(menu.label || "")
                                        }}
                                        activeMenuId={menuId}
                                    />
                                )
                            })}
                    </div>
                    {number > 0 && routeMenuDataAfter.length > 0 && (
                        <>
                            <CollapseMenu
                                moreLeft={moreLeft}
                                menuData={routeMenuDataAfter}
                                isExpand={isExpand}
                                onMenuSelect={onClickMoreMenu}
                            />
                        </>
                    )}
                </div>
                <div className={classNames(style["heard-menu-right"])}>
                    {!isEnpriTraceAgent() ? (
                        <>
                            <ExtraMenu onMenuSelect={onRouteMenuSelect} />
                            <Dropdown
                                overlayClassName={style["customize-drop-menu"]}
                                overlay={
                                    <>
                                        {CustomizeMenuData.map((item) => (
                                            <div
                                                key={item.key}
                                                className={classNames(style["customize-item"], {
                                                    [style["customize-item-select"]]: patternMenu === item.key
                                                })}
                                                onClick={() => onCustomizeMenuClick(item.key)}
                                            >
                                                <div className={style["customize-item-left"]}>
                                                    {item.itemIcon}
                                                    <span className={style["customize-item-label"]}>{item.label}</span>
                                                </div>
                                                {patternMenu === item.key && <CheckIcon />}
                                            </div>
                                        ))}
                                        <Divider style={{margin: "6px 0"}} />
                                        <YakitSpin spinning={loading} tip='Loading...' size='small'>
                                            <div
                                                className={classNames(style["customize-item"])}
                                                onClick={() =>
                                                    CustomizeMenuData.find(
                                                        (ele) => patternMenu === ele.key
                                                    )?.onRestoreMenu()
                                                }
                                            >
                                                {CustomizeMenuData.find((ele) => patternMenu === ele.key)?.tip}
                                            </div>
                                            <div
                                                className={classNames(style["customize-item"])}
                                                onClick={() => onGoCustomize()}
                                            >
                                                Edit Menu
                                            </div>
                                            <div
                                                className={classNames(style["customize-item"])}
                                                onClick={() => {
                                                    setVisibleImport(true)
                                                    setMenuDataString("")
                                                    setFileName("")
                                                    setRefreshTrigger(!refreshTrigger)
                                                }}
                                            >
                                                Import JSON Config
                                            </div>
                                        </YakitSpin>
                                    </>
                                }
                                onVisibleChange={(e) => {
                                    setCustomizeVisible(e)
                                }}
                            >
                                <YakitButton
                                    type='secondary2'
                                    className={classNames(style["heard-menu-customize"], {
                                        [style["margin-right-0"]]: isExpand,
                                        [style["heard-menu-customize-menu"]]: customizeVisible
                                    })}
                                    icon={<CursorClickIcon />}
                                >
                                    <div className={style["heard-menu-customize-content"]}>
                                        Custom{(customizeVisible && <ChevronUpIcon />) || <ChevronDownIcon />}
                                    </div>
                                </YakitButton>
                            </Dropdown>
                        </>
                    ) : (
                        <>
                            <YakitButton
                                type='secondary2'
                                onClick={() => {
                                    onRouteMenuSelect({route: YakitRoute.PayloadManager})
                                }}
                                icon={<SolidPayloadIcon />}
                            >
                                Payload
                            </YakitButton>
                        </>
                    )}
                    {!isExpand && (
                        <div className={style["heard-menu-sort"]} onClick={() => onExpand(true)}>
                            {!isExpand && <SortDescendingIcon />}
                        </div>
                    )}
                </div>
            </div>
            {isExpand && (
                <div className={style["heard-sub-menu-expand"]}>
                    <Tabs
                        tabBarExtraContent={
                            <div className={style["heard-menu-sort"]} onClick={() => onExpand(false)}>
                                <SortAscendingIcon />
                            </div>
                        }
                        onTabClick={onTabClick}
                        popupClassName={style["heard-sub-menu-popup"]}
                        moreIcon={<DotsHorizontalIcon className={style["dots-icon"]} />}
                    >
                        {subMenuData.map((item, index) => {
                            const nodeLabel = (
                                <div
                                    className={classNames(
                                        style["sub-menu-expand-item-label"],
                                        style["heard-menu-item-label"]
                                    )}
                                >
                                    {item.label}
                                </div>
                            )
                            const isDisable = !item.label || (item.page === YakitRoute.Plugin_OP && !item.yakScriptId)
                            // Submenu Routes
                            const tabKey = routeInfoToKey(item)
                            return (
                                <Tabs.TabPane
                                    tab={
                                        <div className={style["sub-menu-expand"]}>
                                            {(!isDisable && (
                                                <div
                                                    className={style["sub-menu-expand-item"]}
                                                    style={{paddingLeft: index === 0 ? 0 : ""}}
                                                >
                                                    <div className={style["sub-menu-expand-item-icon"]}>
                                                        <span className={style["item-icon"]}>{item.icon}</span>
                                                        <span className={style["item-hoverIcon"]}>
                                                            {item.hoverIcon}
                                                        </span>
                                                    </div>
                                                    <Tooltip title={item.label} placement='bottom'>
                                                        <div
                                                            className={classNames(
                                                                style["sub-menu-expand-item-label"],
                                                                style["heard-menu-item-label"]
                                                            )}
                                                        >
                                                            {item.label}
                                                        </div>
                                                    </Tooltip>
                                                </div>
                                            )) || (
                                                <div
                                                    className={classNames(style["sub-menu-expand-item"], {
                                                        [style["sub-menu-expand-item-disable"]]: isDisable
                                                    })}
                                                    style={{paddingLeft: index === 0 ? 0 : ""}}
                                                    onClick={(e) => {
                                                        // Menu Click Disabled on Loading=true
                                                        // Custom Event Handling to Prevent Tab Bubbling
                                                        e.stopPropagation()
                                                        if (loading) return
                                                        onClickMenu(item)
                                                    }}
                                                >
                                                    <div className={style["sub-menu-expand-item-icon"]}>
                                                        <span className={style["item-icon"]}>
                                                            {(loading && <LoadingOutlined />) || item.icon}
                                                        </span>
                                                    </div>
                                                    {(loading && nodeLabel) || (
                                                        <Tooltip title='Plugin Missing-Download' placement='bottom'>
                                                            {nodeLabel}
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            )}
                                            {index !== subMenuData.length - 1 && (
                                                <div className={style["sub-menu-expand-item-line"]} />
                                            )}
                                        </div>
                                    }
                                    key={tabKey}
                                />
                            )
                        })}
                    </Tabs>
                </div>
            )}
            {/* Review Menu Export Data Format */}
            <YakitModal
                title='Import JSON Config'
                closable={true}
                visible={visibleImport}
                onCancel={() => setVisibleImport(false)}
                width='60%'
                onOk={() => onImportJSON()}
                confirmLoading={importLoading}
                bodyStyle={{padding: 0}}
            >
                <Form className={style["json-import"]} layout='vertical'>
                    <YakitFormDraggerContent
                        accept='.json'
                        textareaProps={{
                            rows: 1,
                            isShowResize: false
                        }}
                        value={""}
                        onChange={(val) => {
                            setMenuDataString(val)
                            setRefreshTrigger(!refreshTrigger)
                        }}
                    />
                    <Form.Item label='JSON Config'>
                        <div style={{height: 400}}>
                            <YakCodeEditor
                                refreshTrigger={refreshTrigger}
                                originValue={StringToUint8Array(menuDataString, "utf8")}
                                language={"json"}
                                onChange={(r) => setMenuDataString(Uint8ArrayToString(r, "utf8"))}
                            />
                        </div>
                    </Form.Item>
                </Form>
            </YakitModal>
        </div>
    )
})

export default HeardMenu

/** Top-Level Items for Expanded & Collapsed Hover Submenu */
const RouteMenuDataItem: React.FC<RouteMenuDataItemProps> = React.memo((props) => {
    const {menuItem, isShow, isExpand, onSelect, setSubMenuData, activeMenuId} = props

    const [visible, setVisible] = useState<boolean>(false)
    const onOpenSecondMenu = useMemoizedFn(() => {
        if (!isExpand) return
        setSubMenuData(menuItem || [])
    })
    const popoverContent = (
        <div
            className={classNames(style["heard-menu-item"], style["heard-menu-item-font-weight"], {
                [style["heard-menu-item-none"]]: isShow,
                [style["heard-menu-item-flex-start"]]: isExpand,
                [style["heard-menu-item-active"]]: (isExpand && activeMenuId === menuItem.label) || visible
            })}
            onClick={() => onOpenSecondMenu()}
        >
            <Tooltip title={menuItem.label} placement='top'>
                <div className={style["heard-menu-item-label"]}>{menuItem.label}</div>
            </Tooltip>
        </div>
    )
    return (
        (isExpand && popoverContent) || (
            <YakitPopover
                placement='bottomLeft'
                content={<SubMenu subMenuData={menuItem.children || []} onSelect={onSelect} />}
                trigger='hover'
                overlayClassName={classNames(style["popover"], {
                    [style["popover-content"]]: menuItem.children && menuItem.children.length <= 1
                })}
                onVisibleChange={setVisible}
            >
                {popoverContent}
            </YakitPopover>
        )
    )
})
/** Collapse Hover Submenu (icon & hover icon)) */
const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData, onSelect} = props

    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div
                    className={classNames(style["heard-sub-menu-item"], {
                        [style["heard-sub-menu-item-disable"]]: !subMenuItem.page
                    })}
                    key={`subMenuItem-${subMenuItem.label}`}
                    onClick={() => onSelect(subMenuItem)}
                >
                    <>
                        <span className={style["heard-sub-menu-item-icon"]}>{subMenuItem.icon}</span>
                        <span className={style["heard-sub-menu-item-hoverIcon"]}>{subMenuItem.hoverIcon}</span>
                    </>
                    {(subMenuItem.page && <div className={style["heard-sub-menu-label"]}>{subMenuItem.label}</div>) || (
                        <Tooltip title='Plugin Missing-Download' placement='bottom' zIndex={9999}>
                            <div className={style["heard-sub-menu-label"]}>{subMenuItem.label}</div>
                        </Tooltip>
                    )}
                </div>
            ))}
        </div>
    )
}
/** Width Affects More Menu Display */
const CollapseMenu: React.FC<CollapseMenuProp> = React.memo((props) => {
    const {menuData, moreLeft, isExpand, onMenuSelect} = props

    const [show, setShow] = useState<boolean>(false)

    const newMenuData: YakitMenuItemProps[] = routeToMenu(menuData)

    const menu = (
        <YakitMenu
            isHint={true}
            data={newMenuData}
            width={136}
            onSelect={({key}) => {
                const data = keyToRouteInfo(key)
                if (data) onMenuSelect(data)
            }}
        ></YakitMenu>
    )

    return (
        <div className={style["heard-menu-more"]} style={{left: moreLeft}}>
            <YakitPopover
                placement={"bottomLeft"}
                arrowPointAtCenter={true}
                content={menu}
                trigger='hover'
                onVisibleChange={(visible) => setShow(visible)}
                overlayClassName={classNames(style["popover"])}
            >
                <div
                    className={classNames(style["heard-menu-item"], style["heard-menu-item-font-weight"], {
                        [style["heard-menu-item-open"]]: show,
                        [style["heard-menu-item-flex-start"]]: isExpand
                    })}
                >
                    More
                    {(show && <ChevronUpIcon />) || <ChevronDownIcon />}
                </div>
            </YakitPopover>
        </div>
    )
})
