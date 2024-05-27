import {
    DatabaseMenuItemProps,
    PrivateExpertRouteMenu,
    PrivateRouteMenuProps,
    PrivateScanRouteMenu,
    PublicCommonPlugins,
    PublicRouteMenuProps,
    YakitRoute
} from "@/routes/newRoute"
import {SendDatabaseFirstMenuProps} from "@/routes/newRouteType"
import {ReactNode} from "react"

/** @name EditMenu-Enhanced (Compatible with both public and private versions) */
export interface EnhancedCustomRouteMenuProps {
    /** Since top-level menus lack a page, they cannot generate a unique identifier; id is used for this purpose */
    id?: string
    page: YakitRoute | undefined
    label: string
    menuName: string
    icon?: ReactNode
    hoverIcon?: JSX.Element
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    headImg?: string
    children?: EnhancedCustomRouteMenuProps[]
    // IsCustomAddedMenu (Distinguish between hardcoded and user-defined top-level menus)
    isNew?: boolean
}

/** @name Frontend menu data to JSON */
export const menusConvertJsonData = (data: EnhancedCustomRouteMenuProps[]) => {
    const menus: DatabaseMenuItemProps[] = []
    for (let item of data) {
        const menu: DatabaseMenuItemProps = {
            route: undefined,
            label: item.label,
            menuName: item.menuName || item.label,
            pluginId: 0,
            pluginName: "",
            children: []
        }
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                const subMenu: DatabaseMenuItemProps = {
                    route: subItem.page,
                    label: subItem.label,
                    menuName: subItem.menuName || subItem.yakScripName || subItem.label,
                    pluginId: subItem.yakScriptId || 0,
                    pluginName: subItem.yakScripName || "",
                    HeadImg: subItem?.headImg || undefined
                }
                menu.children?.push(subMenu)
            }
        } else {
            menu.children = undefined
        }
        menus.push(menu)
    }
    return menus
}
/** @name Filter out user-deleted hardcoded menu items (Applicable to second-level menus only) */
export const filterCodeMenus = (menus: SendDatabaseFirstMenuProps[], mode: string) => {
    if (mode === "public") {
        return filterMenus(menus, PublicCommonPlugins)
    }
    if (mode === "expert") {
        return filterMenus(menus, PrivateExpertRouteMenu)
    }
    if (mode === "new") {
        return filterMenus(menus, PrivateScanRouteMenu)
    }
}
/** Filter hardcoded menus - Logic */
const filterMenus = (menus: SendDatabaseFirstMenuProps[], local: PublicRouteMenuProps[] | PrivateRouteMenuProps[]) => {
    const filterNames: string[] = []
    const userMenuName: Record<string, string[] | undefined> = {}
    // Organize user menus: Collection of second-level menu names under top-level menus
    for (let item of menus) {
        userMenuName[item.GroupLabel] = (item.Items || []).map((item) => item.VerboseLabel)
        userMenuName[item.GroupLabel] =
            userMenuName[item.GroupLabel]?.length === 0 ? undefined : userMenuName[item.GroupLabel]
    }
    // Filter hardcoded menus
    for (let item of local) {
        if (!userMenuName[item.label]) {
            filterNames.push(item.label)
            continue
        }
        if (item.children && item.children.length > 0) {
            const names = userMenuName[item.label] || []
            for (let subItem of item.children) {
                // MenuItemUniqueName
                const menuname =
                    subItem.page === YakitRoute.Plugin_OP ? subItem.yakScripName || subItem.label : subItem.label
                if (!names.includes(menuname)) filterNames.push(`${item.label}-${menuname}`)
            }
        }
    }
    return filterNames
}

export const addTag = (tags: string, tag: string) => {
    if (tags == "") {
        return tag
    }
    const tagList = tags.split(",")
    const tagSet = new Set(tagList)
    tagSet.add(tag)
    return Array.from(tagSet).join(",")
}

export const removeTag = (tags: string, tag: string) => {
    if (tags == "") {
        return ""
    }
    const tagList = tags.split(",")
    const tagSet = new Set(tagList)
    tagSet.delete(tag)
    return Array.from(tagSet).join(",")
}