import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {DatabaseMenuItemProps, PublicRouteMenuProps, YakitRoute} from "@/routes/newRoute"
import {CodeGV} from "@/yakitGV"
import {RouteToPageProps} from "./PublicMenu"
import {EnhancedPrivateRouteMenuProps} from "../HeardMenu/HeardMenuType"
import {SendDatabaseFirstMenuProps} from "@/routes/newRouteType"

/** Enhanced Public Version Menu Item Props) */
export interface EnhancedPublicRouteMenuProps extends PublicRouteMenuProps {
    menuName: string
    headImg?: string
    children?: EnhancedPublicRouteMenuProps[]
}

/**
 * Convert PublicRouteMenuProps to EnhancedPublicRouteMenuProps
 * Use Depth-Iteration for Multi-Level Menus
 */
export const publicExchangeProps = (menus: PublicRouteMenuProps[]) => {
    const newMenus: EnhancedPublicRouteMenuProps[] = []
    for (let item of menus) {
        const newItem: EnhancedPublicRouteMenuProps = {
            ...item,
            menuName: item.page === YakitRoute.Plugin_OP ? item.yakScripName || item.label : item.label,
            children: undefined
        }

        if (item.children && item.children.length > 0) {
            newItem.children = publicExchangeProps(item.children)
        }
        newMenus.push(newItem)
    }
    return newMenus
}

/**
 * @name Integrate Local & DB Menu Data for Frontend
 * @description Integration Logic: DB Data Priority, Frontend Local New Data at End
 * @description Warning! Logic Only for Plugin-Only Secondary Menus
 * @returns {object} info
 * @returns {Array} info.menus-Frontend Menu Data
 * @returns {boolean} info.isUpdate-DB Menu Data Update Needed
 * @returns {string[]} info.pluginName-Collection of Menu Inside Plugin Names
 */
export const publicUnionMenus = (local: PublicRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // Local Has New Menu Items
    let isUpdate = false
    // Required Plugin Menu Names
    let pluginName: string[] = []
    // Data for Frontend Rendering
    const newMenus: EnhancedPublicRouteMenuProps[] = []

    // Logic for No DB Data
    if (database.length === 0) {
        isUpdate = true
        for (let item of local) {
            const newMenu: EnhancedPublicRouteMenuProps = {
                ...item,
                menuName: item.label,
                children: []
            }
            if (item.children && item.children.length > 0) {
                for (let subItem of item.children) {
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

    // Convert Local Data to Top-Level Menu Relationship Object
    const localToMenus: Record<string, EnhancedPublicRouteMenuProps> = {}
    for (let item of local) {
        let child: EnhancedPublicRouteMenuProps[] = []
        if (item.children && item.children.length > 0)
            child = item.children.map((subitem) => {
                return {...subitem, menuName: subitem.yakScripName || subitem.label, children: undefined}
            })
        localToMenus[item.label] = {...item, menuName: item.label, children: child}
    }
    
    // Logic for DB Data Existence
    for (let item of database) {
        const newMenu: EnhancedPublicRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName,
            children: []
        }

        // DB Sub-menus Under Top-Level Menu
        const databaseChilds = (item.children || []).map((databaseI) => databaseI.menuName)
        // Local Sub-menus Under Top-Level Menu
        const localChilds = (localToMenus[item.menuName]?.children || []).map((localI) => localI.menuName)
        // Union Count of Secondary Menu Items in DB and Local
        const unionChilds = Array.from(new Set([...databaseChilds, ...localChilds]))
        // Local Reference Data for Comparison
        let referenceMenu: EnhancedPublicRouteMenuProps[] = []

        // Custom Top-Level Menu
        if (localChilds.length === 0) referenceMenu = []

        // DB and Local Data Are Consistent
        if (databaseChilds.length === unionChilds.length && localChilds.length === unionChilds.length) {
            referenceMenu = []
        }
        // Local Adds New Data
        if (databaseChilds.length < unionChilds.length && localChilds.length === unionChilds.length) {
            isUpdate = true
            referenceMenu = localToMenus[item.menuName]?.children || []
        }
        // DB Adds New User Data
        if (databaseChilds.length === unionChilds.length && localChilds.length < unionChilds.length) {
            referenceMenu = []
        }
        // Both DB and Local Add New Data
        if (databaseChilds.length < unionChilds.length && localChilds.length < unionChilds.length) {
            isUpdate = true
            referenceMenu = localToMenus[item.menuName]?.children || []
        }

        const {plugins, menus} = databaseConvertLocal(referenceMenu, item.children || [])
        newMenu.children = menus
        newMenus.push(newMenu)
        pluginName = pluginName.concat(plugins)
        delete localToMenus[item.menuName]
    }

    // End-Fill Local Menu with New Data
    for (let item of Object.values(localToMenus)) newMenus.push(item)

    return {
        menus: newMenus,
        isUpdate,
        pluginName: pluginName.filter((item) => !!item)
    }
}

/**
 * @name Integrate Passed DB Secondary Menu Data with Local
 * @description Integration Logic: DB Data Priority, Frontend Local New Data at End
 */
const databaseConvertLocal = (local: EnhancedPublicRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // Convert Local Data to Relationship Object
    const localToMenus: Record<string, EnhancedPublicRouteMenuProps> = {}
    for (let item of local) localToMenus[item.label] = item

    const plugins: string[] = []
    const menus: EnhancedPublicRouteMenuProps[] = []
    for (let item of database) {
        if (item.route === YakitRoute.Plugin_OP && !item.pluginId) plugins.push(item.pluginName || item.menuName)
        menus.push({
            page: item.route as YakitRoute,
            label: item.label,
            menuName: item.menuName,
            yakScriptId: item.pluginId,
            yakScripName: item.pluginName,
            headImg: item.HeadImg
        })
        delete localToMenus[item.menuName]
    }

    // Final Fill of Unique Local Menu Data
    for (let localItem of Object.values(localToMenus)) {
        const info: EnhancedPublicRouteMenuProps = {
            ...localItem,
            yakScriptId: 0
        }
        if (!info.yakScriptId) {
            plugins.push(info.yakScripName || info.menuName)
        }
        menus.push(info)
    }

    return {plugins, menus}
}

/** Convert Public Frontend Menu Data to DB Structure */
export const publicConvertDatabase = (data: EnhancedPublicRouteMenuProps[]) => {
    const menus: SendDatabaseFirstMenuProps[] = []

    let index = 1
    for (let item of data) {
        const menu: SendDatabaseFirstMenuProps = {
            Group: item.label,
            GroupSort: index,
            Mode: CodeGV.PublicMenuModeValue,
            GroupLabel: item.menuName || item.label,
            Items: []
        }

        let subIndex = 1
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                menu.Items.push({
                    Mode: CodeGV.PublicMenuModeValue,
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

/** ---------- Shared Utility Methods for Public/Private Versions ---------- */

/**
 * @name Convert Page Info to Unique ID
 * @description Plugin Menu：${YakitRoute}|${Plugin Name}
 * @description Non-Plugin Menu：${YakitRoute}
 */
export const routeConvertKey = (route: YakitRoute, pluginName?: string) => {
    if (route === YakitRoute.Plugin_OP) return `${route}${separator}${pluginName || ""}`
    else return route
}

/**
 * @name Convert Unique ID to Page Info, Pair with routeConvertKey
 */
export const KeyConvertRoute = (str: string) => {
    try {
        // Decided by separator Variable in routeToMenu Method
        if (str.indexOf(separator) > -1) {
            const keys = str.split(separator)
            const route = keys[0] as YakitRoute
            const info: RouteToPageProps = {
                route: route,
                pluginName: keys[1] || ""
            }
            return info
        } else {
            const route = str as YakitRoute
            const info: RouteToPageProps = {route: route}
            return info
        }
    } catch (error) {
        return null
    }
}

/**
 * Depth-Iterate All Menu Items & Convert ${routeInfoToKey()}-Menu Display Name
 */
export const menusConvertKey = (data: EnhancedPublicRouteMenuProps[] | EnhancedPrivateRouteMenuProps[]) => {
    const names: Map<string, string> = new Map<string, string>()
    for (let item of data) {
        if (item.page) names.set(routeConvertKey(item.page, item.menuName), item.label)
        if (item.children && item.children.length > 0) {
            const subNames = menusConvertKey(item.children)
            subNames.forEach((value, key) => names.set(key, value))
        }
    }
    return names
}

export const separator = "|"
/** Convert Menu Data to Menu Component Data */
export const routeToMenu = (
    routes: EnhancedPublicRouteMenuProps[] | EnhancedPrivateRouteMenuProps[],
    parent?: string
) => {
    const menus: YakitMenuItemProps[] = []
    for (let item of routes) {
        const menuItem: YakitMenuItemProps = {
            label: item.label,
            key: `${routeInfoToKey(item)}${parent ? separator + parent : ""}`
        }
        if (item.children && item.children.length > 0) menuItem.children = routeToMenu(item.children, item.label)
        menus.push(menuItem)
    }
    return menus
}

/**
 * Convert Page Routes to Keys
 * Conversion Format: route|Plugin ID|Plugin Name
 */
export const routeInfoToKey = (
    info: RouteToPageProps | EnhancedPublicRouteMenuProps | EnhancedPrivateRouteMenuProps
) => {
    if ((info as RouteToPageProps).route) {
        const data = info as RouteToPageProps
        if (data.route === YakitRoute.Plugin_OP) {
            return `${data.route}${separator}${data.pluginId || 0}${separator}${data.pluginName || ""}`
        } else {
            return data.route as string
        }
    } else {
        const data = info as EnhancedPublicRouteMenuProps | EnhancedPrivateRouteMenuProps
        if (data.page === YakitRoute.Plugin_OP) {
            return `${data.page}${separator}${data.yakScriptId || 0}${separator}${data.yakScripName || data.menuName}`
        } else {
            return data.page || data.label
        }
    }
}
/** Convert Menu Key Values to Page Route Info */
export const keyToRouteInfo = (str: string) => {
    try {
        // Decided by separator Variable in routeToMenu Method
        if (str.indexOf(separator) > -1) {
            const keys = str.split(separator)
            const route = keys[0] as YakitRoute
            const info: RouteToPageProps = {
                route: route,
                pluginId: +keys[1] || 0,
                pluginName: keys[2] || ""
            }
            return info
        } else {
            const route = str as YakitRoute
            const info: RouteToPageProps = {route: route}
            return info
        }
    } catch (error) {
        return null
    }
}

/** @name Plugin Info Post-Download (Bulk) */
export interface DownloadOnlinePluginByScriptNamesResponse {
    Data: {ScriptName: string; Id: string; HeadImg: string}[]
}
