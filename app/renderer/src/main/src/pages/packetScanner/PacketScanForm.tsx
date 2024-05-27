import React, {useEffect, useState} from "react";
import {Button, Form} from "antd";
import {InputInteger, InputItem} from "@/utils/inputUtil";
import {failed, info} from "@/utils/notification";
import {ExecResult} from "@/pages/invoker/schema";

export interface PacketScanFormProp {
    token: string
    httpFlowIds?: number[]
    plugins: string[]
    https?: boolean
    httpRequest?: Uint8Array
}

export interface ExecPacketScanRequest {
    HTTPFlow: number[]
    HTTPRequest?: Uint8Array
    HTTPS: boolean
    AllowFuzzTag?: boolean
    TotalTimeoutSeconds?: number
    Timeout?: number
    PluginConcurrent?: number
    PacketConcurrent?: number
    PluginList: string[]
    Proxy?: string
}

function defaultPacketScanRequestParams(): ExecPacketScanRequest {
    return {
        HTTPFlow: [],
        HTTPRequest: new Uint8Array(),
        HTTPS: false,
        AllowFuzzTag: false,
        TotalTimeoutSeconds: 300,
        Timeout: 10,
        PacketConcurrent: 10,
        PluginConcurrent: 10,
        PluginList: [] as string[],
        Proxy: ""
    }
}

const {ipcRenderer} = window.require("electron");

export const PacketScanForm: React.FC<PacketScanFormProp> = (props) => {
    const [params, setParams] = useState(defaultPacketScanRequestParams());
    const [loading, setLoading] = useState(false);

    const {token, httpFlowIds, plugins, https, httpRequest} = props;

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[ExecPacketScan] finished")
            setLoading(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-ExecPacketScan", token)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <Form onSubmitCapture={e => {
        e.preventDefault()

        if (plugins.length < 0) {
            info("Scan Unavailable Without Plugin Selection")
            return
        }

        setLoading(true)
        ipcRenderer.invoke("ExecPacketScan", {
            ...params,
            HTTPFlow: httpFlowIds,
            HTTPS: https,
            HTTPRequest: httpRequest,
            PluginList: plugins
        } as ExecPacketScanRequest, token).then(() => {
            info("Begin Packet Scan")
        })
    }} layout={"horizontal"}>
        <Form.Item style={{marginBottom: 4}}>
            {loading && <Button type={"primary"} danger={true} onClick={() => {
                ipcRenderer.invoke("cancel-ExecPacketScan", token)
            }}>Stop Task</Button>}
            {!loading && <Button type="primary" htmlType="submit"> Start Scan </Button>}
        </Form.Item>
        {/*<InputInteger*/}
        {/*    label={"Set Request Timeout"}*/}
        {/*    setValue={Timeout => setParams({...params, Timeout})} value={params.Timeout}*/}
        {/*/>*/}
        <InputInteger
            size={"small"}
            label={"Total Timeout"}
            setValue={TotalTimeoutSeconds => setParams({...params, TotalTimeoutSeconds})}
            value={params.TotalTimeoutSeconds}
        />
    </Form>
};