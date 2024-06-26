import React, {useEffect, useState} from "react";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {Form, Select, Space} from "antd";
import {CopyableField, ManyMultiSelectForString, OneLine, SelectOne} from "@/utils/inputUtil";
import {PcapMetadata, TrafficPacket} from "@/models/Traffic";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {useMemoizedFn} from "ahooks";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {PacketListDemo} from "@/components/playground/PacketListDemo";
import {debugYakitModal, debugYakitModalAny} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {DemoItemSelectMultiForString} from "@/demoComponents/itemSelect/ItemSelect";
import {YakEditor} from "@/utils/editors";

export interface PcapXDemoProp {

}

const {ipcRenderer} = window.require("electron");


interface PcapXRequest {
    NetInterfaceList: string[]
}

export const PcapXDemo: React.FC<PcapXDemoProp> = (props) => {
    const [pcapMeta, setPcapMeta] = useState<PcapMetadata>();
    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(false);

    const [firstRequest, setFirstRequest] = useState<PcapXRequest>({
        NetInterfaceList: []
    });

    useEffect(() => {
        ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
            setPcapMeta(data)
            if (!!(data?.DefaultPublicNetInterface)) {
                setFirstRequest({...firstRequest, NetInterfaceList: [data.DefaultPublicNetInterface.Name]})
            }
        })
    }, [])

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {

        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[PcapX] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[PcapX] finished")
            setTimeout(() => setLoading(false), 300)
        })
        return () => {
            ipcRenderer.invoke("cancel-PcapX", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    const cancel = useMemoizedFn(() => {
        setToken(randomString(40))
        ipcRenderer.invoke("cancel-PcapX", token).finally(() => {
            setTimeout(() => setLoading(false), 300)
        })
    })

    const startSniff = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("PcapX", {
            ...firstRequest,
        }, token)
    })

    return <YakitResizeBox
        firstNode={<AutoCard
            size={"small"} bordered={false} title={"Set Parameters"}
            extra={<Space>
                {loading ? <YakitButton
                    colors={"danger"}
                    onClick={() => {
                        cancel()
                    }}>
                    Stop Sniffing
                </YakitButton> : <YakitButton onClick={() => {
                    startSniff()
                }}>
                    Start Sniffing
                </YakitButton>}
            </Space>}
            style={{marginTop: 3}}
        >
            <Form onSubmitCapture={e => {
                e.preventDefault()
            }} labelCol={{span: 5}} wrapperCol={{span: 14}} size={"small"}>
                <DemoItemSelectMultiForString
                    data={(pcapMeta?.AvailablePcapDevices || []).map(i => ({
                        value: i.Name, label: `${i.Name} ${i.IP}`
                    }))}
                    label={"NIC"}
                    setValue={(data) => {
                        setFirstRequest({...firstRequest, NetInterfaceList: data.split(",")})
                    }}
                    value={firstRequest.NetInterfaceList.join(",")}
                    help={<Space>
                        {
                            pcapMeta?.DefaultPublicNetInterface &&
                            <div>Default NIC: {pcapMeta?.DefaultPublicNetInterface.Name}</div>
                        }
                    </Space>}
                    disabled={loading}
                />

                {loading ? <>
                    <DemoItemSelectMultiForString
                        label={"View Table"}
                        data={[
                            {value: "raw", label: "Raw Packets"},
                            {value: "tcp-reassembled", label: "TCP Data"},
                            {value: "session", label: "Active Sessions"},
                        ]}
                    />
                    <DemoItemSelectMultiForString
                        data={(pcapMeta?.AvailableSessionTypes || []).map(i => ({value: i.Value, label: i.Key}))}
                        label={"Session Protocol"}
                    />
                    <DemoItemSelectMultiForString
                        data={(pcapMeta?.AvailableLinkLayerTypes || []).map(i => ({value: i.Value, label: i.Key}))}
                        label={"Link Layer Protocol"}
                    />
                    <DemoItemSelectMultiForString
                        data={(pcapMeta?.AvailableNetworkLayerTypes || []).map(i => ({value: i.Value, label: i.Key}))}
                        label={"Network Layer Protocol"}
                    />
                    <DemoItemSelectMultiForString
                        data={(pcapMeta?.AvailableTransportLayerTypes || []).map(i => ({value: i.Value, label: i.Key}))}
                        label={"Transport Layer Protocol"}
                    />
                </> : <>

                </>}
            </Form>
        </AutoCard>}
        firstRatio={'400px'}
        secondNode={<div style={{overflow: "hidden", height: '100%', background: "#fcfcfc"}}>
            <PacketListDemo/>
        </div>}
    />
};