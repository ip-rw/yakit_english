import React, {useEffect, useState} from "react";
import {Form, Space} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {ChaosMakerRuleGroup} from "@/pages/chaosmaker/ChaosMaker";
import {showModal} from "@/utils/showModal";
import {InputInteger, InputItem} from "@/utils/inputUtil";
import {failed, info} from "@/utils/notification";
import {debugYakitModal, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {useMemoizedFn} from "ahooks";
import {showByContextMenu} from "@/components/functionTemplate/showByContext";
import {showByCursorMenu} from "@/utils/showByCursor";

const {ipcRenderer} = window.require("electron");

export interface ChaosMakerOperatorsProp {
    running?: boolean
    groups: ChaosMakerRuleGroup[]
    onExecute: (data: ExecuteChaosMakerRuleRequest) => any
    couldBeenReset?: boolean
    onReset?: () => any
}

export interface ExecuteChaosMakerRuleRequest {
    Groups: ChaosMakerRuleGroup[];
    ExtraOverrideDestinationAddress: string[];
    Concurrent: number;
    TrafficDelayMinSeconds: number;
    TrafficDelayMaxSeconds: number;
    ExtraRepeat: number;
    GroupGapSeconds: number;
}

export const ChaosMakerOperators: React.FC<ChaosMakerOperatorsProp> = (props) => {
    const [params, setParams] = useState<ExecuteChaosMakerRuleRequest>({
        Concurrent: 10,
        ExtraOverrideDestinationAddress: [],
        ExtraRepeat: -1,
        GroupGapSeconds: 5,
        Groups: [], TrafficDelayMaxSeconds: 0, TrafficDelayMinSeconds: 0
    });
    const [availableAddrs, setAvailableAddrs] = useState<IsRemoteAddrAvailableResponse[]>([]);

    const updateAvailableAddrs = useMemoizedFn(() => {
        ipcRenderer.invoke("GetRegisteredVulinboxAgent", {}).then((data: { Agents: IsRemoteAddrAvailableResponse[] }) => {
            setAvailableAddrs(data.Agents)
            // debugYakitModal(data)
        }).catch(e => {
            if (e) {
                failed(`Fetch Probe List Failed: ${e}`)
            }
        })
    })

    const debugUpdateAvailableAddrs = useMemoizedFn(() => {
        ipcRenderer.invoke("GetRegisteredVulinboxAgent", {}).then((data: { Agents: IsRemoteAddrAvailableResponse[] }) => {
            // setAvailableAddrs(data.Agents)
            debugYakitModal(data)
        }).catch(e => {
            if (e) {
                failed(`Fetch Probe List Failed: ${e}`)
            }
        })
    })

    useEffect(() => {
        const id = setInterval(() => {
            updateAvailableAddrs()
        }, 5000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        setParams({...params, Groups: (props?.groups || [])})
    }, [props.groups])

    useEffect(() => {
        setParams({
            ...params, ExtraOverrideDestinationAddress: availableAddrs.map(i => {
                return i.Addr
            })
        })
    }, [availableAddrs])

    return <Form onSubmitCapture={e => {
        e.preventDefault()

    }} layout={"vertical"} disabled={props.running}>
        <Form.Item help={"Adding Probe Sends Extra Sim Attack Traffic"}>
            <div style={{display: 'flex', gap: '8px'}}>
                {availableAddrs.map(i => {
                    return <AutoCard
                        onClick={e => {
                            showByCursorMenu({
                                content: [
                                    {
                                        title: "Disconnect & Remove Agent", onClick: () => {
                                            ipcRenderer.invoke("DisconnectVulinboxAgent", {
                                                Addr: i.Addr,
                                            }).then(() => {
                                                info("Disconnect & Remove Succeeded")
                                            }).catch(e => {
                                                failed(`Disconnect & Remove Failed: ${e}`)
                                            }).finally(() => {
                                                updateAvailableAddrs()
                                            })
                                        }
                                    }
                                ]
                            }, e.clientX, e.clientY)
                        }}
                        style={{
                            height: 40, width: 40, borderRadius: '6px',
                            backgroundColor: (() => {
                                switch (i.Status) {
                                    case "offline":
                                        return "#eee"
                                    case "online":
                                        return "#FFC085"
                                    default:
                                        return "#2BB5B4"
                                }
                            })(),
                            color: "#fff", fontWeight: "bold",
                        }}
                    >{i.Addr}[{(() => {
                        switch (i.Status) {
                            case "offline":
                                return "Offline"
                            case "online":
                                return "Online"
                            default:
                                return "External"
                        }
                    })()}]</AutoCard>
                })}
                <AutoCard style={{height: 60, width: 200, borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <YakitButton type={"text"} onClick={(e) => {
                        showByCursorMenu({
                            content: [
                                {
                                    title: "Add Node", onClick: () => {
                                        const m = showModal({
                                            title: "Add New BAS Node", width: "50%",
                                            content: (
                                                <AddBASAgent onFinished={(data) => {
                                                    if (data.IsAvailable) {
                                                        m.destroy()
                                                        updateAvailableAddrs()
                                                        return
                                                    } else {
                                                        showYakitModal({
                                                            title: "Error Alert",
                                                            content: (
                                                                <div style={{margin: 24}}>
                                                                    Add Agent Failed：{data.Reason}
                                                                </div>
                                                            ),
                                                            okButtonProps: {hidden: true},
                                                            cancelButtonProps: {hidden: true},
                                                        })
                                                        failed(`Add BAS Agent Failed：${data.Reason}`)
                                                    }
                                                }}/>
                                            )
                                        })
                                    }
                                },
                                {
                                    title: "View Node Info", onClick: () => {
                                        debugUpdateAvailableAddrs()
                                    }
                                }
                            ]
                        }, e.clientX, e.clientY)
                    }}>Add Probe</YakitButton>
                </AutoCard>
                {
                    props.couldBeenReset ? <AutoCard
                        style={{
                            height: 60, width: 200, borderRadius: '6px',
                            border: '1px solid var(--yakit-primary-5)',
                            backgroundColor: '#e01f1f',
                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}
                        hoverable={true}
                        onClick={() => {
                            if (props.onReset) {
                                props.onReset()
                            }
                        }}
                    >
                        <div style={{fontWeight: "bold", color: "#fff"}}>
                            Reset BAS Console
                        </div>
                    </AutoCard> : <AutoCard style={{
                        height: 60, width: 200, borderRadius: '6px',
                        border: '1px solid var(--yakit-primary-3)',
                        backgroundColor: '#F28B44',
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }} hoverable={true} onClick={() => {
                        if (props.onExecute) {
                            props.onExecute(params)
                        }
                    }}>
                        <div style={{fontWeight: "bold", color: "#fff"}}>
                            Configure Sim Attack Params
                        </div>
                    </AutoCard>
                }

            </div>
        </Form.Item>
    </Form>
};

export interface AddBASAgentProp {
    onFinished: (rsp: IsRemoteAddrAvailableResponse) => any
}

interface IsRemoteAddrAvailableResponse {
    Addr: string;
    IsAvailable: boolean;
    Reason: string;
    Status: string;
    PingCount: number;
    RequestCount: number;
    LastActiveAt: number
}


export const AddBASAgent: React.FC<AddBASAgentProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [params, setParams] = useState<{
        Addr: string,
        Timeout: number,
        Probe: string
    }>({Addr: "", Timeout: 5, Probe: ""})
    const [response, setResponse] = useState<IsRemoteAddrAvailableResponse>();

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            setLoading(true)
            ipcRenderer.invoke("IsRemoteAddrAvailable", params).then((data: IsRemoteAddrAvailableResponse) => {
                setResponse(data)
                if (data && !!props.onFinished) {
                    props.onFinished(data)
                }
            }).catch(e => {
                failed(`Detect BAS Node Failed：${e}`)
            }).finally(() => setTimeout(() => setLoading(false), 300))
        }}
    >
        <InputItem
            label={"Import Address Needed"} required={true} setValue={Addr => setParams({...params, Addr})}
            value={params.Addr} disable={loading} autoComplete={["127.0.0.1:8787"]}
        />
        <InputInteger label={"Connection Timeout"} setValue={Timeout => setParams({...params, Timeout})} value={params.Timeout}
                      disable={loading}/>
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit" loading={loading}> Add This Node </YakitButton>
        </Form.Item>
    </Form>
};