import React, {useEffect, useState} from "react"
import {Empty, List, PageHeader, Space, Spin, Tag, Tooltip, Popconfirm, message} from "antd"
import {ResizeBox} from "../../components/ResizeBox"
import {AutoCard} from "../../components/AutoCard"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {failed} from "../../utils/notification"
import {formatTimestamp} from "../../utils/timeUtil"
import {QuestionOutlined, ReloadOutlined, DeleteOutlined} from "@ant-design/icons"
import {Report} from "./models"
import {ReportViewer} from "./ReportViewer"
import {SelectIcon} from "../../assets/icons"
import {report} from "process"
import {onRemoveToolFC} from "../../utils/deleteTool"
import "./ReportViewerPage.scss"
export interface ReportViewerPageProp {
}

export const ReportViewerPage: React.FC<ReportViewerPageProp> = (props) => {
    const [_, setReport, getReport] = useGetState<Report|undefined>()
    return (
        <>
            <ResizeBox
                isVer={false}
                firstNode={<ReportList onClick={setReport} selectedId={getReport()?.Id}/>}
                firstMinSize={"330px"}
                firstRatio={"330px"}
                secondNode={(() => {
                    return <ReportViewer id={getReport()?.Id || 0}/>
                })()}
            />
        </>
    )
}

export interface ReportListProp {
    onClick: (r: Report|undefined) => any
    selectedId?: number
}

interface QueryReports extends QueryGeneralRequest {
    Title: string
    Owner: string
    From: string
    Keyword: string
}

const {ipcRenderer} = window.require("electron")

export const ReportList: React.FC<ReportListProp> = (props) => {
    const {onClick,selectedId} = props
    const [response, setResponse] = useState<QueryGeneralResponse<Report>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [params, setParams] = useState<QueryReports>({
        From: "",
        Keyword: "",
        Owner: "",
        Pagination: genDefaultPagination(),
        Title: ""
    })
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
    const [loading, setLoading] = useState(false)
    const pagination = params.Pagination
    const total = response.Total

    const update = useMemoizedFn((page?: number, limit?: number) => {
        const pagination = {...params.Pagination}
        if (!!page) {
            pagination.Page = page
        }
        if (!!limit) {
            pagination.Limit = limit
        }
        setLoading(true)
        ipcRenderer
            .invoke("QueryReports", {
                ...params,
                Pagination: pagination
            })
            .then((rsp: QueryGeneralResponse<Report>) => {
                if (rsp) {
                    // console.log("List",rsp)
                    setResponse(rsp)
                    setSelectedRowKeys([])
                }
            })
            .catch((e) => {
                failed("Query Reports Failed")
                console.info(e)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(()=>{
        ipcRenderer.on("fetch-simple-open-report", (e, reportId:number) => {
            update()
            reportId&&onClick({Id:reportId,Title:"",Hash:"",Owner:"",From:"",PublishedAt:0,JsonRaw:""})
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-simple-open-report")
        }
    },[])

    const onSelect = useMemoizedFn((item: Report) => {
        const index = selectedRowKeys.findIndex((ele) => ele === item.Id)
        if (index === -1) {
            selectedRowKeys.push(item.Id)
        } else {
            selectedRowKeys.splice(index, 1)
        }
        setSelectedRowKeys([...selectedRowKeys])
    })

    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys,
            params,
            interfaceName: "DeleteReport",
            selectedRowKeysNmae: "IDs"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                // If deleting all, clear details page directly
                selectedRowKeys.length===0&&onClick(undefined)
                // If selection exists, clear details page if selected are deleted
                if(selectedId&&selectedRowKeys.length!==0){
                    if(selectedRowKeys.includes(selectedId)){
                        onClick(undefined)
                    }
                }
                update()
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update()
    }, [])

    return (
        <AutoCard
            title={<Space>Report list</Space>}
            size={"small"}
            loading={loading}
            bordered={false}
            bodyStyle={{overflowY: "auto"}}
            extra={
                <Space>
                    <Tooltip title={<>{`Click a report in the list to check its contents`}</>}>
                        <a href='#'>
                            <QuestionOutlined/>
                        </a>
                    </Tooltip>
                    <a
                        href='#'
                        onClick={() => {
                            update(1)
                        }}
                    >
                        <ReloadOutlined/>
                    </a>
                    <Popconfirm
                        title={
                            selectedRowKeys.length > 0
                                ? "Confirm to delete selected reports? Irreversible"
                                : "Confirm delete all reports? Irreversible"
                        }
                        onConfirm={onRemove}
                    >
                        {/* @ts-ignore */}
                        <DeleteOutlined className='icon-color'/>
                    </Popconfirm>
                </Space>
            }
        >
            <List
                renderItem={(item: Report) => {
                    return (
                        <AutoCard
                            onClick={() => {
                                props.onClick(item)
                            }}
                            style={{
                                marginBottom: 8,
                                backgroundColor: props.selectedId === item.Id ? "#cfdfff" : undefined
                            }}
                            size='small'
                            title={item.Title}
                            extra={<Tag>{formatTimestamp(item.PublishedAt)}</Tag>}
                            hoverable={true}
                        >
                            <Tooltip title='Click to select, then delete'>
                                <SelectIcon
                                    //  @ts-ignore
                                    className={`icon-select  ${
                                        selectedRowKeys.findIndex((ele) => ele === item.Id) !== -1 &&
                                        "icon-select-active"
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onSelect(item)
                                    }}
                                />
                            </Tooltip>

                            <Space wrap={true}>
                                {item.Id && <Tag color={"red"}>ID:{item.Id}</Tag>}
                                {item.Owner && <Tag color={"green"}>Initiator:{item.Owner}</Tag>}
                                {item.From && <Tag color={"orange"}>Source:{item.From}</Tag>}
                            </Space>
                        </AutoCard>
                    )
                }}
                dataSource={response.Data || []}
                pagination={{
                    size: "small",
                    pageSize: pagination?.Limit || 10,
                    current:typeof response.Pagination.Page === "number"? response.Pagination.Page:parseInt(response.Pagination.Page) ,
                    simple: true,
                    total,
                    showTotal: (i) => <Tag>Total{i}History records</Tag>,
                    onChange: (page: number, limit?: number) => {
                        update(page, limit)
                    }
                }}
            ></List>
        </AutoCard>
    )
}
