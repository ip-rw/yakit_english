import React, {useEffect, useRef, useState} from "react"
import {Alert, Form, Space, Tooltip, Typography, Modal} from "antd"
import {failed, info} from "../../utils/notification"
import {CheckOutlined, CloseOutlined, CloudUploadOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import style from "./MITMPage.module.scss"
import {ChromeFrameSvgIcon, ChromeSvgIcon, RemoveIcon} from "@/assets/newIcon"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMConsts} from "./MITMConsts"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"

/**
 * @param {boolean} isStartMITM to start MITM service, if on, show switch. If off, show button
 */
interface ChromeLauncherButtonProp {
    host?: string
    port?: number
    onFished?: (host: string, port: number) => void
    isStartMITM?: boolean
    repRuleFlag?: boolean
}

interface MITMChromeLauncherProp {
    host?: string
    port?: number
    callback: (host: string, port: number) => void
}

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

const MITMChromeLauncher: React.FC<MITMChromeLauncherProp> = (props) => {
    const [params, setParams] = useState<{host: string; port: number}>({
        host: props.host ? props.host : "127.0.0.1",
        port: props.port ? props.port : 8083
    })
    const userDataDirRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [defUserDataDir, setDefUserDataDir] = useState<string>("")
    const [isSaveUserData, setSaveUserData] = useState<boolean>(false)
    const [userDataDir, setUserDataDir] = useState<string>("")

    useEffect(() => {
        // Get Connection Engine Address Params
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                if (data.addr === `${params.host}:${params.port}`) return
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                setParams({...params, host: hosts[0]})
            })
            .catch(() => {})

        getRemoteValue(RemoteGV.MITMUserDataSave).then((cacheRes) => {
            setSaveUserData(cacheRes === "true")
        })

        ipcRenderer.invoke("getDefaultUserDataDir").then((e: string) => {
            setDefUserDataDir(e)
        })
    }, [])
    return (
        <Form
            labelCol={{span: 4}}
            wrapperCol={{span: 18}}
            onSubmitCapture={async (e) => {
                e.preventDefault()
                // Proxy auth username
                let username = (await getRemoteValue(MITMConsts.MITMDefaultProxyUsername)) || ""
                // Proxy auth password
                let password = (await getRemoteValue(MITMConsts.MITMDefaultProxyPassword)) || ""
                let newParams: {
                    host: string
                    port: number
                    chromePath?: string
                    userDataDir?: string
                    username?: string
                    password?: string
                } = {...params, username, password, userDataDir}

                setRemoteValue(RemoteGV.MITMUserDataSave, isSaveUserData + "")
                userDataDirRef.current.onSetRemoteValues(userDataDir)

                getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
                    if (setting) newParams.chromePath = JSON.parse(setting)
                    ipcRenderer
                        .invoke("LaunchChromeWithParams", newParams)
                        .then((e) => {
                            props.callback(params.host, params.port)
                        })
                        .catch((e) => {
                            failed(`Chrome launch failed：${e}`)
                        })
                })
            }}
            style={{padding: 24}}
        >
            <Form.Item label={"Setup proxy"}>
                <YakitInput.Group className={style["chrome-input-group"]}>
                    <YakitInput
                        prefix={"http://"}
                        onChange={(e) => setParams({...params, host: e.target.value})}
                        value={params.host}
                        wrapperStyle={{width: 165}}
                    />
                    <YakitInput
                        prefix={":"}
                        onChange={(e) => {
                            setParams({...params, port: parseInt(e.target.value) || 0})
                        }}
                        value={`${params.port}`}
                        wrapperStyle={{width: 80}}
                    />
                </YakitInput.Group>
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <YakitCheckbox
                    checked={isSaveUserData}
                    onChange={(e) => {
                        setSaveUserData(e.target.checked)
                    }}
                >
                    Save user data
                </YakitCheckbox>
            </Form.Item>
            {isSaveUserData && (
                <Form.Item label={" "} colon={false} help={"To open a new window, set new path for user data"}>
                    <YakitAutoComplete
                        ref={userDataDirRef}
                        style={{width: "calc(100% - 20px)"}}
                        cacheHistoryDataKey={CacheDropDownGV.MITMSaveUserDataDir}
                        cacheHistoryListLength={5}
                        initValue={defUserDataDir}
                        value={userDataDir}
                        placeholder='Set Proxy'
                        onChange={(v) => {
                            setUserDataDir(v)
                        }}
                    />
                    <Tooltip title={"Select storage path"}>
                        <CloudUploadOutlined
                            onClick={() => {
                                ipcRenderer
                                    .invoke("openDialog", {
                                        title: "Choose Folder",
                                        properties: ["openDirectory"]
                                    })
                                    .then((data: any) => {
                                        if (data.filePaths.length) {
                                            let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")
                                            setUserDataDir(absolutePath)
                                        }
                                    })
                            }}
                            style={{position: "absolute", right: 0, top: 8, cursor: "pointer"}}
                        />
                    </Tooltip>
                </Form.Item>
            )}
            <Form.Item
                colon={false}
                label={" "}
                help={
                    <Space style={{width: "100%", marginBottom: 20}} direction={"vertical"} size={4}>
                        <Alert
                            style={{marginTop: 4}}
                            type={"success"}
                            message={
                                <>
                                    This button will start a correctly configured proxy Chrome (using system Chrome settings)
                                    <br /> <Text mark={true}>No need for users to enable proxy explicitly</Text>
                                    ，Separate test browser from daily use browser
                                </>
                            }
                        />
                        <Alert
                            style={{marginTop: 4}}
                            type={"error"}
                            message={
                                <>
                                    <Text mark={true}>Note：</Text>
                                    <br />
                                    Browser without configuration enabled <Text code={true}>{`--ignore-certificate-errors`}</Text> <br />
                                    This option is <Text mark={true}>Effective</Text>，Will ignore all certificate errors，
                                    <Text mark={true}>Only recommended for security testing</Text>
                                </>
                            }
                        />
                    </Space>
                }
            >
                <YakitButton
                    type='primary'
                    htmlType='submit'
                    size='large'
                    disabled={isSaveUserData === true && userDataDir.length === 0}
                >
                    Launch Chrome without configuration
                </YakitButton>
            </Form.Item>
        </Form>
    )
}

const ChromeLauncherButton: React.FC<ChromeLauncherButtonProp> = React.memo((props: ChromeLauncherButtonProp) => {
    const {isStartMITM, host, port, onFished, repRuleFlag = false} = props
    const [started, setStarted] = useState(false)
    const [chromeVisible, setChromeVisible] = useState(false)

    useEffect(() => {
        const id = setInterval(() => {
            ipcRenderer.invoke("IsChromeLaunched").then((e) => {
                setStarted(e)
            })
        }, 500)
        return () => {
            clearInterval(id)
        }
    }, [])
    const onSwitch = useMemoizedFn((c: boolean) => {
        setChromeVisible(true)
        // if (c) {
        //     setChromeVisible(true)
        // } else {
        //     onCloseChrome()
        // }
    })
    const onCloseChrome = useMemoizedFn(() => {
        ipcRenderer
            .invoke("StopAllChrome")
            .then(() => {
                info("Close all Chrome without configuration successfully")
            })
            .catch((e) => {
                failed(`Close all Chrome failed: ${e}`)
            })
    })

    const clickChromeLauncher = useMemoizedFn(() => {
        if (repRuleFlag) {
            Modal.confirm({
                title: "Prompt",
                icon: <ExclamationCircleOutlined />,
                content: "Detected rule replacement on, might affect hijacking, confirm to proceed？",
                okText: "Confirm",
                cancelText: "Cancel",
                closable: true,
                centered: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    setChromeVisible(true)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
            return
        }
        setChromeVisible(true)
    })

    return (
        <>
            {(isStartMITM && (
                <>
                    <YakitButton type='outline2' onClick={() => onSwitch(!started)}>
                        {(started && <ChromeSvgIcon />) || (
                            <ChromeFrameSvgIcon style={{height: 16, color: "var(--yakit-body-text-color)"}} />
                        )}
                        No-config launch
                        {started && <CheckOutlined style={{color: "var(--yakit-success-5)", marginLeft: 8}} />}
                    </YakitButton>
                    {started && (
                        <Tooltip title={"Close all Chrome without configuration"}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    onCloseChrome()
                                }}
                            >
                                <CloseOutlined style={{color: "var(--yakit-success-5)"}} />
                            </YakitButton>
                        </Tooltip>
                    )}
                </>
            )) || (
                <YakitButton type='outline2' size='large' onClick={clickChromeLauncher}>
                    <ChromeFrameSvgIcon style={{height: 16, color: "var(--yakit-body-text-color)"}} />
                    <span style={{marginLeft: 4}}>No-config launch</span>
                </YakitButton>
            )}
            {chromeVisible && (
                <YakitModal
                    title='Confirm launch Chrome without configuration'
                    visible={chromeVisible}
                    onCancel={() => setChromeVisible(false)}
                    closable={true}
                    width='50%'
                    footer={null}
                    bodyStyle={{padding: 0}}
                >
                    <MITMChromeLauncher
                        host={host}
                        port={port}
                        callback={(host, port) => {
                            setChromeVisible(false)
                            if (!isStartMITM) {
                                // Record timestamp
                                const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
                                setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
                                if (onFished) onFished(host, port)
                            }
                        }}
                    />
                </YakitModal>
            )}
        </>
    )
})
export default ChromeLauncherButton
