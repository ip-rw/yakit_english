import {API} from "@/services/swagger/resposeType"

export interface FilterPanelGroupItem {
    /** Item Filter Key */
    groupKey: string
    /** Item Filter Display Name */
    groupName: string
    /** Single-Select Filter Action Button */
    groupExtraOptBtn?: React.ReactElement
    /** Item Filter - Filter List */
    data: {
        /** Option Display */
        label: string
        /** Option Value */
        value: string
        /** Option Count */
        count: number
    }[]
}

export interface FilterPanelProps {
    /** Outer Decorator Class */
    wrapperClassName?: string
    /** List Decorator Class */
    listClassName?: string
    /** Loading State */
    loading?: boolean
    /** Visible? */
    visible: boolean
    /** Set Visibility */
    setVisible: (show: boolean) => any
    /** Selected Data */
    selecteds: Record<string, API.PluginsSearchData[]>
    /** Selected Data Callback */
    onSelect: (value: Record<string, API.PluginsSearchData[]>) => any
    /** Data Display List */
    groupList: FilterPanelGroupItem[]
    /** Empty Data Tip */
    noDataHint?: string
}
