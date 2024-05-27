import React, {useEffect, useState} from "react"
import {
    Button,
    Card,
    Checkbox,
    Form,
    Popover,
    Space,
    Tag,
    Tooltip
} from "antd"
import {
    CopyableField,
    InputFileNameItem,
    InputInteger,
    InputItem,
    OneLine,
    SwitchItem
} from "../../../utils/inputUtil"
import {QueryYakScriptRequest, YakScript} from "../schema"
import {QuestionCircleOutlined, UserOutlined} from "@ant-design/icons"
import {showModal} from "../../../utils/showModal"
import {failed} from "../../../utils/notification"
import {ExecBatchYakScriptResult} from "./YakBatchExecutorLegacy"
import moment from "moment"

import "./BatchExecutorPage.css"
import {NewTaskHistoryProps} from "./BatchExecuteByFilter"
import {showUnfinishedBatchTaskList, UnfinishedBatchTask} from "./UnfinishedBatchTaskList"

const {ipcRenderer} = window.require("electron")
export const ExecuteTaskHistory = "execute-task-history"

/*
* message ExecBatchYakScriptRequest {
  // Targets Will Be Auto-Split
  string Target = 1;
  string TargetFile = 11;

  // Additional Params Can Be Added
  repeated ExecParamItem ExtraParams = 7;

  // Filters and Limitations
  string Keyword = 2;
  string ExcludedYakScript = 22;
  int64 Limit = 3;

  // Default Total Duration
  int64 TotalTimeoutSeconds = 4;

  // Module Type, Default to Nuclei
  string Type = 5;

  // Concurrency
  int64 Concurrent = 6;

  // Use Script Name Precisely
  repeated string ScriptNames = 8;
}
* */

export interface TaskHistoryProps {
    target: TargetRequest
    selected: string[]
    pluginType: "yak" | "nuclei" | string
    limit: number
    keyword: string
    time: string
    enablePluginFilter?: boolean
    pluginFilter?: QueryYakScriptRequest
}

const StartExecBatchYakScript = (target: TargetRequest, names: string[], token: string) => {
    const params = {
        Target: target.target,
        TargetFile: target.targetFile,
        ScriptNames: names,
        Concurrent: target.concurrent || 5,
        TotalTimeoutSeconds: target.totalTimeout || 3600 * 2
    }
    return ipcRenderer.invoke("ExecBatchYakScript", params, token)
}

export const CancelBatchYakScript = (token: string) => {
    return ipcRenderer.invoke("cancel-ExecBatchYakScript", token)
}

interface ExecSelectedPluginsProp {
    disableStartButton: boolean
    initTargetRequest?: TargetRequest
    onSubmit: (target: TargetRequest) => any
    loading?: boolean
    executing?: boolean
    onCancel: () => any

    history: NewTaskHistoryProps[]
    executeHistory: (item: NewTaskHistoryProps) => any
}

export interface TargetRequest {
    target: string
    targetFile: string
    allowFuzz: boolean
    concurrent: number
    totalTimeout: number
    progressTaskCount: number
    proxy: string
}

export const defTargetRequest = {
    allowFuzz: true,
    target: "",
    targetFile: "",
    concurrent: 3,
    totalTimeout: 3600 * 2,
    progressTaskCount: 5,
    proxy: ""
}

export const ExecSelectedPlugins: React.FC<ExecSelectedPluginsProp> = React.memo((props: ExecSelectedPluginsProp) => {
    const [target, setTarget] = useState<TargetRequest>(
        props.initTargetRequest ? props.initTargetRequest : defTargetRequest
    )
    const {loading, executing, disableStartButton, history, executeHistory} = props
    return (
        <div style={{marginTop: 20}}>
            <Form
                layout={"horizontal"}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    if (!target.target && !target.targetFile) {
                        failed("Enter Target or Upload Target Folder Absolute Path!")
                        return
                    }
                    props.onSubmit(target)
                }}
            >
                <InputItem
                    style={{marginBottom: 0}}
                    width={"80%"}
                    textareaRow={2}
                    textarea={true}
                    value={target.target}
                    label={"Input Target"}
                    setValue={(targetRaw) => setTarget({...target, target: targetRaw})}
                    suffixNode={
                        <div style={{display: "inline-block", marginLeft: 5, marginBottom: 4}}>
                            {executing ? (
                                <Button
                                    type='primary'
                                    danger={true}
                                    disabled={executing ? false : disableStartButton}
                                    onClick={props.onCancel}
                                >
                                    Stop Execution
                                </Button>
                            ) : (
                                <Button
                                    type='primary'
                                    htmlType='submit'
                                    disabled={executing ? false : disableStartButton}
                                    loading={loading}
                                >
                                    Execute Task
                                </Button>
                            )}
                        </div>
                    }
                />

                <div style={{paddingLeft: 70}}>
                    <Space>
                        {target.proxy && <Tag>Proxy: {target.proxy}</Tag>}
                        {/*<Tag>Process: {target.concurrent}</Tag>*/}
                        <Tag>Total Timeout: {target.totalTimeout}s</Tag>
                        {target.targetFile && (
                            <Tag color={"geekblue"}>
                                <Space>
                                    Target File：
                                    <CopyableField text={target.targetFile} maxWidth={100} tooltip={true} />
                                </Space>
                            </Tag>
                        )}
                        <Popover
                            title={"Extra Config"}
                            content={
                                <div style={{width: 500}}>
                                    <Form
                                        layout={"horizontal"}
                                        size={"small"}
                                        onSubmitCapture={(e) => e.preventDefault()}
                                        labelCol={{span: 8}}
                                        wrapperCol={{span: 14}}
                                    >
                                        <InputItem
                                            label={"Proxy"}
                                            value={target.proxy}
                                            setValue={(t) => {
                                                setTarget({...target, proxy: t})
                                            }}
                                            autoComplete={[
                                                "http://127.0.0.1:8080",
                                                "http://127.0.0.1:8083",
                                                "http://127.0.0.1:7890",
                                                "socks://127.0.0.1:7890"
                                            ]}
                                            style={{marginBottom: 4}}
                                        />
                                        <InputInteger
                                            label={"Concurrent Processes"}
                                            value={target.concurrent}
                                            setValue={(c) => setTarget({...target, concurrent: c})}
                                            formItemStyle={{marginBottom: 4}}
                                        />
                                        <InputInteger
                                            label={"Tasks Per Process"}
                                            value={target.progressTaskCount}
                                            setValue={(e) => setTarget({...target, progressTaskCount: e})}
                                            formItemStyle={{marginBottom: 4}}
                                        />
                                        <InputInteger
                                            label={"Total Timeout"}
                                            value={target.totalTimeout}
                                            setValue={(t) => setTarget({...target, totalTimeout: t})}
                                            formItemStyle={{marginBottom: 4}}
                                        />
                                        <SwitchItem
                                            label={"Allow Fuzz Syntax"}
                                            value={target.allowFuzz}
                                            setValue={(e) => setTarget({...target, allowFuzz: e})}
                                            formItemStyle={{marginBottom: 4}}
                                        />
                                        <InputFileNameItem
                                            label={"Upload Target File"}
                                            filename={target.targetFile}
                                            accept={["text/plain"]}
                                            setFileName={(e) => setTarget({...target, targetFile: e})}
                                        />
                                    </Form>
                                </div>
                            }
                            trigger={["click"]}
                        >
                            <Button type='link' style={{padding: 4}}>
                                {" "}
                                Extra Config{" "}
                            </Button>
                        </Popover>
                        <Button
                            type={"link"}
                            onClick={() => {
                                showUnfinishedBatchTaskList((task: UnfinishedBatchTask) => {
                                    ipcRenderer.invoke("send-to-tab", {
                                        type: "batch-exec-recover",
                                        data: task
                                    })
                                })
                            }}
                        >
                            Incomplete Tasks
                        </Button>
                        {/*{history.length !== 0 && (*/}
                        {/*    <Popover*/}
                        {/*        title={"Historical Tasks (Selection Restores Target & PoC)"}*/}
                        {/*        trigger={["click"]}*/}
                        {/*        placement='bottom'*/}
                        {/*        content={*/}
                        {/*            <div className='history-list-body'>*/}
                        {/*                {history.map((item) => {*/}
                        {/*                    return (*/}
                        {/*                        <div*/}
                        {/*                            className='list-opt'*/}
                        {/*                            key={item.time}*/}
                        {/*                            onClick={() => {*/}
                        {/*                                if (executing) return*/}
                        {/*                                if (!item.simpleQuery) {*/}
                        {/*                                    failed("This Record Cannot Be Used!")*/}
                        {/*                                    return*/}
                        {/*                                }*/}
                        {/*                                executeHistory(item)*/}
                        {/*                                setTarget({...item.target})*/}
                        {/*                            }}*/}
                        {/*                        >*/}
                        {/*                            {item.time}*/}
                        {/*                        </div>*/}
                        {/*                    )*/}
                        {/*                })}*/}
                        {/*            </div>*/}
                        {/*        }*/}
                        {/*    >*/}
                        {/*        <Button type='link' style={{padding: 4}}>*/}
                        {/*            Historical Tasks*/}
                        {/*        </Button>*/}
                        {/*    </Popover>*/}
                        {/*)}*/}
                    </Space>
                </div>
            </Form>
        </div>
    )
})

interface BatchTask {
    PoC: YakScript
    Target: string
    ExtraParam: {Key: string; Value: string}[]
    TaskId: string
    Results: ExecBatchYakScriptResult[]
    CreatedAt: number
}

interface TimerProp {
    fromTimestamp: number
    color?: any

    executing?: boolean
}

export const Timer: React.FC<TimerProp> = React.memo((props) => {
    const [duration, setDuration] = useState<number>()

    useEffect(() => {
        const updateTime = () => {
            const durationNow = moment().diff(moment.unix(props.fromTimestamp))
            const seconds = parseInt(`${durationNow / 1000}`)
            setDuration(seconds)
        }
        updateTime()
        let id = setInterval(() => {
            updateTime()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [props.fromTimestamp])

    if (!duration) {
        return <></>
    }

    if (!props.executing)
        return (
            <Tag style={{maxWidth: 103}} color={"red"}>
                Interrupted
            </Tag>
        )
    return (
        <Tag style={{maxWidth: 103}} color={props.color || "green"}>
            Running{duration}Seconds
        </Tag>
    )
})
