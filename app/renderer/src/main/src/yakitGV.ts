import {MITMConsts} from "@/pages/mitm/MITMConsts"
/** LocalFile Cache KV */
export enum LocalGV {
    /** @EngineStartMode CacheGet("local"|"remote") */
    YaklangEngineMode = "yaklang-engine-mode",
    /** @EngineStartConfig CacheGet */
    YaklangEnginePort = "yaklang-engine-port",
    /** @ConfirmCloseWnd */
    WindowsCloseFlag = "windows-close-flag",

    /** @AutoStart Version Check? */
    NoAutobootLatestVersionCheck = "no-autoboot-latest-version-check",

    /** @EngineAgreement Checked? */
    IsCheckedUserAgreement = "is-checked-user-agreement",

    /** @PreviewUpdate DialogCache */
    UpdateForwardAnnouncement = "update-forward-announcement",
    /** @PredictiveDialog ShowThreshold) */
    JudgeUpdateForwardAnnouncement = "v1.2.9-sp1"
}

/** EngineDB Cache KV */
export enum RemoteGV {
    /** @PrivateDomain Address */
    HttpSetting = "httpSetting",
    /** @Global Callback Address */
    GlobalBridgeAddr = "yak-bridge-addr",
    /** @Global Callback Key */
    GlobalBridgeSecret = "yak-bridge-secret",
    /** @Global DNS-Log Reuse? */
    GlobalDNSLogBridgeInherit = "yakit-DNSLOG_INHERIT_BRIDGE",
    /** @Global DNS-Log AOnly */
    GlobalDNSLogOnlyARecord = "dnslog-onlyARecord",
    /** @Global DNS-Log Address */
    GlobalDNSLogAddr = "yak-dnslog-addr",
    /** @Global DNS-Log Key */
    GlobalDNSLogSecret = "yak-dnslog-secret",
    /** @AuthToken (enterprise) */
    TokenOnlineEnterprise = "token-online-enterprise",
    /** @AuthToken */
    TokenOnline = "token-online",
    /** @ProjectDB Connection */
    LinkDatabase = "link-database",
    /** @GlobalStatus PollInterval */
    GlobalStateTimeInterval = "global-state-time-interval",
    /** @GlobalChrome Path */
    GlobalChromePath = "global-chrome-path",
    /** @MenuDisplay Mode */
    PatternMenu = "PatternMenu",
    /** @Show Engine Console?  */
    ShowBaseConsole = "SHOW_BASE_CONSOLE",

    /** @MenusAre JSON Imported? */
    IsImportJSONMenu = "is-import-json-menu",
    /** @UserDeleted Menus */
    UserDeleteMenu = "user-delete-menu",

    /** @Chat-CS Logs */
    ChatCSStorage = "chat-cs-storage",

    /** @WebFuzzerPage CacheFields */
    FuzzerCache = "fuzzer-list-cache",
    /** @WebFuzzer Seq CacheFields */
    FuzzerSequenceCache = "fuzzer_sequence_cache",
    /** @HistoryTabs */
    HistoryLeftTabs = "history_left_tabs",
    /** @TempProject RememberConfirm */
    TemporaryProjectNoPrompt = "temporary_project_no_prompt",
    /** @PluginGroup Deletion Confirm */
    PluginGroupDelNoPrompt = "plugin_group_del_no_prompt",
    /** @MITM Capture LeftTabs */
    MitmHijackedLeftTabs = "mitm_hijacked_left_tabs",
    /** @HistoryEdit ResponseBeautify&Render */
    HistoryResponseEditorBeautify = "history_response_editor_beautify",
    /** @HistoryEdit Request Beautify&Render */
    HistoryRequestEditorBeautify = "history_request_editor_beautify",
    /** @WebFuzzer Editor Beautify */
    WebFuzzerEditorBeautify = "webFuzzer_editor_beautify",
    /** @WebFuzzer Editor Beautify&Render */
    WebFuzzerOneResEditorBeautifyRender = "webFuzzer_one_res_editor_beautify_render",
    /**@Vulnerability Search Cache */
    PocPluginKeywords = "poc-plugin-keywords",
    /**@MITM UserData Save? */
    MITMUserDataSave = "mitm_user_data_save",
    /**@WebFuzzer AdvConfig Display/Hide */
    WebFuzzerAdvancedConfigShow = "web_fuzzer_advanced_config_show",
    /**@MITM Code HotSave */
    MITMHotPatchCodeSave = "mitm_hot_patch_code_save",
    /**@FuzzerSeq PageDisplay/Hide */
    FuzzerSequenceSettingShow = "fuzzer_sequence_setting_show",
    /**@WebFuzzer MaxResponse Limit */
    FuzzerResMaxNumLimit="fuzzer_res_max_limit"
}

/** GlobalLogic Vars */
export enum CodeGV {
    /** @OfficialWebsite Address */
    HomeWebsite = "https://www.yaklang.com",
    /** @RemoteConfig FilePath */
    RemoteLinkPath = "$HOME/yakit-projects/auth/yakit-remote.json",
    /** @HistoryVersions Download Page */
    HistoricalVersion = "https://github.com/yaklang/yakit/releases",
    /** @Public Menu Mode */
    PublicMenuModeValue = "public",
    /** @MenuState Cache */
    MenuExpand = "menu-expand",
    /** @PluginParam-HelpURL */
    PluginParamsHelp = "https://yaklang.com/products/Plugin-repository/plugins/plugin_create"
}

/**YakitAutoComplete + YakitSelect Cache&DfltVals */
export enum CacheDropDownGV {
    /** @MITM Proxy Host */
    MITMDefaultHostHistoryList = "mitm_default_host_history",
    /** @CVETable ProxySet */
    CVEProxyList = "cev_proxy_list",
    /** @PrivateDomain Address */
    ConfigBaseUrl = "config_base_url",
    /** @ConfigPluginSource - ProxySet */
    ConfigProxy = "config_proxy",
    /** @MITM UserData SavePath */
    MITMSaveUserDataDir = "mitm_save_user_data_dir",
    /** @MITM webFuzzer Proxy */
    WebFuzzerProxyList = "web_fuzzer_proxy_list",
    /** @WebFuzzer File Insert */
    WebFuzzerInsertFileFuzzTag = "web_fuzzer_insert_file_fuzz_tag"
}
