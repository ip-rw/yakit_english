import React, {memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Anchor, Form, Radio} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineAdjustmentsIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineChevronrightIcon,
    OutlineClouduploadIcon,
    OutlineCodeIcon,
    OutlineDocumentduplicateIcon,
    OutlineIdentificationIcon,
    OutlinePaperairplaneIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineViewgridIcon
} from "@/assets/icon/outline"
import {
    PluginBaseParamProps,
    PluginDataProps,
    PluginSettingParamProps,
    YakParamProps,
    localYakInfo
} from "../pluginsType"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {success, yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CodeScoreModal, FuncBtn, PluginTypeTag} from "../funcTemplate"
import {YakScript} from "@/pages/invoker/schema"
import {
    ParamsToGroupByGroupName,
    convertLocalToLocalInfo,
    convertLocalToRemoteInfo,
    copyOnlinePlugin,
    getValueByType,
    onCodeToInfo,
    uploadOnlinePlugin
} from "./utils"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {PluginModifyInfo, PluginModifySetting} from "../baseTemplate"
import emiter from "@/utils/eventBus/eventBus"
import {toolDelInvalidKV} from "@/utils/tool"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {YakitRoute} from "@/routes/newRoute"
import {DefaultTypeList, GetPluginLanguage, PluginGV, pluginTypeToName} from "../builtInData"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {getRemoteValue} from "@/utils/kv"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {SolidEyeIcon, SolidEyeoffIcon, SolidStoreIcon} from "@/assets/icon/solid"
import {PluginDebug} from "../pluginDebug/PluginDebug"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitWindow} from "@/components/yakitUI/YakitWindow/YakitWindow"
import {
    ExecuteEnterNodeByPluginParams,
    FormContentItemByType
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {CustomPluginExecuteFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"

import "../plugins.scss"
import styles from "./pluginEditDetails.module.scss"
import classNames from "classnames"

const {Link} = Anchor
const {YakitPanel} = YakitCollapse

const {ipcRenderer} = window.require("electron")

interface PluginEditDetailsProps {
    id?: number
}

/** New|Signal After Successful Plugin Edit */
export interface SavePluginInfoSignalProps {
    route: YakitRoute
    isOnline: boolean
    pluginName: string
}

export const PluginEditDetails: React.FC<PluginEditDetailsProps> = (props) => {
    const {id: pluginId} = props

    const [loading, setLoading] = useState<boolean>(false)
    // Old Data on Edition
    const [info, setInfo] = useState<YakScript>()

    /** --------------- Old Params Migration Warning Start --------------- */
    const [oldShow, setOldShow] = useState<boolean>(false)
    const oldParamsRef = useRef<string>("")
    const [copyLoading, setCopyLoading] = useState<boolean>(false)
    // Check Plugin for Old Data Migration Warning
    const fetchOldData = useMemoizedFn((name: string) => {
        oldParamsRef.current = ""

        ipcRenderer
            .invoke("YaklangGetCliCodeFromDatabase", {ScriptName: name})
            .then((res: {Code: string; NeedHandle: boolean}) => {
                // console.log("Old Data Warning Dialog?", res)
                if (res.NeedHandle && !oldShow) {
                    oldParamsRef.current = res.Code
                    if (!oldShow) setOldShow(true)
                }
            })
            .catch((e: any) => {
                yakitNotify("error", "Old Data Migration Query Failed: " + e)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })
    const onOldDataOk = useMemoizedFn(() => {
        if (!copyLoading) setCopyLoading(true)
        ipcRenderer.invoke("set-copy-clipboard", oldParamsRef.current)
        setTimeout(() => {
            onOldDataCancel()
            success("Copy Success")
            setCopyLoading(false)
        }, 500)
    })
    const onOldDataCancel = useMemoizedFn(() => {
        if (oldShow) setOldShow(false)
    })
    /** --------------- Old Params Migration Warning End --------------- */
    // Dedupe Array
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    /** Fetch Old Data by ID */
    const fetchPluginInfo = useMemoizedFn((id: number) => {
        ipcRenderer
            .invoke("GetYakScriptById", {Id: id})
            .then(async (res: YakScript) => {
                // console.log("Edit Plugin - Fetch Info", res)
                if (res.Type === "yak") fetchOldData(res.ScriptName)
                let newTags = !res.Tags || res.Tags === "null" ? [] : (res.Tags || "").split(",")
                setInfo(res)
                setPluginType(res.Type || "yak")
                const codeInfo =
                    GetPluginLanguage(res.Type || "yak") === "yak"
                        ? await onCodeToInfo(res.Type || "yak", res.Content)
                        : null
                if (codeInfo && codeInfo.Tags.length > 0) {
                    // Deduplicate
                    newTags = filter([...newTags, ...codeInfo.Tags])
                }
                setInfoParams({
                    ScriptName: res.ScriptName,
                    Help: res.Help || res.ScriptName,
                    RiskDetail: Array.isArray(res.RiskInfo) ? res.RiskInfo : [],
                    Tags: newTags
                })
                setCacheTags(newTags)
                setSettingParams({
                    EnablePluginSelector: res.EnablePluginSelector,
                    PluginSelectorTypes: res.PluginSelectorTypes,
                    Content: res.Content
                })
                setCode(res.Content)
                // Edit Plugin Page - Show Section 2 by Default
                setTimeout(() => {
                    if (res.Type !== "yak") {
                        setLoading(false)
                    }
                    setPath("setting")
                    document.querySelector("#plugin-details-setting")?.scrollIntoView(true)
                }, 500)
            })
            .catch((e: any) => {
                yakitNotify("error", "Fetch Plugin Info Failed:" + e)
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    useEffect(() => {
        if (pluginId) {
            setLoading(true)
            fetchPluginInfo(pluginId)
        }
    }, [pluginId])

    const privateDomain = useRef<string>("")
    // Fetch Private Domain Address
    const fetchPrivateDomain = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((value: string) => {
            if (value) {
                try {
                    privateDomain.current = JSON.parse(value)?.BaseUrl
                } catch (error) {}
            }
        })
    })

    const {userInfo} = useStore()
    useEffect(() => {
        fetchPrivateDomain()
    }, [userInfo])

    /** ---------- Variable & Button Display Logic Block Start ---------- */
    /** Purely Local Plugin (Not Synced)) */
    const isPureLocal = useMemo(() => {
        if (!pluginId) return true
        if (!info) return true

        if (!info.OnlineBaseUrl) return true
        else return false
    }, [pluginId, info])
    /** Private Domain Plugin? */
    const isSameBaseUrl = useMemo(() => {
        if (!pluginId) return true
        if (!info) return true
        if (!info.OnlineBaseUrl) return true

        if (info.OnlineBaseUrl === privateDomain.current) return true
        else return false
    }, [pluginId, info, privateDomain.current])
    /** Is Plugin Owned? */
    const isUser = useMemo(() => {
        return +(info?.UserId || 0) === userInfo.user_id
    }, [info, userInfo])
    /** Edit Page Flag */
    const isModify = useMemo(() => {
        if (!pluginId) return false
        if (!info) return false
        else return true
    }, [pluginId, info])

    // Show Copy Button?
    const showCopyBtn = useMemo(() => {
        // Create Hide
        if (!isModify) return false
        // Local Plugin Hide
        if (isPureLocal) return false
        // Non-Private Domain Hide
        if (!isSameBaseUrl) return false
        // Hide from Same Author
        if (isUser) return false
        return true
    }, [isModify, isPureLocal, isSameBaseUrl, isUser])
    // Show Submit Button?
    const showSubmitBtn = useMemo(() => {
        // Create Hide
        if (!isModify) return false
        // Local Plugin Hide
        if (isPureLocal) return false
        // Non-Private Domain Hide
        if (!isSameBaseUrl) return false
        return true
    }, [isModify, isPureLocal, isSameBaseUrl])
    // Show Sync Button?
    const showSyncBtn = useMemo(() => {
        // Create Display
        if (!isModify) return true
        // Local Plugin Display
        if (isPureLocal) return true
        // Non-Private Domain Display
        if (!isSameBaseUrl) return true
        return false
    }, [isModify, isPureLocal, isSameBaseUrl])
    /** ---------- Variable & Button Display Logic Block Start ---------- */

    /** ---------- Visibility Data Operation Block Start ---------- */
    // Stepwise Page Display Logic
    const [path, setPath] = useState<"type" | "info" | "setting">("type")
    const bodyRef = useRef<HTMLDivElement>(null)
    // Switch Info Block Event
    const onViewChange = useMemoizedFn((value: string) => {
        switch (value) {
            case "#plugin-details-info":
                setPath("info")
                return
            case "#plugin-details-setting":
                setPath("setting")
                return

            default:
                setPath("type")
                return
        }
    })

    // Plugin Type Logic
    // Plugin type
    const [pluginType, setPluginType] = useState<string>("yak")
    const fetchPluginType = useMemoizedFn(() => {
        return pluginType
    })
    const onType = useMemoizedFn((value: string) => {
        if (pluginType === value) return

        // Type-based Base & Config Reset
        let infoData: PluginBaseParamProps = {...(fetchInfoData() || getInfoParams())}

        // On Script Type Change, Remove DNSLog & HTTP Packet Switch Tags
        infoData = {
            ...infoData,
            Tags: infoData.Tags?.filter((item) => {
                return item !== PluginGV.PluginYakDNSLogSwitch && item !== PluginGV.PluginCodecHttpSwitch
            })
        }

        setPluginType(value)
        // Type-specific Default Source
        setCode(pluginTypeToName[value]?.content || "")
        setInfoParams({...infoData})
        setSettingParams({Content: ""})
    })
    // Plugin Basic Info Logic
    const infoRef = useRef<PluginInfoRefProps>(null)
    const [infoParams, setInfoParams, getInfoParams] = useGetState<PluginBaseParamProps>({
        ScriptName: ""
    })
    // Fetch Data Inside Base Info Component (No Validation))
    const fetchInfoData = useMemoizedFn(() => {
        if (infoRef.current) {
            return infoRef.current.onGetValue()
        }
        return undefined
    })
    const [cacheTags, setCacheTags] = useState<string[]>()
    // Remove Certain Tags Triggering DNSLog & HTTP Packet Switch Change
    const onTagsCallback = useMemoizedFn((v: string[]) => {
        setCacheTags(v || [])
    })
    // DNSLog & HTTP Packet Switch Change Affects Tag Add/Remove
    const onSwitchToTags = useMemoizedFn((value: string[]) => {
        setInfoParams({
            ...(fetchInfoData() || getInfoParams()),
            Tags: value
        })
        setCacheTags(value)
    })

    // Plugin Config Logic
    const settingRef = useRef<PluginSettingRefProps>(null)
    const [settingParams, setSettingParams] = useState<PluginSettingParamProps>({
        Content: ""
    })
    // Plugin Source - Related Logic Knight
    const [code, setCode] = useState<string>(pluginTypeToName["yak"]?.content || "")
    // Fullscreen Source Box
    const [codeModal, setCodeModal] = useState<boolean>(false)
    const onOpenCodeModal = useMemoizedFn(() => {
        if (codeModal) return
        setCodeModal(true)
        if (previewParamsShow) setPreviewParamsShow(false)
    })
    const onModifyCode = useMemoizedFn((content: string) => {
        if (code !== content) setCode(content)
        setCodeModal(false)
    })
    // Fullscreen Source - Preview to Debug
    const onCodeModalToDegbug = useMemoizedFn((params: YakParamProps[], code: string) => {
        const baseInfo: PluginBaseParamProps = fetchInfoData() || getInfoParams()
        const info: PluginDataProps = {
            ScriptName: baseInfo.ScriptName,
            Type: pluginType,
            Params: params,
            Content: code
        }
        setDebugPlugin({...info})
        onModifyCode(code)
        setDebugShow(true)
    })
    /** ---------- Visibility Data Operation Block End ---------- */

    /** --------------- Preview Params Logic Start --------------- */
    const [previewParams, setPreviewParams] = useState<YakParamProps[]>([])
    const [previewParamsShow, setPreviewParamsShow, getPreviewParamsShow] = useGetState<boolean>(false)

    /** Preview Box Content Update After Code Change */
    useDebounceEffect(
        () => {
            if (!getPreviewParamsShow()) return
            else {
                onCodeToInfo(fetchPluginType(), code)
                    .then((value) => {
                        if (value) setPreviewParams(value.CliParameter)
                    })
                    .catch(() => {})
            }
        },
        [code],
        {wait: 500}
    )
    const onOpenPreviewParams = useMemoizedFn(async () => {
        const info = await onCodeToInfo(fetchPluginType(), code)
        if (!info) return
        setPreviewParams(info.CliParameter)
        if (!previewParamsShow) setPreviewParamsShow(true)
    })

    const paramsForm = useRef<PreviewParamsRefProps>()
    const [previewCloseLoading, setPreviewCloseLoading] = useState<boolean>(false)
    // Go Debug
    const onPreviewToDebug = useMemoizedFn(() => {
        if (previewCloseLoading) return
        setPreviewCloseLoading(true)

        if (paramsForm && paramsForm.current) {
            const formValue: Record<string, any> = paramsForm.current?.onGetValue() || {}
            let paramsList: YakParamProps[] = []
            for (let el of previewParams) {
                paramsList.push({
                    ...el,
                    Value: formValue[el.Field]
                })
            }
            const baseInfo: PluginBaseParamProps = fetchInfoData() || getInfoParams()
            const info: PluginDataProps = {
                ScriptName: baseInfo.ScriptName,
                Type: pluginType,
                Params: paramsList,
                Content: code
            }

            setDebugPlugin({...info})
            onCancelPreviewParams()
            setDebugShow(true)
        }
        setTimeout(() => {
            setPreviewCloseLoading(false)
        }, 200)
    })
    // Preview End
    const onCancelPreviewParams = useMemoizedFn(() => {
        if (previewParamsShow) {
            if (paramsForm && paramsForm.current) paramsForm.current.onReset()
            setPreviewParamsShow(false)
        }
    })
    /** --------------- Preview Params Logic End --------------- */

    // Fetch All Plugin Configs
    const convertPluginInfo = useMemoizedFn(async () => {
        if (!pluginType) {
            yakitNotify("error", "Select Script Sty]")
            return
        }

        const data: PluginDataProps = {
            ScriptName: "",
            Type: pluginType,
            Content: code
        }

        if (!infoRef.current) {
            yakitNotify("error", "Failed to Fetch Base Info, Retry")
            return
        }
        const info = await infoRef.current.onSubmit()
        if (!info) {
            document.querySelector("#plugin-details-info")?.scrollIntoView(true)
            return
        } else {
            data.ScriptName = info?.ScriptName || ""
            data.Help = info?.Help
            data.Tags = (info?.Tags || []).join(",") || undefined
        }

        if (!settingRef.current) {
            yakitNotify("error", "Failed to Fetch Config Info, Retry")
            return
        }
        const setting = await settingRef.current.onSubmit()
        if (!setting) {
            document.querySelector("#plugin-details-settingRef")?.scrollIntoView(true)
            return
        } else {
            data.EnablePluginSelector = setting?.EnablePluginSelector
            data.PluginSelectorTypes = setting?.PluginSelectorTypes
        }

        const codeInfo = GetPluginLanguage(data.Type) === "yak" ? await onCodeToInfo(data.Type, data.Content) : null
        let newTags = data.Tags || ""
        if (codeInfo && codeInfo.Tags.length > 0) {
            newTags += `,${codeInfo.Tags.join(",")}`
            // Deduplicate
            newTags = filter(newTags.split(",")).join(",")
        }
        data.Tags = newTags
        // yak Types Parse Params and Risks
        if (data.Type === "yak" && codeInfo) {
            data.RiskDetail = codeInfo.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
            data.Params = codeInfo.CliParameter
        }

        return toolDelInvalidKV(data)
    })

    // Plugin Local Save
    const saveLocal: (modify: PluginDataProps) => Promise<YakScript> = useMemoizedFn((modify) => {
        return new Promise((resolve, reject) => {
            // New or Edit Logic
            let isModifyState: boolean = false

            // Page: New or Edit?
            if (!isModify) {
                isModifyState = false
            } else {
                // Edit Plugin as Purely Local?
                if (isPureLocal) {
                    isModifyState = true
                } else {
                    // Edit Plugin Name Change
                    if (modify.ScriptName === info?.ScriptName) {
                        isModifyState = true
                    } else {
                        // Renaming Plugin Counts as New
                        isModifyState = false
                    }
                }
            }

            const request: localYakInfo = convertLocalToLocalInfo(isModifyState, {info: info, modify: modify})
            // console.log("grpc-SaveNewYakScript", JSON.stringify(request))
            if (!saveLoading) setSaveLoading(true)
            ipcRenderer
                .invoke("SaveNewYakScript", request)
                .then((data: YakScript) => {
                    yakitNotify("success", "Create / Save Plugin Successfully")
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    onLocalAndOnlineSend(data)
                    resolve(data)
                })
                .catch((e: any) => {
                    reject(e)
                })
        })
    })

    /** --------------- Plugin Debug Start --------------- */
    const [debugPlugin, setDebugPlugin] = useState<PluginDataProps>()
    const [debugShow, setDebugShow] = useState<boolean>(false)

    const onCancelDebug = useMemoizedFn(() => {
        if (debugShow) setDebugShow(false)
    })
    const onMerge = useMemoizedFn((v: string) => {
        setCode(v)
        setDebugShow(false)
        setDebugPlugin(undefined)
    })

    // Convert Page Data to Plugin Debug Info
    const convertDebug = useMemoizedFn(() => {
        return new Promise(async (resolve, reject) => {
            setDebugPlugin(undefined)
            try {
                const paramsList = pluginType === "yak" ? await onCodeToInfo(pluginType, code) : {CliParameter: []}
                if (!paramsList) {
                    resolve("false")
                    return
                }
                const baseInfo: PluginBaseParamProps = fetchInfoData() || getInfoParams()
                const info: PluginDataProps = {
                    ScriptName: baseInfo.ScriptName,
                    Type: pluginType,
                    Params: paramsList.CliParameter,
                    Content: code
                }
                setDebugPlugin({...info})

                resolve("true")
            } catch (error) {
                resolve("false")
            }
        })
    })

    // Debug
    const onDebug = useMemoizedFn(async () => {
        if (saveLoading || onlineLoading || modifyLoading) return
        if (debugShow) return

        const result = await convertDebug()
        // Fetch Plugin Info Error
        if (result === "false") return
        setDebugShow(true)
    })
    /** --------------- Plugin Debug End --------------- */

    /** Top-Right Button Group Operations Start */
    const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
    // Sync to Cloud
    const onSyncCloud = useMemoizedFn(async () => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "Sync to Cloud Post-Login")
            return
        }
        if (onlineLoading || modifyLoading || saveLoading) return
        setOnlineLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) {
            setTimeout(() => {
                setOnlineLoading(false)
            }, 200)
            return
        }

        modalTypeRef.current = "close"
        isUpload.current = true
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})
        setCloudHint({isCopy: false, visible: true})
    })
    // Copy to Cloud
    const onCopyCloud = useMemoizedFn(async () => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "Copy to Cloud Post-Login")
            return
        }
        if (onlineLoading || modifyLoading || saveLoading) return
        setOnlineLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) {
            setTimeout(() => {
                setOnlineLoading(false)
            }, 200)
            return
        }

        modalTypeRef.current = "close"
        isUpload.current = true
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})
        setCloudHint({isCopy: true, visible: true})
    })
    const [modifyLoading, setModifyLoading] = useState<boolean>(false)
    // Submit
    const onSubmit = useMemoizedFn(async () => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "Submit Modifications Post-Login")
            return
        }
        if (modifyLoading || onlineLoading || saveLoading) return
        setModifyLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) {
            setTimeout(() => {
                setModifyLoading(false)
            }, 200)
            return
        }

        modalTypeRef.current = "close"
        isUpload.current = false
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})

        if (info && modifyInfo.current.script_name !== info?.ScriptName) {
            yakitNotify("error", "Submit Without Changing Plugin Name")
            setTimeout(() => {
                setModifyLoading(false)
            }, 200)
            return
        }

        // Private Plugin Describe Changes Only
        if (modifyInfo.current.is_private) {
            setModifyReason(true)
        } else {
            // Public Plugin Score Then Describe Changes
            setPluginTest(true)
        }
    })
    // Save
    const [saveLoading, setSaveLoading] = useState<boolean>(false)
    const closeSaveLoading = useMemoizedFn(() => {
        setTimeout(() => {
            setSaveLoading(false)
        }, 200)
        onDestroyInstance(false)
    })
    // Set Close Logic before Save Button Action"close"
    const onBtnSave = useMemoizedFn(() => {
        modalTypeRef.current = "close"
        onSave()
    })
    const onSave = useMemoizedFn(async () => {
        if (saveLoading || onlineLoading || modifyLoading) return
        setSaveLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        // Basic Validation Failed
        if (!obj) {
            closeSaveLoading()
            return
        }
        // Unknown Error, Plugin Name Unretrieved
        if (!obj.ScriptName) {
            yakitNotify("error", "Failed to Retrieve Plugin Name, Close & Retry")
            closeSaveLoading()
            return
        }

        saveLocal(obj)
            .then((res) => {
                onDestroyInstance(true)
            })
            .catch((e) => {
                yakitNotify("error", `Save plugin failed: ${e}`)
            })
            .finally(() => {
                closeSaveLoading()
            })
    })

    // Sync & Copy to Cloud
    const modifyInfo = useRef<API.PluginsRequest>()
    const [cloudHint, setCloudHint] = useState<{isCopy: boolean; visible: boolean}>({isCopy: false, visible: false})
    const onCloudHintCallback = useMemoizedFn((isCallback: boolean, param?: {type?: string; name?: string}) => {
        // Close Popup Manually|No Plugin Info to Modify Retrieved
        if (!isCallback || !modifyInfo.current) {
            setCloudHint({isCopy: false, visible: false})
            setTimeout(() => {
                // Interrupt Sync|Copy to Cloud Button Loading State
                setOnlineLoading(false)
            }, 100)
            if (!modifyInfo.current) yakitNotify("error", "Failed to Retrieve Plugin Info, Retry!")
            return
        }

        setTimeout(() => {
            setCloudHint({isCopy: false, visible: false})
        }, 100)

        // Submit Button Click
        if (cloudHint.isCopy) {
            const request: API.CopyPluginsRequest = {
                ...modifyInfo.current,
                script_name: param?.name || modifyInfo.current.script_name,
                is_private: true,
                base_plugin_id: +(info?.OnlineId || 0)
            }
            copyOnlinePlugin(request, (value) => {
                if (value) {
                    if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                    onUpdatePageList("owner")
                    onDestroyInstance(true)
                }
                setTimeout(() => {
                    setOnlineLoading(false)
                }, 200)
            })
        } else {
            // New Public Plugin Basic Check Required
            if (param && param?.type === "public") {
                modifyInfo.current = {...modifyInfo.current, is_private: false}
                setPluginTest(true)
            }
            // Private Plugin Save Directly, Skip Basic Check
            if (param && param?.type === "private") {
                uploadOnlinePlugin({...modifyInfo.current, is_private: true}, false, (value) => {
                    if (value) {
                        if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                        onUpdatePageList("owner")
                        onDestroyInstance(true)
                    }
                    setTimeout(() => {
                        setOnlineLoading(false)
                    }, 200)
                })
            }
        }
    })
    // Plugin Basic Check
    const [pluginTest, setPluginTest] = useState<boolean>(false)
    // Post-Detection Upload?
    const isUpload = useRef<boolean>(true)
    const onTestCallback = useMemoizedFn((value: boolean, info?: YakScript) => {
        // Open Plugin Edit - Score Then Open Change Reason Popup
        if (!isUpload.current) {
            if (value) {
                setTimeout(() => {
                    setPluginTest(false)
                    setModifyReason(true)
                }, 1000)
            } else {
                setPluginTest(false)
                setTimeout(() => {
                    // Submit Button Loading State
                    setModifyLoading(false)
                }, 200)
            }
            return
        }

        // Post-Score Upload Callback
        if (value) {
            if (info) {
                if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                onUpdatePageList("owner")
                onUpdatePageList("online")
                onDestroyInstance(true)
            }
        }
        setTimeout(() => {
            setPluginTest(false)
            setOnlineLoading(false)
        }, 500)
    })
    // Describe Plugin Change
    const [modifyReason, setModifyReason] = useState<boolean>(false)
    const onModifyReason = useMemoizedFn((isSubmit: boolean, content?: string) => {
        if (isSubmit && modifyInfo.current) {
            uploadOnlinePlugin({...modifyInfo.current, uuid: info?.UUID, logDescription: content}, true, (value) => {
                if (value) {
                    // if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                    onUpdatePageList("owner")
                    onUpdatePageList("online")
                    onDestroyInstance(true)
                }
                setTimeout(() => {
                    setModifyLoading(false)
                }, 200)
            })
        }
        if (!isSubmit) {
            setTimeout(() => {
                setModifyLoading(false)
            }, 200)
        }
        setModifyReason(false)
    })

    // Data Reset
    const onReset = useMemoizedFn(() => {
        oldParamsRef.current = ""

        setPluginType("yak")
        setInfoParams({ScriptName: ""})
        setCacheTags([])
        setSettingParams({Content: ""})
        setCode(pluginTypeToName["yak"]?.content || "")

        setPreviewParams([])
        setDebugPlugin(undefined)
    })

    // Registration Page External Action Secondary Prompt Config Info
    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    // Secondary Prompt Instance
    const modalRef = useRef<any>(null)
    // Secondary Prompt Type
    const modalTypeRef = useRef<string>("close")
    // Plugin ID Triggered Again on Edit Page Open
    const otherId = useRef<number>(0)
    const setOtherId = useMemoizedFn((id: string) => {
        otherId.current = +id || 0
    })
    // Receive Edit Plugin ID
    useEffect(() => {
        emiter.on("sendEditPluginId", setOtherId)
        return () => {
            emiter.off("sendEditPluginId", setOtherId)
        }
    }, [])

    useEffect(() => {
        if (pluginId) {
            setSubscribeClose(YakitRoute.ModifyYakitScript, {
                close: {
                    title: "Plugin Unsaved",
                    content: "Save Changes Locally??",
                    confirmLoading: saveLoading,
                    maskClosable: false,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "close"
                        onSave()
                    },
                    onCancel: () => {
                        closePage("modify")
                    }
                },
                reset: {
                    title: "Plugin Unsaved",
                    content: "Save Changes Locally & Edit Another??",
                    confirmLoading: saveLoading,
                    maskClosable: false,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "reset"
                        onSave()
                    },
                    onCancel: () => {
                        if (otherId.current) {
                            fetchPluginInfo(otherId.current)
                        } else {
                            yakitNotify("error", "Failed to Retrieve Edit Plugin ID, Please Retry")
                        }
                    }
                }
            })
        } else {
            setSubscribeClose(YakitRoute.AddYakitScript, {
                close: {
                    title: "Plugin Unsaved",
                    content: "Save Plugin Locally??",
                    confirmLoading: saveLoading,
                    maskClosable: false,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "close"
                        onSave()
                    },
                    onCancel: () => {
                        closePage("new")
                    }
                },
                reset: {
                    title: "Plugin Unsaved",
                    content: "Save Plugin Locally & Create New??",
                    confirmLoading: saveLoading,
                    maskClosable: false,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "reset"
                        onSave()
                    },
                    onCancel: () => {
                        onReset()
                    }
                }
            })
        }

        return () => {
            if (pluginId) {
                removeSubscribeClose(YakitRoute.ModifyYakitScript)
            } else {
                removeSubscribeClose(YakitRoute.AddYakitScript)
            }
        }
    }, [pluginId])
    // Destroy Secondary Prompt Instance (New)|Process Edit and Status Together)
    const onDestroyInstance = useMemoizedFn((state?: boolean) => {
        try {
            if (modalRef.current) modalRef.current.destroy()
        } catch (error) {}
        // Post-Destroy Actions
        if (state) {
            if (modalTypeRef.current === "close") {
                closePage(isModify ? "modify" : "new")
                return
            }

            if (isModify) {
                if (modalTypeRef.current === "reset") {
                    if (otherId.current) {
                        fetchPluginInfo(otherId.current)
                    } else {
                        yakitNotify("error", "Failed to Retrieve Edit Plugin ID, Please Retry")
                    }
                }
            } else {
                if (modalTypeRef.current === "reset") onReset()
            }
        }
    })
    // Render-side Communication - Close Page
    const closePage = useMemoizedFn((type: string) => {
        let route: YakitRoute = YakitRoute.AddYakitScript
        switch (type) {
            case "modify":
                route = YakitRoute.ModifyYakitScript
                break
            case "new":
                route = YakitRoute.AddYakitScript
                break

            default:
                break
        }
        emiter.emit("closePage", JSON.stringify({route: route}))
    })

    const {pages} = usePageInfo((s) => ({pages: s.pages}), shallow)
    // Signal After Successful Local Save
    const onLocalAndOnlineSend = useMemoizedFn((info: YakScript, isOnline?: boolean) => {
        let route: YakitRoute = YakitRoute.AddYakitScript
        if (isModify) {
            route = YakitRoute.ModifyYakitScript
        }

        const targetCache: PageNodeItemProps = (pages.get(route)?.pageList || [])[0]
        let parent: YakitRoute | undefined = undefined
        if (targetCache?.pageParamsInfo && targetCache.pageParamsInfo?.pluginInfoEditor) {
            parent = targetCache.pageParamsInfo.pluginInfoEditor.source
        }

        if (parent) {
            const param: SavePluginInfoSignalProps = {
                route: parent,
                isOnline: !!isOnline,
                pluginName: info.ScriptName || ""
            }
            emiter.emit("savePluginInfoSignal", JSON.stringify(param))
        }
    })
    // Refresh Store After Saving Plugin Info|Mine|Local List Data
    const onUpdatePageList = useMemoizedFn((key: string) => {
        switch (key) {
            case "online":
                emiter.emit("onRefOnlinePluginList", "")
                break
            case "owner":
                emiter.emit("onRefUserPluginList", "")
                break
            case "local":
                emiter.emit("onRefLocalPluginList", "")
                break

            default:
                break
        }
    })

    const divRef = useRef<HTMLDivElement>(null)

    return (
        <div ref={divRef} className={styles["plugin-edit-details-wrapper"]}>
            <YakitSpin spinning={loading}>
                <div className={styles["plugin-edit-details-header"]}>
                    <div className={styles["header-title"]}>
                        <div className={styles["title-style"]}>{pluginId ? "Edit Plugin" : "Create Plugin"}</div>
                        {!!info && (
                            <div className={styles["title-extra-wrapper"]}>
                                <YakitTag color={pluginTypeToName[info.Type]?.color as any}>
                                    {pluginTypeToName[info.Type]?.name || ""}
                                </YakitTag>
                                <div
                                    className={classNames(styles["script-name"], "yakit-content-single-ellipsis")}
                                    title={info.ScriptName}
                                >
                                    {info.ScriptName}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={styles["header-path"]}>
                        <Anchor
                            className='plugins-anchor'
                            getContainer={() => {
                                if (bodyRef.current) return bodyRef.current
                                else return window
                            }}
                            affix={false}
                            onChange={onViewChange}
                        >
                            <Link
                                href='#plugin-details-type'
                                title={
                                    <YakitButton
                                        className={path === "type" ? styles["path-btn"] : undefined}
                                        type='text2'
                                    >
                                        <OutlineViewgridIcon />
                                        Type Select
                                    </YakitButton>
                                }
                            />
                            <Link href='' title={<OutlineChevronrightIcon className={styles["paht-icon"]} />} />
                            <Link
                                href='#plugin-details-info'
                                title={
                                    <YakitButton
                                        className={path === "info" ? styles["path-btn"] : undefined}
                                        type='text2'
                                    >
                                        <OutlineIdentificationIcon />
                                        Base Info
                                    </YakitButton>
                                }
                            />
                            <Link href='' title={<OutlineChevronrightIcon className={styles["paht-icon"]} />} />
                            <Link
                                href='#plugin-details-setting'
                                title={
                                    <YakitButton
                                        className={path === "setting" ? styles["path-btn"] : undefined}
                                        type='text2'
                                    >
                                        <OutlineAdjustmentsIcon />
                                        Plugin Config
                                    </YakitButton>
                                }
                            />
                        </Anchor>
                    </div>
                    <div className={styles["header-extra"]}>
                        <div className={styles["extra-btn"]}>
                            <FuncBtn
                                maxWidth={1100}
                                icon={<OutlineCodeIcon />}
                                type='outline2'
                                size='large'
                                name={"Debug"}
                                onClick={onDebug}
                            />

                            {showCopyBtn && (
                                <FuncBtn
                                    maxWidth={1100}
                                    icon={<OutlineDocumentduplicateIcon />}
                                    type='outline2'
                                    size='large'
                                    name={"Copy to Cloud"}
                                    loading={onlineLoading}
                                    onClick={onCopyCloud}
                                />
                            )}

                            {showSubmitBtn && (
                                <FuncBtn
                                    maxWidth={1100}
                                    icon={<OutlinePaperairplaneIcon />}
                                    type='outline1'
                                    size='large'
                                    name={"Submit"}
                                    loading={modifyLoading}
                                    onClick={onSubmit}
                                />
                            )}

                            {showSyncBtn && (
                                <FuncBtn
                                    maxWidth={1100}
                                    icon={<OutlineClouduploadIcon />}
                                    type='outline1'
                                    size='large'
                                    name={"Sync to Cloud"}
                                    loading={onlineLoading}
                                    onClick={onSyncCloud}
                                />
                            )}

                            <FuncBtn
                                maxWidth={1100}
                                icon={<SolidStoreIcon />}
                                size='large'
                                name={"Save"}
                                loading={saveLoading}
                                onClick={onBtnSave}
                            />
                        </div>
                    </div>
                </div>

                <div ref={bodyRef} className={styles["plugin-edit-details-body"]}>
                    <div className={styles["body-wrapper"]}>
                        {/* Type Select */}
                        <div id='plugin-details-type' className={styles["body-type-wrapper"]}>
                            <div className={styles["header-wrapper"]}>Type Select</div>
                            <div className={styles["type-body"]}>
                                <div className={styles["body-container"]}>
                                    <div className={styles["type-title"]}>Script Type</div>
                                    <div className={styles["type-list"]}>
                                        <div className={styles["list-row"]}>
                                            {DefaultTypeList.slice(0, 3).map((item) => {
                                                return (
                                                    <PluginTypeTag
                                                        {...item}
                                                        disabled={isModify || item.key === "lua"}
                                                        checked={pluginType === item.key}
                                                        setCheck={() => onType(item.key)}
                                                    />
                                                )
                                            })}
                                        </div>
                                        <div className={styles["list-row"]}>
                                            {DefaultTypeList.slice(3, 6).map((item) => {
                                                return (
                                                    <PluginTypeTag
                                                        {...item}
                                                        disabled={isModify || item.key === "lua"}
                                                        checked={pluginType === item.key}
                                                        setCheck={() => onType(item.key)}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Base Info */}
                        <div id='plugin-details-info' className={styles["body-info-wrapper"]}>
                            <div className={styles["header-wrapper"]}>Base Info</div>
                            <div className={styles["info-body"]}>
                                <PluginModifyInfo ref={infoRef} data={infoParams} tagsCallback={onTagsCallback} />
                            </div>
                        </div>
                        {/* Plugin Config */}
                        <div id='plugin-details-setting' className={styles["body-setting-wrapper"]}>
                            <div className={styles["header-wrapper"]}>
                                Plugin Config
                                <div
                                    className={styles["subtitle-help-wrapper"]}
                                    onClick={() => {
                                        ipcRenderer.invoke("open-url", CodeGV.PluginParamsHelp)
                                    }}
                                >
                                    <span className={styles["text-style"]}>Help Docs</span>
                                    <OutlineQuestionmarkcircleIcon />
                                </div>
                            </div>
                            <div className={styles["setting-body"]}>
                                <PluginModifySetting
                                    ref={settingRef}
                                    type={pluginType}
                                    tags={cacheTags || []}
                                    setTags={onSwitchToTags}
                                    data={settingParams}
                                />
                                <div className={styles["setting-editor-wrapper"]}>
                                    <div className={styles["editor-header"]}>
                                        <div className={styles["header-title"]}>
                                            <span className={styles["title-style"]}>Source Code</span>
                                            <span className={styles["subtitle-style"]}>
                                                Define Input Logic & Write Output UI Here
                                            </span>
                                        </div>
                                        <div className={styles["header-extra"]}>
                                            {pluginType === "yak" && !previewParamsShow && (
                                                <YakitButton icon={<SolidEyeIcon />} onClick={onOpenPreviewParams}>
                                                    Param Preview
                                                </YakitButton>
                                            )}
                                            <YakitButton
                                                type='text2'
                                                icon={<OutlineArrowsexpandIcon />}
                                                onClick={onOpenCodeModal}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles["editor-body"]}>
                                        <YakitEditor type={pluginType} value={code} setValue={setCode} />
                                    </div>
                                </div>
                            </div>
                            <PluginEditorModal
                                getContainer={divRef.current || undefined}
                                language={pluginType}
                                visible={codeModal}
                                setVisible={onModifyCode}
                                code={code}
                                onPreview={onCodeModalToDegbug}
                            />
                        </div>
                    </div>
                </div>

                <PluginSyncAndCopyModal {...cloudHint} setVisible={onCloudHintCallback} />
                <UploadPluginModal
                    isUpload={isUpload.current}
                    plugin={modifyInfo.current}
                    visible={pluginTest}
                    onCancel={onTestCallback}
                />
                <ModifyPluginReason visible={modifyReason} onCancel={onModifyReason} />

                {debugShow && (
                    <PluginDebug
                        getContainer={divRef.current || undefined}
                        plugin={debugPlugin}
                        visible={debugShow}
                        onClose={onCancelDebug}
                        onMerge={onMerge}
                    />
                )}
            </YakitSpin>

            <YakitHint
                getContainer={divRef.current || undefined}
                wrapClassName={styles["old-data-hint-wrapper"]}
                visible={oldShow}
                title='Data Migration Warning'
                content='Parameter Design Upgrade Warning, Database and Source Params Mismatch, Click“Copy Code”Certainly, please provide me with the Chinese text that you would like to have translated into English.?。'
                okButtonText='Copy Code'
                cancelButtonText='Ignore'
                okButtonProps={{loading: copyLoading}}
                onOk={onOldDataOk}
                onCancel={onOldDataCancel}
            />

            {previewParamsShow && (
                <PreviewParams
                    getContainer={divRef.current || undefined}
                    visible={previewParamsShow}
                    confirmLoading={previewCloseLoading}
                    onDebug={onPreviewToDebug}
                    onCancel={onCancelPreviewParams}
                    onOk={onCancelPreviewParams}
                    ref={paramsForm}
                    params={previewParams}
                />
            )}
        </div>
    )
}

interface PluginEditorModalProps {
    /** Specify Popup Mount Node, Default to body */
    getContainer?: HTMLElement
    /** Source Language */
    language?: string
    visible: boolean
    setVisible: (content: string) => any
    code: string
    /** Preview Params Callback */
    onPreview: (params: YakParamProps[], code: string) => any
}
/** @name: Plugin Edit Page - Fullscreen Source Code */
const PluginEditorModal: React.FC<PluginEditorModalProps> = memo((props) => {
    const {getContainer, language = "yak", visible, setVisible, code, onPreview} = props

    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            setContent(code || "")
            return () => {
                setContent("")
                setPreviewShow(false)
                setPreviewParams([])
                setPreviewCloseLoading(false)
            }
        }
    }, [visible])

    const fetchPluginType = useMemoizedFn(() => {
        return language
    })

    const [previewParams, setPreviewParams] = useState<YakParamProps[]>([])
    const [previewShow, setPreviewShow] = useState<boolean>(false)
    /** Preview Box Content Update After Code Change */
    useDebounceEffect(
        () => {
            if (!previewShow) return
            else {
                onCodeToInfo(fetchPluginType(), content)
                    .then((value) => {
                        if (value) setPreviewParams(value.CliParameter)
                    })
                    .catch(() => {})
            }
        },
        [content, previewShow],
        {wait: 500}
    )
    const onOpenPreviewParams = useMemoizedFn(async () => {
        const info = await onCodeToInfo(fetchPluginType(), content)
        if (!info) return
        setPreviewParams(info.CliParameter)
        if (!previewShow) setPreviewShow(true)
    })
    const paramsForm = useRef<PreviewParamsRefProps>()
    const [previewCloseLoading, setPreviewCloseLoading] = useState<boolean>(false)
    // Go Debug
    const onPreviewToDebug = useMemoizedFn(() => {
        if (previewCloseLoading) return
        setPreviewCloseLoading(true)
        if (paramsForm && paramsForm.current) {
            const formValue: Record<string, any> = paramsForm.current?.onGetValue() || {}
            let paramsList: YakParamProps[] = []
            for (let el of previewParams) {
                paramsList.push({
                    ...el,
                    Value: formValue[el.Field] || undefined
                })
            }
            onPreview(paramsList, content)
        }
    })
    // Preview End
    const onCancelPreviewParams = useMemoizedFn(() => {
        if (previewShow) {
            if (paramsForm && paramsForm.current) paramsForm.current.onReset()
            setPreviewShow(false)
        }
    })

    return (
        <>
            <YakitModal
                getContainer={getContainer}
                wrapClassName={styles["plugin-edit-page-modal"]}
                mask={false}
                title='Source Code'
                subTitle={
                    <div className={styles["plugin-editor-modal-subtitle"]}>
                        <span>Define Input Logic & Write Output UI Here</span>
                        <div className={styles["extra-wrapper"]}>
                            {language === "yak" && !previewShow && (
                                <YakitButton icon={<SolidEyeIcon />} onClick={onOpenPreviewParams}>
                                    Param Preview
                                </YakitButton>
                            )}
                            <span>Esc to Exit Fullscreen</span>
                        </div>
                    </div>
                }
                type='white'
                width='100%'
                centered={true}
                maskClosable={false}
                closable={true}
                closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
                footer={null}
                visible={visible}
                onCancel={() => setVisible(content)}
                bodyStyle={{padding: 0, flex: 1, overflow: "hidden"}}
            >
                <div className={styles["plugin-editor-modal-body"]}>
                    <YakitEditor type={language} value={content} setValue={setContent} />
                </div>
            </YakitModal>

            {previewShow && (
                <PreviewParams
                    getContainer={getContainer}
                    visible={previewShow}
                    confirmLoading={previewCloseLoading}
                    onDebug={onPreviewToDebug}
                    onCancel={onCancelPreviewParams}
                    onOk={onCancelPreviewParams}
                    ref={paramsForm}
                    params={previewParams}
                />
            )}
        </>
    )
})

interface PluginSyncAndCopyModalProps {
    isCopy: boolean
    visible: boolean
    setVisible: (isCallback: boolean, param?: {type?: string; name?: string}) => any
}
/** @name: Plugin Sync & Copy to Cloud */
const PluginSyncAndCopyModal: React.FC<PluginSyncAndCopyModalProps> = memo((props) => {
    const {isCopy, visible, setVisible} = props

    const [type, setType] = useState<"private" | "public">("private")
    const [name, setName] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {
        if (isCopy && !name) {
            yakitNotify("error", "Enter Copy Plugin Name")
            return
        }
        setVisible(true, {type: isCopy ? undefined : type, name: isCopy ? name : undefined})
    })

    return (
        <YakitModal
            title={isCopy ? "Copy to Cloud" : "Sync to Cloud"}
            type='white'
            width={isCopy ? 506 : 448}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            {isCopy ? (
                <div className={styles["plugin-sync-and-copy-body"]}>
                    <div className={styles["copy-header"]}>
                        Copy & Sync to Private without Author Consent, Save Changes to Cloud
                    </div>
                    <div className={styles["copy-wrapper"]}>
                        <div className={styles["title-style"]}>Plugin name : </div>
                        <YakitInput placeholder='Please Enter...' value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
            ) : (
                <div className={styles["plugin-sync-and-copy-body"]}>
                    <div className={styles["sycn-wrapper"]}>
                        <Radio
                            className='plugins-radio-wrapper'
                            checked={type === "private"}
                            onClick={(e) => {
                                if (type === "private") return
                                setType("private")
                            }}
                        >
                            Private (Self Only))
                        </Radio>
                        <Radio
                            className='plugins-radio-wrapper'
                            checked={type === "public"}
                            onClick={(e) => {
                                if (type === "public") return
                                setType("public")
                            }}
                        >
                            Public (Listed in Plugin Store After Approval))
                        </Radio>
                    </div>
                </div>
            )}
        </YakitModal>
    )
})

interface UploadPluginModalProps {
    isUpload: boolean
    plugin?: API.PluginsEditRequest
    visible: boolean
    /** Close Popup (true: Qualified)|false: Not Qualified) */
    onCancel: (value: boolean, info?: YakScript) => any
}
/** @name: Plugin Source Scored - Auto Upload After Passing */
const UploadPluginModal: React.FC<UploadPluginModalProps> = memo((props) => {
    const {isUpload, plugin, visible, onCancel} = props

    const onCallback = useMemoizedFn((value: boolean) => {
        if (!isUpload) {
            onCancel(value)
            return
        }
        if (value) {
            if (plugin) {
                uploadOnlinePlugin(plugin, false, (value) => {
                    onCancel(!!value, value)
                })
            } else {
                onCancel(false)
            }
        } else {
            onCancel(value)
        }
    })

    return (
        <CodeScoreModal
            type={plugin?.type || ""}
            code={plugin?.content || ""}
            visible={visible}
            onCancel={onCallback}
        />
    )
})

interface ModifyPluginReasonProps {
    visible: boolean
    onCancel: (isSubmit: boolean, content?: string) => any
}
/** @name: Describe Change Content */
const ModifyPluginReason: React.FC<ModifyPluginReasonProps> = memo((props) => {
    const {visible, onCancel} = props

    const [content, setContent] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {
        if (!content) {
            yakitNotify("error", "Describe Change")
            return
        }
        onCancel(true, content)
    })

    useEffect(() => {
        if (visible) setContent("")
    }, [visible])

    return (
        <YakitModal
            title='Describe Changes'
            type='white'
            width={448}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            onCancel={() => onCancel(false)}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["modify-plugin-reason-wrapper"]}>
                <YakitInput.TextArea
                    placeholder='Briefly Describe Changes, For Author Review...'
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={content}
                    maxLength={150}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>
        </YakitModal>
    )
})

interface PreviewParamsRefProps {
    onGetValue: () => CustomPluginExecuteFormValue
    onReset: () => any
}
interface PreviewParamsProps {
    // yakit-window Attributes
    getContainer?: HTMLElement
    visible: boolean
    confirmLoading?: boolean
    onDebug: () => any
    onCancel: () => any
    onOk: () => any
    // Preview Params Form Attributes
    params: YakParamProps[]
    ref?: React.MutableRefObject<PreviewParamsRefProps | undefined>
}
/** @name: Preview Params Content */
const PreviewParams: React.FC<PreviewParamsProps> = memo(
    React.forwardRef((props, ref) => {
        const {getContainer, visible, confirmLoading, onDebug, onCancel, onOk, params = []} = props

        const [form] = Form.useForm()

        // Update Form Content
        useEffect(() => {
            initFormValue()
        }, [params])

        // Fetch Current Form Data
        const getValues = useMemoizedFn(() => {
            return form.getFieldsValue()
        })

        useImperativeHandle(
            ref,
            () => ({
                onGetValue: getValues,
                onReset: () => {
                    form?.resetFields()
                }
            }),
            [form]
        )

        /** Required Params */
        const requiredParams = useMemo(() => {
            return params.filter((item) => !!item.Required) || []
        }, [params])
        /** Optional Params */
        const groupParams = useMemo(() => {
            const arr = params.filter((item) => !item.Required) || []
            return ParamsToGroupByGroupName(arr)
        }, [params])
        const defaultActiveKey = useMemo(() => {
            return groupParams.map((ele) => ele.group)
        }, [groupParams])

        const initFormValue = useMemoizedFn(() => {
            let newFormValue: CustomPluginExecuteFormValue = {}
            params.forEach((ele) => {
                const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
                newFormValue = {
                    ...newFormValue,
                    [ele.Field]: value
                }
            })
            // console.log("Preview Params - Update Config After Source Update", newFormValue)

            form.setFieldsValue({...newFormValue})
        })

        return (
            <YakitWindow
                getContainer={getContainer}
                title='Param Preview'
                subtitle={
                    <div style={{width: "100%", overflow: "hidden"}} className={"yakit-content-single-ellipsis"}>
                        View-Only, No Operations
                    </div>
                }
                layout='topRight'
                visible={visible}
                contentStyle={{padding: 0}}
                footerStyle={{flexDirection: "row-reverse", justifyContent: "center"}}
                cancelButtonText='Plugin Debug'
                cancelButtonProps={{
                    loading: !!confirmLoading,
                    icon: <OutlineCodeIcon />,
                    onClick: onDebug
                }}
                onCancel={onCancel}
                okButtonText='Preview End'
                okButtonProps={{colors: "danger", icon: <SolidEyeoffIcon />}}
                onOk={onOk}
                // cacheSizeKey='plugin-preview-params'
            >
                <Form form={form} className={styles["preview-params-wrapper"]} layout='vertical'>
                    <div className={styles["required-params-wrapper"]}>
                        <ExecuteEnterNodeByPluginParams
                            paramsList={requiredParams}
                            pluginType='yak'
                            isExecuting={false}
                        />
                    </div>
                    {groupParams.length > 0 && (
                        <>
                            <div className={styles["additional-params-divider"]}>
                                <div className={styles["text-style"]}>Extra Params (Optional))</div>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <YakitCollapse
                                defaultActiveKey={defaultActiveKey}
                                className={styles["extra-group-params-wrapper"]}
                                bordered={false}
                            >
                                {groupParams.map((item, index) => (
                                    <YakitPanel key={`${item.group}`} header={`Param Group：${item.group}`}>
                                        {item.data?.map((formItem, index) => (
                                            <React.Fragment key={`${formItem.Field}${formItem.FieldVerbose}${index}`}>
                                                <FormContentItemByType item={formItem} pluginType='yak' />
                                            </React.Fragment>
                                        ))}
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            <div className={styles["to-end"]}>Reached Bottom～</div>
                        </>
                    )}
                </Form>
            </YakitWindow>
        )
    })
)
