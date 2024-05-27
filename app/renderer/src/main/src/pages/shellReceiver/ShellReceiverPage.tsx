import React, {useEffect, useState} from "react";
import {Modal, PageHeader, Space, Tabs} from "antd";
import {showModal} from "../../utils/showModal";
import {CreateShellReceiverForm} from "./CreateShellReceiver";
import {failed, info, success} from "../../utils/notification";
import {ShellItem} from "./ShellItem";
import { AutoSpin } from "../../components/AutoSpin";

import "./ShellReceiverPage.css"

export interface ShellReceiverPageProp {

}

const {ipcRenderer} = window.require("electron");

export const ShellReceiverPage: React.FC<ShellReceiverPageProp> = (props) => {
    const [addrs, setAddrs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingAddrs, setUpdatingAddrs] = useState(true);
    
    const waitingSyncAddr = () => {
        setUpdatingAddrs(true)
    };
    const removeListenPort = (addr: string) => {
        waitingSyncAddr()
        ipcRenderer.invoke("listening-port-cancel", addr)
    }
    const startListenPort = (addr: string) => {
        if (!addr.includes(":")) {
            failed(`Failed to start port listener, invalid port format: [${addr}]`)
            return
        }

        const result = addr.split(":", 2);
        const host = result[0];
        const port = result[1];
        if (!host || !port) {
            failed(`Cannot resolve host/Port`)
            return;
        }

        if (addrs.includes(addr)) {
            Modal.error({title: "Address already in use: " + addr})
            failed("Address already in use: " + addr)
            return;
        }

        setLoading(true)
        setTimeout(() => {
            ipcRenderer.invoke("listening-port", host, port).then(() => {
                success("Port Listening Success")
            }).catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            }).finally(() => {
                waitingSyncAddr()
                setTimeout(() => setLoading(false), 300)
            })
        }, 500)
    };

    useEffect(() => {
        const id = setInterval(() => {
            ipcRenderer.invoke("listening-port-query-addrs").then(r => {
                setAddrs(r)
            }).finally(() => {
                if (updatingAddrs) {
                    setUpdatingAddrs(false)
                }
            })
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])


    const createForm = () => {
        const m = showModal({
            title: "Start listening to a port owned by a Yak server",
            width: "50%",
            content: <>
                <CreateShellReceiverForm onCheck={addr => {
                    return true
                }} onCreated={(addr) => {
                    startListenPort(addr);
                    m.destroy()
                }}/>
            </>
        })
    }

    useEffect(() => {
        const errorKey = "client-listening-port-end";
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            Modal.info({title: `Port[${data}]Closed`})
        })
        return () => {
            ipcRenderer.removeAllListeners(errorKey)
        }
    }, [])

    return <div style={{width: "100%", height: "100%", display: "flex", flexFlow: "column"}}>
        <PageHeader
            title={"Reverse Shell Receiver"}
            subTitle={
                <Space>
                    {/*<Button type={"primary"}>Open and listen on port</Button>*/}
                    <div>Reverse Shell receiver, opens server port for listening & interaction。</div>
                </Space>
            }
        ></PageHeader>

        <div style={{flex: 1,overflowY: "hidden"}}>
            <AutoSpin spinning={loading || updatingAddrs}>
                <Tabs
                    className="tabs-container"
                    tabBarStyle={{marginBottom: 8}}
                    type={"editable-card"}
                    onEdit={(key, action) => {
                        if (action === "add") {
                            createForm()
                        } else if (action === "remove") {
                            removeListenPort(`${key}`)
                        }
                    }}
                >
                    {(addrs || []).length > 0 ? (
                        addrs.map((e) => {
                            return (
                                <Tabs.TabPane key={e} tab={`${e}`} closable={false}>
                                    <ShellItem addr={e} removeListenPort={removeListenPort} />
                                </Tabs.TabPane>
                            )
                        })
                    ) : (
                        <Tabs.TabPane closable={false} key={"empty"} tab={"Start port listening"}>
                            <CreateShellReceiverForm
                                title={"Start Listening: Opens a port on the server"}
                                onCheck={(addr) => {
                                    return true
                                }}
                                onCreated={(addr) => {
                                    startListenPort(addr)
                                }}
                            />
                        </Tabs.TabPane>
                    )}
                </Tabs>
            </AutoSpin>
        </div>
        
    </div>
};