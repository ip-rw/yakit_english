import React, {useEffect, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {AutoCard} from "@/components/AutoCard";
import {Button, Empty, List, Space, Tag} from "antd";
import {OneLine} from "@/utils/inputUtil";
import {YakEditor} from "@/utils/editors";
import {Uint8ArrayToString} from "@/utils/str";
import {CopyOutlined} from "@ant-design/icons";
import {callCopyToClipboard} from "@/utils/basic";

export interface WebsocketFlowViewerProp {
    token: string
}


export interface WebsocketFlowFromFuzzer {
    SwitchProtocolSucceeded: boolean
    IsDataFrame: boolean
    FromServer: boolean
    GuessEncode: string[]
    StatusVerbose: string
    ReasonVerbose: string

    DataLength: number
    Data: Uint8Array

    IsJson: boolean
    IsProtobuf: boolean
    DataFrameIndex: number
    DataSizeVerbose: string
    DataVerbose: string

    IsUpgradeResponse: boolean
    UpgradeResponse: Uint8Array
}

const {ipcRenderer} = window.require("electron");
export const WebsocketFlowViewer: React.FC<WebsocketFlowViewerProp> = (props) => {
    const [current, setCurrent] = useState<WebsocketFlowFromFuzzer[]>([]);
    const [selected, setSelected] = useState<WebsocketFlowFromFuzzer>();

    useEffect(() => {
        if (!props.token) {
            setCurrent([])
            return
        }

        const flows: WebsocketFlowFromFuzzer[] = [];

        // Monitoring Data
        const token = props.token;
        ipcRenderer.on(`${token}-data`, async (e, data: WebsocketFlowFromFuzzer) => {
            if (data.DataLength > 0) {
                flows.unshift(data)
            }
        })

        let newFlow: WebsocketFlowFromFuzzer[] = []
        const update = () => {
            // Don't update if both are empty
            if (flows.length <= 0 && newFlow.length <= 0) {
                return
            }

            // 1. Update if not previously updated
            // 2. If new DataFrameIndex < old, update for new data
            if (
                newFlow.length <= 0 ||
                newFlow.length !== flows.length ||
                (flows.length > 0 && flows[0].DataFrameIndex !== newFlow[0].DataFrameIndex)
            ) {
                newFlow = [...flows];
                setCurrent(newFlow)
                return
            }
        }

        update()
        const updateId = setInterval(update, 1000)

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`);
            clearInterval(updateId)
        }
    }, [props.token])

    return <ResizeBox
        isVer={true}
        firstNode={<AutoCard
            title={"Websocket DataFrame Live Preview"} size={"small"} bordered={false}
            bodyStyle={{overflowY: "auto", overflowX: "hidden", padding: 0}}
        >
            <List<WebsocketFlowFromFuzzer>
                dataSource={current}
                pagination={{pageSize: 40, simple: true}}
                split={false}
                renderItem={(item: WebsocketFlowFromFuzzer) => {
                    return <div key={item.DataFrameIndex}
                    >
                        <AutoCard
                            size={"small"} bordered={true}
                            hoverable={true} style={{marginBottom: 4}}
                            bodyStyle={{
                                paddingTop: 4, paddingBottom: 4,
                                backgroundColor: selected?.DataFrameIndex === item.DataFrameIndex ? "#a2bdff" : undefined,
                            }}
                            onClick={() => {
                                setSelected(item)
                            }}
                        >
                            <Space size={0}>
                                <div style={{width: "50px"}}>{`${item.DataFrameIndex}`}</div>
                                <Tag color={"geekblue"} style={{width: "50px"}}>{item.DataSizeVerbose}</Tag>
                                {item.FromServer ? <Tag
                                        color={"orange"}
                                        style={{width: "76px"}}
                                    >Server Response</Tag> :
                                    <Tag color={"green"} style={{width: "76px"}}>Client Request</Tag>}
                                {item.IsJson && <Tag color={"geekblue"}>JSON</Tag>}
                                {item.IsProtobuf && <Tag color={"red"}>Protobuf</Tag>}
                                <div style={{width: "100%"}}>
                                    <OneLine overflow={"hidden"}>{item.DataVerbose}</OneLine>
                                </div>
                            </Space>
                        </AutoCard>
                    </div>
                }}
            />
        </AutoCard>}
        secondNode={selected ? <AutoCard
            title={<Space>
                <div>DataFrame Details</div>
                {selected.FromServer ? <Tag
                        color={"orange"}
                        style={{width: "76px"}}
                    >Server Response</Tag> :
                    <Tag color={"green"} style={{width: "76px"}}>Client Request</Tag>}
                <Tag>Index: {selected?.DataFrameIndex}</Tag>
                <Tag>Data Size: {selected.DataSizeVerbose}</Tag>
            </Space>} size={"small"} bordered={true}
            bodyStyle={{padding: 0}}
            extra={<Space>
                <Button
                    size={"small"} type={"link"}
                    icon={<CopyOutlined/>}
                    onClick={() => {
                        callCopyToClipboard(Uint8ArrayToString(selected?.Data))
                    }}
                />
            </Space>}

        >
            <YakEditor
                type={(selected.IsJson || selected.IsProtobuf) ? "json" : "html"}
                value={Uint8ArrayToString(selected.Data)}
                triggerId={selected.DataFrameIndex}
                readOnly={true}
                noMiniMap={true}
            />
        </AutoCard> : <Empty description={"Select Websocket DataFrame to view details"}>

        </Empty>}
    />
};