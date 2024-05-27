import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {YakitRoute} from "@/routes/newRoute"
import {subscribeWithSelector, persist, StorageValue} from "zustand/middleware"
import debounce from "lodash/debounce"
import {AdvancedConfigShowProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {yakitNotify} from "@/utils/notification"
import {RemoteGV} from "@/yakitGV"
import {setRemoteProjectValue} from "@/utils/kv"
import cloneDeep from "lodash/cloneDeep"
import {createWithEqualityFn} from "zustand/traditional"
import {HybridScanControlAfterRequest, HybridScanModeType} from "@/models/HybridScan"
import {defaultAdvancedConfigValue, defaultPostTemplate} from "@/defaultConstants/HTTPFuzzerPage"

/**
 * @Description Page Temp Data
 * @property {PageNodeItemProps[]} PageNodeList Page Info
 * @property {string} Route Key
 * @property {boolean} SingleNode Is Single Instance, Single Instance Logic Unwritten
 */
export interface PageProps {
    pageList: PageNodeItemProps[]
    routeKey: string
    singleNode: boolean
    currentSelectPageId: string
}

export interface PageNodeItemProps {
    id: string
    routeKey: string
    pageGroupId: string
    pageId: string
    pageName: string
    pageParamsInfo: PageParamsInfoProps
    sortFieId: number
    expand?: boolean
    color?: string
    // pageChildrenList: PageNodeItemProps[]
}

/** Page Saved Data*/
interface PageParamsInfoProps {
    /** YakitRoute.HTTPFuzzer WebFuzzer Page Cache Data */
    webFuzzerPageInfo?: WebFuzzerPageInfoProps
    pluginInfoEditor?: {source: YakitRoute}
    /** YakitRoute.Plugin_Local Local Plugin Page Cache Data */
    pluginLocalPageInfo?: PluginLocalPageInfoProps
    /**YakitRoute.Plugin_Store Plugin Store Page */
    pluginOnlinePageInfo?: PluginOnlinePageInfoProps
    /**Bulk Execution Page */
    pluginBatchExecutorPageInfo?: PluginBatchExecutorPageInfoProps
    /**Targeted Vulnerability Page */
    pocPageInfo?: PocPageInfoProps
    /**Weak Password Page */
    brutePageInfo?: BrutePageInfoProps
    /**Port Scanning Page */
    scanPortPageInfo?: ScanPortPageInfoProps
    /**Space Engine Page */
    spaceEnginePageInfo?: SpaceEnginePageInfoProps
    /**Basic Security Check Page */
    simpleDetectPageInfo?: SimpleDetectPageInfoProps
}

export interface SpaceEnginePageInfoProps {}

export interface SimpleDetectPageInfoProps {}
export interface PluginBatchExecutorPageInfoProps {
    /**Execute Bulk Execution runtimeId */
    runtimeId: string
    /**Default Selected Tab for Bulk Execution Results */
    defaultActiveKey: string
    /**Is HTTPS */
    https: boolean
    /**Selected Data History ID */
    httpFlowIds: []
    /**Request Package */
    request: Uint8Array
    /**Task Execution Status */
    hybridScanMode: HybridScanModeType
}
export interface PluginOnlinePageInfoProps {
    keyword: string
    plugin_type: string
}
export interface PluginLocalPageInfoProps {
    uuid: string
}
export interface WebFuzzerPageInfoProps {
    pageId: string
    advancedConfigValue: AdvancedConfigValueProps
    request: string
    advancedConfigShow?: AdvancedConfigShowProps | null
    //Advanced Config Variable Second-Level Panel Items
    variableActiveKeys?: string[]
}

export interface PocPageInfoProps {
    /** Type 1 Opens Vulnerability Selection, Type 2 Opens POC Page with Data*/
    type?: number
    /**Group Search Selected */
    selectGroup?: string[]
    /**Keyword Search Selected/POC Default Group*/
    selectGroupListByKeyWord?: string[]
    formValue?: HybridScanControlAfterRequest
    /**Is HTTPS */
    https: boolean
    /**Selected Data History ID */
    httpFlowIds: []
    /**Request Package */
    request: Uint8Array
}

export interface BrutePageInfoProps {
    /**Enter Target */
    targets: string
}

export interface ScanPortPageInfoProps {
    /**Enter Target */
    targets: string
}
interface PageInfoStoreProps {
    pages: Map<string, PageProps>

    selectGroupId: Map<string, string>

    /**Set Pages Data, e.g., Fuzzer Page Cache; Close Others in No Group, Keep Current*/
    setPagesData: (key: string, p: PageProps) => void
    /**Set Data in Group, e.g., Close Others in Group */
    setPageNodeInfoByPageGroupId: (key, gId: string, list: PageNodeItemProps[]) => void

    /**Get Page Data Under Group by Group ID */
    getPagesDataByGroupId: (key: string, gId: string) => PageNodeItemProps[]
    /**Get Page Data by ID */
    queryPagesDataById: (key: string, pageId: string) => PageNodeItemProps | undefined
    /**Add Cache Page Data */
    addPagesDataCache: (key: string, v: PageNodeItemProps) => void
    /**Update Cache Page Data */
    updatePagesDataCacheById: (key: string, v: PageNodeItemProps) => void
    /** Delete Page Cache Data*/
    removePagesDataCacheById: (key: string, id: string) => void
    /** Delete Group Data & Its Page Cache by Group ID */
    removePagesDataCacheByGroupId: (key: string, gId: string) => void

    /**Set Selected Group ID in Page */
    setSelectGroupId: (key: string, s: string) => void
    /**Delete Selected Group */
    removeCurrentSelectGroupId: (key: string) => void

    /**Get Tab Name in Selected Group Returns String[] */
    getCurrentGroupAllTabName: (key) => string[]
    /**Get Current Selected Group*/
    getCurrentSelectGroup: (key) => PageNodeItemProps | undefined
    clearAllData: () => void
    clearDataByRoute: (key: string) => void
    /**Keep Only routeKey Data, Delete Others */
    clearOtherDataByRoute: (routeKey: string) => void
    /** Set Active Page ID */
    setCurrentSelectPageId: (routeKey: string, pageId: string) => void
    /** Get Active Page ID */
    getCurrentSelectPageId: (routeKey: string) => string
    /** Get Bulk Execution Page Data by RuntimeId */
    getBatchExecutorByRuntimeId: (pageId: string) => PageNodeItemProps | undefined
}
export const defPage: PageProps = {
    pageList: [],
    routeKey: "",
    singleNode: false,
    currentSelectPageId: ""
}
export const usePageInfo = createWithEqualityFn<PageInfoStoreProps>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                pages: new Map(),
                selectGroupId: new Map(),
                setPagesData: (key, values) => {
                    const newVal = new Map(get().pages).set(key, values)
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                setPageNodeInfoByPageGroupId: (key, groupId, list) => {
                    const newVal = get().pages
                    const current = newVal.get(key) || cloneDeep(defPage)
                    const groupList: PageNodeItemProps[] = current.pageList.filter((ele) => ele.pageGroupId !== groupId)
                    const newGroupList = groupList.concat(list)
                    newVal.set(key, {
                        ...current,
                        pageList: newGroupList
                    })
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                getPagesDataByGroupId: (key, groupId) => {
                    const {pages} = get()
                    const current = pages.get(key) || cloneDeep(defPage)
                    return current.pageList.filter((ele) => ele.pageGroupId === groupId)
                },
                queryPagesDataById: (key, pageId) => {
                    const {pages} = get()
                    const current = pages.get(key) || cloneDeep(defPage)
                    return current.pageList.find((ele) => ele.pageId === pageId)
                },
                getBatchExecutorByRuntimeId: (runtimeId) => {
                    const {pages} = get()
                    const current = pages.get(YakitRoute.BatchExecutorPage) || cloneDeep(defPage)
                    return current.pageList.find(
                        (ele) => ele?.pageParamsInfo?.pluginBatchExecutorPageInfo?.runtimeId === runtimeId
                    )
                },
                addPagesDataCache: (key, value) => {
                    const newVal = get().pages
                    const current = newVal.get(key) || cloneDeep(defPage)
                    current.pageList.push(value)
                    newVal.set(key, {
                        ...current
                    })
                    set({
                        ...get(),
                        pages: new Map(newVal)
                    })
                },
                updatePagesDataCacheById: (key, value) => {
                    const {pages} = get()
                    const current: PageProps = pages.get(key) || cloneDeep(defPage)
                    let updateIndex: number = current.pageList.findIndex((ele) => ele.pageId === value.pageId)
                    if (updateIndex !== -1) {
                        current.pageList[updateIndex] = {
                            ...value
                        }
                        const newVal = pages.set(key, {
                            ...current
                        })
                        set({
                            ...get(),
                            pages: newVal
                        })
                    }
                },
                removePagesDataCacheById: (key, id) => {
                    const newVal = get().pages
                    const current: PageProps = newVal.get(key) || cloneDeep(defPage)
                    const newPageList = current.pageList.filter((ele) => ele.pageId !== id)
                    newVal.set(key, {
                        ...current,
                        pageList: newPageList
                    })
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                removePagesDataCacheByGroupId: (key, gId) => {
                    const newVal = get().pages
                    const current: PageProps = newVal.get(key) || cloneDeep(defPage)
                    const newPageList = current.pageList.filter((ele) => ele.pageGroupId !== gId)
                    newVal.set(key, {
                        ...current,
                        pageList: newPageList
                    })
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                setCurrentSelectGroup: (key, groupId) => {},
                setSelectGroupId: (key, val) => {
                    const selectGroupId = get().selectGroupId
                    selectGroupId.set(key, val)
                    set({
                        ...get(),
                        selectGroupId
                    })
                },
                removeCurrentSelectGroupId: (key) => {
                    const {selectGroupId} = get()
                    if (selectGroupId.size > 0) {
                        selectGroupId.delete(key)
                        set({
                            ...get(),
                            selectGroupId
                        })
                    }
                },
                getCurrentGroupAllTabName: (key) => {
                    const {selectGroupId, pages} = get()
                    const currentGroupId = selectGroupId.get(key)
                    const currentPages: PageProps = pages.get(key) || cloneDeep(defPage)
                    return currentPages.pageList
                        .filter((ele) => ele.pageGroupId === currentGroupId)
                        .map((ele) => ele.pageName)
                },
                getCurrentSelectGroup: (key) => {
                    const {selectGroupId, pages} = get()
                    const currentGroupId = selectGroupId.get(key)
                    const currentPages: PageProps = pages.get(key) || cloneDeep(defPage)
                    return currentPages.pageList.find((ele) => ele.pageGroupId === currentGroupId)
                },
                clearAllData: () => {
                    set({
                        pages: new Map(),
                        selectGroupId: new Map()
                    })
                },
                clearDataByRoute: (key) => {
                    const {selectGroupId, pages} = get()
                    selectGroupId.delete(key)
                    pages.delete(key)
                    set({
                        pages: new Map(pages),
                        selectGroupId: new Map(selectGroupId)
                    })
                },
                clearOtherDataByRoute: (key) => {
                    const {selectGroupId, pages} = get()
                    const newSelectGroupId = selectGroupId.get(key)
                    const newPages = pages.get(key)
                    set({
                        pages: new Map().set(key, newPages),
                        selectGroupId: new Map().set(key, newSelectGroupId)
                    })
                },
                setCurrentSelectPageId: (key, pageId) => {
                    const newPages = get().pages
                    const currentPage = newPages.get(key) || cloneDeep(defPage)
                    newPages.set(key, {
                        ...currentPage,
                        currentSelectPageId: pageId
                    })
                    set({
                        ...get(),
                        pages: newPages
                    })
                },
                getCurrentSelectPageId: (key) => {
                    const {pages} = get()
                    const current = pages.get(key) || cloneDeep(defPage)
                    return current.currentSelectPageId
                }
            }),
            {
                name: "page-info",
                storage: {
                    getItem: async (name: string) => {
                        try {
                            const str = sessionStorage.getItem(name)
                            if (!str) return null
                            const {state} = JSON.parse(str)
                            return {
                                state: {
                                    ...state,
                                    pages: new Map(state.pages),
                                    selectGroupId: new Map(state.selectGroupId)
                                }
                            }
                        } catch (error) {
                            yakitNotify("error", "Page Info Data Parse Error:" + error)
                            return null
                        }
                    },
                    setItem: async (name, value: StorageValue<PageInfoStoreProps>) => {
                        const str = JSON.stringify({
                            state: {
                                ...value.state,
                                pages: Array.from(value.state.pages.entries()),
                                selectGroupId: Array.from(value.state.selectGroupId.entries())
                            }
                        })
                        sessionStorage.setItem(name, str)
                    },
                    removeItem: async (name: string): Promise<void> => {
                        sessionStorage.removeItem(name)
                    }
                }
            }
        )
    ),
    Object.is
)

export const saveFuzzerCache = debounce(
    (selectedState: PageProps) => {
        try {
            const {pageList = []} = selectedState || {
                pageList: []
            }
            const cache = pageList.map((ele) => {
                const advancedConfigValue =
                    ele.pageParamsInfo?.webFuzzerPageInfo?.advancedConfigValue || defaultAdvancedConfigValue
                return {
                    groupChildren: [],
                    groupId: ele.pageGroupId,
                    id: ele.pageId,
                    pageParams: {
                        actualHost: advancedConfigValue.actualHost || "",
                        id: ele.pageId,
                        isHttps: advancedConfigValue.isHttps,
                        request: ele.pageParamsInfo?.webFuzzerPageInfo?.request || defaultPostTemplate,
                        params: advancedConfigValue.params,
                        extractors: advancedConfigValue.extractors
                    },
                    sortFieId: ele.sortFieId,
                    verbose: ele.pageName,
                    expand: ele.expand,
                    color: ele.color
                }
            })
            setRemoteProjectValue(RemoteGV.FuzzerCache, JSON.stringify(cache)).catch((error) => {})
        } catch (error) {
            yakitNotify("error", "WebFuzzer Cache Data Fail:" + error)
        }
    },
    500,
    {leading: true}
)

/**
 * Commented Code Below Explained
 * Fuzzer-Tab Subscription Events, Includes Request, Params, Sequence Group Config
 * Comment Reason：
 * Subscription Starts on Software Launch, Pre-Engine Connect Causes Console Errors
 */
// try {
//     const unFuzzerCacheData = usePageInfo.subscribe(
//         // (state) => state.pages.get(YakitRoute.HTTPFuzzer) || [],
//         (state) => state.pages.get("httpFuzzer") || [], // Circular Ref Causes Dev Env Hot Reload YakitRoute.HTTPFuzzer to be undefined
//         (selectedState, previousSelectedState) => {
//             saveFuzzerCache(selectedState)
//         }
//     )

//     const saveFuzzerCache = debounce(
//         (selectedState: PageProps) => {
//             try {
//                 const {pageList = []} = selectedState || {
//                     pageList: []
//                 }
//                 const cache = pageList.map((ele) => {
//                     const advancedConfigValue =
//                         ele.pageParamsInfo?.webFuzzerPageInfo?.advancedConfigValue || defaultAdvancedConfigValue
//                     return {
//                         groupChildren: [],
//                         groupId: ele.pageGroupId,
//                         id: ele.pageId,
//                         pageParams: {
//                             actualHost: advancedConfigValue.actualHost || "",
//                             id: ele.pageId,
//                             isHttps: advancedConfigValue.isHttps,
//                             request: ele.pageParamsInfo?.webFuzzerPageInfo?.request || defaultPostTemplate,
//                             params: advancedConfigValue.params,
//                             extractors: advancedConfigValue.extractors
//                         },
//                         sortFieId: ele.sortFieId,
//                         verbose: ele.pageName,
//                         expand: ele.expand,
//                         color: ele.color
//                     }
//                 })
//                 // console.log("saveFuzzerCache", cache)
//                 // console.table(pageList)
//                 console.log("cache", cache)
//                 setRemoteProjectValue(RemoteGV.FuzzerCache, JSON.stringify(cache)).catch((error) => {})
//             } catch (error) {
//                 yakitNotify("error", "WebFuzzer Cache Data Fail:" + error)
//             }
//         },
//         500,
//         {leading: true}
//     )
// } catch (error) {
//     yakitNotify("error", "Page-Info Cache Data Error:" + error)
// }
