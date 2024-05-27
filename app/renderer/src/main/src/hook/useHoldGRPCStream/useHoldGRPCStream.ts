import {useState, useRef, useEffect} from "react"
import {failed, info} from "../../utils/notification"
import {useMemoizedFn} from "ahooks"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "./useHoldGRPCStreamType"
import {DefaultTabs} from "./constant"

const {ipcRenderer} = window.require("electron")

/** @name Convert Buffer Map (Card Type) to Hook Data (Card Collection)) */
export const convertCardInfo = (maps: Map<string, HoldGRPCStreamProps.CacheCard>) => {
    const cardArr: HoldGRPCStreamProps.InfoCard[] = []
    maps.forEach((value) => {
        let item: HoldGRPCStreamProps.InfoCard = {
            Id: value.Id,
            Data: value.Data,
            Timestamp: value.Timestamp,
            Tag: value?.Tags ? value.Tags[0] || "" : ""
        }
        cardArr.push(item)
    })
    cardArr.sort((a, b) => a.Id.localeCompare(b.Id))
    let cardObj: {[key: string]: HoldGRPCStreamProps.InfoCards} = {}
    for (let el of cardArr) {
        if (el.Tag) {
            if (cardObj[el.Tag]) {
                cardObj[el.Tag].info.push(el)
            } else {
                cardObj[el.Tag] = {tag: el.Tag, info: [el]}
            }
        } else {
            cardObj[el.Id] = {tag: el.Id, info: [el]}
        }
    }
    return Object.values(cardObj)
}

export interface HoldGRPCStreamParams {
    /** @name Persistent Tabs for Result Display */
    tabs?: HoldGRPCStreamProps.InfoTab[]
    /** @name Task Name */
    taskName: string
    /** @name Backend API */
    apiKey: string
    /** @name Data Stream Token */
    token: string
    /** @name Data Stream Request Interval (Default:500, Unit:ms)) */
    waitTime?: number
    /** @name Data Stream End Callback */
    onEnd?: () => any
    /** @name Data Stream Error Callback */
    onError?: (e: any) => void
    /** @name Additional Data Filter Method */
    dataFilter?: (obj: StreamResult.Message, content: StreamResult.Log) => boolean
    /** @name Set run-time-id */
    setRuntimeId?: (runtimeId: string) => any
}

export default function useHoldGRPCStream(params: HoldGRPCStreamParams) {
    const {
        tabs: defaultTabs = DefaultTabs,
        taskName,
        apiKey,
        token,
        waitTime = 500,
        onEnd,
        onError,
        dataFilter,
        setRuntimeId
    } = params

    const [streamInfo, setStreamInfo] = useState<HoldGRPCStreamInfo>({
        progressState: [],
        cardState: [],
        tabsState: [],
        tabsInfoState: {},
        riskState: [],
        logState: []
    })

    // Start Data Stream Timer
    const timeRef = useRef<any>(null)

    // runtime-id
    const runTimeId = useRef<{cache: string; sent: string}>({cache: "", sent: ""})
    // progress
    let progressKVPair = useRef<Map<string, number>>(new Map<string, number>())
    // card
    let cardKVPair = useRef<Map<string, HoldGRPCStreamProps.CacheCard>>(
        new Map<string, HoldGRPCStreamProps.CacheCard>()
    )

    // Leading Tabs
    const topTabs = useRef<HoldGRPCStreamProps.InfoTab[]>([])
    // Trailing Tabs
    const endTabs = useRef<HoldGRPCStreamProps.InfoTab[]>([])

    // tabInfo-website
    const tabWebsite = useRef<StreamResult.WebSite>()
    // tabInfo-table
    const tabTable = useRef<Map<string, HoldGRPCStreamProps.CacheTable>>(
        new Map<string, HoldGRPCStreamProps.CacheTable>()
    )
    // tabInfo-text
    const tabsText = useRef<Map<string, string>>(new Map<string, string>())
    // risks
    let riskMessages = useRef<StreamResult.Risk[]>([])
    // logs
    let messages = useRef<StreamResult.Message[]>([])

    /** Custom Tab Order */
    const placeTab = useMemoizedFn((isHead: boolean, info: HoldGRPCStreamProps.InfoTab) => {
        topTabs.current.unshift(info)
    })

    /** Add to Log Queue */
    const pushLogs = useMemoizedFn((log: StreamResult.Message) => {
        messages.current.unshift(log)
        // Cache Only 100 Entries (Log + Data Types)）
        if (messages.current.length > 100) {
            messages.current.pop()
        }
    })

    /** Validate Data */
    const checkStreamValidity = useMemoizedFn((stream: StreamResult.Log) => {
        try {
            const check = JSON.parse(stream.data)
            if (check === "null" || !check || check === "undefined") return false
            return check
        } catch (e) {
            return false
        }
    })

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: StreamResult.BaseProsp) => {
            // run-time-id
            if (!!data?.RuntimeID) {
                runTimeId.current.cache = data.RuntimeID
            }

            if (data.IsMessage) {
                try {
                    let obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())

                    // progress Progress Bar
                    if (obj.type === "progress") {
                        const processData = obj.content as StreamResult.Progress
                        if (processData && processData.id) {
                            progressKVPair.current.set(
                                processData.id,
                                Math.max(progressKVPair.current.get(processData.id) || 0, processData.progress)
                            )
                        }
                        return
                    }

                    const logData = obj.content as StreamResult.Log

                    // feature-status-card-data Card Display
                    if (obj.type === "log" && logData.level === "feature-status-card-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return

                            const obj: StreamResult.Card = checkInfo
                            const {id, data, tags} = obj
                            const {timestamp} = logData
                            const originData = cardKVPair.current.get(id)
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            cardKVPair.current.set(id, {
                                Id: id,
                                Data: data,
                                Timestamp: timestamp,
                                Tags: Array.isArray(tags) ? tags : []
                            })
                        } catch (e) {}
                        return
                    }

                    // new-tab (Auto-added Tab))
                    if (obj.type === "log" && logData.level === "json-feature") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const info: {feature: string; params: any; [key: string]: any} = checkInfo

                            let tabInfo: HoldGRPCStreamProps.InfoTab = {tabName: "", type: ""}
                            switch (info.feature) {
                                case "website-trees":
                                    const website = info.params as StreamResult.WebSite
                                    // tabInfo = {tabName: "Website Tree Structure", type: "website"}
                                    // placeTab(!!info.at_head, tabInfo)
                                    tabWebsite.current = website
                                    break
                                case "fixed-table":
                                    const table = info.params as StreamResult.Table
                                    tabInfo = {tabName: table.table_name, type: "table"}

                                    placeTab(!!info.at_head, tabInfo)

                                    if (tabTable.current.get(table.table_name)) {
                                        pushLogs(obj)
                                        break
                                    }
                                    tabTable.current.set(table.table_name, {
                                        name: table.table_name,
                                        columns: table.columns.map((item) => {
                                            return {title: item, dataKey: item}
                                        }),
                                        data: new Map<string, any[]>()
                                    } as HoldGRPCStreamProps.CacheTable)
                                    break
                                case "text":
                                    const text = info.params as StreamResult.Text
                                    tabInfo = {tabName: text.tab_name, type: "text"}

                                    placeTab(!!info.at_head, tabInfo)
                                    if (tabsText.current.get(text.tab_name)) {
                                        pushLogs(obj)
                                        break
                                    }
                                    tabsText.current.set(text.tab_name, "")
                                    break

                                default:
                                    pushLogs(obj)
                                    break
                            }
                        } catch (e) {}
                        return
                    }

                    // Custom Table Data
                    if (obj.type === "log" && logData.level === "feature-table-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return

                            const tableOpt: StreamResult.TableDataOpt = checkInfo
                            const originTable = tabTable.current.get(tableOpt.table_name)
                            if (!originTable) {
                                pushLogs(obj)
                                return
                            }

                            const datas = originTable?.data || (new Map() as HoldGRPCStreamProps.CacheTable["data"])
                            // uuid Must Exist, Else Dirty Data
                            if (!tableOpt.data.uuid) {
                                pushLogs(obj)
                                return
                            }
                            datas.set(tableOpt.data.uuid, tableOpt.data)
                            tabTable.current.set(tableOpt.table_name, {
                                name: originTable.name,
                                columns: originTable.columns,
                                data: datas
                            })
                        } catch (e) {}
                        return
                    }

                    // Custom Text Data
                    if (obj.type === "log" && logData.level === "feature-text-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return

                            const textData: StreamResult.TextData = checkInfo
                            const content = tabsText.current.get(textData.table_name)
                            if (content === undefined) {
                                pushLogs(obj)
                                return
                            }

                            if (content === textData.data) return
                            tabsText.current.set(textData.table_name, textData.data)
                        } catch (e) {}
                        return
                    }

                    // risk Risk Info List
                    if (obj.type === "log" && logData.level === "json-risk") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const risk: StreamResult.Risk = checkInfo
                            riskMessages.current.unshift(risk)
                        } catch (e) {}
                        return
                    }

                    // External Filter Method
                    if (dataFilter && dataFilter(obj, logData)) return
                    // Log Info
                    pushLogs(obj)
                } catch (e) {}
            }
        })
        // token-error
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[Mod] ${taskName} error: ${error}`)
            if (onError) {
                onError(error)
            }
        })
        // token-end
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info(`[Mod] ${taskName} finished`)
            handleResults()
            if (onEnd) {
                onEnd()
            }
        })

        return () => {
            stop()
            cancel()
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    /** @name Data Stream Processing Logic */
    const handleResults = useMemoizedFn(() => {
        // runtime-id
        if (runTimeId.current.sent !== runTimeId.current.cache && setRuntimeId) {
            setRuntimeId(runTimeId.current.cache)
            runTimeId.current.sent = runTimeId.current.cache
        }
        // progress
        const cacheProgress: StreamResult.Progress[] = []
        progressKVPair.current.forEach((value, id) => {
            cacheProgress.push({id: id, progress: value})
        })
        // card
        const cacheCard: HoldGRPCStreamProps.InfoCards[] = convertCardInfo(cardKVPair.current)
        // tabs
        const tabs: HoldGRPCStreamProps.InfoTab[] = topTabs.current.concat(defaultTabs).concat(endTabs.current)
        // tabsInfo
        const tabsInfo: HoldGRPCStreamInfo["tabsInfoState"] = {}
        if (tabWebsite.current) {
            tabsInfo["website"] = tabWebsite.current
        }
        if (tabTable.current.size > 0) {
            tabTable.current.forEach((value, key) => {
                const arr: HoldGRPCStreamProps.InfoTable["data"] = []
                value.data.forEach((item) => arr.push(item))

                tabsInfo[key] = {
                    name: value.name,
                    columns: value.columns,
                    data: arr
                } as HoldGRPCStreamProps.InfoTable
            })
        }
        if (tabsText.current.size > 0) {
            tabsText.current.forEach((value, key) => {
                tabsInfo[key] = {
                    content: value
                } as HoldGRPCStreamProps.InfoText
            })
        }
        // risk
        const risks: StreamResult.Risk[] = [...riskMessages.current]
        // logs
        const logs: StreamResult.Log[] = messages.current
            .filter((i) => i.type === "log")
            .map((i) => i.content as StreamResult.Log)
            .filter((i) => i.data !== "null")

        setStreamInfo({
            progressState: cacheProgress,
            cardState: cacheCard,
            tabsState: tabs,
            tabsInfoState: tabsInfo,
            riskState: risks,
            logState: logs
        })
    })

    useEffect(() => {
        if (waitTime > 0 && !!timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
            timeRef.current = setInterval(() => handleResults(), waitTime)
        }
    }, [waitTime])

    /** @name Start Data Stream */
    const start = useMemoizedFn(() => {
        if (timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
        }
        timeRef.current = setInterval(() => handleResults(), waitTime)
    })
    /** @name Stop Data Stream */
    const stop = useMemoizedFn(() => {
        if (timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
        }
    })
    /** @name Close Data Stream */
    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke(`cancel-${apiKey}`, token)
    })
    /** @name Reset Data Stream */
    const reset = useMemoizedFn(() => {
        setStreamInfo({
            progressState: [],
            cardState: [],
            tabsState: [],
            tabsInfoState: {},
            riskState: [],
            logState: []
        })

        runTimeId.current = {cache: "", sent: ""}
        progressKVPair.current = new Map<string, number>()
        cardKVPair.current = new Map<string, HoldGRPCStreamProps.CacheCard>()
        topTabs.current = []
        endTabs.current = []
        tabWebsite.current = undefined
        tabTable.current = new Map<string, HoldGRPCStreamProps.CacheTable>()
        tabsText.current = new Map<string, string>()
        riskMessages.current = []
        messages.current = []
    })

    return [streamInfo, {start, stop, cancel, reset}] as const
}
