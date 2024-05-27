import React, {useEffect, useMemo, useState} from "react"
import {Form, Upload} from "antd"
import {useMemoizedFn} from "ahooks"
import {info, yakitFailed, warn, failed} from "@/utils/notification"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {InformationCircleIcon, RemoveIcon} from "@/assets/newIcon"
import classNames from "classnames"
import {getRemoteValue, setRemoteValue} from "./kv"
import {RemoteGV} from "@/yakitGV"
import styles from "./ConfigSystemProxy.module.scss"

export interface ConfigSystemProxyProp {
    defaultProxy?: string
    onClose: () => void
}

const {ipcRenderer} = window.require("electron")

export const ConfigSystemProxy: React.FC<ConfigSystemProxyProp> = (props) => {
    const {defaultProxy, onClose} = props
    const [proxy, setProxy] = useState(defaultProxy ? defaultProxy : "127.0.0.1:8083")
    const [loading, setLoading] = useState(false)
    const [current, setCurrent] = useState<{
        Enable: boolean
        CurrentProxy: string
    }>({Enable: false, CurrentProxy: ""})

    const enable = useMemo(() => {
        if (!current.Enable) return false
        if (current.CurrentProxy === proxy) return true
        return false
    }, [proxy, current])

    const update = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetSystemProxy", {})
            .then((req: {CurrentProxy: string; Enable: boolean}) => {
                setCurrent(req)
                setProxy(req.CurrentProxy ? req.CurrentProxy : "127.0.0.1:8083")
            })
            .catch((e) => {
                // failed(`Failed to Retrieve Proxy: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        update()
    }, [])

    const onSetSystemProxy = useMemoizedFn(() => {
        ipcRenderer
            .invoke("SetSystemProxy", {
                HttpProxy: proxy,
                Enable: !enable
            })
            .then((e) => {
                info("Set System Proxy Successfully")
                onClose()
            })
            .catch((err) => {
                yakitFailed("Failed to Set System Proxy:" + err)
            })
    })
    return (
        <YakitSpin spinning={loading}>
            <div className={styles["config-system-proxy"]}>
                <div className={styles["config-system-proxy-heard"]}>
                    <div className={styles["config-system-proxy-title"]}>Configure System Proxy</div>
                    <RemoveIcon className={styles["close-icon"]} onClick={() => onClose()} />
                </div>
                <div
                    className={classNames(styles["config-system-proxy-status-success"], {
                        [styles["config-system-proxy-status-danger"]]: !current.Enable
                    })}
                >
                    Current System Proxy Status：
                    <span>{current.Enable ? "Enabled" : "Not enabled"}</span>
                </div>
                <Form layout='vertical' style={{padding: "0 24px 24px"}}>
                    <Form.Item
                        label='System Proxy'
                        help='System proxy automates proxy settings for all system requests, enabling global capture'
                        tooltip={{
                            title: "Due to OS and Yak kernel restrictions, native MacOS OC unavailable/Swift API configures proxy. Yak engine prompts osascript authorization to change system proxy, Mac users authenticate to proceed。",
                            icon: <InformationCircleIcon />
                        }}
                    >
                        <YakitInput
                            addonBefore={proxy.includes("://") ? undefined : "http(s)://"}
                            value={proxy}
                            onChange={(e) => {
                                setProxy(e.target.value)
                            }}
                            placeholder={"127.0.0.1:8083"}
                            size='large'
                        />
                    </Form.Item>
                    <div className={styles["config-system-proxy-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={() => onClose()}>
                            Cancel
                        </YakitButton>
                        <YakitButton
                            colors={enable ? "danger" : "primary"}
                            size='large'
                            onClick={() => onSetSystemProxy()}
                        >
                            {enable ? "Disable" : "Enable"}
                        </YakitButton>
                    </div>
                </Form>
            </div>
        </YakitSpin>
    )
}

export const showConfigSystemProxyForm = (addr?: string) => {
    const m = showYakitModal({
        title: null,
        width: 450,
        footer: null,
        closable: false,
        centered: true,
        hiddenHeader: true,
        content: (
            <>
                <ConfigSystemProxy
                    defaultProxy={addr}
                    onClose={() => {
                        m.destroy()
                    }}
                />
            </>
        )
    })
}

interface ConfigChromePathProp {
    onClose: () => void
    submitAlreadyChromePath: (v: boolean) => void
}

export const ConfigChromePath: React.FC<ConfigChromePathProp> = (props) => {
    const {onClose, submitAlreadyChromePath} = props
    const [loading, setLoading] = useState<boolean>(true)
    const [chromePath, setChromePath] = useState<string>()

    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            setLoading(false)
            if (!setting) return
            const values: string = JSON.parse(setting)
            setChromePath(values)
        })
    }, [])

    const onSetChromePath = useMemoizedFn(() => {
        setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(chromePath))
        if (chromePath && chromePath.length > 0) {
            submitAlreadyChromePath(true)
        } else {
            submitAlreadyChromePath(false)
        }
        info("Set Chrome Startup Path Successfully")
        onClose()
    })

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }
    return (
        <YakitSpin spinning={loading}>
            <div className={styles["config-system-proxy"]}>
                <div className={styles["config-system-proxy-heard"]}>
                    <div className={styles["config-system-proxy-title"]}>Set Chrome Startup Path</div>
                    <RemoveIcon className={styles["close-icon"]} onClick={() => onClose()} />
                </div>
                <div className={classNames(styles["config-system-proxy-status-success"])}>
                    If Chrome fails to start, configure Chrome path
                </div>
                <Form layout='horizontal' style={{padding: "0 24px 24px"}}>
                    <Form.Item label='Startup Path'>
                        <YakitInput
                            value={chromePath}
                            placeholder={"Select Startup Path"}
                            size='large'
                            onChange={(e) => setChromePath(e.target.value)}
                        />
                        <Upload
                            accept={".exe"}
                            multiple={false}
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={(f) => {
                                const file_name = f.name
                                const suffix = suffixFun(file_name)
                                if (![".exe"].includes(suffix)) {
                                    warn("File Upload Error, Retry")
                                    return false
                                }
                                // @ts-ignore
                                const path: string = f?.path || ""
                                if (path.length > 0) {
                                    setChromePath(path)
                                }
                                return false
                            }}
                        >
                            <div className={styles["config-select-path"]}>Select Path</div>
                        </Upload>
                    </Form.Item>
                    <div className={styles["config-system-proxy-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={() => onClose()}>
                            Cancel
                        </YakitButton>
                        <YakitButton type={"primary"} size='large' onClick={() => onSetChromePath()}>
                            Confirm
                        </YakitButton>
                    </div>
                </Form>
            </div>
        </YakitSpin>
    )
}
export const showConfigChromePathForm = (fun) => {
    const m = showYakitModal({
        title: null,
        width: 450,
        footer: null,
        closable: false,
        centered: true,
        hiddenHeader: true,
        content: (
            <>
                <ConfigChromePath
                    onClose={() => {
                        m.destroy()
                    }}
                    submitAlreadyChromePath={fun}
                />
            </>
        )
    })
}
