import React, {useEffect, useRef, useState} from "react"
import {PortScanExecuteExtraFormValue} from "./NewPortScanType"
import {Checkbox, Form, FormInstance, Tooltip} from "antd"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import styles from "./NewPortScanExtraParamsDrawer.module.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {ScanKind, ScanKindKeys, defaultPorts} from "@/pages/portscan/PortScanPage"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {GlobalNetworkConfig, defaultParams} from "@/components/configNetwork/ConfigNetworkPage"
import {PcapMetadata} from "@/models/Traffic"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {defPortScanExecuteExtraFormValue} from "./NewPortScan"
import {yakitInfo} from "@/utils/notification"
import {apiGetGlobalNetworkConfig, apiGetPcapMetadata, apiSetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import cloneDeep from "lodash/cloneDeep"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {PresetPorts} from "@/pages/portscan/schema"
import {isEnpriTraceAgent} from "@/utils/envfile"

const {YakitPanel} = YakitCollapse

interface NewPortScanExtraParamsDrawerProps {
    extraParamsValue: PortScanExecuteExtraFormValue
    visible: boolean
    onSave: (v: PortScanExecuteExtraFormValue) => void
}
/**Other Configuration */
const defaultOtherSetting = {
    SaveToDB: defPortScanExecuteExtraFormValue.SaveToDB,
    SaveClosedPorts: defPortScanExecuteExtraFormValue.SaveClosedPorts,
    EnableCClassScan: defPortScanExecuteExtraFormValue.EnableCClassScan,
    SkippedHostAliveScan: defPortScanExecuteExtraFormValue.SkippedHostAliveScan,
    HostAliveConcurrent: defPortScanExecuteExtraFormValue.HostAliveConcurrent,
    ExcludeHosts: defPortScanExecuteExtraFormValue.ExcludeHosts,
    ExcludePorts: defPortScanExecuteExtraFormValue.ExcludePorts
}
/**Crawler settings */
const defaultReptileSetting = {
    EnableBasicCrawler: defPortScanExecuteExtraFormValue.EnableBasicCrawler,
    BasicCrawlerRequestMax: defPortScanExecuteExtraFormValue.BasicCrawlerRequestMax,
    BasicCrawlerEnableJSParser: defPortScanExecuteExtraFormValue.BasicCrawlerEnableJSParser
}
/**Fingerprint scan config */
const defaultFingerprintSetting = {
    Concurrent: defPortScanExecuteExtraFormValue.Concurrent,
    Active: defPortScanExecuteExtraFormValue.Active,
    ProbeMax: defPortScanExecuteExtraFormValue.ProbeMax,
    ProbeTimeout: defPortScanExecuteExtraFormValue.ProbeTimeout,
    Proxy: defPortScanExecuteExtraFormValue.Proxy,
    FingerprintMode: defPortScanExecuteExtraFormValue.FingerprintMode
}
/** SYN config */
const defaultSYNSetting = {
    SynConcurrent: defPortScanExecuteExtraFormValue.SynConcurrent
}
/** Network card config */
const defaultNetworkCard = {
    SynScanNetInterface: defPortScanExecuteExtraFormValue.SynScanNetInterface
}
const defaultExtraParamsFormValue = {
    "Network card config": defaultNetworkCard,
    "SYN config": defaultSYNSetting,
    "Fingerprint scan config": defaultFingerprintSetting,
    "Basic crawler config": defaultReptileSetting,
    "Other config": defaultOtherSetting
}
const NewPortScanExtraParamsDrawer: React.FC<NewPortScanExtraParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props
    const [form] = Form.useForm()
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["port-scan-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='65%'
            title='Extra parameters'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <NewPortScanExtraParams form={form} visible={visible} />
                <div className={styles["to-end"]}>End of Content～</div>
            </Form>
        </YakitDrawer>
    )
})
export default NewPortScanExtraParamsDrawer

interface NewPortScanExtraParamsProps {
    form: FormInstance<PortScanExecuteExtraFormValue>
    visible: boolean
}
const NewPortScanExtraParams: React.FC<NewPortScanExtraParamsProps> = React.memo((props) => {
    const {form, visible} = props

    const [activeKey, setActiveKey] = useState<string[]>([
        "Network card config",
        "SYN config",
        "Fingerprint scan config",
        "Basic crawler config",
        "Other Configuration"
    ])

    const mode = Form.useWatch("Mode", form)

    const protoList = useCreation(() => {
        return [
            {label: "TCP", value: "tcp"},
            {label: "UDP", value: "udp", disabled: mode === "syn" || mode === "all"}
        ]
    }, [mode])
    const onReset = useMemoizedFn((key) => {
        const value = defaultExtraParamsFormValue[key]
        form.setFieldsValue({
            ...value
        })
    })
    /**mode syn config */
    const synCollapseNode = useMemoizedFn(() => {
        return (
            <>
                <NetworkCardSettingsPanel key='Network card config' visible={visible} />
                <YakitPanel
                    header='SYN config'
                    key='SYN config'
                    extra={
                        <YakitButton
                            type='text'
                            colors='danger'
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onReset("SYN config")
                            }}
                        >
                            Reset
                        </YakitButton>
                    }
                >
                    <Form.Item
                        label='SYN concurrency'
                        name='SynConcurrent'
                        extra={"SYN packets per second, SYN concurrency"}
                        style={{marginBottom: 0}}
                    >
                        <YakitInputNumber type='horizontal' min={0} />
                    </Form.Item>
                </YakitPanel>
            </>
        )
    })
    const renderContent = useMemoizedFn(() => {
        switch (mode) {
            // SYN
            case "syn":
                return (
                    <>
                        {synCollapseNode()}
                        <ScanOtherSettingsPanel key='Other Configuration' />
                    </>
                )
            //Fingerprint
            case "fingerprint":
                return (
                    <>
                        <FingerprintSettingsPanel key='Fingerprint scan config' />
                        <BasicCrawlerSettingsPanel key='Basic crawler config' />
                        <ScanOtherSettingsPanel key='Other Configuration' />
                    </>
                )
            // All SYN+fingerprint
            default:
                return (
                    <>
                        {synCollapseNode()}
                        <FingerprintSettingsPanel key='Fingerprint scan config' />
                        <BasicCrawlerSettingsPanel key='Basic crawler config' />
                        <ScanOtherSettingsPanel key='Other Configuration' />
                    </>
                )
        }
    })
    return (
        <div className={styles["port-scan-params-wrapper"]}>
            <Form.Item label='Scan mode' name='Mode' initialValue='fingerprint' extra='SYN scan requires root to start yak'>
                <YakitRadioButtons
                    buttonStyle='solid'
                    options={ScanKindKeys.map((item) => ({
                        value: item,
                        label: ScanKind[item]
                    }))}
                />
            </Form.Item>
            <Form.Item label='Scan protocol' name='scanProtocol' initialValue='tcp'>
                <YakitRadioButtons buttonStyle='solid' options={protoList} />
            </Form.Item>
            <YakitCollapse
                destroyInactivePanel={false}
                defaultActiveKey={activeKey}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={false}
            >
                {renderContent()}
            </YakitCollapse>
        </div>
    )
})

interface NetworkCardSettingsPanelProps {
    visible: boolean
    key: string
}
/**Network card config */
export const NetworkCardSettingsPanel: React.FC<NetworkCardSettingsPanelProps> = React.memo((props) => {
    const {visible, key, ...restProps} = props
    const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // Proxy Delegate

    const globalNetworkConfig = useRef<GlobalNetworkConfig | undefined>(cloneDeep(defaultParams))
    const form = Form.useFormInstance()
    useEffect(() => {
        if (!visible) return
        apiGetGlobalNetworkConfig()
            .then((rsp: GlobalNetworkConfig) => {
                globalNetworkConfig.current = rsp
                apiGetPcapMetadata().then((data: PcapMetadata) => {
                    if (!data || data.AvailablePcapDevices.length === 0) {
                        return
                    }
                    const interfaceList = data.AvailablePcapDevices.map((item) => ({
                        label: `${item.NetInterfaceName}-(${item.IP})`,
                        value: item.Name
                    }))
                    setNetInterfaceList(interfaceList)
                })
            })
            .catch(() => {
                globalNetworkConfig.current = undefined
            })
    }, [visible])
    const updateGlobalNetworkConfig = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!globalNetworkConfig.current) return
        const synScanNetInterface = form.getFieldValue("SynScanNetInterface")
        const params: GlobalNetworkConfig = {
            ...globalNetworkConfig.current,
            SynScanNetInterface: synScanNetInterface
        }
        apiSetGlobalNetworkConfig(params).then(() => {
            yakitInfo("Configuration Update Success")
        })
    })
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["Network card config"]
        form.setFieldsValue({
            ...value
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // For correct Panel rendering/Toggle, no other function
                header='Network card config'
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        Reset
                    </YakitButton>
                }
                className={styles["form-Panel"]}
            >
                <Form.Item
                    label='NIC selection'
                    extra={
                        !isEnpriTraceAgent() && (
                            <YakitButton type='text' style={{paddingLeft: 0}} onClick={updateGlobalNetworkConfig}>
                                Sync to global config
                            </YakitButton>
                        )
                    }
                    name='SynScanNetInterface'
                    style={{marginBottom: 0}}
                >
                    <YakitSelect allowClear placeholder='Please Select...' options={netInterfaceList} />
                </Form.Item>
            </YakitPanel>
        </>
    )
})

interface FingerprintSettingsPanelProps {
    isSimpleDetect?: boolean
    key: string
}
/**Fingerprint scan config */
export const FingerprintSettingsPanel: React.FC<FingerprintSettingsPanelProps> = React.memo((props) => {
    const {key, isSimpleDetect, ...restProps} = props
    const form = Form.useFormInstance()
    /**Select preset ports for Ports value */
    const onCheckPresetPort = useMemoizedFn((checkedValue: CheckboxValueType[]) => {
        let res: string = (checkedValue || [])
            .map((i) => {
                return PresetPorts[i as string] || ""
            })
            .join(",")
        if (checkedValue.includes("all")) {
            res = PresetPorts["all"] || ""
        }

        if (!!res) {
            form.setFieldsValue({Ports: res})
        }
    })
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["Fingerprint scan config"]
        if (isSimpleDetect) {
            form.setFieldsValue({
                ...value,
                Ports: PresetPorts["fast"],
                presetPort: ["fast"]
            })
        } else {
            form.setFieldsValue({
                ...value
            })
        }
    })
    const onResetPort = useMemoizedFn(() => {
        form.setFieldsValue({Ports: PresetPorts["fast"], presetPort: ["fast"]})
    })
    return (
        <>
            <YakitPanel
                {...restProps} // For correct Panel rendering/Toggle, no other function
                header='Fingerprint scan config'
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        Reset
                    </YakitButton>
                }
            >
                {isSimpleDetect && (
                    <>
                        <Form.Item label='Preset ports' name='presetPort'>
                            <Checkbox.Group
                                className={styles["preset-port-group-wrapper"]}
                                onChange={onCheckPresetPort}
                            >
                                <YakitCheckbox value={"fast"}>Fast default ports</YakitCheckbox>
                                <YakitCheckbox value={"middle"}>Moderate default ports</YakitCheckbox>
                                <YakitCheckbox value={"slow"}>Slow default ports</YakitCheckbox>
                                <YakitCheckbox value={"top100"}>Common 100 ports</YakitCheckbox>
                                <YakitCheckbox value={"topweb"}>Common Web ports</YakitCheckbox>
                                <YakitCheckbox value={"top1000+"}>Common one or two thousand</YakitCheckbox>
                                <YakitCheckbox value={"topdb"}>Common databases & MQ</YakitCheckbox>
                                <YakitCheckbox value={"topudp"}>Common UDP ports</YakitCheckbox>
                                <YakitCheckbox value={"defect"}>Common weak password ports</YakitCheckbox>
                                <YakitCheckbox value={"all"}>All ports</YakitCheckbox>
                            </Checkbox.Group>
                        </Form.Item>
                        <Form.Item
                            label='Scan ports'
                            name='Ports'
                            extra={
                                <div className={styles["ports-form-extra"]}>
                                    <Tooltip title={"Reset to default scan ports"}>
                                        <YakitButton type='text' icon={<OutlineRefreshIcon />} onClick={onResetPort}>
                                            Default config
                                        </YakitButton>
                                    </Tooltip>
                                </div>
                            }
                            rules={[{required: true, message: "Enter scan ports"}]}
                            initialValue={defaultPorts}
                        >
                            <YakitInput.TextArea rows={3} />
                        </Form.Item>
                    </>
                )}
                <Form.Item label='Fingerprint scan concurrency' name='Concurrent'>
                    <YakitInputNumber type='horizontal' min={0} />
                </Form.Item>
                <Form.Item label='Active mode' name='Active' valuePropName='checked' extra='Allow active fingerprint probing'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item
                    label='Service fingerprint level'
                    name='ProbeMax'
                    extra='Higher level, more detail, longer time'
                >
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={[
                            {value: 1, label: "Basic"},
                            {value: 3, label: "Moderate"},
                            {value: 7, label: "Detailed"},
                            {value: 100, label: "Compat. Pre-version: Fixes Iteration over Missing 'end load_content'"}
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    label='Active packet timeout'
                    name='ProbeTimeout'
                    extra='Active probing needed for some fingerprint detections'
                >
                    <YakitInputNumber type='horizontal' min={0} />
                </Form.Item>
                <Form.Item
                    label='TCP proxy'
                    name='Proxy'
                    extra='Supports HTTP/Sock4/Sock4a/Socks5 protocol, e.g., http://127.0.0.1:7890  socks5://127.0.0.1:7890'
                >
                    <YakitSelect
                        allowClear
                        placeholder='Please Select...'
                        options={[
                            "http://127.0.0.1:7890",
                            "http://127.0.0.1:8082",
                            "socks5://127.0.0.1:8082",
                            "http://127.0.0.1:8083"
                        ].map((i) => {
                            return {value: i, label: i}
                        })}
                        mode='tags'
                    />
                </Form.Item>
                <Form.Item label='Advanced fingerprint options' name='FingerprintMode'>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={[
                            {value: "web", label: "Web fingerprint only"},
                            {value: "service", label: "Service fingerprint"},
                            {value: "all", label: "All fingerprints"}
                        ]}
                    />
                </Form.Item>
            </YakitPanel>
        </>
    )
})

interface BasicCrawlerSettingsPanelProps {
    key: string
}
/** Basic crawler config */
export const BasicCrawlerSettingsPanel: React.FC<BasicCrawlerSettingsPanelProps> = React.memo((props) => {
    const {key, ...restProps} = props
    const form = Form.useFormInstance()
    const enableBasicCrawler = Form.useWatch("EnableBasicCrawler", form)
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["Basic crawler config"]
        form.setFieldsValue({
            ...value
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // For correct Panel rendering/Toggle, no other function
                header='Basic crawler config'
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        Reset
                    </YakitButton>
                }
            >
                <Form.Item
                    label='Crawler settings'
                    extra={"Basic crawler after HTTP(s) discovery"}
                >
                    <div className={styles["form-no-style-wrapper"]}>
                        <Form.Item noStyle name='EnableBasicCrawler' valuePropName='checked'>
                            <YakitCheckbox />
                        </Form.Item>
                        <Form.Item noStyle name='BasicCrawlerRequestMax'>
                            <YakitInputNumber min={0} addonBefore='Crawler request count' />
                        </Form.Item>
                    </div>
                </Form.Item>
                {enableBasicCrawler && (
                    <Form.Item
                        label='JS SSA parsing'
                        name='BasicCrawlerEnableJSParser'
                        valuePropName='checked'
                        extra={"JS SSA parsing with crawler. High resource use, suggest off if not needed"}
                    >
                        <YakitSwitch />
                    </Form.Item>
                )}
            </YakitPanel>
        </>
    )
})

interface ScanOtherSettingsPanelProps {
    key: string
}
export const ScanOtherSettingsPanel: React.FC<ScanOtherSettingsPanelProps> = React.memo((props) => {
    const {key, ...restProps} = props
    const form = Form.useFormInstance()
    const skippedHostAliveScan = Form.useWatch("SkippedHostAliveScan", form)
    const saveToDB = Form.useWatch("SaveToDB", form)
    const onReset = useMemoizedFn(() => {
        const value = defaultExtraParamsFormValue["Other Configuration"]
        form.setFieldsValue({
            ...value
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // For correct Panel rendering/Toggle, no other function
                header='Other Configuration'
                key={key}
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset()
                        }}
                    >
                        Reset
                    </YakitButton>
                }
            >
                <Form.Item label='Scan results to database' name='SaveToDB' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                {saveToDB && (
                    <>
                        <Form.Item label='Save closed ports' name='SaveClosedPorts' valuePropName='checked'>
                            <YakitSwitch />
                        </Form.Item>
                    </>
                )}

                <Form.Item
                    label='Auto scan related C segments'
                    name='EnableCClassScan'
                    valuePropName='checked'
                    extra='Convert domain /Convert IP to C segment for scanning'
                >
                    <YakitSwitch />
                </Form.Item>
                <Form.Item
                    label='Skip host alive check'
                    name='SkippedHostAliveScan'
                    valuePropName='checked'
                    extra='Host alive detection, ICMP for current user/TCP Ping to check host alive'
                >
                    <YakitSwitch />
                </Form.Item>
                {!skippedHostAliveScan && (
                    <>
                        <Form.Item label='Alive check concurrency' name='HostAliveConcurrent'>
                            <YakitInputNumber type='horizontal' min={0} />
                        </Form.Item>
                        <Form.Item
                            label='TCP Ping ports'
                            name='HostAlivePorts'
                            extra='Configure TCP Ping ports'
                        >
                            <YakitInput placeholder='Enter...' />
                        </Form.Item>
                    </>
                )}

                <Form.Item label='Exclude hosts' name='ExcludeHosts'>
                    <YakitInput placeholder='Enter...' />
                </Form.Item>
                <Form.Item label='Exclude ports' name='ExcludePorts'>
                    <YakitInput placeholder='Enter...' />
                </Form.Item>
            </YakitPanel>
        </>
    )
})
