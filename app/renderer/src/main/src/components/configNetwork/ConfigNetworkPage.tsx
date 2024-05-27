import React, {useEffect, useMemo, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {ManyMultiSelectForString, SwitchItem} from "@/utils/inputUtil"
import {Divider, Form, Modal, Space, Upload} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {yakitInfo, warn, failed, success} from "@/utils/notification"
import {AutoSpin} from "@/components/AutoSpin"
import update from "immutability-helper"
import {useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./ConfigNetworkPage.module.scss"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {InputCertificateForm} from "@/pages/mitm/MITMServerStartForm/MITMAddTLS"
import {StringToUint8Array} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {CloseIcon, RectangleFailIcon, RectangleSucceeIcon, UnionIcon} from "./icon"
import {SolidCheckCircleIcon, SolidLockClosedIcon} from "@/assets/icon/colors"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import classNames from "classnames"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ThirdPartyApplicationConfigForm} from "@/components/configNetwork/ThirdPartyApplicationConfig"
import {BanIcon, CogIcon, DragSortIcon, PencilAltIcon, RemoveIcon, TrashIcon} from "@/assets/newIcon"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "../TableVirtualResize/TableVirtualResizeType"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {v4 as uuidv4} from "uuid"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {PcapMetadata} from "@/models/Traffic"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {KVPair} from "@/models/kv"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {LocalGVS} from "@/enums/localGlobal"
import {RemoteGV} from "@/yakitGV"
import { DragDropContext, Draggable, DropResult, Droppable } from "@hello-pangea/dnd"

export interface ConfigNetworkPageProp {}

export interface AuthInfo {
    AuthUsername: string
    AuthPassword: string
    AuthType: string
    Host: string
    Forbidden: boolean
}

export interface GlobalNetworkConfig {
    DisableSystemDNS: boolean
    CustomDNSServers: string[]
    DNSFallbackTCP: boolean
    DNSFallbackDoH: boolean
    CustomDoHServers: string[]

    ClientCertificates?: ClientCertificates[]

    DisallowIPAddress: string[]
    DisallowDomain: string[]
    GlobalProxy: string[]
    EnableSystemProxyFromEnv: boolean
    SkipSaveHTTPFlow: boolean

    //
    AppConfigs: ThirdPartyApplicationConfig[]

    AiApiPriority: string[]

    AuthInfos: AuthInfo[]

    SynScanNetInterface: string

    ExcludePluginScanURIs: string[]
    IncludePluginScanURIs: string[]
}

export interface ThirdPartyApplicationConfig {
    Type:
        | "zoomeye"
        | "hunter"
        | "shodan"
        | "fofa"
        | "github"
        | "openai"
        | "skylark"
        | "aliyun"
        | "tencent"
        | "quake"
        | string
    APIKey: string
    UserIdentifier: string
    UserSecret?: string
    Namespace?: string
    Domain?: string
    WebhookURL?: string
    ExtraParams?: KVPair[]
}

export interface IsSetGlobalNetworkConfig {
    Pkcs12Bytes: Uint8Array
    Pkcs12Password?: Uint8Array
}

interface ClientCertificatePem {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

interface ClientCertificatePfx {
    name: string
    Pkcs12Bytes: Uint8Array
    Pkcs12Password: Uint8Array
    password?: boolean
}

interface ClientCertificates {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
    Pkcs12Bytes: Uint8Array
    Pkcs12Password: Uint8Array
}

const {ipcRenderer} = window.require("electron")

export const defaultParams: GlobalNetworkConfig = {
    DisableSystemDNS: false,
    CustomDNSServers: [],
    DNSFallbackTCP: false,
    DNSFallbackDoH: false,
    CustomDoHServers: [],
    DisallowIPAddress: [],
    DisallowDomain: [],
    GlobalProxy: [],
    EnableSystemProxyFromEnv: false,
    SkipSaveHTTPFlow: false,
    AppConfigs: [],
    AiApiPriority:[],
    AuthInfos: [],
    SynScanNetInterface: "",
    ExcludePluginScanURIs: [],
    IncludePluginScanURIs: [],
}

export const ConfigNetworkPage: React.FC<ConfigNetworkPageProp> = (props) => {
    const [params, setParams] = useState<GlobalNetworkConfig>(defaultParams)
    const [certificateParams, setCertificateParams] = useState<ClientCertificatePfx[]>()
    const currentIndex = useRef<number>(0)
    const [format, setFormat] = useState<1 | 2>(1)
    const cerFormRef = useRef<any>()
    const [loading, setLoading] = useState(false)
    const isShowLoading = useRef<boolean>(true)
    const [visible, setVisible] = useState<boolean>(false)
    const configRef = useRef<any>()
    const [inViewport] = useInViewport(configRef)
    const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // Proxy Delegate

    /** ---------- Remove Private Plugin Logic Start? ---------- */
    const [isDelPrivatePlugin, setIsDelPrivatePlugin] = useState<boolean>(false)
    useEffect(() => {
        getLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout).then((v: boolean) => {
            setIsDelPrivatePlugin(!!v)
        })
    }, [])
    const onSetDelPrivatePlugin = useMemoizedFn(() => {
        setLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout, isDelPrivatePlugin)
    })
    const onResetDelPrivatePlugin = useMemoizedFn(() => {
        setLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout, false)
    })
    /** ---------- Private Plugin Logic End ---------- */

    const update = useMemoizedFn(() => {
        isShowLoading.current && setLoading(true)
        isShowLoading.current = false
        // setParams(defaultParams)
        ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((rsp: GlobalNetworkConfig) => {
            console.log("GetGlobalNetworkConfig", rsp)
            const {ClientCertificates, SynScanNetInterface} = rsp
            console.log("SynScanNetInterface", SynScanNetInterface)
            ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
                if (!data || data.AvailablePcapDevices.length == 0) {
                    return
                }
                const interfaceList = data.AvailablePcapDevices.map((item) => ({
                    label: `${item.NetInterfaceName}-(${item.IP})`,
                    value: item.Name
                }))
                if (SynScanNetInterface.length === 0) {
                    setParams((v) => ({...v, SynScanNetInterface: data.DefaultPublicNetInterface.NetInterfaceName}))
                }
                setNetInterfaceList(interfaceList)
            })
            if (Array.isArray(ClientCertificates) && ClientCertificates.length > 0 && format === 1) {
                let newArr = ClientCertificates.map((item, index) => {
                    const {Pkcs12Bytes, Pkcs12Password} = item
                    return {Pkcs12Bytes, Pkcs12Password, name: `Certificate${index + 1}`}
                })
                setCertificateParams(newArr)
                currentIndex.current = ClientCertificates.length
            }
            setParams((v) => ({...v, ...rsp, DisallowDomain: rsp.DisallowDomain.filter((item) => item)}))
            setLoading(false)
        })
    })
    useEffect(() => {
        update()
    }, [format])

    const onCertificate = useMemoizedFn((file: any) => {
        if (!["application/x-pkcs12"].includes(file.type)) {
            warn("Supports Only application Format/x-pkcs12")
            return false
        }
        ipcRenderer
            .invoke("fetch-certificate-content", file.path)
            .then((res) => {
                currentIndex.current += 1

                // Verify Certificate Password Requirement
                ipcRenderer
                    .invoke("ValidP12PassWord", {
                        Pkcs12Bytes: res
                    } as IsSetGlobalNetworkConfig)
                    .then((result: {IsSetPassWord: boolean}) => {
                        if (result.IsSetPassWord) {
                            setCertificateParams([
                                ...(certificateParams || []),
                                {
                                    name: `Certificate${currentIndex.current}`,
                                    Pkcs12Bytes: res,
                                    Pkcs12Password: new Uint8Array()
                                }
                            ])
                        } else {
                            // Password Required
                            setCertificateParams([
                                ...(certificateParams || []),
                                {
                                    name: `Certificate${currentIndex.current}`,
                                    Pkcs12Bytes: res,
                                    Pkcs12Password: new Uint8Array(),
                                    password: true
                                }
                            ])
                        }
                    })
            })
            .catch((e) => {
                failed(`Unable to Retrieve File Content, Check and Retry！${e}`)
            })
        return false
    })

    const ipcSubmit = useMemoizedFn((params: GlobalNetworkConfig, isNtml?: boolean) => {
        console.log("SetGlobalNetworkConfig", params)
        ipcRenderer.invoke("SetGlobalNetworkConfig", params).then(() => {
            yakitInfo("Configuration Update Success")
            update()
            if (isNtml) setVisible(false)
        })
    })

    const onNtmlSave = useMemoizedFn(() => {
        submit(true)
    })

    const submit = useMemoizedFn((isNtml?: boolean) => {
        // Update Privacy Config Data
        onSetDelPrivatePlugin()

        // Update No-Config Startup Path
        onSetChromePath()

        if (format === 1) {
            // if (!(Array.isArray(certificateParams)&&certificateParams.length>0)) {
            //     warn("Add Certificate Request")
            //     return
            // }

            if (
                Array.isArray(certificateParams) &&
                certificateParams.length > 0 &&
                certificateParams.filter((item) => item.password === true).length === certificateParams.length
            ) {
                warn("Invalid Certificate")
                return
            }
            const obj: ClientCertificatePem = {
                CaCertificates: [],
                CrtPem: new Uint8Array(),
                KeyPem: new Uint8Array()
            }
            const certificate = (certificateParams || []).filter((item) => item.password !== true)
            const ClientCertificates = certificate.map((item) => {
                const {Pkcs12Bytes, Pkcs12Password} = item
                return {Pkcs12Bytes, Pkcs12Password, ...obj}
            })
            const newParams: GlobalNetworkConfig = {
                ...params,
                ClientCertificates: ClientCertificates.length > 0 ? ClientCertificates : undefined
            }
            ipcSubmit(newParams, isNtml)
        }
        if (format === 2) {
            cerFormRef.current.validateFields().then((values) => {
                const obj: ClientCertificatePem = {
                    CaCertificates:
                        values.CaCertificates && values.CaCertificates.length > 0
                            ? [StringToUint8Array(values.CaCertificates)]
                            : [],
                    CrtPem: StringToUint8Array(values.CrtPem),
                    KeyPem: StringToUint8Array(values.CrtPem)
                }
                const newParams: GlobalNetworkConfig = {
                    ...params,
                    ClientCertificates: [{...obj, Pkcs12Bytes: new Uint8Array(), Pkcs12Password: new Uint8Array()}]
                }
                ipcSubmit(newParams, isNtml)
            })
        }
    })

    const closeCard = useMemoizedFn((item: ClientCertificatePfx) => {
        if (Array.isArray(certificateParams)) {
            let cache: ClientCertificatePfx[] = certificateParams.filter((itemIn) => item.name !== itemIn.name)
            setCertificateParams(cache)
        }
    })

    const failCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
        return (
            <div key={key} className={classNames(styles["certificate-card"], styles["certificate-fail"])}>
                <div className={styles["decorate"]}>
                    <RectangleFailIcon />
                </div>
                <div className={styles["card-hide"]}></div>
                <div className={styles["fail-main"]}>
                    <div
                        className={styles["close"]}
                        onClick={() => {
                            closeCard(item)
                        }}
                    >
                        <CloseIcon />
                    </div>
                    <div className={styles["title"]}>{item.name}</div>
                    <SolidLockClosedIcon />
                    <div className={styles["content"]}>Not Decrypted</div>
                    <YakitButton
                        type='outline2'
                        onClick={() => {
                            const m = showYakitModal({
                                title: "Password Unlock",
                                content: (
                                    <div style={{padding: 20}}>
                                        <YakitInput.Password
                                            placeholder='Enter Certificate Password'
                                            allowClear
                                            onChange={(e) => {
                                                const {value} = e.target
                                                if (Array.isArray(certificateParams)) {
                                                    certificateParams[key].Pkcs12Password =
                                                        value.length > 0 ? StringToUint8Array(value) : new Uint8Array()
                                                    let cache: ClientCertificatePfx[] = cloneDeep(certificateParams)
                                                    setCertificateParams(cache)
                                                }
                                            }}
                                        />
                                    </div>
                                ),
                                onCancel: () => {
                                    m.destroy()
                                },
                                onOk: () => {
                                    ipcRenderer
                                        .invoke("ValidP12PassWord", {
                                            Pkcs12Bytes: item.Pkcs12Bytes,
                                            Pkcs12Password: item.Pkcs12Password
                                        } as IsSetGlobalNetworkConfig)
                                        .then((result: {IsSetPassWord: boolean}) => {
                                            if (result.IsSetPassWord) {
                                                if (Array.isArray(certificateParams)) {
                                                    certificateParams[key].password = false
                                                    let cache: ClientCertificatePfx[] = cloneDeep(certificateParams)
                                                    setCertificateParams(cache)
                                                    m.destroy()
                                                }
                                            } else {
                                                failed(`Wrong Password`)
                                            }
                                        })
                                },
                                width: 400
                            })
                        }}
                    >
                        Password Unlock
                    </YakitButton>
                </div>
            </div>
        )
    })

    const succeeCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
        return (
            <div key={key} className={classNames(styles["certificate-card"], styles["certificate-succee"])}>
                <div className={styles["decorate"]}>
                    <RectangleSucceeIcon />
                </div>
                <div className={styles["union"]}>
                    <UnionIcon />
                </div>
                <div className={styles["card-hide"]}></div>

                <div className={styles["success-main"]}>
                    <div
                        className={styles["close"]}
                        onClick={() => {
                            closeCard(item)
                        }}
                    >
                        <CloseIcon />
                    </div>
                    <div className={styles["title"]}>{item.name}</div>
                    <SolidCheckCircleIcon />
                    <div className={styles["content"]}>Available</div>
                    <div className={styles["password"]}>******</div>
                </div>
            </div>
        )
    })

    const certificateList = useMemo(() => {
        return (
            <div className={styles["certificate-box"]}>
                {Array.isArray(certificateParams) &&
                    certificateParams.map((item, index) => {
                        if (item.password) return failCard(item, index)
                        return succeeCard(item, index)
                    })}
            </div>
        )
    }, [certificateParams])

    const [chromePath, setChromePath] = useState<string>("")
    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            if (!setting) {
                ipcRenderer.invoke("GetChromePath").then((chromePath: string) => {
                    setChromePath(chromePath)
                    onSetChromePath(chromePath)
                })
            } else {
                const values: string = JSON.parse(setting)
                setChromePath(values)
            }
        })
    }, [])
    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }
    const onSetChromePath = useMemoizedFn((value?: string) => {
        setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(value || chromePath))
    })
    const onResetChromePath = useMemoizedFn(() => {
        let path = ""
        ipcRenderer
            .invoke("GetChromePath")
            .then((chromePath: string) => {
                path = chromePath
            })
            .finally(() => {
                setChromePath(path)
                setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(path))
            })
    })

    return (
        <>
            <div ref={configRef}>
                <AutoCard style={{height: "auto"}}>
                    <AutoSpin spinning={loading} tip='Loading Network Config...'>
                        {params && (
                            <Form
                                size={"small"}
                                labelCol={{span: 5}}
                                wrapperCol={{span: 14}}
                                onSubmitCapture={() => submit()}
                            >
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    DNS Configuration
                                </Divider>
                                <SwitchItem
                                    label={"Disable System DNS"}
                                    setValue={(DisableSystemDNS) => setParams({...params, DisableSystemDNS})}
                                    value={params.DisableSystemDNS}
                                    oldTheme={false}
                                />
                                <ManyMultiSelectForString
                                    label={"Alternate DNS"}
                                    setValue={(CustomDNSServers) =>
                                        setParams({...params, CustomDNSServers: CustomDNSServers.split(",")})
                                    }
                                    value={params.CustomDNSServers.join(",")}
                                    data={[]}
                                    mode={"tags"}
                                />
                                <SwitchItem
                                    label={"Enable TCP DNS"}
                                    setValue={(DNSFallbackTCP) => setParams({...params, DNSFallbackTCP})}
                                    value={params.DNSFallbackTCP}
                                    oldTheme={false}
                                />
                                <SwitchItem
                                    label={"Enable DoH Anti-Pollution"}
                                    setValue={(DNSFallbackDoH) => setParams({...params, DNSFallbackDoH})}
                                    value={params.DNSFallbackDoH}
                                    oldTheme={false}
                                />
                                {params.DNSFallbackDoH && (
                                    <ManyMultiSelectForString
                                        label={"Alternate DoH"}
                                        setValue={(data) => setParams({...params, CustomDoHServers: data.split(",")})}
                                        value={params.CustomDoHServers.join(",")}
                                        data={[]}
                                        mode={"tags"}
                                    />
                                )}
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    TLS Client Certificate (Mutual Authentication)）
                                </Divider>
                                <Form.Item label={"Select Format"}>
                                    <YakitRadioButtons
                                        size='small'
                                        value={format}
                                        onChange={(e) => {
                                            setFormat(e.target.value)
                                        }}
                                        buttonStyle='solid'
                                        options={[
                                            {
                                                value: 1,
                                                label: "p12/pfx Format"
                                            },
                                            {
                                                value: 2,
                                                label: "pem Format"
                                            }
                                        ]}
                                    />
                                </Form.Item>
                                {format === 1 && (
                                    <>
                                        <Form.Item label={"Add Certificate"}>
                                            {/*
                                    PEM: 3 - CERT / KEY / CA-CERT
                                    PKCS12(P12/PFX)(.p12 .pfx): File + Password
                                */}
                                            <Upload
                                                accept={".p12,.pfx"}
                                                multiple={false}
                                                maxCount={1}
                                                showUploadList={false}
                                                beforeUpload={(file) => onCertificate(file)}
                                            >
                                                <YakitButton type={"outline2"}>Add TLS Client Certificate</YakitButton>
                                            </Upload>
                                            {certificateList}
                                        </Form.Item>
                                    </>
                                )}
                                {format === 2 && (
                                    <InputCertificateForm
                                        ref={cerFormRef}
                                        isShowCerName={false}
                                        formProps={{
                                            labelCol: {span: 5},
                                            wrapperCol: {span: 14}
                                        }}
                                    />
                                )}
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    Third-Party App Config
                                </Divider>
                                <Form.Item label={"Third-Party Application"}>
                                    {(params.AppConfigs || []).map((i, index) => {
                                        return (
                                            <YakitTag
                                                key={index}
                                                onClick={() => {
                                                    let m = showYakitModal({
                                                        title: "Edit Third-Party App",
                                                        width: 600,
                                                        closable: true,
                                                        maskClosable: false,
                                                        footer: null,
                                                        content: (
                                                            <div style={{margin: 24}}>
                                                                <ThirdPartyApplicationConfigForm
                                                                    data={i}
                                                                    onAdd={(e) => {
                                                                        setParams({
                                                                            ...params,
                                                                            AppConfigs: (params.AppConfigs || []).map(
                                                                                (i) => {
                                                                                    if (i.Type === e.Type) {
                                                                                        i = e
                                                                                    }
                                                                                    return {...i}
                                                                                }
                                                                            )
                                                                        })
                                                                        setTimeout(()=>submit(),100)
                                                                        m.destroy()
                                                                    }}
                                                                    onCancel={() => m.destroy()}
                                                                />
                                                            </div>
                                                        )
                                                    })
                                                }}
                                                closable
                                                onClose={() => {
                                                    setParams({
                                                        ...params,
                                                        AppConfigs: (params.AppConfigs || []).filter(
                                                            (e) => i.Type !== e.Type
                                                        )
                                                    })
                                                }}
                                            >
                                                {i.Type}
                                            </YakitTag>
                                        )
                                    })}
                                    <YakitButton
                                        type={"outline1"}
                                        onClick={() => {
                                            let m = showYakitModal({
                                                title: "Add Third-Party App",
                                                width: 600,
                                                footer: null,
                                                closable: true,
                                                maskClosable: false,
                                                content: (
                                                    <div style={{margin: 24}}>
                                                        <ThirdPartyApplicationConfigForm
                                                            onAdd={(e) => {
                                                                let existed = false
                                                                const existedResult = (params.AppConfigs || []).map(
                                                                    (i) => {
                                                                        if (i.Type === e.Type) {
                                                                            existed = true
                                                                            return {...i, ...e}
                                                                        }
                                                                        return {...i}
                                                                    }
                                                                )
                                                                if (!existed) {
                                                                    existedResult.push(e)
                                                                }
                                                                setParams({...params, AppConfigs: existedResult})
                                                                setTimeout(()=>submit(),100)
                                                                m.destroy()
                                                            }}
                                                            onCancel={() => m.destroy()}
                                                        />
                                                    </div>
                                                )
                                            })
                                        }}
                                    >
                                        Add Third-Party App
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item label={"AI Priority"}>
                                    <YakitButton type={"outline1"} onClick={()=>{
                                        let AiApiPriority:string[] = params.AiApiPriority
                                        let m = showYakitModal({
                                            title: "Set AI Usage Priority",
                                            width: 460,
                                            // footer: null,
                                            closable: true,
                                            maskClosable: false,
                                            content: (
                                                <div style={{margin: 24}}>
                                                    <AISortContent AiApiPriority={params.AiApiPriority} onUpdate={(newAiApiPriority)=>{
                                                        AiApiPriority = newAiApiPriority
                                                    }}/>
                                                </div>
                                            ),
                                            onCancel:()=>{m.destroy()},
                                            onOk:()=>{
                                                setParams({...params, AiApiPriority})
                                                setTimeout(()=>submit(),100)
                                                m.destroy()
                                            }
                                        })
                                    }}>Configuration</YakitButton>
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    Other Configuration
                                </Divider>
                                <Form.Item label={"HTTP Authentication Global Config"}>
                                    <div className={styles["form-rule-body"]}>
                                        <div className={styles["form-rule"]} onClick={() => setVisible(true)}>
                                            <div className={styles["form-rule-text"]}>
                                                Current Config {params.AuthInfos.filter((item) => !item.Forbidden).length} Rule
                                            </div>
                                            <div className={styles["form-rule-icon"]}>
                                                <CogIcon />
                                            </div>
                                        </div>
                                    </div>
                                </Form.Item>

                                <Form.Item label={"Disable IP"} tooltip='After Disabling IP, yakit Will Filter Unreachable'>
                                    <YakitSelect
                                        mode='tags'
                                        value={params.DisallowIPAddress}
                                        onChange={(value) => {
                                            setParams({...params, DisallowIPAddress: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item label={"Disable Domain"} tooltip='After Disabling Domain, yakit Will Filter Unreachable'>
                                    <YakitSelect
                                        mode='tags'
                                        value={params.DisallowDomain}
                                        onChange={(value) => {
                                            setParams({...params, DisallowDomain: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item
                                    label={"Plugin Scan Whitelist"}
                                    tooltip='Configure Plugin Scan Whitelist (Regex → Glob → Keyword)。'
                                >
                                    <YakitSelect
                                        mode='tags'
                                        value={params.IncludePluginScanURIs}
                                        onChange={(value) => {
                                            setParams({...params, IncludePluginScanURIs: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item
                                    label={"Plugin Scan Blacklist"}
                                    tooltip='Configure Plugin Scan Blacklist (Regex → Glob → Keyword)。'
                                >
                                    <YakitSelect
                                        mode='tags'
                                        value={params.ExcludePluginScanURIs}
                                        onChange={(value) => {
                                            setParams({...params, ExcludePluginScanURIs: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item label={"Global Proxy"}>
                                    <YakitInput
                                        allowClear
                                        size='small'
                                        value={params.GlobalProxy.join(",")}
                                        onChange={(e) => {
                                            const {value} = e.target
                                            setParams({...params, GlobalProxy: value.split(",")})
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item label={"No-Config Startup Path"}>
                                    <YakitInput
                                        value={chromePath}
                                        placeholder={"Select Startup Path"}
                                        size='small'
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
                                                warn("Invalid File Format, Please Re-upload")
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
                                <Form.Item
                                    label={"System Proxy"}
                                    tooltip='If No Proxy Configured, Uses System Proxy by Default; Has Priority Over Other Proxies'
                                >
                                    <YakitSwitch
                                        checked={params.EnableSystemProxyFromEnv}
                                        onChange={(EnableSystemProxyFromEnv) =>
                                            setParams({...params, EnableSystemProxyFromEnv})
                                        }
                                    />
                                </Form.Item>
                                <Form.Item label={"Save HTTP Traffic"} tooltip='Save Non-MITM Traffic to History'>
                                    <YakitSwitch
                                        checked={!params.SkipSaveHTTPFlow}
                                        onChange={(val) => setParams({...params, SkipSaveHTTPFlow: !val})}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    SYN Scan NIC Config
                                </Divider>
                                <Form.Item label={"NIC"} tooltip='Select NIC for SYN Scan'>
                                    <YakitSelect
                                        // showSearch
                                        options={netInterfaceList}
                                        placeholder='Please Select...'
                                        size='small'
                                        value={params.SynScanNetInterface}
                                        onChange={(netInterface) => {
                                            setParams({...params, SynScanNetInterface: netInterface})
                                        }}
                                        maxTagCount={100}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    Privacy Configuration
                                </Divider>
                                <Form.Item
                                    label={"Log Out & Delete Private Plugins"}
                                    tooltip='Deleting Local Private Plugins on Logout to Protect User Data'
                                >
                                    <YakitSwitch checked={isDelPrivatePlugin} onChange={setIsDelPrivatePlugin} />
                                </Form.Item>
                                <Form.Item colon={false} label={" "}>
                                    <Space>
                                        <YakitButton type='primary' htmlType='submit'>
                                            Update Global Config
                                        </YakitButton>
                                        <YakitPopconfirm
                                            title={"Confirm Config Reset?？"}
                                            onConfirm={() => {
                                                onResetDelPrivatePlugin()
                                                onResetChromePath()
                                                ipcRenderer.invoke("ResetGlobalNetworkConfig", {}).then(() => {
                                                    update()
                                                    yakitInfo("Reset Config Success")
                                                })
                                            }}
                                            placement='top'
                                        >
                                            <YakitButton type='outline1'> Reset Config </YakitButton>
                                        </YakitPopconfirm>
                                    </Space>
                                </Form.Item>
                            </Form>
                        )}
                    </AutoSpin>
                </AutoCard>
            </div>
            {visible && (
                <NTMLConfig
                    visible={visible && !!inViewport}
                    setVisible={setVisible}
                    params={params}
                    setParams={setParams}
                    onNtmlSave={onNtmlSave}
                />
            )}
        </>
    )
}

interface NTMLConfigProps {
    visible: boolean
    setVisible: (v: boolean) => void
    getContainer?: HTMLElement | (() => HTMLElement) | false
    params: GlobalNetworkConfig
    setParams: (v: GlobalNetworkConfig) => void
    onNtmlSave: () => void
}

interface DataProps extends AuthInfo {
    id: string
    Disabled: boolean
}

export const NTMLConfig: React.FC<NTMLConfigProps> = (props) => {
    const {visible, setVisible, getContainer, params, setParams, onNtmlSave} = props
    const [data, setData] = useState<DataProps[]>([])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<DataProps>()
    const [modalStatus, setModalStatus] = useState<boolean>(false)
    const [isEdit, setIsEdit] = useState<boolean>(false)
    // initData for Data Validation
    const initData = useRef<DataProps[]>([])

    useEffect(() => {
        const newData = params.AuthInfos.map((item) => ({id: uuidv4(), Disabled: item.Forbidden, ...item}))
        initData.current = newData
        setData(newData)
    }, [params.AuthInfos])

    const onOk = useMemoizedFn(() => {
        const AuthInfos = data.map((item) => ({
            AuthUsername: item.AuthPassword,
            AuthPassword: item.AuthPassword,
            AuthType: item.AuthType,
            Host: item.Host,
            Forbidden: item.Forbidden
        }))

        setParams({...params, AuthInfos})
        setTimeout(() => {
            onNtmlSave()
        }, 200)
    })

    const onClose = useMemoizedFn(() => {
        if (JSON.stringify(initData.current) !== JSON.stringify(data)) {
            Modal.confirm({
                title: "Reminder",
                icon: <ExclamationCircleOutlined />,
                content: "Confirm Saving HTTP Authentication Global Config and Close？",
                okText: "Save",
                cancelText: "Don't Save",
                closable: true,
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
                    onOk()
                },
                onCancel: () => {
                    setVisible(false)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
        }
    })

    const onCreateAuthInfo = useMemoizedFn(() => {
        setModalStatus(true)
    })

    const onRowClick = useDebounceFn(
        (rowDate) => {
            setCurrentItem(rowDate)
        },
        {wait: 200}
    ).run

    const onRemove = useMemoizedFn((rowDate: DataProps) => {
        const newData = data.filter((item) => item.id !== rowDate.id)
        setData(newData)
    })

    const onBan = useMemoizedFn((rowDate: DataProps) => {
        const newData: DataProps[] = data.map((item: DataProps) => {
            if (item.id === rowDate.id) {
                if (!rowDate.Disabled && rowDate.id === currentItem?.id) {
                    setCurrentItem(undefined)
                }
                item = {
                    ...rowDate,
                    Disabled: !rowDate.Disabled,
                    Forbidden: !rowDate.Disabled
                }
            }
            return item
        })
        setData(newData)
    })

    const onOpenAddOrEdit = useMemoizedFn((rowDate?: DataProps) => {
        setModalStatus(true)
        setIsEdit(true)
        setCurrentItem(rowDate)
    })

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "Execution Order",
                dataKey: "Index",
                fixed: "left",
                width: 130,
                render: (text: any, record: any, index: any) => <>{index + 1}</>
            },
            {
                title: "Host",
                dataKey: "Host",
                width: 150
            },
            {
                title: "Username",
                dataKey: "AuthUsername",
                width: 150
            },
            {
                title: "Password",
                dataKey: "AuthPassword",
                width: 150,
                render: () => <>***</>
            },
            {
                title: "Authentication Type",
                dataKey: "AuthType"
                // minWidth: 120
            },
            {
                title: "Action",
                dataKey: "action",
                fixed: "right",
                width: 128,
                render: (_, record) => {
                    return (
                        <div className={styles["table-action-icon"]}>
                            <TrashIcon
                                className={styles["icon-trash"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove(record)
                                }}
                            />
                            <PencilAltIcon
                                className={classNames(styles["action-icon"], {
                                    [styles["action-icon-edit-disabled"]]: record.Disabled
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onOpenAddOrEdit(record)
                                }}
                            />
                            <BanIcon
                                className={classNames(styles["action-icon"], {
                                    [styles["action-icon-ban-disabled"]]: record.Disabled
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onBan(record)
                                }}
                            />
                        </div>
                    )
                }
            }
        ]
    }, [])

    const onMoveRow = useMemoizedFn((dragIndex: number, hoverIndex: number) => {
        setData((prevRules) =>
            update(prevRules, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevRules[dragIndex]]
                ]
            })
        )
    })

    const onMoveRowEnd = useMemoizedFn(() => {
        // setData((prevRules) => {
        //     const newRules = prevRules.map((item, index) => ({...item, Index: index + 1}))
        //     return [...newRules]
        // })
    })

    const onSubmit = useMemoizedFn((v: DataProps) => {
        if (isEdit) {
            const newData = data.map((item) => {
                if (item.id === v.id) {
                    return v
                }
                return item
            })
            setData(newData)
            success("Edit Success")
        } else {
            success("Add Success")
            setData([v, ...data])
        }
        setModalStatus(false)
        setIsEdit(false)
    })
    return (
        <>
            <YakitDrawer
                // placement='right'
                width='50%'
                closable={false}
                onClose={() => onClose()}
                visible={visible}
                getContainer={getContainer}
                // mask={false}
                maskClosable={false}
                // style={{height: visible ? heightDrawer : 0}}
                className={classNames(styles["ntlm-config-drawer"])}
                contentWrapperStyle={{boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
                title={
                    <div className={styles["heard-title"]}>
                        <div className={styles["title"]}>HTTP Authentication Global Config</div>
                        <div className={styles["table-total"]}>
                            Total <span>{params.AuthInfos.length}</span> Authentication Rule
                        </div>
                    </div>
                }
                extra={
                    <div className={styles["heard-right-operation"]}>
                        <YakitButton
                            type='primary'
                            className={styles["button-create"]}
                            onClick={() => onCreateAuthInfo()}
                        >
                            New Addition
                        </YakitButton>
                        <YakitButton type='primary' className={styles["button-save"]} onClick={() => onOk()}>
                            Save
                        </YakitButton>
                        <div onClick={() => onClose()} className={styles["icon-remove"]}>
                            <RemoveIcon />
                        </div>
                    </div>
                }
            >
                <div className={styles["ntlm-config-table"]}>
                    <TableVirtualResize
                        isRefresh={isRefresh}
                        titleHeight={42}
                        isShowTitle={false}
                        renderKey='id'
                        data={data}
                        // rowSelection={{
                        //     isAll: isAllSelect,
                        //     type: "checkbox",
                        //     selectedRowKeys,
                        //     onSelectAll: onSelectAll,
                        //     onChangeCheckboxSingle: onSelectChange
                        // }}
                        pagination={{
                            total: data.length,
                            limit: 20,
                            page: 1,
                            onChange: () => {}
                        }}
                        loading={loading}
                        columns={columns}
                        currentSelectItem={currentItem}
                        onRowClick={onRowClick}
                        onMoveRow={onMoveRow}
                        enableDragSort={true}
                        enableDrag={true}
                        onMoveRowEnd={onMoveRowEnd}
                    />
                </div>
            </YakitDrawer>
            {modalStatus && (
                <NTMLConfigModal
                    modalStatus={modalStatus}
                    onSubmit={onSubmit}
                    onClose={() => {
                        setModalStatus(false)
                        setIsEdit(false)
                    }}
                    isEdit={isEdit}
                    currentItem={currentItem}
                />
            )}
        </>
    )
}

interface NTMLConfigModalProps {
    onClose: () => void
    modalStatus: boolean
    onSubmit: (v: DataProps) => void
    isEdit: boolean
    currentItem?: DataProps
}

export const NTMLConfigModal: React.FC<NTMLConfigModalProps> = (props) => {
    const {onClose, modalStatus, onSubmit, isEdit, currentItem} = props
    const [form] = Form.useForm()

    useEffect(() => {
        if (isEdit && currentItem) {
            const {Host, AuthUsername, AuthPassword, AuthType} = currentItem
            form.setFieldsValue({
                Host,
                AuthUsername,
                AuthPassword,
                AuthType
            })
        }
    }, [])

    const onOk = useMemoizedFn(() => {
        form.validateFields().then((value: AuthInfo) => {
            if (isEdit && currentItem) {
                onSubmit({
                    ...currentItem,
                    ...value
                })
            } else {
                onSubmit({
                    id: uuidv4(),
                    Disabled: false,
                    ...value
                })
            }
        })
    })
    // Check if IP or Domain
    const judgeUrl = () => [
        {
            validator: (_, value: string) => {
                // Regex Match IPv4 Address
                const ipv4RegexWithPort =
                    /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}(:\d+)?$/
                // Regex Match Domain (Wildcard Support)）
                const domainRegex = /^(\*\.|\*\*\.)?([a-zA-Z0-9-]+\.){1,}[a-zA-Z]{2,}$/
                // Match CIDR IPv4 Address Range (Includes Port)）
                const cidrRegexWithPort =
                    /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}\/([0-2]?[0-9]|3[0-2])(:\d+)?$/
                if (ipv4RegexWithPort.test(value) || domainRegex.test(value) || cidrRegexWithPort.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("Enter Valid Host")
                }
            }
        }
    ]
    return (
        <YakitModal
            maskClosable={false}
            title={isEdit ? "Edit" : "New Addition"}
            visible={modalStatus}
            onCancel={() => onClose()}
            closable
            okType='primary'
            width={480}
            onOk={() => onOk()}
            bodyStyle={{padding: "24px 16px"}}
        >
            <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 16}} className={styles["modal-from"]}>
                <Form.Item label='Host' name='Host' rules={[{required: true, message: "Required Field"}, ...judgeUrl()]}>
                    <YakitInput placeholder='Enter...' />
                </Form.Item>
                <Form.Item label='Username' name='AuthUsername' rules={[{required: true, message: "Required Field"}]}>
                    <YakitInput placeholder='Enter...' />
                </Form.Item>
                <Form.Item label='Password' name='AuthPassword' rules={[{required: true, message: "Required Field"}]}>
                    <YakitInput placeholder='Enter...' />
                </Form.Item>
                <Form.Item label='Authentication Type' name='AuthType' rules={[{required: true, message: "Required Field"}]}>
                    <YakitSelect placeholder='Please Select...'>
                        <YakitSelect value='ntlm'>ntlm</YakitSelect>
                        <YakitSelect value='any'>any</YakitSelect>
                        <YakitSelect value='basic'>basic</YakitSelect>
                        <YakitSelect value='digest'>digest</YakitSelect>
                    </YakitSelect>
                </Form.Item>
            </Form>
        </YakitModal>
    )
}

interface SortDataProps {
    label: string
    value: string
}
interface AISortContentProps {
    onUpdate:(v:string[])=>void
    AiApiPriority: string[]
}

const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // Match Two Parameters in translate Function Using Regex
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            // Extract and Convert Two Matched Values to Numbers
            const [value1, value2] = match.slice(1).map(Number)
                const modifiedString = transform.replace(
                    /translate\((-?\d+)px, (-?\d+)px\)/,
                    `translate(0px, ${value2}px)`
                )
                transform = modifiedString
        }
    }

    return {
        ...draggableStyle,
        transform
    }
}

const defaultAiApiPriority:SortDataProps[] = [{label: "OpenAI", value: "openai"},
{label: "Chatglm", value: "chatglm"},
{label: "Moonshot", value: "moonshot"}]

export const AISortContent: React.FC<AISortContentProps> = (props) => {
    const {onUpdate,AiApiPriority} = props
    const [sortData, setSortData] = useState<SortDataProps[]>([]);

    useEffect(()=>{
        if(AiApiPriority.length>0){
            const sortedData = defaultAiApiPriority.sort((a, b) => {
                return AiApiPriority.indexOf(a.value) - AiApiPriority.indexOf(b.value);
            });
            setSortData(sortedData)
        }
        else{
            setSortData(defaultAiApiPriority)
        }
    },[AiApiPriority])

    const onDragEnd = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId} = result
        if(destination){
            const newItems: SortDataProps[] = JSON.parse(JSON.stringify(sortData))
            const [removed] = newItems.splice(source.index, 1)
            newItems.splice(destination.index, 0, removed)
            setSortData([...newItems])  
            onUpdate(newItems.map((item)=>item.value))
        }
    })

    return(<div className={styles['ai-sort-content']}>
        <div>Priority from Top to Bottom</div>
        <div className={styles['menu-list']}>
            <DragDropContext
            onDragEnd={onDragEnd}
        >
        <Droppable droppableId='droppable-payload' direction='vertical' 
        // renderClone={(provided, snapshot, rubric) => {
        //     const item: SortDataProps[] = sortData.filter(
        //                 (item) => item.value === rubric.draggableId
        //             ) || []
        //     return <div ref={provided.innerRef}
        //     {...provided.draggableProps}
        //     {...provided.dragHandleProps}
        //     style={{
        //         ...getItemStyle(snapshot.isDragging, provided.draggableProps.style)
        //     }}>{item.length>0&&<div className={styles['sort-active-item']} key={item[0].value}>{item[0].label}</div>}</div>
        // }}
        >
        {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
            {sortData.map((item, index) => {
                return (
                        <Draggable
                        key={item.value}
                        draggableId={item.value}
                        index={index}
                    >
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                    ...getItemStyle(snapshot.isDragging, provided.draggableProps.style)
                                }}
                            >
                                <div
                                    className={classNames(styles["menu-list-item"], {
                                        [styles["menu-list-item-drag"]]: snapshot.isDragging
                                    })}
                                >
                                    <div
                                        className={styles["menu-list-item-info"]}
                                    >
                                        <DragSortIcon
                                            className={styles["drag-sort-icon"]}
                                        />
                                        <div className={styles["title"]}>
                                            {item.label}
                                        </div>
                                    </div>
                                </div>
                                
                                
                                
                                {/* <div className={styles['sort-item-box']}>
                                <div className={classNames(styles["sort-item"]) } key={item.value}>{item.label}</div>
                                </div> */}
                            </div>
                        )}
                    </Draggable>
                )
            })}
            {provided.placeholder}
        </div>
        )}
    </Droppable>
    </DragDropContext>
        </div>
    </div>)
}