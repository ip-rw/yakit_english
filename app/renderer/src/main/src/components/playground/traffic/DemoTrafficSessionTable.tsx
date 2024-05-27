import React, {useEffect, useState} from "react"
import {ChaosMakerRule} from "@/models/ChaosMaker"
import {info} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable"
import {TrafficSession} from "@/models/Traffic"
import {TrafficViewerControlIf} from "@/components/playground/traffic/base"

export interface DemoTrafficSessionTableProp extends TrafficViewerControlIf {}

const {ipcRenderer} = window.require("electron")

export const DemoTrafficSessionTable: React.FC<DemoTrafficSessionTableProp> = (props) => {
    const [selected, setSelected] = useState<TrafficSession>()

    useEffect(() => {
        if (!selected) {
            return
        }

        if (props.onClick !== undefined) {
            props.onClick(selected)
        }
    }, [selected])

    return (
        <DemoVirtualTable<TrafficSession>
            columns={[
                {headerTitle: "ID", key: "Id", width: 80, colRender: (i) => i.Id},
                {headerTitle: "Type", key: "Id", width: 80, colRender: (i) => i.SessionType},
                {headerTitle: "Device Type", key: "Id", width: 80, colRender: (i) => i.DeviceType},

                {headerTitle: "ID", key: "id", width: 80, colRender: (i) => i.Id},
                {
                    headerTitle: "Source",
                    key: "source",
                    width: 160,
                    colRender: (i) => i.NetworkSrcIP + ":" + i.TransportLayerSrcPort
                },
                {
                    headerTitle: "Target",
                    key: "destination",
                    width: 160,
                    colRender: (i) => i.NetworkDstIP + ":" + i.TransportLayerDstPort
                },
                {headerTitle: "Protocol", key: "protocol", width: 160, colRender: (i) => i.Protocol}
            ]}
            rowClick={(data) => {
                setSelected(data)
            }}
            loadMore={(data: TrafficSession | undefined) => {
                return new Promise((resolve, reject) => {
                    if (!data) {
                        // info("Load Init Data")
                        ipcRenderer
                            .invoke("QueryTrafficSession", {
                                TimestampNow: props.fromTimestamp,
                                Pagination: {Limit: 10, Page: 1, OrderBy: "id", Order: "asc"}, // genDefaultPagination(),
                                FromId: 0
                            })
                            .then((rsp: {Data: TrafficSession[]}) => {
                                resolve({
                                    data: rsp.Data
                                })
                                return
                            })
                        return
                    } else {
                        ipcRenderer
                            .invoke("QueryTrafficSession", {
                                TimestampNow: props.fromTimestamp,
                                Pagination: {Limit: 10, Page: 1, OrderBy: "id", Order: "asc"},
                                FromId: data.Id
                            })
                            .then((rsp: {Data: TrafficSession[]; Total: number; Pagination: Paging}) => {
                                resolve({
                                    data: rsp.Data
                                })
                                return
                            })
                        return
                    }
                })
            }}
            rowKey={"Id"}
            isStop={!props.realtime}
            isScrollUpdate={!props.realtime}
        />
    )
}
