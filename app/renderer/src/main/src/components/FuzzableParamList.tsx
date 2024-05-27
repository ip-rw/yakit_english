import React from "react"
import {Button, Typography, Space, Table, Tag, Popconfirm} from "antd"
import {FuzzableParams} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPPacketFuzzable} from "./HTTPHistory"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface FuzzableParamListProp extends HTTPPacketFuzzable {
    data: FuzzableParams[]
    sendToWebFuzzer?: () => any
}

export const FuzzableParamList: React.FC<FuzzableParamListProp> = (props) => {
    return (
        <Table<FuzzableParams>
            pagination={false}
            dataSource={props.data}
            rowKey={(row) => row.ParamName}
            columns={[
                {
                    title: "Param Name",
                    render: (i: FuzzableParams) => (
                        <Tag>
                            <Text
                                style={{maxWidth: 500}}
                                ellipsis={{
                                    tooltip: true
                                }}
                            >
                                {i.ParamName}
                            </Text>
                        </Tag>
                    )
                },
                {title: "Param Location", render: (i: FuzzableParams) => <Tag>{i.Position}</Tag>},
                {
                    title: "Param Original Value",
                    render: (i: FuzzableParams) => (
                        <Tag>
                            <Text
                                style={{maxWidth: 500}}
                                ellipsis={{
                                    tooltip: true
                                }}
                                copyable={true}
                            >
                                {i.OriginValue ? new Buffer(i.OriginValue).toString() : ""}
                            </Text>
                        </Tag>
                    )
                },
                {title: "IsHTTPS", render: (i: FuzzableParams) => <Tag>{i.IsHTTPS}</Tag>},
                {
                    title: "Actions",
                    render: (i: FuzzableParams) => (
                        <Space>
                            <Popconfirm
                                title={"Test This Param with Web Fuzzer"}
                                onConfirm={(e) => {
                                    ipcRenderer.invoke("send-to-tab", {
                                        type: "fuzzer",
                                        data: {
                                            isHttps: i.IsHTTPS,
                                            request: new Buffer(i.AutoTemplate).toString("utf8")
                                        }
                                    })
                                    if (props.sendToWebFuzzer) props.sendToWebFuzzer()
                                }}
                            >
                                <Button type={"primary"} size={"small"}>
                                    Fuzz This Param
                                </Button>
                            </Popconfirm>
                        </Space>
                    )
                }
            ]}
        ></Table>
    )
}
