import {YakScript} from "../invoker/schema"
import {EnhancedCustomRouteMenuProps} from "./utils"

export interface CustomizeMenuProps {
    visible: boolean
    onClose: () => void
}

/**
 * @Top Menu Item
 * @menuData Menu Data
 * @property setMenuData
 * @property currentFirstMenu
 * @property onSelect
 * @onRemove Delete Item
 */
export interface FirstMenuProps {
    menuData: EnhancedCustomRouteMenuProps[]
    setMenuData: (s: EnhancedCustomRouteMenuProps[]) => void
    currentFirstMenu?: EnhancedCustomRouteMenuProps
    onSelect: (s: EnhancedCustomRouteMenuProps) => void
    onRemove: (s: EnhancedCustomRouteMenuProps) => void
}
/**
 * @Top Menu Item
 * @index Position
 * @menuItem Menu Item
 * @currentMenuItem Selected Item
 * @isDragging Dragging
 * @onSelect Select
 * @destinationDrag Drag Destination
 * @onRemove Delete Item
 */
export interface FirstMenuItemProps {
    menuItem: EnhancedCustomRouteMenuProps
    currentMenuItem?: EnhancedCustomRouteMenuProps
    isDragging: boolean
    onSelect: (s: EnhancedCustomRouteMenuProps) => void
    destinationDrag: string
    onRemove: (s: EnhancedCustomRouteMenuProps) => void
}

/**
 * @Top Menu Item
 * @currentFirstMenu Parent Menu
 * @setCurrentFirstMenu Update Parent Menu
 * @subMenuData Current Submenu
 * @onRemoveFirstMenu Delete Top Menu
 * @onRemoveSecondMenu Delete Submenu
 * @onEdit Edit Submenu
 */
export interface SecondMenuProps {
    currentFirstMenu?: EnhancedCustomRouteMenuProps
    editCurrentFirstMenu: (s: string) => void
    subMenuData: EnhancedCustomRouteMenuProps[]
    onRemoveFirstMenu: () => void
    onRemoveSecondMenu: (m: EnhancedCustomRouteMenuProps) => void
    onEdit: (m: EnhancedCustomRouteMenuProps) => void
}
/**
 * @Submenu Item
 * @menuItem Menu Item
 * @Dragging
 * @onRemoveSecondMenu Delete Submenu
 * @onEdit Edit Submenu
 */
export interface SecondMenuItemProps {
    menuItem: EnhancedCustomRouteMenuProps
    isDragging: boolean
    onRemoveSecondMenu: (m: EnhancedCustomRouteMenuProps) => void
    onEdit: (m: EnhancedCustomRouteMenuProps) => void
}

/**
 * @Right System & Plugin Modules
 * @destinationDrag Drag Destination
 * @setPluginList Update Plugin List
 * @onAddMenuData Add Submenu
 * @subMenuData Submenu
 * @onRemoveMenu Remove Submenu
 * @SystemRouteMenuData All System Submenus
 */
export interface FeaturesAndPluginProps {
    destinationDrag: string
    setPluginList: (s: YakScript[]) => void
    onAddMenuData: (m: EnhancedCustomRouteMenuProps) => void
    subMenuData: EnhancedCustomRouteMenuProps[]
    onRemoveMenu: (m: EnhancedCustomRouteMenuProps) => void
    SystemRouteMenuData: EnhancedCustomRouteMenuProps[]
}

/**
 * @System Features List
 * @keywords Search Keywords
 * @isSearch Search
 * @destinationDrag Drag Destination
 * @onAddMenuData Add Submenu
 * @subMenuData Submenu
 * @onRemoveMenu Remove Submenu
 * @SystemRouteMenuData All System Submenus
 */
export interface SystemFunctionListProps {
    keywords: string
    isSearch: boolean
    destinationDrag: string
    onAddMenuData: (m: EnhancedCustomRouteMenuProps) => void
    subMenuData: EnhancedCustomRouteMenuProps[]
    onRemoveMenu: (m: EnhancedCustomRouteMenuProps) => void
    SystemRouteMenuData: EnhancedCustomRouteMenuProps[]
}

/**
 * @System Widgets
 * @item Current Menu Data
 * @isDragging Dragging
 * @destinationDrag Drag Destination
 * @onAddMenuData Add Submenu
 * @isDragDisabled Drag Disabled
 * @onRemoveMenu Remove Submenu
 */
export interface SystemRouteMenuDataItemProps {
    item: EnhancedCustomRouteMenuProps
    isDragging: boolean
    destinationDrag: string
    onAddMenuData: (m: EnhancedCustomRouteMenuProps) => void
    isDragDisabled: boolean
    onRemoveMenu: (m: EnhancedCustomRouteMenuProps) => void
}

/**
 * @Plugin Local Features List
 * @keywords Search Keywords
 * @isSearch Search
 * @destinationDrag Drag Destination
 * @setPluginList Update Plugin List
 * @onAddMenuData Add Submenu
 * @subMenuData Submenu
 * @onRemoveMenu Remove Submenu
 */
export interface PluginLocalListProps {
    keywords: string
    isSearch: boolean
    destinationDrag: string
    setPluginList: (s: YakScript[]) => void
    onAddMenuData: (m: EnhancedCustomRouteMenuProps) => void
    subMenuData: EnhancedCustomRouteMenuProps[]
    onRemoveMenu: (m: EnhancedCustomRouteMenuProps) => void
}

/**
 * @Local Plugin Widgets
 * @plugin Current Plugin
 * @isDragging Dragging
 * @destinationDrag Drag Destination
 * @onAddMenuData Add Submenu
 * @isDragDisabled Drag Disabled
 * @onRemoveMenu Remove Submenu
 */
export interface PluginLocalItemProps {
    plugin: YakScript
    isDragging: boolean
    destinationDrag: string
    onAddMenuData: (m: EnhancedCustomRouteMenuProps) => void
    isDragDisabled: boolean
    onRemoveMenu: (m: EnhancedCustomRouteMenuProps) => void
}

export interface PluginLocalInfoProps {
    plugin: YakScript
    wrapperClassName?: string
    getScriptInfo?: (YakScript) => void
}
