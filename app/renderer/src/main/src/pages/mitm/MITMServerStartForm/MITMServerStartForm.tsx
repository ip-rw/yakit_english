import React, {useEffect, useRef, useState} from "react"
import {Form, Space, Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, ExtraMITMServerProps, MITMResponse} from "@/pages/mitm/MITMPage"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import styles from "./MITMServerStartForm.module.scss"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitFailed} from "@/utils/notification"
import {CogIcon, RefreshIcon} from "@/assets/newIcon"
import {RuleExportAndImportButton} from "../MITMRule/MITMRule"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {AdvancedConfigurationFromValue} from "./MITMFormAdvancedConfiguration"
import ReactResizeDetector from "react-resize-detector"
import {useWatch} from "antd/es/form/Form"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {inputHTTPFuzzerHostConfigItem} from "../../fuzzer//HTTPFuzzerHosts"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {CacheDropDownGV} from "@/yakitGV"
const MITMFormAdvancedConfiguration = React.lazy(() => import("./MITMFormAdvancedConfiguration"))
const ChromeLauncherButton = React.lazy(() => import("../MITMChromeLauncher"))

const {ipcRenderer} = window.require("electron")

export interface MITMServerStartFormProp {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[],
        extra?: ExtraMITMServerProps
    ) => any
    visible: boolean
    setVisible: (b: boolean) => void
    enableInitialPlugin: boolean
    setEnableInitialPlugin: (b: boolean) => void
    status: "idle" | "hijacked" | "hijacking"
}

const {Item} = Form

export interface ClientCertificate {
    CerName: string
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

const defHost = "127.0.0.1"
const defPort = "8083"
export const MITMServerStartForm: React.FC<MITMServerStartFormProp> = React.memo((props) => {
    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])
    const [openRepRuleFlag, setOpenRepRuleFlag] = useState<boolean>(false)
    const [isUseDefRules, setIsUseDefRules] = useState<boolean>(false)
    const [advancedFormVisible, setAdvancedFormVisible] = useState<boolean>(false)

    // Advanced settings, save latest form values on close
    const [advancedValue, setAdvancedValue] = useState<AdvancedConfigurationFromValue>()

    const ruleButtonRef = useRef<any>()
    const advancedFormRef = useRef<any>()
    const downstreamProxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const hostRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })

    const [form] = Form.useForm()
    const enableGMTLS = useWatch<boolean>("enableGMTLS", form)
    useEffect(() => {}, [enableGMTLS])

    useEffect(() => {
        if (props.status !== "idle") return
        // Set MITM initial plugin options
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
            form.setFieldsValue({enableInitialPlugin: !!a})
        })
        getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
            if (!!e) {
                form.setFieldsValue({port: e})
            } else {
                form.setFieldsValue({port: defPort})
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultEnableHTTP2).then((e) => {
            form.setFieldsValue({enableHttp2: !!e})
        })
        getRemoteValue(MITMConsts.MITMDefaultEnableGMTLS).then((e) => {
            form.setFieldsValue({enableGMTLS: !!e})
        })
    }, [props.status])
    useUpdateEffect(() => {
        form.setFieldsValue({enableInitialPlugin: props.enableInitialPlugin})
    }, [props.enableInitialPlugin])
    useEffect(() => {
        getRules()
    }, [props.visible])
    const getRules = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                const findOpenRepRule = newRules.find(
                    (item) => !item.Disabled && (!item.NoReplace || item.Drop || item.ExtraRepeat)
                )
                setOpenRepRuleFlag(findOpenRepRule !== undefined)
                setRules(newRules)
            })
            .catch((e) => yakitFailed("Failed to fetch rule list:" + e))
    })
    const onSwitchPlugin = useMemoizedFn((checked) => {
        props.setEnableInitialPlugin(checked)
    })
    const onStartMITM = useMemoizedFn((values) => {
        // Enable replacement rules
        if (openRepRuleFlag) {
            Modal.confirm({
                title: "Prompt",
                icon: <ExclamationCircleOutlined />,
                content: "Replacement rules detected, may affect hijacking, confirm enable?？",
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
                    execStartMITM(values)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
            return
        }
        execStartMITM(values)
    })
    const execStartMITM = useMemoizedFn((values) => {
        // Get default advanced settings
        const advancedFormValue = advancedFormRef.current?.getValue()
        let params = {
            ...values,
            ...advancedFormValue,
            ...advancedValue
        }
        props.onStartMITMServer(
            params.host,
            params.port,
            params.downstreamProxy,
            params.enableInitialPlugin,
            params.enableHttp2,
            params.certs,
            {
                enableGMTLS: params.enableGMTLS,
                onlyEnableGMTLS: params.onlyEnableGMTLS,
                preferGMTLS: params.preferGMTLS,
                enableProxyAuth: params.enableProxyAuth,
                proxyUsername: params.proxyUsername,
                proxyPassword: params.proxyPassword,
                dnsServers: params.dnsServers,
                hosts: params.etcHosts,
                filterWebsocket: params.filterWebsocket
            }
        )
        hostRef.current.onSetRemoteValues(params.host)
        if (downstreamProxyRef.current) {
            downstreamProxyRef.current.onSetRemoteValues(params.downstreamProxy || "")
        }
        setRemoteValue(MITMConsts.MITMDefaultPort, `${params.port}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableHTTP2, `${params.enableHttp2 ? "1" : ""}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableGMTLS, `${params.enableGMTLS ? "1" : ""}`)
        setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, params.enableInitialPlugin ? "true" : "")
        // Record timestamp
        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
    })
    const [width, setWidth] = useState<number>(0)

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)

    return (
        <div className={styles["mitm-server-start-form"]}>
            <ReactResizeDetector
                onResize={(w) => {
                    if (!w) {
                        return
                    }
                    setWidth(w)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <Form
                form={form}
                onFinish={onStartMITM}
                labelCol={{span: width > 610 ? 5 : 9}}
                wrapperCol={{span: width > 610 ? 13 : 11}}
            >
                <Item
                    label={"Hijack listens on host"}
                    help={"Remote mode can change to 0.0.0.0 to listen on all network cards"}
                    rules={[{required: true, message: "Required Field"}]}
                    name='host'
                >
                    <YakitAutoComplete
                        ref={hostRef}
                        cacheHistoryDataKey={CacheDropDownGV.MITMDefaultHostHistoryList}
                        placeholder='Please Enter'
                        initValue={defHost}
                    />
                </Item>
                <Item label={"Hijack listen port"} name='port' rules={[{required: true, message: "Required Field"}]}>
                    <YakitInputNumber
                        wrapperClassName={styles["form-input-number"]}
                        style={{width: "100%", maxWidth: "none"}}
                    />
                </Item>
                <Item
                    label='Downstream Proxy'
                    name='downstreamProxy'
                    help={
                        <span className={styles["form-rule-help"]}>
                            Not through this MITM
                            Proxy Chaining, typically for accessing sites blocked in China or special networks/LAN, also for passive scanning, proxy format if passworded: http://user:pass@ip:port
                            <span
                                className={styles["form-rule-help-setting"]}
                                onClick={() => setAgentConfigModalVisible(true)}
                            >
                                Configure proxy auth&nbsp;
                            </span>
                        </span>
                    }
                >
                    <YakitAutoComplete
                        ref={downstreamProxyRef}
                        cacheHistoryDataKey={MITMConsts.MITMDefaultDownstreamProxyHistory}
                        placeholder='E.g., http://127.0.0.1:7890 or socks5://127.0.0.1:7890'
                    />
                </Item>
                <Item
                    label={"HTTP/2.0 Support"}
                    name='enableHttp2'
                    help={
                        "Enabling supports HTTP/2.0 Hijacking, auto-downgrades to HTTP when disabled/1.1, auto-downgrades if HTTP2 negotiation fails"
                    }
                    valuePropName='checked'
                >
                    <YakitSwitch size='large' />
                </Item>
                <Item
                    label={"GM hijacking"}
                    name='enableGMTLS'
                    initialValue={true}
                    help={"TLS hijacking with GM-tls for China encryption, initiates GM-TLS connections to target sites"}
                    valuePropName='checked'
                >
                    <YakitSwitch size='large' />
                </Item>
                <Item
                    label={"Content rules"}
                    help={
                        <span className={styles["form-rule-help"]}>
                            Use rules to match, replace, tag, color, and configure active locations
                            <span
                                className={styles["form-rule-help-setting"]}
                                onClick={() => {
                                    setIsUseDefRules(true)
                                    ruleButtonRef.current.onSetImportVisible(true)
                                }}
                            >
                                Default config&nbsp;
                                <RefreshIcon />
                            </span>
                        </span>
                    }
                >
                    <div className={styles["form-rule-body"]}>
                        <div className={styles["form-rule"]} onClick={() => props.setVisible(true)}>
                            <div className={styles["form-rule-text"]}>Current rules {rules.length} Items</div>
                            <div className={styles["form-rule-icon"]}>
                                <CogIcon />
                            </div>
                        </div>
                    </div>
                    <div className={styles["form-rule-button"]}>
                        <RuleExportAndImportButton
                            ref={ruleButtonRef}
                            isUseDefRules={isUseDefRules}
                            setIsUseDefRules={setIsUseDefRules}
                            onOkImport={() => getRules()}
                        />
                    </div>
                </Item>
                <Item label='Enable plugin' name='enableInitialPlugin' valuePropName='checked'>
                    <YakitSwitch size='large' onChange={(checked) => onSwitchPlugin(checked)} />
                </Item>
                <Item label={" "} colon={false}>
                    <Space>
                        <YakitButton type='primary' size='large' htmlType='submit'>
                            Hijack start
                        </YakitButton>
                        <ChromeLauncherButton
                            host={useWatch("host", form)}
                            port={useWatch("port", form)}
                            onFished={(host, port) => {
                                const values = {
                                    ...form.getFieldsValue(),
                                    host,
                                    port
                                }
                                execStartMITM(values)
                            }}
                            repRuleFlag={openRepRuleFlag}
                        />
                        <YakitButton type='text' size='large' onClick={() => setAdvancedFormVisible(true)}>
                            Advanced Config
                        </YakitButton>
                    </Space>
                </Item>
            </Form>
            {/* Proxy hijack alert */}
            <AgentConfigModal
                agentConfigModalVisible={agentConfigModalVisible}
                onCloseModal={() => setAgentConfigModalVisible(false)}
                generateURL={(url) => {
                    form.setFieldsValue({downstreamProxy: url})
                }}
            ></AgentConfigModal>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFormAdvancedConfiguration
                    visible={advancedFormVisible}
                    setVisible={setAdvancedFormVisible}
                    onSave={(val) => {
                        setAdvancedValue(val)
                        setAdvancedFormVisible(false)
                    }}
                    enableGMTLS={enableGMTLS}
                    ref={advancedFormRef}
                />
            </React.Suspense>
        </div>
    )
})

interface GenerateURLRequest {
    Scheme: string
    Host: string
    Port: string
    Username: string
    Password: string
}

interface GenerateURLResponse {
    URL: string
}
interface AgentConfigModalParams extends Omit<GenerateURLRequest, "Host" | "Port"> {
    Address?: string
}

const initAgentConfigModalParams = {
    Scheme: "http",
    Address: "",
    Username: "",
    Password: ""
}

interface AgentConfigModalProp {
    agentConfigModalVisible: boolean
    onCloseModal: () => void
    generateURL: (url: string) => void
}

// Proxy hijack alert
export const AgentConfigModal: React.FC<AgentConfigModalProp> = React.memo((props) => {
    const {agentConfigModalVisible, onCloseModal, generateURL} = props
    const [form] = Form.useForm()
    const [params, setParams] = useState<AgentConfigModalParams>(initAgentConfigModalParams)

    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        setParams({...params, [key]: value.trim()})
    })

    const handleReqParams = () => {
        const copyParams = structuredClone(params)
        const address = copyParams.Address?.split(":") || []
        delete copyParams.Address
        return {
            ...copyParams,
            Host: address[0] || "",
            Port: address[1] || ""
        }
    }

    const onOKFun = useMemoizedFn(async () => {
        await form.validateFields()
        try {
            let params = handleReqParams()
            if (params.Port === "0") {
                if (params.Scheme === "http") {
                    params.Port = "80"
                } else if (params.Scheme === "https") {
                    params.Port = "443"
                } else {
                    params.Port = "1080"
                }
            }

            const res: GenerateURLResponse = await ipcRenderer.invoke("mitm-agent-hijacking-config", params)
            generateURL(res.URL)
            onClose()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onClose = useMemoizedFn(() => {
        setParams(initAgentConfigModalParams)
        form.setFieldsValue(initAgentConfigModalParams)
        onCloseModal()
    })

    return (
        <YakitModal
            visible={agentConfigModalVisible}
            title='Configure Proxy Auth'
            width={506}
            maskClosable={false}
            destroyOnClose={true}
            closable
            centered
            okText='Confirm'
            onCancel={onClose}
            onOk={onOKFun}
            bodyStyle={{padding: 0}}
        >
            <div style={{padding: 15}}>
                <Form
                    form={form}
                    colon={false}
                    onSubmitCapture={(e) => e.preventDefault()}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                    initialValues={{...params}}
                    style={{height: "100%"}}
                    onValuesChange={onValuesChange}
                >
                    <Form.Item label='Protocol' name='Scheme' style={{marginBottom: 4}}>
                        <YakitSelect
                            options={["http", "https", "socks4", "socks4a", "socks5"].map((item) => ({
                                value: item,
                                label: item
                            }))}
                            size='small'
                        />
                    </Form.Item>
                    <Form.Item
                        label='Address'
                        name='Address'
                        style={{marginBottom: 4}}
                        rules={[
                            {required: true, message: "Enter address"},
                            {
                                pattern:
                                    /^((([a-z\d]([a-z\d-]*[a-z\d])*)\.)*[a-z]([a-z\d-]*[a-z\d])?|(?:\d{1,3}\.){3}\d{1,3})(:\d+)?$/,
                                message: "Invalid address format"
                            }
                        ]}
                    >
                        <YakitInput placeholder='Example: 127.0.0.1:7890' />
                    </Form.Item>
                    <Form.Item
                        label='Username'
                        name='Username'
                        style={{marginBottom: 4}}
                        rules={[{required: false, message: "Enter Username"}]}
                    >
                        <YakitInput placeholder='Enter Username' />
                    </Form.Item>
                    <Form.Item
                        label='Password'
                        name='Password'
                        style={{marginBottom: 4}}
                        rules={[{required: false, message: "Enter Password"}]}
                    >
                        <YakitInput placeholder='Enter Password' />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
})
