import {YakScript} from "@/pages/invoker/schema"
import {
    CodeToInfoRequestProps,
    CodeToInfoResponseProps,
    PluginDataProps,
    YakParamProps,
    YakRiskInfoProps,
    localYakInfo
} from "../pluginsType"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {GetYakScriptByOnlineIDRequest} from "@/pages/yakitStore/YakitStorePage"
import {yakitNotify} from "@/utils/notification"
import {toolDelInvalidKV} from "@/utils/tool"
import {apiDownloadPluginMine} from "../utils"
import {YakExtraParamProps} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {Uint8ArrayToString} from "@/utils/str"

const {ipcRenderer} = window.require("electron")

/** -------------------- Data Structure Transformation Start -------------------- */
/**
 * @name Local Plugin Risk Data(YakRiskObj)-to-Online Plugin Risk Data(API.PluginsRiskDetail))
 */
export const convertLocalToRemoteRisks = (risks?: YakRiskInfoProps[]) => {
    const arr: API.PluginsRiskDetail[] = []
    const local = risks || []
    for (let item of local) {
        if (item.Level && item.CVE && item.TypeVerbose) {
            arr.push({
                level: item.Level,
                cve: item.CVE,
                typeVerbose: item.TypeVerbose,
                description: item.Description,
                solution: item.Solution
            })
        }
    }
    return arr
}
/**
 * @name Online Plugin Risk Data(API.PluginsRiskDetail)-to-Local Plugin Risk Data(YakRiskInfoProps))
 */
export const convertRemoteToLocalRisks = (risks?: API.PluginsRiskDetail[]) => {
    const arr: YakRiskInfoProps[] = []
    const local = risks || []
    for (let item of local) {
        if (item.level && item.cve && item.typeVerbose) {
            arr.push({
                Level: item.level,
                CVE: item.cve,
                TypeVerbose: item.typeVerbose,
                Description: item.description,
                Solution: item.solution
            })
        }
    }
    return arr
}

/**
 * @name Local Plugin Params(YakParamProps)-to-Online Plugin Params(API.YakitPluginParam))
 */
export const convertLocalToRemoteParams = (local: YakParamProps[]) => {
    return local.map((item) => {
        const obj: API.YakitPluginParam = {
            field: item.Field,
            field_verbose: item.FieldVerbose,
            required: item.Required,
            type_verbose: item.TypeVerbose,
            default_value: item.DefaultValue,
            extra_setting: item.ExtraSetting,
            help: item.Help,
            group: item.Group,
            method_type: item.MethodType || ""
        }
        return obj
    })
}
/**
 * @name Online Plugin Params(API.YakitPluginParam)-to-Local Plugin Params(YakParamProps))
 */
export const convertRemoteToLocalParams = (online: API.YakitPluginParam[]) => {
    return online.map((item) => {
        const obj: YakParamProps = {
            Field: item.field,
            FieldVerbose: item.field_verbose,
            Required: item.required,
            TypeVerbose: item.type_verbose,
            DefaultValue: item.default_value,
            ExtraSetting: item.extra_setting,
            Help: item.help,
            Group: item.group,
            MethodType: item.method_type || ""
        }
        return obj
    })
}

/**
 * @name Local Plugin Data Structure(YakScript)-to-Local Saved Plugin Structure(localYakInfo))
 * @param idModify Edit Mode
 */
export const convertLocalToLocalInfo = (
    isModify: boolean,
    data: {
        info?: YakScript
        modify: PluginDataProps
    }
) => {
    const {info, modify} = data
    // @ts-ignore
    let request: localYakInfo = {}
    if (isModify && info) {
        request = {
            Id: +info.Id || undefined,
            ScriptName: info.ScriptName,
            Content: info.Content,
            Type: info.Type,
            Help: info.Help,
            RiskInfo: info.RiskInfo,
            Tags: info.Tags,
            Params: info.Params,
            EnablePluginSelector: info.EnablePluginSelector,
            PluginSelectorTypes: info.PluginSelectorTypes,
            Level: info.Level,
            IsHistory: info.IsHistory,
            IsIgnore: info.IsIgnore,
            IsGeneralModule: info.IsGeneralModule,
            GeneralModuleVerbose: info.GeneralModuleVerbose,
            GeneralModuleKey: info.GeneralModuleKey,
            FromGit: info.FromGit,
            IsCorePlugin: info.IsCorePlugin
        }
    }

    // Update Editable Config Content
    request.ScriptName = modify.ScriptName
    request.Type = modify.Type
    request.Help = modify.Help
    request.RiskInfo = (modify.RiskDetail || []).filter((item) => item.CVE && item.TypeVerbose && item.Level)
    request.Tags = modify.Tags
    request.Params = modify.Params
    request.EnablePluginSelector = modify.EnablePluginSelector
    request.PluginSelectorTypes = modify.PluginSelectorTypes
    request.Content = modify.Content

    // Set RiskDetail to undefined if None
    if (request.RiskInfo.length === 0) {
        request.RiskInfo = undefined
    }
    // Set Params to undefined if None
    if ((request.Params || []).length === 0) {
        request.Params = undefined
    }

    return toolDelInvalidKV(request) as localYakInfo
}

/**
 * @name Local Plugin Data Structure(YakScript)-to-Submit Plugin Edit Structure(API.PluginsRequest))
 * @param idModify Edit Mode
 */
export const convertLocalToRemoteInfo = (
    isModify: boolean,
    data: {
        info?: YakScript
        modify: PluginDataProps
    }
) => {
    const {info, modify} = data
    // @ts-ignore
    let request: API.PluginsRequest = {}
    if (isModify && info) {
        request = {
            type: info.Type,
            script_name: info.ScriptName,
            help: info.Help,
            riskInfo: convertLocalToRemoteRisks(info.RiskInfo),
            tags: (info.Tags || "").split(",") || [],
            params: convertLocalToRemoteParams(info.Params || []),
            enable_plugin_selector: info.EnablePluginSelector,
            plugin_selector_types: info.PluginSelectorTypes,
            content: info.Content,

            is_general_module: info.IsGeneralModule,
            is_private: info.OnlineIsPrivate,
            group: info.OnlineGroup,
            isCorePlugin: info.IsCorePlugin
        }
    }

    // Update Editable Config Content
    request.script_name = modify.ScriptName
    request.type = modify.Type
    request.help = modify.Help
    request.riskInfo = convertLocalToRemoteRisks(modify.RiskDetail)
    request.tags = modify.Tags?.split(",") || []
    request.params = modify.Params ? convertLocalToRemoteParams(modify.Params) : undefined
    request.enable_plugin_selector = modify.EnablePluginSelector
    request.plugin_selector_types = modify.PluginSelectorTypes
    request.content = modify.Content

    // Set tags to undefined if None
    if (request.tags?.length === 0) request.tags = undefined
    // Clear Value When Group Is Empty String (Affects Backend Data Processing))
    if (!request.group) request.group = undefined
    // Set riskInfo to undefined if None
    if (request.riskInfo.length === 0) request.riskInfo = undefined

    return toolDelInvalidKV(request) as API.PluginsRequest
}

/**
 * @name Online Plugin Data Structure(API.PluginsDetail)-to-Submit Plugin Edit Structure(API.PluginsRequest))
 * @param idModify Online Plugin Details
 * @param modify Submit Plugin Edit Info
 */
export const convertRemoteToRemoteInfo = (info: API.PluginsDetail, modify?: PluginDataProps) => {
    // @ts-ignore
    const request: API.PluginsRequest = {
        ...info,
        tags: undefined,
        download_total: +info.downloaded_total || 0
    }
    try {
        request.tags = (info.tags || "").split(",") || []
    } catch (error) {}

    if (!!modify) {
        // Update Editable Config Content
        request.script_name = modify.ScriptName
        request.type = modify.Type
        request.help = modify.Help
        request.riskInfo = convertLocalToRemoteRisks(modify.RiskDetail)
        request.tags = modify.Tags?.split(",") || []
        request.params = modify.Params ? convertLocalToRemoteParams(modify.Params) : undefined
        request.enable_plugin_selector = modify.EnablePluginSelector
        request.plugin_selector_types = modify.PluginSelectorTypes
        request.content = modify.Content
    }

    // Set tags to undefined if None
    if (request.tags?.length === 0) request.tags = undefined
    // Clear Value When Group Is Empty String (Affects Backend Data Processing))
    if (!request.group) request.group = undefined
    // Set riskInfo to undefined if None
    if ((request.riskInfo || []).length === 0) request.riskInfo = undefined
    // Set params to undefined if None
    if ((request.params || []).length === 0) request.params = undefined

    return toolDelInvalidKV(request) as API.PluginsRequest
}
/** -------------------- Data Structure Transformation End -------------------- */

/** -------------------- Plugin Param Data Processing Tool Start -------------------- */
/**
 * @description Group Params by Name
 * @returns Returns Grouped Data
 */
export const ParamsToGroupByGroupName = (arr: YakParamProps[]): YakExtraParamProps[] => {
    let map = {}
    let paramsGroupList: YakExtraParamProps[] = []
    for (var i = 0; i < arr.length; i++) {
        var ai = arr[i]
        if (!map[ai.Group || "default"]) {
            paramsGroupList.push({
                group: ai.Group || "default",
                data: [ai]
            })
            map[ai.Group || "default"] = ai
        } else {
            for (var j = 0; j < paramsGroupList.length; j++) {
                var dj = paramsGroupList[j]
                if (dj.group === (ai.Group || "default")) {
                    dj.data.push(ai)
                    break
                }
            }
        }
    }
    return paramsGroupList || []
}

/**
 * @description Display Value in Form, Return Value by Type
 */
export const getValueByType = (defaultValue, type: string): number | string | boolean | string[] => {
    let value
    switch (type) {
        case "uint":
            value = parseInt(defaultValue || "0")
            break
        case "float":
            value = parseFloat(defaultValue || "0.0")
            break
        case "boolean":
            value = defaultValue === "true" || defaultValue === true
            break
        case "http-packet":
        case "yak":
            value = Buffer.from((defaultValue || "") as string, "utf8")
            break
        case "select":
            // Consider array for (defaultValue)
            if (Array.isArray(defaultValue)) {
                value = defaultValue.length > 0 ? defaultValue : []
            } else {
                const newVal = defaultValue ? defaultValue.split(",") : []
                value = newVal.length > 0 ? newVal : []
            }
            break
        default:
            value = defaultValue ? defaultValue : ""
            break
    }
    return value
}

/**
 * @description Process Final Execution Params
 * @param {{[string]:any}} object
 * @returns {YakExecutorParam[]}
 */
export const getYakExecutorParam = (object) => {
    let newValue: YakExecutorParam[] = []
    Object.entries(object).forEach(([key, val]) => {
        if (val instanceof Buffer) {
            newValue = [
                ...newValue,
                {
                    Key: key,
                    Value: Uint8ArrayToString(val)
                }
            ]
            return
        }
        if (val === true) {
            newValue = [
                ...newValue,
                {
                    Key: key,
                    Value: true
                }
            ]
            return
        }
        if (val === false || val === undefined) {
            return
        }
        newValue = [
            ...newValue,
            {
                Key: key,
                Value: val
            }
        ]
    })
    return newValue
}
/** -------------------- Plugin Param Data Processing Tool End -------------------- */

/**
 * @name Upload Plugin to Online-Overall Upload Logic
 * @param info Info for Online Upload
 * @param isModify Edit Operation
 */
export const uploadOnlinePlugin = (
    info: API.PluginsEditRequest,
    isModify: boolean,
    callback?: (plugin?: YakScript) => any
) => {
    // console.log("method:post|api:plugins", JSON.stringify(info))

    // Upload Plugin Online
    NetWorkApi<API.PluginsEditRequest, API.PluginsResponse>({
        method: "post",
        url: "plugins",
        data: info
    })
        .then((res) => {
            if (isModify) {
                // @ts-ignore
                if (callback) callback(true)
                return
            }
            // Download Plugin
            apiDownloadPluginMine({UUID: [res.uuid]})
                .then(() => {
                    // Refresh Plugin Menu
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    // Get Latest Local Plugin Info After Download
                    ipcRenderer
                        .invoke("GetYakScriptByOnlineID", {
                            OnlineID: res.id,
                            UUID: res.uuid
                        } as GetYakScriptByOnlineIDRequest)
                        .then((newSrcipt: YakScript) => {
                            if (callback) callback(newSrcipt)
                            yakitNotify("success", "Upload to Cloud Successful")
                        })
                        .catch((e) => {
                            // @ts-ignore
                            if (callback) callback(true)
                            yakitNotify("error", `Query Local Plugin Error:${e}`)
                        })
                })
                .catch((err) => {
                    // @ts-ignore
                    if (callback) callback(true)
                    yakitNotify("error", `Local Plugin Download Failed:${err}`)
                })
        })
        .catch((err) => {
            if (callback) callback()
            yakitNotify("error", "Plugin Upload Failed:" + err)
        })
}

/**
 * @name Copy Plugin-Overall Logic
 * @param info Copy Info Online
 */
export const copyOnlinePlugin = (info: API.CopyPluginsRequest, callback?: (plugin?: YakScript) => any) => {
    // console.log("method:post|api:copy/plugins", JSON.stringify(info))

    // Upload Plugin Online
    NetWorkApi<API.CopyPluginsRequest, API.PluginsResponse>({
        method: "post",
        url: "copy/plugins",
        data: info
    })
        .then((res) => {
            // Download Plugin
            apiDownloadPluginMine({UUID: [res.uuid]})
                .then(() => {
                    // Refresh Plugin Menu
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    // Get Latest Local Plugin Info After Download
                    ipcRenderer
                        .invoke("GetYakScriptByOnlineID", {
                            OnlineID: res.id,
                            UUID: res.uuid
                        } as GetYakScriptByOnlineIDRequest)
                        .then((newSrcipt: YakScript) => {
                            if (callback) callback(newSrcipt)
                            yakitNotify("success", "Copy Plugin Successful")
                        })
                        .catch((e) => {
                            // @ts-ignore
                            if (callback) callback(true)
                            yakitNotify("error", `Query Local Plugin Error:${e}`)
                        })
                })
                .catch((err) => {
                    // @ts-ignore
                    if (callback) callback(true)
                    yakitNotify("error", `Local Plugin Download Failed:${err}`)
                })
        })
        .catch((err) => {
            if (callback) callback()
            yakitNotify("error", "Copy Plugin Failed:" + err)
        })
}

/**
 * @name Get Params and Risk Info from Source
 * @param type Plugin Type
 * @param code Plugin Source Code
 */
export const onCodeToInfo: (type: string, code: string) => Promise<CodeToInfoResponseProps | null> = (type, code) => {
    return new Promise((resolve, reject) => {
        const request: CodeToInfoRequestProps = {
            YakScriptType: type,
            YakScriptCode: code
        }
        // console.log("onCodeToInfo-request", JSON.stringify(request))
        ipcRenderer
            .invoke("YaklangInspectInformation", request)
            .then((res: CodeToInfoResponseProps) => {
                // console.log("Extract Params and Risk Info from Source", res)
                resolve({
                    Information: res.Information || [],
                    CliParameter: res.CliParameter || [],
                    RiskInfo: res.RiskInfo || [],
                    Tags: res.Tags || []
                })
            })
            .catch((e: any) => {
                yakitNotify("error", "Extract Params and Risk Info from Source Failed: " + e)
                resolve(null)
            })
    })
}
