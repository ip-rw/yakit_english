import {failed} from "./notification"
const {ipcRenderer} = window.require("electron")

interface removeProps<T> {
    selectedRowKeys: string[] | number[]
    params: T
    interfaceName: string
    isShowError?: boolean
    noEnterQuery?: string[] // No Conditions Needed
    selectedRowKeysNmae?:string
}

export const onRemoveToolFC = (props: removeProps<any>) => {
    const {params, selectedRowKeys = [], interfaceName, isShowError = true, noEnterQuery = [],selectedRowKeysNmae='Ids'} = props
    let newParams = {}
    let newNoEnterQuery = ["Pagination", ...noEnterQuery]
    const queryHaveValue = {}
    // Find Query Conditions
    for (const key in params) {
        const objItem = params[key]
        if (!newNoEnterQuery.includes(key) && objItem) {
            queryHaveValue[key] = params[key]
        }
    }
    if (selectedRowKeys.length > 0) {
        // Delete Selected
        newParams = {
            [selectedRowKeysNmae]: selectedRowKeys
        }
    } else if (Object.getOwnPropertyNames(queryHaveValue).length > 0) {
        // Delete with Conditions
        newParams = {
            Filter: {
                ...queryHaveValue
            }
        }
    } else {
        // Delete All
        newParams = {
            DeleteAll: true
        }
    }
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(interfaceName, newParams)
            .then((res) => {
                resolve(res)
            })
            .catch((e: any) => {
                if (isShowError) failed(`${interfaceName} failed: ${e}`)
                reject(e)
            })
    })
}
