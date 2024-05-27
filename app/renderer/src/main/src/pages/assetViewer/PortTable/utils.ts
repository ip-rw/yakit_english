import {QueryPortsRequest} from "@/pages/assetViewer/PortAssetPage"
import {PortAsset} from "@/pages/assetViewer/models"
import {QueryGeneralResponse, genDefaultPagination} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"

const {ipcRenderer} = window.require("electron")

export const defQueryPortsRequest: QueryPortsRequest = {
    Hosts: "",
    Ports: "",
    State: "open",
    Service: "",
    Title: "",
    TitleEffective: false,
    Keywords: "",
    ComplexSelect: "",
    RuntimeId: "",
    Pagination: {
        Limit:  20,
        Page: 1,
        OrderBy: "id",
        Order: "desc"
    }
}
/**
 * @description QueryPorts Get port asset table data (Basic）
 */
export const apiQueryPortsBase: (params: QueryPortsRequest) => Promise<QueryGeneralResponse<PortAsset>> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`QueryPorts`, params)
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "Cancel batch execution error for plugin:" + e)
                reject(e)
            })
    })
}

/**
 * @description QueryPorts Get incremental data in ascending order
 */
export const apiQueryPortsIncrementOrderAsc: (params: QueryPortsRequest) => Promise<QueryGeneralResponse<PortAsset>> = (
    params
) => {
    // Get incremental data in ascending order
    // {
    //     "Pagination": {
    //       "Page": 1,
    //       "Limit": 2,
    //       "OrderBy": "id",
    //       "Order": "asc"
    //     },
    //     "RuntimeId": "7ae54faf-89f4-4303-8d91-54db8c7ce1ef",
    //     "AfterId":20
    //   }
    const newParams = {...params, BeforeId: undefined}
    return apiQueryPortsBase(newParams)
}
/**
 * @description QueryPorts Get incremental data in descending order
 */
export const apiQueryPortsIncrementOrderDesc: (
    params: QueryPortsRequest
) => Promise<QueryGeneralResponse<PortAsset>> = (params) => {
    // Get incremental data in descending order
    // {
    //     "Pagination": {
    //       "Page": 1,
    //       "Limit": 2,
    //       "OrderBy": "id",
    //       "Order": "desc"
    //     },
    //     "RuntimeId": "7ae54faf-89f4-4303-8d91-54db8c7ce1ef",
    //     "BeforeId":20
    //   }
    const newParams = {...params, AfterId: undefined}
    return apiQueryPortsBase(newParams)
}
