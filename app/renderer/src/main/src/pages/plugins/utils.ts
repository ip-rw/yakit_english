import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "./baseTemplateType"
import {YakitPluginListOnlineResponse} from "./online/PluginsOnlineType"
import {NetWorkApi, requestConfig} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {info, yakitNotify} from "@/utils/notification"
import {isCommunityEdition} from "@/utils/envfile"
import {compareAsc} from "../yakitStore/viewers/base"
import {
    GetYakScriptGroupResponse,
    GetYakScriptTagsAndTypeResponse,
    GroupCount,
    QueryYakScriptGroupResponse,
    QueryYakScriptRequest,
    QueryYakScriptsResponse,
    ResetYakScriptGroupRequest,
    SaveYakScriptGroupRequest,
    YakScript,
    genDefaultPagination
} from "../invoker/schema"
import emiter from "@/utils/eventBus/eventBus"
import {toolDelInvalidKV} from "@/utils/tool"
import {defaultFilter, defaultSearch, pluginTypeToName} from "./builtInData"
import {YakitRoute} from "@/routes/newRoute"
import {KVPair} from "../httpRequestBuilder/HTTPRequestBuilder"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {
    HybridScanControlAfterRequest,
    HybridScanControlRequest,
    HybridScanModeType,
    HybridScanPluginConfig
} from "@/models/HybridScan"
import cloneDeep from "lodash/cloneDeep"
import {PluginGroupList} from "./local/PluginsLocalType"
import {HTTPRequestParameters} from "@/types/http-api"
import {defPluginBatchExecuteExtraFormValue} from "@/defaultConstants/PluginBatchExecutor"

const {ipcRenderer} = window.require("electron")

/**
 * Local Plugins, Plugin Store, Plugin Management Pages
 * Exclude Deleted Filter Conditions When Switching Pages with Persistent Filters
 * @param oldfilters Current Drum Filters on Page
 * @param newfilters Latest Filters from API
 * @returns realFilter - Current Real Filters on Page updateFilterFlag - Whether to Update Page's filters
 */
export interface ExcludeNoExistfilter {
    realFilter: PluginFilterParams
    updateFilterFlag: boolean
}
export const excludeNoExistfilter = (
    oldfilters: PluginFilterParams,
    newfilters: PluginGroupList[]
): ExcludeNoExistfilter => {
    let updateFilterFlag = false
    let realFilter: PluginFilterParams = structuredClone(oldfilters)
    Object.keys(oldfilters).forEach((key) => {
        oldfilters[key].forEach((item: API.PluginsSearchData) => {
            const value = item.value
            newfilters.forEach((item2) => {
                if (item2.groupKey === key) {
                    updateFilterFlag = item2.data.findIndex((item3) => item3.value === value) === -1
                    if (updateFilterFlag) {
                        realFilter = {
                            ...realFilter,
                            [key]: realFilter[key].filter((item4: API.PluginsSearchData) => item4.value !== value)
                        }
                    }
                }
            })
        })
    })
    return {realFilter, updateFilterFlag}
}

/**
 * @name Convert HTTP Common Params (Frontend Data to API Params))
 * @description Inherit API.PluginsWhere in API request params?
 */
export const convertPluginsRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams,
    pageParams?: PluginListPageMeta
): PluginsQueryProps => {
    const data: PluginsQueryProps = {
        page: pageParams?.page || 1,
        limit: pageParams?.limit || 20,
        order: pageParams?.order || "desc",
        order_by: pageParams?.order_by || "",
        // search
        keywords: search.type === "keyword" ? search.keyword : "",
        user_name: search.type === "userName" ? search.userName : "",

        // filter
        plugin_type: filter.plugin_type?.map((ele) => ele.value),
        status: filter.status?.map((ele) => Number(ele.value)) || [],
        tags: filter.tags?.map((ele) => ele.value) || [],
        is_private: filter.plugin_private?.map((ele) => ele.value === "true") || [],
        pluginGroup: {unSetGroup: false, group: filter.plugin_group?.map((ele) => ele.value) || []}
    }
    return toolDelInvalidKV(data)
}

/**Plugin Store Requires Token */
function PluginNetWorkApi<T extends {token?: string}, D>(params: requestConfig<T>): Promise<D> {
    return new Promise(async (resolve, reject) => {
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (params.data && userInfo.isLogin) {
                params.data.token = userInfo.token
            }
        } catch (error) {}

        try {
            resolve(await NetWorkApi(params))
        } catch (error) {
            reject(error)
        }
    })
}
/**
 * @description  /plugins API Request Definition
 */
export interface PluginsQueryProps extends API.PluginsWhereListRequest, PluginListPageMeta {}
/**Online Plugin Basic API */
const apiFetchList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            PluginNetWorkApi<PluginsQueryProps, YakitPluginListOnlineResponse>({
                method: "get",
                url: "plugins",
                params: {
                    page: query.page,
                    limit: query.limit,
                    order: query.order || "desc",
                    order_by: query.order_by
                },
                data: {...query}
            })
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve({
                        ...res,
                        data: res.data || []
                    })
                })
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}
/**Get Plugin Store List */
export const apiFetchOnlineList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: ""
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    if (err !== "Token Expired") {
                        yakitNotify("error", "Get Plugin Store List Failed:" + err)
                    }
                    reject(err)
                })
        } catch (error) {
            if (error !== "Token Expired") {
                yakitNotify("error", "Get Plugin Store List Failed:" + error)
            }
            reject(error)
        }
    })
}

/**Get My Plugin List */
export const apiFetchMineList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                order_by: query.order_by || "updated_at",
                listType: "mine"
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get My Plugin List Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get My Plugin List Failed:" + error)
            reject(error)
        }
    })
}

/**Get Recycle Bin Plugin List */
export const apiFetchRecycleList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                order_by: query.order_by || "updated_at",
                listType: "recycle"
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get Recycle Bin List Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Recycle Bin List Failed:" + error)
            reject(error)
        }
    })
}

/**Get Plugin Approval Page List */
export const apiFetchCheckList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                order_by: query.order_by || "updated_at",
                listType: "check"
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get Plugin Approval List Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Plugin Approval List Failed:" + error)
            reject(error)
        }
    })
}

/**Online Plugin Sidebar Stats Basic */
export const apiFetchGroupStatistics: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            PluginNetWorkApi<API.PluginsSearchRequest, API.PluginsSearchResponse>({
                method: "post",
                url: "plugins/search",
                data: {...query}
            })
                .then((res: API.PluginsSearchResponse) => {
                    const data: API.PluginsSearch[] = res.data
                        .filter((ele) => (ele.data || []).length > 0)
                        .sort((a, b) => compareAsc(a, b, "sort"))
                    resolve({...res, data})
                })
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**Plugin Store Sidebar Stats */
export const apiFetchGroupStatisticsOnline: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: ""
            }
            apiFetchGroupStatistics(newQuery)
                .then((res: API.PluginsSearchResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    if (err !== "Token Expired") {
                        yakitNotify("error", "Get Plugin Store Stats Failed:" + err)
                    }
                    reject(err)
                })
        } catch (error) {
            if (error !== "Token Expired") {
                yakitNotify("error", "Get Plugin Store Stats Failed:" + error)
            }
            reject(error)
        }
    })
}

/**My Plugin Sidebar Stats */
export const apiFetchGroupStatisticsMine: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "mine"
            }
            apiFetchGroupStatistics(newQuery)
                .then((res: API.PluginsSearchResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get My Plugin Stats Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get My Plugin Stats Failed:" + error)
            reject(error)
        }
    })
}

/**Plugin Approval and Management Sidebar Stats */
export const apiFetchGroupStatisticsCheck: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "check"
            }
            apiFetchGroupStatistics(newQuery)
                .then((res: API.PluginsSearchResponse) => {
                    // Group Plugins by Type, Tag, Audit Status
                    const newData = res.data || []
                    resolve({
                        ...res,
                        data: newData
                    })
                })
                .catch((err) => {
                    yakitNotify("error", "Get Plugin Approval Stats Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Plugin Approval Stats Failed:" + error)
            reject(error)
        }
    })
}

/**
 * @description Interface/yakit/plugin/stars Request Params
 */
export interface PluginStarsRequest {
    uuid: string
    operation: "remove" | "add"
}
/**Online Plugin Like */
export const apiPluginStars: (query: PluginStarsRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise(async (resolve, reject) => {
        try {
            NetWorkApi<PluginStarsRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/stars",
                params: {...query}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Like Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Like Failed:" + error)
            reject(error)
        }
    })
}

/** grpc Batch Download Plugins */
export interface DownloadOnlinePluginsRequest {
    Token?: string
    IsPrivate?: boolean[]
    Keywords?: string
    PluginType?: string[]
    Tags?: string[]
    UserName?: string
    UserId?: string
    TimeSearch?: string
    Group?: string[]
    ListType?: string
    Status?: number[]
    UUID?: string[]
    ScriptName?: string[]
}
// Params for OnlineDownloadPluginBatch
export const convertDownloadOnlinePluginBatchRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams
): DownloadOnlinePluginsRequest => {
    const data: DownloadOnlinePluginsRequest = {
        // search
        Keywords: search.type === "keyword" ? search.keyword : "",
        UserName: search.type === "userName" ? search.userName : "",

        // filter
        PluginType: filter.plugin_type?.map((ele) => ele.value),
        Status: filter.status?.map((ele) => Number(ele.value)) || [],
        Tags: filter.tags?.map((ele) => ele.value) || [],
        IsPrivate: filter.plugin_private?.map((ele) => ele.value === "true") || [],
        Group: filter.plugin_group?.map((ele) => ele.value) || []
    }
    return toolDelInvalidKV(data)
}

/**Plugin Download Non-Progress Version */
export const apiDownloadPluginBase: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginBatch", query)
            .then((res) => {
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                // Update Local Plugin List After Downloading from Plugin Store, My Plugins, Plugin Management
                emiter.emit("onRefLocalPluginList", "")
                resolve(res)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

/** Download from Plugin Store */
export const apiDownloadPluginOnline: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...(query || {}),
                ListType: ""
            }
            apiDownloadPluginBase(newQuery)
                .then((res) => {
                    yakitNotify("success", "Download Successful")
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Plugin Store Download Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Plugin Store Download Failed:" + error)
            reject(error)
        }
    })
}

/** My Plugins Download */
export const apiDownloadPluginMine: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...(query || {}),
                ListType: "mine"
            }
            apiDownloadPluginBase(newQuery)
                .then((res) => {
                    yakitNotify("success", "Download Successful")
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Download My Plugin Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Download My Plugin Failed:" + error)
            reject(error)
        }
    })
}

/** Download from Plugin Management */
export const apiDownloadPluginCheck: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...(query || {}),
                ListType: "check"
            }
            apiDownloadPluginBase(newQuery)
                .then((res) => resolve(res))
                .catch((err) => {
                    yakitNotify("error", "Plugin Management Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Plugin Management Failed:" + error)
            reject(error)
        }
    })
}

/** Other Cases, Download Plugin Without Differentiating Between Private and Public */
export const apiDownloadPluginOther: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        const newQuery = {
            ...(query || {}),
            ListType: "other"
        }
        apiDownloadPluginBase(newQuery)
            .then(resolve)
            .catch((err) => {
                yakitNotify("error", "Plugin Import/Download Failed:" + err)
                reject(err)
            })
    })
}

/**Online Delete Plugin Basic API to Recycle Bin） */
const apiDeletePlugin: (query?: API.PluginsWhereDeleteRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsWhereDeleteRequest, API.ActionSucceeded>({
                method: "delete",
                url: "plugins",
                data: {...query}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**My Plugins Delete to Recycle Bin）*/
export const apiDeletePluginMine: (query?: API.PluginsWhereDeleteRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "mine"
            }
            apiDeletePlugin(newQuery)
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Delete My Plugin Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Delete My Plugin Failed：" + error)
            reject(error)
        }
    })
}

/**Plugin Audit Delete to Recycle Bin）*/
export const apiDeletePluginCheck: (query?: API.PluginsWhereDeleteRequest) => Promise<API.ActionSucceeded> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "check"
            }
            apiDeletePlugin(newQuery)
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Delete Plugin Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Delete Plugin Failed：" + error)
            reject(error)
        }
    })
}

/**My Plugins Toggle Privacy */
export const apiUpdatePluginPrivateMine: (query: API.UpPluginsPrivateRequest) => Promise<API.ActionSucceeded> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.UpPluginsPrivateRequest, API.ActionSucceeded>({
                method: "post",
                url: "up/plugins/private",
                data: {...query}
            })
                .then((res: API.ActionSucceeded) => {
                    yakitNotify("success", "Public/Private Modification Successful")
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Public/Private Modification Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Public/Private Modification Failed：" + error)
            reject(error)
        }
    })
}
/**Permanently Delete and Restore API Definitions */
export interface PluginsRecycleRequest extends Omit<API.PluginsWhere, "listType"> {
    uuid?: API.PluginsRecycle["uuid"]
}
/**Permanent Deletion Only for Recycle Bin */
export const apiRemoveRecyclePlugin: (query?: PluginsRecycleRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsRecycleRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/recycle",
                data: {...query, listType: "recycle", dumpType: "true"}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Permanently Delete Plugin Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Permanently Delete Plugin Failed：" + error)
            reject(error)
        }
    })
}

/**Restore Only for Recycle Bin */
export const apiReductionRecyclePlugin: (query?: PluginsRecycleRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsRecycleRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/recycle",
                data: {...query, listType: "recycle", dumpType: "false"}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Restore Plugin Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Restore Plugin Failed：" + error)
            reject(error)
        }
    })
}

/**
 * @name Convert QueryYakScript Params (Frontend Data to API Params))
 */
export const convertLocalPluginsRequestParams = (query: {
    filter: PluginFilterParams
    search: PluginSearchParams
    pageParams?: PluginListPageMeta
    defaultFilters?: PluginFilterParams
}): QueryYakScriptRequest => {
    const {filter, search, pageParams, defaultFilters} = query

    const type =
        filter.plugin_type && filter.plugin_type?.length > 0 ? filter.plugin_type : defaultFilters?.plugin_type || []
    const tag = filter.tags && filter.tags.length > 0 ? filter.tags : defaultFilters?.tags || []
    const group =
        filter.plugin_group && filter.plugin_group.length > 0 ? filter.plugin_group : defaultFilters?.plugin_group || []

    const data: QueryYakScriptRequest = {
        Pagination: {
            Limit: pageParams?.limit || 10,
            Page: pageParams?.page || 1,
            OrderBy: "updated_at",
            Order: "desc"
        },
        // search
        Keyword: search.type === "keyword" ? search.keyword : "",
        UserName: search.type === "userName" ? search.userName : "",

        // filter
        Type: (type.map((ele) => ele.value) || []).join(","),
        Tag: tag.map((ele) => ele.value) || [],
        Group: {
            UnSetGroup: false,
            Group: group?.map((ele) => ele.value) || []
        }
    }
    return toolDelInvalidKV(data)
}
/**Local, Query YakScript Basic API */
export const apiQueryYakScriptBase: (query?: QueryYakScriptRequest) => Promise<QueryYakScriptsResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("QueryYakScript", query)
                .then((item: QueryYakScriptsResponse) => {
                    resolve(item)
                })
                .catch((e: any) => {
                    reject(e)
                })
        } catch (error) {
            reject(error)
        }
    })
}
/**Local, Get Plugin List */
export const apiQueryYakScript: (query?: QueryYakScriptRequest) => Promise<QueryYakScriptsResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            apiQueryYakScriptBase(query)
                .then(resolve)
                .catch((e: any) => {
                    yakitNotify("error", "Get Local Plugin Failed:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Get Local Plugin Failed:" + error)
            reject(error)
        }
    })
}
/**Local, Get Total Plugins */
export const apiQueryYakScriptTotal: () => Promise<QueryYakScriptsResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            const query: QueryYakScriptRequest = {
                Pagination: {
                    Page: 1,
                    Limit: 1,
                    Order: "",
                    OrderBy: ""
                }
            }
            apiQueryYakScriptBase(query)
                .then((item: QueryYakScriptsResponse) => {
                    resolve(item)
                })
                .catch((e: any) => {
                    yakitNotify("error", "Get Local Plugin Total Failed:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Get Local Plugin Total Failed:" + error)
            reject(error)
        }
    })
}
/**Local Plugin List Grouping */
export const apiFetchGroupStatisticsLocal: () => Promise<API.PluginsSearchResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("GetYakScriptTagsAndType", {})
                .then((res: GetYakScriptTagsAndTypeResponse) => {
                    const data = [
                        {
                            groupKey: "plugin_type",
                            groupName: "Plugin Type",
                            sort: 1,
                            data: (res["Type"] || []).map((ele) => ({
                                label: pluginTypeToName[ele.Value]?.name || ele.Value,
                                value: ele.Value,
                                count: ele.Total
                            }))
                        },
                        {
                            groupKey: "plugin_group",
                            groupName: "Plugin Group",
                            sort: 2,
                            data: (res["Group"] || []).map((ele) => ({
                                label: ele.Value,
                                value: ele.Value,
                                count: ele.Total
                            }))
                        },
                        {
                            groupKey: "tags",
                            groupName: "Tag",
                            sort: 3,
                            data: (res["Tag"] || []).map((ele) => ({
                                label: ele.Value,
                                value: ele.Value,
                                count: ele.Total
                            }))
                        }
                    ].filter((ele) => {
                        if (ele.groupKey === "plugin_group") {
                            return true
                        } else {
                            return ele.data.length > 0
                        }
                    })
                    resolve({data})
                })
                .catch((e) => {
                    yakitNotify("error", `Local Plugin Stats Display Error:${e}`)
                })
        } catch (error) {
            yakitNotify("error", "Local Plugin Stats Display Error:" + error)
            reject(error)
        }
    })
}
/** apiDeleteYakScriptByIds Request Params */
export interface DeleteYakScriptRequestByIdsProps {
    Ids: number[]
}
/**Local, Batch Delete Plugins */
export const apiDeleteYakScriptByIds: (query: DeleteYakScriptRequestByIdsProps) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery: DeleteYakScriptRequestByIdsProps = {
                Ids: query.Ids.map((ele) => Number(ele)) || []
            }
            ipcRenderer
                .invoke("DeleteLocalPluginsByWhere", newQuery)
                .then(() => {
                    if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                    else ipcRenderer.invoke("change-main-menu")
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "Batch Delete Local Plugins Failed:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Batch Delete Local Plugins Failed:" + error)
            reject(error)
        }
    })
}

export const defaultDeleteLocalPluginsByWhereRequest: DeleteLocalPluginsByWhereRequestProps = {
    Keywords: "",
    Type: "",
    UserName: "",
    Tags: "",
    Groups: []
}
/** grpc Api DeleteLocalPluginsByWhere Request Params */
export interface DeleteLocalPluginsByWhereRequestProps {
    Keywords: string
    Type: string
    UserName: string
    Tags: string
    Groups: string[]
}
/**
 * @name Convert DeleteLocalPluginsByWhere Params (Frontend Data to API Params))
 */
export const convertDeleteLocalPluginsByWhereRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams
): DeleteLocalPluginsByWhereRequestProps => {
    const data: DeleteLocalPluginsByWhereRequestProps = {
        // search
        Keywords: search.type === "keyword" ? search.keyword : "",
        UserName: search.type === "userName" ? search.userName : "",

        // filter
        Type: (filter.plugin_type?.map((ele) => ele.value) || []).join(","),
        Tags: (filter.tags?.map((ele) => ele.value) || []).join(","),
        Groups: filter.plugin_group?.map((ele) => ele.value) || []
    }
    return toolDelInvalidKV(data)
}
/**Local, Delete All With Conditions */
export const apiDeleteLocalPluginsByWhere: (query: DeleteLocalPluginsByWhereRequestProps) => Promise<null> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("DeleteLocalPluginsByWhere", query)
                .then(() => {
                    if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                    else ipcRenderer.invoke("change-main-menu")
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "DeleteLocalPluginsByWhere Failed:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "DeleteLocalPluginsByWhere Failed:" + error)
            reject(error)
        }
    })
}

/**
 * @name Get Plugin Details
 * @description Audit|Logs
 */
export const apiFetchPluginDetailCheck: (
    query: API.PluginsAuditDetailRequest
) => Promise<API.PluginsAuditDetailResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsAuditDetailRequest, API.PluginsAuditDetailResponse>({
                method: "post",
                url: "plugins/audit/detail",
                data: {...query}
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get Details Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Details Failed：：" + error)
            reject(error)
        }
    })
}

/**
 * @name Plugin Audit Details (Approved)|Rejected)
 * @description Audit|Logs
 */
export const apiAuditPluginDetaiCheck: (query: API.PluginsAuditRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsAuditRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/audit",
                data: {...query}
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Operation Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Operation Failed：" + error)
            reject(error)
        }
    })
}

/**
 * @name Get Specified Plugin Details (Online))
 */
export const apiFetchOnlinePluginInfo: (uuid: string, isShowError?: boolean) => Promise<API.PluginsDetail> = (
    uuid,
    isShowError
) => {
    return new Promise(async (resolve, reject) => {
        PluginNetWorkApi<{uuid: string; token?: string}, API.PluginsDetail>({
            method: "post",
            url: "plugins/detail",
            data: {uuid: uuid}
        })
            .then(resolve)
            .catch((err) => {
                if (isShowError !== false) yakitNotify("error", "Get Online Plugin Details Failed:" + err)
                reject(err)
            })
    })
}

export interface PluginLogsRequest extends HTTPRequestParameters, API.LogsRequest {}
/**
 * @name Get Plugin Logs
 */
export const apiFetchPluginLogs: (query: {
    uuid: string
    Page: number
    Limit?: number
}) => Promise<API.PluginsLogsResponse> = (query) => {
    return new Promise(async (resolve, reject) => {
        const params: HTTPRequestParameters = {
            page: query.Page,
            limit: query.Limit || 20,
            order_by: "created_at",
            order: "desc"
        }
        const data: API.LogsRequest = {
            uuid: query.uuid
        }
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (userInfo.isLogin) {
                data.token = userInfo.token || undefined
            }
        } catch (error) {}

        try {
            NetWorkApi<PluginLogsRequest, API.PluginsLogsResponse>({
                method: "get",
                url: "plugins/logs",
                params: {...params} as any,
                data: {...data}
            })
                .then(resolve)
                .catch((err) => {
                    yakitNotify("error", "Get Log Failed:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Log Failed:" + error)
            reject(error)
        }
    })
}

interface GetYakScriptByOnlineIDRequest {
    UUID: string
}
/**
 * @description Query Local Plugin by Online uuid
 */
export const apiGetYakScriptByOnlineID: (query: GetYakScriptByOnlineIDRequest) => Promise<YakScript> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("GetYakScriptByOnlineID", {
                    ...query
                } as GetYakScriptByOnlineIDRequest)
                .then((newScript: YakScript) => {
                    resolve(newScript)
                })
                .catch((e) => {
                    yakitNotify("error", "Query Local Plugin Error:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Query Local Plugin Error:" + error)
            reject(error)
        }
    })
}

/**
 * @description Plugin Store/My Plugin Details Use Redirect to Local Details
 */
export const onlineUseToLocalDetail = (uuid: string, listType: "online" | "mine") => {
    const query: QueryYakScriptRequest = {
        Pagination: {
            Page: 1,
            Limit: 1,
            Order: "",
            OrderBy: ""
        },
        UUID: uuid
    }
    apiQueryYakScript(query).then((res) => {
        if (+res.Total > 0) {
            emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: uuid}}))
        } else {
            let downloadParams: DownloadOnlinePluginsRequest = {
                UUID: [uuid]
            }
            if (listType === "online") {
                apiDownloadPluginOnline(downloadParams).then(() => {
                    emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: uuid}}))
                })
            } else if (listType === "mine") {
                apiDownloadPluginMine(downloadParams).then(() => {
                    emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: uuid}}))
                })
            }
        }
    })
}

interface QueryYakScriptByYakScriptNameRequest {
    pluginName: string
}

/**
 * @description Plugin Store/My Plugin Details Use Redirect to Local Details
 */
export const apiQueryYakScriptByYakScriptName: (query: QueryYakScriptByYakScriptNameRequest) => Promise<YakScript> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery: QueryYakScriptRequest = {
                Pagination: {
                    Page: 1,
                    Limit: 1,
                    Order: "",
                    OrderBy: ""
                },
                IncludedScriptNames: [query.pluginName]
            }
            ipcRenderer
                .invoke("QueryYakScript", {
                    ...newQuery
                })
                .then((item: QueryYakScriptsResponse) => {
                    if (item.Data.length > 0) {
                        resolve(item.Data[0])
                    } else {
                        yakitNotify("error", "Not Found Plugin")
                        reject("Not Found Plugin")
                    }
                })
                .catch((e: any) => {
                    yakitNotify("error", "Query Local Plugin Error" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Query Local Plugin Error" + error)
            reject(error)
        }
    })
}

export interface DebugPluginRequest {
    Code: string
    PluginType: string
    Input: string
    HTTPRequestTemplate: HTTPRequestBuilderParams
    ExecParams: KVPair[]
    /**Plugin UI Interaction Params*/
    LinkPluginConfig?: HybridScanPluginConfig
    PluginName: string
}
export const defaultLinkPluginConfig = {
    PluginNames: [],
    Filter: undefined
}
/**
 * @Local Plugin Execution Method
 */
export const apiDebugPlugin: (params: DebugPluginRequest, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        try {
            let executeParams: DebugPluginRequest = {
                ...params
            }
            switch (params.PluginType) {
                case "yak":
                case "lua":
                    executeParams = {
                        ...executeParams,
                        Input: ""
                    }
                    break
                case "codec":
                case "mitm":
                case "port-scan":
                case "nuclei":
                    executeParams = {
                        ...executeParams,
                        ExecParams: []
                    }
                    break
                default:
                    break
            }

            ipcRenderer
                .invoke("DebugPlugin", executeParams, token)
                .then(() => {
                    yakitNotify("info", "Start Task Successfully")
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "Local Plugin Execution Error:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Local Plugin Execution Error:" + error)
            reject(error)
        }
    })
}

/**
 * @Cancel DebugPlugin
 */
export const apiCancelDebugPlugin: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke(`cancel-DebugPlugin`, token)
                .then(() => {
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "Cancel Local Plugin Execution Error:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Cancel Local Plugin Execution Error:" + error)
            reject(error)
        }
    })
}
interface QueryYakScriptByOnlineGroupRequest {
    Data: YakScript[]
}
/**Get Plugins by Group Name */
export const apiGetPluginByGroup: (OnlineGroup: string[]) => Promise<QueryYakScriptByOnlineGroupRequest> = (
    OnlineGroup
) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("QueryYakScriptByOnlineGroup", {OnlineGroup})
                .then(resolve)
                .catch((e: any) => {
                    yakitNotify("error", "Get Plugins in Group Error:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "Get Plugins in Group Error:" + error)
            reject(error)
        }
    })
}

export interface PluginInfoProps {
    selectPluginName: string[]
    search?: PluginSearchParams
    filters?: PluginFilterParams
}
/**
 * @name Convert HybridScan Params (Frontend Data to API Params))
 * @description HybridScan
 */
export const convertHybridScanParams = (
    params: HybridScanRequest,
    pluginInfo: PluginInfoProps
): HybridScanControlAfterRequest => {
    const {
        selectPluginName,
        search = {...cloneDeep(defaultSearch)},
        filters = {...cloneDeep(defaultFilter)}
    } = pluginInfo
    const hTTPRequestTemplate = {
        ...cloneDeep(params.HTTPRequestTemplate)
    }

    delete hTTPRequestTemplate.Concurrent
    delete hTTPRequestTemplate.TotalTimeoutSecond
    delete hTTPRequestTemplate.Proxy
    delete hTTPRequestTemplate.httpFlowId
    delete hTTPRequestTemplate.requestType

    const data: HybridScanControlAfterRequest = {
        Concurrent: params.Concurrent,
        TotalTimeoutSecond: params.TotalTimeoutSecond,
        Proxy: params.Proxy,
        Plugin: {
            PluginNames: selectPluginName,
            Filter:
                selectPluginName.length > 0
                    ? undefined
                    : {
                          //   /* Pagination is ignore for hybrid scan */
                          //   Pagination: genDefaultPagination()
                          ...convertLocalPluginsRequestParams({filter: filters, search})
                      }
        },
        Targets: {
            Input: params.Input,
            InputFile: [],
            HTTPRequestTemplate: hTTPRequestTemplate
        }
    }
    return data
}
export interface PluginBatchExecutorInputValueProps {
    params: HybridScanRequest
    pluginInfo: PluginInfoProps
}
/**
 * @name Convert HybridScan Input for Frontend (Backend Data to Frontend Params))
 * @description HybridScan
 */
export const hybridScanParamsConvertToInputValue = (
    value: HybridScanControlAfterRequest
): PluginBatchExecutorInputValueProps => {
    const data: PluginBatchExecutorInputValueProps = {
        params: {
            Input: "",
            HTTPRequestTemplate: {...cloneDeep(defPluginBatchExecuteExtraFormValue)},
            Proxy: "",
            Concurrent: 30,
            TotalTimeoutSecond: 7200
        },
        pluginInfo: {
            selectPluginName: [],
            search: {...cloneDeep(defaultSearch)},
            filters: {...cloneDeep(defaultFilter)}
        }
    }
    try {
        // Only Need HybridScanControlAfterRequest Params
        const resParams: HybridScanControlAfterRequest = {...value}
        let targets = resParams.Targets
        let plugin = resParams.Plugin
        // Ensure plugin targets always initialized
        if (!plugin) {
            plugin = {PluginNames: [], Filter: {Pagination: genDefaultPagination()}}
        }
        if (!targets) {
            targets = {
                InputFile: [],
                Input: "",
                HTTPRequestTemplate: {...cloneDeep(defPluginBatchExecuteExtraFormValue)}
            }
        }
        //Process Plugin Input Values 1. Select Plugins 2. Select All (Search Conditions))
        if ((plugin.PluginNames?.length || 0) > 0) {
            data.pluginInfo.selectPluginName = plugin.PluginNames
        } else {
            const search: PluginSearchParams = {...cloneDeep(defaultSearch)}
            if (plugin.Filter?.Keyword) {
                search.keyword = plugin.Filter?.Keyword
                search.type = "keyword"
            }
            if (plugin.Filter?.UserName) {
                search.userName = plugin.Filter?.UserName
                search.type = "userName"
            }
            data.pluginInfo.search = {...search}
            data.pluginInfo.filters = {
                plugin_group: (plugin.Filter?.Group?.Group || []).map((item) => ({value: item, label: item, count: 0}))
            }
        }
        // Handle Input Params, Including Extras
        data.params.Input = targets.Input
        data.params.Proxy = resParams.Proxy || ""
        data.params.Concurrent = resParams.Concurrent || 30
        data.params.TotalTimeoutSecond = resParams.TotalTimeoutSecond || 7200
        data.params.HTTPRequestTemplate = {
            ...cloneDeep(defPluginBatchExecuteExtraFormValue),
            ...targets.HTTPRequestTemplate
        }
    } catch (error) {
        yakitNotify("error", "Parsing Task Input Parameters and Plugin Selection Failed:" + error)
    }
    return data
}
export interface PluginBatchExecutorTaskProps {
    Proxy: string
    Concurrent: number
    TotalTimeoutSecond: number
}
export interface HybridScanRequest extends PluginBatchExecutorTaskProps {
    Input: string
    HTTPRequestTemplate: HTTPRequestBuilderParams
}
/**
 * @description HybridScan Batch Execution
 */
export const apiHybridScan: (params: HybridScanControlAfterRequest, token: string) => Promise<null> = (
    params,
    token
) => {
    return new Promise((resolve, reject) => {
        try {
            let executeParams: HybridScanControlAfterRequest = {
                ...params
            }
            ipcRenderer
                .invoke(
                    "HybridScan",
                    {
                        Control: true,
                        HybridScanMode: "new",
                        ResumeTaskId: "",
                        HybridScanTaskSource: !!params.HybridScanTaskSource
                            ? params.HybridScanTaskSource
                            : "pluginBatch"
                    } as HybridScanControlRequest,
                    token
                )
                .then(() => {
                    info(`Launch Successful, Task ID: ${token}`)
                    // send target / plugin
                    ipcRenderer.invoke("HybridScan", executeParams, token).then(() => {
                        info("Send Scan Targets and Plugins Successfully")
                    })
                    resolve(null)
                })
        } catch (error) {
            yakitNotify("error", "Batch Plugin Execution Error:" + error)
            reject(error)
        }
    })
}
/**
 * @Cancel HybridScan
 */
export const apiCancelHybridScan: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-HybridScan`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "Cancel Batch Plugin Execution Error:" + e)
                reject(e)
            })
    })
}

/**
 * @HybridScan Batch Query/Restore/Pause Operation
 */
export const apiHybridScanByMode: (
    runtimeId: string,
    hybridScanMode: HybridScanModeType,
    token: string
) => Promise<null> = (runtimeId, hybridScanMode, token) => {
    return new Promise((resolve, reject) => {
        if (hybridScanMode === "new") return
        const params: HybridScanControlRequest = {
            Control: hybridScanMode !== "pause",
            HybridScanMode: hybridScanMode,
            ResumeTaskId: runtimeId
        }
        ipcRenderer
            .invoke("HybridScan", params, token)
            .then(() => {
                info(`Task ID: ${token}`)
                resolve(null)
            })
            .catch((error) => {
                yakitNotify("error", "Batch Plugin Execution Error:" + error)
                reject(error)
            })
    })
}
/**
 * @Go to Plugin Edit Page
 * @param plugin
 * @returns
 */
export const onToEditPlugin = (plugin: YakScript) => {
    if (plugin.IsCorePlugin) {
        yakitNotify("error", "Built-in Plugins Cannot Be Edited, Suggest Copying Source Code to Edit。")
        return
    }
    if (plugin.Type === "packet-hack") {
        yakitNotify("error", "Type Discontinued, Cannot Edit")
        return
    }
    if (plugin.Id && +plugin.Id) {
        if (plugin.ScriptName === "Comprehensive Directory Scanning & Brute Forcing") {
            yakitNotify("warning", "Currently Not Editable")
            return
        }
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.ModifyYakitScript,
                params: {source: YakitRoute.Plugin_Local, id: +plugin.Id}
            })
        )
    }
}

/**
 * @description Get Plugin Details by ID
 */
export const apiGetYakScriptById: (Id: string | number) => Promise<YakScript> = (Id) => {
    return new Promise((resolve, reject) => {
        ipcRenderer.invoke("GetYakScriptById", {Id}).then(resolve).catch(reject)
    })
}

/**Get Local Plugin Group Data */
export const apiFetchQueryYakScriptGroupLocal: (All?: boolean, ExcludeType?: string[]) => Promise<GroupCount[]> = (
    All = true,
    ExcludeType = ["yak", "codec"]
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryYakScriptGroup", {All, ExcludeType})
            .then((res: QueryYakScriptGroupResponse) => {
                resolve(res.Group)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "Get Local Plugin Group：" + e)
            })
    })
}

/**Local Group Name Change */
export const apiFetchRenameYakScriptGroupLocal: (Group: string, NewGroup: string) => Promise<null> = (
    Group,
    NewGroup
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("RenameYakScriptGroup", {Group, NewGroup})
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "Modify Local Plugin Group Name：" + e)
            })
    })
}

/**Local Plugin Group Deleted */
export const apiFetchDeleteYakScriptGroupLocal: (Group: string) => Promise<null> = (Group) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteYakScriptGroup", {Group})
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "Delete Local Plugin Group：" + e)
            })
    })
}

/**Get Local Plugin Groups and Others */
export const apiFetchGetYakScriptGroupLocal: (params: QueryYakScriptRequest) => Promise<GetYakScriptGroupResponse> = (
    params
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetYakScriptGroup", params)
            .then((res: GetYakScriptGroupResponse) => {
                resolve(res)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "" + e)
            })
    })
}

/**Update & Add Local Plugin Group */
export const apiFetchSaveYakScriptGroupLocal: (params: SaveYakScriptGroupRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SaveYakScriptGroup", params)
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "Update Local Plugin Group：" + e)
            })
    })
}

/**Reset Local Groups to Online Groups */
export const apiFetchResetYakScriptGroup: (params: ResetYakScriptGroupRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("ResetYakScriptGroup", params)
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "Reset Failed：" + e)
            })
    })
}

/** Get Online Plugin Group Data */
export const apiFetchQueryYakScriptGroupOnline: () => Promise<API.GroupResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<any, API.GroupResponse>({
                method: "get",
                url: "group"
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get Plugin Group Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Plugin Group Failed：" + error)
            reject(error)
        }
    })
}

/**Online Group Name Change */
export interface PluginGroupRename {
    group: string
    newGroup: string
}
export const apiFetchRenameYakScriptGroupOnline: (query: PluginGroupRename) => Promise<API.ActionSucceeded> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<PluginGroupRename, API.ActionSucceeded>({
                method: "get",
                url: "rename/group",
                params: query
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Modify Plugin Group Name Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Modify Plugin Group Name Failed：" + error)
            reject(error)
        }
    })
}

/**Online Plugin Group Deleted */
export interface PluginGroupDel {
    group: string
}
export const apiFetchDeleteYakScriptGroupOnline: (query: PluginGroupDel) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<PluginGroupDel, API.ActionSucceeded>({
                method: "delete",
                url: "group",
                params: query
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Delete Plugin Group Failed1：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Delete Plugin Group Failed：" + error)
            reject(error)
        }
    })
}

/** Online Get Plugin & Other Groups */
export const apiFetchGetYakScriptGroupOnline: (params: API.PluginsGroupRequest) => Promise<API.PluginsGroupResponse> = (
    params
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsGroupRequest, API.PluginsGroupResponse>({
                method: "get",
                url: "plugins/group",
                data: params
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Failed：" + error)
            reject(error)
        }
    })
}

/**Update & Add Online Plugin Group */
export const apiFetchSaveYakScriptGroupOnline: (params: API.GroupRequest) => Promise<API.ActionSucceeded> = (
    params
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.GroupRequest, API.ActionSucceeded>({
                method: "post",
                url: "group",
                data: params
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Update Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Update Failed：" + error)
            reject(error)
        }
    })
}

/** Plugin Store Access Online Groups Without Login*/
export const apiFetchQueryYakScriptGroupOnlineNotLoggedIn: () => Promise<API.GroupResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<any, API.GroupResponse>({
                method: "get",
                url: "group/search"
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "Get Plugin Group Failed：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "Get Plugin Group Failed：" + error)
            reject(error)
        }
    })
}
