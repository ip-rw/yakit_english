import React, {useEffect, useMemo, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {Divider, Empty, Progress, Space, Table, Tag} from "antd"
import {defQueryCVERequest, QueryCVERequest} from "@/pages/cve/CVEViewer"
import {
    useCountDown,
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useKeyPress,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import {ExecResult, genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema"
import {ResizeBox} from "@/components/ResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CVEDetail, CVEDetailEx, CWEDetail} from "@/pages/cve/models"
import {CVEInspect} from "@/pages/cve/CVEInspect"
import styles from "./CVETable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {
    CheckCircleIcon,
    CloudDownloadIcon,
    RefreshIcon,
    ShieldExclamationIcon,
    SolidRefreshIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {failed, info, yakitFailed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {Uint8ArrayToString} from "@/utils/str"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {openExternalWebsite} from "@/utils/openWebsite"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {showByContextMenu} from "@/components/functionTemplate/showByContext"
import {formatDate, formatTimestamp} from "@/utils/timeUtil"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {CacheDropDownGV} from "@/yakitGV"
import { YakitAutoCompleteRefProps } from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"

export interface CVETableProp {
    available: boolean
    filter: QueryCVERequest
    advancedQuery: boolean //Enable Advanced Search?
    setAdvancedQuery: (b: boolean) => void
}

const {ipcRenderer} = window.require("electron")

function emptyCVE() {
    return {} as CVEDetail
}

export const CVETable: React.FC<CVETableProp> = React.memo((props) => {
    const {available, advancedQuery, setAdvancedQuery} = props
    const [selected, setSelected] = useState<string>("")

    const [cve, setCVE] = useState<CVEDetail>(emptyCVE)
    const [cwe, setCWE] = useState<CWEDetail[]>([])
    useEffect(() => {
        if (!selected) return
        ipcRenderer.invoke("GetCVE", {CVE: selected}).then((i: CVEDetailEx) => {
            const {CVE, CWE} = i
            setCVE(CVE)
            setCWE(CWE)
        })
    }, [selected])

    return (
        <>
            {available ? (
                <ResizeBox
                    isVer={true}
                    firstMinSize={300}
                    secondMinSize={300}
                    firstNode={
                        <CVETableList
                            available={available}
                            advancedQuery={advancedQuery}
                            setAdvancedQuery={setAdvancedQuery}
                            filter={props.filter}
                            selected={selected}
                            setSelected={setSelected}
                            CVE={cve}
                            setCVE={setCVE}
                        />
                    }
                    secondNode={<CVEInspect selected={selected} CVE={cve} CWE={cwe} onSelectCve={setSelected} />}
                />
            ) : (
                <CVETableList
                    available={available}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                    filter={props.filter}
                    selected={selected}
                    setSelected={setSelected}
                    CVE={cve}
                    setCVE={setCVE}
                />
            )}
        </>
    )
})

interface CVETableListProps {
    available: boolean
    filter: QueryCVERequest
    selected: string
    setSelected: (s: string) => void
    advancedQuery: boolean //Enable Advanced Search?
    setAdvancedQuery: (b: boolean) => void
    CVE: CVEDetail
    setCVE: (v: CVEDetail) => void
}

const CVETableList: React.FC<CVETableListProps> = React.memo((props) => {
    const {available, selected, setSelected, advancedQuery, setAdvancedQuery, CVE, setCVE} = props
    const [params, setParams] = useState<QueryCVERequest>({...props.filter})
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState<PaginationSchema>({
        ...genDefaultPagination(20, 1),
        OrderBy: "published_date",
        Order: "desc"
    })
    const [data, setData] = useState<CVEDetail[]>([])
    const [total, setTotal] = useState(0)
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // Refresh Table, Scroll to 0

    const [searchType, setSearchType] = useState<string>("Keywords")
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)
    const [dataBaseUpdateLatestMode, setDataBaseUpdateLatestMode] = useState<boolean>(false)

    const [updateTime, setUpdateTime] = useState<number>() // DB Update Time

    const [currentSelectItem, setCurrentSelectItem] = useState<CVEDetail>()
    useEffect(() => {
        if (!selected) return
        setCurrentSelectItem(CVE)
    }, [selected])

    useEffect(() => {
        if (advancedQuery) return
        setParams({
            ...defQueryCVERequest,
            Keywords: params.Keywords,
            CWE: params.CWE
        })
        setTimeout(() => {
            update(1)
        }, 100)
    }, [advancedQuery])

    useEffect(() => {
        const finalParams = {
            ...params,
            Pagination: pagination
        }
        ipcRenderer.invoke("QueryCVE", finalParams).then((r: QueryGeneralResponse<CVEDetail>) => {
            if (r.Data.length > 0) {
                setUpdateTime(r.Data[0].UpdatedAt)
            }
        })
    }, [])

    useUpdateEffect(() => {
        if (dataBaseUpdateVisible) return
        update(1)
    }, [dataBaseUpdateVisible])

    useEffect(() => {
        if (advancedQuery) {
            setParams({
                ...props.filter,
                Keywords: params.Keywords,
                CWE: params.CWE
            })
        }
    }, [props.filter, advancedQuery])

    useDebounceEffect(
        () => {
            update(1)
        },
        [params],
        {wait: 200}
    )

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                ...pagination,
                Page: page || 1,
                Limit: limit || pagination.Limit
            }
            setLoading(true)
            const finalParams = {
                ...params,
                ...(extraParam ? extraParam : {}),
                Pagination: paginationProps
            }
            ipcRenderer
                .invoke("QueryCVE", finalParams)
                .then((r: QueryGeneralResponse<CVEDetail>) => {
                    const d = Number(paginationProps.Page) === 1 ? r.Data : data.concat(r.Data)
                    setData(d)
                    setPagination(r.Pagination)
                    setTotal(r.Total)
                    if (Number(paginationProps.Page) === 1) {
                        setIsRefresh(!isRefresh)
                    }
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        }
    )

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "CVE ID",
                dataKey: "CVE",
                width: 160
            },
            {
                title: "Summary",
                dataKey: "Title",
                render: (_, i: CVEDetail) => i.Title || i.DescriptionZh || i.DescriptionOrigin
            },
            {
                title: "CWE ID",
                dataKey: "CWE",
                width: 160,
                render: (text: string) =>
                    text ? (
                        <>
                            {text.split("|").map((ele) => (
                                <YakitTag color='bluePurple' key={ele}>
                                    {ele}
                                </YakitTag>
                            ))}
                        </>
                    ) : (
                        ""
                    )
            },
            {
                title: "Affected Products",
                dataKey: "Product",
                width: 200
            },
            // {
            //     title: "Exploit Path",
            //     dataKey: "AccessVector"
            // },
            // {
            //     title: "Exploit Difficulty",
            //     dataKey: "AccessComplexity"
            // },
            {
                title: "Vulnerability Level",
                dataKey: "BaseCVSSv2Score",
                width: 120,
                render: (_, i: CVEDetail) => {
                    let color = "success"
                    if (i.Severity === "Severe") {
                        color = "serious"
                    }
                    if (i.Severity === "High Risk") {
                        color = "danger"
                    }
                    if (i.Severity === "Reply Complete") {
                        color = "warning"
                    }
                    return i.Severity === "-" ? (
                        ""
                    ) : (
                        <div
                            className={classNames(styles["cve-list-product-success"], {
                                [styles["cve-list-product-warning"]]: color === "warning",
                                [styles["cve-list-product-danger"]]: color === "danger",
                                [styles["cve-list-product-serious"]]: color === "serious"
                            })}
                        >
                            <div className={classNames(styles["cve-list-severity"])}>{i.Severity}</div>
                            <span className={classNames(styles["cve-list-baseCVSSv2Score"])}>{i.BaseCVSSv2Score}</span>
                        </div>
                    )
                }
            },
            {
                title: "Disclosure Time",
                dataKey: "PublishedAt",
                render: (v) => (v ? formatTimestamp(v) : "-"),
                sorterProps: {
                    sorterKey: "published_date",
                    sorter: true
                }
            },
            {
                title: "Update Time",
                dataKey: "LastModifiedData",
                render: (v) => (v ? formatTimestamp(v) : "-"),
                sorterProps: {
                    sorterKey: "last_modified_data",
                    sorter: true
                }
            }
        ]
    }, [])
    const onRowClick = useMemoizedFn((record?: CVEDetail) => {
        if (record) {
            setCVE(record)
            setSelected(record.CVE) // Update Selected Row
        } else {
            setCVE(emptyCVE())
            setSelected("")
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: CVEDetail) => {
            onRowClick(rowDate)
        },
        {wait: 200}
    ).run
    const onTableChange = useDebounceFn(
        (page: number, limit: number, sorter: SortProps, filter: any) => {
            setParams({
                ...params,
                ...filter
            })
            setPagination({
                ...pagination,
                Order: sorter.order === "asc" ? "asc" : "desc",
                OrderBy: sorter.order === "none" ? "published_date" : sorter.orderBy
            })
            setTimeout(() => {
                update(1, limit)
            }, 10)
        },
        {wait: 500}
    ).run
    return (
        <div className={styles["cve-list"]}>
            {available ? (
                <TableVirtualResize<CVEDetail>
                    query={params}
                    titleHeight={36}
                    size='middle'
                    renderTitle={
                        <div className={styles["cve-list-title-body"]}>
                            <div className={styles["cve-list-title-left"]}>
                                {!advancedQuery && (
                                    <div className={styles["cve-list-title-query"]}>
                                        <span className={styles["cve-list-title-query-text"]}>Advanced Search</span>
                                        <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
                                    </div>
                                )}
                                <div className={styles["cve-list-title"]}>CVE DB Management</div>
                                <div className={styles["cve-list-total"]}>
                                    <span>Total</span>
                                    <span className={styles["cve-list-total-number"]}>{total}</span>
                                </div>
                                <div className={styles["cve-list-time"]}>
                                    Update Time:{updateTime ? formatDate(updateTime) : "-"}
                                </div>
                            </div>
                            <div className={styles["cve-list-title-extra"]}>
                                <YakitCombinationSearch
                                    selectProps={{
                                        size: "small"
                                    }}
                                    beforeOptionWidth={68}
                                    valueBeforeOption={searchType}
                                    afterModuleType='input'
                                    onSelectBeforeOption={(o) => {
                                        if (o === "Keywords") {
                                            setParams({
                                                ...params,
                                                CWE: ""
                                            })
                                        }
                                        if (o === "CWE") {
                                            setParams({
                                                ...params,
                                                Keywords: ""
                                            })
                                        }
                                        setSearchType(o)
                                    }}
                                    addonBeforeOption={[
                                        {
                                            label: "CVE",
                                            value: "Keywords"
                                        },
                                        {
                                            label: "CWE",
                                            value: "CWE"
                                        }
                                    ]}
                                    inputSearchModuleTypeProps={{
                                        size: "middle",
                                        value: params[searchType],
                                        placeholder: searchType === "Keywords" ? "Search CVE ID or Keywords" : "Search by CWE ID",
                                        onChange: (e) => {
                                            setParams({
                                                ...params,
                                                [searchType]: e.target.value
                                            })
                                        },
                                        onSearch: (value) => {
                                            setParams({
                                                ...params,
                                                [searchType]: value
                                            })
                                            setTimeout(() => {
                                                update(1)
                                            }, 100)
                                        }
                                    }}
                                />
                                <Divider type='vertical' />
                                <YakitButton
                                    type='primary'
                                    onClick={() => {
                                        // setDataBaseUpdateVisible(true)
                                        showByRightContext({
                                            data: [
                                                {label: "Update Only Latest Data", key: "update-latest-data"},
                                                {label: "Full Update", key: "update-full-data"}
                                            ],
                                            onClick: (e) => {
                                                switch (e.key) {
                                                    case "update-latest-data":
                                                        setDataBaseUpdateLatestMode(true)
                                                        setDataBaseUpdateVisible(true)
                                                        return
                                                    case "update-full-data":
                                                        setDataBaseUpdateLatestMode(false)
                                                        setDataBaseUpdateVisible(true)
                                                        return
                                                }
                                            }
                                        })
                                    }}
                                >
                                    <RefreshIcon />
                                    DB Update
                                </YakitButton>
                            </div>
                        </div>
                    }
                    isRefresh={isRefresh}
                    renderKey='CVE'
                    data={data}
                    loading={loading}
                    enableDrag={true}
                    columns={columns}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total,
                        onChange: update
                    }}
                    currentSelectItem={currentSelectItem}
                    onChange={onTableChange}
                    onSetCurrentRow={onSetCurrentRow}
                    useUpAndDown={true}
                />
            ) : (
                <>
                    <div className={styles["cve-list-title"]}>CVE DB Management</div>
                    <div className={styles["cve-list-btns"]}>
                        <YakitEmpty
                            title='No Data Available'
                            description='Click Button Below to Initialize DB, (If Downloaded/Update CVE DB, Suggest Reopening Page After）'
                        />
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setDataBaseUpdateVisible(true)}
                            style={{marginTop: 16}}
                        >
                            Initialize DB
                        </YakitButton>
                    </div>
                </>
            )}
            <DatabaseUpdateModal
                available={available}
                latestMode={dataBaseUpdateLatestMode}
                visible={dataBaseUpdateVisible}
                setVisible={setDataBaseUpdateVisible}
            />
        </div>
    )
})

interface DatabaseUpdateModalProps {
    latestMode?: boolean
    available?: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}

const url = "https://cve-db.oss-cn-beijing.aliyuncs.com/default-cve.db.gzip"
export const DatabaseUpdateModal: React.FC<DatabaseUpdateModalProps> = React.memo((props) => {
    const {available, visible, setVisible, latestMode} = props
    const [token, setToken] = useState(randomString(40))
    const [messages, setMessages, getMessages] = useGetState<string[]>([])
    const [status, setStatus] = useState<"init" | "progress" | "done">("init")
    const [error, setError] = useState<boolean>(false)
    const [percent, setPercent, getPercent] = useGetState<number>(0)

    const proxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [proxy, setProxy] = useState<string>("")

    const errorMessage = useRef<string>("")
    const timer = useRef<number>(0) //Timeout Handling
    const prePercent = useRef<number>(0) // Last Progress Value

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            if (getPercent() === prePercent.current) {
                timer.current += 1
            } else {
                prePercent.current = getPercent()
                timer.current = 0
            }
            if (timer.current > 30) {
                setStatus("init")
                setMessages([])
                setError(true)
                yakitFailed(`[Update CVE DB Error: Connection Timeout`)
                timer.current = 0
            }
            setPercent(Math.ceil(data.Progress))
            setMessages([Uint8ArrayToString(data.Message), ...getMessages()])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            errorMessage.current = JSON.stringify(error).substring(0, 20)
            yakitFailed(`[UpdateCVEDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            // if (!errorMessage.current.includes("client failed")) {
            if (!errorMessage.current) {
                info("[UpdateCVEDatabase] finished")
                setStatus("done")
            } else {
                setStatus("init")
                setMessages([])
                setError(true)
            }
            errorMessage.current = ""
        })
        return () => {
            ipcRenderer.invoke("cancel-UpdateCVEDatabase", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [latestMode])
    useEffect(() => {
        if (!visible) return
        setStatus("init")
        setMessages([])
        setError(false)
        setPercent(0)
        errorMessage.current = ""
    }, [visible])
    /**@Description Fetches Proxy List History and Proxy */
    const addProxyList = useMemoizedFn((url) => {
        if (!url) return
        proxyRef.current.onSetRemoteValues(url)
    })
    const tipNode = useMemo(
        () =>
            latestMode ? (
                <p>
                    Delta Update Only Updates Latest Data
                    <br />
                    （OpenAI Translation Unavailable）
                    <br />
                    Rejected CVEs Will Not Update
                </p>
            ) : (
                <p>
                    If Update Fails, Click This Link to Download：
                    <a
                        href={url}
                        style={{color: "var(--yakit-primary-5)"}}
                        onClick={() => {
                            openExternalWebsite(url)
                        }}
                    >
                        {url}
                    </a>
                    , Place Downloaded File in"Install Directory/yakit-projects"In Folder
                </p>
            ),
        [props.latestMode]
    )

    const HintContent = useMemoizedFn(() => {
        switch (status) {
            case "init":
                return (
                    <>
                        {latestMode && (
                            <div className={styles["hint-content-proxy"]}>
                                <span style={{width: 75}}>Set Proxy：</span>
                                <YakitAutoComplete
                                    ref={proxyRef}
                                    cacheHistoryDataKey={CacheDropDownGV.CVEProxyList}
                                    placeholder='Set Proxy'
                                    value={proxy}
                                    onChange={(v) => {
                                        setProxy(v)
                                    }}
                                />
                            </div>
                        )}
                        <p>
                            {available
                                ? latestMode
                                    ? "Delta DB Update Only Updates Latest Data"
                                    : "Click“Force Update”，Can Update Local CVE DB"
                                : "Local CVE DB Not Initialized, Please Click“Initialize”Download CVE DB"}
                        </p>
                        {tipNode}
                    </>
                )
            case "progress":
                return (
                    <>
                        {tipNode}
                        <div className={styles["download-progress"]}>
                            <Progress
                                strokeColor='#F28B44'
                                trailColor='#F0F2F5'
                                percent={percent}
                                format={(percent) => `Downloaded ${percent}%`}
                            />
                        </div>
                        <div className={styles["database-update-messages"]}>
                            {messages.map((i) => {
                                return <p>{`${i}`}</p>
                            })}
                        </div>
                    </>
                )
            case "done":
                return <p>Restart Yakit to Apply, Reopen Page if Data Doesn't Launch Load。</p>
            default:
                break
        }
    })
    const heardIconRender = useMemoizedFn(() => {
        if (status === "done") {
            return <CheckCircleIcon style={{color: "var(--yakit-success-5)"}} />
        }
        if (available) {
            return <SolidRefreshIcon style={{color: "var(--yakit-warning-5)"}} />
        } else {
            return <ShieldExclamationIcon style={{color: "var(--yakit-warning-5)"}} />
        }
    })
    const titleRender = useMemoizedFn(() => {
        if (status === "done") {
            return "Update Complete"
        }

        if (props.latestMode) {
            return "CVE Delta Latest Data Update"
        }

        if (available) {
            return "CVE DB Update"
        } else {
            return "Initialize CVE Data"
        }
    })
    const okButtonTextRender = useMemoizedFn(() => {
        if (status === "done") {
            return "Restart"
        }

        if (props.latestMode) {
            return "Update Latest Data"
        }

        if (available) {
            return "Force Update"
        } else {
            return "Initialize"
        }
    })
    return (
        <YakitHint
            visible={visible}
            title={titleRender()}
            heardIcon={heardIconRender()}
            onCancel={() => {
                setVisible(false)
                ipcRenderer.invoke("cancel-UpdateCVEDatabase", token)
            }}
            onOk={() => {
                if (status === "done") {
                    ipcRenderer
                        .invoke("relaunch")
                        .then(() => {})
                        .catch((e) => {
                            failed(`Restart Failed: ${e}`)
                        })
                } else {
                    if (latestMode) {
                        addProxyList(proxy)
                        setRemoteValue("cveProxy", proxy)
                    }
                    setStatus("progress")
                    const params = {
                        Proxy: props.latestMode ? proxy : "",
                        JustUpdateLatestCVE: props.latestMode
                    }
                    ipcRenderer
                        .invoke("UpdateCVEDatabase", params, token)
                        .then(() => {})
                        .catch((e) => {
                            failed(`Failed to Update CVE DB！${e}`)
                        })
                }
            }}
            okButtonText={okButtonTextRender()}
            isDrag={true}
            mask={false}
            cancelButtonProps={{style: {display: status === "progress" && !props.latestMode ? "none" : "flex"}}}
            okButtonProps={{style: {display: status === "progress" ? "none" : "flex"}}}
            content={<div className={styles["database-update-content"]}>{HintContent()}</div>}
        />
    )
})
