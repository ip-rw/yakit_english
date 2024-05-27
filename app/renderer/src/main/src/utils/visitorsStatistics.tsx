import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {isCommunityEdition} from "@/utils/envfile"
const {ipcRenderer} = window.require("electron")
let MachineID: string = ""

/** Get Machine Code */
const getMachineIDOperation = () => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetMachineID", {})
            .then((obj: {MachineID: string}) => {
                MachineID = obj.MachineID
                resolve(true)
            })
            .catch((e) => {
                reject()
            })
    })
}

const visitorsStatisticsOperation = () => {
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.TouristRequest, API.ActionSucceeded>({
            url: "tourist",
            method: "post",
            data: {
                macCode: MachineID
            }
        })
            .then((data) => {})
            .catch((err) => {})
            .finally(() => {
                resolve(true)
            })
    })
}

/** Visitor Info Stats */
export const visitorsStatisticsFun = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            if (MachineID.length === 0) {
                await getMachineIDOperation()
            }
            visitorsStatisticsOperation()
            resolve(true)
        } catch (error) {resolve(false)}
    })
}
