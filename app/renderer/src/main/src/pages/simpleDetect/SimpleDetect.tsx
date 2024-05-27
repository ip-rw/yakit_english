import React, {useEffect, useRef, useState} from "react"
import {SimpleDetectForm, SimpleDetectFormContentProps, SimpleDetectProps} from "./SimpleDetectType"
import {Checkbox, Form, Progress, Slider} from "antd"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, warn, yakitNotify} from "@/utils/notification"
import {RecordPortScanRequest, apiCancelSimpleDetect, apiSimpleDetect} from "../securityTool/newPortScan/utils"
import styles from "./SimpleDetect.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import {defPortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScan"
import cloneDeep from "lodash/cloneDeep"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useStore} from "@/store"
import {
    DownloadOnlinePluginsRequest,
    apiDeleteLocalPluginsByWhere,
    apiFetchQueryYakScriptGroupLocal,
    defaultDeleteLocalPluginsByWhereRequest
} from "../plugins/utils"
import {DownloadOnlinePluginAllResProps} from "../yakitStore/YakitStorePage"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {SliderMarks} from "antd/lib/slider"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {GroupCount} from "../invoker/schema"
import {getLinkPluginConfig} from "../plugins/singlePluginExecution/SinglePluginExecution"
import {PresetPorts} from "../portscan/schema"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitGetOnlinePlugin} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {SimpleDetectExtraParam} from "./SimpleDetectExtraParamsDrawer"
import {convertStartBruteParams} from "../securityTool/newBrute/utils"
import {StartBruteParams} from "../brute/BrutePage"
import {OutlineClipboardlistIcon} from "@/assets/icon/outline"
import {SimpleTabInterface} from "../layout/mainOperatorContent/MainOperatorContent"
import {CreateReportContentProps, onCreateReportModal} from "../portscan/CreateReport"
import {v4 as uuidv4} from "uuid"
import {defaultSearch} from "../plugins/builtInData"
import {defaultBruteExecuteExtraFormValue} from "@/defaultConstants/NewBrute"

const SimpleDetectExtraParamsDrawer = React.lazy(() => import("./SimpleDetectExtraParamsDrawer"))

const {ipcRenderer} = window.require("electron")

const defaultScanDeep = 3

const scanDeepMapPresetPort = {
    3: "fast",
    2: "middle",
    1: "slow"
}

export const SimpleDetect: React.FC<SimpleDetectProps> = React.memo((props) => {
    const {pageId} = props
    // Global login status
    const {userInfo} = useStore()
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.SimpleDetect, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.SimpleDetect].label
    })
    const [form] = Form.useForm()
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())
    /**Expand?/Collapse */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**In Progress? */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    /**Code Generation */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<SimpleDetectExtraParam>({
        portScanParam: cloneDeep({
            ...defPortScanExecuteExtraFormValue,
            scanDeep: defaultScanDeep,
            presetPort: scanDeepMapPresetPort[defaultScanDeep],
            Ports: PresetPorts[scanDeepMapPresetPort[defaultScanDeep]],
            HostAliveConcurrent: 200
        }),
        bruteExecuteParam: cloneDeep(defaultBruteExecuteExtraFormValue)
    })
    const [refreshGroup, setRefreshGroup] = useState<boolean>(false)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)

    const [runtimeId, setRuntimeId] = useState<string>("")

    const scanDeep = Form.useWatch("scanDeep", form)

    const taskNameRef = useRef<string>("")
    const simpleDetectWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(simpleDetectWrapperRef)
    const tokenRef = useRef<string>(randomString(40))

    const defaultTabs = useCreation(() => {
        return [
            {tabName: "Request Error, Retry Later", type: "risk"},
            {tabName: "Scan ports list", type: "port"},
            {tabName: "Log", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [])

    const onEnd = useMemoizedFn(() => {
        simpleDetectStreamEvent.stop()
        setTimeout(() => {
            setIsExecuting(false)
            if (executeStatus !== "error") {
                setExecuteStatus("finished")
            }
        }, 300)
    })

    const [streamInfo, simpleDetectStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "SimpleDetect",
        apiKey: "SimpleDetect",
        token: tokenRef.current,
        onError: () => {
            setExecuteStatus("error")
        },
        onEnd,
        setRuntimeId: (rId) => {
            yakitNotify("info", `Guest: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        switch (scanDeep) {
            // Fast
            case 3:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {...v.portScanParam, Ports: PresetPorts["fast"], presetPort: ["fast"]}
                }))
                break
            // Moderate
            case 2:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {...v.portScanParam, Ports: PresetPorts["middle"], presetPort: ["middle"]}
                }))
                break
            // Slow
            case 1:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {...v.portScanParam, Ports: PresetPorts["slow"], presetPort: ["slow"]}
                }))
                break
        }
    }, [scanDeep])

    useEffect(() => {
        if (inViewport) emiter.on("secondMenuTabDataChange", onSetTabName)
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
        }
    }, [inViewport])
    useEffect(() => {
        const simpleTab: SimpleTabInterface = {
            tabId: pageId,
            status: executeStatus
        }
        emiter.emit("simpleDetectTabEvent", JSON.stringify(simpleTab))
    }, [executeStatus])

    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageInfo())
    })

    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })
    const onStartExecute = useMemoizedFn((value: SimpleDetectForm) => {
        if (value.scanType === "Targeted Scan" && (value.pluginGroup?.length || 0) === 0) {
            warn("Select targeted scan item")
            return
        }
        let taskNameTimeTarget: string = value?.Targets.split(",")[0].split(/\n/)[0] || "Vuln. scan task"
        const taskName = `${value.scanType}-${taskNameTimeTarget}`
        taskNameRef.current = taskName
        const pluginGroup = value.scanType !== "Targeted Scan" ? ["Basic Scan"] : value.pluginGroup || []
        const linkPluginConfig = getLinkPluginConfig(
            [],
            {
                search: cloneDeep(defaultSearch),
                filters: {
                    plugin_group: pluginGroup.map((ele) => ({value: ele, label: ele, count: 0}))
                }
            },
            true
        )
        let portScanRequestParams: PortScanExecuteExtraFormValue = {
            ...extraParamsValue.portScanParam,
            Mode: "all",
            Proto: ["tcp"],
            EnableBrute: !!value.pluginGroup?.includes("Weak pwd."),
            LinkPluginConfig: linkPluginConfig,
            Targets: value.Targets,
            SkippedHostAliveScan: !!value.SkippedHostAliveScan,
            TaskName: `${taskName}-${uuidv4()}`
        }
        switch (value.scanDeep) {
            // Fast
            case 3:
                // Fingerprint concurrency
                portScanRequestParams.Concurrent = 100
                // SYN concurrency
                portScanRequestParams.SynConcurrent = 2000
                portScanRequestParams.ProbeTimeout = 3
                // Fingerprint detail level
                portScanRequestParams.ProbeMax = 3
                // portScanRequestParams.Ports = PresetPorts["fast"]
                break
            // Moderate
            case 2:
                portScanRequestParams.Concurrent = 80
                portScanRequestParams.SynConcurrent = 1000
                portScanRequestParams.ProbeTimeout = 5
                portScanRequestParams.ProbeMax = 5
                // portScanRequestParams.Ports = PresetPorts["middle"]
                break
            // Slow
            case 1:
                portScanRequestParams.Concurrent = 50
                portScanRequestParams.SynConcurrent = 1000
                portScanRequestParams.ProbeTimeout = 7
                portScanRequestParams.ProbeMax = 7
                // portScanRequestParams.Ports = PresetPorts["slow"]
                break
            default:
                break
        }
        const newStartBruteParams: StartBruteParams = {
            ...convertStartBruteParams(extraParamsValue.bruteExecuteParam)
        }
        const params: RecordPortScanRequest = {
            StartBruteParams: {
                ...newStartBruteParams
            },
            PortScanRequest: {...portScanRequestParams}
        }
        simpleDetectStreamEvent.reset()
        setExecuteStatus("process")
        setRuntimeId("")
        apiSimpleDetect(params, tokenRef.current).then(() => {
            setIsExecuting(true)
            setIsExpand(false)
            simpleDetectStreamEvent.start()
        })
    })
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiCancelSimpleDetect(tokenRef.current).then(() => {
            simpleDetectStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /**Execute button at top */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    const openExtraPropsDrawer = useMemoizedFn(() => {
        setExtraParamsValue({
            ...extraParamsValue,
            portScanParam: {
                ...extraParamsValue.portScanParam,
                SkippedHostAliveScan: form.getFieldValue("SkippedHostAliveScan")
            }
        })
        setExtraParamsVisible(true)
    })
    /**Save extra parameters */
    const onSaveExtraParams = useMemoizedFn((v: SimpleDetectExtraParam) => {
        setExtraParamsValue({...v} as SimpleDetectExtraParam)
        setExtraParamsVisible(false)
        form.setFieldsValue({
            SkippedHostAliveScan: !!v.portScanParam?.SkippedHostAliveScan
        })
    })
    const onImportPlugin = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!userInfo.isLogin) {
            warn("Please log in to download plugins")
            return
        }
        setVisibleOnline(true)
    })
    const onRemoveAllLocalPlugin = useMemoizedFn((e) => {
        e.stopPropagation()
        setRemoveLoading(true)
        apiDeleteLocalPluginsByWhere(defaultDeleteLocalPluginsByWhereRequest)
            .then(() => {
                setRefreshGroup(!refreshGroup)
            })
            .finally(() =>
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            )
    })
    /**Generate report */
    const onCreateReport = useMemoizedFn((e) => {
        e.stopPropagation()
        if (executeStatus === "default") return
        const params: CreateReportContentProps = {
            reportName: taskNameRef.current,
            runtimeId
        }
        onCreateReportModal(params)
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    const progressList = useCreation(() => {
        return streamInfo.progressState || []
    }, [streamInfo])
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
        <>
            <div className={styles["simple-detect-wrapper"]} ref={simpleDetectWrapperRef}>
                <ExpandAndRetract
                    className={styles["simple-detect-heard"]}
                    onExpand={onExpand}
                    isExpand={isExpand}
                    status={executeStatus}
                >
                    <span className={styles["simple-detect-heard-tabName"]}>{tabName}</span>
                    <div className={styles["simple-detect-heard-operate"]}>
                        {progressList.length === 1 && (
                            <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                        )}
                        {!isExecuting ? (
                            <>
                                <YakitPopconfirm
                                    title={"Confirm importing all data to local from plugin store??"}
                                    onConfirm={onImportPlugin}
                                    onCancel={(e) => {
                                        if (e) e.stopPropagation()
                                    }}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={"left"}
                                >
                                    <YakitButton
                                        type='text'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        Import plugins
                                    </YakitButton>
                                </YakitPopconfirm>
                                <YakitPopconfirm
                                    title={"Confirm clearing all local data from plugin store??"}
                                    onConfirm={onRemoveAllLocalPlugin}
                                    onCancel={(e) => {
                                        if (e) e.stopPropagation()
                                    }}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={"left"}
                                >
                                    <YakitButton
                                        type='text'
                                        danger
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                        loading={removeLoading}
                                    >
                                        Clear plugins
                                    </YakitButton>
                                </YakitPopconfirm>
                            </>
                        ) : null}
                        {/* TODO - Task list */}
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                            disabled={true}
                        >
                            Task list
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton
                            icon={<OutlineClipboardlistIcon />}
                            disabled={disabledReport}
                            onClick={onCreateReport}
                            style={{marginRight: 8}}
                        >
                            Generate report
                        </YakitButton>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      <YakitButton danger onClick={onStopExecute}>
                                          Just Input
                                      </YakitButton>
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      <YakitButton onClick={onExecuteInTop}>Update Last Item</YakitButton>
                                  </>
                              )}
                    </div>
                </ExpandAndRetract>
                <div className={styles["simple-detect-content"]}>
                    <div
                        className={classNames(styles["simple-detect-form-wrapper"], {
                            [styles["simple-detect-form-wrapper-hidden"]]: !isExpand
                        })}
                    >
                        <Form
                            form={form}
                            onFinish={onStartExecute}
                            labelCol={{span: 6}}
                            wrapperCol={{span: 12}} //Center input field
                            validateMessages={{
                                /* eslint-disable no-template-curly-in-string */
                                required: "${label} Required Field"
                            }}
                            labelWrap={true}
                        >
                            <SimpleDetectFormContent
                                disabled={isExecuting}
                                inViewport={inViewport}
                                form={form}
                                refreshGroup={refreshGroup}
                            />
                            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                <div className={styles["simple-detect-form-operate"]}>
                                    {isExecuting ? (
                                        <YakitButton danger onClick={onStopExecute} size='large'>
                                            Just Input
                                        </YakitButton>
                                    ) : (
                                        <YakitButton
                                            className={styles["simple-detect-form-operate-start"]}
                                            htmlType='submit'
                                            size='large'
                                        >
                                            Character Range
                                        </YakitButton>
                                    )}
                                    <YakitButton
                                        type='text'
                                        onClick={openExtraPropsDrawer}
                                        disabled={isExecuting}
                                        size='large'
                                    >
                                        Extra parameters
                                    </YakitButton>
                                </div>
                            </Form.Item>
                        </Form>
                    </div>
                    {isShowResult && (
                        <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
                    )}
                </div>
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <SimpleDetectExtraParamsDrawer
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    onSave={onSaveExtraParams}
                />
            </React.Suspense>
            {visibleOnline && (
                <YakitGetOnlinePlugin
                    visible={visibleOnline}
                    setVisible={(v) => {
                        setVisibleOnline(v)
                        setRefreshGroup(!refreshGroup)
                    }}
                />
            )}
        </>
    )
})

const ScanTypeOptions = [
    {
        value: "Basic Scan",
        label: "Basic Scan"
    },
    {
        value: "Targeted Scan",
        label: "Targeted Scan"
    }
]
const marks: SliderMarks = {
    1: {
        label: <div>Slow</div>
    },
    2: {
        label: <div>Moderate</div>
    },
    3: {
        label: <div>Fast</div>
    }
}
const SimpleDetectFormContent: React.FC<SimpleDetectFormContentProps> = React.memo((props) => {
    const {disabled, inViewport, form, refreshGroup} = props
    const [groupOptions, setGroupOptions] = useState<string[]>([])
    const scanType = Form.useWatch("scanType", form)
    useEffect(() => {
        if (inViewport) getPluginGroup()
    }, [inViewport, refreshGroup])
    const scanTypeExtra = useCreation(() => {
        let str: string = ""
        switch (scanType) {
            case "Basic Scan":
                str = "Compliance, weak pwd. & partial vuln. checks"
                break
            case "Targeted Scan":
                str = "Targeted vuln. scans for various scenarios"
                break
        }
        return str
    }, [scanType])
    const getPluginGroup = useMemoizedFn(() => {
        apiFetchQueryYakScriptGroupLocal(false).then((group: GroupCount[]) => {
            const newGroup: string[] = group
                .map((item) => item.Value)
                .filter((item) => item !== "Basic Scan")
                .concat("Weak pwd.")
            setGroupOptions([...new Set(newGroup)])
        })
    })
    return (
        <>
            <YakitFormDraggerContent
                formItemProps={{
                    name: "Targets",
                    label: "Scan target",
                    rules: [{required: true}]
                }}
                accept='.txt,.xlsx,.xls,.csv'
                textareaProps={{
                    placeholder: "Information/Host/IP/IP ranges, comma or newline separated",
                    rows: 3
                }}
                help='Drag TXT or Excel files here or'
                disabled={disabled}
            />
            <Form.Item
                label='Scan mode'
                name='scanType'
                initialValue='Basic Scan'
                extra={
                    <>
                        {scanTypeExtra}
                        {scanType === "Targeted Scan" && (
                            <Form.Item noStyle name='pluginGroup' initialValue={["Weak pwd."]}>
                                <Checkbox.Group className={styles["plugin-group-wrapper"]} disabled={disabled}>
                                    {groupOptions.map((ele) => (
                                        <YakitCheckbox key={ele} value={ele}>
                                            {ele}
                                        </YakitCheckbox>
                                    ))}
                                </Checkbox.Group>
                            </Form.Item>
                        )}
                    </>
                }
            >
                <YakitRadioButtons buttonStyle='solid' options={ScanTypeOptions} disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='scanDeep'
                label='Scan speed'
                extra='Slower scan speed, more detailed results, choose based on situation'
                initialValue={defaultScanDeep}
            >
                <Slider tipFormatter={null} min={1} max={3} marks={marks} disabled={disabled} />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <div className={styles["form-extra"]}>
                    <Form.Item name='SkippedHostAliveScan' valuePropName='checked' noStyle>
                        <YakitCheckbox disabled={disabled}>Skip host alive check</YakitCheckbox>
                    </Form.Item>
                </div>
            </Form.Item>
        </>
    )
})

interface DownloadAllPluginProps {
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose} = props
    // Global login status
    const {userInfo} = useStore()
    // Progress bar for all
    const [addLoading, setAddLoading] = useState<boolean>(false)
    // Progress for all
    const [percent, setPercent] = useState<number>(0)
    const [taskToken, setTaskToken] = useState(randomString(40))
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setPercent(0)
                setDownloadPlugin && setDownloadPlugin(false)
                onClose && onClose()
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {})
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("Please log in to download plugins")
            return
        }
        // Add All
        setAddLoading(true)
        setDownloadPlugin && setDownloadPlugin(true)
        const addParams: DownloadOnlinePluginsRequest = {ListType: ""}
        ipcRenderer
            .invoke("DownloadOnlinePlugins", addParams, taskToken)
            .then(() => {})
            .catch((e) => {
                failed(`Add failed:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`Stop add failed:${e}`)
        })
    }
    return (
        <div className={styles["download-all-plugin-modal"]}>
            {addLoading ? (
                <div>
                    <div>Download progress</div>
                    <div className={styles["filter-opt-progress-modal"]}>
                        <Progress
                            size='small'
                            status={!addLoading && percent !== 0 ? "exception" : undefined}
                            percent={percent}
                        />
                    </div>
                    <div style={{textAlign: "center", marginTop: 10}}>
                        <YakitButton type='primary' onClick={StopAllPlugin}>
                            Cancel
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <div>
                    <div>No plugins downloaded locally, can't perform security check, click“Import”Download plugins</div>
                    <div style={{textAlign: "center", marginTop: 10}}>
                        <YakitButton type='primary' onClick={AddAllPlugin}>
                            Import
                        </YakitButton>
                    </div>
                </div>
            )}
        </div>
    )
}
