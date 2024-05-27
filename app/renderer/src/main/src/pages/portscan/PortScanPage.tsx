import React, {useEffect, useRef, useState} from "react"
import {Checkbox, Divider, Form, Input, InputNumber, Space, Tooltip} from "antd"
import {InputInteger, InputItem, ManyMultiSelectForString, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {failed, yakitInfo} from "../../utils/notification"
import {PresetPorts} from "./schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {ContentUploadInput} from "../../components/functionTemplate/ContentUploadTextArea"
import {DeleteOutlined, PaperClipOutlined, ReloadOutlined} from "@ant-design/icons"

import "./PortScanPage.css"
import {StartBruteParams} from "../brute/BrutePage"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {PcapMetadata} from "@/models/Traffic"
import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {HybridScanPluginConfig} from "@/models/HybridScan"

const {ipcRenderer} = window.require("electron")
export const ScanPortTemplate = "scan-port-template"

export interface PortScanPageProp {
    sendTarget?: string
}

export interface PortScanParams {
    Targets: string
    Ports: string
    Mode: "syn" | "fingerprint" | "all"
    Proto: ("tcp" | "udp")[]
    Concurrent: number
    SynConcurrent: number
    Active: boolean
    FingerprintMode: "service" | "web" | "all"
    SaveToDB: boolean
    SaveClosedPorts: boolean
    TargetsFile?: string
    ScriptNames: string[]
    Proxy: string[]
    ProbeTimeout: number
    ProbeMax: number
    EnableCClassScan: boolean

    SkippedHostAliveScan?: boolean
    HostAlivePorts?: string

    ExcludeHosts?: string
    ExcludePorts?: string
    EnableBasicCrawler?: boolean
    EnableBrute?: boolean
    BasicCrawlerRequestMax?: number

    SynScanNetInterface?: string
    HostAliveConcurrent?: number
    /**Plugin Condition Config */
    LinkPluginConfig?: HybridScanPluginConfig
    /**Crawler JS Parsing Enabled? */
    BasicCrawlerEnableJSParser?: boolean
    TaskName?:string
}

export const ScanKind: {[key: string]: string} = {
    syn: "SYN",
    fingerprint: "Parse content in plugin backend stream",
    all: "SYN+Fingerprint"
}
export const ScanKindKeys: string[] = Object.keys(ScanKind)

export const defaultPorts =
    "21,22,443,445,80,8000-8004,3306,3389,5432,6379,8080-8084,7000-7005,9000-9002,8443,7443,9443,7080,8070"

interface ScanPortFormProp {
    defaultParams: PortScanParams
    setParams: (p: PortScanParams) => any
    // Network Adapter Modified?
    isSetInterface?: boolean
    setInterface?: (v: boolean) => void
    // Basic Enterprise Display
    isSimpleDetectShow?: boolean
    // Basic Scan Speed
    deepLevel?: number
    // Basic Speed Modified?
    isSetPort?: boolean
    // Basic BruteParams Change
    bruteParams?: StartBruteParams
    setBruteParams?: (v: StartBruteParams) => void
}

export const ScanPortForm: React.FC<ScanPortFormProp> = (props) => {
    const {deepLevel, isSetPort, bruteParams, setBruteParams, setInterface, isSetInterface} = props
    const isSimpleDetectShow = props.isSimpleDetectShow || false
    const [params, setParams] = useState<PortScanParams>(props.defaultParams)
    const [simpleParams, setSimpleParams] = useState<StartBruteParams | undefined>(bruteParams)
    const [_, setPortroupValue, getPortroupValue] = useGetState<any[]>([])
    const [usernamesValue, setUsernamesValue] = useState<string>()
    const [passwordsValue, setPasswordsValue] = useState<string>()
    useEffect(() => {
        if (!params) return
        props.setParams({...params})
    }, [params])

    useEffect(() => {
        if (!simpleParams) return
        let bruteParams = {
            ...simpleParams,
            Usernames: usernamesValue ? usernamesValue.split(/\n|,/) : [],
            Passwords: passwordsValue ? passwordsValue.split(/\n|,/) : []
        }

        setBruteParams && setBruteParams({...bruteParams})
    }, [simpleParams, usernamesValue, passwordsValue])

    useEffect(() => {
        if (deepLevel && isSetPort) {
            switch (deepLevel) {
                case 3:
                    setPortroupValue(["fast"])
                    break
                case 2:
                    setPortroupValue(["middle"])
                    break
                case 1:
                    setPortroupValue(["slow"])
                    break
            }
        }
    }, [deepLevel])

    const typeArr: string[] = [
        "text/plain",
        ".csv",
        ".xls",
        ".xlsx",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]

    const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // Proxy Delegate
    const globalNetworkConfig = useRef<GlobalNetworkConfig>()
    useEffect(() => {
        ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((rsp: GlobalNetworkConfig) => {
            console.log("GetGlobalNetworkConfig", rsp)
            globalNetworkConfig.current = rsp
            const {SynScanNetInterface} = rsp
            console.log("SynScanNetInterface", SynScanNetInterface)
            ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
                if (!data || data.AvailablePcapDevices.length === 0) {
                    return
                }
                const interfaceList = data.AvailablePcapDevices.map((item) => ({
                    label: `${item.NetInterfaceName}-(${item.IP})`,
                    value: item.Name
                }))
                if (SynScanNetInterface.length === 0 && !isSetInterface) {
                    setParams({...params, SynScanNetInterface: data.DefaultPublicNetInterface.NetInterfaceName})
                }
                setNetInterfaceList(interfaceList)
                if (SynScanNetInterface.length !== 0 && !isSetInterface) {
                    setParams({...params, SynScanNetInterface})
                }
            })
        })
    }, [])

    const updateGlobalNetworkConfig = useMemoizedFn(() => {
        ipcRenderer
            .invoke("SetGlobalNetworkConfig", {
                ...globalNetworkConfig.current,
                SynScanNetInterface: params.SynScanNetInterface
            })
            .then(() => {
                yakitInfo("Config Update Success")
            })
    })

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
        >
            {!isSimpleDetectShow && (
                <>
                    <SelectOne
                        label={"Scan Mode"}
                        data={ScanKindKeys.map((item) => {
                            return {value: item, text: ScanKind[item]}
                        })}
                        help={"Root Required for SYN Scan"}
                        setValue={(Mode) => setParams({...params, Mode})}
                        value={params.Mode}
                    />
                    <SelectOne
                        label={"Scan Protocol"}
                        data={[
                            {text: "TCP", value: "tcp"},
                            {text: "UDP", value: "udp", disabled: params.Mode === "syn" || params.Mode === "all"}
                        ]}
                        setValue={(i) => setParams({...params, Proto: [i]})}
                        value={(params.Proto || []).length > 0 ? params.Proto[0] : "tcp"}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>Network Adapter Config</Divider>
                    <Form.Item label={<span>Network Adapter Choice</span>}>
                        <YakitSelect
                            showSearch
                            options={netInterfaceList}
                            placeholder='Please Select...'
                            size='small'
                            value={params.SynScanNetInterface}
                            onChange={(netInterface) => {
                                setInterface && setInterface(true)
                                setParams({...params, SynScanNetInterface: netInterface})
                            }}
                            maxTagCount={100}
                        />
                        <YakitButton onClick={updateGlobalNetworkConfig} size='small'>
                            Sync with Global Network Config
                        </YakitButton>
                    </Form.Item>
                </>
            )}
            {!isSimpleDetectShow && (params.Mode === "all" || params.Mode === "syn") && (
                <>
                    <Divider orientation={"left"}>SYN Config</Divider>
                    <InputInteger
                        label={"SYN Concurrent"}
                        help={"SYN Packets per Second as SYN Concurrency"}
                        value={params.SynConcurrent}
                        min={10}
                        setValue={(e) => setParams({...params, SynConcurrent: e})}
                    />
                </>
            )}
            {(params.Mode === "all" || params.Mode === "fingerprint") && (
                <>
                    <Divider orientation={"left"}>Fingerprint Scan Config</Divider>
                    {isSimpleDetectShow && (
                        <>
                            <Form.Item label='Preset Ports' className='form-item-margin'>
                                <Checkbox.Group
                                    value={getPortroupValue()}
                                    onChange={(value) => {
                                        let res: string = (value || [])
                                            .map((i) => {
                                                // @ts-ignore
                                                return PresetPorts[i] || ""
                                            })
                                            .join(",")
                                        if (value.includes("all")) {
                                            res = PresetPorts["all"] || ""
                                        }
                                        if (!!res) {
                                            setParams({...params, Ports: res})
                                        }
                                        setPortroupValue(value)
                                    }}
                                >
                                    <Checkbox value={"fast"}>Quick Default Ports</Checkbox>
                                    <Checkbox value={"middle"}>Medium Default Ports</Checkbox>
                                    <Checkbox value={"slow"}>Slow Default Ports</Checkbox>
                                    <Checkbox value={"top100"}>Top 100 Ports</Checkbox>
                                    <Checkbox value={"topweb"}>Common Web Ports</Checkbox>
                                    <Checkbox value={"top1000+"}>Top 1-2K</Checkbox>
                                    <Checkbox value={"topdb"}>Common DB and MQ</Checkbox>
                                    <Checkbox value={"topudp"}>Common UDP Ports</Checkbox>
                                    <Checkbox value={"defect"}>Common Weak Password Ports</Checkbox>
                                    <Checkbox value={"all"}>All Ports</Checkbox>
                                </Checkbox.Group>
                            </Form.Item>

                            <Form.Item label='Scan Ports' className='form-item-margin' style={{position: "relative"}}>
                                <Input.TextArea
                                    style={{width: "100%"}}
                                    rows={2}
                                    value={params.Ports}
                                    onChange={(e) => setParams({...params, Ports: e.target.value})}
                                />
                                <Space size={"small"} style={{marginLeft: 8, position: "absolute", bottom: 0}}>
                                    <Tooltip title={"Reset Default Scan Ports"}>
                                        <a
                                            href={"#"}
                                            onClick={() => {
                                                setParams({...params, Ports: PresetPorts["top100"]})
                                            }}
                                        >
                                            <ReloadOutlined />
                                        </a>
                                    </Tooltip>
                                </Space>
                            </Form.Item>
                        </>
                    )}
                    <InputInteger
                        label={"Fingerprint Scanning Concurrently"}
                        // help={"Recommend Max 200 Ports Scan simultaneously"}
                        value={params.Concurrent}
                        min={1}
                        // max={200}
                        setValue={(e) => setParams({...params, Concurrent: e})}
                    />
                    <SwitchItem
                        label={"Active Mode"}
                        help={"Allow Active Fingerprint Probing"}
                        setValue={(Active) => setParams({...params, Active})}
                        value={params.Active}
                    />
                    <SelectOne
                        label={"Service Fingerprint Level"}
                        help={"Higher Levels, More Detail and Probing, Longer Times"}
                        data={[
                            {value: 1, text: "Basic"},
                            {value: 3, text: "Medium"},
                            {value: 7, text: "Detailed"},
                            {value: 100, text: "Deselect"}
                        ]}
                        value={params.ProbeMax}
                        setValue={(ProbeMax) => setParams({...params, ProbeMax})}
                    />
                    <InputInteger
                        label={"Active Probing Timeout"}
                        help={"Active Probing for Specific Fingerprint Detection"}
                        value={params.ProbeTimeout}
                        setValue={(ProbeTimeout) => setParams({...params, ProbeTimeout})}
                    />
                    {!isSimpleDetectShow && (
                        <ManyMultiSelectForString
                            label={"TCP Proxy"}
                            help={
                                "Supports HTTP/Sock4/Sock4a/Socks5 Protocol, e.g., http://127.0.0.1:7890  socks5://127.0.0.1:7890"
                            }
                            data={[
                                "http://127.0.0.1:7890",
                                "http://127.0.0.1:8082",
                                "socks5://127.0.0.1:8082",
                                "http://127.0.0.1:8083"
                            ].map((i) => {
                                return {value: i, label: i}
                            })}
                            value={(params.Proxy || []).join(",")}
                            mode={"tags"}
                            setValue={(e) => setParams({...params, Proxy: (e || "").split(",").filter((i) => !!i)})}
                        />
                    )}
                    <SelectOne
                        label={"Advanced Fingerprint Options"}
                        data={[
                            {value: "web", text: "Web Fingerprint Only"},
                            {value: "service", text: "Service Fingerprint"},
                            {value: "all", text: "All Fingerprints"}
                        ]}
                        setValue={(FingerprintMode) => setParams({...params, FingerprintMode})}
                        value={params.FingerprintMode}
                    />
                    {isSimpleDetectShow && simpleParams && setSimpleParams && (
                        <>
                            <Divider orientation={"left"}>Weak Password Config</Divider>
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept: typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(`${f.name}Non-txt/Excel, Upload txt/Excel！`)
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        UsernameFile: f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: {textAlign: "left"},
                                    label: "User Dictionary:"
                                }}
                                textarea={{
                                    isBubbing: true,
                                    setValue: (Usernames) => {
                                        setUsernamesValue(Usernames)
                                    },
                                    value: usernamesValue,
                                    rows: 1,
                                    // placeholder: "Domain/Host/IP/IP Ranges, Comma-separated or Line-split",
                                    disabled: false
                                }}
                                otherHelpNode={
                                    <>
                                        <Checkbox
                                            checked={simpleParams.ReplaceDefaultUsernameDict}
                                            style={{marginLeft: 16}}
                                            onChange={() => {
                                                setSimpleParams({
                                                    ...simpleParams,
                                                    ReplaceDefaultUsernameDict: !simpleParams.ReplaceDefaultUsernameDict
                                                })
                                            }}
                                        >
                                            Use Default User Dict
                                        </Checkbox>
                                        {simpleParams.UsernameFile && (
                                            <div>
                                                <PaperClipOutlined />
                                                <span style={{marginLeft: 6, color: "#198fff"}}>
                                                    {simpleParams.UsernameFile}
                                                </span>
                                                <DeleteOutlined
                                                    onClick={() => {
                                                        setSimpleParams({
                                                            ...simpleParams,
                                                            UsernameFile: undefined
                                                        })
                                                    }}
                                                    className='port-scan-upload-del'
                                                />
                                            </div>
                                        )}
                                    </>
                                }
                            />
                            <ContentUploadInput
                                type='textarea'
                                dragger={{
                                    disabled: false,
                                    accept: typeArr.join(",")
                                }}
                                beforeUpload={(f) => {
                                    if (!typeArr.includes(f.type)) {
                                        failed(`${f.name}Non-txt/Excel, Upload txt/Excel！`)
                                        return false
                                    }
                                    setSimpleParams({
                                        ...simpleParams,
                                        PasswordFile: f.path
                                    })
                                    return false
                                }}
                                item={{
                                    style: {textAlign: "left"},
                                    label: "Password Dictionary:"
                                }}
                                textarea={{
                                    isBubbing: true,
                                    setValue: (item) => {
                                        setPasswordsValue(item)
                                    },
                                    value: passwordsValue,
                                    rows: 1,
                                    // placeholder: "Domain/Host/IP/IP Ranges, Comma-separated or Line-split",
                                    disabled: false
                                }}
                                otherHelpNode={
                                    <>
                                        <Checkbox
                                            checked={simpleParams.ReplaceDefaultPasswordDict}
                                            style={{marginLeft: 16}}
                                            onChange={() => {
                                                setSimpleParams({
                                                    ...simpleParams,
                                                    ReplaceDefaultPasswordDict: !simpleParams.ReplaceDefaultPasswordDict
                                                })
                                            }}
                                        >
                                            Use Default Password Dict
                                        </Checkbox>
                                        {simpleParams.PasswordFile && (
                                            <div>
                                                <PaperClipOutlined />
                                                <span style={{marginLeft: 6, color: "#198fff"}}>
                                                    {simpleParams.PasswordFile}
                                                </span>
                                                <DeleteOutlined
                                                    onClick={() => {
                                                        setSimpleParams({
                                                            ...simpleParams,
                                                            PasswordFile: undefined
                                                        })
                                                    }}
                                                    className='port-scan-upload-del'
                                                />
                                            </div>
                                        )}
                                    </>
                                }
                            />
                            <InputInteger
                                label={"Target Concurrency"}
                                help={"Concurrent n Targets"}
                                value={simpleParams.Concurrent}
                                setValue={(e) => setSimpleParams({...simpleParams, Concurrent: e})}
                            />
                            <InputInteger
                                label={"Concurrent in Target"}
                                help={"Concurrent Tasks per Target"}
                                value={simpleParams.TargetTaskConcurrent}
                                setValue={(e) => setSimpleParams({...simpleParams, TargetTaskConcurrent: e})}
                            />
                            <SwitchItem
                                label={"Auto-Stop"}
                                help={"Stop at First Result"}
                                setValue={(OkToStop) => setSimpleParams({...simpleParams, OkToStop})}
                                value={simpleParams.OkToStop}
                            />
                            <InputInteger
                                label={"Min Delay"}
                                max={simpleParams.DelayMax}
                                min={0}
                                setValue={(DelayMin) => setSimpleParams({...simpleParams, DelayMin})}
                                value={simpleParams.DelayMin}
                            />
                            <InputInteger
                                label={"Max Delay"}
                                setValue={(DelayMax) => setSimpleParams({...simpleParams, DelayMax})}
                                value={simpleParams.DelayMax}
                                min={simpleParams.DelayMin}
                            />
                        </>
                    )}
                    <Divider orientation={"left"}>Basic Crawler Config</Divider>
                    <Form.Item
                        label={"Crawler Settings"}
                        help={"Basic Crawl after HTTP(s) Content Discovery"}
                    >
                        <Space>
                            <Checkbox
                                onChange={(e) => setParams({...params, EnableBasicCrawler: e.target.checked})}
                                checked={params.EnableBasicCrawler}
                            >
                                Enable Crawler
                            </Checkbox>
                            <InputNumber
                                addonBefore={"Crawler Request Count"}
                                value={params.BasicCrawlerRequestMax}
                                onChange={(e) => setParams({...params, BasicCrawlerRequestMax: e as number})}
                            />
                        </Space>
                    </Form.Item>
                </>
            )}

            <Divider orientation={"left"}>Other Configs</Divider>
            <SwitchItem
                label={"Scan Results to Database"}
                setValue={(SaveToDB) => {
                    setParams({...params, SaveToDB, SaveClosedPorts: false})
                }}
                value={params.SaveToDB}
            />
            {params.SaveToDB && (
                <SwitchItem
                    label={"Save Closed Ports"}
                    setValue={(SaveClosedPorts) => setParams({...params, SaveClosedPorts})}
                    value={params.SaveClosedPorts}
                />
            )}
            <SwitchItem
                label={"Auto-Scan Related C-Segments"}
                help={"Domain Names /IP to C-Subnet Targets for Scanning"}
                value={params.EnableCClassScan}
                setValue={(EnableCClassScan) => setParams({...params, EnableCClassScan})}
            />
            <SwitchItem
                label={"Skip Host Alive Check"}
                help={"Host Alive Detection with ICMP based on user rights/TCP Ping Host Check"}
                value={params.SkippedHostAliveScan}
                setValue={(SkippedHostAliveScan) => setParams({...params, SkippedHostAliveScan})}
            />
            {!params.SkippedHostAliveScan && (
                <>
                    <InputInteger
                        label={"Concurrent Alive Detection"}
                        value={params.HostAliveConcurrent}
                        setValue={(HostAliveConcurrent) => setParams({...params, HostAliveConcurrent})}
                    />
                    <InputItem
                        label={"TCP Ping Port"}
                        help={"Configure TCP Ping Ports for Checks"}
                        value={params.HostAlivePorts}
                        setValue={(HostAlivePorts) => setParams({...params, HostAlivePorts})}
                    />
                </>
            )}
            <InputItem
                label={"Exclude Hosts"}
                setValue={(ExcludeHosts) => setParams({...params, ExcludeHosts})}
                value={params.ExcludeHosts}
            />
            <InputItem
                label={"Exclude Ports"}
                setValue={(ExcludePorts) => setParams({...params, ExcludePorts})}
                value={params.ExcludePorts}
            />
        </Form>
    )
}
