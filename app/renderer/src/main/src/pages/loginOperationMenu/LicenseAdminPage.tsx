import React, {useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Form, Popconfirm, Tag, InputNumber, DatePicker, Tooltip} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn, useDebounceFn, usePrevious} from "ahooks"
import moment from "moment"
import "./LicenseAdminPage.scss"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../invoker/schema"
import {showModal} from "@/utils/showModal"
import {callCopyToClipboard} from "@/utils/basic"
import {QuestionCircleOutlined} from "@ant-design/icons"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
export interface ShowUserInfoProps {
    text: string
    onClose: () => void
}
const ShowUserInfo: React.FC<ShowUserInfoProps> = (props) => {
    const {text, onClose} = props
    const copyUserInfo = () => {
        callCopyToClipboard(`${text}`)
    }
    return (
        <div style={{padding: "0 10px"}}>
            <div>
                <span>{text}</span>
            </div>
            <div style={{textAlign: "center", paddingTop: 10}}>
                <Button style={{width: 200}} type='primary' onClick={() => copyUserInfo()}>
                    Copy
                </Button>
            </div>
        </div>
    )
}

interface CreateLicenseProps {
    onCancel: () => void
    refresh: () => void
}

interface SelectDataProps {
    value: number
    label: string
}

interface LicenseProps {
    company: string
    license: string
    maxUser: number
}

const CreateLicense: React.FC<CreateLicenseProps> = (props) => {
    const {onCancel, refresh} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    const [data, setData, getData] = useGetState<API.CompanyLicenseConfigList[]>([])
    const [selectData, setSelectData, getSelectData] = useGetState<SelectDataProps[]>([])
    const keywordsRef = useRef<string>("")
    // Company Name Pagination
    const [_, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })

    useEffect(() => {
        update(1, undefined, true)
    }, [])

    const update = (page?: number, limit?: number, reload: boolean = false) => {
        setSelectLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || getPagination().Limit
        }
        NetWorkApi<QueryProps, API.CompanyLicenseConfigResponse>({
            method: "get",
            url: "company/license/config",
            params: {
                keywords: keywordsRef.current,
                status: 0,
                ...paginationProps
            }
        })
            .then((res) => {
                let data = res.data || []
                const newData = data.map((item) => ({
                    value: item.id,
                    label: item.company
                }))
                if (data.length > 0) {
                    setPagination((v) => ({...v, Page: paginationProps.page}))
                }
                if (reload) {
                    setData([...data])
                    setSelectData([...newData])
                } else {
                    setData([...getData(), ...data])
                    setSelectData([...getSelectData(), ...newData])
                }
            })
            .catch((err) => {
                failed("View License Failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setSelectLoading(false)
                }, 200)
            })
    }

    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const {id, license, company_version} = values
        const selectDate = data.filter((item) => item.id === id)[0]
        const {company, maxUser} = selectDate
        let params = {
            license,
            company,
            maxUser,
            company_version
        }
        NetWorkApi<LicenseProps, string>({
            method: "post",
            url: "license/activation",
            data: params
        })
            .then((text: string) => {
                onCancel()
                refresh()
                const m = showModal({
                    title: "Generation Success",
                    content: <ShowUserInfo text={text} onClose={() => m.destroy()} />
                })
                return m
            })
            .catch((err) => {
                failed("Company Operation Failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <YakitSpin spinning={selectLoading}>{originNode}</YakitSpin>
            </div>
        )
    })

    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='id' label='Company Name' rules={[{required: true, message: "Required Field"}]}>
                    <YakitSelect
                        showSearch
                        optionFilterProp='children'
                        placeholder='Select Company Name'
                        filterOption={(input, option) => {
                            const val = (option?.label ?? "") + ""
                            return val.toLowerCase().includes(input.toLowerCase())
                        }}
                        options={selectData}
                        onSearch={(value) => {
                            keywordsRef.current = value
                            update(1, undefined, true)
                        }}
                        onPopupScroll={(e) => {
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight && !selectLoading) {
                                update(getPagination().Page + 1)
                            }
                        }}
                        dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                    />
                </Form.Item>
                <Form.Item name='company_version' label='Version' rules={[{required: true, message: "Required Field"}]}>
                    <YakitSelect placeholder='Select Version' allowClear>
                        <YakitSelect.Option value='EnpriTrace'>Enterprise Version</YakitSelect.Option>
                        <YakitSelect.Option value='EnpriTraceAgent'>Portable Version</YakitSelect.Option>
                    </YakitSelect>
                </Form.Item>
                <Form.Item name='license' label='Application Code' rules={[{required: true, message: "Required Field"}]}>
                    <Input.TextArea placeholder='Enter Application Code' allowClear rows={13} />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        Confirm
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface LicenseFormProps {
    onCancel: () => void
    refresh: () => void
    editInfo: any
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

export interface CreateProps {
    user_name: string
}

const LicenseForm: React.FC<LicenseFormProps> = (props) => {
    const {onCancel, refresh, editInfo} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [submitBtn, setSubmitBtn] = useState<boolean>(!!editInfo)

    useEffect(() => {
        if (editInfo) {
            form.setFieldsValue({
                company: editInfo.company,
                maxActivationNum: editInfo.maxActivationNum,
                maxUser: editInfo.maxUser,
                durationDate: moment.unix(editInfo.durationDate)
            })
        }
    }, [])

    const requestFun = (params) => {
        NetWorkApi<CreateProps, API.NewUrmResponse>({
            method: "post",
            url: "company/license/config",
            data: params
        })
            .then((res: API.NewUrmResponse) => {
                onCancel()
                refresh()
            })
            .catch((err) => {
                failed("Company Operation Failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }

    const onFinish = useMemoizedFn((values) => {
        let params = {
            ...values,
            durationDate: values.durationDate.unix()
        }
        if (editInfo?.id) params.id = editInfo?.id
        if (editInfo && values.maxUser > editInfo.maxUser) {
            params.maxActivationNum = values.maxActivationNum + 1
            Modal.info({
                title: "Modifying User Count Requires Server License Update, Increment Total Licenses by 1",
                onOk() {
                    requestFun(params)
                }
            })
        } else {
            requestFun(params)
        }
    })
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='company' label='Company Name' rules={[{required: true, message: "Required Field"}]}>
                    <Input placeholder='Enter Company Name' allowClear disabled={!!editInfo} />
                </Form.Item>
                <Form.Item
                    name='maxActivationNum'
                    label='Total Licenses'
                    rules={[
                        {required: true, message: "Required Field"},
                        {
                            validator: (rule, value) => {
                                if (editInfo && value && value < editInfo.maxActivationNum) {
                                    return Promise.reject("Total Licenses Can Only Increase")
                                } else {
                                    setSubmitBtn(false)
                                    return Promise.resolve()
                                }
                            }
                        }
                    ]}
                >
                    <InputNumber placeholder='Enter Total Licenses' style={{width: "100%"}} />
                </Form.Item>
                <Form.Item
                    name='maxUser'
                    label={
                        <>
                            User Count
                            {editInfo && (
                                <Tooltip title='Modify User Count Requires Server License Update'>
                                    <QuestionCircleOutlined style={{paddingLeft: 2, position: "relative", top: 1}} />
                                </Tooltip>
                            )}
                        </>
                    }
                    rules={[
                        {required: true, message: "Required Field"},
                        {
                            validator: (rule, value) => {
                                if (editInfo && value && value < editInfo.maxUser) {
                                    return Promise.reject("User Count Not Decrease")
                                } else {
                                    setSubmitBtn(false)
                                    return Promise.resolve()
                                }
                            }
                        }
                    ]}
                >
                    <InputNumber placeholder='Enter User Count' style={{width: "100%"}} />
                </Form.Item>
                <Form.Item
                    name='durationDate'
                    label={
                        <>
                            Validity
                            {editInfo && (
                                <Tooltip title='Replacing Licenses Resets Used Count Upon Expiry Update'>
                                    <QuestionCircleOutlined style={{paddingLeft: 2, position: "relative", top: 1}} />
                                </Tooltip>
                            )}
                        </>
                    }
                    rules={[
                        {required: true, message: "Required Field"},
                        {
                            validator: (rule, value) => {
                                if (editInfo && value && value.unix() < editInfo.durationDate) {
                                    return Promise.reject("Expiry Cannot Shorten")
                                } else {
                                    setSubmitBtn(false)
                                    return Promise.resolve()
                                }
                            }
                        }
                    ]}
                >
                    <DatePicker
                        // showTime
                        format='YYYY-MM-DD'
                        placeholder='Set Expiry Here'
                        style={{width: "100%"}}
                    />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button
                        disabled={submitBtn}
                        style={{width: 200}}
                        type='primary'
                        htmlType='submit'
                        loading={loading}
                    >
                        Confirm
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export interface LicenseAdminPageProps {}

export interface QueryExecResultsParams {
    keywords: string
    status: number
}

interface QueryProps {}
interface RemoveProps {
    id: number
}
const LicenseAdminPage: React.FC<LicenseAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryExecResultsParams>({
        keywords: "",
        status: 0
    })
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [data, setData] = useState<API.CompanyLicenseConfigList[]>([])
    const [total, setTotal] = useState<number>(0)
    // Edit Item
    const [licenseFormShow, setLicenseFormShow] = useState<boolean>(false)
    const [editInfo, setEditInfo] = useState<API.CompanyLicenseConfigList>()
    // License Generation Modal
    const [createLicenseModal, setCreateLicenseModal] = useState<boolean>(false)

    const update = (page?: number, limit?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }

        NetWorkApi<QueryProps, API.CompanyLicenseConfigResponse>({
            method: "get",
            url: "company/license/config",
            params: {
                ...params,
                ...paginationProps
            }
        })
            .then((res) => {
                // const newData = res.data.map((item) => ({...item}))
                setData(res.data || [])
                setPagination({...pagination, Limit: res.pagemeta.limit})
                setTotal(res.pagemeta.total)
            })
            .catch((err) => {
                failed("View License Failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }

    useEffect(() => {
        update()
    }, [params.status])

    const onRemove = (id: number) => {
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "company/license/config",
            data: {
                id
            }
        })
            .then((res) => {
                success("Delete Company Success")
                update()
            })
            .catch((err) => {
                failed("Delete Company Failed：" + err)
            })
            .finally(() => {})
    }

    // Days Difference
    const countDay = (now, later) => {
        // Timestamp Difference (Seconds）
        const differ = later - now
        const day = differ / 60 / 60 / 24
        if (day > 30) {
            return <Tag color='green'>In Use</Tag>
        } else if (0 < day && day <= 30) {
            return <Tag color='orange'>Expiring Soon</Tag>
        } else {
            return <Tag color='red'>Expired</Tag>
        }
    }

    const columns: ColumnsType<API.CompanyLicenseConfigList> = [
        {
            title: "Company Name",
            dataIndex: "company"
        },
        {
            title: "Status",
            dataIndex: "status",
            filters: [
                {
                    text: "Expired",
                    value: 1
                },
                {
                    text: "Expiring Soon",
                    value: 2
                }
            ],
            filterMultiple: false,
            render: (text, record) => countDay(record.currentTime, record.durationDate)
        },
        {
            title: "Expiry Date",
            dataIndex: "durationDate",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD")}</span>
        },
        {
            title: "Licenses (Used/Total)",
            dataIndex: "useActivationNum",
            render: (text, record) => {
                return `${text} / ${record.maxActivationNum}`
            }
        },
        {
            title: "User Count",
            dataIndex: "maxUser"
        },
        {
            title: "Action",
            render: (i) => (
                <Space>
                    <Button
                        size='small'
                        type='link'
                        onClick={() => {
                            setEditInfo(i)
                            setLicenseFormShow(true)
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title={"Confirm Delete Company?？"}
                        onConfirm={() => {
                            onRemove(i.id)
                        }}
                        placement='right'
                    >
                        <Button size={"small"} danger={true} type='link'>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
            width: 140
        }
    ]

    const onTableChange = useDebounceFn((pagination, filters) => {
        const {status} = filters
        if (Array.isArray(status)) setParams({...getParams(), status: status[0]})
        else {
            setParams({...getParams(), status: 0})
        }
    }).run
    return (
        <div className='license-admin-page'>
            <Table
                loading={loading}
                pagination={{
                    size: "small",
                    defaultCurrent: 1,
                    pageSize: pagination?.Limit || 10,
                    showSizeChanger: true,
                    total,
                    showTotal: (i) => <Tag>{`Total ${i}`}</Tag>,
                    onChange: (page: number, limit?: number) => {
                        setLoading(true)
                        if (page !== pagination.Page || limit !== pagination.Limit) {
                            update(page, limit)
                        }
                    }
                }}
                rowKey={(row) => row.id}
                title={(e) => {
                    return (
                        <div className='table-title'>
                            <div className='filter'>
                                <Input.Search
                                    placeholder={"Search by Company Name"}
                                    enterButton={true}
                                    size={"small"}
                                    style={{width: 200}}
                                    value={params.keywords}
                                    onChange={(e) => {
                                        setParams({...getParams(), keywords: e.target.value})
                                    }}
                                    onSearch={() => {
                                        update()
                                    }}
                                />
                            </div>
                            <div className='operation'>
                                <Space>
                                    <Button
                                        type='primary'
                                        htmlType='submit'
                                        size='small'
                                        onClick={() => {
                                            setLicenseFormShow(true)
                                            setEditInfo(undefined)
                                        }}
                                    >
                                        Add Company
                                    </Button>
                                    <Button
                                        type='primary'
                                        htmlType='submit'
                                        size='small'
                                        onClick={() => {
                                            setCreateLicenseModal(true)
                                        }}
                                    >
                                        Generate License
                                    </Button>
                                </Space>
                            </div>
                        </div>
                    )
                }}
                columns={columns}
                size={"small"}
                bordered={true}
                dataSource={data}
                onChange={onTableChange}
            />
            <Modal
                visible={licenseFormShow}
                title={editInfo ? "Edit Company" : "Create Company"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setLicenseFormShow(false)}
                footer={null}
            >
                <LicenseForm editInfo={editInfo} onCancel={() => setLicenseFormShow(false)} refresh={() => update()} />
            </Modal>
            <Modal
                visible={createLicenseModal}
                title={"Generate License"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setCreateLicenseModal(false)}
                footer={null}
            >
                <CreateLicense onCancel={() => setCreateLicenseModal(false)} refresh={() => update()} />
            </Modal>
        </div>
    )
}

export default LicenseAdminPage
