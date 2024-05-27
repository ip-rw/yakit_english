import React, {useEffect, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {AutoCard} from "@/components/AutoCard";
import {useGetState, useMemoizedFn} from "ahooks";
import {Button, Checkbox, Form, Popconfirm, Popover, Space, Spin, Tag} from "antd";
import {YakEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {WebsocketFlowFromFuzzer} from "@/pages/websocket/WebsocketFlowViewer";
import {InputInteger, InputItem, SelectOne} from "@/utils/inputUtil";
import {getRemoteValue, setRemoteValue} from "@/utils/kv";
import {SettingFilled} from "@ant-design/icons";
import {AutoSpin} from "@/components/AutoSpin";

export interface WebsocketClientOperatorProp {
    toServer?: Uint8Array
    tls?: boolean
    request?: Uint8Array
    onToken: (i: string) => any
}

const {ipcRenderer} = window.require("electron");

const YAKIT_WEBSOCKET_PROXY_DEFAULT = "YAKIT_WEBSOCKET_PROXY_DEFAULT"

export const WebsocketClientOperator: React.FC<WebsocketClientOperatorProp> = (props) => {
    const [_executing, setExecuting, getExecuting] = useGetState(false);
    const [_request, setRequest, getRequest] = useGetState(props.request ? props.request : new Uint8Array);
    const [_ursp, setUpgradeResponse, getUpgradeResponse] = useGetState<string>("");
    const [_toServer, setToServer, getToServer] = useGetState(Uint8ArrayToString(props.toServer || new Uint8Array));
    const [mode, setMode] = useState<"request" | "response">("request");

    // Extra params
    const [tls, setTls] = useState(!!props.tls);
    const [timeoutSeconds, setTimeoutSeconds] = useState(3600);
    const [proxy, setProxy] = useState("");

    // Set random string
    //    Handle on finish
    const [_token, setToken, getToken] = useGetState(randomString(30));

    useEffect(() => {
        props.onToken(getToken())
    }, [getToken()])

    // Load env variables
    useEffect(() => {
        getRemoteValue(YAKIT_WEBSOCKET_PROXY_DEFAULT).then(e => {
            if (!e) {
                return
            }
            setProxy(e)
        })
    }, [])

    // Data channel
    useEffect(() => {
        const token = getToken()

        ipcRenderer.on(`${token}-error`, (e, error) => {
            if (`${error}`.includes(`Cancelled on client`)) {
                return
            }
            failed(`[CreateWebsocketFuzzer] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[CreateWebsocketFuzzer] finished")
            setToken(randomString(30))
            setTimeout(() => setExecuting(false), 200)
            setMode("request")
        })

        /*
        * Passing by, usually don't need removeAll, Viewer exits will removeAll, no rush
        * */
        ipcRenderer.on(`${token}-data`, async (e, data: WebsocketFlowFromFuzzer) => {
            if (data.IsUpgradeResponse) {
                const upgradeResponseStr = Uint8ArrayToString(data.UpgradeResponse);
                setUpgradeResponse(upgradeResponseStr)
                setMode("response")
            }
        })

        return () => {
            ipcRenderer.invoke("cancel-CreateWebsocketFuzzer", token)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [_token])

    const submit = useMemoizedFn(() => {
        setUpgradeResponse("")
        ipcRenderer.invoke("CreateWebsocketFuzzer", {
            UpgradeRequest: getRequest(),
            IsTLS: tls,
            ToServer: StringToUint8Array(getToServer()),
            Proxy: proxy,
            TotalTimeoutSeconds: timeoutSeconds,
        }, getToken()).then(() => {
            setExecuting(true)
        }).finally(() => {
            setRemoteValue(YAKIT_WEBSOCKET_PROXY_DEFAULT, proxy)
        })
    })

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-CreateWebsocketFuzzer", getToken())
    })

    const sendToServer = useMemoizedFn(() => {
        ipcRenderer.invoke("CreateWebsocketFuzzer", {
            ToServer: StringToUint8Array(getToServer())
        }, getToken())
    })

    const websocketBuildFinished = getExecuting() && !!getUpgradeResponse()

    return <ResizeBox
        isVer={true}
        firstNode={() => {
            return <AutoCard
                size={"small"} bordered={true} title={<Space size={4}>
                <SelectOne size={"small"} data={[
                    {value: "request", text: "Request"},
                    {value: "response", text: "Response"},
                ]} value={mode} setValue={setMode} formItemStyle={{marginBottom: 0}}/>
                {websocketBuildFinished ? <Tag color={"green"}>Connection established</Tag> : <Tag color={"orange"}>Connection not established</Tag>}
            </Space>}
                bodyStyle={{padding: 0}}
                extra={(
                    <Space>
                        <Popover
                            title={"Set Extra Params"}
                            trigger={["click"]}
                            content={() => {
                                return <Form
                                    size={"small"} onSubmitCapture={e => {
                                }}
                                    layout={"vertical"}
                                    style={{width: "180px"}}
                                >
                                    <InputItem
                                        value={proxy} setValue={setProxy}
                                        label={"Set Proxy"}
                                        autoComplete={[
                                            "http://127.0.0.1:7890",
                                            "socks5://127.0.0.1:7890",
                                            "http://127.0.0.1:8085",
                                            "http://127.0.0.1:7891",
                                            "socks5://127.0.0.1:7891",
                                            "http://127.0.0.1:8083",
                                            "http://127.0.0.1:8080",
                                            "http://127.0.0.1:8081",
                                        ]}
                                    />
                                    <InputInteger
                                        label={"Timeout setting(s)"}
                                        value={timeoutSeconds}
                                        setValue={setTimeoutSeconds}
                                        min={10}
                                    />
                                </Form>
                            }}
                        >
                            <Button
                                size={"small"} type={"link"}
                                icon={<SettingFilled/>}
                            />
                        </Popover>
                        <Form.Item style={{marginBottom: 0}}>
                            <Checkbox checked={tls} onChange={() => {
                                setTls(!tls)
                            }}>TLS</Checkbox>
                        </Form.Item>
                        {getExecuting() ? (
                            <Popconfirm title={"Confirm closing Websocket?？"} onConfirm={cancel}>
                                <Button
                                    size={"small"}
                                    type={"primary"}
                                    danger={true}
                                >
                                    Disconnect
                                </Button>
                            </Popconfirm>
                        ) : <Button
                            size={"small"}
                            type={"primary"}
                            onClick={() => {
                                submit()
                            }}
                        >
                            Connect
                        </Button>}
                    </Space>
                )}
            >
                {mode === "request" && <YakEditor
                    triggerId={mode}
                    noLineNumber={true}
                    type={"http"}
                    value={Uint8ArrayToString(getRequest())}
                    noMiniMap={true}
                    setValue={s => {
                        setRequest(StringToUint8Array(s, "utf8"))
                    }}
                />}
                {mode === "response" && <AutoSpin
                    spinning={!getUpgradeResponse()}
                    tip={"Building Websocket connection"}
                >
                    <YakEditor
                        readOnly={true}
                        noLineNumber={true}
                        type={"http"}
                        triggerId={mode}
                        value={getUpgradeResponse() ? getUpgradeResponse() : ""}
                        noMiniMap={true}
                    />
                </AutoSpin>}
            </AutoCard>
        }}
        firstRatio={"300px"}
        firstMinSize={"300px"}
        secondNode={() => {
            return <AutoCard
                size={"small"} bordered={false}
                extra={<Space>
                    <Button
                        size={"small"} type={"primary"}
                        disabled={!websocketBuildFinished}
                        onClick={() => {
                            sendToServer()
                        }}
                    >Send to server</Button>
                </Space>}
                bodyStyle={{padding: 0}}
                title={"Send data"}
            >
                <YakEditor
                    // readOnly={!getExecuting()}
                    lineNumbersMinChars={3}
                    type={"html"}
                    value={getToServer()}
                    setValue={setToServer}
                />
            </AutoCard>
        }}
    />
};