import React, {useEffect, useState} from "react";
import {Typography, PageHeader, Table, Tag, Space, Row, Tabs, Button} from "antd";
import {ExecHistoryRecord, ExecHistoryRecordResponse, PaginationSchema} from "./schema";
import {formatTimestamp} from "../../utils/timeUtil";
import {YakEditor} from "../../utils/editors";
import {showDrawer} from "../../utils/showModal";

const {Text} = Typography;

export interface ExecHistoryTableProp {
    trigger?: number
    mini?: boolean
}

const {ipcRenderer} = window.require("electron");

const ExecHistoryViewer = (r: ExecHistoryRecord) => {
    return <Row style={{width: "100%"}}>
        <Space direction={"vertical"} style={{width: "100%"}}>
            {/*<div style={{height: 300, width: "100%"}}>*/}
            {/*    <YakEditor value={r.Script} readOnly={true}/>*/}
            {/*</div>*/}
            <Tabs>
                {r.Stderr && <Tabs.TabPane tab={"StdErr Content"} key={"stderr"}>
                    <div style={{height: 300}}>
                        <YakEditor value={Buffer.from(r.Stderr).toString("utf8")} readOnly={true}/>
                    </div>
                </Tabs.TabPane>}
                {r.Stdout && <Tabs.TabPane tab={"StdOut Content"} key={"stdout"}>
                    <div style={{height: 300}}>
                        <YakEditor value={Buffer.from(r.Stdout).toString("utf8")} readOnly={true}/>
                    </div>
                </Tabs.TabPane>}
            </Tabs>
        </Space>
    </Row>
}

export const ExecHistoryTable: React.FC<ExecHistoryTableProp> = (props) => {
    const [data, setData] = useState<ExecHistoryRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 8,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    });
    const [total, setTotal] = useState<number>(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const update = (page?: number, limit?: number) => {
        setLoading(true)
        if (page || limit) {
            ipcRenderer.invoke("yak-exec-history", {
                Pagination: {Page: page || 1, Limit: limit || pagination?.Limit, Order: "desc", OrderBy: "updated_at"}
            })
        } else {
            ipcRenderer.invoke("yak-exec-history", {
                Pagination: {Page: 1, Limit: pagination.Limit, Order: "desc", OrderBy: "updated_at",}
            })
        }
    }

    useEffect(() => {
        update(1)
    }, [props.trigger])

    useEffect(() => {
        ipcRenderer.on("client-yak-exec-history", function handler(_, data: ExecHistoryRecordResponse) {
            if (data) {
                setData(data.Data)
                setPagination(data.Pagination)
                setTotal(data.Total)
            }
            setTimeout(() => setLoading(false), 300)
        })
        ipcRenderer.on("client-yak-exec-error", function handler(_, error) {
            setError(error)
            setTimeout(() => setLoading(false), 300)
        })

        update()
        return () => {
            ipcRenderer.removeAllListeners("client-yak-exec-history")
            ipcRenderer.removeAllListeners("client-yak-exec-error")
        }
    }, [])

    return <div style={{marginTop: 0}}>
        <Table<ExecHistoryRecord>
            bordered={true}
            size={"small"}
            loading={loading}
            dataSource={data || []}
            scroll={{x: 300, y: 420}}
            rowKey={(row)=>{return `${row.Timestamp}`}}
            expandable={props.mini ? undefined : {
                expandedRowRender: (r) => {
                    return <ExecHistoryViewer {...r}/>
                },
                expandRowByClick: true,
            }}
            pagination={{
                size: "small", simple: true,
                pageSize: pagination?.Limit || 10,
                showSizeChanger: !props.mini,
                total, showTotal: (i) => <Tag>Total{i}History records</Tag>,
                onChange(page: number, limit?: number): any {
                    update(page, limit)
                },
            }}
            columns={props.mini ? [
                {
                    title: "Start Execution", width: 180,
                    render: (r: ExecHistoryRecord) => <Tag>{formatTimestamp(r.Timestamp)}</Tag>
                },
                {title: "Duration", render: (r: ExecHistoryRecord) => <Tag color={"geekblue"}>{r.DurationMs}ms</Tag>},
                {
                    title: "Action", fixed: "right", width: 60,
                    render: (r: ExecHistoryRecord) => <Button
                        type={"link"} size={"small"}
                        onClick={e => {
                            showDrawer({
                                title: `Exec History：${r.Params}`,
                                width: "70%",
                                content: <>
                                    <ExecHistoryViewer {...r}/>
                                </>
                            })
                        }}
                    >View</Button>
                },
            ] : [
                {title: "Timestamp", render: (r: ExecHistoryRecord) => <Tag>{formatTimestamp(r.Timestamp)}</Tag>},
                {
                    title: "Parameter", render: (r: ExecHistoryRecord) => r.Params ? <Text style={{width: 230}} ellipsis={{
                        tooltip: true,
                    }} copyable={true}
                    >{r.Params}</Text> : <Tag>No Params</Tag>
                },
                {
                    title: "Status",
                    render: (r: ExecHistoryRecord) => r.Ok ? <Tag color={"green"}>Exec Success</Tag> : <Tag>Exec Failure</Tag>
                },
                {title: "Interval(ms)", render: (r: ExecHistoryRecord) => <Tag color={"geekblue"}>{r.DurationMs}ms</Tag>},
                {
                    title: "Execution Result/Failure Reason", render: (r: ExecHistoryRecord) => r.Ok ? <Space>
                        {r.Stdout && <Tag color={"geekblue"}>StdOut Length[{(r.StdoutLen)}]</Tag>}
                        {r.Stderr && <Tag color={"orange"}>StdErr Length[{(r.StderrLen)}]</Tag>}
                        {!r.Stdout && !r.Stderr ? <Tag>No Output</Tag> : undefined}
                    </Space> : <Space>
                        <Tag color={"red"}>{r.Reason}</Tag>
                    </Space>
                },
            ]}
        />
    </div>
};