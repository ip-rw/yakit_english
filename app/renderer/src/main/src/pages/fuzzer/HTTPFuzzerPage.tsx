import React, {useEffect, useMemo, useRef, useState} from "react"
import {Form, Modal, Result, Space, Popover, Tooltip, Divider, Descriptions} from "antd"
import {
    IMonacoEditor,
    NewHTTPPacketEditor,
    HTTP_PACKET_EDITOR_Response_Info,
    RenderTypeOptionVal
} from "../../utils/editors"
import {showDrawer} from "../../utils/showModal"
import {monacoEditorWrite} from "./fuzzerTemplates"
import {QueryFuzzerLabelResponseProps, StringFuzzer} from "./StringFuzzer"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {randomString} from "../../utils/randomUtil"
import {failed, info, yakitFailed, yakitNotify, warn} from "../../utils/notification"
import {
    useControllableValue,
    useCreation,
    useDebounceFn,
    useGetState,
    useInViewport,
    useMap,
    useMemoizedFn,
    useSize,
    useUpdateEffect
} from "ahooks"
import {getRemoteValue, setRemoteValue} from "../../utils/kv"
import {HTTPFuzzerHistorySelector, HTTPFuzzerTaskDetail} from "./HTTPFuzzerHistory"
import {HTTPFuzzerHotPatch} from "./HTTPFuzzerHotPatch"
import {callCopyToClipboard} from "../../utils/basic"
import {exportHTTPFuzzerResponse, exportPayloadResponse} from "./HTTPFuzzerPageExport"
import {StringToUint8Array, Uint8ArrayToString} from "../../utils/str"
import {PacketScanButton} from "@/pages/packetScanner/DefaultPacketScanGroup"
import styles from "./HTTPFuzzerPage.module.scss"
import {ShareImportExportData} from "./components/ShareImportExportData"
// import {showExtractFuzzerResponseOperator} from "@/utils/extractor"
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChromeSvgIcon,
    ClockIcon,
    PaperAirplaneIcon,
    SearchIcon,
    StopIcon,
    ArrowsRetractIcon,
    ArrowsExpandIcon,
    QuestionMarkCircleIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {PaginationSchema} from "../invoker/schema"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {Size} from "re-resizable"
import {
    BodyLengthInputNumber,
    HTTPFuzzerPageTable,
    HTTPFuzzerPageTableQuery
} from "./components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {monaco} from "react-monaco-editor"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {WebFuzzerResponseExtractor} from "@/utils/extractor"
import {HttpQueryAdvancedConfig} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfig"
import {
    FuzzerParamItem,
    AdvancedConfigValueProps,
    KVPair,
    FuzzTagMode
} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    ExtractorValueProps,
    HTTPResponseExtractor,
    HTTPResponseMatcher,
    MatcherAndExtractionRefProps,
    MatcherAndExtractionValueProps,
    MatcherValueProps,
    MatchingAndExtraction
} from "./MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {HTTPHeader} from "../mitm/MITMContentReplacerHeaderOperator"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {MatcherAndExtraction} from "./MatcherAndExtractionCard/MatcherAndExtractionCard"
import _ from "lodash"
import {YakitRoute} from "@/routes/newRoute"
import {FUZZER_LABEL_LIST_NUMBER} from "./HTTPFuzzerEditorMenu"
import {WebFuzzerNewEditor} from "./WebFuzzerNewEditor/WebFuzzerNewEditor"
import {
    OutlineAnnotationIcon,
    OutlineBeakerIcon,
    OutlineExportIcon,
    OutlinePayloadIcon,
    OutlineXIcon,
    OutlineCodeIcon,
    OutlinePlugsIcon,
    OutlineSearchIcon,
    OutlineFilterIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {shallow} from "zustand/shallow"
import {usePageInfo, PageNodeItemProps, WebFuzzerPageInfoProps} from "@/store/pageInfo"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import {PayloadGroupNodeProps, ReadOnlyNewPayload} from "../payloadManager/newPayload"
import {createRoot} from "react-dom/client"
import {SolidPauseIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitWindow} from "@/components/yakitUI/YakitWindow/YakitWindow"
import blastingIdmp4 from "@/assets/blasting-id.mp4"
import blastingPwdmp4 from "@/assets/blasting-pwd.mp4"
import blastingCountmp4 from "@/assets/blasting-count.mp4"
import {prettifyPacketCode} from "@/utils/prettifyPacket"
import {RemoteGV} from "@/yakitGV"
import {WebFuzzerType} from "./WebFuzzerPage/WebFuzzerPageType"
import cloneDeep from "lodash/cloneDeep"

import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {availableColors} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {apiGetGlobalNetworkConfig, apiSetGlobalNetworkConfig} from "../spaceEngine/utils"
import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {ThirdPartyApplicationConfigForm} from "@/components/configNetwork/ThirdPartyApplicationConfig"
import {
    DefFuzzerTableMaxData,
    defaultAdvancedConfigShow,
    defaultPostTemplate,
    emptyFuzzer,
    defaultWebFuzzerPageInfo,
    WEB_FUZZ_DNS_Hosts_Config,
    WEB_FUZZ_DNS_Server_Config,
    WEB_FUZZ_HOTPATCH_CODE,
    WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE,
    WEB_FUZZ_PROXY,
    defaultLabel
} from "@/defaultConstants/HTTPFuzzerPage"

const ResponseAllDataCard = React.lazy(() => import("./FuzzerSequence/ResponseAllDataCard"))

const {ipcRenderer} = window.require("electron")

export type AdvancedConfigShowProps = Record<Exclude<WebFuzzerType, "sequence">, boolean>
export interface ShareValueProps {
    /**Show advanced configuration/Hide */
    advancedConfigShow: AdvancedConfigShowProps
    /**Request package */
    request: string
    /**Advanced config data */
    advancedConfiguration: AdvancedConfigValueProps
}

export const analyzeFuzzerResponse = (
    i: FuzzerResponse,
    // setRequest: (isHttps: boolean, request: string) => any,
    index?: number,
    data?: FuzzerResponse[]
) => {
    let m = showDrawer({
        width: "90%",
        content: (
            <>
                <FuzzerResponseToHTTPFlowDetail
                    response={i}
                    onClosed={() => {
                        m.destroy()
                    }}
                    index={index}
                    data={data}
                />
            </>
        )
    })
}

export interface RedirectRequestParams {
    Request: string
    Response: string
    IsHttps: boolean
    PerRequestTimeoutSeconds: number
    Proxy: string
    Extractors: HTTPResponseExtractor[]
    Matchers: HTTPResponseMatcher[]
    MatchersCondition: string
    HitColor: string
    Params: FuzzerParamItem[]
    IsGmTLS: boolean
}

export interface HTTPFuzzerPageProp {
    system?: string
    id: string
}

export interface FuzzerResponse {
    Method: string
    StatusCode: number
    Host: string
    ContentType: string
    Headers: HTTPHeader[]
    ResponseRaw: Uint8Array
    BodyLength: number
    DurationMs: number
    UUID: string
    Timestamp: number
    RequestRaw: Uint8Array
    // GuessResponseEncoding: string;
    Ok: boolean
    Reason: string
    IsHTTPS?: boolean
    Count?: number
    Payloads?: string[]
    BodySimilarity?: number
    HeaderSimilarity?: number
    MatchedByFilter?: boolean
    Url?: string
    TaskId?: number
    DNSDurationMs: number
    FirstByteDurationMs?: number
    TotalDurationMs: number
    Proxy?: string
    RemoteAddr?: string
    ExtractedResults: KVPair[]
    MatchedByMatcher: boolean
    HitColor: string
    /**@name Applies only to front-end table background style */
    cellClassName?: string

    /**
     * Large response
     */
    IsTooLargeResponse: boolean
    TooLargeResponseHeaderFile: string
    TooLargeResponseBodyFile: string
    DisableRenderStyles: boolean

    RuntimeID: string
}

export interface HistoryHTTPFuzzerTask {
    Request: string
    RequestRaw: Uint8Array
    Proxy: string
    IsHTTPS: boolean

    IsGmTLS: boolean

    // Verbose rendering > RequestRaw > Request
    Verbose?: string
}

interface MutateMethod {
    Type: string
    Value: KVPair[]
}
export interface FuzzerRequestProps {
    // Request: string
    Params: FuzzerParamItem[]
    MutateMethods: MutateMethod[]
    Concurrent: number
    IsHTTPS: boolean
    FuzzTagMode: FuzzTagMode
    FuzzTagSyncIndex: boolean
    Proxy: string
    PerRequestTimeoutSeconds: number
    BatchTarget?: Uint8Array
    ActualAddr: string
    NoFollowRedirect: boolean
    // NoFollowMetaRedirect: boolean
    FollowJSRedirect: boolean
    HistoryWebFuzzerId?: number
    NoFixContentLength: boolean
    HotPatchCode: string
    // Filter: FuzzerResponseFilter;
    RequestRaw: Uint8Array
    DelayMinSeconds: number
    DelayMaxSeconds: number
    HotPatchCodeWithParamGetter: string
    MaxRetryTimes: number
    RetryInStatusCode: string
    RetryNotInStatusCode: string
    // ResponseCharset: string
    RetryWaitSeconds: number
    RetryMaxWaitSeconds: number
    RedirectTimes: number
    DNSServers: string[]
    EtcHosts: KVPair[]
    NoSystemProxy: boolean
    RepeatTimes: number
    Extractors: HTTPResponseExtractor[]
    Matchers: HTTPResponseMatcher[]
    MatchersCondition: string
    IsGmTLS: boolean

    HitColor?: string
    InheritVariables?: boolean
    InheritCookies?: boolean
    /**@name Serialized item unique key */
    FuzzerIndex?: string
    /**@name fuzzer Tab's unique key */
    FuzzerTabIndex?: string
}

export const showDictsAndSelect = (fun: (i: string) => any) => {
    ipcRenderer
        .invoke("GetAllPayloadGroup")
        .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
            if (res.Nodes.length === 0) {
                warn("No dictionary available, please add before using")
            } else {
                const y = showYakitModal({
                    title: null,
                    footer: null,
                    width: 1200,
                    type: "white",
                    closable: false,
                    hiddenHeader: true,
                    content: (
                        <ReadOnlyNewPayload
                            selectorHandle={(e) => {
                                fun(e)
                                y.destroy()
                            }}
                            onClose={() => {
                                y.destroy()
                            }}
                            Nodes={res.Nodes}
                        />
                    )
                })
            }
        })
        .catch((e: any) => {
            failed(`Failed to retrieve dictionary list：${e}`)
        })
        .finally()
}

export function copyAsUrl(f: {Request: string; IsHTTPS: boolean}) {
    ipcRenderer
        .invoke("ExtractUrl", f)
        .then((data: {Url: string}) => {
            callCopyToClipboard(data.Url)
        })
        .catch((e) => {
            failed("Failed to copy URL: contains Fuzz tag might result in incomplete URL")
        })
}
/**
 * @description Frontend type to HTTPFuzzer/HTTPFuzzerSequence interface required type, advancedConfigValue to FuzzerRequests type
 * @param {AdvancedConfigValueProps} value
 * @returns {FuzzerRequestProps}
 */
export const advancedConfigValueToFuzzerRequests = (value: AdvancedConfigValueProps) => {
    const fuzzerRequests: FuzzerRequestProps = {
        // Request: request,
        RequestRaw: new Uint8Array(), // StringToUint8Array(request, "utf8"),
        FuzzTagMode: value.fuzzTagMode,
        FuzzTagSyncIndex: value.fuzzTagSyncIndex,
        IsHTTPS: value.isHttps,
        IsGmTLS: value.isGmTLS,
        Concurrent: value.concurrent,
        PerRequestTimeoutSeconds: value.timeout,
        BatchTarget: value.batchTarget || new Uint8Array(),
        NoFixContentLength: value.noFixContentLength,
        NoSystemProxy: value.noSystemProxy,
        Proxy: value.proxy ? value.proxy.join(",") : "",
        ActualAddr: value.actualHost,
        HotPatchCode: "",
        HotPatchCodeWithParamGetter: "",
        DelayMinSeconds: value.minDelaySeconds,
        DelayMaxSeconds: value.maxDelaySeconds,
        RepeatTimes: value.repeatTimes,

        // retry config
        MaxRetryTimes: value.maxRetryTimes,
        RetryInStatusCode: value.retry ? value?.retryConfiguration?.statusCode || "" : "",
        RetryNotInStatusCode: value.noRetry ? value?.noRetryConfiguration?.statusCode || "" : "",
        RetryWaitSeconds: value.retryWaitSeconds,
        RetryMaxWaitSeconds: value.retryMaxWaitSeconds,

        // redirect config
        NoFollowRedirect: value.noFollowRedirect,
        FollowJSRedirect: value.followJSRedirect,
        RedirectTimes: value.redirectCount,

        // dnsConfig
        DNSServers: value.dnsServers,
        EtcHosts: value.etcHosts,
        // Set variable
        Params: (value.params || [])
            .filter((ele) => ele.Key || ele.Value)
            .map((ele) => ({
                Key: ele.Key,
                Value: ele.Value,
                Type: ele.Type
            })),
        MutateMethods: [],
        //Matcher
        Matchers: value.matchers,
        MatchersCondition: value.matchersCondition,
        HitColor: value.filterMode === "onlyMatch" ? value.hitColor : "",
        //Extractor
        Extractors: value.extractors
    }

    let mutateMethods: any[] = []
    const getArr = (value.methodGet || []).filter((ele) => ele.Key || ele.Value)
    const postArr = (value.methodPost || []).filter((ele) => ele.Key || ele.Value)
    const headersArr = (value.headers || []).filter((ele) => ele.Key || ele.Value)
    const cookieArr = (value.cookie || []).filter((ele) => ele.Key || ele.Value)
    if (getArr.length) {
        mutateMethods.push({
            Type: "Get",
            Value: getArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }
    if (postArr.length) {
        mutateMethods.push({
            Type: "Post",
            Value: postArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }
    if (headersArr.length) {
        mutateMethods.push({
            Type: "Headers",
            Value: headersArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }
    if (cookieArr.length) {
        mutateMethods.push({
            Type: "Cookie",
            Value: cookieArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }

    fuzzerRequests.MutateMethods = mutateMethods

    return fuzzerRequests
}

export const newWebFuzzerTab = (isHttps: boolean, request: string, openFlag?: boolean) => {
    return ipcRenderer
        .invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: isHttps, request: request, openFlag}
        })
        .then(() => {
            openFlag === false && info("Send succeeded")
        })
}

/**@description Insert yak.fuzz syntax */
export const onInsertYakFuzzer = (reqEditor: IMonacoEditor) => {
    const m = showYakitModal({
        title: "Fuzzer Tag debug tool",
        width: "70%",
        footer: null,
        subTitle: "Debug mode for generating or modifying Payload, use in Web Fuzzer after debugging",
        content: (
            <div style={{padding: 24}}>
                <StringFuzzer
                    advanced={true}
                    disableBasicMode={true}
                    insertCallback={(template: string) => {
                        if (!template) {
                            Modal.warn({
                                title: "Payload empty / Fuzz template empty"
                            })
                        } else {
                            if (reqEditor && template) {
                                reqEditor.trigger("keyboard", "type", {
                                    text: template
                                })
                            } else {
                                Modal.error({
                                    title: "BUG: Editor failure"
                                })
                            }
                            m.destroy()
                        }
                    }}
                    close={() => m.destroy()}
                />
            </div>
        )
    })
}

export interface FuzzerCacheDataProps {
    proxy: string[]
    dnsServers: string[]
    etcHosts: KVPair[]
    advancedConfigShow: AdvancedConfigShowProps | null
    resNumlimit: number
}
/**Retrieve advanced fuzzer config: proxy, dnsServers, etcHosts, resLimit*/
export const getFuzzerCacheData: () => Promise<FuzzerCacheDataProps> = () => {
    return new Promise(async (resolve, rejects) => {
        try {
            const proxy = await getRemoteValue(WEB_FUZZ_PROXY)
            const dnsServers = await getRemoteValue(WEB_FUZZ_DNS_Server_Config)
            const etcHosts = await getRemoteValue(WEB_FUZZ_DNS_Hosts_Config)
            const advancedConfigShow = await getRemoteValue(RemoteGV.WebFuzzerAdvancedConfigShow)
            const resNumlimit = await getRemoteValue(RemoteGV.FuzzerResMaxNumLimit)
            const value: FuzzerCacheDataProps = {
                proxy: !!proxy ? proxy.split(",") : [],
                dnsServers: !!dnsServers ? JSON.parse(dnsServers) : [],
                etcHosts: !!etcHosts ? JSON.parse(etcHosts) : [],
                advancedConfigShow: !!advancedConfigShow ? JSON.parse(advancedConfigShow) : null,
                resNumlimit: !!resNumlimit ? JSON.parse(resNumlimit) : DefFuzzerTableMaxData
            }
            resolve(value)
        } catch (error) {
            rejects(error)
        }
    })
}

export interface SelectOptionProps {
    label: string
    value: string
}

/*To prevent data issues from file cross-referencing, place common variables of HTTPFuzzerPage in app\renderer\src\main\src\defaultConstants\HTTPFuzzerPage.ts */
const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })
    const [advancedConfigValue, setAdvancedConfigValue] = useState<AdvancedConfigValueProps>(
        initWebFuzzerPageInfo().advancedConfigValue
    ) //  For new page creation, store initial advanced config values in data center, so page's advanced config values can be directly obtained from data center via page id

    // Hide advanced configuration/Show
    const [advancedConfigShow, setAdvancedConfigShow] = useState<AdvancedConfigShowProps>({
        ...(initWebFuzzerPageInfo().advancedConfigShow || defaultAdvancedConfigShow)
    })

    // Toggle "Configuration"】/【"Rule" advanced content display type
    const [advancedConfigShowType, setAdvancedConfigShowType] = useState<WebFuzzerType>("config")
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>()
    const [affixSearch, setAffixSearch] = useState("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState("")

    const [currentSelectId, setCurrentSelectId] = useState<number>() // Id of record selected in history
    /**@name Refresh proxy list in advanced config */
    const [droppedCount, setDroppedCount] = useState(0)

    // state
    const [loading, setLoading] = useState(false)

    /*
     * Content
     * */
    const [_firstResponse, setFirstResponse, getFirstResponse] = useGetState<FuzzerResponse>(emptyFuzzer)
    const [successFuzzer, setSuccessFuzzer] = useState<FuzzerResponse[]>([])
    const [failedFuzzer, setFailedFuzzer] = useState<FuzzerResponse[]>([])
    const [_successCount, setSuccessCount, getSuccessCount] = useGetState(0)
    const [_failedCount, setFailedCount, getFailedCount] = useGetState(0)

    /**/

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    // editor Response
    const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useState<boolean>(false) // Response shows matches and extractors
    const [showExtra, setShowExtra] = useState<boolean>(false) // Response shows payload and extracted content
    const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)
    // second Node
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)
    const [showSuccess, setShowSuccess] = useState(true)
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()

    // Matching And Extraction
    const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
    const [activeKey, setActiveKey] = useState<string>("")

    const requestRef = useRef<string>(initWebFuzzerPageInfo().request)
    const {setSubscribeClose, getSubscribeClose} = useSubscribeClose()
    const fuzzerRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(fuzzerRef)

    const hotPatchCodeRef = useRef<string>("")
    const hotPatchCodeWithParamGetterRef = useRef<string>("")

    const proxyListRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [fuzzerTableMaxData, setFuzzerTableMaxData] = useState<number>(DefFuzzerTableMaxData)
    const fuzzerTableMaxDataRef = useRef<number>(fuzzerTableMaxData)

    useEffect(() => {
        fuzzerTableMaxDataRef.current = fuzzerTableMaxData
    }, [fuzzerTableMaxData])

    useEffect(() => {
        getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
            .then((data) => {
                setShowResponseInfoSecondEditor(data === "false" ? false : true)
            })
            .catch(() => {
                setShowResponseInfoSecondEditor(true)
            })
        emiter.on("onSetAdvancedConfigShow", onSetAdvancedConfigShow)
        return () => {
            emiter.off("onSetAdvancedConfigShow", onSetAdvancedConfigShow)
        }
    }, [])
    useEffect(() => {
        if (inViewport) {
            onRefWebFuzzerValue()
            emiter.on("onRefWebFuzzer", onRefWebFuzzerValue)
            emiter.on("onSwitchTypeWebFuzzerPage", onFuzzerAdvancedConfigShowType)
        }
        return () => {
            emiter.off("onRefWebFuzzer", onRefWebFuzzerValue)
            emiter.off("onSwitchTypeWebFuzzerPage", onFuzzerAdvancedConfigShowType)
        }
    }, [inViewport])
    /**Show advanced configuration/Hide "Sequence" tab without following operations*/
    const onSetAdvancedConfigShow = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            const {type} = value
            if (type === "sequence") return
            const c = !advancedConfigShow[type]
            const newValue = {
                ...advancedConfigShow,
                [type]: c
            }
            setAdvancedConfigShow(newValue)
            setRemoteValue(RemoteGV.WebFuzzerAdvancedConfigShow, JSON.stringify(newValue))
            emiter.emit("onGetFuzzerAdvancedConfigShow", JSON.stringify({type: advancedConfigShowType, checked: c}))
        } catch (error) {}
    })
    const onRefWebFuzzerValue = useMemoizedFn(() => {
        if (!inViewport) return
        getRemoteValue(WEB_FUZZ_HOTPATCH_CODE).then((remoteData) => {
            if (!remoteData) {
                return
            }
            setHotPatchCode(`${remoteData}`)
        })
        getRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE).then((remoteData) => {
            if (!!remoteData) {
                setHotPatchCodeWithParamGetter(`${remoteData}`)
            }
        })
        onUpdateRequest()
        onUpdateAdvancedConfigValue()
    })
    /**
     * @description Toggle display of advanced configuration content
     * Type switch between rules and configuration, unrelated to sequence
     * */
    const onFuzzerAdvancedConfigShowType = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            setAdvancedConfigShowType(value.type)
        } catch (error) {}
    })
    /**Update request package */
    const onUpdateRequest = useMemoizedFn(() => {
        if (!inViewport) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        const newRequest = currentItem.pageParamsInfo.webFuzzerPageInfo?.request
        if (!newRequest) return
        if (requestRef.current === newRequest) return
        requestRef.current = newRequest || defaultPostTemplate
        refreshRequest()
    })
    /**Get the latest advanced config data from data center, currently only for extractors and matchers */
    const onUpdateAdvancedConfigValue = useMemoizedFn(() => {
        if (!inViewport) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        let newAdvancedConfigValue = currentItem.pageParamsInfo.webFuzzerPageInfo?.advancedConfigValue
        if (!newAdvancedConfigValue) return
        setAdvancedConfigValue({...newAdvancedConfigValue})
    })

    useEffect(() => {
        if (getSubscribeClose(YakitRoute.HTTPFuzzer)) return
        setSubscribeClose(YakitRoute.HTTPFuzzer, {
            close: {
                title: "Close tip",
                content: "Closing a first-level menu closes all its second-level menus?",
                onOkText: "fail: Execution Failed",
                onCancelText: "Cancel",
                onOk: (m) => onCloseTab(m)
            }
        })
    }, [])

    const onCloseTab = useMemoizedFn((m) => {
        ipcRenderer
            .invoke("send-close-tab", {
                router: YakitRoute.HTTPFuzzer
            })
            .then(() => {
                m.destroy()
            })
    })

    // Keep unique data in array
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    const isSaveFuzzerLabelFun = useMemoizedFn(() => {
        // Default common tag store
        ipcRenderer.invoke("QueryFuzzerLabel").then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
            const {Data} = data
            if (Array.isArray(Data) && Data.length === 0) {
                ipcRenderer.invoke("SaveFuzzerLabel", {
                    Data: defaultLabel
                })
                // Cache tag count for adding tag descriptions
                setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: defaultLabel.length}))
            } else {
                // Fetch cached innate tags
                let oldFixedArr: string[] = []
                // Fetch latest innate tags
                let newFixedArr: string[] = defaultLabel.map((item) => item.DefaultDescription)
                Data.forEach((item) => {
                    if (item.DefaultDescription.endsWith("-fixed")) {
                        oldFixedArr.push(item.DefaultDescription)
                    }
                })
                let arr: string[] = filterNonUnique([...oldFixedArr, ...newFixedArr])
                arr.forEach((item) => {
                    // Items to add
                    if (newFixedArr.includes(item)) {
                        ipcRenderer.invoke("SaveFuzzerLabel", {
                            Data: defaultLabel.filter((itemIn) => itemIn.DefaultDescription === item)
                        })
                    }
                    // Items to delete
                    else {
                        ipcRenderer.invoke("DeleteFuzzerLabel", {
                            Hash: Data.filter((itemIn) => itemIn.DefaultDescription === item)[0].Hash
                        })
                    }
                })
            }
        })
    })

    useEffect(() => {
        // Incompatibility in this refactor means first page entry clears data
        getRemoteValue("IS_DELETE_FUZZ_LABEL").then((remoteData) => {
            if (!remoteData) {
                ipcRenderer
                    .invoke("DeleteFuzzerLabel", {})
                    .then(() => {
                        isSaveFuzzerLabelFun()
                    })
                    .catch((err) => {
                        failed(`Failed to clear old data：${err}`)
                    })
                setRemoteValue("IS_DELETE_FUZZ_LABEL", JSON.stringify({isDelete: false}))
                return
            }
            isSaveFuzzerLabelFun()
        })
    }, [])

    // 3 Hours Ago
    const resetResponse = useMemoizedFn(() => {
        setFirstResponse({...emptyFuzzer})
        setSuccessFuzzer([])
        setRedirectedResponse(undefined)
        setFailedFuzzer([])
        setSuccessCount(0)
        setFailedCount(0)
        setRuntimeId("")
        setFuzzerTableMaxData(DefFuzzerTableMaxData)
    })

    // Restore from history
    useEffect(() => {
        if (!historyTask) {
            return
        }
        if (historyTask.Request === "") {
            requestRef.current = Uint8ArrayToString(historyTask.RequestRaw, "utf8")
        } else {
            requestRef.current = historyTask.Request
        }
        setAdvancedConfigValue({
            ...advancedConfigValue,
            isHttps: historyTask.IsHTTPS,
            isGmTLS: historyTask.IsGmTLS,
            proxy: historyTask.Proxy ? historyTask.Proxy.split(",") : []
        })
        refreshRequest()
    }, [historyTask])
    const retryRef = useRef<boolean>(false)
    const matchRef = useRef<boolean>(false)

    const refreshRequest = useMemoizedFn(() => {
        setRefreshTrigger(!refreshTrigger)
    })

    const loadHistory = useMemoizedFn((id: number) => {
        resetResponse()
        setHistoryTask(undefined)
        setLoading(true)
        setDroppedCount(0)
        setFuzzerTableMaxData(advancedConfigValue.resNumlimit)
        ipcRenderer.invoke("HTTPFuzzer", {HistoryWebFuzzerId: id}, tokenRef.current).then(() => {
            ipcRenderer
                .invoke("GetHistoryHTTPFuzzerTask", {Id: id})
                .then((data: {OriginRequest: HistoryHTTPFuzzerTask}) => {
                    setHistoryTask(data.OriginRequest)
                    setCurrentSelectId(id)
                })
        })
    })
    const responseViewerRef = useRef<MatcherAndExtractionRefProps>({
        validate: () => new Promise(() => {})
    })

    const onValidateHTTPFuzzer = useMemoizedFn(() => {
        if (showMatcherAndExtraction && responseViewerRef.current) {
            responseViewerRef.current
                .validate()
                .then((data: MatcherAndExtractionValueProps) => {
                    setAdvancedConfigValue({
                        ...advancedConfigValue,
                        filterMode: data.matcher.filterMode || "drop",
                        hitColor: data.matcher.hitColor || "red",
                        matchersCondition: data.matcher.matchersCondition || "and",
                        matchers: data.matcher.matchersList || [],
                        extractors: data.extractor.extractorList || []
                    })
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        submitToHTTPFuzzer()
                    }, 200)
                })
        } else {
            submitToHTTPFuzzer()
        }
    })

    const getFuzzerRequestParams = useMemoizedFn(() => {
        return {
            ...advancedConfigValueToFuzzerRequests(advancedConfigValue),
            RequestRaw: Buffer.from(requestRef.current, "utf8"), // StringToUint8Array(request, "utf8"),
            HotPatchCode: hotPatchCodeRef.current,
            HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetterRef.current,
            FuzzerTabIndex: props.id
        }
    })

    const submitToHTTPFuzzer = useMemoizedFn(() => {
        resetResponse()
        // Clear historical task marker
        setHistoryTask(undefined)

        //  Update default search
        setDefaultResponseSearch(affixSearch)

        setLoading(true)
        setDroppedCount(0)

        // FuzzerRequestProps
        const httpParams: FuzzerRequestProps = getFuzzerRequestParams()
        if (advancedConfigValue.proxy && advancedConfigValue.proxy.length > 0) {
            getProxyList(advancedConfigValue.proxy)
        }
        setRemoteValue(WEB_FUZZ_PROXY, `${advancedConfigValue.proxy}`)
        setRemoteValue(WEB_FUZZ_DNS_Server_Config, JSON.stringify(httpParams.DNSServers))
        setRemoteValue(WEB_FUZZ_DNS_Hosts_Config, JSON.stringify(httpParams.EtcHosts))
        setRemoteValue(RemoteGV.FuzzerResMaxNumLimit, JSON.stringify(advancedConfigValue.resNumlimit))
        setFuzzerTableMaxData(advancedConfigValue.resNumlimit)
        if (retryRef.current) {
            retryRef.current = false
            const retryTaskID = failedFuzzer.length > 0 ? failedFuzzer[0].TaskId : undefined
            if (retryTaskID) {
                const params = {...httpParams, RetryTaskID: parseInt(retryTaskID + "")}
                const retryParams = _.omit(params, ["Request", "RequestRaw"])
                ipcRenderer.invoke("HTTPFuzzer", retryParams, tokenRef.current)
                setIsPause(true)
            }
        } else if (matchRef.current) {
            matchRef.current = false
            const matchTaskID = successFuzzer.length > 0 ? successFuzzer[0].TaskId : undefined
            const params = {...httpParams, ReMatch: true, HistoryWebFuzzerId: matchTaskID}
            ipcRenderer.invoke("HTTPFuzzer", params, tokenRef.current)
        } else {
            ipcRenderer.invoke("HTTPFuzzer", httpParams, tokenRef.current)
        }
    })

    const getProxyList = useMemoizedFn((proxyList) => {
        if (proxyListRef.current) {
            proxyListRef.current.onSetRemoteValues(proxyList)
        }
    })

    const [isPause, setIsPause] = useState<boolean>(true) // Pause or resume request flag
    const resumeAndPause = useMemoizedFn(async () => {
        try {
            if (!taskIDRef.current) return
            await ipcRenderer.invoke(
                "HTTPFuzzer",
                {PauseTaskID: taskIDRef.current, IsPause: isPause, SetPauseStatus: true},
                tokenRef.current
            )
            setLoading(!isPause)
            setIsPause(!isPause)
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    // Button in request sending state
    const isbuttonIsSendReqStatus = useMemo(() => {
        return !loading && isPause
    }, [loading, isPause])

    const cancelCurrentHTTPFuzzer = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", tokenRef.current)
    })
    const dCountRef = useRef<number>(0)
    const tokenRef = useRef<string>(randomString(60))
    const taskIDRef = useRef<string>("")
    const [showAllDataRes, setShowAllDataRes] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    useEffect(() => {
        const token = tokenRef.current

        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`

        /*
         * successCount
         * failedCount
         * */
        let successCount = 0
        let failedCount = 0
        ipcRenderer.on(errToken, (e, details) => {
            yakitNotify("error", `Submit fuzz testing request failed ${details}`)
        })
        let successBuffer: FuzzerResponse[] = []
        let failedBuffer: FuzzerResponse[] = []

        let count: number = 0 // For data item request field

        const updateData = () => {
            if (count <= 0) {
                return
            }

            if (failedBuffer.length + successBuffer.length + failedCount + successCount === 0) {
                return
            }

            setSuccessFuzzer([...successBuffer])
            setFailedFuzzer([...failedBuffer])
            setFailedCount(failedCount)
            setSuccessCount(successCount)
        }

        ipcRenderer.on(dataToken, (e: any, data: any) => {
            taskIDRef.current = data.TaskId
            setRuntimeId(data.RuntimeID)

            if (count === 0) {
                // Reset extractedMap
                reset()
            }

            if (onIsDropped(data)) return

            const r = {
                // 6.16
                ...data,
                Headers: data.Headers || [],
                UUID: data.UUID || randomString(16), // New yakit version, both successful and failed data have UUID, old version failed data doesn't have UUID, compatible
                Count: count++,
                cellClassName: data.MatchedByMatcher
                    ? `color-opacity-bg-${data.HitColor} color-text-${data.HitColor} color-font-weight-${data.HitColor}`
                    : ""
            } as FuzzerResponse

            // Set the first response
            if (getFirstResponse().RequestRaw.length === 0) {
                setFirstResponse(r)
            }

            if (data.Ok) {
                successCount++
                successBuffer.push(r)
                // Exceeded max display, showing latest data
                if (successBuffer.length > fuzzerTableMaxDataRef.current) {
                    successBuffer.shift()
                }
            } else {
                failedCount++
                failedBuffer.push(r)
            }
        })

        ipcRenderer.on(endToken, () => {
            updateData()
            successBuffer = []
            failedBuffer = []
            count = 0
            successCount = 0
            failedCount = 0
            dCountRef.current = 0
            taskIDRef.current = ""
            setTimeout(() => {
                setIsPause(true)
                setLoading(false)
                getTotal()
            }, 500)
        })

        const updateDataId = setInterval(() => {
            updateData()
        }, 300)

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzer", token)
            clearInterval(updateDataId)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    const [extractedMap, {setAll, reset}] = useMap<string, string>()
    useEffect(() => {
        ipcRenderer.on(
            "fetch-extracted-to-table",
            (e: any, data: {type: string; extractedMap: Map<string, string>}) => {
                if (data.type === "fuzzer") {
                    setExtractedMap(data.extractedMap)
                }
            }
        )
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

    const [yakitWindowVisible, setYakitWindowVisible] = useState<boolean>(false)
    const [menuExecutorParams, setMenuExecutorParams] = useState<{text?: string; scriptName: string}>()

    const openAIByChatCS = useMemoizedFn((obj: {text?: string; scriptName: string}) => {
        emiter.emit("onRunChatcsAIByFuzzer", JSON.stringify(obj))
    })

    // Decide to open ChatCS-AI plugin execution/Global network configuration third-party app frame
    const onFuzzerModal = useMemoizedFn((value) => {
        const val: {text?: string; scriptName: string; pageId: string; isAiPlugin: boolean} = JSON.parse(value)
        apiGetGlobalNetworkConfig().then((obj: GlobalNetworkConfig) => {
            if (props.id === val.pageId) {
                const configType = obj.AppConfigs.map((item) => item.Type).filter((item) =>
                    ["openai", "chatglm", "moonshot"].includes(item)
                )
                // If configured, open execution box
                if (configType.length > 0 && val.isAiPlugin) {
                    openAIByChatCS({text: val.text, scriptName: val.scriptName})
                } else if (val.isAiPlugin) {
                    let m = showYakitModal({
                        title: "Add Third-Party App",
                        width: 600,
                        footer: null,
                        closable: true,
                        maskClosable: false,
                        content: (
                            <div style={{margin: 24}}>
                                <ThirdPartyApplicationConfigForm
                                    onAdd={(e) => {
                                        let existed = false
                                        const existedResult = (obj.AppConfigs || []).map((i) => {
                                            if (i.Type === e.Type) {
                                                existed = true
                                                return {...i, ...e}
                                            }
                                            return {...i}
                                        })
                                        if (!existed) {
                                            existedResult.push(e)
                                        }
                                        const params = {...obj, AppConfigs: existedResult}
                                        apiSetGlobalNetworkConfig(params).then(() => {
                                            openAIByChatCS({text: val.text, scriptName: val.scriptName})
                                            // setYakitWindowVisible(true)
                                            // setMenuExecutorParams({text:val.text,scriptName:val.scriptName})
                                            m.destroy()
                                        })
                                    }}
                                    onCancel={() => m.destroy()}
                                />
                            </div>
                        )
                    })
                } else {
                    setYakitWindowVisible(true)
                    setMenuExecutorParams({text: val.text, scriptName: val.scriptName})
                }
            }
        })
    })

    useEffect(() => {
        // YakitWindow
        emiter.on("onOpenFuzzerModal", onFuzzerModal)
        return () => {
            emiter.off("onOpenFuzzerModal", onFuzzerModal)
        }
    }, [])

    const setExtractedMap = useMemoizedFn((extractedMap: Map<string, string>) => {
        if (inViewport) setAll(extractedMap)
    })
    const onlyOneResponse = useMemo(() => {
        return !loading && failedFuzzer.length + successFuzzer.length === 1
    }, [loading, failedFuzzer, successFuzzer])

    /**@returns bool false no discarded data, true has discarded data */
    const onIsDropped = useMemoizedFn((data) => {
        if (advancedConfigValue.matchers?.length > 0) {
            // Set matchers
            const hit = data["MatchedByMatcher"] === true
            // Packet loss conditions：
            //   1. Hit filter and filter mode set to discard
            //   2. Missed filter, filter mode set to keep
            if (
                (hit && advancedConfigValue.filterMode === "drop") ||
                (!hit && advancedConfigValue.filterMode === "match")
            ) {
                // Discard unmatched content
                dCountRef.current++
                setDroppedCount(dCountRef.current)
                return true
            }
            return false
        }
        return false
    })

    const sendFuzzerSettingInfo = useDebounceFn(
        () => {
            // 23.7.10 Latest saves only isHttps, actualHost, and request
            const webFuzzerPageInfo: WebFuzzerPageInfoProps = {
                pageId: props.id,
                advancedConfigValue,
                request: requestRef.current,
                advancedConfigShow
            }
            onUpdateFuzzerSequenceDueToDataChanges(props.id || "", webFuzzerPageInfo)
        },
        {wait: 500}
    ).run
    useUpdateEffect(() => {
        sendFuzzerSettingInfo()
    }, [advancedConfigValue])

    /**
     * Page data updated due to serialization of fuzzer sequence
     */
    const onUpdateFuzzerSequenceDueToDataChanges = useMemoizedFn((key: string, param: WebFuzzerPageInfoProps) => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, key)
        if (!currentItem) return
        const newCurrentItem: PageNodeItemProps = {
            ...currentItem,
            pageParamsInfo: {
                webFuzzerPageInfo: {
                    ...(currentItem.pageParamsInfo?.webFuzzerPageInfo || {}),
                    pageId: param.pageId,
                    advancedConfigValue: {
                        ...param.advancedConfigValue
                    },
                    advancedConfigShow: {
                        ...(param.advancedConfigShow as AdvancedConfigShowProps)
                    },
                    request: param.request
                }
            }
        }
        updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
    })

    const hotPatchTrigger = useMemoizedFn(() => {
        let m = showYakitModal({
            title: null,
            width: "80%",
            footer: null,
            maskClosable: false,
            closable: false,
            hiddenHeader: true,
            style: {top: "10%"},
            keyboard: false,
            content: (
                <HTTPFuzzerHotPatch
                    initialHotPatchCode={hotPatchCodeRef.current}
                    initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                    onInsert={(tag) => {
                        if (webFuzzerNewEditorRef.current.reqEditor)
                            monacoEditorWrite(webFuzzerNewEditorRef.current.reqEditor, tag)
                        m.destroy()
                    }}
                    onSaveCode={(code) => {
                        setHotPatchCode(code)
                        setRemoteValue(WEB_FUZZ_HOTPATCH_CODE, code)
                    }}
                    onSaveHotPatchCodeWithParamGetterCode={(code) => {
                        setHotPatchCodeWithParamGetter(code)
                        setRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                    }}
                    onCancel={() => m.destroy()}
                />
            )
        })
    })
    const getShareContent = useMemoizedFn((callback) => {
        const advancedConfiguration = {...advancedConfigValue}
        delete advancedConfiguration.batchTarget
        const params: ShareValueProps = {
            advancedConfigShow,
            request: requestRef.current,
            advancedConfiguration: advancedConfiguration
        }
        callback(params)
    })

    const cachedTotal = successFuzzer.length + failedFuzzer.length
    const [currentPage, setCurrentPage] = useState<number>(0)
    const [total, setTotal] = useState<number>()
    /**Get the previous one/Next */
    const getList = useMemoizedFn((pageInt: number) => {
        setLoading(true)
        const params = {
            FuzzerTabIndex: props.id,
            Pagination: {Page: pageInt, Limit: 1}
        }
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", params)
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTotal(data.Total)
                if (data.Data.length > 0) {
                    loadHistory(data.Data[0].BasicInfo.Id)
                }
            })
            .catch((err) => {
                failed("Load failed:" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const onPrePage = useMemoizedFn(() => {
        if (!isbuttonIsSendReqStatus || currentPage === 0 || currentPage === 1) {
            return
        }
        setCurrentPage(currentPage - 1)
        getList(currentPage - 1)
    })
    const onNextPage = useMemoizedFn(() => {
        if (!Number(total)) return
        if (!isbuttonIsSendReqStatus) return
        if (currentPage >= Number(total)) {
            return
        }
        setCurrentPage(currentPage + 1)
        getList(currentPage + 1)
    })

    useEffect(() => {
        getTotal()
    }, [])

    const getTotal = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", {
                FuzzerTabIndex: props.id,
                Pagination: {Page: 1, Limit: 1}
            })
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTotal(data.Total)
            })
    })

    const webFuzzerNewEditorRef = useRef<any>()

    /**
     * @@description Retrieve Form values from advanced config
     */
    const onGetFormValue = useMemoizedFn((val: AdvancedConfigValueProps) => {
        const newValue: AdvancedConfigValueProps = {
            ...val,
            hitColor: val.hitColor || "red",
            fuzzTagMode: val.fuzzTagMode === undefined ? "standard" : val.fuzzTagMode,
            fuzzTagSyncIndex: !!val.fuzzTagSyncIndex,
            minDelaySeconds: val.minDelaySeconds ? Number(val.minDelaySeconds) : 0,
            maxDelaySeconds: val.maxDelaySeconds ? Number(val.maxDelaySeconds) : 0,
            repeatTimes: val.repeatTimes ? Number(val.repeatTimes) : 0
        }
        setAdvancedConfigValue(newValue)
    })

    const httpResponse: FuzzerResponse = useMemo(() => {
        return redirectedResponse ? redirectedResponse : getFirstResponse()
    }, [redirectedResponse, getFirstResponse()])
    /**First data returned from multiple */
    const multipleReturnsHttpResponse: FuzzerResponse = useMemo(() => {
        return successFuzzer.length > 0 ? successFuzzer[0] : emptyFuzzer
    }, [successFuzzer])

    const [exportData, setExportData] = useState<FuzzerResponse[]>([])
    const onShowResponseMatcherAndExtraction = useMemoizedFn((activeType: MatchingAndExtraction, activeKey: string) => {
        setShowMatcherAndExtraction(true)
        setActiveType(activeType)
        setActiveKey(activeKey)
    })
    const setHotPatchCode = useMemoizedFn((v: string) => {
        hotPatchCodeRef.current = v
    })
    const setHotPatchCodeWithParamGetter = useMemoizedFn((v: string) => {
        hotPatchCodeWithParamGetterRef.current = v
    })
    const onSetRequest = useMemoizedFn((i: string) => {
        requestRef.current = i
        sendFuzzerSettingInfo()
    })
    const onInsertYakFuzzerFun = useMemoizedFn(() => {
        if (webFuzzerNewEditorRef.current) onInsertYakFuzzer(webFuzzerNewEditorRef.current.reqEditor)
    })
    const checkRedirect = useMemo(() => {
        const arr = httpResponse?.Headers || []
        for (let index = 0; index < arr.length; index++) {
            const element = arr[index]
            if (element.Header === "Location") {
                return true
            }
        }
        return false
    }, [httpResponse])

    const [firstFull, setFirstFull] = useState<boolean>(false)
    const [secondFull, setSecondFull] = useState<boolean>(false)
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (secondFull) {
            p.firstRatio = "0%"
        }
        if (firstFull) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [firstFull, secondFull])

    const firstNodeExtra = () => (
        <>
            <div className={styles["fuzzer-firstNode-extra"]}>
                <div className={styles["fuzzer-flipping-pages"]}>
                    <ChevronLeftIcon
                        className={classNames(styles["chevron-icon"], {
                            [styles["chevron-icon-disable"]]:
                                !isbuttonIsSendReqStatus || currentPage === 0 || currentPage === 1
                        })}
                        onClick={() => onPrePage()}
                    />
                    <ChevronRightIcon
                        className={classNames(styles["chevron-icon"], {
                            [styles["chevron-icon-disable"]]:
                                !isbuttonIsSendReqStatus || currentPage >= Number(total) || !Number(total)
                        })}
                        onClick={() => onNextPage()}
                    />
                </div>
                <PacketScanButton
                    packetGetter={() => {
                        return {
                            httpRequest: StringToUint8Array(requestRef.current),
                            https: advancedConfigValue.isHttps
                        }
                    }}
                />
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={async () => {
                        if (!requestRef.current) return
                        const beautifyValue = await prettifyPacketCode(requestRef.current)
                        onSetRequest(Uint8ArrayToString(beautifyValue as Uint8Array, "utf8"))
                        refreshRequest()
                    }}
                >
                    Beautify
                </YakitButton>
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={() => {
                        hotPatchTrigger()
                    }}
                >
                    Hot reload
                </YakitButton>
                <YakitPopover
                    trigger={"click"}
                    content={
                        <div style={{width: 400}}>
                            <Form
                                layout={"vertical"}
                                onFinish={(v) => {
                                    setAdvancedConfigValue({
                                        ...advancedConfigValue,
                                        isHttps: false
                                    })
                                    ipcRenderer
                                        .invoke("Codec", {
                                            ...v
                                        })
                                        .then((e) => {
                                            if (e?.Result) {
                                                requestRef.current = e.Result
                                                if (v.Text.includes("https://")) {
                                                    setAdvancedConfigValue({
                                                        ...advancedConfigValue,
                                                        isHttps: true
                                                    })
                                                }
                                                refreshRequest()
                                            }
                                        })
                                        .catch((e) => {
                                            failed(e.message)
                                        })
                                        .finally(() => {})
                                }}
                                size={"small"}
                            >
                                <Form.Item name='Type' initialValue='packet-from-url'>
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        options={[
                                            {
                                                value: "packet-from-url",
                                                label: "URL"
                                            },
                                            {
                                                value: "packet-from-curl",
                                                label: "cURL"
                                            }
                                        ]}
                                    />
                                </Form.Item>
                                <Form.Item name='Text'>
                                    <YakitInput size='small' />
                                </Form.Item>
                                <Form.Item style={{marginBottom: 8, marginTop: 8}}>
                                    <YakitButton type={"primary"} htmlType={"submit"}>
                                        Construct request
                                    </YakitButton>
                                </Form.Item>
                            </Form>
                        </div>
                    }
                >
                    <YakitButton size={"small"} type={"primary"}>
                        Construct request
                    </YakitButton>
                </YakitPopover>
            </div>
            <div className={styles["resize-card-icon"]} onClick={() => setFirstFull(!firstFull)}>
                {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
            </div>
        </>
    )

    const secondNodeTitle = () => {
        let isShow: boolean = true
        if (+(secondNodeSize?.width || 0) < 700 && (getSuccessCount() > 999 || getFailedCount() > 999)) isShow = false

        return (
            <>
                {isShow && (
                    <span style={{marginRight: 8, fontSize: 12, fontWeight: 500, color: "#31343f"}}>Responses</span>
                )}
                <SecondNodeTitle
                    cachedTotal={cachedTotal}
                    onlyOneResponse={onlyOneResponse}
                    rsp={httpResponse}
                    successFuzzerLength={getSuccessCount()}
                    failedFuzzerLength={getFailedCount()}
                    showSuccess={showSuccess}
                    setShowSuccess={(v) => {
                        setShowSuccess(v)
                        setQuery(undefined)
                    }}
                />
            </>
        )
    }

    const matchSubmitFun = useMemoizedFn(() => {
        matchRef.current = true
        setRedirectedResponse(undefined)
        sendFuzzerSettingInfo()
        onValidateHTTPFuzzer()
        getNewCurrentPage()
    })

    const secondNodeExtra = () => (
        <>
            <SecondNodeExtra
                onlyOneResponse={onlyOneResponse}
                cachedTotal={cachedTotal}
                rsp={httpResponse}
                valueSearch={affixSearch}
                onSearchValueChange={(value) => {
                    setAffixSearch(value)
                    if (value === "" && defaultResponseSearch !== "") {
                        setDefaultResponseSearch("")
                    }
                }}
                onSearch={() => {
                    setDefaultResponseSearch(affixSearch)
                }}
                successFuzzer={successFuzzer}
                failedFuzzer={failedFuzzer}
                secondNodeSize={secondNodeSize}
                query={query}
                setQuery={(q) => setQuery({...q})}
                sendPayloadsType='fuzzer'
                setShowExtra={setShowExtra}
                showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                showSuccess={showSuccess}
                retrySubmit={() => {
                    if (failedFuzzer.length > 0) {
                        retryRef.current = true
                        setRedirectedResponse(undefined)
                        sendFuzzerSettingInfo()
                        onValidateHTTPFuzzer()
                        getNewCurrentPage()
                    }
                }}
                isShowMatch={!loading}
                matchSubmit={() => {
                    if (advancedConfigValue.matchers.length > 0) {
                        matchSubmitFun()
                    } else {
                        emiter.emit("onOpenMatchingAndExtractionCard", props.id)
                    }
                }}
                extractedMap={extractedMap}
                pageId={props.id}
                noPopconfirm={isbuttonIsSendReqStatus}
                retryNoPopconfirm={!(!loading && !isPause)}
                cancelCurrentHTTPFuzzer={cancelCurrentHTTPFuzzer}
                resumeAndPause={resumeAndPause}
            />
            <div className={styles["resize-card-icon"]} onClick={() => setSecondFull(!secondFull)}>
                {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
            </div>
        </>
    )

    const getNewCurrentPage = useMemoizedFn(() => {
        const params = {
            Pagination: {Limit: 1, Order: "", OrderBy: "", Page: 1},
            Keyword: "",
            FuzzerTabIndex: props.id
        }
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", params)
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setCurrentPage(Number(data.Total) + 1)
            })
    })

    // Jump to plugin debug page
    const handleSkipPluginDebuggerPage = async (tempType: "path" | "raw") => {
        const requests = getFuzzerRequestParams()
        const params = {
            Requests: {Requests: Array.isArray(requests) ? requests : [getFuzzerRequestParams()]},
            TemplateType: tempType
        }
        try {
            const {Status, YamlContent} = await ipcRenderer.invoke("ExportHTTPFuzzerTaskToYaml", params)
            if (Status.Ok) {
                ipcRenderer.invoke("send-to-tab", {
                    type: "**debug-plugin",
                    data: {generateYamlTemplate: true, YamlContent}
                })
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }
    const advancedConfigVisible = useCreation(() => {
        switch (advancedConfigShowType) {
            case "config":
                return advancedConfigShow.config
            case "rule":
                return advancedConfigShow.rule
            default:
                return false
        }
    }, [advancedConfigShowType, advancedConfigShow])
    return (
        <>
            <div className={styles["http-fuzzer-body"]} ref={fuzzerRef} style={{display: showAllDataRes ? "none" : ""}}>
                <React.Suspense fallback={<>Loading...</>}>
                    <HttpQueryAdvancedConfig
                        advancedConfigValue={advancedConfigValue}
                        visible={advancedConfigVisible}
                        onInsertYakFuzzer={onInsertYakFuzzerFun}
                        onValuesChange={onGetFormValue}
                        defaultHttpResponse={Uint8ArrayToString(multipleReturnsHttpResponse.ResponseRaw) || ""}
                        outsideShowResponseMatcherAndExtraction={
                            onlyOneResponse && !!Uint8ArrayToString(httpResponse.ResponseRaw)
                        }
                        onShowResponseMatcherAndExtraction={onShowResponseMatcherAndExtraction}
                        inViewportCurrent={inViewport === true}
                        id={props.id}
                        matchSubmitFun={matchSubmitFun}
                        showFormContentType={advancedConfigShowType}
                        proxyListRef={proxyListRef}
                        isbuttonIsSendReqStatus={isbuttonIsSendReqStatus}
                    />
                </React.Suspense>
                <div className={styles["http-fuzzer-page"]}>
                    <div className={styles["fuzzer-heard"]}>
                        <div className={styles["fuzzer-heard-left"]}>
                            {!loading ? (
                                <>
                                    {!isPause ? (
                                        <YakitButton
                                            onClick={resumeAndPause}
                                            icon={<SolidPlayIcon />}
                                            type={"primary"}
                                            size='large'
                                        >
                                            Continue
                                        </YakitButton>
                                    ) : (
                                        <YakitButton
                                            onClick={() => {
                                                setRedirectedResponse(undefined)
                                                sendFuzzerSettingInfo()
                                                onValidateHTTPFuzzer()
                                                getNewCurrentPage()
                                            }}
                                            icon={<PaperAirplaneIcon />}
                                            type={"primary"}
                                            size='large'
                                        >
                                            Send request
                                        </YakitButton>
                                    )}
                                </>
                            ) : (
                                <>
                                    <YakitButton
                                        disabled={cachedTotal <= 1}
                                        onClick={resumeAndPause}
                                        icon={<SolidPauseIcon />}
                                        type={"primary"}
                                        size='large'
                                    >
                                        Pause
                                    </YakitButton>
                                    <YakitButton
                                        onClick={() => {
                                            cancelCurrentHTTPFuzzer()
                                        }}
                                        icon={<StopIcon />}
                                        type={"primary"}
                                        colors='danger'
                                        size='large'
                                        style={{marginLeft: -8}}
                                    >
                                        Just Input
                                    </YakitButton>
                                </>
                            )}
                            <div className={styles["fuzzer-heard-force"]}>
                                <span className={styles["fuzzer-heard-https"]}>Force HTTPS</span>
                                <YakitCheckbox
                                    checked={advancedConfigValue.isHttps}
                                    onChange={(e) =>
                                        setAdvancedConfigValue({...advancedConfigValue, isHttps: e.target.checked})
                                    }
                                />
                            </div>
                            {/*<div className={styles["fuzzer-heard-force"]}>*/}
                            {/*    <span className={styles["fuzzer-heard-https"]}>SM2 TLS</span>*/}
                            {/*    <YakitCheckbox*/}
                            {/*        checked={advancedConfigValue.isGmTLS}*/}
                            {/*        onChange={(e) =>*/}
                            {/*            setAdvancedConfigValue({...advancedConfigValue, isGmTLS: e.target.checked})*/}
                            {/*        }*/}
                            {/*    />*/}
                            {/*</div>*/}
                            <Divider type='vertical' style={{margin: 0, top: 1}} />
                            <div className={styles["display-flex"]}>
                                <Popover
                                    trigger={"click"}
                                    placement={"leftTop"}
                                    destroyTooltipOnHide={true}
                                    content={
                                        <div style={{width: 400}}>
                                            <HTTPFuzzerHistorySelector
                                                currentSelectId={currentSelectId}
                                                onSelect={(e, page, showAll) => {
                                                    cancelCurrentHTTPFuzzer()
                                                    if (!showAll) setCurrentPage(page)
                                                    loadHistory(e)
                                                }}
                                                onDeleteAllCallback={() => {
                                                    setCurrentPage(0)
                                                    getTotal()
                                                }}
                                                fuzzerTabIndex={props.id}
                                            />
                                        </div>
                                    }
                                >
                                    <YakitButton type='text' icon={<ClockIcon />} style={{padding: "4px 0px"}}>
                                        History
                                    </YakitButton>
                                </Popover>
                            </div>
                            <div
                                className={styles["blasting-example"]}
                                onClick={() => {
                                    const m = showYakitModal({
                                        type: "white",
                                        title: "WebFuzzer blasting animation demo",
                                        width: 480,
                                        content: <BlastingAnimationAemonstration></BlastingAnimationAemonstration>,
                                        footer: null,
                                        centered: true,
                                        destroyOnClose: true
                                    })
                                }}
                            >
                                Blasting example
                                <QuestionMarkCircleIcon />
                            </div>
                            {loading && (
                                <div className={classNames(styles["spinning-text"], styles["display-flex"])}>
                                    <YakitSpin size={"small"} style={{width: "auto"}} />
                                    sending packets
                                </div>
                            )}

                            {onlyOneResponse && httpResponse.Ok && checkRedirect && (
                                <YakitButton
                                    onClick={() => {
                                        setLoading(true)
                                        const redirectRequestProps: RedirectRequestParams = {
                                            Request: requestRef.current,
                                            Response: new Buffer(httpResponse.ResponseRaw).toString("utf8"),
                                            IsHttps: advancedConfigValue.isHttps,
                                            IsGmTLS: advancedConfigValue.isGmTLS,
                                            PerRequestTimeoutSeconds: advancedConfigValue.timeout,
                                            Proxy: advancedConfigValue.proxy.join(","),
                                            Extractors: advancedConfigValue.extractors,
                                            Matchers: advancedConfigValue.matchers,
                                            MatchersCondition: advancedConfigValue.matchersCondition,
                                            HitColor:
                                                advancedConfigValue.filterMode === "onlyMatch"
                                                    ? advancedConfigValue.hitColor
                                                    : "",
                                            Params: advancedConfigValue.params || []
                                        }
                                        ipcRenderer
                                            .invoke("RedirectRequest", redirectRequestProps)
                                            .then((rsp: FuzzerResponse) => {
                                                setRedirectedResponse(rsp)
                                            })
                                            .catch((e) => {
                                                failed(`"ERROR in: ${e}"`)
                                            })
                                            .finally(() => {
                                                setTimeout(() => setLoading(false), 300)
                                            })
                                    }}
                                    type='outline2'
                                >
                                    Follow redirects
                                </YakitButton>
                            )}
                            <FuzzerExtraShow
                                droppedCount={droppedCount}
                                advancedConfigValue={advancedConfigValue}
                                onlyOneResponse={onlyOneResponse}
                                httpResponse={httpResponse}
                            />
                        </div>
                        <div className={styles["fuzzer-heard-right"]}>
                            <ShareImportExportData
                                module='fuzzer'
                                getShareContent={getShareContent}
                                getFuzzerRequestParams={getFuzzerRequestParams}
                            />
                            <Divider type='vertical' style={{margin: 8}} />
                            <YakitDropdownMenu
                                menu={{
                                    data: [
                                        {key: "pathTemplate", label: "Generate as Path template"},
                                        {key: "rawTemplate", label: "Generate as Raw template"}
                                    ],
                                    onClick: ({key}) => {
                                        switch (key) {
                                            case "pathTemplate":
                                                handleSkipPluginDebuggerPage("path")
                                                break
                                            case "rawTemplate":
                                                handleSkipPluginDebuggerPage("raw")
                                                break
                                            default:
                                                break
                                        }
                                    }
                                }}
                                dropdown={{
                                    trigger: ["click"],
                                    placement: "bottom"
                                }}
                            >
                                <YakitButton type='primary' icon={<OutlineCodeIcon />}>
                                    Generate Yaml template
                                </YakitButton>
                            </YakitDropdownMenu>
                        </div>
                    </div>
                    <YakitResizeBox
                        firstMinSize={380}
                        secondMinSize={480}
                        isShowDefaultLineStyle={false}
                        style={{overflow: "hidden"}}
                        lineStyle={{display: firstFull || secondFull ? "none" : ""}}
                        secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                        firstNodeStyle={{padding: secondFull ? 0 : undefined, display: secondFull ? "none" : ""}}
                        {...ResizeBoxProps}
                        firstNode={
                            <WebFuzzerNewEditor
                                ref={webFuzzerNewEditorRef}
                                refreshTrigger={refreshTrigger}
                                request={requestRef.current}
                                setRequest={onSetRequest}
                                isHttps={advancedConfigValue.isHttps}
                                hotPatchCode={hotPatchCodeRef.current}
                                hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                                setHotPatchCode={setHotPatchCode}
                                setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                                firstNodeExtra={firstNodeExtra}
                            />
                        }
                        secondNode={
                            <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                                {onlyOneResponse ? (
                                    <ResponseViewer
                                        isHttps={advancedConfigValue.isHttps}
                                        ref={responseViewerRef}
                                        fuzzerResponse={httpResponse}
                                        defaultResponseSearch={defaultResponseSearch}
                                        system={props.system}
                                        showMatcherAndExtraction={showMatcherAndExtraction}
                                        setShowMatcherAndExtraction={setShowMatcherAndExtraction}
                                        showExtra={showExtra}
                                        setShowExtra={setShowExtra}
                                        matcherValue={{
                                            hitColor: advancedConfigValue.hitColor || "red",
                                            matchersCondition: advancedConfigValue.matchersCondition || "and",
                                            matchersList: advancedConfigValue.matchers || [],
                                            filterMode: advancedConfigValue.filterMode || "drop"
                                        }}
                                        extractorValue={{
                                            extractorList: advancedConfigValue.extractors || []
                                        }}
                                        defActiveKey={activeKey}
                                        defActiveType={activeType}
                                        onSaveMatcherAndExtraction={(matcher, extractor) => {
                                            setAdvancedConfigValue({
                                                ...advancedConfigValue,
                                                filterMode: matcher.filterMode,
                                                hitColor: matcher.hitColor || "red",
                                                matchersCondition: matcher.matchersCondition,
                                                matchers: matcher.matchersList,
                                                extractors: extractor.extractorList
                                            })
                                        }}
                                        webFuzzerValue={StringToUint8Array(requestRef.current)}
                                        showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                                        setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                                        secondNodeTitle={secondNodeTitle}
                                        secondNodeExtra={secondNodeExtra}
                                    />
                                ) : (
                                    <div
                                        className={classNames(styles["resize-card"], styles["resize-card-second"])}
                                        style={{display: firstFull ? "none" : ""}}
                                    >
                                        <div className={classNames(styles["resize-card-heard"])}>
                                            <div className={styles["resize-card-heard-title"]}>{secondNodeTitle()}</div>
                                            <div className={styles["resize-card-heard-extra"]}></div>
                                            {secondNodeExtra()}
                                        </div>
                                        {cachedTotal >= 1 ? (
                                            <>
                                                {showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        // onSendToWebFuzzer={onSendToWebFuzzer}
                                                        success={showSuccess}
                                                        data={successFuzzer}
                                                        setExportData={setExportData}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        extractedMap={extractedMap}
                                                        isEnd={loading}
                                                        pageId={props.id}
                                                        moreLimtAlertMsg={
                                                            <div style={{fontSize: 12}}>
                                                                Response quantity exceeds{fuzzerTableMaxData}
                                                                ，To reduce frontend rendering load, some data packets will be discarded, please click
                                                                <YakitButton
                                                                    type='text'
                                                                    onClick={() => {
                                                                        setShowAllDataRes(true)
                                                                    }}
                                                                    style={{padding: 0}}
                                                                >
                                                                    View All
                                                                </YakitButton>
                                                                View all data
                                                            </div>
                                                        }
                                                        tableKeyUpDownEnabled={!showAllDataRes}
                                                        fuzzerTableMaxData={fuzzerTableMaxData}
                                                    />
                                                )}
                                                {!showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        success={showSuccess}
                                                        data={failedFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        isEnd={loading}
                                                        extractedMap={extractedMap}
                                                        pageId={props.id}
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <Result
                                                status={"warning"}
                                                title={"Edit and send an HTTP request on the left/Fuzz testing"}
                                                subTitle={
                                                    "Optimized display for results from multiple HTTP requests in fuzz testing, can auto-identify single/Multirequest display"
                                                }
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        }
                    />
                </div>
                {fuzzerRef.current && (
                    <YakitWindow
                        getContainer={fuzzerRef.current}
                        title='Execution result'
                        visible={yakitWindowVisible}
                        contentStyle={{padding: 0}}
                        width={600}
                        footerStyle={{display: "none"}}
                        defaultDockSide={["shrink", "left", "right", "bottom"]}
                        firstDockSide='shrink'
                        onCancel={() => {
                            setYakitWindowVisible(false)
                            setMenuExecutorParams(undefined)
                        }}
                        onOk={() => {}}
                    >
                        {menuExecutorParams && (
                            <ContextMenuExecutor
                                scriptName={menuExecutorParams.scriptName}
                                text={menuExecutorParams.text}
                            />
                        )}
                    </YakitWindow>
                )}
            </div>
            <React.Suspense fallback={<>loading...</>}>
                <ResponseAllDataCard
                    runtimeId={runtimeId}
                    showAllDataRes={showAllDataRes}
                    setShowAllDataRes={() => setShowAllDataRes(false)}
                />
            </React.Suspense>
        </>
    )
}
export default HTTPFuzzerPage

export interface ContextMenuProp {
    text?: string
    scriptName: string
}
/** @name Custom right-click menu component */
export const ContextMenuExecutor: React.FC<ContextMenuProp> = (props) => {
    const {scriptName, text} = props

    const [loading, setLoading] = useState<boolean>(true)
    const [value, setValue] = useState<string>("")
    useEffect(() => {
        ipcRenderer
            .invoke("Codec", {Text: text, ScriptName: scriptName})
            .then((result: {Result: string}) => {
                setValue(result.Result)
            })
            .catch((e) => {
                yakitNotify("error", `Codec ${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }, [])

    return (
        <YakitSpin spinning={loading} style={{width: "100%", height: "100%"}}>
            <div style={{height: "100%"}}>
                <YakitEditor fontSize={14} type={"text"} readOnly={true} value={value} />
            </div>
        </YakitSpin>
    )
}

interface FuzzerExtraShowProps {
    droppedCount: number
    advancedConfigValue: AdvancedConfigValueProps
    onlyOneResponse: boolean
    httpResponse: FuzzerResponse
}
export const FuzzerExtraShow: React.FC<FuzzerExtraShowProps> = React.memo((props) => {
    const {droppedCount, advancedConfigValue, onlyOneResponse, httpResponse} = props
    return (
        <div className={styles["display-flex"]}>
            {droppedCount > 0 && <YakitTag color='danger'>Discarded[{droppedCount}]One response</YakitTag>}
            {advancedConfigValue.proxy.length > 0 && (
                <Tooltip title={advancedConfigValue.proxy}>
                    <YakitTag className={classNames(styles["proxy-text"], "content-ellipsis")}>
                        Proxy：{advancedConfigValue.proxy.join(",")}
                    </YakitTag>
                </Tooltip>
            )}
            {advancedConfigValue.actualHost && (
                <YakitTag color='danger' className={classNames(styles["actualHost-text"], "content-ellipsis")}>
                    Actual host:{advancedConfigValue.actualHost}
                </YakitTag>
            )}
            {onlyOneResponse && (
                <>
                    {httpResponse.MatchedByMatcher && <YakitTag color='success'>Match succeeded</YakitTag>}
                    {!httpResponse.MatchedByMatcher && advancedConfigValue.matchers?.length > 0 && (
                        <YakitTag color='danger'>Match failed</YakitTag>
                    )}
                </>
            )}
        </div>
    )
})
interface SecondNodeExtraProps {
    rsp: FuzzerResponse
    onlyOneResponse: boolean
    cachedTotal: number
    valueSearch: string
    onSearchValueChange: (s: string) => void
    onSearch: () => void
    successFuzzer: FuzzerResponse[]
    failedFuzzer: FuzzerResponse[]
    secondNodeSize?: Size
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    sendPayloadsType: string
    size?: YakitButtonProp["size"]
    setShowExtra: (b: boolean) => void
    showResponseInfoSecondEditor: boolean
    setShowResponseInfoSecondEditor: (b: boolean) => void
    showSuccess?: boolean
    retrySubmit?: () => void
    isShowMatch?: boolean
    matchSubmit?: () => void
    pageId?: string
    extractedMap?: Map<string, string>
    noPopconfirm?: boolean
    retryNoPopconfirm?: boolean
    cancelCurrentHTTPFuzzer?: () => void
    resumeAndPause?: () => void
}

/**
 * @description Content on right, header extra
 */
export const SecondNodeExtra: React.FC<SecondNodeExtraProps> = React.memo((props) => {
    const {
        rsp,
        onlyOneResponse,
        cachedTotal,
        valueSearch,
        onSearchValueChange,
        onSearch,
        successFuzzer,
        failedFuzzer,
        secondNodeSize,
        query,
        setQuery,
        sendPayloadsType,
        size = "small",
        setShowExtra,
        showResponseInfoSecondEditor,
        setShowResponseInfoSecondEditor,
        showSuccess = true,
        retrySubmit,
        isShowMatch = false,
        matchSubmit,
        extractedMap,
        pageId,
        noPopconfirm = true,
        retryNoPopconfirm = true,
        cancelCurrentHTTPFuzzer,
        resumeAndPause
    } = props

    const [color, setColor] = useState<string[]>()
    const [keyWord, setKeyWord] = useState<string>()
    const [statusCode, setStatusCode] = useState<string[]>()
    const [bodyLength, setBodyLength] = useState<HTTPFuzzerPageTableQuery>({
        afterBodyLength: undefined,
        beforeBodyLength: undefined
        // bodyLengthUnit: "B"
    })

    const [responseExtractorVisible, setResponseExtractorVisible] = useState<boolean>(false)
    const bodyLengthRef = useRef<any>()

    useEffect(() => {
        setStatusCode(query?.StatusCode)
        setKeyWord(query?.keyWord)
        setColor(query?.Color)
        setBodyLength({
            afterBodyLength: query?.afterBodyLength,
            beforeBodyLength: query?.beforeBodyLength
            // bodyLengthUnit: query?.bodyLengthUnit || "B"
        })
    }, [query])

    // Export data callback
    useEffect(() => {
        emiter.on("onGetExportFuzzerCallBack", onGetExportFuzzerCallBackEvent)
        return () => {
            emiter.off("onGetExportFuzzerCallBack", onGetExportFuzzerCallBackEvent)
        }
    }, [])

    const onGetExportFuzzerCallBackEvent = useMemoizedFn((v) => {
        try {
            const obj: {listTable: any; type: "all" | "payload"; pageId: string} = JSON.parse(v)
            if (obj.pageId === pageId) {
                const {listTable, type} = obj
                const newListTable = listTable.map((item) => ({
                    ...item,
                    RequestRaw: StringToUint8Array(item.RequestRaw),
                    ResponseRaw: StringToUint8Array(item.ResponseRaw)
                }))
                if (type === "all") {
                    exportHTTPFuzzerResponse(newListTable, extractedMap)
                } else {
                    exportPayloadResponse(newListTable)
                }
            }
        } catch (error) {}
    })

    // const onViewExecResults = useMemoizedFn(() => {
    //     showYakitModal({
    //         title: "Extraction result",
    //         width: "60%",
    //         footer: <></>,
    //         content: <ExtractionResultsContent list={rsp.ExtractedResults} />
    //     })
    // })

    if (onlyOneResponse) {
        const searchNode = (
            <YakitInput.Search
                size='small'
                placeholder='Enter response locator'
                value={valueSearch}
                onChange={(e) => {
                    const {value} = e.target
                    onSearchValueChange(value)
                }}
                style={{maxWidth: 200}}
                onSearch={() => onSearch()}
                onPressEnter={(e) => {
                    e.preventDefault()
                    onSearch()
                }}
            />
        )
        return (
            <div className={styles["fuzzer-secondNode-extra"]}>
                {!rsp.IsTooLargeResponse ? (
                    <>
                        {+(secondNodeSize?.width || 0) >= 610 && searchNode}
                        {+(secondNodeSize?.width || 0) < 610 && (
                            <YakitPopover content={searchNode}>
                                <YakitButton icon={<SearchIcon />} size={size} type='outline2' />
                            </YakitPopover>
                        )}
                        <Divider type='vertical' style={{margin: 0, top: 1}} />
                        <ChromeSvgIcon
                            className={styles["extra-chrome-btn"]}
                            onClick={() => {
                                showResponseViaResponseRaw(rsp.ResponseRaw || "")
                            }}
                        />
                        {((rsp.Payloads && rsp.Payloads.length > 0) ||
                            rsp.ExtractedResults.filter((i) => i.Key !== "" || i.Value !== "").length > 0) && (
                            <YakitButton type='outline2' size={size} onClick={() => setShowExtra(true)}>
                                View extraction result
                            </YakitButton>
                        )}
                    </>
                ) : (
                    <YakitDropdownMenu
                        menu={{
                            data: [
                                {key: "tooLargeResponseHeaderFile", label: "View Header"},
                                {key: "tooLargeResponseBodyFile", label: "View Body"}
                            ],
                            onClick: ({key}) => {
                                switch (key) {
                                    case "tooLargeResponseHeaderFile":
                                        ipcRenderer
                                            .invoke("is-file-exists", rsp.TooLargeResponseHeaderFile)
                                            .then((flag: boolean) => {
                                                if (flag) {
                                                    openABSFileLocated(rsp.TooLargeResponseHeaderFile)
                                                } else {
                                                    failed("Target file no longer exists!")
                                                }
                                            })
                                            .catch(() => {})
                                        break
                                    case "tooLargeResponseBodyFile":
                                        ipcRenderer
                                            .invoke("is-file-exists", rsp.TooLargeResponseBodyFile)
                                            .then((flag: boolean) => {
                                                if (flag) {
                                                    openABSFileLocated(rsp.TooLargeResponseBodyFile)
                                                } else {
                                                    failed("Target file no longer exists!")
                                                }
                                            })
                                            .catch(() => {})
                                        break
                                    default:
                                        break
                                }
                            }
                        }}
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottom"
                        }}
                    >
                        <YakitButton type='primary' size='small'>
                            Full response
                        </YakitButton>
                    </YakitDropdownMenu>
                )}
                <YakitButton
                    type='primary'
                    onClick={() => {
                        analyzeFuzzerResponse(rsp)
                    }}
                    size={size}
                >
                    Details
                </YakitButton>
                <Tooltip title={showResponseInfoSecondEditor ? "Hide response info" : "Show response info"}>
                    <YakitButton
                        type='text2'
                        size='small'
                        icon={<OutlineAnnotationIcon />}
                        isActive={showResponseInfoSecondEditor}
                        onClick={() => {
                            setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                            setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                        }}
                    />
                </Tooltip>
            </div>
        )
    }
    if (!onlyOneResponse && cachedTotal > 1 && showSuccess) {
        const searchNode = (
            <YakitInput.Search
                size={size === "small" ? "small" : "middle"}
                placeholder='Data Analysis'
                value={keyWord}
                onChange={(e) => {
                    setKeyWord(e.target.value)
                }}
                style={{minWidth: 130}}
                onSearch={(v) => {
                    setQuery({
                        ...query,
                        keyWord: v
                    })
                    setKeyWord(v)
                }}
                onPressEnter={(e) => {
                    e.preventDefault()
                    setQuery({
                        ...query,
                        keyWord: keyWord
                    })
                }}
            />
        )

        return (
            <div className={styles["fuzzer-secondNode-extra"]}>
                {+(secondNodeSize?.width || 0) >= 700 && searchNode}
                {+(secondNodeSize?.width || 0) < 700 && (
                    <YakitPopover
                        content={searchNode}
                        onVisibleChange={(b) => {
                            if (!b) {
                                setQuery({
                                    ...query,
                                    keyWord: keyWord
                                })
                            }
                        }}
                    >
                        <YakitButton
                            icon={<OutlineSearchIcon />}
                            size={size}
                            type='outline2'
                            isHover={!!query?.keyWord}
                        />
                    </YakitPopover>
                )}
                <YakitPopover
                    content={
                        <div className={styles["second-node-search-content"]}>
                            <div className={styles["second-node-search-item"]}>
                                <span>Mark color</span>
                                <YakitSelect
                                    size='small'
                                    mode='tags'
                                    options={availableColors.map((i) => ({value: i.color, label: i.render}))}
                                    allowClear
                                    value={color}
                                    onChange={setColor}
                                ></YakitSelect>
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>Status code</span>
                                <YakitSelect
                                    value={statusCode}
                                    onChange={setStatusCode}
                                    size='small'
                                    mode='tags'
                                    allowClear
                                    options={[
                                        {
                                            value: "100-200",
                                            label: "100-200"
                                        },
                                        {
                                            value: "200-300",
                                            label: "200-300"
                                        },
                                        {
                                            value: "300-400",
                                            label: "300-400"
                                        },
                                        {
                                            value: "400-500",
                                            label: "400-500"
                                        },
                                        {
                                            value: "500-600",
                                            label: "500-600"
                                        }
                                    ]}
                                />
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>Response size</span>
                                <BodyLengthInputNumber
                                    ref={bodyLengthRef}
                                    query={bodyLength}
                                    setQuery={() => {}}
                                    showFooter={false}
                                />
                            </div>
                        </div>
                    }
                    onVisibleChange={(b) => {
                        if (!b) {
                            const l = bodyLengthRef?.current?.getValue() || {}
                            setQuery({
                                ...l,
                                keyWord: keyWord,
                                StatusCode: statusCode,
                                Color: color
                            })
                        }
                    }}
                >
                    <YakitButton
                        icon={<OutlineFilterIcon />}
                        size={size}
                        type='outline2'
                        isHover={
                            !!(
                                (query?.StatusCode?.length || 0) > 0 ||
                                query?.afterBodyLength ||
                                query?.beforeBodyLength ||
                                (query?.Color?.length || 0) > 0
                            )
                        }
                    />
                </YakitPopover>

                <Divider type='vertical' style={{margin: 0, top: 1}} />

                {isShowMatch && (
                    <>
                        {+(secondNodeSize?.width || 0) >= 610 ? (
                            <>
                                {noPopconfirm ? (
                                    <YakitButton
                                        type='outline2'
                                        size={size}
                                        onClick={() => {
                                            matchSubmit && matchSubmit()
                                        }}
                                    >
                                        Match only
                                    </YakitButton>
                                ) : (
                                    <YakitPopconfirm
                                        title={"Operation only matches will end pause state, confirm operation？"}
                                        onConfirm={() => {
                                            cancelCurrentHTTPFuzzer && cancelCurrentHTTPFuzzer()
                                            matchSubmit && matchSubmit()
                                        }}
                                        placement='top'
                                    >
                                        <YakitButton type='outline2' size={size}>
                                            Match only
                                        </YakitButton>
                                    </YakitPopconfirm>
                                )}
                            </>
                        ) : (
                            <>
                                {noPopconfirm ? (
                                    <Tooltip title='Match only'>
                                        <YakitButton
                                            type='outline2'
                                            size={size}
                                            icon={<OutlinePlugsIcon />}
                                            onClick={() => {
                                                matchSubmit && matchSubmit()
                                            }}
                                        />
                                    </Tooltip>
                                ) : (
                                    <YakitPopconfirm
                                        title={"Operation only matches will end pause state, confirm operation？"}
                                        onConfirm={() => {
                                            cancelCurrentHTTPFuzzer && cancelCurrentHTTPFuzzer()
                                            matchSubmit && matchSubmit()
                                        }}
                                        placement='top'
                                    >
                                        <Tooltip title='Match only'>
                                            <YakitButton type='outline2' size={size} icon={<OutlinePlugsIcon />} />
                                        </Tooltip>
                                    </YakitPopconfirm>
                                )}
                            </>
                        )}
                    </>
                )}

                {+(secondNodeSize?.width || 0) >= 610 ? (
                    <YakitButton
                        type='outline2'
                        size={size}
                        onClick={() => {
                            if (successFuzzer.length === 0) {
                                showYakitModal({
                                    title: "No Web Fuzzer Response for information extraction",
                                    content: <></>,
                                    footer: null
                                })
                                return
                            }
                            setResponseExtractorVisible(true)
                        }}
                    >
                        Extract response data
                    </YakitButton>
                ) : (
                    <Tooltip title='Extract response data'>
                        <YakitButton
                            type='outline2'
                            size={size}
                            icon={<OutlineBeakerIcon />}
                            onClick={() => {
                                if (successFuzzer.length === 0) {
                                    showYakitModal({
                                        title: "No Web Fuzzer Response for information extraction",
                                        content: <></>,
                                        footer: null
                                    })
                                    return
                                }
                                setResponseExtractorVisible(true)
                            }}
                        />
                    </Tooltip>
                )}
                {+(secondNodeSize?.width || 0) >= 610 ? (
                    <YakitPopover
                        title={"Export data"}
                        trigger={["click"]}
                        content={
                            <>
                                <Space>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "all"
                                                })
                                            )
                                        }}
                                    >
                                        Export all requests
                                    </YakitButton>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "payload"
                                                })
                                            )
                                        }}
                                    >
                                        Export Payload only
                                    </YakitButton>
                                </Space>
                            </>
                        }
                    >
                        <YakitButton type='outline2' size={size}>
                            Export data
                        </YakitButton>
                    </YakitPopover>
                ) : (
                    <YakitPopover
                        title={"Export data"}
                        trigger={["click"]}
                        content={
                            <>
                                <Space>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "all"
                                                })
                                            )
                                        }}
                                    >
                                        Export all requests
                                    </YakitButton>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "payload"
                                                })
                                            )
                                        }}
                                    >
                                        Export Payload only
                                    </YakitButton>
                                </Space>
                            </>
                        }
                    >
                        <Tooltip title='Export data'>
                            <YakitButton type='outline2' icon={<OutlineExportIcon />} size={size} />
                        </Tooltip>
                    </YakitPopover>
                )}

                <YakitModal
                    title='Extract content from response packets'
                    onCancel={() => setResponseExtractorVisible(false)}
                    visible={responseExtractorVisible}
                    width='80%'
                    maskClosable={false}
                    footer={null}
                    closable={true}
                    bodyStyle={{padding: 0}}
                >
                    <WebFuzzerResponseExtractor responses={successFuzzer} sendPayloadsType={sendPayloadsType} />
                </YakitModal>
            </div>
        )
    }
    if (!onlyOneResponse && cachedTotal > 1 && !showSuccess) {
        return (
            <>
                {retryNoPopconfirm ? (
                    <YakitButton
                        type={"primary"}
                        size='small'
                        onClick={() => {
                            retrySubmit && retrySubmit()
                        }}
                        disabled={failedFuzzer.length === 0}
                    >
                        One-click retry
                    </YakitButton>
                ) : (
                    // <YakitPopconfirm
                    //     title={"Operation one-click retry will end pause state, confirm operation？"}
                    //     onConfirm={() => {
                    //         resumeAndPause && resumeAndPause()
                    //         setTimeout(() => {
                    //             retrySubmit && retrySubmit()
                    //         }, 300)
                    //     }}
                    //     placement='top'
                    // >
                    //     <YakitButton
                    //         type={"primary"}
                    //         size='small'
                    //         disabled={failedFuzzer.length === 0}
                    //     >
                    //         One-click retry
                    //     </YakitButton>
                    // </YakitPopconfirm>
                    <YakitButton type={"primary"} size='small' disabled={true}>
                        One-click retry
                    </YakitButton>
                )}
            </>
        )
    }
    return <></>
})

interface SecondNodeTitleProps {
    cachedTotal: number
    rsp: FuzzerResponse
    onlyOneResponse: boolean
    successFuzzerLength: number
    failedFuzzerLength: number
    showSuccess: boolean
    setShowSuccess: (b: boolean) => void
    size?: YakitButtonProp["size"]
}

/**
 * @description Content on right, header left
 */
export const SecondNodeTitle: React.FC<SecondNodeTitleProps> = React.memo((props) => {
    const {
        cachedTotal,
        rsp,
        onlyOneResponse,
        successFuzzerLength,
        failedFuzzerLength,
        showSuccess,
        setShowSuccess,
        size = "small"
    } = props

    if (onlyOneResponse) {
        if (rsp.IsTooLargeResponse) {
            return (
                <YakitTag style={{marginLeft: 8}} color='danger'>
                    Large response
                </YakitTag>
            )
        }
        return (
            <>
                {rsp.IsHTTPS && <YakitTag>{rsp.IsHTTPS ? "https" : ""}</YakitTag>}
                <YakitTag>
                    {rsp.BodyLength}bytes / {rsp.DurationMs}ms
                </YakitTag>
            </>
        )
    }
    if (cachedTotal > 1) {
        return (
            <div className={styles["second-node-title"]}>
                <YakitRadioButtons
                    size={size === "small" ? "small" : "middle"}
                    value={showSuccess}
                    onChange={(e) => {
                        setShowSuccess(e.target.value)
                    }}
                    buttonStyle='solid'
                    options={[
                        {
                            value: true,
                            label: `Success[${successFuzzerLength > 9999 ? "9999+" : successFuzzerLength}]`
                        },
                        {
                            value: false,
                            label: `Failure[${failedFuzzerLength > 9999 ? "9999+" : failedFuzzerLength}]`
                        }
                    ]}
                />
            </div>
        )
    }
    return <></>
})

export const onAddOverlayWidget = (editor, rsp, isShow?: boolean) => {
    editor.removeOverlayWidget({
        getId() {
            return "monaco.fizz.overlaywidget"
        }
    })
    if (!isShow) return
    const fizzOverlayWidget = {
        getDomNode() {
            const domNode = document.createElement("div")
            createRoot(domNode).render(<EditorOverlayWidget rsp={rsp} />)
            return domNode
        },
        getId() {
            return "monaco.fizz.overlaywidget"
        },
        getPosition() {
            return {
                preference: monaco.editor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER
            }
        }
    }
    editor.addOverlayWidget(fizzOverlayWidget)
}

interface EditorOverlayWidgetProps {
    rsp: FuzzerResponse
}

const EditorOverlayWidget: React.FC<EditorOverlayWidgetProps> = React.memo((props) => {
    const {rsp} = props
    if (!rsp) return <></>
    return (
        <div className={styles["editor-overlay-widget"]}>
            {Number(rsp.DNSDurationMs) > 0 ? <span>DNS time:{rsp.DNSDurationMs}ms</span> : ""}
            {rsp.RemoteAddr && <span>Remote address:{rsp.RemoteAddr}</span>}
            {rsp.Proxy && <span>Proxy:{rsp.Proxy}</span>}
            {Number(rsp.FirstByteDurationMs) > 0 ? <span>Response time:{rsp.FirstByteDurationMs}ms</span> : ""}
            {Number(rsp.TotalDurationMs) > 0 ? <span>Total time spent:{rsp.TotalDurationMs}ms</span> : ""}
            {rsp.Url && <span>URL:{rsp.Url.length > 30 ? rsp.Url.substring(0, 30) + "..." : rsp.Url}</span>}
        </div>
    )
})

interface ResponseViewerProps {
    ref?: React.ForwardedRef<MatcherAndExtractionRefProps>
    fuzzerResponse: FuzzerResponse
    defaultResponseSearch: string
    system?: string
    showMatcherAndExtraction: boolean
    setShowMatcherAndExtraction: (b: boolean) => void
    showExtra: boolean
    setShowExtra: (b: boolean) => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    defActiveKey: string
    defActiveType: MatchingAndExtraction
    onSaveMatcherAndExtraction: (matcherValue: MatcherValueProps, extractorValue: ExtractorValueProps) => void
    webFuzzerValue?: Uint8Array
    isHttps?: boolean

    showResponseInfoSecondEditor: boolean
    setShowResponseInfoSecondEditor: (b: boolean) => void
    secondNodeTitle?: () => JSX.Element
    secondNodeExtra?: () => JSX.Element
}

export const ResponseViewer: React.FC<ResponseViewerProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            fuzzerResponse,
            defaultResponseSearch,
            showExtra,
            setShowExtra,
            extractorValue,
            matcherValue,
            defActiveKey,
            defActiveType,
            onSaveMatcherAndExtraction,
            showResponseInfoSecondEditor,
            setShowResponseInfoSecondEditor,
            isHttps,
            secondNodeTitle,
            secondNodeExtra
        } = props

        const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useControllableValue<boolean>(props, {
            defaultValuePropName: "showMatcherAndExtraction",
            valuePropName: "showMatcherAndExtraction",
            trigger: "setShowMatcherAndExtraction"
        })
        const [reason, setReason] = useState<string>("Unknown reason")

        const [activeKey, setActiveKey] = useState<string>("")
        const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
        useEffect(() => {
            setActiveKey(defActiveKey)
        }, [defActiveKey])
        useEffect(() => {
            setActiveType(defActiveType)
        }, [defActiveType])

        useEffect(() => {
            try {
                let r = "Unknown reason"
                r = fuzzerResponse!.Reason
                setReason(r)
                setShowExtra(
                    (fuzzerResponse.Payloads && fuzzerResponse.Payloads.length > 0) ||
                        fuzzerResponse.ExtractedResults.filter((i) => i.Key !== "" || i.Value !== "").length > 0
                )
            } catch (e) {}
        }, [fuzzerResponse])

        const responseEditorRightMenu: OtherMenuListProps = useMemo(() => {
            return {
                overlayWidgetv: {
                    menu: [
                        {
                            key: "is-show-add-overlay-widgetv",
                            label: showResponseInfoSecondEditor ? "Hide response info" : "Show response info"
                        }
                    ],
                    onRun: () => {
                        setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                        setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                    }
                },
                showMatcherAndExtraction: {
                    menu: [
                        {type: "divider"},
                        {
                            key: "show-matchers",
                            label: "Matcher"
                        },
                        {
                            key: "show-extractors",
                            label: "Extractor"
                        }
                    ],
                    onRun: (editor, key) => {
                        switch (key) {
                            case "show-matchers":
                                setShowMatcherAndExtraction(true)
                                setActiveType("matchers")
                                break
                            case "show-extractors":
                                setShowMatcherAndExtraction(true)
                                setActiveType("extractors")
                                break
                            default:
                                break
                        }
                    }
                }
            }
        }, [showResponseInfoSecondEditor])
        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "100%",
                secondRatio: "0%"
            }
            if (showMatcherAndExtraction) {
                p.secondRatio = "50%"
                p.firstRatio = "50%"
            }
            if (showExtra) {
                p.firstRatio = "80%"
                p.secondRatio = "20%"
            }
            return p
        }, [showMatcherAndExtraction, showExtra])
        const show = useMemo(() => showMatcherAndExtraction || showExtra, [showMatcherAndExtraction, showExtra])
        const otherEditorProps = useCreation(() => {
            const overlayWidget = {
                onAddOverlayWidget: (editor, isShow) => onAddOverlayWidget(editor, fuzzerResponse, isShow)
            }
            return overlayWidget
        }, [fuzzerResponse])
        const onClose = useMemoizedFn(() => {
            setShowMatcherAndExtraction(false)
        })

        // One response editor beautification rendering cache
        const [resTypeOptionVal, setResTypeOptionVal] = useState<RenderTypeOptionVal>()
        useEffect(() => {
            if (fuzzerResponse.ResponseRaw) {
                getRemoteValue(RemoteGV.WebFuzzerOneResEditorBeautifyRender).then((res) => {
                    if (!!res) {
                        setResTypeOptionVal(res)
                    } else {
                        setResTypeOptionVal(undefined)
                    }
                })
            }
        }, [fuzzerResponse])

        return (
            <>
                <YakitResizeBox
                    isVer={true}
                    lineStyle={{display: !show ? "none" : "", background: "#f0f2f5"}}
                    firstNodeStyle={{padding: !show ? 0 : undefined, background: "#f0f2f5"}}
                    firstNode={
                        <NewHTTPPacketEditor
                            language={fuzzerResponse?.DisableRenderStyles ? "text" : undefined}
                            isShowBeautifyRender={!fuzzerResponse?.IsTooLargeResponse}
                            defaultHttps={isHttps}
                            defaultSearchKeyword={defaultResponseSearch}
                            system={props.system}
                            originValue={fuzzerResponse.ResponseRaw}
                            hideSearch={true}
                            isResponse={true}
                            noHex={true}
                            // noHeader={true}
                            showDefaultExtra={false}
                            title={secondNodeTitle && secondNodeTitle()}
                            extraEnd={secondNodeExtra && secondNodeExtra()}
                            editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF_RESPONSE'
                            emptyOr={
                                !fuzzerResponse?.Ok && (
                                    <Result
                                        status={
                                            reason.includes("tcp: i/o timeout") ||
                                            reason.includes("empty response") ||
                                            reason.includes("no such host") ||
                                            reason.includes("cannot create proxy")
                                                ? "warning"
                                                : "error"
                                        }
                                        title={"Request failed or server (proxy) issue"}
                                        // no such host
                                        subTitle={(() => {
                                            const reason = fuzzerResponse?.Reason || "unknown"
                                            if (reason.includes("tcp: i/o timeout")) {
                                                return `Network timeout (check if target host is online？）`
                                            }
                                            if (reason.includes("no such host")) {
                                                return `DNS or host error (check if domain resolves normally？)`
                                            }
                                            if (reason.includes("cannot create proxy")) {
                                                return `Unable to set proxy (check proxy availability)）`
                                            }
                                            if (reason.includes("empty response")) {
                                                return `Server returned no data`
                                            }
                                            return undefined
                                        })()}
                                        style={{height: "100%", backgroundColor: "#fff"}}
                                    >
                                        <>Detailed reason：{fuzzerResponse.Reason}</>
                                    </Result>
                                )
                            }
                            readOnly={true}
                            isAddOverlayWidget={showResponseInfoSecondEditor}
                            contextMenu={responseEditorRightMenu}
                            webFuzzerValue={props.webFuzzerValue}
                            extraEditorProps={{
                                isShowSelectRangeMenu: true
                            }}
                            typeOptionVal={resTypeOptionVal}
                            onTypeOptionVal={(typeOptionVal) => {
                                if (typeOptionVal !== undefined) {
                                    setResTypeOptionVal(typeOptionVal)
                                    setRemoteValue(RemoteGV.WebFuzzerOneResEditorBeautifyRender, typeOptionVal)
                                } else {
                                    setResTypeOptionVal(undefined)
                                    setRemoteValue(RemoteGV.WebFuzzerOneResEditorBeautifyRender, "")
                                }
                            }}
                            {...otherEditorProps}
                        />
                    }
                    secondNode={
                        <>
                            {showMatcherAndExtraction ? (
                                <MatcherAndExtraction
                                    ref={ref}
                                    onClose={onClose}
                                    onSave={onSaveMatcherAndExtraction}
                                    httpResponse={Uint8ArrayToString(fuzzerResponse.ResponseRaw)}
                                    matcherValue={matcherValue}
                                    extractorValue={extractorValue}
                                    defActiveKey={activeKey}
                                    defActiveType={activeType}
                                />
                            ) : (
                                <></>
                            )}
                            {showExtra ? (
                                <ResponseViewerSecondNode
                                    fuzzerResponse={fuzzerResponse}
                                    onClose={() => setShowExtra(false)}
                                />
                            ) : (
                                <></>
                            )}
                        </>
                    }
                    secondNodeStyle={{
                        display: show ? "" : "none",
                        padding: 0,
                        border: "1px solid rgb(240, 240, 240)",
                        borderRadius: "0px 0px 0px 4px"
                    }}
                    lineDirection='bottom'
                    secondMinSize={showMatcherAndExtraction ? 300 : 100}
                    {...ResizeBoxProps}
                />
            </>
        )
    })
)

interface ResponseViewerSecondNodeProps {
    fuzzerResponse: FuzzerResponse
    onClose: () => void
}
type tabType = "payload" | "extractContent"
const ResponseViewerSecondNode: React.FC<ResponseViewerSecondNodeProps> = React.memo((props) => {
    const {fuzzerResponse, onClose} = props
    const [type, setType] = useState<tabType>("payload")
    const option = useMemo(() => {
        return [
            {
                icon: <OutlinePayloadIcon />,
                value: "payload",
                label: "Payload"
            },
            {
                icon: <OutlineBeakerIcon />,
                value: "extractContent",
                label: "Extract content"
            }
        ]
    }, [])
    return (
        <div className={styles["payload-extract-content"]}>
            <div className={styles["payload-extract-content-heard"]}>
                <div className={styles["payload-extract-content-heard-tab"]}>
                    {option.map((item) => (
                        <div
                            key={item.value}
                            className={classNames(styles["payload-extract-content-heard-tab-item"], {
                                [styles["payload-extract-content-heard-tab-item-active"]]: type === item.value
                            })}
                            onClick={() => {
                                setType(item.value as tabType)
                            }}
                        >
                            <span className={styles["tab-icon"]}>{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </div>
                <YakitButton type='text2' icon={<OutlineXIcon />} size='small' onClick={() => onClose()} />
            </div>
            <div className={styles["payload-extract-content-body"]} style={{display: type === "payload" ? "" : "none"}}>
                {fuzzerResponse.Payloads?.map((item, index) => <p key={index}>{item}</p>)}
                {fuzzerResponse.Payloads?.length === 0 && "None available"}
            </div>
            <div
                className={classNames(styles["payload-extract-content-body"], "yakit-descriptions")}
                style={{display: type === "extractContent" ? "" : "none", padding: 0}}
            >
                <Descriptions bordered size='small' column={2}>
                    {fuzzerResponse.ExtractedResults.map((item, index) => (
                        <Descriptions.Item label={<YakitCopyText showText={item.Key} />} span={2} key={index}>
                            {item.Value ? <YakitCopyText showText={item.Value} /> : ""}
                        </Descriptions.Item>
                    ))}
                </Descriptions>

                {fuzzerResponse.ExtractedResults?.length === 0 && "None available"}
            </div>
        </div>
    )
})

// Blasting animation demo
interface BlastingAnimationAemonstrationProps {}
const BlastingAnimationAemonstration: React.FC<BlastingAnimationAemonstrationProps> = React.memo((props) => {
    const [animationType, setAnimationType] = useState<string>("id")

    const [animationResources, setAnimationResources] = useState<string>(blastingIdmp4)

    useEffect(() => {
        if (animationType === "id") {
            setAnimationResources(blastingIdmp4)
        } else if (animationType === "pwd") {
            setAnimationResources(blastingPwdmp4)
        } else if (animationType === "count") {
            setAnimationResources(blastingCountmp4)
        }
    }, [animationType])

    return (
        <div className={styles["blasting-animation-aemonstration"]}>
            <YakitRadioButtons
                size='large'
                buttonStyle='solid'
                value={animationType}
                options={[
                    {
                        value: "id",
                        label: "Blasting ID"
                    },
                    {
                        value: "pwd",
                        label: "Blast passwords"
                    },
                    {
                        value: "count",
                        label: "Blast accounts"
                    }
                ]}
                onChange={(e) => setAnimationType(e.target.value)}
            />
            <div className={styles["animation-cont-wrap"]}>
                <video src={animationResources} autoPlay loop></video>
            </div>
        </div>
    )
})
