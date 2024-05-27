import React, {useEffect, useState} from "react"
import {Button, Typography, List, Popconfirm, Progress, Row, Space, Tag, Tooltip} from "antd"
import {AutoCard} from "../../../components/AutoCard"
import {showModal} from "../../../utils/showModal"
import {formatTimestamp} from "../../../utils/timeUtil"
import {DeleteOutlined, FireOutlined} from "@ant-design/icons"
import {TargetRequest} from "./BatchExecutorPage"
import {failed, info} from "../../../utils/notification"
import {OneLine} from "../../../utils/inputUtil"
const {Paragraph} = Typography
interface UnfinishedBatchTaskListProp {
    handler: (i: UnfinishedBatchTask) => any
}

export interface UnfinishedBatchTask {
    Uid: string
    CreatedAt: number
    Percent: number
    TaskName: string
}

interface SimpleDetectBatchTaskListProp {
    handler: (i: UnfinishedSimpleDetectBatchTask) => any
}

export interface UnfinishedSimpleDetectBatchTask {
    Uid: string
    CreatedAt: number
    Percent: number
    YakScriptOnlineGroup: string
    LastRecordPtr: number
    TaskName: string
}

const {ipcRenderer} = window.require("electron")

const UnfinishedBatchTaskList: React.FC<UnfinishedBatchTaskListProp> = (props) => {
    const [tasks, setTasks] = useState<UnfinishedBatchTask[]>([])
    const [loading, setLoading] = useState(false)

    const update = () => {
        setLoading(true)
        ipcRenderer
            .invoke("GetExecBatchYakScriptUnfinishedTask", {})
            .then((e: {Tasks: UnfinishedBatchTask[]}) => {
                setTasks(e.Tasks.reverse())
            })
            .catch((e) => {
                failed(`Failed to get unfinished tasks: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }
    useEffect(() => {
        update()
    }, [])

    return (
        <List<UnfinishedBatchTask>
            loading={loading}
            dataSource={tasks || []}
            renderItem={(i) => {
                return (
                    <AutoCard size={"small"} hoverable={true} style={{marginBottom: 6}}>
                        <Space>
                            <Tag color={"geekblue"}>{formatTimestamp(i.CreatedAt)}</Tag>
                            <Tag color={"red"}>{i.TaskName}</Tag>
                            <div style={{width: 230, marginRight: 8}}>
                                <Progress percent={parseInt((i.Percent * 100).toFixed(2))} />
                            </div>
                            <Popconfirm
                                title={"Start Task"}
                                onConfirm={() => {
                                    props.handler(i)
                                }}
                            >
                                <Button size={"small"} type={"primary"}>
                                    Continue Task
                                </Button>
                            </Popconfirm>
                            <Popconfirm
                                title={"Delete this task？"}
                                onConfirm={() => {
                                    ipcRenderer
                                        .invoke("PopExecBatchYakScriptUnfinishedTaskByUid", {Uid: i.Uid})
                                        .then((i: TargetRequest) => {
                                            info("Unfinished task deleted")
                                        })
                                        .finally(() => update())
                                }}
                            >
                                <Button size={"small"} type={"link"} icon={<DeleteOutlined />} danger={true}>
                                    Delete
                                </Button>
                            </Popconfirm>
                        </Space>
                    </AutoCard>
                )
            }}
        ></List>
    )
}

export const showUnfinishedBatchTaskList = (handler: (i: UnfinishedBatchTask) => any) => {
    let m = showModal({
        title: "Unfinished tasks: Click tasks to continue",
        width: 650,
        content: (
            <>
                <UnfinishedBatchTaskList
                    handler={(i) => {
                        m.destroy()
                        handler(i)
                    }}
                />
            </>
        )
    })
}

const UnfinishedSimpleDetectTaskList: React.FC<SimpleDetectBatchTaskListProp> = (props) => {
    const [tasks, setTasks] = useState<UnfinishedSimpleDetectBatchTask[]>([])
    const [loading, setLoading] = useState(false)

    const update = () => {
        setLoading(true)
        ipcRenderer
            .invoke("GetSimpleDetectUnfinishedTask", {})
            .then((e: {Tasks: UnfinishedSimpleDetectBatchTask[]}) => {
                setTasks(e.Tasks.reverse())
            })
            .catch((e) => {
                failed(`Failed to get unfinished tasks: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }
    useEffect(() => {
        update()
    }, [])

    return (
        <List<UnfinishedSimpleDetectBatchTask>
            loading={loading}
            dataSource={tasks || []}
            renderItem={(i) => {
                return (
                    <AutoCard size={"small"} hoverable={true} style={{marginBottom: 6}}>
                        <Space>
                            <Tag color={"geekblue"}>{formatTimestamp(i.CreatedAt)}</Tag>
                        
                    {/* <Tag color={"red"}>{i.TaskName.length>20?`${i.TaskName.slice(0,20)}...`:i.TaskName}</Tag> */}
        
                            <Paragraph style={{maxWidth: 230}} ellipsis={{tooltip: true}}>
                                {i.TaskName}
                            </Paragraph>
                            <div style={{width: 230, marginRight: 8}}>
                                <Progress percent={parseInt((i.Percent * 100).toFixed(2))} />
                            </div>
                            <Popconfirm
                                title={"Start Task"}
                                onConfirm={() => {
                                    // First get GetSimpleDetectUnfinishedTaskByUid

                                    // ipcRenderer.invoke("GetSimpleDetectUnfinishedTaskByUid",{
                                    //     Uid : i.Uid
                                    // }).then((e )=>{
                                    //     console.log(e)
                                    // })
                                    // ipcRenderer.invoke("RecoverSimpleDetectUnfinishedTask",)
                                    props.handler(i)
                                }}
                            >
                                <Button size={"small"} type={"primary"}>
                                    Continue Task
                                </Button>
                            </Popconfirm>
                            <Popconfirm
                                title={"Delete this task？"}
                                onConfirm={() => {
                                    ipcRenderer
                                        .invoke("PopSimpleDetectUnfinishedTaskByUid", {Uid: i.Uid})
                                        .then((i: TargetRequest) => {
                                            info("Unfinished task deleted")
                                        })
                                        .finally(() => update())
                                }}
                            >
                                <Button size={"small"} type={"link"} icon={<DeleteOutlined />} danger={true}>
                                    Delete
                                </Button>
                            </Popconfirm>
                        </Space>
                    </AutoCard>
                )
            }}
        ></List>
    )
}

export const showUnfinishedSimpleDetectTaskList = (handler: (i: UnfinishedSimpleDetectBatchTask) => any) => {
    let m = showModal({
        title: "Unfinished tasks: Click tasks to continue",
        width: 850,
        content: (
            <>
                <UnfinishedSimpleDetectTaskList
                    handler={(i) => {
                        m.destroy()
                        handler(i)
                    }}
                />
            </>
        )
    })
}
