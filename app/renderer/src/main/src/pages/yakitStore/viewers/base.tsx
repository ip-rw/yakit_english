import React, {useEffect, useRef, useState, useMemo, CSSProperties} from "react"
import {YakScript} from "../../invoker/schema"
import {Card, Col, Progress, Row, Space, Statistic, Timeline, Tooltip, Pagination, Tag} from "antd"
import {
    HTTPFlow,
    HTTPFlowTable,
    LogLevelToCode,
} from "../../../components/HTTPFlowTable/HTTPFlowTable"
import {YakitLogFormatter} from "../../invoker/YakitLogFormatter"
import {ExecResultLog, ExecResultProgress} from "../../invoker/batch/ExecMessageViewer"
import {randomString} from "../../../utils/randomUtil"
import {WebsiteTreeViewer} from "./WebsiteTree"
import {formatDate} from "../../../utils/timeUtil"
import {xtermFit} from "../../../utils/xtermUtils"
import {yakitFailed, yakitNotify} from "../../../utils/notification"
import {AutoCard} from "../../../components/AutoCard"
import "./base.scss"
import {ExportExcel} from "../../../components/DataExport/DataExport"
import {
    useDebounceEffect,
    useDebounceFn,
    useMemoizedFn,
    useUpdateEffect,
    useGetState,
    useCreation,
} from "ahooks"
import {Risk} from "@/pages/risks/schema"
import {RiskDetails} from "@/pages/risks/RiskTable"
import {YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {sorterFunction} from "@/pages/fuzzer/components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {EngineConsole} from "@/components/baseConsole/BaseConsole"
import {isEnpriTrace} from "@/utils/envfile"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {HTTPFlowDetailRequestAndResponse} from "@/components/HTTPFlowDetail"
import {Uint8ArrayToString} from "@/utils/str"
import {v4 as uuidv4} from "uuid"
import {HTTPHistorySourcePageType} from "@/components/HTTPHistory"
const {ipcRenderer} = window.require("electron")

export interface StatusCardProps {
    Id: string
    Data: string
    Timestamp: number
    Tag?: string
}

export interface StatusCardInfoProps {
    tag: string
    info: StatusCardProps[]
}

export type ExecResultStatusCard = StatusCardProps

export interface PluginResultUIProp {
    loading: boolean
    results: ExecResultLog[]
    featureType: ExecResultLog[]
    feature?: ExecResultLog[]
    progress: ExecResultProgress[]
    statusCards: StatusCardInfoProps[]
    risks?: Risk[]
    script?: YakScript
    defaultConsole?: boolean

    onXtermRef?: (ref: any) => any
    debugMode?: boolean

    cardStyleType?: number
    runtimeId?: string
    fromPlugin?: string
    defaultActive?: string

    // External Control Console Height
    consoleHeight?: string
}

export interface TooltipTitleProps {
    list: StatusCardProps[]
}

export interface TooltipTitleProps {
    list: StatusCardProps[]
}

const idToColor = (id: string) => {
    switch (true) {
        case id.includes("success"):
        case id.includes("Success"):
        case id.includes("succeeded"):
        case id.includes("finished"):
            return "#b7eb8f"
        case id.includes("error"):
        case id.includes("Failed"):
        case id.includes("Error"):
        case id.includes("fatal"):
        case id.includes("missed"):
        case id.includes("miss"):
        case id.includes("failed"):
        case id.includes("panic"):
            return "#ea5f5f"
        default:
            return "#8c8c8c"
    }
}

const TooltipTitle: React.FC<TooltipTitleProps> = React.memo((props) => {
    const {list} = props
    return (
        <div className='tooltip-title'>
            {list.map((info, infoIndex) => (
                <Statistic
                    valueStyle={{
                        color: idToColor(info.Id),
                        fontSize: 14
                    }}
                    key={info.Id}
                    title={list.length > 1 && <p className='tooltip-id'>{info.Id}</p>}
                    value={info.Data}
                />
            ))}
        </div>
    )
})

const renderCard = (infoList, type) => {
    switch (type) {
        case 1:
            return (
                <>
                    {infoList.length > 0 && (
                        <Tooltip
                            color='#fff'
                            title={<TooltipTitle list={infoList} />}
                            overlayClassName='status-cards-info'
                            placement='topLeft'
                        >
                            <Statistic
                                valueStyle={{
                                    color: idToColor(infoList[0].Id)
                                }}
                                key={infoList[0].Id}
                                value={infoList[0].Data}
                            />
                        </Tooltip>
                    )}
                </>
            )
        default:
            return (
                <div style={{display: "flex", justifyContent: "space-between"}}>
                    {infoList.map((info, infoIndex) => {
                        return (
                            <Statistic
                                valueStyle={{
                                    color: idToColor(info.Id)
                                }}
                                key={info.Id}
                                title={infoList.length > 1 ? info.Id : ""}
                                value={info.Data}
                            />
                        )
                    })}
                </div>
            )
    }
}

export const PluginResultUI: React.FC<PluginResultUIProp> = React.memo((props) => {
    const {loading, results, featureType = [], feature = [], progress, script, statusCards, cardStyleType,consoleHeight} = props
    const [active, setActive] = useState(() => {
        if (props.defaultActive) {
            return props.defaultActive
        }
        return props.defaultConsole ? "console" : "feature-0"
    })
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    const xtermRef = useRef(null)
    const timer = useRef<any>(null)
    const [pageCode, setPageCode] = useState<number>(1)
    useEffect(() => {
        if (!xtermRef) {
            return
        }
        if (props.onXtermRef) props.onXtermRef(xtermRef)
    }, [xtermRef])

    let progressBars: {id: string; node: React.ReactNode}[] = []
    progress.forEach((v) => {
        progressBars.push({
            id: v.id,
            node: (
                <Card size={"small"} hoverable={false} bordered={true} title={`Task Progress ID：${v.id}`}>
                    <Progress percent={parseInt((v.progress * 100).toFixed(0))} status='active' />
                </Card>
            )
        })
    })
    // progressBars = progressBars.sort((a, b) => a.id.localeCompare(b.id));

    const features: {feature: string; params: any; key: string}[] = featureType
        .filter((i) => {
            return i.level === "json-feature"
        })
        .map((i) => {
            try {
                let res = JSON.parse(i.data) as {feature: string; params: any; key: string}
                if (!res.key) {
                    res.key = randomString(50)
                }
                return res
            } catch (e) {
                return {feature: "", params: undefined, key: ""}
            }
        })
        .filter((i) => i.feature !== "")

    const finalFeatures = useMemo(() => {
        return features.length > 0 ? features.filter((data, i) => features.indexOf(data) === i) : []
    }, [features.length])

    const timelineItemProps = (results || [])
        .filter((i) => {
            return !((i?.level || "").startsWith("json-feature") || (i?.level || "").startsWith("feature-"))
        })
        .splice(0, 25)

    const newStatusCards = useMemo(() => {
        if (isEnpriTrace()) {
            let newStatusCards = statusCards.filter((item) =>
                ["Load Plugins", "Vulnerability/Risk", "Open Ports Count/Scanned Host Count", "Alive Hosts Count/Scanned Hosts Count", "SYN Scan"].includes(
                    item.tag
                )
            )
            return newStatusCards
        }
        return statusCards
    }, [statusCards])
    return (
        <div className={'plugin-result-ui'} style={{width: "100%", height: "100%", overflow: "hidden auto", display: "flex", flexDirection: "column"}}>
            {props.debugMode && props.onXtermRef && (
                <>
                    <div style={{width: "100%", height: "100%"}}>
                        <YakitCVXterm
                            ref={xtermRef}
                            options={{
                                convertEol: true,
                                rows: 12
                            }}
                            // onResize={(r) => {
                            //     xtermFit(xtermRef, 50, 18)
                            // }}
                        />
                    </div>
                </>
            )}
            {newStatusCards.length > 0 && (
                <div style={{margin: "8px 4px 4px"}}>
                    <Row gutter={8}>
                        {newStatusCards.map((card, cardIndex) => {
                            return (
                                <Col key={card.tag} span={4} style={{marginBottom: 8}}>
                                    <Card
                                        hoverable={true}
                                        bodyStyle={{
                                            paddingTop: 8,
                                            paddingBottom: 4,
                                            paddingLeft: 12,
                                            paddingRight: 12,
                                            height: 100,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <Tooltip
                                            color='#fff'
                                            title={<span className='font-color-000'>{card.tag}</span>}
                                            placement='topLeft'
                                        >
                                            <h2 className='status-cards-tag' style={{marginBottom: 0, fontSize: 16}}>
                                                {card.tag}
                                            </h2>
                                        </Tooltip>
                                        {renderCard(card.info, cardStyleType)}
                                    </Card>
                                </Col>
                            )
                        })}
                    </Row>
                </div>
            )}
            {progressBars.length > 0 && (
                <div style={{marginTop: 4, marginBottom: 8}}>{progressBars.map((i) => i.node)}</div>
            )}
            <YakitTabs
                type='card'
                style={{flex: 1, overflow: "hidden", minHeight: "55%"}}
                tabBarStyle={{display:"flex",overflow:"hidden"}}
                className={"main-content-tabs no-theme-tabs"}
                boxStyle={{flex:1,overflow:"hidden"}}
                activeKey={active}
                onChange={(activeKey) => {
                    setActive(activeKey)
                    setTimeout(() => {
                        if (xtermRef && props.debugMode) xtermFit(xtermRef, 50, 18)
                    }, 50)
                }}
            >
                {(finalFeatures || []).map((i, index) => {
                    return (
                        <YakitTabs.YakitTabPane tab={YakitFeatureTabName(i.feature, i.params)} key={`feature-${index}`}>
                            <YakitFeatureRender
                                params={i.params}
                                feature={i.feature}
                                execResultsLog={feature || []}
                                excelName={YakitFeatureTabName(i.feature, i.params)}
                            />
                        </YakitTabs.YakitTabPane>
                    )
                })}
                {!!props.runtimeId && (
                    <YakitTabs.YakitTabPane tab={"Current HTTP Traffic"} key={"current-http-flow"}>
                        <CurrentHttpFlow
                            runtimeId={props.runtimeId}
                            isOnlyTable={onlyShowFirstNode}
                            onIsOnlyTable={setOnlyShowFirstNode}
                        ></CurrentHttpFlow>
                    </YakitTabs.YakitTabPane>
                )}
                <YakitTabs.YakitTabPane
                    tab={"Basic Plugin Information / Logs"}
                    key={finalFeatures.length > 0 ? "log" : "feature-0"}
                >
                    {
                        <>
                            {/*<Divider orientation={"left"}>Yakit Module Output</Divider>*/}
                            <AutoCard
                                size={"small"}
                                hoverable={false}
                                bordered={true}
                                title={
                                    <Space>
                                        <div>Task Extra Log and Result</div>
                                        {(timelineItemProps || []).length > 0
                                            ? formatDate(timelineItemProps[0].timestamp)
                                            : ""}
                                    </Space>
                                }
                                style={{marginBottom: 20, marginRight: 2, marginTop: -1}}
                                bodyStyle={{overflowY: "auto"}}
                            >
                                <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                                    {(timelineItemProps || [])
                                        .reverse()
                                        .filter((item) => item.level !== "json-risk")
                                        .map((e, index) => {
                                            return (
                                                <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                                                    <YakitLogFormatter
                                                        data={e.data}
                                                        level={e.level}
                                                        timestamp={e.timestamp}
                                                        onlyTime={true}
                                                    />
                                                </Timeline.Item>
                                            )
                                        })}
                                </Timeline>
                            </AutoCard>
                        </>
                    }
                </YakitTabs.YakitTabPane>
                {!!props?.risks && props.risks.length > 0 && (
                    <YakitTabs.YakitTabPane
                        tab={
                            <div>
                                {`Stop Answering`}
                                <Tag style={{marginLeft: 4}} color={"red"}>
                                    {props.risks.length}
                                </Tag>
                            </div>
                        }
                        key={"risk"}
                    >
                        <AutoCard bodyStyle={{overflowY: "auto"}}>
                            <Space direction={"vertical"} style={{width: "100%"}} size={12}>
                                {props.risks.slice(0, 10).map((i) => {
                                    return <RiskDetails info={i} shrink={true} />
                                })}
                                {/* {props.risks.slice((pageCode-1)*10,pageCode*10).map(i => {
                                return <RiskDetails info={i} shrink={true}/>
                            })}
                            {props.risks.length>10&&<div style={{textAlign:"right"}}>
                                <Pagination simple current={pageCode} onChange={(page)=>setPageCode(page)} total={props.risks.length} />  
                            </div>} */}
                            </Space>
                        </AutoCard>
                    </YakitTabs.YakitTabPane>
                )}
                <YakitTabs.YakitTabPane tab={"Console"} key={"console"}>
                    <div style={{width: "100%", height: consoleHeight?consoleHeight:"100%"}}>
                        <EngineConsole isMini={true} />
                    </div>
                </YakitTabs.YakitTabPane>
                {/*{props.fromPlugin && <YakitTabs.YakitTabPane tab={"All Plugin Traffic"} key={"current-plugin-flow"}>*/}
                {/*    <div style={{width: "100%", height: "100%"}}>*/}
                {/*        <HTTPFlowTable*/}
                {/*            noHeader={true}*/}
                {/*            params={{FromPlugin: props.fromPlugin}}*/}
                {/*        />*/}
                {/*    </div>*/}
                {/*</YakitTabs.YakitTabPane>}*/}
                {/*{!props.debugMode && props.onXtermRef ? (*/}
                {/*    <YakitTabs.YakitTabPane tab={"Console"} key={"console"}>*/}
                {/*        <div style={{width: "100%", height: "100%"}}>*/}
                {/*            <CVXterm ref={xtermRef} options={{convertEol: true}}/>*/}
                {/*        </div>*/}
                {/*    </YakitTabs.YakitTabPane>*/}
                {/*) : <YakitTabs.YakitTabPane tab={"Console"} key={"console"}>*/}
                {/*    <div style={{width: "100%", height: "100%"}}>*/}
                {/*        <EngineConsole isMini={true}/>*/}
                {/*    </div>*/}
                {/*</YakitTabs.YakitTabPane>}*/}
            </YakitTabs>
            {/* </div> */}
        </div>
    )
})

interface CurrentHttpFlowProp {
    runtimeId: string
    httpHistoryTableTitleStyle?:CSSProperties
    containerClassName?:string

    /** Specified Search URL */
    searchURL?: string
    /** Specified Search URL Params */
    includeInUrl?: string | string[]
    /** Show Table Only */
    isOnlyTable: boolean
    /** Show Table Only */
    onIsOnlyTable: (value: boolean) => any
    /** Show Details? */
    showDetail?: boolean
    /** Table App Type (history|MITM) */
    pageType?: HTTPHistorySourcePageType

    /** 
     * Traffic Table Filter Callback
     * @param queryParams Traffic Table Filter JSON
     */
    onQueryParams?: (queryParams: string, execFlag?: boolean) => void
    refresh?: boolean // Refresh Table?

    toWebFuzzer?: boolean // Used in webFuzzer?
    showBatchActions?: boolean
}

export const CurrentHttpFlow: React.FC<CurrentHttpFlowProp> = (props) => {
    const {
        runtimeId,
        httpHistoryTableTitleStyle,
        containerClassName = "",
        searchURL,
        includeInUrl,
        isOnlyTable,
        onIsOnlyTable,
        showDetail,
        pageType,
        onQueryParams,
        refresh = true,
        toWebFuzzer = false,
        showBatchActions = false
    } = props
    const [highlightSearch, setHighlightSearch] = useState("")
    const lasetIdRef = useRef<number>()
    const [flowRequest, setFlowRequest] = useState<Uint8Array>()
    const [flowResponse, setFlowResponse] = useState<Uint8Array>()
    const [flowRequestLoad, setFlowRequestLoad] = useState<boolean>(false)
    const [flowResponseLoad, setFlowResponseLoad] = useState<boolean>(false)
    const [flow, setFlow] = useState<HTTPFlow>()
    const [historyId, setHistoryId] = useState<string>(uuidv4())
    
    const getHTTPFlowById = (id: number, rowDate: HTTPFlow) => {
        setFlowRequestLoad(false)
        setFlowResponseLoad(false)
        setFlow(rowDate)
        setFlowRequest(undefined)
        setFlowResponse(undefined)
        onIsOnlyTable(false)

        // Get Request?
        let isGetRequest: boolean = true
        let isGetResponse: boolean = true

        // Use Non-Empty Request Directly
        if (Uint8ArrayToString(rowDate.Request)) {
            isGetRequest = false
            setFlowRequest(rowDate.Request)
        }
        if (Uint8ArrayToString(rowDate.Response)) {
            isGetResponse = false
            setFlowResponse(rowDate.Response)
        }
        // Fetch Data if Request or Response is 0
        if (isGetRequest || isGetResponse) {
            isGetRequest && setFlowRequestLoad(true)
            isGetResponse && setFlowResponseLoad(true)
            ipcRenderer
                .invoke("GetHTTPFlowById", {Id: id})
                .then((i: HTTPFlow) => {
                    if (i.Id == lasetIdRef.current) {
                        if (isGetRequest) {
                            setFlowRequest(i?.Request)
                        }
                        if (isGetResponse) {
                            setFlowResponse(i?.Response)
                        }
                        setFlow(i)
                    }
                })
                .catch((e: any) => {
                    yakitNotify("error", `Query HTTPFlow failed: ${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setFlowRequestLoad(false)
                        setFlowResponseLoad(false)
                    }, 300)
                })
        }
    }

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (isOnlyTable) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [isOnlyTable])

    return (
        <>
            <YakitResizeBox
                lineDirection='top'
                isVer={true}
                lineStyle={{display: isOnlyTable ? "none" : ""}}
                firstNodeStyle={{padding: isOnlyTable ? 0 : undefined}}
                secondNodeStyle={{display: isOnlyTable ? "none" : ""}}
                firstNode={
                    <HTTPFlowTable
                        toPlugin={true}
                        runTimeId={runtimeId}
                        noDeleteAll={true}
                        params={{SourceType: "scan"}}
                        searchURL={searchURL}
                        includeInUrl={includeInUrl}
                        onSelected={(i) => {
                            if (!i) return
                            lasetIdRef.current = i.Id
                            getHTTPFlowById(i.Id, i)
                        }}
                        onSearch={setHighlightSearch}
                        onlyShowFirstNode={isOnlyTable}
                        setOnlyShowFirstNode={onIsOnlyTable}
                        httpHistoryTableTitleStyle={{
                            borderLeft: "1px solid var(--yakit-border-color)",
                            borderRight: "1px solid var(--yakit-border-color)",
                            paddingTop: 12,
                            ...(httpHistoryTableTitleStyle||{}),
                        }}
                        onlyShowSearch={true}
                        showBatchActions={showBatchActions}
                        historyId={historyId}
                        titleHeight={47}
                        containerClassName={containerClassName}
                        pageType={pageType}
                        onQueryParams={onQueryParams}
                        refresh={refresh}
                        toWebFuzzer={toWebFuzzer}
                    />
                }
                secondNode={
                    flow && (!isOnlyTable || showDetail) ? (
                        <HTTPFlowDetailRequestAndResponse
                            id={flow.Id}
                            defaultHttps={flow?.IsHTTPS}
                            flow={flow}
                            Tags={flow.Tags}
                            noHeader={true}
                            search={highlightSearch}
                            flowRequest={flowRequest}
                            flowResponse={flowResponse}
                            flowRequestLoad={flowRequestLoad}
                            flowResponseLoad={flowResponseLoad}
                            sendToWebFuzzer={true}
                            historyId={historyId}
                        />
                    ) : null
                }
                {...ResizeBoxProps}
            />
        </>
    )
}

export interface YakitFeatureRenderProp {
    feature: string
    params: any
    execResultsLog: ExecResultLog[]
    excelName?: string
}

export const YakitFeatureTabName = (feature: string, params: any) => {
    switch (feature) {
        case "website-trees":
            return "Site Tree Structure / Website Map"
        case "fixed-table":
            return params["table_name"] || "Output Table"
    }
    return feature.toUpperCase
}

export const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v) => filterVal.map((j) => v[j]))
}

// Ascending
export const compareAsc = (value1: object, value2: object, text: string, isNumber?: boolean) => {
    try {
        if (isNumber || isNumber === undefined) {
            if (Number(value1[text]) < Number(value2[text])) {
                return -1
            } else if (Number(value1[text]) > Number(value2[text])) {
                return 1
            } else {
                return 0
            }
        } else {
            // Sort by ASCII
            const b = value2[text] + ""
            const a = value1[text] + ""
            return a.localeCompare(b, undefined, {sensitivity: 'base'})
        }
    } catch (error) {
        return 0
    }
}

// Descend
export const compareDesc = (value1: object, value2: object, text: string, isNumber?: boolean) => {
    try {
        if (isNumber || isNumber === undefined) {
            if (Number(value1[text]) > Number(value2[text])) {
                return -1
            } else if (Number(value1[text]) < Number(value2[text])) {
                return 1
            } else {
                return 0
            }
        } else {
            // Sort by ASCII
            const b = value2[text] + ""
            const a = value1[text] + ""
            return b.localeCompare(a, undefined, {sensitivity: 'base'})
        }
        
    } catch (error) {
        return 0
    }
}

export const YakitFeatureRender: React.FC<YakitFeatureRenderProp> = React.memo(
    (props) => {
        const [params, setParams] = useState<any>({}) // Enable Sorting for Headers
        const [sorterTable, setSorterTable] = useState<SortProps>()

        const [query, setQuery] = useState<any>({}) // Set Table Header Query Conditions
        const [loading, setLoading] = useState<boolean>(false)

        const [_, setTableData, getTableData] = useGetState<any>([])
        const tableDataOriginal = useRef<any>([]) // Raw Data for Search and Sort
        const tableDataPreProps = useRef<any>([])
        const tableDataExport = useRef<any>([]) // Export Table Count
        useDebounceEffect(
            () => {
                if (tableDataPreProps.current.length === props.execResultsLog.length) return
                const tableDataList = (props.execResultsLog || [])
                    .filter((i) => i.level === "feature-table-data")
                    .map((i) => {
                        try {
                            const originData = JSON.parse(i.data)
                            return {...originData.data, table_name: originData?.table_name}
                        } catch (e) {
                            return {} as any
                        }
                    })
                    .filter((i) => {
                        try {
                            if ((i?.table_name || "") === (props.params?.table_name || "")) {
                                return true
                            }
                        } catch (e) {
                            return false
                        }
                        return false
                    })
                tableDataExport.current = tableDataList
                tableDataPreProps.current = props.execResultsLog
                if (tableDataOriginal.current.length >= 1000) return
                tableDataOriginal.current = tableDataList
                queryData()
            },
            [props.execResultsLog],
            {wait: 300, leading: true, trailing: true}
        )

        useEffect(() => {
            setTimeout(() => {
                const item = getTableData()[0] || {}
                const obj = {}
                const objQuery = {}
                ;(props.params["columns"] || []).forEach((ele) => {
                    obj[ele] = {
                        isFilter: !Number.isNaN(Number(item[ele])) // Sort Only Numerical
                    }
                    objQuery[ele] = ""
                })
                setParams(obj)
                setQuery(objQuery)
            }, 400)
        }, [])

        const getData = useMemoizedFn(() => {
            return new Promise((resolve) => {
                const header = props.params["columns"]
                const exportData = formatJson(header, tableDataExport.current)
                const params = {
                    header,
                    exportData,
                    response: {
                        Pagination: {
                            Page: 1
                        },
                        Data: props.execResultsLog,
                        Total: props.execResultsLog.length
                    }
                }
                resolve(params)
            })
        })

        useUpdateEffect(() => {
            update()
        }, [query, sorterTable])
        const update = useDebounceFn(
            () => {
                setLoading(true)
                new Promise((resolve, reject) => {
                    try {
                        queryData()
                        resolve(true)
                    } catch (error) {
                        reject(error)
                    }
                })
                    .catch((e) => {
                        yakitFailed("Search failed:" + e)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            },
            {
                wait: 200
            }
        ).run

        // Search
        const queryData = useMemoizedFn(() => {
            try {
                let list: any = []
                const length = tableDataOriginal.current.length
                const queryHaveValue = {}
                // Find Query Conditions
                for (const key in query) {
                    const objItem = query[key]
                    if (objItem) {
                        queryHaveValue[key] = query[key]
                    }
                }
                // When all query conditions are empty, return original data
                if (Object.getOwnPropertyNames(queryHaveValue).length === 0) {
                    list = [...tableDataOriginal.current]
                } else {
                    // Search
                    for (let index = 0; index < length; index++) {
                        const elementArrayItem = tableDataOriginal.current[index]
                        let isAdd: boolean[] = []
                        for (const key in queryHaveValue) {
                            const objItem = queryHaveValue[key]
                            const isHave = `${elementArrayItem[key]}`.includes(objItem)
                            isAdd.push(isHave)
                        }
                        // All Conditions Met
                        if (!isAdd.includes(false)) {
                            list.push(elementArrayItem)
                        }
                        isAdd = []
                    }
                }
                const newDataTable = sorterTable?.order === "none" ? list : sorterFunction(list, sorterTable, "") || []
                setTableData(newDataTable)
            } catch (error) {
                yakitFailed("Search failed:" + error)
            }
        })

        const onTableChange = useMemoizedFn(
            (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
                setQuery(filters)
                setSorterTable(sorter)
            }
        )

        const columns = (props.params["columns"] || []).map((i) => ({
            title: i,
            dataKey: i,
            sorterProps: {
                sorter: params[i]?.isFilter
            },
            filterProps: {
                filtersType: "input"
            }
        }))
        switch (props.feature) {
            case "website-trees":
                return (
                    <div style={{height: "100%"}}>
                        <WebsiteTreeViewer {...props.params} />
                    </div>
                )
            case "fixed-table":
                return (
                    <div className='base-table'>
                        <TableVirtualResize<any>
                            query={query}
                            titleHeight={48}
                            renderTitle={
                                <div className='btn-body'>
                                    <ExportExcel
                                        getData={getData}
                                        btnProps={{size: "small"}}
                                        fileName={props.excelName || "Output Table"}
                                    />
                                </div>
                            }
                            isRefresh={loading}
                            renderKey='uuid'
                            data={getTableData()}
                            loading={loading}
                            enableDrag={true}
                            columns={columns}
                            pagination={{
                                page: 1,
                                limit: 1,
                                total: getTableData().length,
                                onChange: () => {}
                            }}
                            onChange={onTableChange}
                        />
                    </div>
                )
        }
        return <div>Other</div>
    },
    (preProps, nextProps) => {
        if (JSON.stringify(preProps) !== JSON.stringify(nextProps)) {
            return false
        }
        return true
    }
)

interface SimpleCardBoxProps {
    statusCards: StatusCardInfoProps[]
}

export const SimpleCardBox: React.FC<SimpleCardBoxProps> = (props) => {
    const {statusCards} = props
    return (
        <>
            {statusCards.length > 0 && (
                <div className='status-cards-body'>
                    <Row gutter={8}>
                        {statusCards.map((card, cardIndex) => {
                            return (
                                <Col key={card.tag} span={4} style={{marginBottom: 8}}>
                                    <Card
                                        hoverable={true}
                                        bodyStyle={{
                                            paddingTop: 8,
                                            paddingBottom: 4,
                                            paddingLeft: 12,
                                            paddingRight: 12,
                                            height: 80,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <Tooltip
                                            color='#fff'
                                            title={<span className='font-color-000'>{card.tag}</span>}
                                            placement='topLeft'
                                        >
                                            <h2 className='status-cards-tag' style={{marginBottom: 0, fontSize: 16}}>
                                                {card.tag}
                                            </h2>
                                        </Tooltip>
                                        {renderCard(card.info, undefined)}
                                    </Card>
                                </Col>
                            )
                        })}
                    </Row>
                </div>
            )}
        </>
    )
}
