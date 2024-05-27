/**
 * @Deprecated
 * TODO Remove after completing basic security check unfinished tasks
 */
import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    Space,
    Progress,
    Divider,
    Form,
    Input,
    Button,
    Spin,
    Radio,
    Popconfirm,
    Tabs,
    Checkbox,
    Modal,
    Row,
    Col,
    Slider,
    Timeline
} from "antd"
import {AutoCard} from "@/components/AutoCard"
import {DeleteOutlined, PaperClipOutlined} from "@ant-design/icons"
import styles from "./SimpleDetect.module.scss"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {failed, info, success, warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {
    showUnfinishedSimpleDetectTaskList,
    UnfinishedSimpleDetectBatchTask
} from "../invoker/batch/UnfinishedBatchTaskList"
import {useGetState, useMemoizedFn, useDebounceEffect, useInViewport} from "ahooks"
import type {SliderMarks} from "antd/es/slider"
import {showDrawer} from "../../utils/showModal"
import {ScanPortForm, PortScanParams} from "../portscan/PortScanPage"
import {ExecResult, GroupCount, YakScript} from "../invoker/schema"
import {useStore} from "@/store"
import {DownloadOnlinePluginAllResProps} from "@/pages/yakitStore/YakitStorePage"
import {OpenPortTableViewer} from "../portscan/PortTable"
import {SimpleCardBox, StatusCardInfoProps} from "../yakitStore/viewers/base"
import moment from "moment"
import {CreatReportScript} from "./CreatReportScript"
import useHoldingIPCRStream, {InfoState} from "../../hook/useHoldingIPCRStream"
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema"
import type {CheckboxValueType} from "antd/es/checkbox/Group"
import {RiskDetails} from "@/pages/risks/RiskTable"
import {formatTimestamp} from "../../utils/timeUtil"
import {ResizeBox} from "../../components/ResizeBox"
import {SimpleCloseInfo, setSimpleInfo, delSimpleInfo} from "@/pages/globalVariable"
import {PresetPorts} from "@/pages/portscan/schema"
import {v4 as uuidv4} from "uuid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRoute} from "@/routes/newRoute"
import {StartBruteParams} from "@/pages/brute/BrutePage"
import emiter from "@/utils/eventBus/eventBus"
import {DownloadOnlinePluginsRequest, apiFetchQueryYakScriptGroupLocal} from "../plugins/utils"
import {LastRecordProps} from "../securityTool/newPortScan/utils"

const {ipcRenderer} = window.require("electron")
const CheckboxGroup = Checkbox.Group

const layout = {
    labelCol: {span: 6},
    wrapperCol: {span: 16}
}
const marks: SliderMarks = {
    1: {
        label: <div>Slow</div>
    },
    2: {
        label: <div>Medium</div>
    },
    3: {
        label: <div>Fast</div>
    }
}

interface SimpleDetectFormProps {
    refreshPluginGroup: number
    setPercent: (v: number) => void
    percent: number
    setExecuting: (v: boolean) => void
    token: string
    executing: boolean
    openScriptNames: string[] | undefined
    YakScriptOnlineGroup?: string
    isDownloadPlugin: boolean
    baseProgress?: number
    TaskName?: string
    runTaskName?: string
    setRunTaskName: (v: string) => void
    setRunPluginCount: (v: number) => void
    reset: () => void
    filePtrValue: number
    oldRunParams?: OldRunParamsProps
    Uid?: string
    nowUUID: string
    setNowUUID: (v: string) => void
    setAllowDownloadReport: (v: boolean) => void
    statusCards: StatusCardInfoProps[]
    getReportParams: () => CacheReportParamsProps[]
    setIsLastReport: (v: boolean) => void
    setRunTaskNameEx: (v: string) => void
}

export const SimpleDetectForm: React.FC<SimpleDetectFormProps> = (props) => {
    const {
        refreshPluginGroup,
        percent,
        setPercent,
        setExecuting,
        token,
        executing,
        openScriptNames,
        YakScriptOnlineGroup,
        isDownloadPlugin,
        baseProgress,
        TaskName,
        runTaskName,
        setRunTaskName,
        setRunPluginCount,
        reset,
        filePtrValue,
        oldRunParams,
        Uid,
        nowUUID,
        setNowUUID,
        setAllowDownloadReport,
        statusCards,
        getReportParams,
        setIsLastReport,
        setRunTaskNameEx
    } = props
    const [form] = Form.useForm()
    const [uploadLoading, setUploadLoading] = useState(false)

    const [portParams, setPortParams, getPortParams] = useGetState<PortScanParams>({
        Ports: "",
        Mode: "all",
        Targets: "",
        TargetsFile: "",
        ScriptNames: openScriptNames || [],
        // SYN Concurrent
        SynConcurrent: 1000,
        // Fingerprint Concurrent
        Concurrent: 50,
        Active: true,
        // Service Fingerprint Level
        ProbeMax: 100,
        // Active Detection Timeout
        ProbeTimeout: 7,
        // web/Service/all
        FingerprintMode: "all",
        Proto: ["tcp"],

        EnableBasicCrawler: true,
        BasicCrawlerRequestMax: 5,

        SaveToDB: true,
        SaveClosedPorts: false,
        EnableCClassScan: false,
        EnableBrute: true,
        SkippedHostAliveScan: false,
        HostAlivePorts: "22,80,443",
        ExcludeHosts: "",
        ExcludePorts: "",
        Proxy: [],
        HostAliveConcurrent: 200
    })

    const [bruteParams, setBruteParams, getBruteParams] = useGetState<StartBruteParams>({
        Concurrent: 50,
        DelayMax: 5,
        DelayMin: 1,
        OkToStop: true,
        PasswordFile: "",
        Passwords: [],
        PasswordsDict: [],
        ReplaceDefaultPasswordDict: true,
        PluginScriptName: "",
        Prefix: "",
        TargetFile: "",
        TargetTaskConcurrent: 1,
        Targets: "",
        Type: "",
        UsernameFile: "",
        Usernames: [],
        UsernamesDict: [],
        ReplaceDefaultUsernameDict: true,

        usernameValue: "",
        passwordValue: ""
    })
    const [_, setScanType, getScanType] = useGetState<string>("Basic Scan")
    const [checkedList, setCheckedList, getCheckedList] = useGetState<CheckboxValueType[]>(["Weak Password"])
    const [__, setScanDeep, getScanDeep] = useGetState<number>(3)
    const isInputValue = useRef<boolean>(false)
    // Speed Modified?
    const isSetSpeed = useRef<number>()

    useEffect(() => {
        let obj: any = {}
        if (getScanType() === "Special Scan" && !getCheckedList().includes("Weak Password")) {
            obj.EnableBrute = false
        } else {
            obj.EnableBrute = true
        }
        switch (getScanDeep()) {
            // Fast
            case 3:
                setPortParams({...portParams, ...obj, Ports: PresetPorts["fast"]})
                break
            // Medium
            case 2:
                setPortParams({...portParams, ...obj, Ports: PresetPorts["middle"]})
                break
            // Slow
            case 1:
                setPortParams({...portParams, ...obj, Ports: PresetPorts["slow"]})
                break
        }
    }, [getScanDeep(), getScanType(), getCheckedList()])

    // Continue Task Block
    const [shield, setShield] = useState<boolean>(false)

    useEffect(() => {
        if (oldRunParams) {
            const {LastRecord, PortScanRequest} = oldRunParams
            const {Targets, TargetsFile} = PortScanRequest
            setPortParams({...portParams, Targets, TargetsFile})
            setShield(true)
        }
    }, [oldRunParams])

    useEffect(() => {
        if (YakScriptOnlineGroup) {
            let arr: string[] = YakScriptOnlineGroup.split(",")
            let selectArr: any[] = []
            arr.map((item) => {
                switch (item) {
                    case "Weak Password":
                        selectArr.push("Weak Password")
                        break
                    default:
                        setScanType(item)
                        break
                }
            })
            if (selectArr.length > 0) {
                setCheckedList(selectArr)
                setScanType("Custom")
            }
        }
    }, [YakScriptOnlineGroup])

    useEffect(() => {
        if (!isInputValue.current) {
            // TaskName-Timestamp-Target
            let taskNameTimeTarget: string = moment(new Date()).unix().toString()
            if (portParams?.Targets && portParams.Targets.length > 0) {
                taskNameTimeTarget = portParams.Targets.split(",")[0].split(/\n/)[0]
            }

            form.setFieldsValue({
                TaskName: `${getScanType()}-${taskNameTimeTarget}`
            })
            setRunTaskName(`${getScanType()}-${taskNameTimeTarget}`)
        }
    }, [getScanType(), executing, portParams?.Targets])

    useEffect(() => {
        if (TaskName) {
            form.setFieldsValue({
                TaskName: TaskName || "Vulnerability Scan Task"
            })
        }
    }, [TaskName])

    // Save Task
    const saveTask = (v?: string) => {
        const cacheData = v ? JSON.parse(v) : false
        let newParams: PortScanParams = {...getPortParams()}
        const OnlineGroup: string = getScanType() !== "Special Scan" ? getScanType() : [...checkedList].join(",")
        let StartBruteParams: StartBruteParams = {...getBruteParams()}
        // Cache Task Report Params for Recovery -- If DOM closed directly, report can't be stored
        const ReportParams = getReportParams()
        if (oldRunParams) {
            const {LastRecord, PortScanRequest} = oldRunParams
            ipcRenderer.invoke(
                "SaveCancelSimpleDetect",
                cacheData || {
                    LastRecord,
                    StartBruteParams,
                    PortScanRequest,
                    ExtraInfo: JSON.stringify({statusCards, Params: ReportParams})
                }
            )
        } else {
            ipcRenderer.invoke(
                "SaveCancelSimpleDetect",
                cacheData || {
                    LastRecord: {
                        LastRecordPtr: filePtrValue,
                        Percent: percent,
                        YakScriptOnlineGroup: OnlineGroup,
                        ExtraInfo: JSON.stringify({statusCards, Params: ReportParams})
                    },
                    StartBruteParams,
                    PortScanRequest: {...newParams, TaskName: runTaskName}
                }
            )
        }
        delSimpleInfo(token)
    }

    // Update Destroy Params
    useDebounceEffect(() => {
        let obj = {}
        if (oldRunParams) {
            const {LastRecord, PortScanRequest} = oldRunParams
            obj = {
                LastRecord,
                PortScanRequest
            }
        } else {
            let newParams: PortScanParams = {...getPortParams()}
            const OnlineGroup: string = getScanType() !== "Special Scan" ? getScanType() : [...checkedList].join(",")
            obj = {
                LastRecord: {
                    LastRecordPtr: filePtrValue,
                    Percent: percent,
                    YakScriptOnlineGroup: OnlineGroup
                },
                PortScanRequest: {...newParams, TaskName: runTaskName}
            }
        }
        setSimpleInfo(token, executing, JSON.stringify(obj))
    }, [executing, oldRunParams, filePtrValue, percent, getScanType(), runTaskName])

    useEffect(() => {
        return () => {
            // Task Running
            SimpleCloseInfo[token]?.status && saveTask(SimpleCloseInfo[token].info)
        }
    }, [])

    const run = (TaskName: string) => {
        setPercent(0)
        setRunPluginCount(getPortParams().ScriptNames.length)

        reset()
        setRunTaskName(TaskName)
        setExecuting(true)
        let newParams: PortScanParams = {...getPortParams()}
        let StartBruteParams: StartBruteParams = {...getBruteParams()}

        switch (getScanDeep()) {
            // Fast
            case 3:
                // Fingerprint Concurrent
                newParams.Concurrent = 100
                // SYN Concurrent
                newParams.SynConcurrent = 2000
                newParams.ProbeTimeout = 3
                // Fingerprint Detail Level
                newParams.ProbeMax = 3
                break
            // Medium
            case 2:
                newParams.Concurrent = 80
                newParams.SynConcurrent = 1000
                newParams.ProbeTimeout = 5
                newParams.ProbeMax = 5
                break
            // Slow
            case 1:
                newParams.Concurrent = 50
                newParams.SynConcurrent = 1000
                newParams.ProbeTimeout = 7
                newParams.ProbeMax = 7
                break
        }
        let LastRecord = {}
        const runTaskNameEx = TaskName + "-" + nowUUID
        setRunTaskNameEx(runTaskNameEx)
        let PortScanRequest = {...newParams, TaskName: runTaskNameEx}
        setAllowDownloadReport(true)
        console.log("SimpleDetect", {
            LastRecord,
            StartBruteParams,
            PortScanRequest
        })
        ipcRenderer.invoke(
            "SimpleDetect",
            {
                LastRecord,
                StartBruteParams,
                PortScanRequest
            },
            token
        )
    }

    const recoverRun = () => {
        // Change Latest UUID
        const uuid: string = uuidv4()
        setNowUUID(uuid)
        reset()
        setExecuting(true)
        setIsLastReport(false)
        ipcRenderer.invoke("RecoverSimpleDetectUnfinishedTask", {Uid}, token)
    }

    const onFinish = useMemoizedFn((values) => {
        const {TaskName} = values
        if (!portParams.Targets && !portParams.TargetsFile) {
            warn("Set Scan Target")
            return
        }
        if (TaskName.length === 0) {
            warn("Enter Task Name")
            return
        }
        if (getScanType() === "Special Scan" && getCheckedList().length === 0) {
            warn("Select Custom Content")
            return
        }
        if (portParams.Ports.length === 0) {
            warn("Select or Enter Scan Ports")
            return
        }
        debugger
        let OnlineGroup: string = ""
        if (getScanType() !== "Special Scan") {
            OnlineGroup = getScanType()
        } else {
            // Exclude brute-force when no weak passwords in plugin group
            if (!groupWeakPwdFlag) {
                OnlineGroup = [...checkedList].filter((name) => name !== "Weak Password").join(",")
            } else {
                OnlineGroup = [...checkedList].join(",")
            }
        }

        // Check if weak password is for brute-force only
        const blastingWeakPwdFlag = checkedList.length === 1 && checkedList.includes("Weak Password") && !groupWeakPwdFlag
        // Continue Task Param Intercept
        if (Uid) {
            recoverRun()
        }
        // On Redirect with Params
        else if (Array.isArray(openScriptNames)) {
            run(TaskName)
        }
        // Only brute-force weak password option checked
        else if (blastingWeakPwdFlag && OnlineGroup !== "Basic Scan") {
            setPortParams({...getPortParams(), ScriptNames: []})
            run(TaskName)
        } else {
            ipcRenderer
                .invoke("QueryYakScriptByOnlineGroup", {OnlineGroup})
                .then((data: {Data: YakScript[]}) => {
                    const ScriptNames: string[] = data.Data.map((item) => item.OnlineScriptName)
                    setPortParams({...getPortParams(), ScriptNames})
                    run(TaskName)
                })
                .catch((e) => {
                    failed(`Scan Mode Query Failed:${e}`)
                })
                .finally(() => {})
        }
    })

    const onCancel = useMemoizedFn(() => {
        if (Uid) {
            ipcRenderer.invoke("cancel-RecoverSimpleDetectUnfinishedTask", token)
        } else {
            ipcRenderer.invoke("cancel-SimpleDetect", token)
        }
        saveTask()
    })

    const judgeExtra = () => {
        let str: string = ""
        switch (getScanType()) {
            case "Basic Scan":
                str = "Compliance, Weak Password, Partial Vulnerability Checks"
                break
            case "Special Scan":
                str = "Special Vulnerability Scan for Various Scenarios"
                break
        }
        return str
    }

    const simpleDetectRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(simpleDetectRef)
    const [plainOptions, setPlainOptions] = useState<string[]>([])
    const [groupWeakPwdFlag, setGroupWeakPwdFlag] = useState<boolean>(false) // Mark whether weak password is group-specific or brute-force default
    const getPluginGroup = (callBack?: () => void) => {
        apiFetchQueryYakScriptGroupLocal(false)
            .then((group: GroupCount[]) => {
                const copyGroup = structuredClone(group)
                let groups: string[] = copyGroup.map((item) => item.Value)
                if (groups.includes("Basic Scan")) {
                    groups = groups.filter((item) => item !== "Basic Scan")
                }
                if (!groups.includes("Weak Password")) {
                    setGroupWeakPwdFlag(false)
                    groups.push("Weak Password") // Insert default brute-force weak password
                } else {
                    setGroupWeakPwdFlag(true)
                }
                const checked = checkedList.filter((item) => groups.includes(item + ""))
                setCheckedList(checked)
                setPlainOptions(groups)
            })
            .finally(() => {
                callBack && callBack()
            })
    }
    useEffect(() => {
        getPluginGroup()
    }, [inViewport, refreshPluginGroup])

    return (
        <div className={styles["simple-detect-form"]} style={{marginTop: 20}} ref={simpleDetectRef}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Spin spinning={uploadLoading}>
                    <ContentUploadInput
                        type='textarea'
                        dragger={{
                            disabled: executing || shield
                        }}
                        beforeUpload={(f) => {
                            const typeArr: string[] = [
                                "text/plain",
                                ".csv",
                                ".xls",
                                ".xlsx",
                                "application/vnd.ms-excel",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            ]
                            if (!typeArr.includes(f.type)) {
                                failed(`${f.name}Non-txt/Excel, Upload txt/Excel！`)
                                return false
                            }
                            setUploadLoading(true)
                            const TargetsFile = getPortParams().TargetsFile
                            const absPath: string = (f as any).path
                            // On File Upload
                            if (TargetsFile && TargetsFile?.length > 0) {
                                let arr = TargetsFile.split(",")
                                // Limit Max 3 File Uploads
                                if (arr.length >= 3) {
                                    info("Max 3 Files Upload")
                                    setUploadLoading(false)
                                    return
                                }
                                // Add if Not Present
                                if (!arr.includes(absPath)) {
                                    setPortParams({...portParams, TargetsFile: `${TargetsFile},${absPath}`})
                                } else {
                                    info("Path Exists, Do Not Reupload")
                                }
                            } // No Files Uploaded
                            else {
                                setPortParams({...portParams, TargetsFile: absPath})
                            }
                            setUploadLoading(false)
                            return false
                        }}
                        item={{
                            style: {textAlign: "left"},
                            label: "Scan Target:"
                        }}
                        textarea={{
                            isBubbing: true,
                            setValue: (Targets) => setPortParams({...portParams, Targets}),
                            value: portParams.Targets,
                            rows: 1,
                            placeholder: "Domain/Host/IP/IP ranges, comma-separated or line-split",
                            disabled: executing || shield
                        }}
                        otherHelpNode={
                            <>
                                <span className={styles["help-hint-title"]}>
                                    <Checkbox
                                        onClick={(e) => {
                                            setPortParams({
                                                ...portParams,
                                                SkippedHostAliveScan: !portParams.SkippedHostAliveScan
                                            })
                                        }}
                                        checked={portParams.SkippedHostAliveScan}
                                    >
                                        Skip Host Alive Check
                                    </Checkbox>
                                </span>
                                <span
                                    onClick={() => {
                                        let m = showDrawer({
                                            title: "Advanced Settings",
                                            width: "60%",
                                            onClose: () => {
                                                isSetSpeed.current = getScanDeep()
                                                m.destroy()
                                            },
                                            content: (
                                                <>
                                                    <ScanPortForm
                                                        isSetPort={isSetSpeed.current !== getScanDeep()}
                                                        deepLevel={getScanDeep()}
                                                        isSimpleDetectShow={true}
                                                        defaultParams={portParams}
                                                        setParams={(value) => {
                                                            setPortParams(value)
                                                        }}
                                                        bruteParams={bruteParams}
                                                        setBruteParams={setBruteParams}
                                                    />
                                                </>
                                            )
                                        })
                                    }}
                                    className={styles["help-hint-title"]}
                                >
                                    More Params
                                </span>
                                <span
                                    onClick={() => {
                                        showUnfinishedSimpleDetectTaskList((task: UnfinishedSimpleDetectBatchTask) => {
                                            ipcRenderer.invoke("send-to-tab", {
                                                type: "simple-batch-exec-recover",
                                                data: task
                                            })
                                        })
                                    }}
                                    className={styles["help-hint-title"]}
                                >
                                    Unfinished Tasks
                                </span>
                            </>
                        }
                        suffixNode={
                            executing ? (
                                <Button type='primary' danger disabled={!executing} onClick={onCancel}>
                                    Stop Task Now
                                </Button>
                            ) : (
                                <Button type='primary' htmlType='submit' disabled={isDownloadPlugin}>
                                    Start Detection
                                </Button>
                            )
                        }
                    />
                </Spin>
                {getPortParams().TargetsFile && (
                    <Form.Item label=' ' colon={false}>
                        {getPortParams()
                            .TargetsFile?.split(",")
                            .map((item: string) => {
                                return (
                                    <div className={styles["upload-file-item"]}>
                                        <div className={styles["text"]}>
                                            <PaperClipOutlined
                                                style={{
                                                    marginRight: 8,
                                                    color: "#666666"
                                                }}
                                            />
                                            {item.substring(item.lastIndexOf("\\") + 1)}
                                        </div>
                                        {!executing && !!!oldRunParams && (
                                            <DeleteOutlined
                                                className={styles["icon"]}
                                                onClick={() => {
                                                    let arr = getPortParams().TargetsFile?.split(",") || []
                                                    let str = arr?.filter((itemIn: string) => itemIn !== item).join(",")
                                                    setPortParams({...portParams, TargetsFile: str})
                                                }}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                    </Form.Item>
                )}
                <div style={executing ? {display: "none"} : {}}>
                    <Form.Item name='scan_type' label='Scan Mode' extra={judgeExtra()}>
                        <Radio.Group
                            buttonStyle='solid'
                            defaultValue={"Basic Scan"}
                            onChange={(e) => {
                                setScanType(e.target.value)
                            }}
                            value={getScanType()}
                            disabled={shield}
                        >
                            <Radio.Button value='Basic Scan'>Basic Scan</Radio.Button>
                            <Radio.Button value='Special Scan'>Special Scan</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {getScanType() === "Special Scan" && (
                        <Form.Item label=' ' colon={false} style={{marginTop: "-16px"}}>
                            <CheckboxGroup
                                disabled={shield}
                                options={plainOptions}
                                value={checkedList}
                                onChange={(list) => setCheckedList(list)}
                            />
                        </Form.Item>
                    )}

                    <div style={{display: "none"}}>
                        <Form.Item name='TaskName' label='Task Name'>
                            <Input
                                disabled={shield}
                                style={{width: 400}}
                                placeholder='Enter Task Name'
                                allowClear
                                onChange={() => {
                                    isInputValue.current = true
                                }}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item name='scan_deep' label='Scan Speed' style={{position: "relative"}}>
                        <Slider
                            tipFormatter={null}
                            value={getScanDeep()}
                            onChange={(value) => setScanDeep(value)}
                            style={{width: 400}}
                            min={1}
                            max={3}
                            marks={marks}
                            disabled={shield}
                        />
                        <div style={{position: "absolute", top: 26, fontSize: 12, color: "gray"}}>
                            Slower Scan, More Detailed Results
                        </div>
                    </Form.Item>
                </div>
            </Form>
        </div>
    )
}

export interface SimpleDetectTableProps {
    token: string
    executing: boolean
    runTaskName?: string
    runPluginCount?: number
    infoState: InfoState
    setExecuting: (v: boolean) => void
    nowUUID: string
    allowDownloadReport: boolean
    ref: any
    oldRunParams?: OldRunParamsProps
    isLastReport: boolean
    runTaskNameEx?: string
}

export const SimpleDetectTable: React.FC<SimpleDetectTableProps> = React.forwardRef((props, ref) => {
    const {
        token,
        executing,
        runTaskName,
        runPluginCount,
        infoState,
        setExecuting,
        nowUUID,
        allowDownloadReport,
        oldRunParams,
        isLastReport,
        runTaskNameEx
    } = props

    const [openPorts, setOpenPorts] = useState<YakitPort[]>([])
    const openPort = useRef<YakitPort[]>([])
    // Download Report Modal
    const [reportModalVisible, setReportModalVisible] = useState<boolean>(false)
    const [reportName, setReportName] = useState<string>(runTaskName || "Default Report Name")
    const [reportLoading, setReportLoading] = useState<boolean>(false)
    const [_, setReportId, getReportId] = useGetState<number>()
    // Allow TaskName Change?
    const isSetTaskName = useRef<boolean>(true)
    // Report Token
    const [reportToken, setReportToken] = useState(randomString(40))
    // Show Report Gen. Progress?
    const [showReportPercent, setShowReportPercent] = useState<boolean>(false)
    // Report Gen. Progress
    const [reportPercent, setReportPercent] = useState(0)

    useEffect(() => {
        if (!reportModalVisible) {
            setReportLoading(false)
            setShowReportPercent(false)
            ipcRenderer.invoke("cancel-ExecYakCode", reportToken)
        }
    }, [reportModalVisible])

    useEffect(() => {
        // Report Gen. Successful
        if (getReportId()) {
            setReportLoading(false)
            setShowReportPercent(false)
            setReportPercent(0)
            setReportModalVisible(false)
            ipcRenderer.invoke("open-route-page", {route: YakitRoute.DB_Report})
            setTimeout(() => {
                ipcRenderer.invoke("simple-open-report", getReportId())
            }, 300)
        }
    }, [getReportId()])

    useEffect(() => {
        if (executing) {
            openPort.current = []
            executing && setOpenPorts([])
        }
        // Re-execute Task, Reset Report Name Entered
        runTaskName && setReportName(runTaskName)
        isSetTaskName.current = true
    }, [executing])

    useEffect(() => {
        if (runTaskName && isSetTaskName.current) {
            setReportName(runTaskName)
        }
    }, [runTaskName])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let messageJsonRaw = Buffer.from(data.Message).toString("utf8")
                    let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw))
                    if (!logInfo) return

                    if (logInfo.isOpen) {
                        openPort.current.unshift(logInfo)
                        // Limit 20 Records
                        openPort.current = openPort.current.slice(0, 20)
                    } else {
                        // closedPort.current.unshift(logInfo)
                    }
                } catch (e) {
                    failed("Failed to Parse Port Scan Results...")
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[SimpleDetect] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[SimpleDetect] finished")
            setExecuting(false)
        })

        const syncPorts = () => {
            if (openPort.current) setOpenPorts([...openPort.current])
        }

        syncPorts()
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-SimpleDetect", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    /** Open Management Page in App */
    const openMenu = () => {
        ipcRenderer.invoke("open-route-page", {route: YakitRoute.DB_Risk})
    }
    /** Fetch Report Gen. Result */
    useEffect(() => {
        ipcRenderer.on(`${reportToken}-data`, (e, data: ExecResult) => {
            if (data.IsMessage) {
                // console.log("Fetch Report Gen. Result", new Buffer(data.Message).toString())
                const obj = JSON.parse(new Buffer(data.Message).toString())
                if (obj?.type === "progress") {
                    setReportPercent(obj.content.progress)
                }
                setReportId(parseInt(obj.content.data))
            }
        })
        return () => {
            ipcRenderer.removeAllListeners(`${reportToken}-data`)
        }
    }, [reportToken])
    /** Notify Report Gen. */
    const creatReport = () => {
        setReportId(undefined)
        setReportModalVisible(true)
    }

    /** Fetch Scanned Hosts & Ports Count */
    const getCardForId = (id: string) => {
        const item = infoState.statusState.filter((item) => item.tag === id)
        if (item.length > 0) {
            return item[0].info[0].Data
        }
        return null
    }

    /** Differentiate Continue/New Task, Get Scan Hosts, Ping Alive Hosts */
    const getCardByJudgeOld = (v: "Scanned Hosts Count" | "Alive Hosts Count") => {
        if (oldRunParams && oldRunParams.LastRecord.ExtraInfo) {
            let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
            const oldItem: StatusCardInfoProps[] = oldCards.filter((item) =>
                ["Alive Hosts Count/Scanned Hosts Count"].includes(item.tag)
            )
            if (oldItem.length > 0) {
                let strArr: string[] = oldItem[0].info[0].Data.split("/")
                if (v === "Alive Hosts Count") return strArr[0]
                else return strArr[strArr.length - 1]
            }
            return getCardForId(v)
        } else {
            return getCardForId(v)
        }
    }

    /** Download Report */
    const downloadReport = () => {
        // Script Data
        const scriptData = CreatReportScript
        let Params = [
            {Key: "task_name", Value: runTaskNameEx},
            {Key: "runtime_id", Value: getCardForId("RuntimeIDFromRisks")},
            {Key: "report_name", Value: reportName},
            {Key: "plugins", Value: runPluginCount},
            {Key: "host_total", Value: getCardByJudgeOld("Scanned Hosts Count")},
            {Key: "ping_alive_host_total", Value: getCardByJudgeOld("Alive Hosts Count")},
            {Key: "port_total", Value: getCardForId("Scanned Ports Count")}
        ]
        // Old Report Generation
        if (oldRunParams && isLastReport) {
            let oldParams: CacheReportParamsProps[] = (JSON.parse(oldRunParams.LastRecord.ExtraInfo) || [])?.Params
            if (oldParams) {
                Params = oldParams
            }
        }
        const reqParams = {
            Script: scriptData,
            Params
        }
        ipcRenderer.invoke("ExecYakCode", reqParams, reportToken)
    }

    // Cache Report Params - For Report Generation
    // Pass child component via forwardYes to parent。
    // Pass child component ref to childRef via ref callback。
    React.useImperativeHandle(ref, () => ({
        getReportParams: () => {
            return [
                {Key: "task_name", Value: runTaskNameEx},
                {Key: "runtime_id", Value: getCardForId("RuntimeIDFromRisks")},
                {Key: "report_name", Value: reportName},
                {Key: "plugins", Value: runPluginCount},
                {Key: "host_total", Value: getCardByJudgeOld("Scanned Hosts Count")},
                {Key: "ping_alive_host_total", Value: getCardByJudgeOld("Alive Hosts Count")},
                {Key: "port_total", Value: getCardForId("Scanned Ports Count")}
            ]
        }
    }))

    return (
        <div className={styles["simple-detect-table"]}>
            <div className={styles["result-table-body"]}>
                <Tabs
                    className='scan-port-tabs'
                    tabBarStyle={{marginBottom: 5}}
                    tabBarExtraContent={
                        <div>
                            {!executing && allowDownloadReport ? (
                                <div className={styles["hole-text"]} onClick={creatReport}>
                                    Generate Report
                                </div>
                            ) : (
                                <div className={styles["disable-hole-text"]}>Generate Report</div>
                            )}
                        </div>
                    }
                >
                    {!!infoState.riskState && infoState.riskState.length > 0 && (
                        <Tabs.TabPane tab={`Stop Answering`} key={"risk"} forceRender>
                            <AutoCard
                                bodyStyle={{overflowY: "auto"}}
                                extra={
                                    <div className={styles["hole-text"]} onClick={openMenu}>
                                        View Full Vulnerability
                                    </div>
                                }
                            >
                                <Space direction={"vertical"} style={{width: "100%"}} size={12}>
                                    {infoState.riskState.slice(0, 10).map((i) => {
                                        return <RiskDetails info={i} shrink={true} />
                                    })}
                                </Space>
                            </AutoCard>
                        </Tabs.TabPane>
                    )}

                    <Tabs.TabPane tab={"Scan Port List"} key={"scanPort"} forceRender>
                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                            <Row style={{marginTop: 6}} gutter={6}>
                                <Col span={24}>
                                    <OpenPortTableViewer data={openPorts} isSimple={true} />
                                </Col>
                            </Row>
                        </div>
                    </Tabs.TabPane>
                    {/* <Tabs.TabPane tab={"Plugin Logs"} key={"pluginPort"} forceRender>
                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                            <PluginResultUI
                                loading={false}
                                progress={[]}
                                results={infoState.messageState}
                                featureType={infoState.featureTypeState}
                                feature={infoState.featureMessageState}
                                statusCards={infoState.statusState}
                            />
                        </div>
                    </Tabs.TabPane> */}
                </Tabs>
            </div>
            <Modal
                title='Download Report'
                visible={reportModalVisible}
                footer={null}
                onCancel={() => {
                    setReportModalVisible(false)
                    if (reportPercent < 1 && reportPercent > 0) {
                        warn("Cancel Report Gen.")
                    }
                }}
            >
                <div>
                    <div style={{textAlign: "center"}}>
                        <Input
                            style={{width: 400}}
                            placeholder='Enter Task Name'
                            allowClear
                            value={reportName}
                            onChange={(e) => {
                                isSetTaskName.current = false
                                setReportName(e.target.value)
                            }}
                        />
                        {showReportPercent && (
                            <div style={{width: 400, margin: "0 auto"}}>
                                <Progress
                                    // status={executing ? "active" : undefined}
                                    percent={parseInt((reportPercent * 100).toFixed(0))}
                                />
                            </div>
                        )}
                    </div>
                    <div style={{marginTop: 20, textAlign: "right"}}>
                        <Button
                            style={{marginRight: 8}}
                            onClick={() => {
                                setReportModalVisible(false)
                                if (reportPercent < 1 && reportPercent > 0) {
                                    warn("Cancel Report Gen.")
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={reportLoading}
                            type={"primary"}
                            onClick={() => {
                                setReportLoading(true)
                                downloadReport()
                                setShowReportPercent(true)
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
})

interface DownloadAllPluginProps {
    type?: "modal" | "default"
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
    delAllPlugins?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose, delAllPlugins} = props
    const type = props.type || "default"
    // Global Login Status
    const {userInfo} = useStore()
    // Add All Progress Bar
    const [addLoading, setAddLoading] = useState<boolean>(false)
    // Add All Progress
    const [percent, setPercent, getPercent] = useGetState<number>(0)
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
                type === "default" && setAddLoading(false)
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
            warn("Download my plugins after login")
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
                failed(`Add Failed:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`Stop Adding Failed:${e}`)
        })
    }
    const onRemoveAllLocalPlugin = () => {
        // Delete All
        ipcRenderer
            .invoke("DeleteLocalPluginsByWhere", {})
            .then(() => {
                delAllPlugins && delAllPlugins()
                success("All Deleted Successfully")
            })
            .catch((e) => {
                failed(`Error Deleting All Local Plugins:${e}`)
            })
    }
    if (type === "modal") {
        return (
            <div className={styles["download-all-plugin-modal"]}>
                {addLoading ? (
                    <div>
                        <div>Download Progress</div>
                        <div className={styles["filter-opt-progress-modal"]}>
                            <Progress
                                size='small'
                                status={!addLoading && percent !== 0 ? "exception" : undefined}
                                percent={percent}
                            />
                        </div>
                        <div style={{textAlign: "center", marginTop: 10}}>
                            <Button type='primary' onClick={StopAllPlugin}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div>No plugins downloaded, can't perform security check, click here“One-Click Import”Download Plugins</div>
                        <div style={{textAlign: "center", marginTop: 10}}>
                            <Button type='primary' onClick={AddAllPlugin}>
                                One-Click Import
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )
    }
    return (
        <div className={styles["download-all-plugin"]}>
            {addLoading && (
                <div className={styles["filter-opt-progress"]}>
                    <Progress
                        size='small'
                        status={!addLoading && percent !== 0 ? "exception" : undefined}
                        percent={percent}
                    />
                </div>
            )}
            {addLoading ? (
                <Button style={{marginLeft: 12}} size='small' type='primary' danger onClick={StopAllPlugin}>
                    Exec Plugin Names Array
                </Button>
            ) : (
                <Popconfirm
                    title={"Confirm importing all data from store to local??"}
                    onConfirm={AddAllPlugin}
                    okText='Yes'
                    cancelText='No'
                    placement={"left"}
                >
                    <div className={styles["operation-text"]}>One-Click Import Plugins</div>
                </Popconfirm>
            )}
            {userInfo.role !== "admin" && (
                <Popconfirm
                    title={"Confirm clearing all local plug-in store data??"}
                    onConfirm={onRemoveAllLocalPlugin}
                    okText='Yes'
                    cancelText='No'
                    placement={"left"}
                >
                    <YakitButton type='text' colors='danger' className={styles["clean-local-plugin"]}>
                        One-Click Clear Plugins
                    </YakitButton>
                </Popconfirm>
            )}
        </div>
    )
}

export interface SimpleDetectProps {
    tabId?: string
    Uid?: string
    BaseProgress?: number
    YakScriptOnlineGroup?: string
    TaskName?: string
}

interface OldRunParamsProps {
    LastRecord: LastRecordProps
    PortScanRequest: any
}

interface CacheReportParamsProps {
    Key: string
    Value: any
}

export const OldSimpleDetect: React.FC<SimpleDetectProps> = (props) => {
    const {tabId, Uid, BaseProgress, YakScriptOnlineGroup, TaskName} = props
    // console.log("Uid-BaseProgress", Uid, BaseProgress, YakScriptOnlineGroup, TaskName)
    const [percent, setPercent] = useState(0)
    const [executing, setExecuting] = useState<boolean>(false)
    const [token, setToken] = useState(randomString(20))
    const [loading, setLoading] = useState<boolean>(false)
    // Open New Page with Task Params
    const [openScriptNames, setOpenScriptNames] = useState<string[]>()
    const [oldRunParams, setOldRunParams] = useState<OldRunParamsProps>()

    const [isDownloadPlugin, setDownloadPlugin] = useState<boolean>(false)

    // Click to run latest TaskName
    const [runTaskName, setRunTaskName] = useState<string>()
    // Fetch Latest UUID
    const uuid: string = uuidv4()
    const [___, setNowUUID, getNowUUID] = useGetState<string>(uuid)
    // Fetch Running Task Plugin Count
    const [runPluginCount, setRunPluginCount] = useState<number>()
    // Allow Report Download?
    const [allowDownloadReport, setAllowDownloadReport] = useState<boolean>(false)
    // Use Previous Task Params for Report?
    const [isLastReport, setIsLastReport] = useState<boolean>(false)
    const [infoState, {reset, setXtermRef, resetAll}] = useHoldingIPCRStream(
        "simple-scan",
        "SimpleDetect",
        token,
        () => {},
        () => {},
        (obj, content) => content.data.indexOf("isOpen") > -1 && content.data.indexOf("port") > -1
    )
    // Cache Latest Report Params for Report Generation
    const childRef = useRef<any>()

    // Drag ResizeBox?
    const isResize = useRef<boolean>(false)
    // Set ResizeBox Height
    const [__, setResizeBoxSize, getResizeBoxSize] = useGetState<string>("430px")

    // Show Previous Cards?
    const [showOldCard, setShowOldCard] = useState<boolean>(false)

    // Refresh to get plugin group after downloading plugins
    const [refreshPluginGroup, setRefreshPluginGroup] = useState<number>(Math.random())

    const statusErrorCards = infoState.statusState.filter((item) => ["Plugin Load Failed", "SYN Scan Failed"].includes(item.tag))
    const statusSucceeCards = infoState.statusState.filter((item) =>
        ["Load Plugins", "Vulnerability/Risk/Parse content in plugin backend stream", "Open Ports Count/Scanned Hosts Count", "Alive Hosts Count/Scanned Hosts Count"].includes(item.tag)
    )
    const statusCards = useMemo(() => {
        if (statusErrorCards.length > 0) {
            return statusErrorCards
        }
        return statusSucceeCards
    }, [statusErrorCards, statusSucceeCards])

    // Distinguish Card Rendering
    const Cards = useMemo(() => {
        if (showOldCard && oldRunParams && oldRunParams.LastRecord.ExtraInfo) {
            let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
            return Array.isArray(oldCards) ? oldCards : []
        }
        // Continue running task, keep previous alive hosts count/Scan Host Data
        else if (oldRunParams && oldRunParams.LastRecord.ExtraInfo) {
            let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
            const oldItem: StatusCardInfoProps[] = oldCards.filter((item) =>
                ["Alive Hosts Count/Scanned Hosts Count"].includes(item.tag)
            )
            const nowStatusCards: StatusCardInfoProps[] = statusCards.filter(
                (item) => item.tag !== "Alive Hosts Count/Scanned Hosts Count"
            )
            return [...oldItem, ...nowStatusCards]
        }
        return statusCards
    }, [statusCards, showOldCard, oldRunParams])

    const filePtr = infoState.statusState.filter((item) => ["Current File Pointer"].includes(item.tag))
    const filePtrValue: number = Array.isArray(filePtr) ? parseInt(filePtr[0]?.info[0]?.Data) : 0

    const [runTaskNameEx, setRunTaskNameEx] = useState<string>()
    useEffect(() => {
        if (statusCards.length > 0) {
            setShowOldCard(false)
        }
        if (!isResize.current) {
            if (executing) {
                let cards: any = statusCards
                if (oldRunParams && showOldCard && oldRunParams.LastRecord.ExtraInfo) {
                    let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
                    cards = Array.isArray(oldCards) ? oldCards : []
                }
                cards.length === 0 ? setResizeBoxSize("160px") : setResizeBoxSize("270px")
            } else {
                let cards: any = statusCards
                if (oldRunParams && showOldCard && oldRunParams.LastRecord.ExtraInfo) {
                    let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
                    cards = Array.isArray(oldCards) ? oldCards : []
                }
                cards.length === 0 ? setResizeBoxSize("350px") : setResizeBoxSize("455px")
            }
        }
    }, [executing, statusCards.length, showOldCard, oldRunParams])

    useEffect(() => {
        if (BaseProgress !== undefined && BaseProgress > 0) {
            setPercent(BaseProgress)
        }
        if (infoState.processState.length > 0) {
            setPercent(infoState.processState[0].progress)
        }
    }, [BaseProgress, infoState.processState])

    useEffect(() => {
        if (Uid) {
            setAllowDownloadReport(true)
            setLoading(true)
            ipcRenderer
                .invoke("GetSimpleDetectUnfinishedTaskByUid", {
                    Uid
                })
                .then(({LastRecord, PortScanRequest}) => {
                    setIsLastReport(true)
                    setShowOldCard(true)
                    const {ScriptNames, TaskName} = PortScanRequest
                    setOldRunParams({
                        LastRecord,
                        PortScanRequest
                    })
                    setOpenScriptNames(ScriptNames)
                    setRunTaskNameEx(TaskName)
                })
                .catch((e) => {
                    console.info(e)
                })
                .finally(() => setTimeout(() => setLoading(false), 600))
        }
    }, [Uid])

    useEffect(() => {
        if (tabId) {
            let status = ""
            if (executing) {
                status = "run"
            }
            if (percent > 0 && percent < 1 && !executing) {
                status = "stop"
            }
            if (percent === 1 && !executing) {
                status = "success"
            }
            let obj = {
                tabId,
                status
            }
            !!status && emiter.emit("simpleDetectTabEvent", JSON.stringify(obj))
        }
    }, [percent, executing, tabId])

    const timelineItemProps = (infoState.messageState || [])
        .filter((i) => {
            return i.level === "info"
        })
        .splice(0, 3)
    return (
        <>
            {loading && <Spin tip={"Resuming unfinished tasks"} />}
            <div className={styles["simple-detect"]} style={loading ? {display: "none"} : {}}>
                <ResizeBox
                    isVer={true}
                    firstNode={
                        <AutoCard
                            size={"small"}
                            bordered={false}
                            title={
                                !executing ? (
                                    <DownloadAllPlugin
                                        setDownloadPlugin={setDownloadPlugin}
                                        delAllPlugins={() => {
                                            setRefreshPluginGroup(Math.random())
                                        }}
                                        onClose={() => {
                                            setRefreshPluginGroup(Math.random())
                                        }}
                                    />
                                ) : null
                            }
                            bodyStyle={{display: "flex", flexDirection: "column", padding: "0 5px", overflow: "hidden"}}
                        >
                            <Row>
                                {(percent > 0 || executing) && (
                                    <Col span={6}>
                                        <div style={{display: "flex"}}>
                                            <span style={{marginRight: 10}}>Task Progress:</span>
                                            <div style={{flex: 1}}>
                                                <Progress
                                                    status={executing ? "active" : undefined}
                                                    percent={parseInt((percent * 100).toFixed(0))}
                                                />
                                            </div>
                                        </div>

                                        <Timeline
                                            pending={loading}
                                            style={{marginTop: 10, marginBottom: 10, maxHeight: 90}}
                                        >
                                            {(timelineItemProps || []).map((e, index) => {
                                                return (
                                                    <div key={index} className={styles["log-list"]}>
                                                        [{formatTimestamp(e.timestamp, true)}]: {e.data}
                                                    </div>
                                                )
                                            })}
                                        </Timeline>
                                    </Col>
                                )}
                                <Col span={percent > 0 || executing ? 18 : 24}>
                                    <SimpleDetectForm
                                        refreshPluginGroup={refreshPluginGroup}
                                        executing={executing}
                                        setPercent={setPercent}
                                        percent={percent}
                                        setExecuting={setExecuting}
                                        token={token}
                                        openScriptNames={openScriptNames}
                                        YakScriptOnlineGroup={YakScriptOnlineGroup}
                                        isDownloadPlugin={isDownloadPlugin}
                                        baseProgress={BaseProgress}
                                        TaskName={TaskName}
                                        runTaskName={runTaskName}
                                        setRunTaskName={setRunTaskName}
                                        setRunPluginCount={setRunPluginCount}
                                        reset={resetAll}
                                        filePtrValue={filePtrValue}
                                        oldRunParams={oldRunParams}
                                        Uid={Uid}
                                        nowUUID={getNowUUID()}
                                        setNowUUID={setNowUUID}
                                        setAllowDownloadReport={setAllowDownloadReport}
                                        // Card Storage
                                        statusCards={statusCards}
                                        getReportParams={() => {
                                            if (childRef.current) {
                                                return childRef.current.getReportParams()
                                            }
                                            return []
                                        }}
                                        setIsLastReport={setIsLastReport}
                                        setRunTaskNameEx={setRunTaskNameEx}
                                    />
                                </Col>
                            </Row>

                            <Divider style={{margin: 4}} />

                            <SimpleCardBox statusCards={Cards} />
                        </AutoCard>
                    }
                    firstMinSize={"200px"}
                    firstRatio={getResizeBoxSize()}
                    secondMinSize={200}
                    onChangeSize={() => {
                        isResize.current = true
                    }}
                    secondNode={() => {
                        return (
                            <SimpleDetectTable
                                token={token}
                                executing={executing}
                                runTaskName={runTaskName}
                                runPluginCount={runPluginCount}
                                infoState={infoState}
                                setExecuting={setExecuting}
                                nowUUID={getNowUUID()}
                                allowDownloadReport={allowDownloadReport}
                                ref={childRef}
                                oldRunParams={oldRunParams}
                                isLastReport={isLastReport}
                                runTaskNameEx={runTaskNameEx}
                            />
                        )
                    }}
                />
            </div>
        </>
    )
}
