import {
    SolidYakitPluginIcon,
    SolidPluginYakMitmIcon,
    SolidPluginProtScanIcon,
    SolidSparklesPluginIcon,
    SolidDocumentSearchPluginIcon,
    SolidCollectionPluginIcon,
    SolidCloudpluginIcon,
    SolidPrivatepluginIcon
} from "@/assets/icon/colors"
import {ReactNode} from "react"
import {CodecPluginTemplate} from "../invoker/data/CodecPluginTemplate"
import {MITMPluginTemplate, PortScanPluginTemplate} from "../pluginDebugger/defaultData"
import {SolidFlagIcon, SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"
import {TypeSelectOpt} from "./funcTemplateType"
import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "./baseTemplateType"

export function GetPluginLanguage(type: string): string {
    return pluginTypeToName[type]?.language || type
}

/** Detailed Info for Plugin Type */
interface PluginTypeInfoProps {
    /** Plugin Type Name */
    name: string
    /** Plugin Type Description */
    description: string
    /** Plugin Type Icon */
    icon: ReactNode
    /** Plugin Display Color */
    color: string
    /** Default Source Code for Plugin Type */
    content: string
    /** Programming Language for Plugin Type */
    language: string
}

/** @Detailed Info for Plugin Type */
export const pluginTypeToName: Record<string, PluginTypeInfoProps> = {
    yak: {
        name: "Yak Native Plugin",
        description: "Features many common cyber security libraries for quick security tool scripting, this native module is manual call only",
        icon: <SolidYakitPluginIcon />,
        color: "warning",
        content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n",
        language: "yak"
    },
    mitm: {
        name: "Yak-MITM Module",
        description: "For MITM Module, to easily modify traffic with MITM plugins",
        icon: <SolidPluginYakMitmIcon />,
        color: "blue",
        content: MITMPluginTemplate,
        language: "yak"
    },
    "port-scan": {
        name: "Yak Port Scanning",
        description: "This plugin performs port scanning and processes the scan results for fingerprint recognition followed by Poc detection",
        icon: <SolidPluginProtScanIcon />,
        color: "success",
        content: PortScanPluginTemplate,
        language: "yak"
    },
    codec: {
        name: "Yak-Codec",
        description: "Yakit Codec Module for Custom Codec/Encryption",
        icon: <SolidSparklesPluginIcon />,
        color: "purple",
        content: CodecPluginTemplate,
        language: "yak"
    },
    lua: {
        name: "Lua Module",
        description: "Under Supervision, Unavailable",
        icon: <SolidDocumentSearchPluginIcon />,
        color: "bluePurple",
        content: "",
        language: "lua"
    },
    nuclei: {
        name: "Nuclei YamI Module",
        description: "Built a sandbox using YakVM that can execute Nuclei DSL seamlessly with Nuclei's own Yaml templates",
        icon: <SolidCollectionPluginIcon />,
        color: "cyan",
        content: "# Add your nuclei formatted PoC!",
        language: "yaml"
    }
}
/** @Type Selection - Script Type Info */
export const DefaultTypeList: {icon: ReactNode; name: string; description: string; key: string}[] = [
    {...pluginTypeToName["yak"], key: "yak"},
    {...pluginTypeToName["mitm"], key: "mitm"},
    {...pluginTypeToName["port-scan"], key: "port-scan"},
    {...pluginTypeToName["codec"], key: "codec"},
    {...pluginTypeToName["lua"], key: "lua"},
    {...pluginTypeToName["nuclei"], key: "nuclei"}
]

/** @Plugin Related - Local Cache Data - Key Value Variable */
export enum PluginGV {
    /**
     * @Plugin Deletion Reminder Toggle
     * @Applicable Page: My Plugins
     */
    UserPluginRemoveCheck = "user_plugin_remove_check",
    /**
     * @Plugin Deletion Reminder Toggle
     * @Applicable Page: Recycle Bin
     */
    RecyclePluginRemoveCheck = "recycle_plugin_remove_check",
    /**
     * @Plugin Deletion Reminder Toggle
     * @Applicable Page: Local Plugins
     */
    LocalPluginRemoveCheck = "local_plugin_remove_check",

    /** @Plugin Info - Yak Type Extra Params (for custom DNSLOG) Corresponding tag Value */
    PluginYakDNSLogSwitch = "custom-dnslog-platform",
    /** @Plugin Info - Codec Type Extra Params (for custom HTTP packet transformation) Corresponding tag Value */
    PluginCodecHttpSwitch = "allow-custom-http-packet-mutate",
    /** @Plugin Info - Codec Type Extra Params (for custom context menu execution) Corresponding tag Value */
    PluginCodecContextMenuExecuteSwitch = "allow-custom-context-menu-execute",

    /** @Audit Page Filter Sidebar Closed? */
    AuditFilterCloseStatus = "audit-filter-close-status",
    /** @Store Page Filter Sidebar Closed? */
    StoreFilterCloseStatus = "store-filter-close-status",
    /** @My Page Filter Sidebar Closed? */
    OwnerFilterCloseStatus = "owner-filter-close-status",
    /** @Local Page Filter Sidebar Closed? */
    LocalFilterCloseStatus = "local-filter-close-status",
    /**@Local Plugin Execution Module, Extra Params, [Request Path] Cache Field */
    LocalExecuteExtraPath = "local-execute-extra-path",
    /**@Plugin Batch Execution Module, Extra Params, [proxy] Cache Field */
    LocalBatchExecuteExtraProxy = "local-batch-execute-extra-proxy"
}

/** @Audit Status Display Name */
export const aduitStatusToName: Record<string, {name: string; icon: ReactNode}> = {
    "0": {name: "Pending Review", icon: <SolidFlagIcon className='aduit-status-flag-color' />},
    "1": {name: "Approved", icon: <SolidBadgecheckIcon className='aduit-status-badge-check-color' />},
    "2": {name: "Not Approved", icon: <SolidBanIcon className='aduit-status-ban-color' />}
}
/** @Audit Status Selection List */
export const DefaultStatusList: TypeSelectOpt[] = [
    {key: "0", ...aduitStatusToName["0"]},
    {key: "1", ...aduitStatusToName["1"]},
    {key: "2", ...aduitStatusToName["2"]}
]

/** @Public Status Display Info */
export const publicStatusToInfo: Record<string, {name: string; icon: ReactNode}> = {
    "1": {name: "Public", icon: <SolidCloudpluginIcon />},
    "2": {name: "Private", icon: <SolidPrivatepluginIcon />}
}
/** @Public Status Selection List */
export const DefaultPublicStatusList: TypeSelectOpt[] = [
    {key: "1", ...publicStatusToInfo["1"]},
    {key: "2", ...publicStatusToInfo["2"]}
]

/** Search Filter Display Name */
export const filterToName: Record<string, string> = {
    type: "Plugin Status",
    tags: "TAG",
    plugin_type: "Plugin type",
    status: "Audit Status",
    group: "Plugin Group"
}

export const defaultFilter: PluginFilterParams = {
    plugin_type: [],
    tags: [],
    plugin_group: []
}
export const defaultSearch: PluginSearchParams = {
    keyword: "",
    userName: "",
    type: "keyword"
}
export const defaultPagemeta: PluginListPageMeta = {page: 1, limit: 20}

export const funcSearchType: {value: string; label: string}[] = [
    {value: "userName", label: "By Author"},
    {value: "keyword", label: "Keyword"}
]
