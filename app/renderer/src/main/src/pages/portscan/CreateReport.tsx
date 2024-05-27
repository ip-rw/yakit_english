import React, {useEffect, memo, useRef, useState} from "react"
import {Button, Input, Modal, Progress} from "antd"
import {useGetState, useMemoizedFn} from "ahooks"
import styles from "./CreateReport.module.scss"
import {failed, warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "../invoker/schema"
import {CreatReportScript} from "../simpleDetect/CreatReportScript"
import {InfoState} from "@/hook/useHoldingIPCRStream"
import {YakitRoute} from "@/routes/newRoute"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    CreatReportRequest,
    apiCancelSimpleDetectCreatReport,
    apiSimpleDetectCreatReport
} from "../securityTool/newPortScan/utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")
export interface CreateReportProps {
    loading: boolean
    infoState: InfoState
    runPluginCount: number
    targets: string
    allowDownloadReport: boolean
    nowUUID: string
    setAllowDownloadReport: (v: boolean) => void
}
export const CreateReport: React.FC<CreateReportProps> = memo((props) => {
    const {loading, infoState, runPluginCount, targets, allowDownloadReport, nowUUID, setAllowDownloadReport} = props

    // Download Report Modal
    const [reportModalVisible, setReportModalVisible] = useState<boolean>(false)
    const [reportName, setReportName] = useState<string>("Default Report Name")
    const [reportLoading, setReportLoading] = useState<boolean>(false)
    const [_, setReportId, getReportId] = useGetState<number>()
    // Allow TaskName Change?
    const isSetTaskName = useRef<boolean>(true)
    // Report Gen. Progress
    const [reportPercent, setReportPercent] = useState(0)
    // Report Token
    const [reportToken, setReportToken] = useState(randomString(40))
    // Show Report Gen. Progress?
    const [showReportPercent, setShowReportPercent] = useState<boolean>(false)

    useEffect(() => {
        if (isSetTaskName.current) {
            const defaultReportName = `${targets.split(",")[0].split(/\n/)[0]}Risk Assessment Report`
            setReportName(defaultReportName)
        }
    }, [targets])

    useEffect(() => {
        if (!reportModalVisible) {
            setReportLoading(false)
            setShowReportPercent(false)
            ipcRenderer.invoke("cancel-ExecYakCode", reportToken)
        }
    }, [reportModalVisible])
    /** Notify Report Gen. */
    const creatReport = () => {
        setReportId(undefined)
        setReportModalVisible(true)
    }
    /** Fetch Report Gen. Result */
    useEffect(() => {
        ipcRenderer.on(`${reportToken}-data`, (e, data: ExecResult) => {
            if (data.IsMessage) {
                // console.log("Fetch Report Gen. Result", new Buffer(data.Message).toString())
                const obj = JSON.parse(new Buffer(data.Message).toString())
                console.log(obj)
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

    useEffect(() => {
        // Report Gen. Successful
        if (getReportId()) {
            setReportLoading(false)
            setShowReportPercent(false)
            setReportPercent(0)
            setReportModalVisible(false)
            // ipcRenderer.invoke("open-user-manage", YakitRoute.DB_Report)
            emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.DB_Report}))
            setTimeout(() => {
                ipcRenderer.invoke("simple-open-report", getReportId())
            }, 300)
        }
    }, [getReportId()])

    /** Fetch Scanned Hosts & Ports Count */
    const getCardForId = (id: string) => {
        const item = infoState.statusState.filter((item) => item.tag === id)
        if (item.length > 0) {
            return item[0].info[0].Data
        }
        return null
    }
    /** Download Report */
    const downloadReport = () => {
        // Script Data
        const scriptData = CreatReportScript
        const runTaskNameEx = reportName + "-" + nowUUID
        let Params = [
            {Key: "task_name", Value: runTaskNameEx},
            {Key: "runtime_id", Value: getCardForId("RuntimeIDFromRisks")},
            {Key: "report_name", Value: reportName},
            {Key: "plugins", Value: runPluginCount},
            {Key: "host_total", Value: getCardForId("Scanned Hosts Count")},
            {Key: "ping_alive_host_total", Value: getCardForId("Alive Hosts Count")},
            {Key: "port_total", Value: getCardForId("Scanned Ports Count")}
        ]
        const reqParams = {
            Script: scriptData,
            Params
        }
        ipcRenderer.invoke("ExecYakCode", reqParams, reportToken)
    }
    return (
        <div>
            {!loading && allowDownloadReport ? (
                <div className={styles["hole-text"]} onClick={creatReport}>
                    Generate Report
                </div>
            ) : (
                <div className={styles["disable-hole-text"]}>Generate Report</div>
            )}
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

export const onCreateReportModal = (createReportContent: CreateReportContentProps) => {
    const m = showYakitModal({
        title: "Download Report",
        footer: null,
        content: <CreateReportContent onCancel={() => m.destroy()} {...createReportContent} />,
        onCancel: () => {
            m.destroy()
        },
        bodyStyle: {padding: 24}
    })
}
export interface CreateReportContentProps {
    reportName: string
    runtimeId: string
    onCancel?: () => void
}
const CreateReportContent: React.FC<CreateReportContentProps> = React.memo((props) => {
    const {onCancel, runtimeId} = props
    const [reportName, setReportName] = useState<string>(props.reportName || "Default Report Name")
    // Show Report Gen. Progress?
    const [showReportPercent, setShowReportPercent] = useState<boolean>(false)
    // Report Gen. Progress
    const [reportPercent, setReportPercent] = useState<number>(0)
    const [reportLoading, setReportLoading] = useState<boolean>(false)

    const tokenRef = useRef<string>(randomString(40))
    const reportIdRef = useRef<number>()

    /** Download Report */
    const downloadReport = () => {
        const reqParams: CreatReportRequest = {
            ReportName: reportName,
            RuntimeId: runtimeId
        }
        apiSimpleDetectCreatReport(reqParams, tokenRef.current)
    }
    /** Fetch Report Gen. Result */
    useEffect(() => {
        ipcRenderer.on(`${tokenRef.current}-data`, (e, data: ExecResult) => {
            if (data.IsMessage) {
                const obj = JSON.parse(Buffer.from(data.Message).toString())
                if (obj?.type === "progress") {
                    const percent = obj.content.progress
                    setReportPercent(Math.trunc(percent * 100))
                }
                reportIdRef.current = parseInt(obj.content.data)
            }
        })
        ipcRenderer.on(`${tokenRef.current}-error`, (e: any, error: any) => {
            setReportLoading(false)
            failed(`[Mod] SimpleDetectCreatReport error: ${error}`)
        })
        ipcRenderer.on(`${tokenRef.current}-end`, (e: any, error: any) => {
            onOpenReport()
        })

        return () => {
            ipcRenderer.removeAllListeners(`${tokenRef.current}-data`)
            ipcRenderer.removeAllListeners(`${tokenRef.current}-error`)
            ipcRenderer.removeAllListeners(`${tokenRef.current}-end`)
        }
    }, [])
    const onOpenReport = useMemoizedFn(() => {
        if (!reportIdRef.current) return
        setReportLoading(false)
        setShowReportPercent(false)
        setReportPercent(0)
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.DB_Report}))
        setTimeout(() => {
            ipcRenderer.invoke("simple-open-report", reportIdRef.current)
        }, 300)
        if (onCancel) onCancel()
    })
    return (
        <div>
            <div style={{textAlign: "center"}}>
                <YakitInput
                    placeholder='Enter Task Name'
                    allowClear
                    value={reportName}
                    onChange={(e) => {
                        setReportName(e.target.value)
                    }}
                />
                {showReportPercent && (
                    <Progress
                        strokeColor='#F28B44'
                        trailColor='#F0F2F5'
                        percent={Math.trunc(reportPercent * 100)}
                        format={(percent) => `${percent}%`}
                        style={{marginTop: 12}}
                    />
                )}
            </div>
            <div style={{marginTop: 20, textAlign: "right"}}>
                <YakitButton
                    style={{marginRight: 8}}
                    onClick={() => {
                        apiCancelSimpleDetectCreatReport(tokenRef.current)
                        if (onCancel) onCancel()
                    }}
                    type='outline2'
                >
                    Cancel
                </YakitButton>
                <YakitButton
                    loading={reportLoading}
                    type={"primary"}
                    onClick={() => {
                        setReportLoading(true)
                        downloadReport()
                        setShowReportPercent(true)
                    }}
                >
                    Confirm
                </YakitButton>
            </div>
        </div>
    )
})
