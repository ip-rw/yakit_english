import React, {useRef, useEffect, useState, useMemo} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {Form, Tooltip, Space, Typography, Divider} from "antd"
import {
    QuestionOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
    DownloadOutlined,
    CopyOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined
} from "@ant-design/icons"
import {failed, info, success, warn} from "../../utils/notification"
import {
    BRIDGE_ADDR,
    BRIDGE_SECRET,
    FacadesRequest,
    SettingReverseParamsInfo
} from "../reverseServer/NewReverseServerPage"
import {randomString} from "@/utils/randomUtil"
import {callCopyToClipboard} from "@/utils/basic"
import {ReverseNotification, ReverseTable} from "../reverseServer/ReverseTable"
import {getRemoteValue} from "@/utils/kv"
import {ExtractExecResultMessage} from "@/components/yakitLogSchema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import ReactResizeDetector from "react-resize-detector"

import "./javaPayloadPage.scss"
import {NetInterface} from "@/models/Traffic"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import YakitCascader from "@/components/yakitUI/YakitCascader/YakitCascader"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

const {ipcRenderer} = window.require("electron")

export interface JavaPayloadPageProp {}

export interface YsoGeneraterRequest {
    Gadget: string
    Class: string
    Options: {Key: string; Value: string | number | boolean}[]
}

interface ParamsProps {
    Gadget: string
    Class: string
    [key: string]: string | number | boolean
}
export interface ParamsRefProps extends ParamsProps {
    useGadget: boolean
}

export interface FormList {
    Key: string
    KeyVerbose: string
    Help: string
    Value: string
    Type: string
}

export interface FormBindInfo {
    [key: string]: string[]
}

const DefaultParams: ParamsProps = {
    Gadget: "",
    Class: ""
}

export const convertRequest = (value: ParamsRefProps) => {
    const dataRef = value
    const excludeKey = ["useGadget", "Gadget", "Class"]
    const data: YsoGeneraterRequest = {
        Gadget: dataRef.Gadget,
        Class: dataRef.Class,
        Options: []
    }
    for (let name in dataRef) {
        if (!excludeKey.includes(name)) data.Options.push({Key: name, Value: dataRef[name]})
    }
    return data
}

export const JavaPayloadPage: React.FC<JavaPayloadPageProp> = React.memo((props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [token, setToken, getToken] = useGetState<string>(randomString(40))

    const paramsRef = useRef<ParamsRefProps>({useGadget: true, ...DefaultParams})
    const [params, setParams] = useState<ParamsRefProps>({useGadget: true, ...DefaultParams})
    const [codeRefresh, setCodeRefresh] = useState<boolean>(false)

    const [showAddr, setShowAddr] = useState<boolean>(false)
    /**
     * @name Initial reverse server parameters
     */
    const addrParamsRef = useRef<SettingReverseParamsInfo>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    /**
     * @name Custom reverse server parameters
     */
    const [addrParams, setAddrParams] = useState<SettingReverseParamsInfo>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    const [remoteIp, setRemoteIp] = useState<string>("")

    const [isStart, setIsStart] = useState<boolean>(false)
    const [codeExtra, setCodeExtra] = useState<boolean>(false)
    const [tableExtra, setTableExtra] = useState<boolean>(false)

    const dataRef = useRef<ReverseNotification[]>([])
    const [data, setData, getData] = useGetState<ReverseNotification[]>([])
    const totalRef = useRef<number>(0)

    const reverseAddr = useMemo(() => {
        const addrSetting = showAddr ? addrParams : addrParamsRef.current
        const host = addrSetting.IsRemote
            ? `${remoteIp}:${addrSetting.ReversePort}`
            : `${addrSetting.ReverseHost}:${addrSetting.ReversePort}`
        return host
    }, [showAddr, addrParams, remoteIp])

    // Get global reverse parameters and local reverse IP
    useEffect(() => {
        const initParams = addrParamsRef.current

        setLoading(true)
        getRemoteValue(BRIDGE_ADDR).then((addr: string) => {
            if (!!addr) {
                initParams.BridgeParam.Addr = addr
                getRemoteValue(BRIDGE_SECRET)
                    .then((secret: string) => {
                        initParams.BridgeParam.Secret = secret
                        initParams.IsRemote = true
                    })
                    .finally(() => {
                        ipcRenderer
                            .invoke("AvailableLocalAddr", {})
                            .then((data: {Interfaces: NetInterface[]}) => {
                                const arr = (data.Interfaces || []).filter((i) => i.IP !== "127.0.0.1")
                                if (arr.length > 0) initParams.ReverseHost = arr[0].IP
                            })
                            .finally(() => {
                                setAddrParams({...initParams})
                                setTimeout(() => setLoading(false), 300)
                            })
                    })
            } else {
                ipcRenderer
                    .invoke("AvailableLocalAddr", {})
                    .then((data: {Interfaces: NetInterface[]}) => {
                        const arr = (data.Interfaces || []).filter((i) => i.IP !== "127.0.0.1")
                        if (arr.length > 0) initParams.ReverseHost = arr[0].IP
                    })
                    .finally(() => {
                        setAddrParams({...initParams})
                        setTimeout(() => setLoading(false), 300)
                    })
            }
        })
    }, [])
    // Receive reverse data in real time
    useEffect(() => {
        if (!token) return

        dataRef.current = []
        totalRef.current = 0
        setData([])
        ipcRenderer.on(`${token}-data`, (_, data) => {
            if (!data.IsMessage) {
                return
            }
            const datas = dataRef.current
            try {
                const message = ExtractExecResultMessage(data) as ExecResultLog
                if (message.level !== "facades-msg") {
                    switch (message.level) {
                        case "error":
                        case "mirror_error":
                            failed(`${message.level}: ${message.data}`)
                            stopReverse()
                            break
                        case "warning":
                            warn(message.data)
                            break
                        default:
                            info(JSON.stringify(message))
                    }
                    return
                }
                const obj = JSON.parse(message.data) as ReverseNotification
                obj.timestamp = message.timestamp
                let isUpdata = false
                for (let i = 0; i < datas.length; i++) {
                    if (datas[i].connect_hash === obj.connect_hash) {
                        datas[i] = obj
                        isUpdata = true
                        break
                    }
                }

                if (!isUpdata) {
                    datas.unshift(obj)
                    totalRef.current = totalRef.current + 1
                }

                if (datas.length > 100) datas.pop()
            } catch (e) {}
        })
        ipcRenderer.on(`${token}-error`, (_, data) => {
            if (data) {
                failed(`${JSON.stringify(data)}`)
                stopReverse(true)
            }
        })
        ipcRenderer.on(`${token}-end`, () => stopReverse(true))
        const id = setInterval(() => {
            const datas = dataRef.current

            if (getData().length === 0) setData([...datas])
            if (getData().length > 0 && datas[0].uuid !== getData()[0].uuid) setData([...datas])
        }, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-data`)
        }
    }, [token])
    // Close Facades reverse service on page close
    useEffect(() => {
        return () => {
            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", getToken())
        }
    }, [])

    // Stop listening for reverse data
    const stopReverse = (isCancel?: boolean) => {
        if (!isCancel) {
            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token).then(() => {
                success("FacadeServer closed")
            })
        }
        setToken(randomString(40))
        setIsStart(false)
    }
    // Clear existing reverse connect data
    const clearReverseData = () => {
        dataRef.current = []
        totalRef.current = 0
        setData([])
    }

    /**
     * @name Start reverse server
     */
    const startUpFacadeServer = (value: ParamsRefProps, addr: SettingReverseParamsInfo, remote: string) => {
        const classData = {...convertRequest({...value})}
        let startFacadeParams: FacadesRequest = {
            ...addr,
            GenerateClassParams: {...classData},
            Token: getToken()
        }
        if (startFacadeParams.IsRemote) startFacadeParams.ReverseHost = remote

        setLoading(true)
        ipcRenderer
            .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
            .then(() => {
                setTimeout(() => {
                    ipcRenderer
                        .invoke("ApplyClassToFacades", {
                            Token: getToken(),
                            GenerateClassParams: {...classData}
                        })
                        .then((res) => {
                            paramsRef.current = {...value}
                            info("Start FacadeServer")
                            setIsStart(true)
                            setCodeRefresh(!codeRefresh)
                        })
                        .catch((err) => {
                            failed(`Failed to apply to FacadeServer${err}`)
                            stopReverse()
                        })
                        .finally(() => setTimeout(() => setLoading(false), 300))
                }, 200)
            })
            .catch((e: any) => {
                failed("Start FacadeServer failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }
    /**
     * @name Start reverse connection with payload configuration
     */
    const onStart = useMemoizedFn((value: ParamsRefProps) => {
        if (isStart) {
            stopReverse()
            setTimeout(() => setLoading(false), 200)
        } else {
            // Check reverse server parameters for errors
            let reverseAddr = addrParamsRef.current
            if (showAddr) {
                reverseAddr = {...addrParams}
                let hint = "After turning on advanced settings,"
                if (reverseAddr.IsRemote) {
                    if (!reverseAddr.BridgeParam.Addr) hint += "Enter public IP,"
                } else {
                    if (!reverseAddr.ReverseHost) hint += "Enter reverse IP,"
                }
                if (!reverseAddr.ReversePort && reverseAddr.ReversePort !== 0) hint += "Enter port number"
                if (hint !== "After turning on advanced settings,") {
                    failed(hint)
                    setTimeout(() => setLoading(false), 300)
                    return
                }
            }

            // Generate backend parameters to start reverse server
            if (reverseAddr.IsRemote) {
                ipcRenderer
                    .invoke("GetTunnelServerExternalIP", {
                        Addr: reverseAddr.BridgeParam.Addr,
                        Secret: reverseAddr.BridgeParam.Secret
                    })
                    .then((data: {IP: string}) => {
                        setRemoteIp(data.IP)
                        startUpFacadeServer(value, reverseAddr, data.IP)
                    })
                    .catch((e: any) => failed("Failed to get remote address: " + `${e}`))
                    .finally(() => setTimeout(() => setLoading(false), 300))
            } else startUpFacadeServer(value, reverseAddr, "")
        }
    })
    /**
     * @name Configure payload for reverse connection app
     */
    const onApply = useMemoizedFn((value: ParamsRefProps) => {
        const data = convertRequest(value)
        paramsRef.current = {...value}
        if (isStart) {
            ipcRenderer
                .invoke("ApplyClassToFacades", {Token: token, GenerateClassParams: {...data}})
                .then((res) => info("Applied to FacadeServer successfully"))
                .catch((err) => failed(`Failed to apply to FacadeServer${err}`))
                .finally(() => setTimeout(() => setLoading(false), 300))
        } else {
            setTimeout(() => setLoading(false), 300)
        }
        setCodeRefresh(!codeRefresh)
    })

    const changeCodeExtra = useMemoizedFn(() => {
        setCodeExtra(!codeExtra)
    })

    return (
        <div className='java-payload-wrapper'>
            <div className={`payload-${tableExtra ? "hidden" : "info"}-wrapper`}>
                <div className='wrapper-body'>
                    <div className={`body-${codeExtra ? "hidden-" : ""}left`}>
                        <PayloadForm
                            isStart={isStart}
                            paramsData={{...params}}
                            setParamsData={(value) => setParams({...value})}
                            loading={loading}
                            setLoading={setLoading}
                            onStart={onStart}
                            onApply={onApply}
                            extraNode={
                                isStart ? (
                                    <></>
                                ) : !params.useGadget ? (
                                    <Form
                                        size='small'
                                        labelCol={{span: 9}}
                                        wrapperCol={{span: 15}}
                                        colon={false}
                                        className='from-common-style'
                                    >
                                        <Form.Item
                                            label={
                                                <div className='form-item-label-title'>
                                                    Advanced settings
                                                    <Tooltip placement='bottom' title='Configure reverse server parameters'>
                                                        <ExclamationCircleOutlined className='setting-payload-icon' />
                                                    </Tooltip>
                                                </div>
                                            }
                                        >
                                            <YakitSwitch checked={showAddr} onChange={(check) => setShowAddr(check)} />
                                        </Form.Item>
                                        {showAddr && (
                                            <>
                                                <Form.Item label='Enable public network penetration'>
                                                    <YakitSwitch
                                                        checked={addrParams.IsRemote}
                                                        onChange={(IsRemote) =>
                                                            setAddrParams({...addrParams, IsRemote})
                                                        }
                                                    />
                                                </Form.Item>

                                                {addrParams.IsRemote && (
                                                    <>
                                                        <Form.Item
                                                            label={
                                                                <div className='form-item-label-title'>
                                                                    <div className='form-required'>*</div>
                                                                    Public Bridge address
                                                                    <Tooltip
                                                                        placement='bottom'
                                                                        title={
                                                                            <div style={{color: "#fff"}}>
                                                                                Install yak core engine on your server, execute{" "}
                                                                                <YakitCopyText
                                                                                    showText={
                                                                                        "yak bridge --secret [your-pass]"
                                                                                    }
                                                                                    wrapStyle={{color: "#fff"}}
                                                                                />{" "}
                                                                                Start public Yak Bridge service{" "}
                                                                                <Divider type={"vertical"} />
                                                                                <Typography.Text
                                                                                    style={{color: "#fff"}}
                                                                                >
                                                                                    yak version {`>=`} v1.0.11-sp9
                                                                                </Typography.Text>
                                                                            </div>
                                                                        }
                                                                    >
                                                                        <ExclamationCircleOutlined className='setting-payload-icon' />
                                                                    </Tooltip>
                                                                </div>
                                                            }
                                                        >
                                                            <YakitInput
                                                                allowClear={true}
                                                                value={addrParams.BridgeParam.Addr}
                                                                onChange={(e) => {
                                                                    addrParams.BridgeParam.Addr = e.target.value
                                                                    setAddrParams({...addrParams})
                                                                }}
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label='Password'>
                                                            <YakitInput
                                                                allowClear={true}
                                                                value={addrParams.BridgeParam.Secret}
                                                                onChange={(e) => {
                                                                    addrParams.BridgeParam.Secret = e.target.value
                                                                    setAddrParams({...addrParams})
                                                                }}
                                                            />
                                                        </Form.Item>
                                                    </>
                                                )}
                                                {!addrParams.IsRemote && (
                                                    <Form.Item
                                                        label={
                                                            <>
                                                                <div className='form-required'>*</div>
                                                                {"Reverse address"}
                                                            </>
                                                        }
                                                    >
                                                        <YakitInput
                                                            allowClear={true}
                                                            value={addrParams.ReverseHost}
                                                            onChange={(e) =>
                                                                setAddrParams({
                                                                    ...addrParams,
                                                                    ReverseHost: e.target.value
                                                                })
                                                            }
                                                        />
                                                    </Form.Item>
                                                )}
                                                <Form.Item
                                                    label={
                                                        <>
                                                            <div className='form-required'>*</div>
                                                            {"Reverse port"}
                                                        </>
                                                    }
                                                >
                                                    <YakitInputNumber
                                                        width='100%'
                                                        min={0}
                                                        max={65535}
                                                        precision={0}
                                                        value={addrParams.ReversePort}
                                                        onChange={(ReversePort) =>
                                                            setAddrParams({
                                                                ...addrParams,
                                                                ReversePort: ReversePort as number
                                                            })
                                                        }
                                                    />
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form>
                                ) : (
                                    <></>
                                )
                            }
                        />
                    </div>

                    <div className='body-right'>
                        <PayloadCode
                            codeExtra={codeExtra}
                            data={paramsRef.current}
                            RefreshTrigger={codeRefresh}
                            onExtra={changeCodeExtra}
                        />
                    </div>
                </div>
            </div>

            <div className={`reverse-${isStart && !codeExtra ? "info" : "hidden"}-wrapper`}>
                <div className='wrapper-body'>
                    <div className='body-left'>
                        <YakitCard title='Reverse address' className='info-addr-card' bodyStyle={{padding: "6px 12px"}}>
                            <Space direction={"vertical"}>
                                <div className='addr-body'>
                                    HTTP reverse address&nbsp;&nbsp;
                                    <YakitTag
                                        enableCopy={true}
                                        color='blue'
                                        copyText={`http://${reverseAddr}/${paramsRef.current?.className || ""}.class`}
                                    ></YakitTag>
                                </div>
                                <div className='addr-body'>
                                    RMI reverse address&nbsp;&nbsp;
                                    <YakitTag
                                        enableCopy={true}
                                        color='success'
                                        copyText={`rmi://${reverseAddr}/${paramsRef.current?.className || ""}`}
                                    ></YakitTag>
                                </div>
                                <div className='addr-body'>
                                    LDAP reverse address&nbsp;&nbsp;
                                    <YakitTag
                                        enableCopy={true}
                                        color='purple'
                                        copyText={`ldap://${reverseAddr}/${paramsRef.current?.className || ""}`}
                                    ></YakitTag>
                                </div>
                            </Space>
                        </YakitCard>
                    </div>

                    <div className='body-right'>
                        <ReverseTable
                            isPayload={true}
                            isShowExtra={true}
                            isExtra={tableExtra}
                            onExtra={() => setTableExtra(!tableExtra)}
                            total={totalRef.current}
                            data={data}
                            clearData={clearReverseData}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
})

interface PayloadFormProp {
    isReverse?: boolean
    isShowCode?: boolean
    showCode?: () => any
    isStart?: boolean
    paramsData: ParamsRefProps
    setParamsData: (value: ParamsRefProps) => any

    loading: boolean
    setLoading: (value: boolean) => any
    onStart?: (value: ParamsRefProps) => any
    onApply: (value: ParamsRefProps) => any
    extraNode?: React.ReactNode
}

interface YsoClassGeneraterOptions extends FormList {
    BindOptions: {[key: string]: {Options: YsoClassGeneraterOptions[]}}
}

interface YsoOptionInfo {
    Name: string
    NameVerbose: string
    Help: string
}
interface OptionInfo {
    Name: string
    NameVerbose: string | React.ReactNode
    Label: string
    Help: string
    isLeaf?: boolean
    children?: OptionInfo[]
}

enum FormParamsType {
    String = "String",
    Base64Bytes = "Base64Bytes",
    StringBool = "StringBool",
    StringPort = "StringPort"
}

export const PayloadForm: React.FC<PayloadFormProp> = React.memo((props) => {
    const {
        isReverse = false,
        isShowCode = false,
        showCode,
        isStart,
        paramsData,
        setParamsData,
        loading,
        setLoading,
        onStart,
        onApply,
        extraNode
    } = props

    const isInit = useRef<boolean>(true)

    const [formInstance] = Form.useForm()
    const [useGadget, setUseGadget, getUseGadget] = useGetState<boolean>(!isReverse ? paramsData.useGadget : false)
    const paramsRef = useRef<ParamsRefProps>({...paramsData})
    const [params, setParams] = useState<ParamsProps>({...paramsData})

    const setParamsValue = useMemoizedFn((args: {key: string; value: string | number | boolean}[]) => {
        for (let item of args) paramsRef.current[item.key] = item.value
        setParams({...paramsRef.current})
        setParamsData({...paramsRef.current})
        formInstance.setFieldsValue({...paramsRef.current})
    })
    const cleatParams = useMemoizedFn(() => {
        paramsRef.current = {useGadget, ...DefaultParams}
        setParams({...DefaultParams})
        formInstance.setFieldsValue({useGadget, ...DefaultParams})
        setFormList([])
        formBindRef.current = {}
    })

    const [btnLoading, setBtnLoading] = useState<boolean>(false)
    const [options, setOptions] = useState<OptionInfo[]>([])
    const [selectOptions, setSelectOptions] = useState<OptionInfo[]>([])
    const [formList, setFormList] = useState<FormList[]>([])
    const formBindRef = useRef<FormBindInfo>({})

    const formStart = useMemoizedFn(() => {
        if (btnLoading) return
        if (!onStart) return
        if (isStart) {
            onStart({...paramsRef.current})
        } else {
            formInstance.validateFields().then(() => {
                setLoading(true)
                onStart({...paramsRef.current})
            })
        }
    })
    const formApply = useMemoizedFn(() => {
        if (btnLoading) return
        formInstance.validateFields().then(() => {
            setLoading(true)
            onApply({...paramsRef.current})
        })
    })

    useEffect(() => {
        loadOptions(useGadget)
        if (isInit.current) {
            formInstance.setFieldsValue({...paramsData})
            formInstance.resetFields()
            isInit.current = false
        } else cleatParams()
    }, [useGadget])
    const loadOptions = (isGadget: boolean) => {
        ipcRenderer
            .invoke(
                isGadget ? "GetAllYsoGadgetOptions" : "GetAllYsoClassOptions",
                isGadget ? undefined : {Gadget: "None"}
            )
            .then((d: {Options: YsoOptionInfo[]}) => {
                const {Options} = d
                let optionArr: OptionInfo[] = Options.map((item) => {
                    const info: OptionInfo = {
                        ...item,
                        NameVerbose: isGadget ? (
                            <div className='form-item-options-title'>
                                {item.NameVerbose}
                                {!!item.Help && (
                                    <Tooltip placement='bottom' title={item.Help}>
                                        <QuestionOutlined className='question-icon' />
                                    </Tooltip>
                                )}
                            </div>
                        ) : (
                            item.NameVerbose
                        ),
                        Label: item.NameVerbose,
                        isLeaf: false,
                        children: []
                    }
                    return info
                })
                useGadget ? setOptions(optionArr) : setSelectOptions(optionArr)
            })
            .catch((e: any) => failed(`${isGadget ? "Failed to get exploit chain: " : "Get malicious class failed: "} ${e}`))
    }
    const loadClassOptions = useMemoizedFn((selectedOptions: any[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]

        if (selectedOptions.length === 1) {
            ipcRenderer
                .invoke("GetAllYsoClassOptions", {Gadget: targetOption.Name})
                .then((d: {Options: YsoOptionInfo[]}) => {
                    const {Options} = d
                    let optionArr: OptionInfo[] = Options.map((item) => {
                        const info: OptionInfo = {
                            ...item,
                            NameVerbose: useGadget ? (
                                <div className='form-item-options-title'>
                                    {item.NameVerbose}
                                    {!!item.Help && (
                                        <Tooltip placement='bottom' title={item.Help}>
                                            <QuestionOutlined className='question-icon' />
                                        </Tooltip>
                                    )}
                                </div>
                            ) : (
                                item.NameVerbose
                            ),
                            Label: item.NameVerbose,
                            isLeaf: true
                        }
                        return info
                    })
                    targetOption.children = optionArr
                    setOptions([...options])
                })
                .catch((e: any) => {
                    failed("Get class options failed: " + `${e}`)
                })
        }
    })

    const loadGeneraterFormList = useMemoizedFn((value: any[]) => {
        setBtnLoading(true)
        ipcRenderer
            .invoke("GetAllYsoClassGeneraterOptions", {Class: value[1], Gadget: value[0]})
            .then((d: {Options: YsoClassGeneraterOptions[]}) => {
                const {Options} = d

                const paramsOptions: {[key: string]: string | number | boolean} = {}
                const formLists: FormList[] = []
                for (let el of Options) {
                    if (Object.keys(el.BindOptions).length > 0) {
                        const relation: string[] = []
                        for (let bindValue in el.BindOptions) {
                            relation.push(
                                `${bindValue}||${el.BindOptions[bindValue].Options.map((item) => item.Key).join("||")}`
                            )
                        }
                        formBindRef.current[el.Key] = [...relation]
                    }
                    formLists.push(el)
                    switch (el.Type) {
                        case FormParamsType.String:
                        case FormParamsType.Base64Bytes:
                            paramsOptions[el.Key] = el.Value
                            break
                        case FormParamsType.StringPort:
                            paramsOptions[el.Key] = !el.Value ? 0 : +el.Value || 0
                            break
                        case FormParamsType.StringBool:
                            paramsOptions[el.Key] = !el.Value ? false : el.Value === "false" ? false : true
                            break
                    }
                }
                paramsRef.current = {
                    useGadget,
                    Gadget: paramsRef.current.Gadget,
                    Class: paramsRef.current.Class,
                    ...paramsOptions
                }
                setParams({...paramsRef.current})
                formInstance.setFieldsValue({...paramsRef.current})
                setTimeout(() => setFormList(formLists), 300)
            })
            .catch((e: any) => {
                failed("Get class generater options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setBtnLoading(false), 300))
    })

    // Supports only unidirectional binding for boolean and string types
    const judgeBindValue = useMemoizedFn((key: string) => {
        const bindRef = formBindRef.current
        const paramsValue = paramsRef.current

        for (let keyName in bindRef) {
            const valueArr = bindRef[keyName] || []
            for (let bindKey of valueArr) {
                if (bindKey.indexOf(key) > -1) {
                    const value = bindKey.split("||").shift()
                    if ((!!paramsValue[keyName]).toString() !== value) {
                        return false
                    }
                }
            }
        }
        return true
    })

    return (
        <YakitCard
            className='setting-payload-wrapper'
            bodyStyle={{padding: "20px 15px", overflow: "auto"}}
            title={
                <div>
                    JavaPayload configuration
                    <Tooltip placement='bottom' title='Configure serialized Payload or malicious class'>
                        <ExclamationCircleOutlined className='setting-payload-icon' />
                    </Tooltip>
                </div>
            }
            extra={
                <div>
                    {!isReverse && (
                        <YakitButton
                            loading={loading}
                            className='setting-payload-btn'
                            type='outline1'
                            danger={isStart}
                            size='small'
                            onClick={formStart}
                        >
                            {isStart ? "Stop reverse connection" : "Start reverse connection"}
                        </YakitButton>
                    )}
                    {isReverse && (
                        <YakitButton
                            className='setting-payload-btn'
                            type='primary'
                            danger={isShowCode}
                            size='small'
                            onClick={showCode}
                        >
                            {isShowCode ? "Close code" : "Display code"}
                        </YakitButton>
                    )}
                    <YakitButton
                        loading={loading}
                        className='setting-payload-btn'
                        size='small'
                        type='primary'
                        onClick={formApply}
                    >
                        Generate
                    </YakitButton>
                </div>
            }
        >
            <YakitSpin spinning={loading}>
                <Form
                    form={formInstance}
                    name='form'
                    size='small'
                    labelCol={{span: 9}}
                    wrapperCol={{span: 15}}
                    colon={false}
                    initialValues={{...paramsRef.current}}
                    autoComplete='off'
                    className='from-common-style'
                >
                    <Form.Item
                        label={
                            <div className='form-item-label-title'>
                                Use exploit chain
                                <Tooltip placement='bottom' title='Close to not use exploit chain, only generate malicious class'>
                                    <ExclamationCircleOutlined className='setting-payload-icon' />
                                </Tooltip>
                            </div>
                        }
                        name='useGadget'
                    >
                        <YakitSwitch
                            checked={useGadget}
                            onChange={(check) => {
                                setUseGadget(check)
                                setParamsData({...paramsRef.current, useGadget: check})
                                setTimeout(() => cleatParams(), 300)
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        label={useGadget ? "Exploit chain" : "Malicious class"}
                        rules={[
                            {required: true, message: ""},
                            () => ({
                                validator(_, value) {
                                    if (getUseGadget()) {
                                        if (Array.isArray(value) && value.length > 0) return Promise.resolve()
                                        return Promise.reject(new Error(""))
                                    } else {
                                        if (!!value) return Promise.resolve()
                                        return Promise.reject(new Error(""))
                                    }
                                }
                            })
                        ]}
                        name={useGadget ? "[Gadget,Class]" : "Class"}
                    >
                        {useGadget ? (
                            <YakitCascader
                                fieldNames={{label: "NameVerbose", value: "Name", children: "children"}}
                                loadData={loadClassOptions}
                                options={options}
                                value={!params.Gadget ? [] : [params.Gadget, params.Class]}
                                placeholder='Select exploit chain'
                                onChange={(value: any[]) => {
                                    if (!value || value.length === 0) cleatParams()
                                    else {
                                        setParamsValue([
                                            {key: "Gadget", value: value[0]},
                                            {key: "Class", value: value[1]}
                                        ])
                                        // Prevent this operation from interfering with the assignments above
                                        setTimeout(() => loadGeneraterFormList(value), 200)
                                    }
                                }}
                                displayRender={(label, selectedOptions) => {
                                    if (
                                        (selectedOptions || []).filter((item: any) => !!item && item.Label).length !== 2
                                    )
                                        return ""
                                    const diplay = (selectedOptions || []).map((item: any) => item.Label).join(" / ")
                                    return <>{diplay}</>
                                }}
                                
                            />
                        ) : (
                            <YakitSelect
                                allowClear={true}
                                placeholder='Select malicious class'
                                optionLabelProp='NameVerbose'
                                value={params.Class}
                                onChange={(value) => {
                                    if (!!value) {
                                        setParamsValue([
                                            {key: "Gadget", value: "None"},
                                            {key: "Class", value: value}
                                        ])
                                        // Prevent this operation from interfering with the assignments above
                                        setTimeout(() => loadGeneraterFormList(["None", value]), 200)
                                    } else cleatParams()
                                }}
                            >
                                {selectOptions.map((item) => {
                                    return (
                                        <YakitSelect.Option key={item.Name} value={item.Name}>
                                            <div className='form-item-options-title'>
                                                {item.NameVerbose}
                                                {!!item.Help && (
                                                    <Tooltip placement='bottom' title={item.Help}>
                                                        <QuestionOutlined className='question-icon' />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </YakitSelect.Option>
                                    )
                                })}
                            </YakitSelect>
                        )}
                    </Form.Item>

                    {formList.map((item) => {
                        const flag = judgeBindValue(item.Key)
                        if (!flag) return <div key={item.Key}></div>

                        return (
                            <Form.Item
                                key={item.Key}
                                label={
                                    <div className='form-item-label-title'>
                                        {item.KeyVerbose}
                                        {!!item.Help && (
                                            <Tooltip placement='bottom' title={item.Help}>
                                                <ExclamationCircleOutlined className='setting-payload-icon' />
                                            </Tooltip>
                                        )}
                                    </div>
                                }
                                name={item.Key}
                                rules={[
                                    {required: true, message: ""},
                                    () => ({
                                        validator(_, value) {
                                            if (
                                                item.Type === FormParamsType.StringBool ||
                                                item.Type === FormParamsType.StringPort
                                            )
                                                return Promise.resolve()
                                            if (value) return Promise.resolve()
                                            return Promise.reject(new Error(""))
                                        }
                                    })
                                ]}
                            >
                                {(item.Type === FormParamsType.String || item.Type === FormParamsType.Base64Bytes) && (
                                    <YakitInput
                                        allowClear={true}
                                        placeholder={
                                            item.Type === FormParamsType.Base64Bytes
                                                ? "Content must be Base64 encoded"
                                                : `Please Enter${item.KeyVerbose}`
                                        }
                                        value={params[item.Key] as string}
                                        onChange={(e) => setParamsValue([{key: item.Key, value: e.target.value}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringPort && (
                                    <YakitInputNumber
                                        precision={0}
                                        value={+params[item.Key]}
                                        onChange={(value) => setParamsValue([{key: item.Key, value: value as number}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringBool && (
                                    <YakitSwitch
                                        checked={!!params[item.Key]}
                                        onChange={(check) => {
                                            const info: {key: string; value: string | boolean}[] = [
                                                {key: item.Key, value: check}
                                            ]
                                            for (let name in formBindRef.current) {
                                                if (name === item.Key) {
                                                    const keyArr = formBindRef.current[name].filter(
                                                        (item) => item.indexOf(check.toString()) > -1
                                                    )
                                                    if (keyArr.length > 0) {
                                                        const keys = keyArr[keyArr.length - 1].split("||")
                                                        keys.shift()
                                                        for (let keyName of keys) info.push({key: keyName, value: ""})
                                                    }
                                                    break
                                                }
                                            }
                                            setParamsValue([...info])
                                        }}
                                    />
                                )}
                            </Form.Item>
                        )
                    })}
                </Form>
                {!!extraNode && extraNode}
            </YakitSpin>
        </YakitCard>
    )
})

interface PayloadCodeProp {
    isMin?: boolean
    codeExtra: boolean
    data: ParamsRefProps
    RefreshTrigger: boolean
    onExtra: () => any
}

const CodeType: {value: string; label: string}[] = [
    {value: "base64", label: "BASE64"},
    {value: "hex", label: "HEX"},
    // {value: "javadump", label: "JavaDump"},
    {value: "yak", label: "YAK"},
    {value: "dump", label: "DUMP"}
]

export const PayloadCode: React.FC<PayloadCodeProp> = React.memo((props) => {
    const {isMin = false, codeExtra, data, RefreshTrigger, onExtra} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [type, setType] = useState<string>("base64")
    const [code, setCode] = useState<string>("")
    const [hex, setHex] = useState<Uint8Array>(new Uint8Array())
    const [width, setWidth] = useState<number>(600)

    useEffect(() => convertCode(type), [RefreshTrigger])

    const typeChange = useMemoizedFn((value: string) => {
        setType(value)
        convertCode(value)
    })

    /**
     * @name Generate various types of code
     */
    const convertCode = useMemoizedFn((type: string) => {
        if (!data.Class || !data.Gadget) return
        switch (type) {
            case "base64":
                convertBase64()
                return
            case "hex":
                convertHex()
                return
            case "yak":
                convertYak()
                return
            case "dump":
                convertDump()
                return
        }
    })

    const codeOperate = useMemoizedFn((value: "yakRunning" | "download" | "copy" | "extra") => {
        if (value === "yakRunning") {
            ipcRenderer.invoke("send-to-tab", {
                type: "add-yak-running",
                data: {
                    name: `${data.Class}/${data.Gadget}-${new Date().getTime()}`,
                    code: code
                }
            })
        }
        if (value === "download") {
            saveABSFileToOpen(`${type}-${data.Class}-${data.Gadget}`, type === "hex" ? hex : code)
        }

        if (value === "copy") callCopyToClipboard(code)
        if (value === "extra") onExtra()
    })

    const convertBase64 = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoBytes", request)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                ipcRenderer
                    .invoke("BytesToBase64", {
                        Bytes: d.Bytes
                    })
                    .then((res: {Base64: string}) => {
                        success("Generate Base64 successfully")
                        setCode(res.Base64)
                    })
                    .catch((err) => {
                        failed(`${err}`)
                    })
            })
            .catch((e: any) => {
                failed("Generate Base64 failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const convertHex = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoBytes", request)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                success("Bytecode generated successfully")
                setHex(d.Bytes)
                setCode(Buffer.from(d.Bytes).toString("hex"))
            })
            .catch((e: any) => {
                failed("Bytecode generation failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    // const convertJava = useMemoizedFn(() => {
    //     const request = convertRequest(data)
    // })
    const convertYak = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoCode", request)
            .then((d: {Code: string}) => {
                success("Code generated successfully")
                setCode(d.Code)
            })
            .catch((e: any) => {
                failed("Code generation failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const convertDump = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoBytes", request)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                ipcRenderer
                    .invoke("YsoDump", {
                        Data: d.Bytes
                    })
                    .then((res: {Data: string}) => {
                        success("Dump successful")
                        setCode(res.Data)
                    })
                    .catch((err) => {
                        failed(`${err}`)
                    })
            })
            .catch((e: any) => {
                failed("Dump failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    return (
        <YakitCard
            className='code-payload-wrapper'
            bodyStyle={{padding: 0, overflow: "hidden"}}
            title={
                <div>
                    Code
                    <YakitRadioButtons
                        className='code-type-radio'
                        size='small'
                        buttonStyle='solid'
                        value={type}
                        onChange={({target: {value}}) => typeChange(value)}
                        options={CodeType}
                    />
                </div>
            }
            extra={
                width < 510 || (isMin && !codeExtra) ? (
                    <div>
                        {type === "yak" ? (
                            <YakitButton
                                loading={loading}
                                type='text'
                                size='small'
                                icon={
                                    <Tooltip title='Yak Runner'>
                                        <ThunderboltOutlined />
                                    </Tooltip>
                                }
                                onClick={() => codeOperate("yakRunning")}
                            />
                        ) : (
                            <></>
                        )}
                        {type === "hex" ? (
                            <YakitButton
                                loading={loading}
                                type='text'
                                size='small'
                                icon={
                                    <Tooltip title='Download file'>
                                        <DownloadOutlined />
                                    </Tooltip>
                                }
                                onClick={() => codeOperate("download")}
                            />
                        ) : (
                            <></>
                        )}

                        <YakitButton
                            loading={loading}
                            type='text'
                            size='small'
                            icon={
                                <Tooltip title='Copy code'>
                                    <CopyOutlined />
                                </Tooltip>
                            }
                            onClick={() => codeOperate("copy")}
                        />
                        <YakitButton
                            type='text'
                            size='small'
                            icon={codeExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => codeOperate("extra")}
                        />
                    </div>
                ) : (
                    <div className='extra-btns'>
                        {type === "yak" ? (
                            <YakitButton
                                loading={loading}
                                type='primary'
                                size='small'
                                icon={<ThunderboltOutlined />}
                                onClick={() => codeOperate("yakRunning")}
                            >
                                Yak Runner
                            </YakitButton>
                        ) : (
                            <></>
                        )}
                        {type === "hex" ? (
                            <YakitButton
                                loading={loading}
                                type='primary'
                                size='small'
                                onClick={() => codeOperate("download")}
                            >
                                Download file
                            </YakitButton>
                        ) : (
                            <></>
                        )}

                        <YakitButton loading={loading} type='primary' size='small' onClick={() => codeOperate("copy")}>
                            Copy code
                        </YakitButton>
                        <YakitButton
                            type='text'
                            size='small'
                            icon={codeExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => codeOperate("extra")}
                        />
                    </div>
                )
            }
        >
            <ReactResizeDetector
                onResize={(width) => {
                    if (!width) return
                    setWidth(width)
                }}
                handleWidth={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitSpin spinning={loading}>
                {type === "hex" ? (
                    <YakitEditor readOnly={true} value={code} />
                ) : (
                    <YakitEditor readOnly={true} value={code} />
                )}
            </YakitSpin>
        </YakitCard>
    )
})
