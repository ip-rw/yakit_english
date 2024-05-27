import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    CustomizeMenuProps,
    FeaturesAndPluginProps,
    FirstMenuItemProps,
    FirstMenuProps,
    PluginLocalInfoProps,
    PluginLocalItemProps,
    PluginLocalListProps,
    SecondMenuItemProps,
    SecondMenuProps,
    SystemFunctionListProps,
    SystemRouteMenuDataItemProps
} from "./CustomizeMenuType"
import style from "./CustomizeMenu.module.scss"
import {
    BanIcon,
    RemoveIcon,
    DragSortIcon,
    PhotographIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    QuestionMarkCircleIcon,
    TerminalIcon,
    PencilAltIcon,
    ShieldExclamationIcon
} from "@/assets/newIcon"
import {SolidCloudpluginIcon, SolidOfficialpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import classNames from "classnames"
import {DragDropContext, Droppable, Draggable, DragUpdate, ResponderProvided, DropResult} from "@hello-pangea/dnd"
import {Avatar, Input, Modal, Tooltip} from "antd"
import {useCreation, useDebounceEffect, useHover, useMemoizedFn, useThrottleFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {
    EnhancedPrivateRouteMenuProps,
    privateConvertDatabase,
    privateExchangeProps,
    privateUnionMenus
} from "../layout/HeardMenu/HeardMenuType"
import {
    DatabaseFirstMenuProps,
    DatabaseMenuItemProps,
    InvalidFirstMenuItem,
    InvalidPageMenuItem,
    PrivateAllMenus,
    PrivateExpertRouteMenu,
    PrivateScanRouteMenu,
    PublicCommonPlugins,
    YakitRoute,
    databaseConvertData,
    getFixedPluginHoverIcon,
    getFixedPluginIcon
} from "@/routes/newRoute"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {isCommunityEdition} from "@/utils/envfile"
import {publicConvertDatabase, publicExchangeProps, publicUnionMenus} from "../layout/publicMenu/utils"
import {PrivateOutlineDefaultPluginIcon} from "@/routes/privateIcon"
import {EnhancedCustomRouteMenuProps, filterCodeMenus, menusConvertJsonData} from "./utils"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

const {ipcRenderer} = window.require("electron")

// Replace feature at specified position
const reorder = (list: EnhancedCustomRouteMenuProps[], startIndex: number, endIndex: number) => {
    const result = [...list]
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

// Extract menu data labels for modification check)
const convertMenuLabel = (menus: EnhancedCustomRouteMenuProps[]) => {
    const newMenus: string[] = []
    try {
        for (let item of menus) {
            newMenus.push(item.label)
            if (item.children && item.children.length > 0) {
                for (let subItem of item.children) newMenus.push(subItem.label)
            }
        }
        return newMenus
    } catch (error) {
        return newMenus
    }
}

const CustomizeMenu: React.FC<CustomizeMenuProps> = React.memo((props) => {
    const {visible, onClose} = props

    // Top and submenu item count limit
    const UpperLimit = useMemo(() => {
        if (isCommunityEdition()) return 20
        return 50
    }, [])

    // Public version common plugin data
    const defaultPluginMenu = useMemo(() => publicExchangeProps(PublicCommonPlugins), [])
    // Expert mode menu data
    const ExpertMenus = useMemo(() => {
        return privateExchangeProps(PrivateExpertRouteMenu)
    }, [])
    // Scan mode menu data
    const ScanMenus = useMemo(() => {
        return privateExchangeProps(PrivateScanRouteMenu)
    }, [])

    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    const [menuData, setMenuData] = useState<EnhancedCustomRouteMenuProps[]>([])
    const [currentFirstMenu, setCurrentFirstMenu] = useState<EnhancedCustomRouteMenuProps>()
    const [subMenuData, setSubMenuData] = useState<EnhancedCustomRouteMenuProps[]>([])

    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [emptyMenuLength, setEmptyMenuLength] = useState<number>(0)

    const [destinationDrag, setDestinationDrag] = useState<string>("droppable2") // Destination for right-hand system functionalities and plugins post-drag
    const [tip, setTip] = useState<string>("Save")

    const systemRouteMenuDataRef = useRef<EnhancedCustomRouteMenuProps[]>([]) // System function list data
    const pluginLocalDataRef = useRef<YakScript[]>([]) // Local plugin list data
    const defaultRouteMenuDataRef = useRef<EnhancedCustomRouteMenuProps[]>([])

    // Cache - User-deleted system menu items data
    const deleteCache = useRef<Record<string, string[]>>({})

    /** Get all system menu list levels (private version only)  */
    const SystemRouteMenuData = useCreation(() => {
        let data: EnhancedCustomRouteMenuProps[] = privateExchangeProps(Object.values(PrivateAllMenus))
        systemRouteMenuDataRef.current = data
        return data
    }, [PrivateAllMenus])

    // Retrieve all menu data from DB
    useEffect(() => {
        if (isCommunityEdition()) {
            getMenuData(CodeGV.PublicMenuModeValue, defaultPluginMenu)
        } else {
            getRemoteValue(RemoteGV.PatternMenu).then((patternMenu) => {
                const menuMode = patternMenu || "expert"
                setPatternMenu(menuMode)
                getMenuData(menuMode, menuMode === "new" ? ScanMenus : ExpertMenus)
            })
        }
    }, [])
    /** @Get DB menu data */
    const getMenuData = useMemoizedFn((menuMode: string, localMenus: EnhancedCustomRouteMenuProps[]) => {
        ipcRenderer
            .invoke("GetAllNavigationItem", {Mode: menuMode})
            .then((res: {Data: DatabaseFirstMenuProps[]}) => {
                const database = databaseConvertData(res.Data || [])
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

                // Filter out user-deleted system menus
                let filterLocal: EnhancedCustomRouteMenuProps[] = []
                getRemoteValue(RemoteGV.UserDeleteMenu)
                    .then((val) => {
                        if (val !== "{}") {
                            let filters: string[] = []
                            try {
                                deleteCache.current = JSON.parse(val) || {}
                                filters = deleteCache.current[menuMode] || []
                            } catch (error) {}
                            for (let item of localMenus) {
                                if (filters.includes(item.label)) continue
                                const menu: EnhancedCustomRouteMenuProps = {...item, children: []}
                                if (item.children && item.children.length > 0) {
                                    for (let subitem of item.children) {
                                        if (!filters.includes(`${item.label}-${subitem.label}`)) {
                                            menu.children?.push({...subitem})
                                        }
                                    }
                                }
                                filterLocal.push(menu)
                            }
                        } else {
                            filterLocal = [...localMenus]
                        }
                    })
                    .catch(() => {
                        filterLocal = [...localMenus]
                    })
                    .finally(() => {
                        let newMenus: EnhancedCustomRouteMenuProps[] = []
                        if (menuMode === CodeGV.PublicMenuModeValue) {
                            const {menus} = publicUnionMenus(filterLocal, caches)
                            newMenus = menus
                        } else {
                            const {menus} = privateUnionMenus(filterLocal, caches)
                            newMenus = menus
                        }
                        // Unique ID for top menu item
                        newMenus.map((item) => {
                            item.id = randomString(6)
                            return item
                        })

                        defaultRouteMenuDataRef.current = [...newMenus]
                        setMenuData([...newMenus])
                        //Default select first top menu
                        if (newMenus.length > 0) {
                            onSelect(newMenus[0])
                        }
                    })
            })
            .catch((err) => {
                yakitFailed("Menu retrieval failed：" + err)
            })
    })
    /** @Select top menu item to display all submenus under it */
    const onSelect = useMemoizedFn((item: EnhancedCustomRouteMenuProps) => {
        setCurrentFirstMenu(item)
        setSubMenuData([...(item.children || [])])
    })
    /** @Add top menu */
    const onAddFirstMenu = useMemoizedFn((value?: string) => {
        if (menuData.length >= UpperLimit) {
            yakitNotify("error", `Max set limit${UpperLimit}Item`)
            return
        }
        const length = menuData.filter((ele) => ele.label.includes("Unnamed")).length
        const menu: EnhancedCustomRouteMenuProps = {
            id: randomString(6),
            page: undefined,
            label: value || `Unnamed${length + 1}`,
            menuName: value || `Unnamed${length + 1}`,
            isNew: true
        }
        setCurrentFirstMenu({...menu})
        setMenuData([...menuData, menu])
        setSubMenuData([])
    })
    /** @Delete top menu item */
    const onRemoveFirstMenu = useMemoizedFn((firstMenu: EnhancedCustomRouteMenuProps) => {
        if (!firstMenu.label) return
        const index = menuData.findIndex((ele) => ele.id === firstMenu.id && ele.label === firstMenu.label)
        if (index === -1) return
        menuData.splice(index, 1)
        setCurrentFirstMenu(undefined)
        setMenuData([...menuData])
        setSubMenuData([])
    })
    /** @Edit or add top menu item display name */
    const editCurrentFirstMenu = useMemoizedFn((value: string) => {
        // Create default top menu if not exist
        if (!currentFirstMenu) {
            onAddFirstMenu(value)
            return
        }
        const index = menuData.findIndex(
            (ele) => ele.id === currentFirstMenu?.id && ele.label === currentFirstMenu?.label
        )
        if (index === -1) return
        menuData[index].label = value
        if (menuData[index].isNew) menuData[index].menuName = value
        setCurrentFirstMenu({
            ...currentFirstMenu,
            label: value,
            menuName: currentFirstMenu.isNew ? value : currentFirstMenu.menuName
        })
        setMenuData([...menuData])
    })
    /** @Mid-right menu post-drag calc */
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        if (!result.destination) {
            return
        }
        // Create default top menu if not exist
        if (!currentFirstMenu) {
            onAddFirstMenu()
        }
        // Reorder within same level
        if (result.source.droppableId === "droppable2" && result.destination.droppableId === "droppable2") {
            const subMenuList: EnhancedPrivateRouteMenuProps[] = reorder(
                subMenuData,
                result.source.index,
                result.destination.index
            )
            updateData(subMenuList)
        }
        // Add - upper limit check
        if (subMenuData.length >= UpperLimit) {
            yakitNotify("error", `Max set limit${UpperLimit}Item`)
            return
        }
        if (result.source.droppableId === "droppable3" && result.destination.droppableId === "droppable2") {
            // Drag system functions here
            const currentSystemMenuItem = systemRouteMenuDataRef.current[result.source.index]
            const destinationIndex = result.destination.index
            subMenuData.splice(destinationIndex, 0, currentSystemMenuItem)
            updateData(subMenuData)
        }
        if (result.source.droppableId === "droppable4" && result.destination.droppableId === "droppable2") {
            // Drag plugins here
            const currentPluginMenuItem = pluginLocalDataRef.current[result.source.index]
            const menuItem: EnhancedCustomRouteMenuProps = {
                page: YakitRoute.Plugin_OP,
                label: currentPluginMenuItem.ScriptName,
                menuName: currentPluginMenuItem.ScriptName,
                icon: getFixedPluginIcon(currentPluginMenuItem.ScriptName),
                hoverIcon: getFixedPluginHoverIcon(currentPluginMenuItem.ScriptName),
                describe: currentPluginMenuItem.Help,
                yakScriptId: +currentPluginMenuItem.Id || 0,
                yakScripName: currentPluginMenuItem.ScriptName,
                headImg: currentPluginMenuItem.HeadImg || ""
            }
            const destinationIndex = result.destination.index
            subMenuData.splice(destinationIndex, 0, menuItem)
            updateData(subMenuData)
        }
    })
    /**
     * @Update selected top menu item and entire menu data on submenu bar use
     * @SubMenuList current submenu
     */
    const updateData = useMemoizedFn((subMenuList: EnhancedCustomRouteMenuProps[]) => {
        if (!currentFirstMenu?.label) return
        const index = menuData.findIndex(
            (item) => item.id === currentFirstMenu.id && item.label === currentFirstMenu.label
        )
        if (index === -1) return
        menuData[index] = {
            ...menuData[index],
            children: subMenuList
        }
        const newCurrentFirstMenu: EnhancedCustomRouteMenuProps = {
            ...currentFirstMenu,
            children: subMenuList
        }
        setSubMenuData([...subMenuList])
        setMenuData([...menuData])
        setCurrentFirstMenu(newCurrentFirstMenu)
    })
    /** @Calculate move range of mid and right menus */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    /** @Add submenu item (Add button feature) */
    const onAddMenuData = useMemoizedFn((item: EnhancedCustomRouteMenuProps) => {
        if (!currentFirstMenu?.label) {
            yakitNotify("error", "Select a left menu first")
            return
        }
        if (subMenuData.length >= UpperLimit) {
            yakitNotify("error", `Max set limit${UpperLimit}Item`)
            return
        }

        subMenuData.splice(subMenuData.length, 0, item)
        setSubMenuData([...subMenuData])
        updateData(subMenuData)
    })
    /** @Delete submenu item */
    const onRemoveSecondMenu = useMemoizedFn((item: EnhancedPrivateRouteMenuProps) => {
        let index = -1
        if (item.page === YakitRoute.Plugin_OP) {
            index = subMenuData.findIndex((i) => i.yakScripName === item.yakScripName)
        } else {
            index = subMenuData.findIndex((i) => i.menuName === item.menuName)
        }
        if (index === -1) return
        subMenuData.splice(index, 1)
        setSubMenuData([...subMenuData])
        updateData(subMenuData)
    })
    // (Export JSON/Complete) button
    const onSave = useMemoizedFn((type?: string) => {
        let length = 0

        menuData.forEach((item) => {
            // Check for empty submenus under each top menu
            if (!item.children || item.children.length === 0) {
                length += 1
            }
        })
        if (length === 0) {
            type === "export" ? onImportJSON() : onSaveLocal()
        } else {
            setTip(type === "export" ? "Export" : "Save")
            setEmptyMenuLength(length)
        }
    })
    /** Save to DB & update frontend menu data */
    const onSaveLocal = useMemoizedFn(() => {
        let firstStageMenu = menuData.map((ele) => ele.label).sort()
        if (firstStageMenu.filter((ele) => !ele).length > 0) {
            yakitNotify("error", `Top menu name required`)
            return
        }
        let repeatMenu = ""
        for (let i = 0; i < firstStageMenu.length; i++) {
            if (firstStageMenu[i] == firstStageMenu[i + 1]) {
                repeatMenu = firstStageMenu[i]
                break
            }
        }
        if (repeatMenu) {
            yakitNotify("error", `【${repeatMenu}】Name exists, please modify`)
            return
        }

        const menus = isCommunityEdition()
            ? publicConvertDatabase(menuData)
            : privateConvertDatabase(menuData, patternMenu)
        setAddLoading(true)
        // Filter user-deleted system menus
        const names = filterCodeMenus(menus, isCommunityEdition() ? "public" : patternMenu)

        ipcRenderer
            .invoke("DeleteAllNavigation", {Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : patternMenu})
            .then(() => {
                ipcRenderer
                    .invoke("AddToNavigation", {Data: menus})
                    .then((rsp) => {
                        const cache = {...deleteCache.current}
                        cache[isCommunityEdition() ? "public" : patternMenu] = names || []
                        setRemoteValue(RemoteGV.UserDeleteMenu, JSON.stringify(cache)).finally(async () => {
                            onClose()
                            let allowModify = await getRemoteValue(RemoteGV.IsImportJSONMenu)
                            try {
                                allowModify = JSON.parse(allowModify) || {}
                            } catch (error) {
                                allowModify = {}
                            }
                            delete allowModify[patternMenu]
                            setRemoteValue(RemoteGV.IsImportJSONMenu, JSON.stringify(allowModify))
                            if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                            else ipcRenderer.invoke("change-main-menu")
                        })
                    })
                    .catch((e) => {
                        yakitNotify("error", `Menu save failed：${e}`)
                    })
                    .finally(() => {
                        setTimeout(() => setAddLoading(false), 300)
                    })
            })
            .catch((e: any) => {
                yakitNotify("error", `Menu update failed:${e}`)
                setTimeout(() => setAddLoading(false), 300)
            })
    })
    /** Export menu data to JSON */
    const onImportJSON = useMemoizedFn(() => {
        const newMenu: DatabaseMenuItemProps[] = menusConvertJsonData(menuData)
        const menuString = JSON.stringify(newMenu)
        saveABSFileToOpen(`menuData-${randomString(10)}.json`, menuString)
    })
    // Cancel button
    const onTip = useMemoizedFn(() => {
        const defaultMenus = convertMenuLabel(defaultRouteMenuDataRef.current).join("|")
        const newMenus = convertMenuLabel(menuData).join("|")
        if (defaultMenus === newMenus) {
            onClose()
        } else {
            Modal.confirm({
                title: "Prompt",
                icon: <ExclamationCircleOutlined />,
                content: "Save and close menu?？",
                okText: "Save",
                cancelText: "Do Not Save",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => onSave(),
                onCancel: () => onClose(),
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        }
    })

    // Use when editing submenu display name
    const [currentSubMenuData, setCurrentSubMenuData] = useState<EnhancedCustomRouteMenuProps>()
    // Editing submenu item display name
    const [subMenuName, setSubMenuName] = useState<string>("")
    // Edit submenu display name dialog
    const [visibleSubMenu, setVisibleSubMenu] = useState<boolean>(false)
    // Edit submenu display name
    const onEditSecondMenu = useMemoizedFn((item: EnhancedCustomRouteMenuProps) => {
        setVisibleSubMenu(true)
        setCurrentSubMenuData(item)
        setSubMenuName(item.label)
    })
    // Edit submenu display name - completion callback
    const onEditSubMenuName = useMemoizedFn(() => {
        if (!currentSubMenuData?.label) return
        const index = subMenuData.findIndex((item) => item.label === currentSubMenuData?.label)
        if (index === -1) return
        subMenuData[index] = {
            ...subMenuData[index],
            label: subMenuName
        }
        updateData(subMenuData)
        setVisibleSubMenu(false)
    })

    return (
        <div
            className={classNames(style["content"], {
                [style["content-show"]]: visible
            })}
        >
            <div className={style["left"]}>
                <div className={style["left-heard"]}>
                    <div className={style["display-flex"]}>
                        <ArrowLeftIcon className={style["content-icon"]} onClick={() => onTip()} />
                        <div className={style["left-title"]}>
                            {isCommunityEdition()
                                ? "Edit common plugins"
                                : patternMenu === "expert"
                                ? "Edit expert mode"
                                : "Edit scan mode"}
                        </div>
                        <div className={style["left-number"]}>
                            {menuData.length}/{UpperLimit}
                        </div>
                    </div>
                    <div>
                        <PlusIcon className={style["content-icon"]} onClick={() => onAddFirstMenu()} />
                    </div>
                </div>
                <div className={style["left-content"]}>
                    <FirstMenu
                        menuData={menuData}
                        setMenuData={setMenuData}
                        currentFirstMenu={currentFirstMenu}
                        onSelect={onSelect}
                        onRemove={onRemoveFirstMenu}
                    />
                </div>
                <div className={style["left-footer"]}>
                    <YakitButton type='outline2' onClick={() => onTip()}>
                        Cancel
                    </YakitButton>
                    <div>
                        {!isCommunityEdition() && (
                            <YakitButton type='outline1' onClick={() => onSave("export")}>
                                Export JSON
                            </YakitButton>
                        )}
                        <YakitButton type='primary' onClick={() => onSave()} loading={addLoading}>
                            Complete
                        </YakitButton>
                    </div>
                </div>
            </div>
            <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                <div className={style["middle"]}>
                    <SecondMenu
                        currentFirstMenu={currentFirstMenu}
                        editCurrentFirstMenu={editCurrentFirstMenu}
                        subMenuData={subMenuData}
                        onRemoveFirstMenu={() => {
                            if (currentFirstMenu && currentFirstMenu.label) onRemoveFirstMenu(currentFirstMenu)
                        }}
                        onRemoveSecondMenu={onRemoveSecondMenu}
                        onEdit={onEditSecondMenu}
                    />
                </div>
                <div className={style["right"]}>
                    <FeaturesAndPlugin
                        destinationDrag={destinationDrag}
                        setPluginList={(list) => (pluginLocalDataRef.current = list)}
                        onAddMenuData={onAddMenuData}
                        subMenuData={subMenuData}
                        onRemoveMenu={onRemoveSecondMenu}
                        SystemRouteMenuData={SystemRouteMenuData}
                    />
                </div>
            </DragDropContext>
            <YakitModal
                hiddenHeader={true}
                closable={false}
                footer={null}
                visible={visibleSubMenu}
                onCancel={() => setVisibleSubMenu(false)}
                bodyStyle={{padding: 0}}
            >
                <div className={style["subMenu-edit-modal"]}>
                    <div className={style["subMenu-edit-modal-heard"]}>
                        <div className={style["subMenu-edit-modal-title"]}>Edit menu name</div>
                        <div className={style["close-icon"]} onClick={() => setVisibleSubMenu(false)}>
                            <RemoveIcon />
                        </div>
                    </div>
                    <div className={style["subMenu-edit-modal-body"]}>
                        <YakitInput.TextArea
                            autoSize={{minRows: 3, maxRows: 3}}
                            showCount
                            value={subMenuName}
                            maxLength={50}
                            onChange={(e) => setSubMenuName(e.target.value)}
                        />
                    </div>
                    <div className={style["subMenu-edit-modal-footer"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setVisibleSubMenu(false)
                                setSubMenuName("")
                            }}
                        >
                            Cancel
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onEditSubMenuName()}>
                            Confirm
                        </YakitButton>
                    </div>
                </div>
            </YakitModal>
            <YakitModal
                hiddenHeader={true}
                footer={null}
                visible={emptyMenuLength > 0}
                onCancel={() => setEmptyMenuLength(0)}
                width={431}
                bodyStyle={{padding: 0}}
            >
                <div className={style["confirm-modal"]}>
                    <ShieldExclamationIcon className={style["confirm-icon"]} />
                    <div className={style["confirm-text"]}>Empty menus detected</div>
                    <div className={style["confirm-tip"]}>
                        Has<span>{emptyMenuLength}</span>Empty menu functions, empty menus excluded{tip}，Continue anyway?{tip}？
                    </div>
                    <div className={style["confirm-buttons"]}>
                        <YakitButton
                            type='outline2'
                            size='large'
                            className={style["confirm-btn"]}
                            onClick={() => setEmptyMenuLength(0)}
                        >
                            Cancel
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            size='large'
                            onClick={() => {
                                if (tip === "Export") onImportJSON()
                                else onSaveLocal()
                            }}
                        >
                            {tip}
                        </YakitButton>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})

export default CustomizeMenu

// Drag functionality requirement
const getItemStyle = (isDragging, draggableStyle) => ({
    ...draggableStyle
})

const getItemStyleSecond = (isDragging, draggableStyle) => ({
    background: isDragging ? "red" : "",
    ...draggableStyle
})
/** @Left Main Menu Bar */
const FirstMenu: React.FC<FirstMenuProps> = React.memo((props) => {
    const {menuData, setMenuData, currentFirstMenu, onSelect, onRemove} = props

    const [destinationDrag, setDestinationDrag] = useState<string>("droppable1")

    /**
     * @Post-drag calculation
     */
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const menuList: EnhancedPrivateRouteMenuProps[] = reorder(
                menuData,
                result.source.index,
                result.destination.index
            )
            setMenuData(menuList)
        }
    })
    /**
     * @Calculate move range
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    return (
        <div className={style["first-menu-list"]}>
            <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                <Droppable droppableId='droppable1'>
                    {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {menuData.map((item, index) => (
                                <Draggable
                                    key={`${item.id || ""}-${item.menuName}-${index}`}
                                    draggableId={item.id || item.menuName}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                        >
                                            <FirstMenuItem
                                                key={`${item.id || ""}-${item.menuName}-${index}`}
                                                menuItem={item}
                                                currentMenuItem={currentFirstMenu}
                                                isDragging={snapshot.isDragging}
                                                onSelect={onSelect}
                                                destinationDrag={destinationDrag}
                                                onRemove={onRemove}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    )
})
/** @Name Left Main Menu Item */
const FirstMenuItem: React.FC<FirstMenuItemProps> = React.memo((props) => {
    const {menuItem, currentMenuItem, isDragging, onSelect, destinationDrag, onRemove} = props

    return (
        <div
            className={classNames(style["first-menu-item"], {
                [style["first-menu-item-select"]]:
                    menuItem.id === currentMenuItem?.id && menuItem.label === currentMenuItem?.label,
                [style["menu-item-drag"]]: isDragging
            })}
            onClick={() => onSelect(menuItem)}
        >
            <div className={classNames(style["display-flex"], style["first-menu-item-left"])}>
                <DragSortIcon
                    className={classNames(style["content-icon"], {
                        [style["content-icon-active"]]: isDragging
                    })}
                />
                <div className={style["first-menu-item-label"]} title={menuItem.label}>
                    {menuItem.label}
                </div>
            </div>
            <div className={style["first-sub-menu-number"]}>{menuItem.children?.length || 0}</div>
            <TrashIcon
                className={style["trash-icon"]}
                onClick={(e) => {
                    e.stopPropagation()
                    onRemove(menuItem)
                }}
            />
            {!destinationDrag && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})
/** @Name Mid-level Submenu Bar */
const SecondMenu: React.FC<SecondMenuProps> = React.memo((props) => {
    const {currentFirstMenu, subMenuData, editCurrentFirstMenu, onRemoveFirstMenu, onRemoveSecondMenu, onEdit} = props
    // Top and submenu item count limit
    const UpperLimit = useMemo(() => {
        if (isCommunityEdition()) return 20
        return 50
    }, [])

    return (
        <div className={style["second-menu"]}>
            <div className={style["second-menu-heard"]}>
                <div className={style["second-menu-heard-input"]}>
                    <Input
                        placeholder='Unnamed1 (Menu names best within 4-16 English characters)'
                        bordered={false}
                        suffix={
                            <YakitPopconfirm
                                title='Confirm menu deletion?'
                                onConfirm={onRemoveFirstMenu}
                                placement='bottomRight'
                            >
                                <div className={style["trash-style"]}>
                                    <TrashIcon />
                                </div>
                            </YakitPopconfirm>
                        }
                        value={currentFirstMenu?.label}
                        onChange={(e) => {
                            editCurrentFirstMenu(e.target.value)
                        }}
                    />
                </div>
                <div className={style["second-menu-heard-tip"]}>
                    Functionality added {subMenuData.length}/{UpperLimit}
                </div>
            </div>

            <div className={style["second-menu-list"]}>
                <Droppable droppableId='droppable2'>
                    {(provided, snapshot) => {
                        return (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={style["second-menu-drop"]}
                                style={{marginBottom: 70}}
                            >
                                {subMenuData.map((item, index) => (
                                    <Draggable key={item.label} draggableId={item.label} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                            >
                                                <SecondMenuItem
                                                    key={item.label}
                                                    menuItem={item}
                                                    isDragging={snapshot.isDragging}
                                                    onRemoveSecondMenu={onRemoveSecondMenu}
                                                    onEdit={onEdit}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {subMenuData.length === 0 && (
                                    <div className={style["second-menu-no-data"]}>
                                        <PhotographIcon className={style["second-menu-photograph-icon"]} />
                                        <div>
                                            <div
                                                className={classNames(
                                                    style["second-menu-text"],
                                                    style["second-menu-text-bold"]
                                                )}
                                            >
                                                No functions added yet
                                            </div>
                                            <div className={style["second-menu-text"]}>
                                                Drag or click to add feature here
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {provided.placeholder}
                            </div>
                        )
                    }}
                </Droppable>
            </div>
        </div>
    )
})
/** @Mid-level Submenu Item */
const SecondMenuItem: React.FC<SecondMenuItemProps> = React.memo((props) => {
    const {menuItem, isDragging, onRemoveSecondMenu, onEdit} = props

    const showIcon = useMemo(() => {
        if (isCommunityEdition()) {
            return (
                (
                    <Avatar
                        className={style["avatar-style"]}
                        src={menuItem.headImg || ""}
                        icon={<PrivateOutlineDefaultPluginIcon />}
                    />
                ) || <PrivateOutlineDefaultPluginIcon />
            )
        } else {
            return menuItem.icon || <PrivateOutlineDefaultPluginIcon />
        }
    }, [menuItem])

    return (
        <div className={style["second-menu-item-content"]}>
            <div
                className={classNames(style["second-menu-item"], {
                    [style["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [style["content-icon-active"]]: isDragging
                    })}
                />
                {showIcon}
                <div className={style["second-menu-label-body"]}>
                    <div className={style["second-menu-label-content"]}>
                        <span className={style["second-menu-label"]}>{menuItem.label}</span>
                        {menuItem.page === YakitRoute.Plugin_OP && (
                            <PencilAltIcon
                                className={style["second-menu-edit-icon"]}
                                onClick={() => onEdit(menuItem)}
                            />
                        )}
                    </div>
                    <div className={style["second-menu-describe"]}>
                        {menuItem.describe || "No Description about it."}
                    </div>
                </div>
                <YakitButton
                    size='small'
                    type='text2'
                    icon={<RemoveIcon className={style["close-icon"]} />}
                    onClick={() => onRemoveSecondMenu(menuItem)}
                />
            </div>
        </div>
    )
})
/** @Name Right All Menu (System Menu|Plugin Store) */
const FeaturesAndPlugin: React.FC<FeaturesAndPluginProps> = React.memo((props) => {
    const [type, setType] = useState<"system" | "plugin">(isCommunityEdition() ? "plugin" : "system")
    const [keywords, setKeyWords] = useState<string>("")
    const [isSearch, setIsSearch] = useState<boolean>(false)
    return (
        <>
            <div className={style["right-heard"]}>
                {isCommunityEdition() ? (
                    <div className={style["header-title"]}>Plugin Store</div>
                ) : (
                    <YakitRadioButtons
                        value={type}
                        onChange={(e) => {
                            setKeyWords("")
                            setType(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "system",
                                label: "System function"
                            },
                            {
                                value: "plugin",
                                label: "Plugin"
                            }
                        ]}
                    />
                )}
                <YakitInput.Search
                    placeholder='Keyword Search Prompt'
                    value={keywords}
                    onChange={(e) => setKeyWords(e.target.value)}
                    style={{maxWidth: 200}}
                    onSearch={() => setIsSearch(!isSearch)}
                    onPressEnter={() => setIsSearch(!isSearch)}
                />
            </div>
            <div className={style["right-help"]}>Drag or click to add feature to left menu</div>
            {type === "system" && (
                <SystemFunctionList
                    destinationDrag={props.destinationDrag}
                    onAddMenuData={props.onAddMenuData}
                    subMenuData={props.subMenuData}
                    keywords={keywords}
                    isSearch={isSearch}
                    onRemoveMenu={props.onRemoveMenu}
                    SystemRouteMenuData={props.SystemRouteMenuData}
                />
            )}
            {type === "plugin" && (
                <PluginLocalList
                    keywords={keywords}
                    isSearch={isSearch}
                    destinationDrag={props.destinationDrag}
                    setPluginList={props.setPluginList}
                    onAddMenuData={props.onAddMenuData}
                    subMenuData={props.subMenuData}
                    onRemoveMenu={props.onRemoveMenu}
                />
            )}
        </>
    )
})
/** @Name Right System Menu Bar */
const SystemFunctionList: React.FC<SystemFunctionListProps> = React.memo((props) => {
    const {SystemRouteMenuData} = props
    const [keyword, setKeyword] = useState<string>("")
    const [systemRouteMenuData, setSystemRouteMenuData] = useState(SystemRouteMenuData)
    useDebounceEffect(
        () => {
            setKeyword(props.keywords)
        },
        [props.keywords],
        {
            wait: 200
        }
    )
    // Search feature
    useEffect(() => {
        const newList = SystemRouteMenuData.filter((item) => item.label.includes(keyword))
        setSystemRouteMenuData(newList)
    }, [props.isSearch])
    return (
        <Droppable droppableId='droppable3'>
            {(provided, snapshot) => {
                return (
                    <div {...provided.droppableProps} ref={provided.innerRef} className={style["system-function-list"]}>
                        {systemRouteMenuData.map((item, index) => {
                            const isDragDisabled =
                                props.subMenuData.findIndex((i) => i.menuName === item.menuName) !== -1
                            return (
                                <Draggable
                                    key={item.label}
                                    draggableId={`${item.label}-system`}
                                    index={index}
                                    isDragDisabled={isDragDisabled}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                        >
                                            <SystemRouteMenuDataItem
                                                item={item}
                                                isDragging={snapshot.isDragging}
                                                destinationDrag={props.destinationDrag}
                                                onAddMenuData={props.onAddMenuData}
                                                isDragDisabled={isDragDisabled}
                                                onRemoveMenu={props.onRemoveMenu}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })}
                        {provided.placeholder}
                    </div>
                )
            }}
        </Droppable>
    )
})
/** @Name Right System Menu Item */
const SystemRouteMenuDataItem: React.FC<SystemRouteMenuDataItemProps> = React.memo((props) => {
    const {item, isDragging, destinationDrag, onAddMenuData, isDragDisabled, onRemoveMenu} = props
    const systemRef = useRef(null)
    const isHovering = useHover(systemRef)
    return (
        <div
            className={classNames(style["system-function-item"], {
                [style["system-function-item-isDragging"]]: isDragging
            })}
            ref={systemRef}
        >
            <div className={style["display-flex"]}>
                <span className={classNames(style["menu-icon"], {[style["menu-item-isDragDisabled"]]: isDragDisabled})}>
                    {item.icon}
                </span>
                <span
                    className={classNames(style["menu-label"], {[style["menu-item-isDragDisabled"]]: isDragDisabled})}
                >
                    {item.label}
                </span>

                <Tooltip
                    title={item.describe || "No Description about it."}
                    placement='topRight'
                    overlayClassName={style["question-tooltip"]}
                >
                    <QuestionMarkCircleIcon className={style["menu-question-icon"]} />
                </Tooltip>
            </div>
            {(isDragDisabled && (
                <>
                    {isHovering ? (
                        <div className={style["menu-cancel"]} onClick={() => onRemoveMenu(item)}>
                            Fetch&nbsp;Cancel
                        </div>
                    ) : (
                        <div className={style["have-add"]}>Added</div>
                    )}
                </>
            )) || (
                <YakitButton
                    type='text'
                    onClick={() => {
                        onAddMenuData(item)
                    }}
                >
                    Add
                </YakitButton>
            )}
            {destinationDrag === "droppable3" && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})
/** @Name Right Plugin Store Column */
const PluginLocalList: React.FC<PluginLocalListProps> = React.memo((props) => {
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 20,
            Page: 0,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [keyword, setKeyword] = useState<string>("")
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)
    useDebounceEffect(
        () => {
            setKeyword(props.keywords)
        },
        [props.keywords],
        {
            wait: 200
        }
    )
    useEffect(() => {
        getYakScriptList(1, 20)
    }, [props.isSearch])
    const getYakScriptList = (page?: number, limit?: number) => {
        const newParams = {
            // Tag: [],
            // Type: "yak,mitm,codec,packet-hack,port-scan,nuclei", //Fetch all if unspecified
            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
            Keyword: keyword
        }
        if (page) newParams.Pagination.Page = page
        if (limit) newParams.Pagination.Limit = limit
        setLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                const data = page === 1 ? item.Data : response.Data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit || data.length === response.Total
                setHasMore(!isMore)
                setResponse({
                    ...item,
                    Data: [...data]
                })
                props.setPluginList(data)
                if (page === 1) {
                    setIsRef(!isRef)
                }
            })
            .catch((e: any) => {
                yakitNotify("error", "Query Local Yak Script yakitFailed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }
    const loadMoreData = useMemoizedFn(() => {
        getYakScriptList(parseInt(`${response.Pagination.Page}`) + 1, 20)
    })

    return (
        <Droppable droppableId='droppable4'>
            {(provided, snapshot) => {
                return (
                    <div className={style["plugin-local-list"]} {...provided.droppableProps} ref={provided.innerRef}>
                        <RollingLoadList<YakScript>
                            isRef={isRef}
                            data={response.Data}
                            page={response.Pagination.Page}
                            hasMore={hasMore}
                            loading={loading}
                            loadMoreData={loadMoreData}
                            defItemHeight={44}
                            renderRow={(data: YakScript, index) => {
                                const isDragDisabled =
                                    props.subMenuData.findIndex((i) => i.yakScripName == data.ScriptName) !== -1
                                return (
                                    <Draggable
                                        key={data.Id}
                                        draggableId={`${data.Id}-plugin`}
                                        index={index}
                                        isDragDisabled={isDragDisabled}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                            >
                                                <PluginLocalItem
                                                    key={data.Id}
                                                    plugin={data}
                                                    isDragging={snapshot.isDragging}
                                                    destinationDrag={props.destinationDrag}
                                                    onAddMenuData={props.onAddMenuData}
                                                    isDragDisabled={isDragDisabled}
                                                    onRemoveMenu={props.onRemoveMenu}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                )
                            }}
                        />
                        {provided.placeholder}
                    </div>
                )
            }}
        </Droppable>
    )
})
/** @Name Right Plugin Store Item */
const PluginLocalItem: React.FC<PluginLocalItemProps> = React.memo((props) => {
    const {plugin, isDragging, destinationDrag, onAddMenuData, isDragDisabled, onRemoveMenu} = props
    const pluginRef = useRef(null)
    const isHovering = useHover(pluginRef)
    const onAdd = useMemoizedFn(() => {
        const menuItem: EnhancedCustomRouteMenuProps = {
            page: YakitRoute.Plugin_OP,
            label: plugin.ScriptName,
            menuName: plugin.ScriptName,
            icon: getFixedPluginIcon(plugin.ScriptName),
            hoverIcon: getFixedPluginHoverIcon(plugin.ScriptName),
            describe: plugin.Help,
            yakScriptId: +plugin.Id || 0,
            yakScripName: plugin.ScriptName,
            headImg: plugin.HeadImg || ""
        }
        onAddMenuData(menuItem)
    })
    const onRemove = useMemoizedFn(() => {
        const menuItem: EnhancedCustomRouteMenuProps = {
            page: YakitRoute.Plugin_OP,
            label: plugin.ScriptName,
            menuName: plugin.ScriptName,
            icon: getFixedPluginIcon(plugin.ScriptName),
            hoverIcon: getFixedPluginHoverIcon(plugin.ScriptName),
            describe: plugin.Help,
            yakScriptId: +plugin.Id || 0,
            yakScripName: plugin.ScriptName,
            headImg: plugin.HeadImg || ""
        }
        onRemoveMenu(menuItem)
    })

    return (
        <div
            className={classNames(style["plugin-local-item"], {
                [style["plugin-local-item-isDragging"]]: isDragging
            })}
            ref={pluginRef}
        >
            <div className={style["plugin-local-item-left"]}>
                <img
                    alt=''
                    src={plugin.HeadImg}
                    className={classNames(style["plugin-local-headImg"], {
                        [style["menu-item-isDragDisabled"]]: isDragDisabled
                    })}
                />
                <span
                    className={classNames(style["plugin-local-scriptName"], {
                        [style["menu-item-isDragDisabled"]]: isDragDisabled
                    })}
                >
                    {plugin.ScriptName}
                </span>
                <PluginLocalInfoIcon plugin={plugin} />
            </div>
            {(isDragDisabled && (
                <>
                    {isHovering ? (
                        <div className={style["menu-cancel"]} onClick={() => onRemove()}>
                            Fetch&nbsp;Cancel
                        </div>
                    ) : (
                        <div className={style["have-add"]}>Added</div>
                    )}
                </>
            )) || (
                <YakitButton type='text' onClick={() => onAdd()}>
                    Add
                </YakitButton>
            )}

            {destinationDrag === "droppable4" && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})
/** @Name Right Plugin Item Icon */
export const PluginLocalInfoIcon: React.FC<PluginLocalInfoProps> = React.memo((props) => {
    const {plugin, getScriptInfo} = props
    const renderIcon = useMemoizedFn(() => {
        if (plugin.OnlineOfficial) {
            return (
                <Tooltip title='Official Plugins'>
                    <SolidOfficialpluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
        if (plugin.OnlineIsPrivate) {
            return (
                <Tooltip title='Private plugins'>
                    <SolidPrivatepluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
        if (plugin.UUID) {
            return (
                <Tooltip title='Cloud Plugins'>
                    <SolidCloudpluginIcon className={style["plugin-local-icon"]} />
                </Tooltip>
            )
        }
    })
    return (
        <>
            {renderIcon()}
            <Tooltip
                title={plugin.Help || "No Description about it."}
                placement='topRight'
                overlayClassName={style["question-tooltip"]}
                onVisibleChange={(v) => {
                    if (v && !plugin.Help) {
                        if (getScriptInfo) getScriptInfo(plugin)
                    }
                }}
            >
                <QuestionMarkCircleIcon className={style["plugin-local-icon"]} />
            </Tooltip>
            <YakitPopover
                placement='topRight'
                overlayClassName={style["terminal-popover"]}
                content={<YakEditor type={plugin.Type} value={plugin.Content} readOnly={true} />}
                onVisibleChange={(v) => {
                    if (v && !plugin.Content) {
                        if (getScriptInfo) getScriptInfo(plugin)
                    }
                }}
            >
                <TerminalIcon className={style["plugin-local-icon"]} />
            </YakitPopover>
        </>
    )
})
