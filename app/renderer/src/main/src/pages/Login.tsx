import React, {useEffect, useState, useLayoutEffect} from "react"
import {Modal} from "antd"
import {ExclamationCircleOutlined, GithubOutlined, RightOutlined, WechatOutlined} from "@ant-design/icons"
import {AutoSpin} from "@/components/AutoSpin"
import {failed} from "@/utils/notification"
import "./Login.scss"
import {NetWorkApi} from "@/services/fetch"
import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain/ConfigPrivateDomain"
import {showModal} from "../utils/showModal"
import {isEnterpriseEdition} from "@/utils/envfile"
import {apiDownloadPluginMine} from "./plugins/utils"
const {ipcRenderer} = window.require("electron")

export interface LoginProp {
    visible: boolean
    onCancel: () => any
}

interface LoginParamsProp {
    source: string
}

const Login: React.FC<LoginProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    // Open Corp Login Panel
    const openEnterpriseModal = () => {
        props.onCancel()
        const m = showModal({
            title: "",
            centered: true,
            content: <ConfigPrivateDomain onClose={() => m.destroy()} enterpriseLogin={true} />
        })
        return m
    }
    {
        /* Bypass Corp Login Selection; Switch to Corp Login Directly */
    }
    useLayoutEffect(() => {
        if (isEnterpriseEdition()) {
            openEnterpriseModal()
        }
    }, [])
    const fetchLogin = (type: string) => {
        setLoading(true)
        if (type === "login") {
            openEnterpriseModal()
        } else {
            NetWorkApi<LoginParamsProp, string>({
                method: "get",
                url: "auth/from",
                params: {
                    source: type
                }
            })
                .then((res) => {
                    if (res) ipcRenderer.send("user-sign-in", {url: res, type: type})
                })
                .catch((err) => {
                    failed("Login Error:" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
        }
    }
    // Global Login Listener
    useEffect(() => {
        ipcRenderer.on("fetch-signin-data", (e, res: any) => {
            const {ok, info} = res
            if (ok) {
                Modal.confirm({
                    title: "Data Sync",
                    icon: <ExclamationCircleOutlined />,
                    content: "Sync Remote Data Locally?",
                    onOk() {
                        apiDownloadPluginMine()
                        setTimeout(() => setLoading(false), 200)
                        props.onCancel()
                    },
                    onCancel() {
                        setTimeout(() => setLoading(false), 200)
                        props.onCancel()
                    }
                })
            } else {
                failed(info)
                setTimeout(() => setLoading(false), 200)
                props.onCancel()
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-signin-data")
        }
    }, [])
    return (
        <Modal
            visible={props.visible}
            closable={false}
            footer={null}
            onCancel={() => props.onCancel()}
            bodyStyle={{padding: 0}}
            width={409}
            style={{top: "25%"}}
        >
            <AutoSpin spinning={loading}>
                <div className='login-type-body'>
                    <h2 className='login-text'>Login</h2>
                    <div className='login-icon-body'>
                        {/*<div className='login-icon' onClick={() => githubAuth()}>*/}
                        <div className='login-icon' onClick={() => fetchLogin("github")}>
                            <div className='login-icon-text'>
                                <GithubOutlined className='type-icon' />
                                GitHub Login
                            </div>
                            <RightOutlined className='icon-right' />
                        </div>
                        <div className='login-icon' onClick={() => fetchLogin("wechat")}>
                            <div className='login-icon-text'>
                                <WechatOutlined className='type-icon icon-wx' />
                                WeChat Login
                            </div>
                            <RightOutlined className='icon-right' />
                        </div>
                        {/* <div className='login-icon' onClick={() => fetchLogin("login")}>
                            <div className='login-icon-text'>
                                <img src={yakitImg} className="type-icon type-icon-img"/>
                                Corp Login
                            </div>
                            <RightOutlined className='icon-right' />
                        </div> */}
                    </div>
                </div>
            </AutoSpin>
        </Modal>
    )
}

export default Login
