import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    NewPortScanExecuteProps,
    NewPortScanExecuteContentProps,
    NewPortScanExecuteFormProps,
    NewPortScanProps,
    PortScanExecuteExtraFormValue,
    NewPortScanExecuteContentRefProps
} from "./NewPortScanType"
import styles from "./NewPortScan.module.scss"
import {
    ExpandAndRetract,
    ExpandAndRetractExcessiveState
} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {useControllableValue, useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {PluginExecuteProgress} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClipboardlistIcon,
    OutlineRefreshIcon,
    OutlineStoreIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {Checkbox, Divider, Form} from "antd"
import cloneDeep from "lodash/cloneDeep"
import {ScanKind, ScanPortTemplate, defaultPorts} from "@/pages/portscan/PortScanPage"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {isEnpriTrace} from "@/utils/envfile"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {PluginLocalListDetails} from "@/pages/plugins/operator/PluginLocalListDetails/PluginLocalListDetails"
import {PluginFilterParams, PluginSearchParams} from "@/pages/plugins/baseTemplateType"
import {defaultSearch} from "@/pages/plugins/builtInData"
import {defaultLinkPluginConfig} from "@/pages/plugins/utils"
import {getLinkPluginConfig} from "@/pages/plugins/singlePluginExecution/SinglePluginExecution"
import {RecordPortScanRequest, apiCancelPortScan, apiCancelSimpleDetect, apiPortScan, apiSimpleDetect} from "./utils"
import {CheckboxValueType} from "antd/es/checkbox/Group"
import {PresetPorts} from "@/pages/portscan/schema"
import {yakitNotify} from "@/utils/notification"
import {CreateReportContentProps, onCreateReportModal} from "@/pages/portscan/CreateReport"
import {v4 as uuidv4} from "uuid"
import {apiGetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {shallow} from "zustand/shallow"
import {PageNodeItemProps, ScanPortPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/routes/newRoute"
import {pluginTypeFilterList} from "@/defaultConstants/PluginBatchExecutor"
import {defaultScanPortPageInfo} from "@/defaultConstants/NewPortScan"

const NewPortScanExtraParamsDrawer = React.lazy(() => import("./NewPortScanExtraParamsDrawer"))

const {ipcRenderer} = window.require("electron")

export const NewPortScan: React.FC<NewPortScanProps> = React.memo((props) => {
    const {id} = props
    // Hide Plugin List
    const [hidden, setHidden] = useState<boolean>(false)
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: []
    })
    const [selectList, setSelectList] = useState<string[]>([])
    const [selectNum, setSelectNum] = useState<number>(0)

    const [allCheck, setAllCheck] = useState<boolean>(false)

    return (
        <PluginLocalListDetails
            hidden={hidden}
            selectList={selectList}
            setSelectList={setSelectList}
            search={search}
            setSearch={setSearch}
            selectNum={selectNum}
            setSelectNum={setSelectNum}
            showFilter={true}
            filters={filters}
            defaultFilters={{
                plugin_type: cloneDeep(pluginTypeFilterList)
            }}
            setFilters={setFilters}
            fixFilterList={[
                {
                    groupName: "Plugin type",
                    groupKey: "plugin_type",
                    sort: 1,
                    data: pluginTypeFilterList
                }
            ]}
            pluginDetailsProps={{
                bodyClassName: styles["port-scan-body"]
            }}
            allCheck={allCheck}
            setAllCheck={setAllCheck}
        >
            <NewPortScanExecute
                selectNum={selectNum}
                selectList={selectList}
                setSelectList={setSelectList}
                hidden={hidden}
                setHidden={setHidden}
                pluginListSearchInfo={{search, filters}}
                allCheck={allCheck}
                pageId={id}
            />
        </PluginLocalListDetails>
    )
})

const NewPortScanExecute: React.FC<NewPortScanExecuteProps> = React.memo((props) => {
    const {selectList, setSelectList, pluginListSearchInfo, selectNum, allCheck, pageId} = props

    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    /**Fetch Data Center Page Data */
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Mod_ScanPort, pageId)
        if (currentItem && currentItem.pageParamsInfo.scanPortPageInfo) {
            return currentItem.pageParamsInfo.scanPortPageInfo
        } else {
            return {
                ...defaultScanPortPageInfo
            }
        }
    })
    const [pageInfo, setPageInfo] = useState<ScanPortPageInfoProps>(initPageInfo())

    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })

    /**Expand?/Collapse */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    const executeContentRef = useRef<NewPortScanExecuteContentRefProps>(null)

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectList([])
    })
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        executeContentRef.current?.onStopExecute()
    })
    const onStartExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        executeContentRef.current?.onStartExecute()
    })
    const onCreateReport = useMemoizedFn((e) => {
        e.stopPropagation()
        executeContentRef.current?.onCreateReport()
    })
    const disabledReport = useCreation(() => {
        switch (executeStatus) {
            case "finished":
                return false
            case "error":
                return false
            default:
                return true
        }
    }, [executeStatus])
    return (
        <div className={styles["port-scan-execute-wrapper"]}>
            <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                <div className={styles["port-scan-executor-title"]}>
                    <span className={styles["port-scan-executor-title-text"]}>Port Fingerprint Scan</span>
                    {selectNum > 0 && (
                        <YakitTag closable onClose={onRemove} color='info'>
                            {selectNum} plugins
                        </YakitTag>
                    )}
                </div>
                <div className={styles["port-scan-executor-btn"]}>
                    {progressList.length === 1 && (
                        <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                    )}
                    {isExecuting
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={onStopExecute}>
                                      Exec Plugin Names Array
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onStartExecute}>Risk Items</YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )}
                    {isEnpriTrace() && (
                        <>
                            <YakitButton
                                icon={<OutlineClipboardlistIcon />}
                                disabled={disabledReport}
                                onClick={onCreateReport}
                            >
                                Generate Report
                            </YakitButton>
                            <div className={styles["divider-style"]}></div>
                        </>
                    )}
                    <YakitButton
                        type='text2'
                        icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                        onClick={(e) => {
                            e.stopPropagation()
                            setHidden(!hidden)
                        }}
                    />
                </div>
            </ExpandAndRetract>
            <div className={styles["port-scan-executor-body"]}>
                <NewPortScanExecuteContent
                    ref={executeContentRef}
                    isExpand={isExpand}
                    setIsExpand={setIsExpand}
                    executeStatus={executeStatus}
                    setExecuteStatus={setExecuteStatus}
                    selectNum={selectNum}
                    pluginListSearchInfo={pluginListSearchInfo}
                    selectList={selectList}
                    setProgressList={setProgressList}
                    allCheck={allCheck}
                    pageInfo={pageInfo}
                />
            </div>
        </div>
    )
})

export const defPortScanExecuteExtraFormValue: PortScanExecuteExtraFormValue = {
    Ports: defaultPorts,
    Mode: "fingerprint",
    Concurrent: 50,
    SkippedHostAliveScan: false,

    Targets: "",
    Active: true,
    FingerprintMode: "all",
    Proto: ["tcp"],
    SaveClosedPorts: false,
    SaveToDB: true,
    Proxy: [],
    EnableBrute: false,
    ProbeTimeout: 7,
    ScriptNames: [],
    ProbeMax: 3,
    EnableCClassScan: false,
    HostAlivePorts: "22,80,443",
    EnableBasicCrawler: true,
    BasicCrawlerRequestMax: 5,
    SynConcurrent: 1000,
    HostAliveConcurrent: 20,
    LinkPluginConfig: cloneDeep(defaultLinkPluginConfig),
    BasicCrawlerEnableJSParser: false,
    /**@Description for Frontend, Scan Protocol */
    scanProtocol: "tcp"
}

const NewPortScanExecuteContent: React.FC<NewPortScanExecuteContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            isExpand,
            executeStatus,
            setExecuteStatus,
            setIsExpand,
            selectNum,
            pluginListSearchInfo,
            selectList,
            setProgressList,
            allCheck,
            pageInfo
        } = props
        const [form] = Form.useForm()

        const [runtimeId, setRuntimeId] = useState<string>("")
        /**For cache modification */
        const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
        const [extraParamsValue, setExtraParamsValue] = useState<PortScanExecuteExtraFormValue>(
            cloneDeep(defPortScanExecuteExtraFormValue)
        )

        const uuidRef = useRef<string>(uuidv4())
        const taskNameRef = useRef<string>("")

        const tokenRef = useRef<string>(randomString(40))
        const newPortScanExecuteContentRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(newPortScanExecuteContentRef)

        const defaultTabs = useCreation(() => {
            return [
                {tabName: "Scan Port List", type: "port"},
                {tabName: "Cache Result", type: "http"},
                {tabName: "Stop Answering", type: "risk"},
                {tabName: "Logs", type: "log"},
                {tabName: "Console", type: "console"}
            ]
        }, [])
        const [streamInfo, portScanStreamEvent] = useHoldGRPCStream({
            tabs: defaultTabs,
            taskName: isEnpriTrace() ? "Simple-Detect" : "Port-Scan",
            apiKey: isEnpriTrace() ? "SimpleDetect" : "PortScan",
            token: tokenRef.current,
            onEnd: () => {
                portScanStreamEvent.stop()
                setTimeout(() => {
                    setExecuteStatus("finished")
                }, 200)
            },
            setRuntimeId: (rId) => {
                setRuntimeId(rId)
            }
        })

        useImperativeHandle(
            ref,
            () => ({
                onStopExecute,
                onStartExecute: () => {
                    form.validateFields()
                        .then(onStartExecute)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                },
                onCreateReport
            }),
            [form]
        )

        useEffect(() => {
            setProgressList(streamInfo.progressState)
        }, [streamInfo.progressState])

        useEffect(() => {
            apiGetGlobalNetworkConfig().then((rsp: GlobalNetworkConfig) => {
                setExtraParamsValue({
                    ...extraParamsValue,
                    SynScanNetInterface: rsp.SynScanNetInterface
                })
            })
        }, [])
        useEffect(() => {
            //  pageInfo.targets init only, Set Targets initial value
            form.setFieldsValue({
                Targets: pageInfo.targets
            })
        }, [pageInfo.targets])

        const isExecuting = useCreation(() => {
            if (executeStatus === "process") return true
            return false
        }, [executeStatus])
        /**Generate Report */
        const onCreateReport = useMemoizedFn(() => {
            if (executeStatus === "default") return
            const params: CreateReportContentProps = {
                reportName: taskNameRef.current,
                runtimeId
            }
            onCreateReportModal(params)
        })

        /**Start Execution */
        const onStartExecute = useMemoizedFn((value) => {
            const filters = {...pluginListSearchInfo.filters}
            if (filters.plugin_type?.length === 0) {
                filters.plugin_type = cloneDeep(pluginTypeFilterList)
            }
            const linkPluginConfig = getLinkPluginConfig(selectList, {...pluginListSearchInfo, filters}, allCheck)
            let executeParams: PortScanExecuteExtraFormValue = {
                ...extraParamsValue,
                ...value,
                Proto: extraParamsValue.scanProtocol ? [extraParamsValue.scanProtocol] : [],
                LinkPluginConfig: linkPluginConfig
            }
            portScanStreamEvent.reset()
            setRuntimeId("")
            if (isEnpriTrace()) {
                uuidRef.current = uuidv4()
                const taskName = `${executeParams.Targets.split(",")[0].split(/\n/)[0]}Risk Assessment Report`
                taskNameRef.current = taskName
                let PortScanRequest = {...executeParams, TaskName: `${taskName}-${uuidRef.current}`}
                const simpleDetectPrams: RecordPortScanRequest = {
                    PortScanRequest
                }
                apiSimpleDetect(simpleDetectPrams, tokenRef.current).then(() => {
                    setExecuteStatus("process")
                    setIsExpand(false)
                    portScanStreamEvent.start()
                })
            } else {
                apiPortScan(executeParams, tokenRef.current).then(() => {
                    setExecuteStatus("process")
                    setIsExpand(false)
                    portScanStreamEvent.start()
                })
            }
        })
        /**Code Gen */
        const onStopExecute = useMemoizedFn(() => {
            if (isEnpriTrace()) {
                apiCancelSimpleDetect(tokenRef.current).then(() => {
                    portScanStreamEvent.stop()
                    setExecuteStatus("finished")
                })
            } else {
                apiCancelPortScan(tokenRef.current).then(() => {
                    portScanStreamEvent.stop()
                    setExecuteStatus("finished")
                })
            }
        })
        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsValue({
                ...extraParamsValue,
                SkippedHostAliveScan: form.getFieldValue("SkippedHostAliveScan")
            })
            setExtraParamsVisible(true)
        })
        /**Save Extra Parameters */
        const onSaveExtraParams = useMemoizedFn((v: PortScanExecuteExtraFormValue) => {
            setExtraParamsValue({...v} as PortScanExecuteExtraFormValue)
            setExtraParamsVisible(false)
            form.setFieldsValue({
                SkippedHostAliveScan: v.SkippedHostAliveScan
            })
        })
        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId
        }, [isExecuting, runtimeId])
        const progressList = useCreation(() => {
            return streamInfo.progressState
        }, [streamInfo.progressState])
        return (
            <>
                <div
                    className={classNames(styles["port-scan-form-wrapper"], {
                        [styles["port-scan-form-wrapper-hidden"]]: !isExpand
                    })}
                    ref={newPortScanExecuteContentRef}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //Center Input Field
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} Required Field"
                        }}
                        labelWrap={true}
                    >
                        <NewPortScanExecuteForm
                            inViewport={inViewport}
                            form={form}
                            disabled={isExecuting}
                            extraParamsValue={extraParamsValue}
                        />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["plugin-execute-form-operate"]}>
                                {isExecuting ? (
                                    <YakitButton danger onClick={onStopExecute} size='large'>
                                        Exec Plugin Names Array
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        className={styles["plugin-execute-form-operate-start"]}
                                        htmlType='submit'
                                        size='large'
                                    >
                                        Start Execution
                                    </YakitButton>
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isExecuting}
                                    size='large'
                                >
                                    Extra params
                                </YakitButton>
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {progressList.length > 1 && (
                    <div className={styles["executing-progress"]}>
                        {progressList.map((ele, index) => (
                            <React.Fragment key={ele.id}>
                                {index !== 0 && <Divider type='vertical' style={{margin: 0, top: 2}} />}
                                <PluginExecuteProgress percent={ele.progress} name={ele.id} />
                            </React.Fragment>
                        ))}
                    </div>
                )}
                {isShowResult && (
                    <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
                )}
                <React.Suspense fallback={<div>loading...</div>}>
                    <NewPortScanExtraParamsDrawer
                        extraParamsValue={extraParamsValue}
                        visible={extraParamsVisible}
                        onSave={onSaveExtraParams}
                    />
                </React.Suspense>
            </>
        )
    })
)

const NewPortScanExecuteForm: React.FC<NewPortScanExecuteFormProps> = React.memo((props) => {
    const {inViewport, disabled, form, extraParamsValue} = props
    const [templatePort, setTemplatePort] = useState<string>()

    useEffect(() => {
        if (inViewport) onGetTemplatePort()
    }, [inViewport])
    const onGetTemplatePort = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-local-cache", ScanPortTemplate)
            .then((value: string) => {
                if (value) {
                    setTemplatePort(value || "")
                }
            })
            .catch(() => {})
    })
    const onSetTemplatePort = useMemoizedFn(() => {
        const ports = form.getFieldValue("Ports")
        if (!ports) {
            yakitNotify("error", "Enter Port Before Saving")
            return
        }
        ipcRenderer.invoke("set-local-cache", ScanPortTemplate, ports).then(() => {
            yakitNotify("success", "Save Successful")
            setTemplatePort(ports)
        })
    })
    /**Select Preset Ports */
    const onCheckPresetPort = useMemoizedFn((checkedValue: CheckboxValueType[]) => {
        let res: string = (checkedValue || [])
            .map((i) => {
                if (i === "template") return templatePort
                return PresetPorts[i as string] || ""
            })
            .join(",")
        if (!!res) {
            form.setFieldsValue({Ports: res})
        }
    })
    const onResetPort = useMemoizedFn(() => {
        form.setFieldsValue({Ports: defaultPorts, presetPort: undefined})
    })
    return (
        <>
            <YakitFormDraggerContent
                formItemProps={{
                    name: "Targets",
                    label: "Scan Target",
                    rules: [{required: true}]
                }}
                accept='.txt,.xlsx,.xls,.csv'
                textareaProps={{
                    placeholder: "Domain/Host/IP/IP Ranges, Comma or Line Separated",
                    rows: 3
                }}
                help='Drag TXT, Excel files here or'
                disabled={disabled}
            />
            <Form.Item label='Preset Ports' name='presetPort'>
                <Checkbox.Group
                    className={styles["preset-port-group-wrapper"]}
                    onChange={onCheckPresetPort}
                    disabled={disabled}
                >
                    <YakitCheckbox value={"top100"}>Common 100 Ports</YakitCheckbox>
                    <YakitCheckbox value={"topweb"}>Common Web Ports</YakitCheckbox>
                    <YakitCheckbox value={"top1000+"}>Common 1-2k</YakitCheckbox>
                    <YakitCheckbox value={"topdb"}>Common DB & MQ Ports</YakitCheckbox>
                    <YakitCheckbox value={"topudp"}>Common UDP Ports</YakitCheckbox>
                    {templatePort && <YakitCheckbox value={"template"}>Template</YakitCheckbox>}
                </Checkbox.Group>
            </Form.Item>
            <Form.Item
                label='Scan Ports'
                name='Ports'
                extra={
                    <div className={styles["ports-form-extra"]}>
                        <YakitButton
                            type='text'
                            icon={<OutlineStoreIcon />}
                            style={{paddingLeft: 0}}
                            onClick={onSetTemplatePort}
                        >
                            Save as Module
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton
                            type='text'
                            icon={<OutlineRefreshIcon />}
                            onClick={onResetPort}
                            disabled={disabled}
                        >
                            Default Config
                        </YakitButton>
                    </div>
                }
                initialValue={defaultPorts}
            >
                <YakitInput.TextArea rows={3} disabled={disabled} />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <div className={styles["form-extra"]}>
                    <Form.Item name='SkippedHostAliveScan' valuePropName='checked' noStyle>
                        <YakitCheckbox disabled={disabled}>Skip Host Alive Check</YakitCheckbox>
                    </Form.Item>
                    <YakitTag>Scan Mode：{ScanKind[extraParamsValue.Mode]}</YakitTag>
                    <YakitTag>Fingerprint Scan Concurrency：{extraParamsValue.Concurrent}</YakitTag>
                </div>
            </Form.Item>
        </>
    )
})
