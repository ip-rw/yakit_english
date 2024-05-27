import {RollingLoadListProps} from "@/components/RollingLoadList/RollingLoadList"
import {FilterPanelGroupItem} from "@/components/businessUI/FilterPanel/FilterPanelType"
import {ReactNode} from "react"
import {PluginBaseParamProps, PluginSettingParamProps} from "./pluginsType"
import {API} from "@/services/swagger/resposeType"

export interface PluginsLayoutProps {
    /** Page ID */
    pageWrapId?: string
    /** Page Title */
    title?: ReactNode | string
    /** Subtitle (next to title) */
    subTitle?: ReactNode
    /** Header Extension Area */
    extraHeader?: ReactNode
    /** Show/Hide */
    hidden?: boolean
    children: ReactNode
}

export interface PluginsContainerProps {
    children: ReactNode
    /** Loading Status */
    loading?: boolean
    /** Is Visible */
    visible: boolean
    /** Set Visibility */
    setVisible: (show: boolean) => any
    /** Selected Data */
    selecteds: Record<string, API.PluginsSearchData[]>
    /** Selected Data Callback */
    onSelect: (value: Record<string, API.PluginsSearchData[]>) => any
    /** Data Display List */
    groupList: FilterPanelGroupItem[]
    /** ClassName */
    filterClassName?: string
}

export interface PluginDetailsProps<T> {
    /** Component ID */
    pageWrapId?: string
    title: string | ReactNode
    /**Search Content */
    search: PluginSearchParams
    /** Set Search Content */
    setSearch: (s: PluginSearchParams) => void
    /** Search Function Callback (with debounce)) */
    onSearch: (value: PluginSearchParams) => any
    /** Search Bar Extra Actions */
    filterNode?: ReactNode
    /** Actions Below Search Conditions */
    filterBodyBottomNode?: ReactNode
    /** Search Bar Extra Filter Component */
    filterExtra?: ReactNode
    /** Select All Status */
    checked: boolean
    /** Set Select All */
    onCheck: (value: boolean) => any
    /** Total Plugins */
    total: number
    /** Selected Plugin Count */
    selected: number
    /** Search List Attributes */
    listProps: RollingLoadListProps<T>
    /** Back Event */
    onBack: () => any
    children: ReactNode
    /** First Page Loading Query */
    spinLoading?: boolean
    /**Right Header Components */
    rightHeardNode?: ReactNode
    /**Hide Right Section */
    hidden?: boolean
    setHidden?: (value: boolean) => void
    /**Content Class */
    bodyClassName?: string
}

export interface PluginDetailHeaderProps {
    /** Plugin Name */
    pluginName: string
    /** Plugin Help Info */
    help?: string
    /** Title Extra Nodes */
    titleNode?: ReactNode
    /** Tag (type+content) Min Width */
    tagMinWidth?: number
    /** Plugin Tag Group */
    tags?: string
    /** Right Extension Elements */
    extraNode?: ReactNode
    /** Author Avatar */
    img: string
    /** Author Name */
    user: string
    /** Plugin ID (Used Online & Locally)) */
    pluginId: string
    /** Update Time */
    updated_at: number
    /**Collaborator Info */
    prImgs?: CollaboratorInfoProps[]
    /**Plugin Type */
    type: string
    /** Copy Source Plugin */
    basePluginName?: string
    /** wrapper classname */
    wrapperClassName?: string
}
/**Collaborator Info */
export interface CollaboratorInfoProps {
    headImg: string
    userName: string
}

// Plugin Base Info Component
export interface PluginModifyInfoProps {
    ref?: any
    /** Is Edit Mode */
    isEdit?: boolean
    /** Plugin Base Info */
    data?: PluginBaseParamProps
    /** Tags Change Callback */
    tagsCallback?: (v: string[]) => any
}
// Plugin Base Info ref Methods
export interface PluginInfoRefProps {
    onGetValue: () => PluginBaseParamProps
    onSubmit: () => Promise<PluginBaseParamProps | undefined>
}

// Plugin Config Info Component
export interface PluginModifySettingProps {
    ref?: any
    /** Different Type Control for Different Display Fields (e.g., Plugin Link Switch under yak type)) */
    type: string
    /** The essence of DNSLog and HTTP packet transformation is adding/decreasing tags */
    tags: string[]
    setTags: (arr: string[]) => any
    data?: PluginSettingParamProps
}
// Plugin Config Info ref Methods
export interface PluginSettingRefProps {
    onGetValue: () => PluginSettingParamProps
    onSubmit: () => Promise<PluginSettingParamProps | undefined>
}

export interface PluginEditorDiffProps {
    isDiff: boolean
    newCode: string
    oldCode?: string
    setCode: (value: string) => any
    language: string
    triggerUpdate?: boolean
}

/** ---------- Plugin List Related start ---------- */
/** Plugin Universal Filter Conditions */
export interface PluginFilterParams {
    /** Plugin Type */
    plugin_type?: API.PluginsSearchData[]
    /** Review Status */
    status?: API.PluginsSearchData[]
    /** Tags */
    tags?: API.PluginsSearchData[]
    /** Plugin Group */
    plugin_group?: API.PluginsSearchData[]
    /** Plugin Status (Public 0 /Private 1) */
    plugin_private?: API.PluginsSearchData[]
}
/** Plugin Search Conditions */
export interface PluginSearchParams {
    /** Keyword */
    keyword: string
    /** Username */
    userName: string
    /** Search Type */
    type: "keyword" | "userName"
    /**Time Type Search Default All, Today day, This Week week, This Month month, This Year year */
    time_search?: "day" | "week" | "month" | "year"
}
/** Plugin List Page Conditions */
export interface PluginListPageMeta {
    page: number
    limit: number
    order?: "asc" | "desc"
    order_by?: string
}
/** ---------- Plugin List Related end ---------- */

/**Item in Plugin Details List */
export interface PluginDetailsListItemProps<T> {
    /** Plugin Index in List */
    order: number
    plugin: T
    selectUUId: string
    check: boolean
    headImg: string
    pluginUUId: string
    pluginName: string
    help?: string
    content: string
    official: boolean
    pluginType: string
    /** @name Is Built-in */
    isCorePlugin: boolean
    optCheck: (data: T, value: boolean) => any
    extra?: (data: T) => ReactNode
    onPluginClick: (plugin: T, index: number) => void
    /**Is Selectable */
    enableCheck?: boolean
    /**Is Clickable */
    enableClick?: boolean
}

export interface PluginContributesListItemProps {
    /**Collaborator Avatar */
    contributesHeadImg: string
    /**Collaborator Name */
    contributesName: string
}
