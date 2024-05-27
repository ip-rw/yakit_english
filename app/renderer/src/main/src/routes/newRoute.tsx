import React, {ReactNode, Suspense} from "react"
import {YakExecutor} from "../pages/invoker/YakExecutor"
import {ShellReceiverPage} from "../pages/shellReceiver/ShellReceiverPage"
import {PcapXDemo} from "@/components/playground/PcapXDemo"
import {DataCompare} from "../pages/compare/DataCompare"
import {HTTPHistory} from "../components/HTTPHistory"
import {PortAssetTable} from "../pages/assetViewer/PortAssetPage"
import {DomainAssetPage} from "../pages/assetViewer/DomainAssetPage"
import {RiskPage} from "../pages/risks/RiskPage"
import {DNSLogPage} from "../pages/dnslog/DNSLogPage"
import {ICMPSizeLoggerPage} from "../pages/icmpsizelog/ICMPSizeLoggerPage"
import {RandomPortLogPage} from "../pages/randomPortLog/RandomPortLogPage"
import {ReportViewerPage} from "../pages/assetViewer/ReportViewerPage"
import {StartFacadeServerParams} from "../pages/reverseServer/ReverseServer_New"
import {ReadOnlyBatchExecutorByRecoverUid} from "../pages/invoker/batch/ReadOnlyBatchExecutorByMenuItem"
import {WebsocketFuzzer} from "@/pages/websocket/WebsocketFuzzer"
import {JavaPayloadPage} from "@/pages/payloadGenerater/NewJavaPayloadPage"
import {NewReverseServerPage} from "@/pages/reverseServer/NewReverseServerPage"
import AccountAdminPage from "@/pages/loginOperationMenu/AccountAdminPage"
import RoleAdminPage from "@/pages/loginOperationMenu/RoleAdminPage"
import {HoleCollectPage} from "@/pages/loginOperationMenu/HoleCollectPage"
import LicenseAdminPage from "@/pages/loginOperationMenu/LicenseAdminPage"
import {TrustListPage} from "@/pages/loginOperationMenu/TrustListPage"
import {ChaosMakerPage} from "@/pages/chaosmaker/ChaosMaker"
import {ScreenRecorderPage} from "@/pages/screenRecorder/ScreenRecorderPage"
import {CVEViewer} from "@/pages/cve/CVEViewer"
import {PageLoading} from "./PageLoading"
import {
    PrivateOutlineBasicCrawlerIcon,
    PrivateOutlineBatchPluginIcon,
    PrivateOutlineBruteIcon,
    PrivateOutlineCVEIcon,
    PrivateOutlineCodecIcon,
    PrivateOutlineDNSLogIcon,
    PrivateOutlineDataCompareIcon,
    PrivateOutlineDefaultPluginIcon,
    PrivateOutlineDirectoryScanningIcon,
    PrivateOutlineDomainIcon,
    PrivateOutlineHTTPHistoryIcon,
    PrivateOutlineICMPSizeLogIcon,
    PrivateOutlineMitmIcon,
    PrivateOutlinePayloadGeneraterIcon,
    PrivateOutlinePluginLocalIcon,
    PrivateOutlinePluginOwnerIcon,
    PrivateOutlinePluginStoreIcon,
    PrivateOutlinePocIcon,
    PrivateOutlinePortsIcon,
    PrivateOutlineReportIcon,
    PrivateOutlineReverseServerIcon,
    PrivateOutlineRiskIcon,
    PrivateOutlineScanPortIcon,
    PrivateOutlineShellReceiverIcon,
    PrivateOutlineSpaceEngineIcon,
    PrivateOutlineSubDomainCollectionIcon,
    PrivateOutlineTCPPortLogIcon,
    PrivateOutlineWebFuzzerIcon,
    PrivateOutlineWebsocketFuzzerIcon,
    PrivateSolidBasicCrawlerIcon,
    PrivateSolidBatchPluginIcon,
    PrivateSolidBruteIcon,
    PrivateSolidCVEIcon,
    PrivateSolidCodecIcon,
    PrivateSolidDNSLogIcon,
    PrivateSolidDataCompareIcon,
    PrivateSolidDefaultPluginIcon,
    PrivateSolidDirectoryScanningIcon,
    PrivateSolidDomainIcon,
    PrivateSolidHTTPHistoryIcon,
    PrivateSolidICMPSizeLogIcon,
    PrivateSolidMitmIcon,
    PrivateSolidPayloadGeneraterIcon,
    PrivateSolidPluginLocalIcon,
    PrivateSolidPluginOwnerIcon,
    PrivateSolidPluginStoreIcon,
    PrivateSolidPocIcon,
    PrivateSolidPortsIcon,
    PrivateSolidReportIcon,
    PrivateSolidReverseServerIcon,
    PrivateSolidRiskIcon,
    PrivateSolidScanPortIcon,
    PrivateSolidShellReceiverIcon,
    PrivateSolidSpaceEngineIcon,
    PrivateSolidSubDomainCollectionIcon,
    PrivateSolidTCPPortLogIcon,
    PrivateSolidWebFuzzerIcon,
    PrivateSolidWebsocketFuzzerIcon
} from "./privateIcon"
import {ControlAdminPage} from "@/pages/dynamicControl/DynamicControl"
import {PluginDebuggerPage} from "@/pages/pluginDebugger/PluginDebuggerPage"
import {DebugMonacoEditorPage} from "@/pages/debugMonaco/DebugMonacoEditorPage"
import {VulinboxManager} from "@/pages/vulinbox/VulinboxManager"
import {DiagnoseNetworkPage} from "@/pages/diagnoseNetwork/DiagnoseNetworkPage"
import HTTPFuzzerPage, {AdvancedConfigShowProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {ErrorBoundary} from "react-error-boundary"
import {PageItemProps} from "@/pages/layout/mainOperatorContent/renderSubPage/RenderSubPageType"
import {WebShellViewer} from "@/pages/webShell/WebShellViewer"
import {WebShellDetail} from "@/pages/webShell/models"
import {WebShellDetailOpt} from "@/pages/webShell/WebShellDetailOpt"
import {
    FuzzerParamItem,
    AdvancedConfigValueProps
} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {HTTPResponseExtractor} from "@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {ConfigNetworkPage} from "@/components/configNetwork/ConfigNetworkPage"
import {PluginEditDetails} from "@/pages/plugins/editDetails/PluginEditDetails"
import {PluginManage} from "@/pages/plugins/manage/PluginManage"
import {PluginsLocal} from "@/pages/plugins/local/PluginsLocal"
import {PluginUser} from "@/pages/plugins/user/PluginUser"
import {PluginsOnline} from "@/pages/plugins/online/PluginsOnline"
import {PluginGroupType, PluginGroups} from "@/pages/plugins/group/PluginGroups"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {isCommunityEdition} from "@/utils/envfile"
import {NewPayload} from "@/pages/payloadManager/newPayload"
import {NewCodec} from "@/pages/codec/NewCodec"
import {DataStatistics} from "@/pages/dataStatistics/DataStatistics"
import {PluginBatchExecutor} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"
import {
    BrutePageInfoProps,
    PluginBatchExecutorPageInfoProps,
    PocPageInfoProps,
    ScanPortPageInfoProps,
    SimpleDetectPageInfoProps,
    SpaceEnginePageInfoProps
} from "@/store/pageInfo"
import {SpaceEnginePage} from "@/pages/spaceEngine/SpaceEnginePage"
import {SinglePluginExecution} from "@/pages/plugins/singlePluginExecution/SinglePluginExecution"
import {YakPoC} from "@/pages/securityTool/yakPoC/YakPoC"
import {NewPortScan} from "@/pages/securityTool/newPortScan/NewPortScan"
import {NewBrute} from "@/pages/securityTool/newBrute/NewBrute"
import {
    CommunityDeprecatedFirstMenu,
    CommunityDeprecatedSecondMenu,
    EnterpriseDeprecatedFirstMenu,
    EnterpriseDeprecatedSecondMenu
} from "./deprecatedMenu"
import {SimpleDetect} from "@/pages/simpleDetect/SimpleDetect"

const HTTPHacker = React.lazy(() => import("../pages/hacker/httpHacker"))
const NewHome = React.lazy(() => import("@/pages/newHome/NewHome"))
const WebFuzzerPage = React.lazy(() => import("@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage"))

/** Render All Pages Enum */
export enum YakitRoute {
    /** Homepage */
    NewHome = "new-home",
    /** Manual Penetration */
    HTTPHacker = "httpHacker",
    HTTPFuzzer = "httpFuzzer",
    WebsocketFuzzer = "websocket-fuzzer",
    Codec = "codec",
    DataCompare = "dataCompare",
    /** Basic Tools */
    Mod_ScanPort = "scan-port",
    PoC = "poc",
    Plugin_OP = "plugin-op",
    Mod_Brute = "brute",
    /** Plugin */
    Plugin_Store = "plugin-store",
    Plugin_Owner = "plugin-owner",
    Plugin_Local = "plugin-local",
    Plugin_Groups = "plugin-groups",
    BatchExecutorPage = "batch-executor-page-ex",
    /** Reverse Shell */
    DNSLog = "dnslog",
    ICMPSizeLog = "icmp-sizelog",
    TCPPortLog = "tcp-portlog",
    PayloadGenerater_New = "PayloadGenerater_New",
    ReverseServer_New = "ReverseServer_New",
    ShellReceiver = "shellReceiver",
    /** Database */
    DB_HTTPHistory = "db-http-request",
    DB_Report = "db-reports-results",
    DB_Risk = "db-risks",
    DB_Ports = "db-ports",
    DB_Domain = "db-domains",
    DB_CVE = "cve",
    /** Stand-alone Function Page */
    // Yak-Runner Page
    YakScript = "yakScript",
    // Payload Page
    PayloadManager = "payload-manager",
    // Private User Management
    AccountAdminPage = "account-admin-page",
    RoleAdminPage = "role-admin-page",
    HoleCollectPage = "hole-collect-page",
    LicenseAdminPage = "license-admin-page",
    // Public User Management
    TrustListPage = "trust-list-admin-page",
    PlugInAdminPage = "plug-in-admin-page",
    // Remote Mgmt
    ControlAdminPage = "control-admin-page",
    // Plugin Batch Incomplete Click Pop-up
    BatchExecutorRecover = "batch-executor-recover",
    // http-history Right-click Menu"Data Packet Scan"Generate Page
    PacketScanPage = "packet-scan-page",
    // New Plugin Page
    AddYakitScript = "add-yakit-script",
    // Edit Plugin Page
    ModifyYakitScript = "modify-yakit-script",
    /** Simple Exclusive */
    SimpleDetect = "simple-detect",
    // Screen Recorder Manager
    ScreenRecorderPage = "screen-recorder-page",
    // Global Features-Experimental-BAS Lab
    DB_ChaosMaker = "db-chaosmaker",
    // Debug Plugin Functions
    Beta_DebugPlugin = "beta-debug-plugin",
    // Debug Plugin Editor
    Beta_DebugTrafficAnalize = "**beta-debug-traffic-analize",
    // Debug Plugin Editor
    Beta_DebugMonacoEditor = "beta-debug-monaco-editor",
    // Practice Range Debugging
    Beta_VulinboxManager = "beta-vulinbox-manager",
    // Network Debugging
    Beta_DiagnoseNetwork = "beta-diagnose-network",
    // Configure Global
    Beta_ConfigNetwork = "beta-config-network",
    // Plugin Mgmt
    Plugin_Audit = "plugin-audit",
    // WebShell Management
    Beta_WebShellManager = "beta-webshell-manager",
    Beta_WebShellOpt = "beta-webshell-opt",
    // Data Stats
    Data_Statistics = "data_statistics",
    /**Space Engine */
    Space_Engine = "space-engine"
}
/**
 * @description Page Route Info
 * * label-Page Name
 * * describe(Optional)-Page Description
 */
export const YakitRouteToPageInfo: Record<YakitRoute, {label: string; describe?: string}> = {
    "new-home": {label: "Homepage"},
    httpHacker: {
        label: "MITM Interactive Hijacking",
        describe: "Install SSL/TLS Certificate, Hijack All Traffic, Manual/Passive Mode"
    },
    httpFuzzer: {
        label: "Web Fuzzer",
        describe: "Fuzz Testing Integration Repeater and Intruder"
    },
    "websocket-fuzzer": {label: "Websocket Fuzzer"},
    codec: {
        label: "Codec",
        describe: "Data Processing (Encrypt, Decrypt, Deserialization, Json, etc.), Plugin Custom Methods"
    },
    dataCompare: {label: "Data Comparison", describe: "Quick Diff Data"},
    "scan-port": {
        label: "Port/description: Fingerprint Scan",
        describe: "SYN, Fingerprint Detection, Plugin for IP/Domain"
    },
    poc: {label: "Special Vulnerability Detection", describe: "Custom POC for Specific Target Vulnerability Scanning"},
    "plugin-op": {label: "Plugin"},
    brute: {label: "Weak-password detection", describe: "Password Brute-force, Pre-auth Check"},
    "plugin-store": {label: "Plugin Store", describe: "Flexible Plugin Creation, Download from Store"},
    "plugin-owner": {label: "My Plugins"},
    "plugin-local": {label: "Local Plugins"},
    "plugin-groups": {label: "Plugin group management"},
    "batch-executor-page-ex": {label: "Batch execution", describe: "Select POCs for Bulk Vulnerability Scanning"},
    dnslog: {label: "DNSLog", describe: "Auto-generated Subdomain, IP Listing"},
    "icmp-sizelog": {label: "ICMP-SizeLog", describe: "Use ping with specific packet length to determine ICMP back connections"},
    "tcp-portlog": {label: "TCP-PortLog", describe: "Determine TCP back-connect using a closed random port"},
    PayloadGenerater_New: {label: "Yso-Java Hack", describe: "Config Serialize Payload/Malicious Class"},
    ReverseServer_New: {
        label: "Reverse Connect Server",
        describe: "Use protocol port multiplexing, achieve HTTP on a single port simultaneously / RMI / Reverse Connect over HTTPS and Other Protocols"
    },
    shellReceiver: {
        label: "Port Listener",
        describe: "Reverse Shell receiving tool, opens a port on the server for listening and interaction"
    },
    "db-http-request": {label: "History"},
    "db-reports-results": {label: "Reports"},
    "db-risks": {label: "Vulnerability"},
    "db-ports": {label: "Port"},
    "db-domains": {label: "Domain"},
    cve: {label: "CVE Management"},
    yakScript: {label: "Yak Runner", describe: "Yaklang Programming, Direct Engine Access POC Types"},
    "payload-manager": {
        label: "Payload",
        describe: "Custom Payload Upload/File Edit for Brute-force/Web Fuzzer"
    },
    "account-admin-page": {label: "User Mgmt"},
    "role-admin-page": {label: "Role Mgmt"},
    "hole-collect-page": {label: "Vulnerability Summary"},
    "license-admin-page": {label: "License Mgmt"},
    "trust-list-admin-page": {label: "User Mgmt"},
    "plug-in-admin-page": {label: "Plugin Permissions"},
    "control-admin-page": {label: "Remote Mgmt"},
    "batch-executor-recover": {label: "Continue Task: Batch Execute Plugins"},
    "packet-scan-page": {label: "Data Packet Scan"},
    "add-yakit-script": {label: "Create Plugin"},
    "modify-yakit-script": {label: "Edit Plugin"},
    "simple-detect": {label: "Security Detection"},
    "screen-recorder-page": {label: "Recording Mgmt"},
    "db-chaosmaker": {label: "BAS Labs"},
    "beta-debug-plugin": {label: "Plugin debugging"},
    "beta-debug-monaco-editor": {label: "Plugin Editor"},
    "beta-vulinbox-manager": {label: "Vulinbox Manager"},
    "beta-diagnose-network": {label: "Network Diagnostic"},
    "beta-config-network": {label: "Global Config"},
    "plugin-audit": {label: "Plugin Mgmt"},
    "**beta-debug-traffic-analize": {label: "Traffic Analysis"},
    "beta-webshell-manager": {label: "Website Mgmt"},
    "beta-webshell-opt": {label: "WebShell Example"},
    data_statistics: {label: "Data Stats"},
    "space-engine": {label: "Space Engine"}
}
/** Single-instance Page Route) */
export const SingletonPageRoute: YakitRoute[] = [
    YakitRoute.NewHome,
    YakitRoute.HTTPHacker,
    YakitRoute.Plugin_Store,
    YakitRoute.Plugin_Owner,
    YakitRoute.Plugin_Local,
    YakitRoute.Plugin_Groups,
    YakitRoute.DNSLog,
    YakitRoute.ICMPSizeLog,
    YakitRoute.TCPPortLog,
    YakitRoute.ShellReceiver,
    YakitRoute.DB_HTTPHistory,
    YakitRoute.DB_Report,
    YakitRoute.DB_Risk,
    YakitRoute.DB_Ports,
    YakitRoute.DB_Domain,
    YakitRoute.DB_CVE,
    YakitRoute.YakScript,
    YakitRoute.PayloadManager,
    YakitRoute.AccountAdminPage,
    YakitRoute.RoleAdminPage,
    YakitRoute.HoleCollectPage,
    YakitRoute.LicenseAdminPage,
    YakitRoute.TrustListPage,
    YakitRoute.AddYakitScript,
    YakitRoute.ModifyYakitScript,
    YakitRoute.DB_ChaosMaker,
    YakitRoute.ScreenRecorderPage,
    YakitRoute.ControlAdminPage,
    YakitRoute.Beta_VulinboxManager,
    YakitRoute.Beta_DiagnoseNetwork,
    YakitRoute.Beta_ConfigNetwork,
    YakitRoute.Beta_DebugTrafficAnalize,
    YakitRoute.Plugin_Audit,
    YakitRoute.Beta_WebShellManager,
    YakitRoute.Data_Statistics
]
/** Page Route Without Software Margin */
export const NoPaddingRoute: YakitRoute[] = [
    YakitRoute.PayloadGenerater_New,
    YakitRoute.ReverseServer_New,
    YakitRoute.DataCompare,
    YakitRoute.YakScript,
    YakitRoute.HTTPHacker,
    YakitRoute.Plugin_Store,
    YakitRoute.Plugin_Owner,
    YakitRoute.Plugin_Local,
    YakitRoute.Plugin_Groups,
    YakitRoute.ICMPSizeLog,
    YakitRoute.TCPPortLog,
    YakitRoute.DNSLog,
    YakitRoute.NewHome,
    YakitRoute.DB_CVE,
    YakitRoute.HTTPFuzzer,
    YakitRoute.DB_Ports,
    YakitRoute.Beta_DebugPlugin,
    YakitRoute.DB_HTTPHistory,
    YakitRoute.Plugin_Audit,
    YakitRoute.AddYakitScript,
    YakitRoute.ModifyYakitScript,
    YakitRoute.PayloadManager,
    YakitRoute.Data_Statistics,
    YakitRoute.BatchExecutorPage,
    YakitRoute.Codec,
    YakitRoute.Space_Engine,
    YakitRoute.Plugin_OP,
    YakitRoute.PoC,
    YakitRoute.Mod_ScanPort,
    YakitRoute.Mod_Brute,
    YakitRoute.SimpleDetect
]
/** No Scroll Page Route */
export const NoScrollRoutes: YakitRoute[] = [YakitRoute.HTTPHacker, YakitRoute.Mod_Brute, YakitRoute.YakScript]
/** Fixed Primary Tabs  */
export const defaultFixedTabs: YakitRoute[] = [YakitRoute.NewHome, YakitRoute.DB_HTTPHistory]
/** Close Pages on User Logout */
export const LogOutCloseRoutes: YakitRoute[] = [YakitRoute.Plugin_Audit, YakitRoute.Data_Statistics]

export interface ComponentParams {
    // Open New Page by Default
    openFlag?: boolean
    // Route.HTTPFuzzer Args---start
    isHttps?: boolean
    isGmTLS?: boolean
    request?: string
    system?: string
    advancedConfigValue?: AdvancedConfigValueProps
    advancedConfigShow?: AdvancedConfigShowProps | null
    // Route.HTTPFuzzer Args---end

    // order?: string
    /**@param id Unique Page ID HTTPFuzzer/SimpleDetect Mandatory */
    id?: string
    /**@param groupId Mandatory for HTTPFuzzer */
    groupId?: string
    /**@name webFuzzer Variable Args */
    params?: FuzzerParamItem[]
    /**@name webFuzzer Extractor Args */
    extractors?: HTTPResponseExtractor[]

    // Route.Mod_ScanPort Args
    scanportParams?: string

    // Route.Mod_Brute Args
    bruteParams?: string
    recoverUid?: string
    recoverBaseProgress?: number

    // Route.PacketScanPage Args
    packetScan_FlowIds?: number[]
    packetScan_Https?: boolean
    packetScan_HttpRequest?: Uint8Array
    packetScan_Keyword?: string

    // Share Initialization Args
    shareContent?: string

    // websocket fuzzer Related
    wsTls?: boolean
    wsRequest?: Uint8Array
    wsToServer?: Uint8Array

    // yakit Plugin Log Details Args
    YakScriptJournalDetailsId?: number
    // facade server Args
    facadeServerParams?: StartFacadeServerParams
    classGeneraterParams?: {[key: string]: any}
    classType?: string

    // Simple Enterprise Security Check
    recoverOnlineGroup?: string
    recoverTaskName?: string

    // Data Comparison
    leftData?: string
    rightData?: string

    // Plugin debugging
    generateYamlTemplate?: boolean
    YamlContent?: string
    scriptName?: string
    // Create Plugin
    moduleType?: string
    content?: string

    // Edit Plugin
    editPluginId?: number

    // Plugin Group Type
    pluginGroupType?: PluginGroupType

    // webshell info
    webshellInfo?: WebShellDetail
    /**Batch Execute Page Args */
    pluginBatchExecutorPageInfo?: PluginBatchExecutorPageInfoProps
    /**Special Vulnerability Page */
    pocPageInfo?: PocPageInfoProps
    /**Weak Password Page */
    brutePageInfo?: BrutePageInfoProps
    /**Port Scan Page */
    scanPortPageInfo?: ScanPortPageInfoProps
    /**Space Engine Page */
    spaceEnginePageInfo?: SpaceEnginePageInfoProps
    /**Simple Security Check Page */
    simpleDetectPageInfo?: SimpleDetectPageInfoProps
}

function withRouteToPage(WrappedComponent) {
    return function WithPage(props) {
        return (
            <ErrorBoundary
                FallbackComponent={({error, resetErrorBoundary}) => {
                    if (!error) {
                        return <div>Unknown Error</div>
                    }
                    return (
                        <div>
                            <p>Logical Crash, Please Retry！</p>
                            <pre>{error?.message}</pre>
                        </div>
                    )
                }}
            >
                <WrappedComponent {...props} />
            </ErrorBoundary>
        )
    }
}

export const RouteToPage: (props: PageItemProps) => ReactNode = (props) => {
    const {routeKey, yakScriptId, params} = props
    switch (routeKey) {
        case YakitRoute.NewHome:
            return <NewHome />
        case YakitRoute.HTTPHacker:
            return (
                <Suspense fallback={<PageLoading />}>
                    <HTTPHacker />
                </Suspense>
            )
        case YakitRoute.HTTPFuzzer:
            return (
                <Suspense fallback={<PageLoading />}>
                    <WebFuzzerPage defaultType='config' id={params?.id || ""}>
                        <HTTPFuzzerPage system={params?.system} id={params?.id || ""} />
                    </WebFuzzerPage>
                </Suspense>
            )
        case YakitRoute.WebsocketFuzzer:
            return <WebsocketFuzzer tls={params?.wsTls} request={params?.wsRequest} toServer={params?.wsToServer} />
        case YakitRoute.Codec:
            return <NewCodec id={params?.id || ""} />
        case YakitRoute.DataCompare:
            return <DataCompare leftData={params?.leftData} rightData={params?.rightData} />
        case YakitRoute.Mod_ScanPort:
            return <NewPortScan id={params?.id || ""} />
        case YakitRoute.PoC:
            return <YakPoC pageId={params?.id || ""} />
        case YakitRoute.Plugin_OP:
            if (!yakScriptId || !+yakScriptId) return <div />
            return <SinglePluginExecution yakScriptId={yakScriptId || 0} />
        case YakitRoute.Mod_Brute:
            return <NewBrute id={params?.id || ""} />
        case YakitRoute.Plugin_Store:
            // Community Plugin Store No Login, Enterprise Version/Simple Plugin Store Login Required
            return (
                <OnlineJudgment isJudgingLogin={!isCommunityEdition()}>
                    <PluginsOnline />
                </OnlineJudgment>
            )
        case YakitRoute.Plugin_Owner:
            return (
                <OnlineJudgment isJudgingLogin={true}>
                    <PluginUser />
                </OnlineJudgment>
            )
        case YakitRoute.Plugin_Local:
            return <PluginsLocal />
        case YakitRoute.Plugin_Groups:
            return <PluginGroups pluginGroupType={params?.pluginGroupType} />
        case YakitRoute.BatchExecutorPage:
            return <PluginBatchExecutor id={params?.id || ""} />
        case YakitRoute.DNSLog:
            return <DNSLogPage />
        case YakitRoute.ICMPSizeLog:
            return <ICMPSizeLoggerPage />
        case YakitRoute.TCPPortLog:
            return <RandomPortLogPage />
        case YakitRoute.PayloadGenerater_New:
            return <JavaPayloadPage />
        case YakitRoute.ReverseServer_New:
            return <NewReverseServerPage />
        case YakitRoute.ShellReceiver:
            return <ShellReceiverPage />
        case YakitRoute.DB_HTTPHistory:
            return <HTTPHistory pageType='History' />
        case YakitRoute.DB_Report:
            return <ReportViewerPage />
        case YakitRoute.DB_Risk:
            return <RiskPage />
        case YakitRoute.DB_Ports:
            return <PortAssetTable />
        case YakitRoute.DB_Domain:
            return <DomainAssetPage />
        case YakitRoute.DB_CVE:
            return <CVEViewer />
        case YakitRoute.YakScript:
            return <YakExecutor />
        case YakitRoute.PayloadManager:
            return <NewPayload />
        case YakitRoute.AccountAdminPage:
            return <AccountAdminPage />
        case YakitRoute.RoleAdminPage:
            return <RoleAdminPage />
        case YakitRoute.HoleCollectPage:
            return <HoleCollectPage />
        case YakitRoute.LicenseAdminPage:
            return <LicenseAdminPage />
        case YakitRoute.TrustListPage:
            return <TrustListPage />
        case YakitRoute.ControlAdminPage:
            return <ControlAdminPage />
        case YakitRoute.BatchExecutorRecover:
            return (
                <ReadOnlyBatchExecutorByRecoverUid
                    Uid={params?.recoverUid}
                    BaseProgress={params?.recoverBaseProgress}
                />
            )
        case YakitRoute.AddYakitScript:
            return <PluginEditDetails />
        case YakitRoute.ModifyYakitScript:
            return <PluginEditDetails id={params?.editPluginId} />
        case YakitRoute.SimpleDetect:
            return <SimpleDetect pageId={params?.id || ""} />
        case YakitRoute.ScreenRecorderPage:
            return <ScreenRecorderPage />
        case YakitRoute.DB_ChaosMaker:
            return <ChaosMakerPage />
        case YakitRoute.Beta_DebugPlugin:
            return (
                <PluginDebuggerPage
                    generateYamlTemplate={!!params?.generateYamlTemplate}
                    YamlContent={params?.YamlContent || ""}
                    scriptName={params?.scriptName || ""}
                />
            )
        case YakitRoute.Beta_DebugTrafficAnalize:
            return <PcapXDemo />
        case YakitRoute.Beta_DebugMonacoEditor:
            return <DebugMonacoEditorPage />
        case YakitRoute.Beta_VulinboxManager:
            return <VulinboxManager />
        case YakitRoute.Beta_DiagnoseNetwork:
            return <DiagnoseNetworkPage />
        case YakitRoute.Beta_ConfigNetwork:
            return <ConfigNetworkPage />
        case YakitRoute.Plugin_Audit:
            return (
                <OnlineJudgment isJudgingLogin={true}>
                    <PluginManage />
                </OnlineJudgment>
            )
        case YakitRoute.Beta_WebShellManager:
            return <WebShellViewer />
        case YakitRoute.Beta_WebShellOpt:
            return (
                <WebShellDetailOpt id={(params?.id || "") + ""} webshellInfo={params?.webshellInfo as WebShellDetail} />
            )
        case YakitRoute.Data_Statistics:
            return <DataStatistics />
        case YakitRoute.Space_Engine:
            return <SpaceEnginePage pageId={params?.id || ""} />
        default:
            return <div />
    }
}

export const RouteToPageItem = withRouteToPage(RouteToPage)

/** @name Plugin Name (Not Display Name) */
export enum ResidentPluginName {
    SubDomainCollection = "Subdomain Collection",
    BasicCrawler = "Basic Crawler",
    DirectoryScanning = "Comprehensive Directory Scan and Brute-force"
}

/** @name DB Primary Menu Item Attributes */
export interface DatabaseFirstMenuProps {
    /** @name Primary Menu Display Name */
    Group: string
    /** @name Secondary Menu Items Collection */
    Items: DatabaseSecondMenuProps[]
    /** @name Primary Menu Order */
    GroupSort: number
    /** @name Menu Mode */
    Mode: string
    /** @name Primary Menu Initial Value */
    GroupLabel: string
}
/** @name DB Secondary Menu Item Attributes */
export interface DatabaseSecondMenuProps {
    /** @name Plugin ID */
    YakScriptId: number
    /** @name Plugin Name */
    YakScriptName: string
    /** @name Plugin Avatar */
    HeadImg?: string
    /** @name Menu Mode */
    Mode: string
    /** @name Secondary Menu Order */
    VerboseSort: number
    /** @name Primary Menu Order */
    GroupSort: number
    /** @name Secondary Menu Route */
    Route: string
    /** @name Secondary Menu Display Name */
    Verbose: string
    /** @name Secondary Menu Initial Value */
    VerboseLabel: string
    /** @name Primary Menu Display Name */
    Group: string
    /** @name Primary Menu Initial Value */
    GroupLabel: string
}
/**
 * @name DB to Front-end Data Attribute
 * @param route Menu Route
 * @param label Menu Display Name
 * @param menuName Menu Code Name)
 * @param pluginId Plugin ID
 * @param pluginName Plugin Name
 * @param children Subsets
 */
export interface DatabaseMenuItemProps {
    route: YakitRoute | undefined
    label: string
    menuName: string
    pluginId: number
    pluginName: string
    HeadImg?: string
    children?: DatabaseMenuItemProps[]
}
/** @name DB Menu Data to Front-end Data */
export const databaseConvertData = (data: DatabaseFirstMenuProps[]) => {
    const menus: DatabaseMenuItemProps[] = []
    for (let item of data) {
        const menu: DatabaseMenuItemProps = {
            route: undefined,
            label: item.Group,
            menuName: item.GroupLabel || item.Group,
            pluginId: 0,
            pluginName: "",
            children: []
        }
        if (item.Items && item.Items.length > 0) {
            for (let subItem of item.Items) {
                const subMenu: DatabaseMenuItemProps = {
                    route: subItem.Route as YakitRoute,
                    label: subItem.Verbose,
                    menuName: subItem.VerboseLabel || subItem.YakScriptName || subItem.Verbose,
                    pluginId: +subItem.YakScriptId || 0,
                    pluginName: subItem.YakScriptName || "",
                    HeadImg: subItem.HeadImg || undefined
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

/** Public Menu Item Properties */
export interface PublicRouteMenuProps {
    page: YakitRoute | undefined
    label: string
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    children?: PublicRouteMenuProps[]
}
/**
 * @name Public Menu Config Data
 * @description Note! Used Only in Collapsed Menu, Adjust Expanded Menu in MenuMode Component
 */
export const PublicRouteMenu: PublicRouteMenuProps[] = [
    {
        page: undefined,
        label: "Penetration Testing",
        children: [
            {
                page: YakitRoute.HTTPHacker,
                ...YakitRouteToPageInfo[YakitRoute.HTTPHacker]
            },
            {
                page: undefined,
                label: "Fuzzer",
                children: [
                    {
                        page: YakitRoute.HTTPFuzzer,
                        ...YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]
                    },
                    {
                        page: YakitRoute.WebsocketFuzzer,
                        ...YakitRouteToPageInfo[YakitRoute.WebsocketFuzzer]
                    }
                ]
            },
            {page: YakitRoute.Codec, ...YakitRouteToPageInfo[YakitRoute.Codec]},
            {
                page: YakitRoute.DataCompare,
                ...YakitRouteToPageInfo[YakitRoute.DataCompare]
            }
        ]
    },
    {
        page: undefined,
        label: "Security Tools",
        children: [
            {
                page: YakitRoute.Mod_ScanPort,
                ...YakitRouteToPageInfo[YakitRoute.Mod_ScanPort]
            },
            {page: YakitRoute.PoC, ...YakitRouteToPageInfo[YakitRoute.PoC]},
            {page: YakitRoute.Plugin_OP, label: "Subdomain Collection", yakScripName: ResidentPluginName.SubDomainCollection},
            {
                page: YakitRoute.Plugin_OP,
                label: "Basic Crawler",
                yakScripName: ResidentPluginName.BasicCrawler,
                describe: "Rapidly Understand Site Structure via Crawling"
            },
            {page: YakitRoute.Space_Engine, ...YakitRouteToPageInfo[YakitRoute.Space_Engine]},
            {
                page: undefined,
                label: "Brute Force & Unauthorized Detection",
                children: [
                    {
                        page: YakitRoute.Mod_Brute,
                        ...YakitRouteToPageInfo[YakitRoute.Mod_Brute]
                    },
                    {
                        page: YakitRoute.Plugin_OP,
                        label: "Directory Scanning",
                        yakScripName: ResidentPluginName.DirectoryScanning,
                        describe: "Comprehensive Directory Scan & Brute-Force with Built-In Dictionary"
                    }
                ]
            }
        ]
    },
    {
        page: undefined,
        label: "Plugin",
        children: [
            {
                page: YakitRoute.Plugin_Store,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Store]
            },
            {
                page: YakitRoute.Plugin_Owner,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Owner]
            },
            {
                page: YakitRoute.Plugin_Local,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Local]
            },
            {
                page: YakitRoute.BatchExecutorPage,
                ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage]
            }
        ]
    },
    {
        page: undefined,
        label: "Reverse Shell",
        children: [
            {
                page: undefined,
                label: "Reverse Shell Trigger",
                children: [
                    {
                        page: YakitRoute.DNSLog,
                        ...YakitRouteToPageInfo[YakitRoute.DNSLog]
                    },
                    {
                        page: YakitRoute.ICMPSizeLog,
                        ...YakitRouteToPageInfo[YakitRoute.ICMPSizeLog]
                    },
                    {
                        page: YakitRoute.TCPPortLog,
                        ...YakitRouteToPageInfo[YakitRoute.TCPPortLog]
                    }
                ]
            },
            {
                page: undefined,
                label: "RevHack",
                children: [
                    {
                        page: YakitRoute.PayloadGenerater_New,
                        ...YakitRouteToPageInfo[YakitRoute.PayloadGenerater_New]
                    },
                    {
                        page: YakitRoute.ReverseServer_New,
                        ...YakitRouteToPageInfo[YakitRoute.ReverseServer_New]
                    }
                ]
            },
            {
                page: YakitRoute.ShellReceiver,
                ...YakitRouteToPageInfo[YakitRoute.ShellReceiver]
            }
        ]
    },
    {
        page: undefined,
        label: "Database",
        children: [
            {
                page: YakitRoute.DB_HTTPHistory,
                ...YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory]
            },
            {page: YakitRoute.DB_Report, ...YakitRouteToPageInfo[YakitRoute.DB_Report]},
            {page: YakitRoute.DB_Risk, ...YakitRouteToPageInfo[YakitRoute.DB_Risk]},
            {page: YakitRoute.DB_Ports, ...YakitRouteToPageInfo[YakitRoute.DB_Ports]},
            {page: YakitRoute.DB_Domain, ...YakitRouteToPageInfo[YakitRoute.DB_Domain]},
            {page: YakitRoute.DB_CVE, ...YakitRouteToPageInfo[YakitRoute.DB_CVE]}
        ]
    }
]
/**
 * @name Public Common Plugins List
 * @description Note! Saves Plugin Names
 */
export const PublicCommonPlugins: PublicRouteMenuProps[] = [
    {
        page: undefined,
        label: "Basic Tools",
        children: [
            "Web Login Username Password Brute-force",
            "Basic Crawler",
            "Dict Generator",
            "Headless Browser Click Crawling",
            "Comprehensive Directory Scan and Brute-force",
            "fuzztag Table Generation",
            "Deduplicate by Line"
        ].map((item) => {
            return {page: YakitRoute.Plugin_OP, label: item, yakScripName: item}
        })
    },
    {
        page: undefined,
        label: "Subdomain Collection",
        children: ["Subdomain Collect & Vuln Scan", "IP Batch Query", "Active Fingerprint Detection", "ICP Record Query", "Take a Peek"].map((item) => {
            return {page: YakitRoute.Plugin_OP, label: item, yakScripName: item}
        })
    }
]

/** Private Menu Item Properties */
export interface PrivateRouteMenuProps {
    page: YakitRoute | undefined
    label: string
    icon?: ReactNode
    hoverIcon?: JSX.Element
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    children?: PrivateRouteMenuProps[]
}
/** Default Plugin Menu Icon */
export const getFixedPluginIcon = (name: string) => {
    switch (name) {
        case "Basic Crawler":
            return <PrivateOutlineBasicCrawlerIcon />
        case "Subdomain Collection":
            return <PrivateOutlineSubDomainCollectionIcon />
        case "Comprehensive Directory Scan and Brute-force":
            return <PrivateOutlineDirectoryScanningIcon />
        default:
            return <PrivateOutlineDefaultPluginIcon />
    }
}
/** Default Plugin Menu hover-icon */
export const getFixedPluginHoverIcon = (name: string) => {
    switch (name) {
        case "Basic Crawler":
            return <PrivateSolidBasicCrawlerIcon />
        case "Subdomain Collection":
            return <PrivateSolidSubDomainCollectionIcon />
        case "Comprehensive Directory Scan and Brute-force":
            return <PrivateSolidDirectoryScanningIcon />
        default:
            return <PrivateSolidDefaultPluginIcon />
    }
}
/** Default Plugin Menu Describe */
export const getFixedPluginDescribe = (name: string) => {
    switch (name) {
        case "Basic Crawler":
            return "Rapidly Understand Site Structure via Crawling"
        case "Space Engine Integrated Version":
            return ""
        case "Subdomain Collection":
            return ""
        case "Comprehensive Directory Scan and Brute-force":
            return "Comprehensive Directory Scan & Brute-Force with Built-In Dictionary"
        default:
            return ""
    }
}

/**
 * @name Configurable and Displayable Menu Items
 * @description Main Use-Edit Menu System Function List
 */
export const PrivateAllMenus: Record<string, PrivateRouteMenuProps> = {
    [YakitRoute.HTTPHacker]: {
        page: YakitRoute.HTTPHacker,
        icon: <PrivateOutlineMitmIcon />,
        hoverIcon: <PrivateSolidMitmIcon />,
        ...YakitRouteToPageInfo[YakitRoute.HTTPHacker]
    },
    [YakitRoute.HTTPFuzzer]: {
        page: YakitRoute.HTTPFuzzer,
        icon: <PrivateOutlineWebFuzzerIcon />,
        hoverIcon: <PrivateSolidWebFuzzerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]
    },
    [YakitRoute.WebsocketFuzzer]: {
        page: YakitRoute.WebsocketFuzzer,
        icon: <PrivateOutlineWebsocketFuzzerIcon />,
        hoverIcon: <PrivateSolidWebsocketFuzzerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.WebsocketFuzzer]
    },
    [YakitRoute.Mod_Brute]: {
        page: YakitRoute.Mod_Brute,
        icon: <PrivateOutlineBruteIcon />,
        hoverIcon: <PrivateSolidBruteIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Mod_Brute]
    },
    [YakitRoute.Mod_ScanPort]: {
        page: YakitRoute.Mod_ScanPort,
        icon: <PrivateOutlineScanPortIcon />,
        hoverIcon: <PrivateSolidScanPortIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Mod_ScanPort]
    },
    [YakitRoute.PoC]: {
        page: YakitRoute.PoC,
        icon: <PrivateOutlinePocIcon />,
        hoverIcon: <PrivateSolidPocIcon />,
        ...YakitRouteToPageInfo[YakitRoute.PoC]
    },
    [YakitRoute.Plugin_Store]: {
        page: YakitRoute.Plugin_Store,
        icon: <PrivateOutlinePluginStoreIcon />,
        hoverIcon: <PrivateSolidPluginStoreIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Store]
    },
    [YakitRoute.Plugin_Owner]: {
        page: YakitRoute.Plugin_Owner,
        icon: <PrivateOutlinePluginOwnerIcon />,
        hoverIcon: <PrivateSolidPluginOwnerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Owner]
    },
    [YakitRoute.Plugin_Local]: {
        page: YakitRoute.Plugin_Local,
        icon: <PrivateOutlinePluginLocalIcon />,
        hoverIcon: <PrivateSolidPluginLocalIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Plugin_Local]
    },
    [YakitRoute.BatchExecutorPage]: {
        page: YakitRoute.BatchExecutorPage,
        icon: <PrivateOutlineBatchPluginIcon />,
        hoverIcon: <PrivateSolidBatchPluginIcon />,
        ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage]
    },
    [YakitRoute.ShellReceiver]: {
        page: YakitRoute.ShellReceiver,
        icon: <PrivateOutlineShellReceiverIcon />,
        hoverIcon: <PrivateSolidShellReceiverIcon />,
        ...YakitRouteToPageInfo[YakitRoute.ShellReceiver]
    },
    [YakitRoute.ReverseServer_New]: {
        page: YakitRoute.ReverseServer_New,
        icon: <PrivateOutlineReverseServerIcon />,
        hoverIcon: <PrivateSolidReverseServerIcon />,
        ...YakitRouteToPageInfo[YakitRoute.ReverseServer_New]
    },
    [YakitRoute.DNSLog]: {
        page: YakitRoute.DNSLog,
        icon: <PrivateOutlineDNSLogIcon />,
        hoverIcon: <PrivateSolidDNSLogIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DNSLog]
    },
    [YakitRoute.ICMPSizeLog]: {
        page: YakitRoute.ICMPSizeLog,
        icon: <PrivateOutlineICMPSizeLogIcon />,
        hoverIcon: <PrivateSolidICMPSizeLogIcon />,
        ...YakitRouteToPageInfo[YakitRoute.ICMPSizeLog]
    },
    [YakitRoute.TCPPortLog]: {
        page: YakitRoute.TCPPortLog,
        icon: <PrivateOutlineTCPPortLogIcon />,
        hoverIcon: <PrivateSolidTCPPortLogIcon />,
        ...YakitRouteToPageInfo[YakitRoute.TCPPortLog]
    },
    [YakitRoute.PayloadGenerater_New]: {
        page: YakitRoute.PayloadGenerater_New,
        icon: <PrivateOutlinePayloadGeneraterIcon />,
        hoverIcon: <PrivateSolidPayloadGeneraterIcon />,
        ...YakitRouteToPageInfo[YakitRoute.PayloadGenerater_New]
    },
    [YakitRoute.Codec]: {
        page: YakitRoute.Codec,
        icon: <PrivateOutlineCodecIcon />,
        hoverIcon: <PrivateSolidCodecIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Codec]
    },
    [YakitRoute.DataCompare]: {
        page: YakitRoute.DataCompare,
        icon: <PrivateOutlineDataCompareIcon />,
        hoverIcon: <PrivateSolidDataCompareIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DataCompare]
    },
    [YakitRoute.DB_Report]: {
        page: YakitRoute.DB_Report,
        icon: <PrivateOutlineReportIcon />,
        hoverIcon: <PrivateSolidReportIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Report]
    },
    [YakitRoute.DB_Ports]: {
        page: YakitRoute.DB_Ports,
        icon: <PrivateOutlinePortsIcon />,
        hoverIcon: <PrivateSolidPortsIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Ports]
    },
    [YakitRoute.DB_Risk]: {
        page: YakitRoute.DB_Risk,
        icon: <PrivateOutlineRiskIcon />,
        hoverIcon: <PrivateSolidRiskIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Risk]
    },
    [YakitRoute.DB_Domain]: {
        page: YakitRoute.DB_Domain,
        icon: <PrivateOutlineDomainIcon />,
        hoverIcon: <PrivateSolidDomainIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_Domain]
    },
    [YakitRoute.DB_HTTPHistory]: {
        page: YakitRoute.DB_HTTPHistory,
        icon: <PrivateOutlineHTTPHistoryIcon />,
        hoverIcon: <PrivateSolidHTTPHistoryIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory]
    },
    [YakitRoute.DB_CVE]: {
        page: YakitRoute.DB_CVE,
        icon: <PrivateOutlineCVEIcon />,
        hoverIcon: <PrivateSolidCVEIcon />,
        ...YakitRouteToPageInfo[YakitRoute.DB_CVE]
    },
    [YakitRoute.Space_Engine]: {
        page: YakitRoute.Space_Engine,
        icon: <PrivateOutlineSpaceEngineIcon />,
        hoverIcon: <PrivateSolidSpaceEngineIcon />,
        ...YakitRouteToPageInfo[YakitRoute.Space_Engine]
    }
}
// YakitRoute Array for Quick Page Array
const routeToChildren: (route: (YakitRoute | ResidentPluginName)[]) => PrivateRouteMenuProps[] = (route) => {
    const menus: PrivateRouteMenuProps[] = []
    for (let name of route) {
        if (PrivateAllMenus[name]) menus.push(PrivateAllMenus[name])
    }
    return menus
}
/**
 * @name Force Remove Invalid Primary Menu Items
 * @description Lost Primary Menu Items from Developer Iteration
 * @description Each Menu Item by '|' Split by Character
 */
export const InvalidFirstMenuItem = isCommunityEdition()
    ? CommunityDeprecatedFirstMenu.join("|")
    : EnterpriseDeprecatedFirstMenu.join("|")
/**
 * @name Force Remove Invalid Menu Items
 * @description Menu Data from Developer Iteration Lost Items
 * @description Each Menu Item by '|' Split by Character
 */
export const InvalidPageMenuItem = isCommunityEdition()
    ? CommunityDeprecatedSecondMenu.join("|")
    : EnterpriseDeprecatedSecondMenu.join("|")
/**
 * @name Private Expert Mode Menu Data
 * @description Edit Effective Only in Expert Mode
 */
export const PrivateExpertRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "Manual Penetration",
        children: routeToChildren([YakitRoute.HTTPHacker, YakitRoute.HTTPFuzzer, YakitRoute.WebsocketFuzzer])
    },
    {
        page: undefined,
        label: "Security Tools",
        children: [
            PrivateAllMenus[YakitRoute.Mod_Brute],
            {
                page: YakitRoute.Plugin_OP,
                label: "Basic Crawler",
                icon: getFixedPluginIcon(ResidentPluginName.BasicCrawler),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.BasicCrawler),
                describe: getFixedPluginDescribe(ResidentPluginName.BasicCrawler),
                yakScripName: ResidentPluginName.BasicCrawler
            },
            PrivateAllMenus[YakitRoute.Space_Engine],
            PrivateAllMenus[YakitRoute.Mod_ScanPort],
            {
                page: YakitRoute.Plugin_OP,
                label: "Subdomain Collection",
                icon: getFixedPluginIcon(ResidentPluginName.SubDomainCollection),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.SubDomainCollection),
                describe: getFixedPluginDescribe(ResidentPluginName.SubDomainCollection),
                yakScripName: ResidentPluginName.SubDomainCollection
            },
            {
                page: YakitRoute.Plugin_OP,
                label: "Directory Scanning",
                icon: getFixedPluginIcon(ResidentPluginName.DirectoryScanning),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.DirectoryScanning),
                describe: getFixedPluginDescribe(ResidentPluginName.DirectoryScanning),
                yakScripName: ResidentPluginName.DirectoryScanning
            }
        ]
    },
    {
        page: undefined,
        label: "Special Vulnerability Detection",
        children: routeToChildren([YakitRoute.PoC])
    },
    {
        page: undefined,
        label: "Plugin",
        children: routeToChildren([
            YakitRoute.Plugin_Store,
            YakitRoute.Plugin_Owner,
            YakitRoute.Plugin_Local,
            YakitRoute.BatchExecutorPage
        ])
    },
    {
        page: undefined,
        label: "Reverse Shell",
        children: routeToChildren([
            YakitRoute.ShellReceiver,
            YakitRoute.ReverseServer_New,
            YakitRoute.DNSLog,
            YakitRoute.ICMPSizeLog,
            YakitRoute.TCPPortLog,
            YakitRoute.PayloadGenerater_New
        ])
    },
    {
        page: undefined,
        label: "Data Processing",
        children: routeToChildren([YakitRoute.Codec, YakitRoute.DataCompare])
    },
    {
        page: undefined,
        label: "Database",
        children: routeToChildren([
            YakitRoute.DB_Report,
            YakitRoute.DB_Ports,
            YakitRoute.DB_Risk,
            YakitRoute.DB_Domain,
            YakitRoute.DB_HTTPHistory,
            YakitRoute.DB_CVE
        ])
    }
]
/**
 * @name Private Scanning Mode Menu Data
 * @description Edit Effective Only in Scanning Mode
 */
export const PrivateScanRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "Security Tools",
        children: [
            PrivateAllMenus[YakitRoute.Mod_Brute],
            {
                page: YakitRoute.Plugin_OP,
                label: "Basic Crawler",
                icon: getFixedPluginIcon(ResidentPluginName.BasicCrawler),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.BasicCrawler),
                describe: getFixedPluginDescribe(ResidentPluginName.BasicCrawler),
                yakScripName: ResidentPluginName.BasicCrawler
            },
            PrivateAllMenus[YakitRoute.Space_Engine],
            PrivateAllMenus[YakitRoute.Mod_ScanPort],
            {
                page: YakitRoute.Plugin_OP,
                label: "Subdomain Collection",
                icon: getFixedPluginIcon(ResidentPluginName.SubDomainCollection),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.SubDomainCollection),
                describe: getFixedPluginDescribe(ResidentPluginName.SubDomainCollection),
                yakScripName: ResidentPluginName.SubDomainCollection
            },
            {
                page: YakitRoute.Plugin_OP,
                label: "Directory Scanning",
                icon: getFixedPluginIcon(ResidentPluginName.DirectoryScanning),
                hoverIcon: getFixedPluginHoverIcon(ResidentPluginName.DirectoryScanning),
                describe: getFixedPluginDescribe(ResidentPluginName.DirectoryScanning),
                yakScripName: ResidentPluginName.DirectoryScanning
            }
        ]
    },
    {
        page: undefined,
        label: "Special Vulnerability Detection",
        children: routeToChildren([YakitRoute.PoC])
    },
    {
        page: undefined,
        label: "Plugin",
        children: routeToChildren([
            YakitRoute.Plugin_Store,
            YakitRoute.Plugin_Owner,
            YakitRoute.Plugin_Local,
            YakitRoute.BatchExecutorPage
        ])
    },
    {
        page: undefined,
        label: "Data Processing",
        children: routeToChildren([YakitRoute.Codec, YakitRoute.DataCompare])
    },
    {
        page: undefined,
        label: "Database",
        children: routeToChildren([
            YakitRoute.DB_Report,
            YakitRoute.DB_Ports,
            YakitRoute.DB_Risk,
            YakitRoute.DB_Domain,
            YakitRoute.DB_HTTPHistory,
            YakitRoute.DB_CVE
        ])
    }
]
/**
 * @name Private Simple Mode Menu Data
 * @description !Note Simple Mode No Menu Editing
 * @description Edit Effective Only in Simple Mode
 */
export const PrivateSimpleRouteMenu: PrivateRouteMenuProps[] = [
    {
        page: undefined,
        label: "Security Detection",
        children: [
            {
                page: YakitRoute.SimpleDetect,
                icon: <PrivateOutlinePocIcon />,
                hoverIcon: <PrivateSolidPocIcon />,
                ...YakitRouteToPageInfo[YakitRoute.SimpleDetect]
            }
        ]
    },
    {
        page: undefined,
        label: "Plugin",
        children: [
            {
                page: YakitRoute.Plugin_Store,
                icon: <PrivateOutlinePluginStoreIcon />,
                hoverIcon: <PrivateSolidPluginStoreIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Store]
            },
            {
                page: YakitRoute.Plugin_Owner,
                icon: <PrivateOutlinePluginOwnerIcon />,
                hoverIcon: <PrivateSolidPluginOwnerIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Owner]
            },
            {
                page: YakitRoute.Plugin_Local,
                icon: <PrivateOutlinePluginLocalIcon />,
                hoverIcon: <PrivateSolidPluginLocalIcon />,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Local]
            },
            {
                page: YakitRoute.BatchExecutorPage,
                icon: <PrivateOutlineBatchPluginIcon />,
                hoverIcon: <PrivateSolidBatchPluginIcon />,
                ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage]
            }
        ]
    },
    {
        page: undefined,
        label: "Database",
        children: [
            {
                page: YakitRoute.DB_Report,
                icon: <PrivateOutlineReportIcon />,
                hoverIcon: <PrivateSolidReportIcon />,
                ...YakitRouteToPageInfo[YakitRoute.DB_Report]
            },
            {
                page: YakitRoute.DB_Ports,
                icon: <PrivateOutlinePortsIcon />,
                hoverIcon: <PrivateSolidPortsIcon />,
                ...YakitRouteToPageInfo[YakitRoute.DB_Ports]
            },
            {
                page: YakitRoute.DB_Risk,
                icon: <PrivateOutlineRiskIcon />,
                hoverIcon: <PrivateSolidRiskIcon />,
                ...YakitRouteToPageInfo[YakitRoute.DB_Risk]
            }
        ]
    }
]
