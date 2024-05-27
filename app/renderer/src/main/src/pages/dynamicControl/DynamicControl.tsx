import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Table, Space, Button, Input, Modal, Radio, Avatar, Spin, DatePicker, Menu} from "antd"
import locale from "antd/es/date-picker/locale/zh_CN"
import {API} from "@/services/swagger/resposeType"
import {callCopyToClipboard} from "@/utils/basic"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import moment from "moment"
import {failed, success, warn} from "@/utils/notification"
import {NetWorkApi} from "@/services/fetch"
import {PaginationSchema} from "@/pages/invoker/schema"
import {ControlMyselfIcon, ControlOtherIcon} from "@/assets/icons"
import styles from "./DynamicControl.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {VirtualTable} from "./VirtualTable"
import {QueryYakScriptsResponse} from "../invoker/schema"
import {VirtualColumns} from "./VirtualTable"
import {DynamicStatusProps, UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import { getReleaseEditionName } from "@/utils/envfile"
const {TextArea} = Input
const {ipcRenderer} = window.require("electron")
const {RangePicker} = DatePicker
export interface ControlOperationProps {
    controlName: string
}

// In Control - No Operations Allowed
export const ControlOperation: React.FC<ControlOperationProps> = (props) => {
    const {controlName} = props
    const {userInfo} = useStore()
    const {dynamicStatus} = yakitDynamicStatus()
    // Close Remote Control
    const closeControl = () => {
        ipcRenderer.invoke("kill-dynamic-control")
        // Immediate Logout
        ipcRenderer.invoke("lougin-out-dynamic-control-page")
        remoteOperation(false, dynamicStatus, userInfo)
    }
    return (
        <div className={styles["control-operation"]}>
            <div className={styles["control-operation-box"]}>
                <div className={styles["control-operation-title"]}>Remote Control Active</div>
                <div className={styles["control-operation-seconend-title"]}>
                    User Occupied {controlName} Do Not Close During Remote Control {getReleaseEditionName()}
                </div>
                <div className={styles["control-operation-img"]}>
                    <ControlMyselfIcon />
                </div>
                <YakitButton
                    onClick={closeControl}
                    size='max'
                    type="primary"
                    colors="danger"
                    className={styles["control-operation-btn"]}
                >
                    Exit Remote
                </YakitButton>
                <div className={styles["control-operation-left-bg"]}></div>
                <div className={styles["control-operation-right-bg"]}></div>
            </div>
        </div>
    )
}

export interface ControlMyselfProps {
    goBack: () => void
}

export interface ResultObjProps {
    id: string
    note: string
    port: number
    host: string
    pubpem: string
    secret: string
}

export interface ResposeProps {
    alive: boolean
}

// Controlled End
export const ControlMyself: React.FC<ControlMyselfProps> = (props) => {
    const {goBack} = props
    const [loading, setLoading] = useState<boolean>(true)
    const [textArea, setTextArea] = useState<string>()
    const {userInfo} = useStore()
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
    const [restartBtn, setRestartBtn] = useState<boolean>(false)
    const [restartLoading, setRestartLoading] = useState<boolean>(false)

    // Switch Button if Key Not Obtained Within 10s (Terminate Process - Retry)）
    const judgeLoading = () => {
        setRestartLoading(false)
        setTimeout(() => {
            if (loading) {
                setRestartBtn(true)
            }
        }, 1000 * 10)
    }

    const run = () => {
        /* 
            Controlled Steps
            1.Via/remote/Tunnel Obtain IP & Password
        */
        NetWorkApi<any, API.RemoteTunnelResponse>({
            url: "remote/tunnel",
            method: "get"
        })
            .then((data) => {
                const {server, secret, gen_tls_crt} = data
                // 2.Start Remote Control Service
                ipcRenderer
                    .invoke("start-dynamic-control", {note: userInfo.companyName, server, secret, gen_tls_crt})
                    .then((respose: ResposeProps) => {
                        // Switch Button if Key Not Obtained Within 10s After Service Starts (Terminate Process - Retry)）
                        if (respose.alive) {
                            judgeLoading()
                        }
                        // 3.Obtain Key
                        NetWorkApi<any, API.RemoteOperationResponse>({
                            url: "remote/operation",
                            method: "get",
                            params: {
                                note: userInfo.companyName
                            }
                        })
                            .then((res) => {
                                const {data} = res
                                if (Array.isArray(data) && data.length > 0) {
                                    const {auth, id, note, port, host} = data[0]
                                    const {pubpem, secret} = JSON.parse(auth)
                                    setRemoteValue("REMOTE_OPERATION_ID", id)
                                    let resultObj = {
                                        id,
                                        note,
                                        port,
                                        host,
                                        pubpem,
                                        secret
                                    }
                                    const showData = unReadable(resultObj)
                                    // For Controlled Initiated Exit Notification
                                    setDynamicStatus({...dynamicStatus, ...resultObj})
                                    setTextArea(showData)
                                    setLoading(false)
                                } else {
                                    failed(`Retrieve Remote Connection Info/Copy Key Failed`)
                                }
                            })
                            .catch((err) => {
                                failed(`Retrieve Remote Connection Info/Copy Key Failed:${err}`)
                            })
                            .finally(() => {})
                    })
                    .catch((e) => {
                        failed(`Remote Connection Failed:${e}`)
                    })
            })
            .catch((err) => {
                failed(`Obtain Server/Secret Failed:${err}`)
            })
            .finally(() => {})
    }

    useEffect(() => {
        // ipcRenderer.invoke("kill-dynamic-control").finally(() => {
        run()
        // })
    }, [])

    return (
        <div className={styles["control-myself"]}>
            <Spin spinning={loading}>
                <TextArea
                    spellCheck={false}
                    value={textArea}
                    className={styles["text-area"]}
                    autoSize={{minRows: 3, maxRows: 10}}
                    disabled
                />
            </Spin>
            <div className={styles["btn-box"]}>
                <YakitButton type='outline2' style={{marginRight: 8}} onClick={goBack}>
                    Back
                </YakitButton>
                {restartBtn ? (
                    <YakitButton
                        loading={restartLoading}
                        onClick={() => {
                            setRestartLoading(true)
                            ipcRenderer.invoke("kill-dynamic-control").finally(() => {
                                setRestartBtn(false)
                                run()
                            })
                        }}
                    >
                        Restart Service
                    </YakitButton>
                ) : (
                    <YakitButton
                        loading={loading}
                        onClick={() => {
                            ipcRenderer.invoke("set-copy-clipboard", textArea)
                            success("Copy Success")
                        }}
                    >
                        Copy Key
                    </YakitButton>
                )}
            </div>
        </div>
    )
}

export interface ControlOtherProps {
    goBack: () => void
    runControl: (v: string, url: string) => void
}

// Controller
export const ControlOther: React.FC<ControlOtherProps> = (props) => {
    const {goBack, runControl} = props
    const [textAreaValue, setTextAreaValue] = useState<string>("")
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const onFinish = () => {
        const resultObj: ResultObjProps|undefined = readable(textAreaValue)
        if (resultObj&&resultObj?.id) {
            NetWorkApi<any, API.RemoteStatusResponse>({
                method: "get",
                url: "remote/status",
                params: {
                    tunnel: resultObj?.id
                }
            }).then((res) => {
                if (res.status) {
                    warn("Unable to Connect as the Remote Target is Already Being Controlled")
                } else {
                    // Terminate Controlled Service if Exists
                    ipcRenderer.invoke("kill-dynamic-control")
                    setLoading(true)
                    getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
                        if (!setting) return
                        const value = JSON.parse(setting)
                        let url = value.BaseUrl
                        // Switch to Auto Remote Connect
                        runControl(JSON.stringify(resultObj), url)
                    })
                }
            })
        } else {
            failed("Invalid Key Format")
        }
    }
    return (
        <div className={styles["control-other"]}>
            <Spin spinning={uploadLoading}>
                <ContentUploadInput
                    type='textarea'
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
                        ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res) => {
                            let Targets = res
                            // Process Excel
                            if (f.type !== "text/plain") {
                                let str = JSON.stringify(res)
                                Targets = str.replace(/(\[|\]|\{|\}|\")/g, "")
                            }
                            setTextAreaValue(Targets)
                            setTimeout(() => setUploadLoading(false), 100)
                        })
                        return false
                    }}
                    item={{help: <></>}}
                    textarea={{
                        className: "text-area",
                        isBubbing: true,
                        setValue: (value) => setTextAreaValue(value),
                        value: textAreaValue,
                        autoSize: {minRows: 3, maxRows: 10},
                        placeholder: "Paste Link Key/Enter in Text Box"
                    }}
                />
            </Spin>
            <div className={styles["btn-box"]}>
                <YakitButton type='outline2' style={{marginRight: 8}} onClick={goBack}>
                    Back
                </YakitButton>
                <YakitButton onClick={() => onFinish()} loading={loading} disabled={textAreaValue.length === 0}>
                    Remote Connection
                </YakitButton>
            </div>
        </div>
    )
}

export interface SelectControlTypeProps {
    onControlMyself: (v: boolean) => void
    onControlOther: (v: boolean) => void
}

// Control Mode Selection
export const SelectControlType: React.FC<SelectControlTypeProps> = (props) => {
    const {onControlMyself, onControlOther} = props
    return (
        <div className={styles["select-control-type"]}>
            <div className={styles["type-box"]} onClick={() => onControlMyself(true)}>
                <div className={styles["type-img"]}>
                    <ControlMyselfIcon />
                </div>
                <div className={styles["type-content"]}>
                    <div className={styles["type-title"]}>Controlled End</div>
                    <div className={styles["type-text"]}>Generate Invite Key</div>
                </div>
            </div>
            <div className={styles["type-box"]} onClick={() => onControlOther(true)}>
                <div className={styles["type-img"]}>
                    <ControlOtherIcon />
                </div>
                <div className={styles["type-content"]}>
                    <div className={styles["type-title"]}>Controller</div>
                    <div className={styles["type-text"]}>Control via Shared Key</div>
                </div>
            </div>
        </div>
    )
}

export interface DynamicControlProps {
    isShow: boolean
    onCancle: () => void
    mainTitle: string
    secondTitle: string
    children?: React.ReactNode
    width?: number
}

export const DynamicControl: React.FC<DynamicControlProps> = (props) => {
    const {isShow, onCancle, children, mainTitle, secondTitle, width} = props
    return (
        <Modal
            visible={isShow}
            destroyOnClose={true}
            maskClosable={false}
            bodyStyle={{padding: "18px 24px 24px 24px"}}
            width={width || 448}
            onCancel={() => onCancle()}
            footer={null}
            centered
        >
            <div className={styles["dynamic-control"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["main-title"]}>{mainTitle}</div>
                    <div className={styles["second-title"]}>{secondTitle}</div>
                </div>
                {children}
            </div>
        </Modal>
    )
}

export interface ShowUserInfoProps extends API.NewUrmResponse {
    onClose: () => void
}
const ShowUserInfo: React.FC<ShowUserInfoProps> = (props) => {
    const {user_name, password, onClose} = props
    const copyUserInfo = () => {
        callCopyToClipboard(`Username：${user_name}\nPassword：${password}`)
    }
    return (
        <div style={{padding: "0 10px"}}>
            <div>
                Username：<span>{user_name}</span>
            </div>
            <div>
                Password：<span>{password}</span>
            </div>
            <div style={{textAlign: "center", paddingTop: 10}}>
                <Button type='primary' onClick={() => copyUserInfo()}>
                    Copy
                </Button>
            </div>
        </div>
    )
}

export interface ControlAdminPageProps {}
export interface AccountAdminPageProp {}

export interface QueryExecResultsParams {
    keywords: string
}
interface QueryProps {}

const defaultPagination = {
    Limit: 20,
    Order: "desc",
    OrderBy: "updated_at",
    Page: 1
}
export const ControlAdminPage: React.FC<ControlAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [resetLoading, setResetLoading] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<API.GetRemoteWhere>({
        user_name: ""
    })
    const [pagination, setPagination] = useGetState<PaginationSchema>(defaultPagination)
    const [data, setData] = useState<API.RemoteLists[]>([])
    const [total, setTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const updateLoadMore = useDebounceFn(
        (page: number) => {
            if (page > Math.ceil(total / pagination.Limit)) {
                setHasMore(false)
                return
            }
            setLoading(true)
            setHasMore(true)
            const paginationProps = {
                page: page || 1,
                limit: pagination.Limit
            }

            NetWorkApi<QueryProps, API.RemoteResponse>({
                method: "get",
                url: "remote/list",
                params: {
                    ...paginationProps
                },
                data: {
                    ...getParams()
                }
            })
                .then((res) => {
                    if (Array.isArray(res?.data)) {
                        setData([...data, ...res?.data])
                    }
                    setPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                    setTotal(res.pagemeta.total)
                })
                .catch((err) => {
                    failed("Failed to Retrieve Remote Management List：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        },
        {wait: 200}
    )

    const update = (page?: number, limit?: number) => {
        setResetLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }
        NetWorkApi<QueryProps, API.RemoteResponse>({
            method: "get",
            url: "remote/list",
            params: {
                ...paginationProps
            },
            data: {
                ...getParams()
            }
        })
            .then((res) => {
                setData(res?.data || [])
                setPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                setTotal(res.pagemeta.total)
            })
            .catch((err) => {
                failed("Failed to Retrieve Remote Management List：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setResetLoading(false)
                }, 200)
            })
    }

    useEffect(() => {
        update(1)
    }, [getParams().start_time, getParams().end_time, getParams().status])

    const judgeAvatar = (record) => {
        const {head_img, user_name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={32} src={head_img} />
        ) : (
            <Avatar size={32} style={{backgroundColor: "rgb(245, 106, 0)"}}>
                {user_name.slice(0, 1)}
            </Avatar>
        )
    }

    const columns: VirtualColumns[] = [
        {
            title: "Controller",
            render: (record) => {
                return (
                    <div>
                        {judgeAvatar({head_img: record?.head_img, user_name: record?.user_name})}
                        <span style={{marginLeft: 10}}>{record?.user_name}</span>
                    </div>
                )
            }
        },
        {
            title: "Remote Address",
            dataIndex: "addr",
            render: (text) => <span>{text}</span>
        },
        {
            title: "Start Time",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "End Time",
            dataIndex: "updated_at",
            render: (text, record) => {
                return <span>{record.status ? "-" : moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
            }
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (i: boolean) => {
                return (
                    <div className={styles["radio-status"]}>
                        {i ? (
                            <Radio className={styles["radio-status-active"]} defaultChecked={true}>
                                Remote In Progress
                            </Radio>
                        ) : (
                            <Radio disabled={true} checked={true}>
                                Ended
                            </Radio>
                        )}
                    </div>
                )
            },
            width: 100,
            filterProps: {
                // popoverDirection:"left",
                filterRender: () => (
                    <YakitMenu
                        selectedKeys={undefined}
                        data={[
                            {
                                key: "all",
                                label: "Deselect"
                            },
                            {
                                key: "true",
                                label: "Remote In Progress"
                            },
                            {
                                key: "false",
                                label: "Ended"
                            }
                        ]}
                        onClick={({key}) => setParams({...getParams(), status: key === "all" ? undefined : key})}
                    ></YakitMenu>
                )
            }
        }
    ]
    return (
        <div className={styles["control-admin-page"]}>
            <Spin spinning={resetLoading}>
                <div className={styles["operation"]}>
                    <div className={styles["left-select"]}>
                        <div className={styles["title-box"]}>Remote Mgmt</div>

                        <span className={styles["total-box"]}>
                            <span className={styles["title"]}>Total</span>{" "}
                            <span className={styles["content"]}>{total}</span>
                        </span>
                    </div>

                    <div className={styles["right-filter"]}>
                        <div className={styles["date-time-search"]}>
                            <RangePicker
                                style={{width: 200}}
                                size='small'
                                locale={locale}
                                onChange={(value) => {
                                    if (value) {
                                        setParams({
                                            ...getParams(),
                                            start_time: moment(value[0]).unix(),
                                            end_time: moment(value[1]).unix()
                                        })
                                    } else {
                                        setParams({...getParams(), start_time: undefined, end_time: undefined})
                                    }
                                }}
                            />
                        </div>
                        <YakitInput.Search
                            placeholder={"Enter Username"}
                            enterButton={true}
                            size='middle'
                            style={{width: 200}}
                            value={params.user_name}
                            onChange={(e) => {
                                setParams({...getParams(), user_name: e.target.value})
                            }}
                            allowClear={false}
                            onSearch={() => {
                                update(1)
                            }}
                        />
                    </div>
                </div>
                <div className={styles["virtual-table-box"]}>
                    <VirtualTable
                        loading={loading}
                        hasMore={hasMore}
                        columns={columns}
                        dataSource={data}
                        loadMoreData={() => updateLoadMore.run(pagination.Page + 1)}
                    />
                </div>
            </Spin>
        </div>
    )
}

/** Notify of Remote Connection */
export const remoteOperation = (status: boolean, dynamicStatus: DynamicStatusProps, userInfo?: UserInfoProps) => {
    const {id, host, port, secret, note} = dynamicStatus
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.RemoteOperationRequest, API.ActionSucceeded>({
        url: "remote/operation",
        method: "post",
        data: {
            tunnel: id,
            addr: `${host}:${port}`,
            auth: secret,
            note,
            status
        }
    })
        .then((data) => {
            if (data.ok) {}
        })
        .catch((err) => {
            failed(`Connect Remote/Cancel Failed:${err}`)
        })
        .finally(() => {
            resolve(true)
        })
    })
}

/** Data Unreadable */
export const unReadable = (resultObj: ResultObjProps) => {
    return `${resultObj.id},${resultObj.note},${resultObj.port},${resultObj.host},${resultObj.pubpem},${resultObj.secret}`
}

/** Data Readable */
export const readable = (v: string) => {
    try {
        let arr = v.split(",")
        let obj: ResultObjProps = {
            id: arr[0],
            note: arr[1],
            port: parseInt(arr[2]),
            host: arr[3],
            pubpem: arr[4],
            secret: arr[5]
        }
        return obj
    } catch (error) {
        return
    }
}
