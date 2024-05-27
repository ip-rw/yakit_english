import React, {useState} from "react";
import {Form, Space, Table, Tag} from "antd";
import {ReverseNotification} from "./ReverseServerPage";
import {CopyableField, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil";
import {AutoSpin} from "../../components/AutoSpin";

export interface ReverseNotificationTableProps {
    loading: boolean
    logs: ReverseNotification[]
}

export const ReverseNotificationTable = React.memo<ReverseNotificationTableProps>((props: ReverseNotificationTableProps) => {
    let logs = props.logs;
    const [withToken, setWithToken] = useState(false);
    const [type, setType] = useState<"rmi" | "rmi-handshake" | "tcp" | "http" | "https" | string>("");

    if (withToken) {
        logs = logs.filter(i => !!i.token)
    }

    if (!!type) {
        const types = type.split(",");
        logs = logs.filter(i => types.includes(i.type))
    }

    return <Table<ReverseNotification>
        title={() => {
            return <>
                {props.loading ? <Space>
                    <AutoSpin spinning={props.loading} size={"small"}/>
                    <div>
                        <Form onSubmitCapture={e => e.preventDefault()} layout={"inline"}>
                            <SwitchItem
                                size={"small"}
                                label={"View Token Only"}
                                value={withToken}
                                setValue={setWithToken}
                                formItemStyle={{marginBottom: 0}}
                            />

                            <ManyMultiSelectForString
                                label={"Type"} value={type}
                                setValue={e => {
                                    setWithToken(false)
                                    setType(e)
                                }}
                                formItemStyle={{marginBottom: 0, minWidth: 200}}
                                data={[
                                    {value: "rmi", label: "RMI Conn"},
                                    {value: "rmi-handshake", label: "RMI Handshake"},
                                    {value: "http", label: "HTTP"},
                                    {value: "https", label: "HTTPS"},
                                    {value: "tcp", label: "TCP"},
                                    {value: "tls", label: "TLS"},
                                ]}
                            />
                        </Form>
                    </div>
                </Space> : ""}
            </>
        }}
        dataSource={logs}
        bordered={true} size={"small"}
        rowKey={(i) => i.uuid}
        columns={[
            {
                title: "Reverse Conn Type", render: (i: ReverseNotification) => {
                    switch (i.type) {
                        case "rmi":
                            return <Tag color={"red"}>RMI Conn</Tag>
                        case "rmi-handshake":
                            return <Tag color={"orange"}>RMI Handshake</Tag>
                        case "http":
                            return <Tag color={"red"}>HTTP</Tag>
                        case "https":
                            return <Tag color={"red"}>HTTPS</Tag>
                        case "tls":
                            return <Tag color={"orange"}>TLS</Tag>
                        case "tcp":
                            return <Tag color={"green"}>TCP</Tag>
                        default:
                            return <Tag color={"geekblue"}>{i.type}</Tag>
                    }
                }
            },
            {
                title: "Conn Source",
                render: (i: ReverseNotification) => <CopyableField text={i.remote_addr} noCopy={!i.remote_addr}/>
            },
            {title: "TOKEN", render: (i: ReverseNotification) => <CopyableField text={i.token} noCopy={!i.token}/>},
        ]}
    >

    </Table>
});