import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {ClientCertificate} from "./MITMServerStartForm"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {useMemoizedFn} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {yakitFailed} from "@/utils/notification"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, Modal, Space, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, PlusCircleIcon, RemoveIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {useWatch} from "antd/lib/form/Form"
import { YakitSelect } from "@/components/yakitUI/YakitSelect/YakitSelect"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"
import { inputHTTPFuzzerHostConfigItem } from "@/pages/fuzzer/HTTPFuzzerHosts"
import { YakitRoute } from "@/routes/newRoute"

const MITMAddTLS = React.lazy(() => import("./MITMAddTLS"))
const MITMFiltersModal = React.lazy(() => import("./MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("./MITMCertificateDownloadModal"))

const {ipcRenderer} = window.require("electron")

interface MITMFormAdvancedConfigurationProps {
    ref?: any
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: AdvancedConfigurationFromValue) => void
    enableGMTLS: boolean
}
export interface AdvancedConfigurationFromValue {
    certs: ClientCertificate[]
    preferGMTLS: boolean
    onlyEnableGMTLS: boolean
    enableProxyAuth: boolean
    proxyUsername: string
    proxyPassword: string
    dnsServers: string[]
    etcHosts: any[]
    filterWebsocket: boolean
}
const MITMFormAdvancedConfiguration: React.FC<MITMFormAdvancedConfigurationProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {visible, setVisible, onSave, enableGMTLS} = props
        const [certs, setCerts] = useState<ClientCertificate[]>([])

        // Restore Defaults
        const [certsDef, setCertsDef] = useState<ClientCertificate[]>([]) // Checks if certs value modified
        const [preferGMTLSDef, setPreferGMTLSDef] = useState<boolean>(false)
        const [onlyEnableGMTLSDef, setOnlyEnableGMTLSDef] = useState<boolean>(false)
        const [enableProxyAuthDef, setEnableProxyAuthDef] = useState<boolean>(false)
        const [proxyUsernameDef, setProxyUsernameDef] = useState<string>()
        const [proxyPasswordDef, setProxyPasswordDef] = useState<string>()
        const [dnsServersDef,setDnsServersDef] = useState<string[]>(["8.8.8.8", "114.114.114.114"])
        const [etcHostsDef,setEtcHostsDef] = useState<any[]>([])
        const [etcHosts, setEtcHosts] = useState<any[]>([])
        const [filterWebsocketDef, setFilterWebsocketDef] = useState<boolean>(false)

        const [certificateFormVisible, setCertificateFormVisible] = useState<boolean>(false)
        const [filtersVisible, setFiltersVisible] = useState<boolean>(false)

        const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
        const [form] = Form.useForm()
        const enableProxyAuth = useWatch<boolean>("enableProxyAuth", form)

        useImperativeHandle(
            ref,
            () => ({
                getValue: () => {
                    const v = form.getFieldsValue()
                    if (Object.keys(v).length > 0) {
                        return {...v,etcHosts}
                    } else {
                        return {
                            certs: certsDef,
                            etcHosts: etcHostsDef,
                            preferGMTLS: preferGMTLSDef,
                            onlyEnableGMTLS: onlyEnableGMTLSDef,
                            enableProxyAuth: enableProxyAuthDef,
                            dnsServers: dnsServersDef,
                            proxyUsername: enableProxyAuthDef ? proxyUsernameDef : "",
                            proxyPassword: enableProxyAuthDef ? proxyPasswordDef : "",
                            filterWebsocket: filterWebsocketDef
                        }
                    }
                }
            }),
            [
                certsDef,
                preferGMTLSDef,
                onlyEnableGMTLSDef,
                enableProxyAuthDef,
                proxyUsernameDef,
                proxyPasswordDef,
                dnsServersDef,
                filterWebsocketDef,
                visible,
                form
            ]
        )

        useEffect(() => {
            // Certificate
            getRemoteValue(MITMConsts.MITMDefaultClientCertificates).then((e) => {
                if (!!e) {
                    try {
                        const certsRaw = JSON.parse(e) as ClientCertificate[]
                        setCertsDef(certsRaw)
                    } catch (e) {
                        setCerts([])
                    }
                } else {
                    setCerts([])
                }
            })
            // SM2 TLS Preferred
            getRemoteValue(MITMConsts.MITMDefaultPreferGMTLS).then((e) => {
                const v = e === "true" ? true : false
                setPreferGMTLSDef(v)
                form.setFieldsValue({preferGMTLS: v})
            })
            // SM2 TLS Only
            getRemoteValue(MITMConsts.MITMDefaultOnlyEnableGMTLS).then((e) => {
                const v = e === "true" ? true : false
                setOnlyEnableGMTLSDef(v)
                form.setFieldsValue({onlyEnableGMTLS: v})
            })
            // Proxy Auth
            getRemoteValue(MITMConsts.MITMDefaultEnableProxyAuth).then((e) => {
                const v = e === "true" ? true : false
                setEnableProxyAuthDef(v)
                form.setFieldsValue({enableProxyAuth: v})
            })
            // Proxy auth username
            getRemoteValue(MITMConsts.MITMDefaultProxyUsername).then((e) => {
                setProxyUsernameDef(e)
                form.setFieldsValue({proxyUsername: e})
            })
            // Proxy auth password
            getRemoteValue(MITMConsts.MITMDefaultProxyPassword).then((e) => {
                setProxyPasswordDef(e)
                form.setFieldsValue({proxyPassword: e})
            })
            // DNS Server
            getRemoteValue(MITMConsts.MITMDefaultDnsServers).then((e) => {
                if (!!e) {
                    const dnsServers = JSON.parse(e)
                    setDnsServersDef(dnsServers)
                    form.setFieldsValue({dnsServers}) 
                }
            })
            // Host Config
            getRemoteValue(MITMConsts.MITMDefaultEtcHosts).then((e) => {
                if (!!e) {
                    const etcHosts = JSON.parse(e)
                    setEtcHostsDef(etcHosts)
                    setEtcHosts(etcHosts)
                    form.setFieldsValue({etcHosts})
                }
            })
            // Filter WebSocket
            getRemoteValue(MITMConsts.MITMDefaultFilterWebsocket).then((e) => {
                const v = e === "true" ? true : false
                setFilterWebsocketDef(v)
                form.setFieldsValue({filterWebsocket: v})
            })
        }, [visible])
        /**
         * @description Export Single Cert
         */
        const onExportCerts = useMemoizedFn((item: ClientCertificate) => {
            const exportData = {
                ...item,
                CrtPem: Uint8ArrayToString(item.CrtPem),
                KeyPem: Uint8ArrayToString(item.KeyPem),
                CaCertificates:
                    item.CaCertificates && item.CaCertificates.length > 0
                        ? Uint8ArrayToString(item.CaCertificates[0])
                        : ""
            }
            saveABSFileToOpen(`${item.CerName}-Cert.json`, JSON.stringify(exportData))
        })
        /**
         * @description Export Certs in Batch
         */
        const onBatchExportCerts = useMemoizedFn(() => {
            const newCerts = certs.map((item) => ({
                ...item,
                CrtPem: Uint8ArrayToString(item.CrtPem),
                KeyPem: Uint8ArrayToString(item.KeyPem),
                CaCertificates:
                    item.CaCertificates && item.CaCertificates.length > 0
                        ? Uint8ArrayToString(item.CaCertificates[0])
                        : ""
            }))
            saveABSFileToOpen(`TLS-Cert.json`, JSON.stringify(newCerts))
        })
        const onImportCerts = useMemoizedFn((file: any) => {
            ipcRenderer.invoke("fetch-file-content", file.path).then((value) => {
                try {
                    const values = JSON.parse(value)
                    const certList: ClientCertificate[] = []
                    for (let index = 0; index < values.length; index++) {
                        const item = values[index]
                        if (!item.CrtPem) {
                            yakitFailed("Client Cert (PEM) Error")
                            break
                        }
                        if (!item.KeyPem) {
                            yakitFailed("Client Key (PEM) Error")
                            break
                        }
                        const newItem: ClientCertificate = {
                            CerName: item.CerName || `Certificate${index}`,
                            CrtPem: StringToUint8Array(item.CrtPem),
                            KeyPem: StringToUint8Array(item.KeyPem),
                            CaCertificates:
                                item.CaCertificates && item.CaCertificates.length > 0
                                    ? [StringToUint8Array(item.CaCertificates)]
                                    : []
                        }
                        certList.push(newItem)
                    }

                    setCerts(certList)
                } catch (error) {
                    yakitFailed("Data Format Error")
                }
            })
        })
        /**
         * @description Save Advanced Settings
         */
        const onSaveSetting = useMemoizedFn(() => {
            form.validateFields().then((formValue) => {
                const params: AdvancedConfigurationFromValue = {
                    ...formValue,
                    certs,
                    etcHosts
                }
                setRemoteValue(MITMConsts.MITMDefaultClientCertificates, JSON.stringify(certs))
                setRemoteValue(MITMConsts.MITMDefaultPreferGMTLS, `${params.preferGMTLS}`)
                setRemoteValue(MITMConsts.MITMDefaultOnlyEnableGMTLS, `${params.onlyEnableGMTLS}`)
                setRemoteValue(MITMConsts.MITMDefaultEnableProxyAuth, `${params.enableProxyAuth}`)
                setRemoteValue(MITMConsts.MITMDefaultProxyUsername, params.proxyUsername)
                setRemoteValue(MITMConsts.MITMDefaultProxyPassword, params.proxyPassword)
                setRemoteValue(MITMConsts.MITMDefaultDnsServers, JSON.stringify(params.dnsServers))
                setRemoteValue(MITMConsts.MITMDefaultEtcHosts, JSON.stringify(etcHosts))
                setRemoteValue(MITMConsts.MITMDefaultFilterWebsocket, `${params.filterWebsocket}`)
                onSave(params)
            })
        })
        const onClose = useMemoizedFn((jumpPage?:boolean) => {
            const formValue = form.getFieldsValue()
            const oldValue:any = {
                certs: certsDef,
                dnsServers: dnsServersDef,
                etcHosts:etcHostsDef,
                enableProxyAuth: enableProxyAuthDef,
                filterWebsocket: filterWebsocketDef,
                proxyUsername: proxyUsernameDef,
                proxyPassword: proxyPasswordDef,
            }
            if(enableGMTLS){
                oldValue.preferGMTLS = preferGMTLSDef
                oldValue.onlyEnableGMTLS = onlyEnableGMTLSDef
            }
            const newValue = {
                certs,
                ...formValue,
                proxyUsername:formValue.proxyUsername||'',
                proxyPassword:formValue.proxyPassword||'',
                etcHosts
            }
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                Modal.confirm({
                    title: "Prompt",
                    icon: <ExclamationCircleOutlined />,
                    content: "Save Advanced Settings and Close Popup?？",
                    okText: "Save",
                    cancelText: "Do Not Save",
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
                        onSaveSetting()
                        jumpPage&&ipcRenderer.invoke("open-route-page", {route: YakitRoute.Beta_ConfigNetwork})
                    },
                    onCancel: () => {
                        setVisible(false)
                        jumpPage&&ipcRenderer.invoke("open-route-page", {route: YakitRoute.Beta_ConfigNetwork})
                    },
                    cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                    okButtonProps: {size: "small", className: "modal-ok-button"}
                })
            } else {
                setVisible(false)
                jumpPage&&ipcRenderer.invoke("open-route-page", {route: YakitRoute.Beta_ConfigNetwork})
            }
        })
        return (
            <YakitDrawer
                className={styles["advanced-configuration-drawer"]}
                visible={visible}
                onClose={() => onClose()}
                width='40%'
                title={
                    <div className={styles["advanced-configuration-drawer-title"]}>
                        <div className={styles["advanced-configuration-drawer-title-text"]}>Advanced Config</div>
                        <div className={styles["advanced-configuration-drawer-title-btns"]}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    setVisible(false)
                                }}
                            >
                                Cancel
                            </YakitButton>
                            <YakitButton type='primary' onClick={() => onSaveSetting()}>
                                Save
                            </YakitButton>
                        </div>
                    </div>
                }
                maskClosable={false}
            >
                <Form labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <Form.Item
                    label='DNS Server'
                    name='dnsServers'
                    help={"Specify DNS Server"}
                    initialValue={["8.8.8.8", "114.114.114.114"]}
                >
                    <YakitSelect
                        options={["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"].map((i) => {
                            return {value: i, label: i}
                        })}
                        mode='tags'
                        allowClear={true}
                        placeholder={"E.g., 1.1.1.1"}
                    />
                </Form.Item>
                <Form.Item label={"Hosts Config"} name='etcHosts'>
                    <Space direction={"horizontal"} wrap>
                        <YakitButton
                            onClick={() => {
                                inputHTTPFuzzerHostConfigItem((obj) => {
                                    setEtcHosts([...etcHosts.filter((i) => i.Key !== obj.Key), obj])
                                })
                            }}
                        >
                            Add Hosts Mapping
                        </YakitButton>
                        {etcHosts.map((i, n) => (
                            <YakitTag
                                closable={true}
                                onClose={() => {
                                    setEtcHosts(etcHosts.filter((j) => j.Key !== i.Key))
                                }}
                                key={`${i.Key}-${n}`}
                            >
                                {`${i.Key} => ${i.Value}`}
                            </YakitTag>
                        ))}
                    </Space>
                </Form.Item>
                    {enableGMTLS && (
                        <>
                            <Form.Item
                                label={"SM2 TLS Preferred"}
                                name='preferGMTLS'
                                help={
                                    "Prioritize SM2 TLS; if fails, fallback to regular TLS"
                                }
                                valuePropName='checked'
                            >
                                <YakitSwitch size='large' />
                            </Form.Item>
                            <Form.Item
                                label={"SM2 TLS Only"}
                                name='onlyEnableGMTLS'
                                help={"Enabling this opts out of non-SM2 TLS"}
                                valuePropName='checked'
                            >
                                <YakitSwitch size='large' />
                            </Form.Item>
                        </>
                    )}
                    <Form.Item
                        label={"Proxy Auth"}
                        name='enableProxyAuth'
                        help={"Authenticate hijack proxy, configure on client"}
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Form.Item>
                    {enableProxyAuth && (
                        <>
                            <Form.Item
                                label={"Proxy auth username"}
                                rules={[{required: enableProxyAuth, message: "Required Field"}]}
                                name='proxyUsername'
                            >
                                <YakitAutoComplete options={[{label: "admin", value: "admin"}]} placeholder='Please Enter' />
                            </Form.Item>
                            <Form.Item
                                label={"Proxy Auth Password"}
                                rules={[{required: enableProxyAuth, message: "Required Field"}]}
                                name='proxyPassword'
                            >
                                <YakitInput placeholder='Please Enter' />
                            </Form.Item>
                        </>
                    )}
                    <Form.Item
                        label={"Filter WebSocket"}
                        name='filterWebsocket'
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Form.Item>
                    <Form.Item label='Client TLS Import' className={styles["advanced-configuration-drawer-TLS"]}>
                        <div className={styles["drawer-TLS-item"]}>
                            <YakitButton
                                type='text'
                                icon={<PlusCircleIcon />}
                                onClick={() => {
                                    onClose(true)
                                    // setCertificateFormVisible(true)
                                }}
                                style={{paddingLeft: 0}}
                            >
                                Add
                            </YakitButton>
                            {/* <div className={styles["drawer-TLS-btns"]}>
                                <YakitButton
                                    type='text'
                                    colors={certs.length > 0 ? "danger" : undefined}
                                    disabled={certs.length === 0}
                                    onClick={() => setCerts([])}
                                >
                                    Clear
                                </YakitButton>
                                <Divider type='vertical' style={{margin: "0 4px"}} />
                                <Upload
                                    multiple={false}
                                    maxCount={1}
                                    showUploadList={false}
                                    beforeUpload={(f: any) => onImportCerts(f)}
                                >
                                    <YakitButton type='text' icon={<SaveIcon />}>
                                        Import Config
                                    </YakitButton>
                                </Upload>

                                <Divider type='vertical' style={{margin: "0 4px"}} />
                                <YakitButton
                                    type='text'
                                    icon={<ExportIcon />}
                                    disabled={certs.length === 0}
                                    onClick={() => onBatchExportCerts()}
                                >
                                    Export Config
                                </YakitButton>
                            </div> */}
                        </div>
                        <div className={styles["drawer-TLS-help"]}>
                            Capture HTTPS with mTLS Client Auth
                        </div>
                        <div className={styles["drawer-TLS-certs"]}>
                            {certs.map((item) => (
                                <div className={styles["drawer-TLS-certs-item"]}>
                                    <div
                                        className={classNames(styles["drawer-TLS-certs-item-name"], "content-ellipsis")}
                                    >
                                        {item.CerName}
                                    </div>
                                    <div className={styles["drawer-TLS-certs-item-operate"]}>
                                        <TrashIcon
                                            className={styles["trash-icon"]}
                                            onClick={() => {
                                                setCerts(certs.filter((ele) => ele.CerName !== item.CerName))
                                            }}
                                        />
                                        <Divider type='vertical' style={{margin: "0 8px"}} />
                                        <ExportIcon
                                            className={styles["export-icon"]}
                                            onClick={() => onExportCerts(item)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Divider dashed style={{margin: "16px 0"}} />
                        <div>
                            <YakitButton type='text' style={{paddingLeft: 0}} onClick={() => setFiltersVisible(true)}>
                                Filter
                            </YakitButton>
                            <Divider type='vertical' style={{margin: "0 4px"}} />
                            <YakitButton type='text' onClick={() => setDownloadVisible(true)}>
                                Cert Download
                            </YakitButton>
                        </div>
                    </Form.Item>
                </Form>
                <React.Suspense fallback={<div>loading...</div>}>
                    <MITMAddTLS
                        visible={certificateFormVisible}
                        setVisible={setCertificateFormVisible}
                        certs={certs}
                        setCerts={setCerts}
                    />
                    <MITMFiltersModal visible={filtersVisible} setVisible={setFiltersVisible} isStartMITM={false} />
                    <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
                </React.Suspense>
            </YakitDrawer>
        )
    })
)

export default MITMFormAdvancedConfiguration
