import React from "react"
import {info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import emiter from "../eventBus/eventBus"
import {Uint8ArrayToString} from "../str"

const {ipcRenderer} = window.require("electron")
let id = randomString(40)

/**@name Push Enabled */
export let serverPushStatus = false

export const startupDuplexConn = () => {
    info("Server Push Enabled Already")
    ipcRenderer.on(`${id}-data`, (e, data) => {
        try {
            const obj = JSON.parse(Uint8ArrayToString(data.Data))
            switch (obj.type) {
                // Engine Supports Push DB Updates (If not, continue with polling)
                case "global":
                    serverPushStatus = true
                    break
                // Notify QueryHTTPFlows to Poll Updates
                case "httpflow":
                    emiter.emit("onRefreshQueryHTTPFlows")
                    break
                // Notify QueryYakScript to Poll Updates
                case "yakscript":
                    emiter.emit("onRefreshQueryYakScript")
                    break
                // Notify QueryNewRisk to Poll Updates
                case "risk":
                    emiter.emit("onRefreshQueryNewRisk")
                    break
            }
        } catch (error) {}
    })
    ipcRenderer.on(`${id}-error`, (e, error) => {
        console.log(error)
    })
    ipcRenderer.invoke("DuplexConnection", {}, id).then(() => {
        info("Server Push Enabled")
    })
}

export const closeDuplexConn = () => {
    ipcRenderer.invoke("cancel-DuplexConnection", id)
    ipcRenderer.removeAllListeners(`${id}-data`)
    ipcRenderer.removeAllListeners(`${id}-error`)
}
