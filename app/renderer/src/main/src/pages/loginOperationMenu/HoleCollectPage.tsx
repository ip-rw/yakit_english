import React, {useEffect, useRef, useState} from "react"
import {Table, Space, Tooltip, Typography, Form} from "antd"
import {ReloadOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {showModal} from "@/utils/showModal"
import styles from "./HoleCollectPage.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {ExportExcel} from "../../components/DataExport/DataExport"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {TitleColor} from "../risks/RiskTable"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {PaginationSchema} from "../../pages/invoker/schema"
import {RiskDetails, cellColorFontSetting} from "../risks/RiskTable"
import {Risk} from "../risks/schema"
const {ipcRenderer} = window.require("electron")
const {Paragraph} = Typography
const {Option} = YakitSelect
export interface HoleCollectPageProps {}

export const HoleCollectPage: React.FC<HoleCollectPageProps> = (props) => {
    const [response, setResponse] = useState<API.RiskLists[]>([])
    const [params, setParams, getParams] = useGetState<PaginationSchema>({
        ...genDefaultPagination(20)
    })
    const [RiskType, setRiskType] = useState<API.RiskTypes[]>([])
    const [total, setTotal] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const [form] = Form.useForm()
    const newbodyParams = useRef<API.GetRiskWhere>({})
    useEffect(() => {
        getRiskType()
        update()
    }, [])

    const onFinish = useMemoizedFn((values) => {
        const {net_work, risk_type, search, severity, user_name} = values
        let obj = {
            search,
            risk_type: risk_type ? risk_type.join(",") : undefined,
            severity: severity === "all" ? undefined : severity,
            net_work,
            user_name
        }
        newbodyParams.current = obj
        update()
    })

    const reset = useMemoizedFn(() => {
        form.resetFields()
        newbodyParams.current = {}
        update()
    })

    const getRiskType = () => {
        NetWorkApi<any, API.RiskTypeResponse>({
            method: "get",
            url: "risk/type",
            params: {}
        })
            .then((res) => {
                if (res) {
                    setRiskType(res?.data||[])
                }
            })
            .catch((e) => {
                failed(`QueryRisks failed: ${e}`)
            })
            .finally(() => {})
    }

    const update = useMemoizedFn((page?: number, limit?: number) => {
        const paginationProps = {
            page: page || 1,
            limit: limit || 20
        }
        setLoading(true)
        NetWorkApi<any, API.RiskUploadResponse>({
            method: "post",
            url: "risk",
            params: {...paginationProps},
            data: newbodyParams.current
        })
            .then((res) => {
                setResponse(res.data || [])
                setTotal(res.pagemeta.total)
                setParams({...getParams(), Page: res.pagemeta.page, Limit: res.pagemeta.limit})
                setSelectedRowKeys([])
            })
            .catch((e) => {
                failed(`QueryRisks failed: ${e}`)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })

    const delRisk = (hash?: string[]) => {
        setLoading(true)
        let obj: API.GetRiskWhere = {}
        if (hash) {
            obj.hash = hash
        }
        NetWorkApi<API.GetRiskWhere, API.ActionSucceeded>({
            method: "delete",
            url: "risk",
            data: obj
        })
            .then((res) => {
                if (res.ok) {
                    success("Delete Success")
                    setSelectedRowKeys([])
                    update()
                }
            })
            .catch((e) => {
                setLoading(false)
                failed(`QueryRisks failed: ${e}`)
            })
            .finally(() => {})
    }

    const delItem = useMemoizedFn((hash: string) => {
        delRisk([hash])
    })

    const columns = [
        {
            title: "Title",
            dataIndex: "title_verbose",
            render: (_, i: API.RiskLists) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.title_verbose || i.title}
                </Paragraph>
            ),
            width: 400
        },
        {
            title: "Type",
            dataIndex: "risk_type_verbose",
            width: 90,
            render: (_, i: API.RiskLists) => i?.risk_type_verbose || i.risk_type
        },
        {
            title: "Level",
            dataIndex: "severity",
            render: (_, i: API.RiskLists) => {
                const title = TitleColor.filter((item) => item.key.includes(i.severity || ""))[0]
                return <span className={title?.value || "title-default"}>{title ? title.name : i.severity || "-"}</span>
            },
            width: 90
        },
        {
            title: "ip",
            dataIndex: "ip",
            render: (_, i: API.RiskLists) => i?.ip || "-"
        },
        {
            title: "Token",
            dataIndex: "reverse_token",
            render: (_, i: API.RiskLists) => (
                <Paragraph style={{maxWidth: 400, marginBottom: 0}} ellipsis={{tooltip: true}}>
                    {i?.reverse_token || "-"}
                </Paragraph>
            ),
            width: 400
        },
        {
            title: "Upload Account",
            dataIndex: "user_name",
            render: (_, i: API.RiskLists) => <div style={{minWidth: 120}}>{i?.user_name}</div>
        },
        {
            title: "Discovery Time",
            dataIndex: "risk_created_at",
            render: (_, i: API.RiskLists) => (
                <YakitTag>{i.risk_created_at > 0 ? formatTimestamp(i.risk_created_at) : "-"}</YakitTag>
            )
        },
        {
            title: "Upload Time",
            dataIndex: "created_at",
            render: (_, i: API.RiskLists) => (
                <YakitTag>{i.created_at > 0 ? formatTimestamp(i.created_at) : "-"}</YakitTag>
            )
        },
        {
            title: "Action",
            dataIndex: "action",
            render: (_, i: API.RiskLists) => {
                return (
                    <Space>
                        <YakitButton
                            type={"text"}
                            onClick={() => {
                                let info: Risk = {
                                    Hash: i.hash,
                                    IP: i.ip,
                                    Url: i.url,
                                    Port: i.port + "",
                                    Host: i.host,
                                    Title: i.title,
                                    TitleVerbose: i.title_verbose,
                                    Description: i.description,
                                    Solution: i.solution,
                                    RiskType: i.risk_type,
                                    RiskTypeVerbose: i.risk_type_verbose,
                                    Parameter: i.parameter,
                                    Payload: i.payload,
                                    Details: i.details,
                                    FromYakScript: i.from_yak_script,
                                    WaitingVerified: i.waiting_verified,
                                    ReverseToken: i.reverse_token,
                                    Id: i.id,
                                    CreatedAt: i.created_at,
                                    UpdatedAt: i.updated_at,
                                    Severity: i.severity,
                                    RuntimeId: i.runtime_id
                                }
                                showModal({
                                    width: "80%",
                                    title: "Details",
                                    content: (
                                        <div style={{overflow: "auto"}}>
                                            <RiskDetails
                                                info={info}
                                                quotedRequest={i.quoted_request}
                                                quotedResponse={i.quoted_response}
                                            />
                                        </div>
                                    )
                                })
                            }}
                        >
                            Details
                        </YakitButton>
                        <YakitPopconfirm
                            title={"Confirm delete this vuln?？"}
                            onConfirm={() => {
                                delItem(i.hash)
                            }}
                        >
                            <YakitButton type={"text"} colors="danger">
                                Delete
                            </YakitButton>
                        </YakitPopconfirm>
                    </Space>
                )
            }
        }
    ]

    const formatJson = (filterVal, jsonData) => {
        return jsonData.map((v, index) =>
            filterVal.map((j) => {
                if (j === "risk_created_at") {
                    return formatTimestamp(v[j])
                } else if (j === "severity") {
                    const title = TitleColor.filter((item) => item.key.includes(v[j] || ""))[0]
                    return title ? title.name : v[j] || "-"
                } else if (j === "risk_type_verbose") {
                    return v[j] || v["risk_type"]
                } else if (j === "title_verbose") {
                    return v[j] || v["title"]
                } else {
                    return v[j]
                }
            })
        )
    }

    const getData = useMemoizedFn((query: {Limit: number; Page: number}) => {
        return new Promise((resolve) => {
            const paginationProps = {
                page: query.Page || 1,
                limit: query.Limit || 20
            }
            NetWorkApi<any, API.RiskUploadResponse>({
                method: "post",
                url: "risk",
                params: {...paginationProps},
                data: newbodyParams.current
            })
                .then((res) => {
                    const newRes = {
                        Data: res.data,
                        Pagination: {
                            Page: res.pagemeta.page,
                            Limit: res.pagemeta.limit
                        },
                        Total: res.pagemeta.total
                    }
                    //    Data Export
                    let exportData: any = []
                    const header: string[] = []
                    const filterVal: string[] = []
                    columns.forEach((item) => {
                        if (item.dataIndex !== "action") {
                            header.push(item.title)
                            filterVal.push(item.dataIndex)
                        }
                    })
                    exportData = formatJson(filterVal, newRes.Data || [])
                    resolve({
                        header,
                        exportData,
                        response: newRes,
                        optsSingleCellSetting: {
                            c: 2, // Column Three，
                            colorObj: cellColorFontSetting // Font Color Settings
                        }
                    })
                })
                .catch((e) => {
                    failed("Data export failed " + `${e}`)
                })
                .finally(() => {})
        })
    })

    const onRemove = useMemoizedFn(() => {
        // Delete Selected
        if (selectedRowKeys.length > 0) {
            delRisk(selectedRowKeys)
        }
        // Delete All
        else {
            delRisk()
        }
    })

    return (
        <div className={styles["hole-collect"]}>
            <Table<API.RiskLists>
                title={() => {
                    return (
                        <div>
                            <div className={styles["table-title"]}>
                                <Space>
                                    Risks & Vulns
                                    <Tooltip title='Refresh will reset all search conditions'>
                                        <YakitButton
                                            size={"small"}
                                            type={"text"}
                                            onClick={() => {
                                                reset()
                                            }}
                                            icon={<ReloadOutlined style={{position: "relative", top: 2}} />}
                                        />
                                    </Tooltip>
                                </Space>
                                <Space>
                                    <ExportExcel getData={getData} fileName='Risks & Vulns' />
                                    <YakitPopconfirm
                                        title={
                                            selectedRowKeys.length > 0
                                                ? "Confirm delete selected risks and vulns? Irreversible"
                                                : "Confirm delete all risks and vulns? Irreversible"
                                        }
                                        onConfirm={onRemove}
                                    >
                                        <YakitButton type="primary" colors="danger">
                                            Delete Data
                                        </YakitButton>
                                    </YakitPopconfirm>
                                </Space>
                            </div>
                            <div className={styles["filter-box"]}>
                                <Form
                                    onFinish={onFinish}
                                    form={form}
                                    layout='inline'
                                    className={styles["filter-box-form"]}
                                >
                                    <Form.Item name='search' label='Vuln Title'>
                                        <YakitInput style={{width: 180}} placeholder='Enter Vuln Title' allowClear />
                                    </Form.Item>
                                    <Form.Item name='risk_type' label='Vuln Type'>
                                        <YakitSelect
                                            mode='multiple'
                                            allowClear
                                            style={{width: 180}}
                                            placeholder='Select Vuln Type'
                                        >
                                            {RiskType.map((item) => {
                                                return <Option key={item.risk_type}>{item.risk_type}</Option>
                                            })}
                                        </YakitSelect>
                                    </Form.Item>
                                    <Form.Item name='net_work' label='IP'>
                                        <YakitInput placeholder='Enter IP' allowClear style={{width: 180}} />
                                    </Form.Item>
                                    <Form.Item name='severity' label='Vulnerability Level'>
                                        <YakitSelect defaultValue='all' style={{width: 180}}>
                                            <Option value='all'>Deselect</Option>
                                            <Option value='info'>Info/Parse content in plugin backend stream</Option>
                                            <Option value='critical'>Severe</Option>
                                            <Option value='high'>High Risk</Option>
                                            <Option value='warning'>Reply Complete</Option>
                                            <Option value='low'>Low Risk</Option>
                                        </YakitSelect>
                                    </Form.Item>
                                    <Form.Item name='user_name' label='Upload Account'>
                                        <YakitInput style={{width: 180}} placeholder='Enter Upload Account' allowClear />
                                    </Form.Item>
                                </Form>
                                <div className={styles["filter-btn"]}>
                                    <YakitButton
                                        type='primary'
                                        onClick={() => {
                                            form.submit()
                                        }}
                                    >
                                        Search
                                    </YakitButton>
                                </div>
                            </div>
                        </div>
                    )
                }}
                size={"small"}
                bordered={true}
                columns={columns}
                scroll={{x: "auto"}}
                rowKey={(e) => e.hash}
                loading={loading}
                dataSource={response}
                pagination={{
                    current: +getParams().Page,
                    pageSize: getParams().Limit,
                    showSizeChanger: true,
                    total: total,
                    showTotal: (total) => <YakitTag>Total:{total}</YakitTag>,
                    pageSizeOptions: ["5", "10", "20"]
                }}
                onChange={(pagination) => {
                    const current = pagination.current
                    update(+getParams().Page === current ? 1 : current, pagination.pageSize)
                }}
                rowSelection={{
                    onChange: (selectedRowKeys) => {
                        setSelectedRowKeys(selectedRowKeys as string[])
                    },
                    selectedRowKeys
                }}
                onRow={(record) => {
                    return {
                        onContextMenu: (event) => {
                            // showByContextMenu({
                            //     data: [{key: "delect-repeat", title: "Delete Duplicate Titles"}],
                            //     onClick: ({key}) => {
                            //         if (key === "delect-repeat") {
                            //             const newParams = {
                            //                 DeleteRepetition: true,
                            //                 Id: record.Id,
                            //                 Filter: {
                            //                     Search: record?.TitleVerbose || record.Title,
                            //                     Network: record?.IP,
                            //                 }
                            //             }
                            //             ipcRenderer
                            //                 .invoke("DeleteRisk", newParams)
                            //                 .then(() => {
                            //                     update()
                            //                 })
                            //                 .catch((e: any) => {
                            //                     failed(`DeleteRisk failed: ${e}`)
                            //                 })
                            //         }
                            //     }
                            // })
                        }
                    }
                }}
            />
        </div>
    )
}
