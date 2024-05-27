import React, {useEffect, useImperativeHandle, useRef, useState} from "react";
import {Alert, Badge, Button, Card, Divider, Form, Popover, Space, Spin, Tag, Timeline, Typography} from "antd";
import {ExecResult} from "../pages/invoker/schema";
import {showDrawer, showModal} from "./showModal";
import {ExecResultLog, ExecResultMessage} from "../pages/invoker/batch/ExecMessageViewer";
import {LogLevelToCode} from "../components/HTTPFlowTable/HTTPFlowTable";
import {YakitLogFormatter} from "../pages/invoker/YakitLogFormatter";
import {InputItem, SwitchItem} from "./inputUtil";
import {useGetState, useMemoizedFn} from "ahooks";
import {ReloadOutlined} from "@ant-design/icons";
import {getRemoteValue, setRemoteValue} from "./kv";
import {
    BRIDGE_ADDR,
    BRIDGE_SECRET,
    DNSLOG_ADDR,
    DNSLOG_INHERIT_BRIDGE,
    DNSLOG_SECRET
} from "../pages/reverse/ReverseServerPage";
import {failed, info} from "./notification";
import {RiskTable} from "../pages/risks/RiskTable";
import {YakExecutorParam} from "../pages/invoker/YakExecutorParams";
import useHoldingIPCRStream from "../hook/useHoldingIPCRStream";
import {randomString} from "./randomUtil";
import {PluginResultUI} from "../pages/yakitStore/viewers/base";
import {AutoCard} from "../components/AutoCard";
import { getReleaseEditionName, isCommunityEdition } from "./envfile";
import {NetInterface} from "@/models/Traffic";
import { YakitModal } from "@/components/yakitUI/YakitModal/YakitModal";

export interface YakVersionProp {

}

const {ipcRenderer} = window.require("electron");

export const callCopyToClipboard = (str: string) => {
    ipcRenderer.invoke("copy-clipboard", str).then(() => {
        info("Copy Finished")
    })
}

export const YakVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");


    useEffect(() => {
        ipcRenderer.invoke("query-latest-yak-version").then((data: string) => {
            setLatestVersion(data)
        }).catch(() => {
        }).finally(
        )

        ipcRenderer.on("fetch-yak-version-callback", async (e: any, data) => {
            setVersion(data)
        })

        ipcRenderer.invoke("fetch-yak-version")
        return () => {
            ipcRenderer.removeAllListeners("fetch-yak-version-callback")
        }
    }, [])

    if (!version) {
        return <Spin tip={"Loading yak Version"}/>
    }
    const isDev = version.toLowerCase().includes("dev");

    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yak-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"}
                    onClick={() => {
                        if (!newVersion) {
                            return
                        }

                        showModal({
                            title: "New Yak Core Engine Upgrade Available！",
                            content: <>
                                If You're Not Busy
                                <br/>
                                We Recommend Exiting Current Engine, Click on Welcome Screen for
                                <br/>
                                "Install/Upgrade Yak Engine" Free Upgrade
                            </>
                        })
                    }}>
                Yak-{version}
            </Button>
        </Badge>
    </div>
};

export const YakitVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("query-latest-yakit-version").then(nv => {
            setLatestVersion(nv)
        })
        ipcRenderer.invoke("yakit-version").then(v => setVersion(`v${v}`))
    }, [])

    if (!version) {
        return <Spin tip={"Loading yakit Version"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            {getReleaseEditionName()}-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"} onClick={() => {
                if (!newVersion) {
                    return
                }

                showModal({
                    title: `New ${getReleaseEditionName()} Upgrade Available！`,
                    content: <>
                        If You're Not Busy
                        <br/>
                        {/* We Recommend Entering <Button
                        type={"primary"}
                        onClick={() => {
                            openExternalWebsite("https://github.com/yaklang/yakit/releases")
                        }}
                    >Yakit Github Release Page</Button> Download and Upgrade to Latest！ */}
                        We Recommend Exiting to Activation Page for Latest Upgrade
                    </>
                })
            }}>
                {getReleaseEditionName()}-{version}
            </Button>
        </Badge>
    </div>
};

export interface AutoUpdateYakModuleViewerProp {

}

export const AutoUpdateYakModuleViewer: React.FC<AutoUpdateYakModuleViewerProp> = (props) => {
    const [end, setEnd] = useState(false);
    const [error, setError] = useState("");
    const [msg, setMsgs] = useState<ExecResultMessage[]>([]);

    useEffect(() => {
        const messages: ExecResultMessage[] = []
        ipcRenderer.on("client-auto-update-yak-module-data", (e, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));
                    messages.unshift(obj)
                } catch (e) {

                }
            }
        });
        ipcRenderer.on("client-auto-update-yak-module-end", (e) => {
            setEnd(true)

        });
        ipcRenderer.on("client-auto-update-yak-module-error", (e, msg: any) => {
            setError(`${msg}`)
        });
        ipcRenderer.invoke("auto-update-yak-module")
        let id = setInterval(() => setMsgs([...messages]), 1000)
        return () => {
            clearInterval(id);
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-data")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-error")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-end")
        }
    }, [])

    return <Card title={"Auto-Update Progress"}>
        <Space direction={"vertical"} style={{width: "100%"}} size={12}>
            {error && <Alert type={"error"} message={error}/>}
            {end && <Alert type={"info"} message={"Update Finished"}/>}
            <Timeline pending={!end} style={{marginTop: 20}}>
                {(msg || []).filter(i => i.type === "log").map(i => i.content as ExecResultLog).map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Space>
    </Card>;
};

const {Text} = Typography;

export const ConfigGlobalReverse = React.memo(() => {
    const [addr, setAddr, getAddr] = useGetState("");
    const [password, setPassword, getPassword] = useGetState("");
    const [localIP, setLocalIP, getLocalIP] = useGetState("");
    const [ifaces, setIfaces] = useState<NetInterface[]>([]);
    const [ok, setOk] = useState(false)

    // DNSLog Settings
    const [inheritBridge, setInheritBridge] = useState(false);
    const [dnslogAddr, setDNSLogAddr] = useState("ns1.cybertunnel.run:64333");
    const [dnslogPassword, setDNSLogPassword] = useState("");

    const getStatus = useMemoizedFn(() => {
        ipcRenderer.invoke("get-global-reverse-server-status").then((r) => {
            setOk(r)
            setRemoteValue(BRIDGE_ADDR, addr)
            setRemoteValue(BRIDGE_SECRET, password)
        })
    })

    useEffect(() => {
        getStatus()
        let id = setInterval(() => {
            getStatus()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        if (!inheritBridge) {
            setDNSLogPassword("")
            setDNSLogAddr("ns1.cybertunnel.run:64333")
        }
    }, [inheritBridge])

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-global-reverse-server-status").finally(() => {
            getStatus()
        })
    });
    const login = useMemoizedFn(() => {
        ipcRenderer.invoke("ConfigGlobalReverse", {
            ConnectParams: {Addr: addr, Secret: password},
            LocalAddr: localIP,
        }).then(() => {
            getStatus()
            if (inheritBridge) {
                ipcRenderer.invoke("SetYakBridgeLogServer", {
                    DNSLogAddr: addr, DNSLogSecret: password,
                }).then(() => {
                    info("Global DNSLog configured")
                }).catch(e => {
                    failed(`Global DNSLog configuration failed：${e}`)
                })
            } else {
                setRemoteValue(DNSLOG_ADDR, dnslogAddr)
                setRemoteValue(DNSLOG_SECRET, dnslogPassword)
                ipcRenderer.invoke("SetYakBridgeLogServer", {
                    DNSLogAddr: dnslogAddr, DNSLogSecret: dnslogPassword,
                }).then(() => {
                    info("Global DNSLog configured")
                }).catch(e => {
                    failed(`Global DNSLog configuration failed：${e}`)
                })
            }
        }).catch(e => {
            failed(`Config Global Reverse Server failed: ${e}`)
        })
    })

    // Configure Bridge
    useEffect(() => {
        getRemoteValue(BRIDGE_ADDR).then((data: string) => {
            if (!!data) {
                setAddr(`${data}`)
            }
        })

        getRemoteValue(BRIDGE_SECRET).then((data: string) => {
            if (!!data) {
                setPassword(`${data}`)
            }
        })

        getRemoteValue(DNSLOG_INHERIT_BRIDGE).then(data => {
            switch (`${data}`) {
                case "true":
                    setInheritBridge(true)
                    return
                case "false":
                    setInheritBridge(false)
                    getRemoteValue(DNSLOG_ADDR).then((data: string) => {
                        if (!!data) {
                            setDNSLogAddr(`${data}`)
                        }
                    })
                    getRemoteValue(DNSLOG_SECRET).then((data: string) => {
                        if (!!data) {
                            setDNSLogPassword(`${data}`)
                        }
                    })
                    return
            }
        })

        return () => {
            // cancel()
        }
    }, [])

    // // Connect Immediately if Both addr and password Exist and Not Yet Connected
    // useEffect(() => {
    //     // Exit if Already Connected
    //     if (ok) {
    //         return
    //     }
    //
    //     if (!!addr && !!password) {
    //         login()
    //         let id = setInterval(() => {
    //             login()
    //         }, 1000)
    //         return () => {
    //             clearInterval(id)
    //         }
    //     }
    // }, [addr, password, ok])

    const updateIface = useMemoizedFn(() => {
        ipcRenderer.invoke("AvailableLocalAddr", {}).then((data: { Interfaces: NetInterface[] }) => {
            const arr = (data.Interfaces || []).filter(i => i.IP !== "127.0.0.1");
            setIfaces(arr)
        })
    })

    useEffect(() => {
        if (ifaces.length === 1) {
            setLocalIP(ifaces[0].IP)
        }
    }, [ifaces])

    useEffect(() => {
        ipcRenderer.on("global-reverse-error", (e, data) => {
            failed(`Global Reverse Connection Failed：${data}`)
        })
        return () => {
            ipcRenderer.removeAllListeners("global-reverse-error")
        }
    }, [])

    return <div>
        <Form
            style={{marginTop: 20}}
            onSubmitCapture={e => {
                e.preventDefault()

                login()
                setRemoteValue(DNSLOG_INHERIT_BRIDGE, `${inheritBridge}`)
            }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
            <InputItem
                label={"Local Reverse Connection IP"}
                value={localIP} disable={ok}
                setValue={setLocalIP}
                autoComplete={ifaces.filter((item) => !!item.IP).map((item) => item.IP)}
                help={<div>
                    <Button type={"link"} size={"small"} onClick={() => {
                        updateIface()
                    }} icon={<ReloadOutlined/>}>
                        Update yak Engine Local IP
                    </Button>
                </div>}
            />
            <Divider orientation={"left"}>Public Reverse Connection Settings</Divider>
            <Form.Item label={" "} colon={false}>
                <Alert message={<Space direction={"vertical"}>
                    <div>Run on Public Server</div>
                    <Text code={true} copyable={true}>yak bridge --secret [your-password]</Text>
                    <div>or</div>
                    <Text code={true} copyable={true}>
                        docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret
                        [your-password]
                    </Text>
                    <div>Configured</div>
                </Space>}/>
            </Form.Item>
            <InputItem
                label={"Yak Bridge Address"} value={addr}
                setValue={setAddr} disable={ok}
                help={"Format host:port, e.g., cybertunnel.run:64333"}
            />
            <InputItem
                label={"Yak Bridge Password"}
                setValue={setPassword} value={password}
                type={"password"} disable={ok}
                help={`--secret Value for yak bridge Command`}
            />
            <Divider orientation={"left"}>{isCommunityEdition()&&'Yakit'} Global DNSLog Settings</Divider>
            <SwitchItem
                label={"Reuse Yak Bridge Settings"} disabled={ok}
                value={inheritBridge} setValue={setInheritBridge}/>
            {!inheritBridge && <InputItem
                label={"DNSLog Settings"} disable={ok}
                value={dnslogAddr}
                help={"Set Yak Bridge's DNSLog Address: [ip]:[port]"}
                setValue={setDNSLogAddr}
            />}
            {!inheritBridge && <InputItem
                label={"DNSLog Password"} disable={ok}
                value={dnslogPassword}
                setValue={setDNSLogPassword}
            />}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit" disabled={ok}> Setup Reverse Connection </Button>
                {ok && <Button type="primary" danger={true} onClick={() => {
                    cancel()
                }}> Exec Plugin Names Array </Button>}
            </Form.Item>
        </Form>
    </div>
});

export interface YakScriptParam {
    Script: string
    Params: YakExecutorParam[]
}

interface StartExecYakCodeModalProps {
    visible: boolean
    onClose: () => void
    noErrorsLogCallBack?: () => void
    verbose: string,
    params: YakScriptParam,
    successInfo?: boolean
}
export const StartExecYakCodeModal: React.FC<StartExecYakCodeModalProps> = (props) => {
    const {visible, onClose, params, verbose, successInfo, noErrorsLogCallBack} = props

    const startToExecYakScriptViewerRef = useRef<any>()

    const onCancel = () => {
        ipcRenderer.invoke("cancel-ExecYakCode", startToExecYakScriptViewerRef.current.token)
        
        onClose()
    }

    const [refresh, setRefresh] = useState<number>(Math.random())
    useEffect(() => {
        setRefresh(Math.random())
    }, [visible])

    return (
        <YakitModal
            visible={visible}
            type='white'
            width="60%"
            maskClosable={false}
            destroyOnClose={true}
            title={`Executing：${verbose}`}
            onCancel={onCancel}
            closable={true}
            footer={null}
        >
            <div style={{height: 400, overflowY: "auto"}}>
                <StartToExecYakScriptViewer
                    key={refresh}
                    ref={startToExecYakScriptViewerRef} 
                    noErrorsLogCallBack={noErrorsLogCallBack}
                    script={params} 
                    verbose={verbose} 
                    successInfo={successInfo} 
                    onCancel={onCancel}
                />
            </div>
        </YakitModal>
    )
}

const StartToExecYakScriptViewer = React.forwardRef((props: {
    ref: any
    noErrorsLogCallBack?: () => void
    verbose: string,
    script: YakScriptParam,
    successInfo?: boolean
    onCancel: () => void
}, ref) => {
    const {script, verbose, successInfo = true, onCancel, noErrorsLogCallBack} = props;
    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(true);
    const [messageStateStr, setMessageStateStr] = useState<string>("");
    const checkErrorsFlagRef = useRef<boolean>(false)

    useImperativeHandle(ref, () => ({
        token,
    }))
    
    const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream(
        verbose, "ExecYakCode",
        token, () => setTimeout(() => setLoading(false), 300),
        () => {
            ipcRenderer.invoke("ExecYakCode", script, token).then(() => {
                successInfo && info(`Risk Items ${verbose} Success`)
            }).catch(e => {
                failed(`Risk Items ${verbose} Encountered an Issue：${e}`)
            })
        }
    )
    useEffect(() => {
        setMessageStateStr(JSON.stringify(infoState.messageState))
    }, [infoState.messageState])

    useEffect(() => {
        if (messageStateStr !== "") {
            const messageState = JSON.parse(messageStateStr)
            for (let i = 0; i < messageState.length; i++) {
                const item = messageState[i];
                if (item.level === "error") {
                    checkErrorsFlagRef.current = true
                    return
                }
            }
            // All Logs Imported Without Errors
            if (!checkErrorsFlagRef.current && !loading && messageState.length) {
                noErrorsLogCallBack && noErrorsLogCallBack()
                onCancel()
            }
        }
    }, [messageStateStr, loading])

    return (
        <PluginResultUI
            loading={loading} defaultConsole={false}
            statusCards={infoState.statusState}
            risks={infoState.riskState}
            featureType={infoState.featureTypeState}
            feature={infoState.featureMessageState}
            progress={infoState.processState}
            results={infoState.messageState}
            onXtermRef={setXtermRef}
        />
    )
})

export const IsWindows = () => {
    return ipcRenderer.invoke("is-windows")
}