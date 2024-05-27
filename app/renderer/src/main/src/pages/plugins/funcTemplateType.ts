import {ReactNode} from "react"
import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenuProp} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {DropDownProps} from "antd"
import {PluginFilterParams, PluginSearchParams} from "./baseTemplateType"
import {YakitPluginOnlineDetail} from "./online/PluginsOnlineType"
import {OnlinePluginAppAction} from "./pluginReducer"
import {API} from "@/services/swagger/resposeType"

export interface TypeSelectOpt {
    /** Unique Identifier */
    key: string
    /** Type Name */
    name: string
    /** Type Icon */
    icon?: ReactNode
}
export interface TypeSelectProps {
    /** Selected Types Array */
    active: TypeSelectOpt[]
    /** All Types List */
    list: TypeSelectOpt[]
    /** Set Selected Type */
    setActive: (value: TypeSelectOpt[]) => any
}

export interface FuncBtnProps extends YakitButtonProp {
    /** Button Display Name */
    name: string
    /** Icon Button Width Threshold */
    maxWidth?: number
}

export interface FuncSearchProps {
    /** Icon Button Width Threshold */
    maxWidth?: number
    /** Value */
    value?: PluginSearchParams
    /** */
    onChange: (v: PluginSearchParams) => void
    /** Search Callback */
    onSearch: (value: PluginSearchParams) => any
}

export interface FuncFilterPopoverProps {
    /** Icon Button Width Threshold */
    maxWidth?: number
    /** Display Icon */
    icon: ReactNode
    /** Display Name */
    name?: string
    /** Dropdown Props */
    menu: YakitMenuProp
    /** Popup Position */
    placement?: DropDownProps["placement"]
    /**Menu Disabled */
    disabled?: boolean
    /**Button Attributes */
    button?: YakitButtonProp
}

export interface PluginsListProps {
    /** Checkbox State */
    checked: boolean
    /** Set Checkbox */
    onCheck: (value: boolean) => any
    /** Plugin Display (List)|Grid) */
    isList: boolean
    /** Set Display (List)|Grid) */
    setIsList: (value: boolean) => any
    /** Total Plugins */
    total: number
    /** Selected Plugin Count */
    selected: number
    /** Search Conditions (selected items on left)) */
    filters: PluginFilterParams
    /** Remove Search Condition (selected tag)) */
    setFilters: (filters: PluginFilterParams) => void

    /** Table Header Extensions */
    extraHeader?: ReactNode
    children: ReactNode

    /** Visible */
    visible: boolean
    /** Set Visible */
    setVisible: (show: boolean) => any
}

export interface ListShowContainerProps<T> {
    /** Plugin Display (List)|Grid) */
    isList: boolean
    /** Plugin List Data */
    data: T[]
    /** Layout Key */
    keyName?: string
    /** Grid Item Component */
    gridNode: (info: {index: number; data: T}) => ReactNode
    /** Grid Row Height */
    gridHeight: number
    /** List Item Component */
    listNode: (info: {index: number; data: T}) => ReactNode
    /** List Row Height */
    listHeight: number
    /** List Loading */
    loading: boolean
    /** More Data to Load */
    hasMore: boolean
    /** Update List Data */
    updateList: (reset?: boolean) => any
    /**List/Grid ID */
    id?: string
    /**List className */
    listClassName?: string
    /**Grid className */
    gridClassName?: string
    /** Current Displayed Plugin Index */
    showIndex?: number
    /** Change Displayed Plugin Index */
    setShowIndex?: (i: number) => any
    /**No Search Results Visible */
    isShowSearchResultEmpty?: boolean
}

export interface ListListProps<T> {
    /** Plugin Display (List)|Grid) */
    isList: boolean
    /** Plugin List Data */
    data: T[]
    /** List Item Component */
    render: (info: {index: number; data: T}) => ReactNode
    /** List Layout - Item Component Key */
    keyName: string
    /** List Row Height */
    optHeight: number
    /** List Loading */
    loading: boolean
    /** More Data to Load */
    hasMore: boolean
    /** Update List Data */
    updateList: (reset?: boolean) => any
    /**List ID */
    id?: string
    /**List className */
    listClassName?: string
    /** Current Displayed Plugin Index */
    showIndex?: number
    /** Change Displayed Plugin Index */
    setShowIndex?: (i: number) => any
}
export interface ListLayoutOptProps {
    /** Plugin List Index */
    order: number
    /** Plugin Details */
    data: any
    /** Selected */
    checked: boolean
    /** Check Callback */
    onCheck: (data: any, value: boolean) => any
    /** Author Avatar */
    img: string
    /** Plugin Name */
    title: string
    /** Plugin Explanation */
    help: string
    /** Plugin Update Time */
    time: number
    /** Plugin Type */
    type: string
    /** Built-in Plugin */
    isCorePlugin: boolean
    /** Official Plugin */
    official: boolean
    /** Plugin Extension Nodes */
    subTitle?: (data: any) => ReactNode
    extraNode?: (data: any) => ReactNode
    /** Click Callback */
    onClick?: (data: any, index: number, value: boolean) => any
}

export interface GridListProps<T> {
    /** Plugin Display (List)|Grid) */
    isList: boolean
    /** Plugin List Data */
    data: T[]
    /** Grid Item Component */
    render: (info: {index: number; data: T}) => ReactNode
    /** Grid Layout - Item Key */
    keyName: string
    /** Grid Row Height */
    optHeight: number
    /** List Loading */
    loading: boolean
    /** More Data to Load */
    hasMore: boolean
    /** Update List Data */
    updateList: (reset?: boolean) => any
    /**Grid ID */
    id?: string
    /**Grid className */
    gridClassName?: string
    /** Current Displayed Plugin Index */
    showIndex?: number
    /** Change Displayed Plugin Index */
    setShowIndex?: (i: number) => any
}
export interface GridLayoutOptProps {
    /** Plugin List Index */
    order: number
    /** Plugin Details */
    data: any
    /** Selected */
    checked: boolean
    /** Check Callback */
    onCheck: (data: any, value: boolean) => any
    /** Plugin Name */
    title: string
    /** Plugin Type */
    type: string
    /** Plugin Tags */
    tags: string
    /** Plugin Explanation */
    help: string
    /** Author Avatar */
    img: string
    /** Plugin Author */
    user: string
    /** Contributor Avatar */
    prImgs?: string[]
    /** Plugin Update Time */
    time: number
    /** Built-in Plugin */
    isCorePlugin: boolean
    /** Official Plugin */
    official: boolean
    /** Plugin Extension Nodes */
    subTitle?: (data: any) => ReactNode
    extraFooter?: (data: any) => ReactNode
    /** Click Callback */
    onClick?: (data: any, index: number, value: boolean) => any
}

export interface TagsListShowProps {
    tags: string[]
}

type AuthorImgType = "official" | "yakit" | "mitm" | "port" | "sparkles" | "documentSearch" | "collection"
export interface AuthorImgProps {
    /** Image Diameter */
    size?: "middle" | "small" | "large"
    /** Image Src */
    src?: string
    /** Corner Built-in Icon */
    builtInIcon?: AuthorImgType
    /** Corner Icon Component */
    icon?: ReactNode
}
/**
 * @Extra Actions in Store
 * @property data
 * @Login Status
 * @Like Props
 * @Comment Props
 * @Download Props
 * @List Ops Dispatch
 */
export interface OnlineExtraOperateProps {
    data: YakitPluginOnlineDetail
    isLogin: boolean
    dispatch: React.Dispatch<OnlinePluginAppAction>
    likeProps: {
        active: boolean
        likeNumber: string
        onLikeClick?: (data: YakitPluginOnlineDetail) => void
    }
    commentProps: {
        commentNumber: string
        // onCommentClick: () => void
    }
    downloadProps: {
        downloadNumber: string
        onDownloadClick?: (data: YakitPluginOnlineDetail) => void
    }
}

export interface TagShowOpt {
    /** Group Identifier */
    tagType: string
    /** Name */
    label: string
    /** Value */
    value: string
}

/**
 * @property {YakitPluginOnlineDetail} data
 * @property {boolean} isLogin
 * @property {boolean} Plugin Removal Confirmation
 * @Delete Callback
 * @Delete Callback
 * @function onRemoveOrReductionBefore
 */
export interface OnlineRecycleExtraOperateProps {
    isLogin: boolean
    pluginRemoveCheck: boolean
    data: YakitPluginOnlineDetail
    onRemoveClick: (data: YakitPluginOnlineDetail) => void
    onReductionClick: (data: YakitPluginOnlineDetail) => void
    onRemoveOrReductionBefore: (data: YakitPluginOnlineDetail, type: "remove" | "reduction") => void
}

/** Detail Page - Filter Conditions */
export interface FilterPopoverBtnProps {
    /** Initial Filter Condition */
    defaultFilter: PluginFilterParams
    /** Search Callback */
    onFilter: (value: PluginFilterParams) => any
    /** Refresh Filter List */
    refresh?: boolean
    /** Filter Type - Store|Review|Mine */
    type?: "check" | "online" | "user" | "local"
    /**Fixed Filter, Skip Request if Set */
    fixFilterList?: API.PluginsSearch[]
}

/** Plugin Rating Module */
export interface CodeScoreModuleProps {
    /** Plugin Type */
    type: string
    /** Plugin Source */
    code: string
    /** Start Rating */
    isStart: boolean
    /** Post-Execution Success Callback Delay (default:1000)) */
    successWait?: number
    /** Passing Grade Notice (default): "（Good Performance, Start Uploading Plugin...）") */
    successHint?: string
    /** Passing Grade Notice (default): "（Upload Failed, Fix Before Reuploading）") */
    failedHint?: string
    /** Post-Execution Callback (true if pass)) */
    callback: (value: boolean) => any
}

/** Plugin Rating Popup */
export interface CodeScoreModalProps {
    /** Plugin Type */
    type: string
    /** Plugin Source */
    code: string
    visible: boolean
    /** Close Popup (true: Qualified)|Fail: Disqualified) */
    onCancel: (value: boolean) => any
}

/** Rating Return Info */
export interface CodeScoreSmokingEvaluateResponseProps {
    Score: number
    Results: CodeScoreSmokingEvaluateResultProps[]
}
/** Rating Results Detail */
export interface CodeScoreSmokingEvaluateResultProps {
    /**Frontend Loop Key */
    IdKey: string
    Item: string
    Suggestion: string
    ExtraInfo: Uint8Array
    Range: GRPCRange
    Severity: string
}
/** Source Location */
export interface GRPCRange {
    Code: string
    StartLine: number
    StartColumn: number
    EndLine: number
    EndColumn: number
}

/** Type Tags */
export interface PluginTypeTagProps {
    checked: boolean
    setCheck: () => any
    disabled: boolean
    icon: ReactNode
    name: string
    description: string
}

/** Source Zoom Editor */
export interface PluginEditorModalProps {
    /** Source Language */
    language?: string
    visible: boolean
    setVisible: (content: string) => any
    code: string
}

/** Compare Zoom Editor */
export interface PluginDiffEditorModalProps {
    /** Source Language */
    language?: string
    /** Original Code */
    oldCode: string
    /** Compare Code */
    newCode: string
    visible: boolean
    setVisible: (content: string) => any
}
