import {
    DatabaseMenuItemProps,
    PrivateAllMenus,
    PrivateRouteMenuProps,
    YakitRoute,
    getFixedPluginDescribe,
    getFixedPluginHoverIcon,
    getFixedPluginIcon
} from "@/routes/newRoute"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {SendDatabaseFirstMenuProps} from "@/routes/newRouteType"

export interface HeardMenuProps {
    defaultExpand: boolean
    onRouteMenuSelect: (info: RouteToPageProps) => void
    setRouteToLabel: (data: Map<string, string>) => void
}

/**
 * @description: Default system menu
 * @param {EnhancedPrivateRouteMenuProps} menuItem: MenuItem
 * @param {boolean} isShow: Display
 * @param {boolean} isExpand: Expand
 * @param {(s: EnhancedPrivateRouteMenuProps) => void} onSelect: Select Menu
 * @param {(s: EnhancedPrivateRouteMenuProps) => void} setSubMenuData: Set SubMenu
 * @param {string} activeMenuId: Active Menu
 */
export interface RouteMenuDataItemProps {
    menuItem: EnhancedPrivateRouteMenuProps
    isShow: boolean
    isExpand: boolean
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
    setSubMenuData: (s: EnhancedPrivateRouteMenuProps) => void
    activeMenuId: string
}

/**
 * @description: Default system submenu YakitPopover
 * @param subMenuData: MenuItem
 * @param onSelect: Select Menu
 */
export interface SubMenuProps {
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: Collapsible menu for excessive primary menus
 * @param menuData: Menu List
 * @param moreLeft: More text left margin
 * @param isExpand: Expand, aligned top for expanded, vertically centered for collapsed primary menus
 * @param onMenuSelect: Select Menu
 */
export interface CollapseMenuProp {
    menuData: EnhancedPrivateRouteMenuProps[]
    moreLeft: number
    isExpand: boolean
    onMenuSelect: (info: RouteToPageProps) => void
}

/**
 * @name Enhanced menu item information definition
 * @description Private version front-end enhanced menu item attributes (for data comparison and rendering logic))
 */
export interface EnhancedPrivateRouteMenuProps extends PrivateRouteMenuProps {
    /** @name Menu label in front-end code */
    menuName: string
    children?: EnhancedPrivateRouteMenuProps[]
}

// Convert menu property PrivateRouteMenuProps to EnhancedPrivateRouteMenuProps
export const privateExchangeProps = (menus: PrivateRouteMenuProps[]) => {
    const newMenus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of menus) {
        const newItem: EnhancedPrivateRouteMenuProps = {
            ...item,
            menuName: item.label,
            children: []
        }

        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                newItem?.children?.push({
                    ...subItem,
                    menuName:
                        subItem.page === YakitRoute.Plugin_OP ? subItem.yakScripName || subItem.label : subItem.label,
                    children: undefined
                })
            }
        } else {
            newItem.children = undefined
        }
        newMenus.push(newItem)
    }
    return newMenus
}

/**
 * @name Handle front-end local and DB menu data interaction, integrate into renderable menu data
 * @description Integration logic: DB data primary, append local new data to existing
 * @description Note!!! Logic only for all submenus as plugins
 * @returns {object} info
 * @returns {Array} info.menus-Menu data for front-end rendering
 * @returns {boolean} info.isUpdate-DB Menu Data Update Needed
 * @returns {string[]} info.pluginName-Collection of menu plugin names
 */
// Logic issue, consider user-deleted menu items not restoring
export const privateUnionMenus = (local: EnhancedPrivateRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // Local has new menu items
    let isUpdate = false
    // Plugin menu names to download
    let pluginName: string[] = []
    // Data for front-end rendering
    const newMenus: EnhancedPrivateRouteMenuProps[] = []

    // DB no data logic
    if (database.length === 0) {
        isUpdate = true
        for (let item of local) {
            const newMenu: EnhancedPrivateRouteMenuProps = {
                ...item,
                menuName: item.label,
                children: []
            }
            if (item.children && item.children.length > 0) {
                for (let subItem of item.children) {
                    // Defaults all front-end data to undownloaded plugins due to no user data
                    if (subItem.page === YakitRoute.Plugin_OP) pluginName.push(subItem.yakScripName || "")
                    newMenu.children?.push({
                        ...subItem,
                        menuName: subItem.yakScripName || subItem.label,
                        children: undefined
                    })
                }
            } else {
                newMenu.children = undefined
            }
            newMenus.push(newMenu)
        }

        return {
            menus: newMenus,
            isUpdate,
            pluginName: pluginName.filter((item) => !!item)
        }
    }

    // Convert local data to primary menu mapping object
    const localToMenus: Record<string, EnhancedPrivateRouteMenuProps> = {}
    for (let item of local) {
        let child: EnhancedPrivateRouteMenuProps[] = []
        if (item.children && item.children.length > 0)
            child = item.children.map((item) => {
                return {...item}
            })
        localToMenus[item.menuName] = {...item, children: child}
    }

    // DB has data logic
    for (let item of database) {
        const newMenu: EnhancedPrivateRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName,
            children: []
        }

        // DB-Submenu names under primary menu
        const databaseChilds = (item.children || []).map((databaseI) => databaseI.menuName)
        // Local-Submenu names under primary menu
        const localChilds = (localToMenus[item.menuName]?.children || []).map((localI) => localI.menuName)
        // Calculate union of DB and local submenu item counts
        const unionChilds = Array.from(new Set([...databaseChilds, ...localChilds]))

        // Local comparison reference data
        let referenceMenu: EnhancedPrivateRouteMenuProps[] = []

        // User-defined primary menus
        if (localChilds.length === 0) referenceMenu = []

        // DB and local data match
        if (databaseChilds.length === unionChilds.length && localChilds.length === unionChilds.length) {
            referenceMenu = []
        }
        // Local has new data
        if (databaseChilds.length < unionChilds.length && localChilds.length === unionChilds.length) {
            isUpdate = true
            referenceMenu = localToMenus[item.menuName]?.children || []
        }
        // DB user-added data
        if (databaseChilds.length === unionChilds.length && localChilds.length < unionChilds.length) {
            referenceMenu = []
        }
        // DB and local both have new data
        if (databaseChilds.length < unionChilds.length && localChilds.length < unionChilds.length) {
            isUpdate = true
            referenceMenu = localToMenus[item.menuName]?.children || []
        }

        const {plugins, menus} = databaseConvertLocal(referenceMenu, item.children || [])
        newMenu.children = [...menus]
        newMenus.push(newMenu)
        pluginName = pluginName.concat(plugins)
        delete localToMenus[item.menuName]
    }

    // Append new local menu data at the end
    for (let item of Object.values(localToMenus)) newMenus.push(item)

    return {
        menus: newMenus,
        isUpdate,
        pluginName: pluginName.filter((item) => !!item)
    }
}
/**
 * @name Convert DB menu data to front-end renderable menu data
 * @description local Compare local with DB menu data, append local additions at the end
 * @returns {object} info
 * @returns {string[]} info.plugins-Plugins to download
 * @returns {Array} info.menus-Menu data for front-end rendering
 */
const databaseConvertLocal = (local: EnhancedPrivateRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // Convert local data to mapping object
    const localToMenus: Record<string, EnhancedPrivateRouteMenuProps> = {}
    for (let item of local) localToMenus[item.menuName] = item

    const plugins: string[] = []
    const menus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of database) {
        if (item.route && item.route !== YakitRoute.Plugin_OP) {
            const info: EnhancedPrivateRouteMenuProps = {
                ...PrivateAllMenus[item.route],
                label: item.label,
                menuName: item.menuName,
                children: undefined,
                yakScriptId: 0,
                yakScripName: ""
            }
            if (!!info.page && !!info.icon) menus.push(info)
        } else {
            // Log undownloaded plugin names
            if (!item.pluginId) plugins.push(item.pluginName || item.menuName)
            const info: EnhancedPrivateRouteMenuProps = {
                page: YakitRoute.Plugin_OP,
                label: item.label,
                menuName: item.menuName,
                icon: getFixedPluginIcon(item.pluginName),
                hoverIcon: getFixedPluginHoverIcon(item.pluginName),
                describe: getFixedPluginDescribe(item.pluginName),
                children: undefined,
                yakScriptId: +item.pluginId || 0,
                yakScripName: item.pluginName
            }
            menus.push(info)
        }
        delete localToMenus[item.menuName]
    }

    // Append local unique menu data at the end
    for (let localItem of Object.values(localToMenus)) {
        const info: EnhancedPrivateRouteMenuProps = {
            ...localItem,
            yakScriptId: 0
        }
        menus.push(info)
    }

    return {plugins, menus}
}

/** Convert public version front-end menu data to DB data structure */
export const privateConvertDatabase = (data: EnhancedPrivateRouteMenuProps[], mode: string) => {
    const menus: SendDatabaseFirstMenuProps[] = []

    let index = 1
    for (let item of data) {
        const menu: SendDatabaseFirstMenuProps = {
            Group: item.label,
            GroupSort: index,
            Mode: mode,
            GroupLabel: item.menuName || item.label,
            Items: []
        }

        let subIndex = 1
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                menu.Items.push({
                    Mode: mode,
                    VerboseSort: subIndex,
                    GroupSort: index,
                    Route: subItem.page || "",
                    Group: menu.Group,
                    GroupLabel: menu.GroupLabel,
                    Verbose: subItem.label,
                    VerboseLabel: subItem.menuName || subItem.label,
                    YakScriptName: subItem.yakScripName || ""
                })
                subIndex += 1
            }
        }

        menus.push(menu)
        index += 1
    }

    return menus
}

/**
 * @name Convert JSON data to front-end menu data
 * @description Logic only for private version menu data
 * @returns {object} obj
 * @returns obj.menus Converted menu data
 * @returns obj.isError
 */
export const jsonDataConvertMenus = (data: DatabaseMenuItemProps[]) => {
    const menus: EnhancedPrivateRouteMenuProps[] = []
    // Log unconvertible data (Auto-discarded processing result))
    let isError: boolean = false

    for (let item of data) {
        // Missing essential data, unable to convert
        if (!item.label || !item.menuName) {
            isError = true
            continue
        }

        const menu: EnhancedPrivateRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName || item.label,
            children: []
        }
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                // Missing essential data, unable to convert
                if (!subItem.route || !subItem.label || !subItem.menuName) {
                    isError = true
                    continue
                }
                // Non-plugin page, and corresponding page component not found
                if (subItem.route !== YakitRoute.Plugin_OP && !PrivateAllMenus[subItem.route]) {
                    isError = true
                    continue
                }
                if (subItem.route !== YakitRoute.Plugin_OP) {
                    const subMenu: EnhancedPrivateRouteMenuProps = {
                        ...PrivateAllMenus[subItem.route],
                        label: subItem.label,
                        menuName: subItem.menuName || subItem.pluginName || subItem.label,
                        yakScriptId: 0,
                        yakScripName: "",
                        children: undefined
                    }
                    menu.children?.push(subMenu)
                } else {
                    const subMenu: EnhancedPrivateRouteMenuProps = {
                        page: subItem.route,
                        label: subItem.label,
                        menuName: subItem.menuName || subItem.pluginName || subItem.label,
                        icon: getFixedPluginIcon(subItem.pluginName),
                        hoverIcon: getFixedPluginHoverIcon(subItem.pluginName),
                        describe: getFixedPluginDescribe(subItem.pluginName),
                        yakScriptId: subItem.pluginId || 0,
                        yakScripName: subItem.pluginName || ""
                    }
                    menu.children?.push(subMenu)
                }
            }
        } else {
            menu.children = undefined
        }
        menus.push(menu)
    }
    return {menus, isError}
}

/**
 * @name Enhanced menu item information definition
 * @description Helps compare DB and local menu data (for auto-download of new menus and plugins))
 */
export interface EnhancedPrivateRouteMenuProps extends PrivateRouteMenuProps {
    /** @name Menu label in front-end code */
    menuName: string
    children?: EnhancedPrivateRouteMenuProps[]
}
/**
 * @name DB menu item information definition
 * @param route Menu route
 * @param label Menu display name
 * @param menuName Menu code name (as defined in code))
 * @param pluginId Plugin ID
 * @param pluginName Plugin Name
 * @param children Children
 */
export interface CacheMenuItemProps {
    route: YakitRoute
    label: string
    menuName: string
    pluginId: string
    pluginName: string
    children?: CacheMenuItemProps[]
}
/**
 * @name Check local menu for new items versus DB, collect undownloaded plugin menus
 * @return menus-Full display menu data
 * @return isUpdate-New menu update available
 * @return updatePlugin-Undownloaded plugin menus
 */
export const unionMenus = (local: EnhancedPrivateRouteMenuProps[], cache: CacheMenuItemProps[]) => {
    // Convert local menu data into mapping
    const localMenuInfo: Record<string, EnhancedPrivateRouteMenuProps> = {}
    for (let item of local) localMenuInfo[item.menuName] = item

    // Local has new menu items
    let isUpdate: boolean = false
    // Need to download plugin menus
    let updatePlugin: string[] = []

    const newMenus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of cache) {
        const newMenuItem: EnhancedPrivateRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName,
            children: []
        }

        const cacheChilds = (item.children || []).map((cachei) => cachei.menuName)
        const localChilds = (localMenuInfo[item.menuName]?.children || []).map((locali) => locali.menuName)

        // DB user-added primary menus
        if (localChilds.length === 0) {
            const {downloadPlugin, menus} = cacheConvertLocal(item.children || [], [])
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
            delete localMenuInfo[item.menuName]
            continue
        }
        // DB and local common primary menus
        const unionChilds = Array.from(new Set([...cacheChilds, ...localChilds]))
        // DB and local data match
        if (cacheChilds.length === unionChilds.length && localChilds.length === unionChilds.length) {
            const {downloadPlugin, menus} = cacheConvertLocal(item.children || [], [])
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }
        // Local has new data
        if (cacheChilds.length < unionChilds.length && localChilds.length === unionChilds.length) {
            isUpdate = true
            const {downloadPlugin, menus} = cacheConvertLocal(
                item.children || [],
                localMenuInfo[item.menuName]?.children || []
            )
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }
        // DB user-added data (deleted pages already filtered out)
        if (cacheChilds.length === unionChilds.length && localChilds.length < unionChilds.length) {
            const {downloadPlugin, menus} = cacheConvertLocal(item.children || [], [])
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }
        // DB and local both have new data
        if (cacheChilds.length < unionChilds.length && localChilds.length < unionChilds.length) {
            isUpdate = true
            const {downloadPlugin, menus} = cacheConvertLocal(
                item.children || [],
                localMenuInfo[item.menuName]?.children || []
            )
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }

        delete localMenuInfo[item.menuName]
        newMenus.push(newMenuItem)
    }

    // Append new local menu data at the end
    for (let item of Object.values(localMenuInfo)) newMenus.push(item)

    return {menus: newMenus, isUpdate, updatePlugin}
}
/**
 * @name Convert DB menu data to front-end renderable menu data
 * @description local Compare local with DB menu data, append local additions at the end
 */
const cacheConvertLocal = (cache: CacheMenuItemProps[], local: EnhancedPrivateRouteMenuProps[]) => {
    const localMenuInfo: Record<string, EnhancedPrivateRouteMenuProps> = {}
    if (local.length > 0) {
        for (let item of local) {
            if (item.page === YakitRoute.Plugin_OP) localMenuInfo[item.yakScripName || item.label] = item
            else localMenuInfo[item.menuName] = item
        }
    }

    const downloadPlugin: string[] = []
    const menus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of cache) {
        if (item.route !== YakitRoute.Plugin_OP) {
            // Exclude common DB and local menu items
            if (!!localMenuInfo[item.menuName]) delete localMenuInfo[item.menuName]

            const info: EnhancedPrivateRouteMenuProps = {
                ...PrivateAllMenus[item.route],
                label: item.label,
                menuName: item.menuName,
                children: undefined,
                yakScriptId: 0,
                yakScripName: ""
            }
            if (!!info.page && !!info.icon) menus.push(info)
        } else {
            // Log undownloaded plugin menus
            if ((+item.pluginId || 0) === 0) downloadPlugin.push(item.pluginName)
            // Exclude common DB and local menu items
            if (!!localMenuInfo[item.pluginName]) delete localMenuInfo[item.pluginName]

            if (PrivateAllMenus[item.pluginName]) {
                const info: EnhancedPrivateRouteMenuProps = {
                    ...PrivateAllMenus[item.pluginName],
                    label: item.label,
                    menuName: item.menuName,
                    children: undefined,
                    yakScriptId: +item.pluginId || 0,
                    yakScripName: item.pluginName
                }
                if (!!info.page && !!info.icon) menus.push(info)
            } else {
                const info: EnhancedPrivateRouteMenuProps = {
                    page: YakitRoute.Plugin_OP,
                    label: item.label,
                    menuName: item.menuName,
                    icon: getFixedPluginIcon(item.pluginName),
                    hoverIcon: getFixedPluginHoverIcon(item.pluginName),
                    describe: "",
                    children: undefined,
                    yakScriptId: +item.pluginId || 0,
                    yakScripName: item.pluginName
                }
                menus.push(info)
            }
        }
    }

    // Append local unique menu data at the end
    for (let localItem of Object.values(localMenuInfo)) {
        const info: EnhancedPrivateRouteMenuProps = {
            ...localItem,
            yakScriptId: 0,
            yakScripName: ""
        }
        if (!!info.page && !!info.icon) menus.push(info)
    }

    return {downloadPlugin, menus}
}

// Convert menu property PrivateRouteMenuProps to EnhancedPrivateRouteMenuProps
export const exchangeMenuProp = (menus: PrivateRouteMenuProps[]) => {
    const newMenus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of menus) {
        const newItem: EnhancedPrivateRouteMenuProps = {
            ...item,
            menuName: item.label,
            children: []
        }

        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                newItem?.children?.push({
                    ...subItem,
                    menuName:
                        subItem.page === YakitRoute.Plugin_OP ? subItem.yakScripName || subItem.label : subItem.label,
                    children: undefined
                })
            }
        } else {
            newItem.children = undefined
        }
        newMenus.push(newItem)
    }
    return newMenus
}
