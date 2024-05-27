import React, {useEffect, useMemo, useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ArrowNarrowRightIcon, ChevronDownIcon, ChevronUpIcon, QuitIcon, RefreshIcon} from "@/assets/newIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {DNSLogEvent, DNS_LOG_PAGE_UPDATE_TOKEN, SendMenuDnslogProps} from "@/pages/dnslog/DNSLogPage"
import {yakitNotify} from "@/utils/notification"
import {formatTime} from "@/utils/timeUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {YakitRoute} from "@/routes/newRoute"

import classNames from "classnames"
import styles from "./MenuDNSLog.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RemoteGV} from "@/yakitGV"
import {LoadingOutlined} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

interface MenuDNSLogProps {}

interface UpdateTokenParams {
    Addr: string
    DNSMode: string
    UseLocal: boolean
}

export interface DnslogMenuToPage {
    token: string
    domain: string
    onlyARecord: boolean
    dnsMode: string
    useLocal: boolean
    isReset?: boolean
}

export const MenuDNSLog: React.FC<MenuDNSLogProps> = React.memo((props) => {
    const [token, setToken, getToken] = useGetState("")
    const [domain, setDomain, getDomain] = useGetState("")
    const [lastRecords, setLastRecords] = useState<DNSLogEvent[]>([])
    const [records, setRecords] = useState<DNSLogEvent[]>([])
    const [total, setTotal] = useState<number>(0)
    const [onlyARecord, setOnlyARecord, getOnlyARecord] = useGetState(false)
    const [dnsMode, setDNSMode, getDNSMode] = useGetState<string>("")
    const [useLocal, setUseLocal, getUseLocal] = useGetState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalDNSLogOnlyARecord).then((setting: string) => {
            setOnlyARecord(setting === "true")
        })
    }, [])

    useEffect(() => {
        setRemoteValue(RemoteGV.GlobalDNSLogOnlyARecord, onlyARecord + "")
    }, [onlyARecord])

    // Generate Configuration for Page
    const generateData = useMemoizedFn(() => {
        return {
            token,
            domain,
            onlyARecord,
            dnsMode,
            useLocal
        }
    })
    // Sync New dnslog Parameters to Page
    const sendPageDnslog = useMemoizedFn((data: DnslogMenuToPage) => {
        ipcRenderer.invoke("dnslog-menu-to-page", data)
    })

    useEffect(() => {
        // Receive Request Parameters Sent from dnslog Page
        ipcRenderer.on("dnslog-page-to-menu-callback", () => {
            sendPageDnslog(generateData())
        })
        // Receive New Parameters after dnslog Page Changes
        ipcRenderer.on("dnslog-page-change-menu-callback", (e, data: SendMenuDnslogProps) => {
            const {dnsLogType, onlyARecord, token, domain, DNSMode, UseLocal} = data
            setOnlyARecord(onlyARecord)
            if (dnsLogType === "builtIn") {
                if (getToken() === "" && token === "" && getDomain() === "" && domain === "") {
                    DNSMode && setDNSMode(DNSMode)
                    UseLocal !== undefined && setUseLocal(UseLocal)
                    return
                }
                if (getToken() && token === "" && getDomain() && domain === "") {
                    DNSMode && setDNSMode(DNSMode)
                    UseLocal !== undefined && setUseLocal(UseLocal)
                    return
                }
                if (getToken() !== token || getDomain() !== domain) {
                    setToken(token || "")
                    setDomain(domain || "")
                    DNSMode && setDNSMode(DNSMode)
                    UseLocal !== undefined && setUseLocal(UseLocal)
                    setLastRecords([])
                    setRecords([])
                    setTotal(0)
                }
            }
        })

        return () => {
            ipcRenderer.removeAllListeners("dnslog-page-to-menu-callback")
        }
    }, [])

    const [tokenLoading, setTokenLoading] = useState<boolean>(false)

    const updateToken = (params?: UpdateTokenParams) => {
        let paramsObj: any = {
            Addr: ""
        }
        if (params) {
            paramsObj.Addr = params.Addr
            paramsObj.DNSMode = params.DNSMode
            paramsObj.UseLocal = params.UseLocal
            setDNSMode(params.DNSMode)
            setUseLocal(params.UseLocal)
        }

        setTokenLoading(true)
        ipcRenderer
            .invoke("RequireDNSLogDomain", paramsObj)
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                setLastRecords([])
                sendPageDnslog({
                    token: rsp.Token,
                    domain: rsp.Domain,
                    onlyARecord: getOnlyARecord(),
                    dnsMode: getDNSMode(),
                    useLocal: getUseLocal()
                })
            })
            .catch((e) => {
                yakitNotify("error", `error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => {
                setTimeout(() => {
                    setTokenLoading(false)
                }, 100)
            })
    }

    const updateTokenByScript = (params) => {
        setTokenLoading(true)
        ipcRenderer
            .invoke("RequireDNSLogDomainByScript", {ScriptName: params.ScriptName})
            .then((rsp: {Domain: string; Token: string}) => {
                setToken(rsp.Token)
                setDomain(rsp.Domain)
                setLastRecords([])
                sendPageDnslog({
                    token: rsp.Token,
                    domain: rsp.Domain,
                    onlyARecord: getOnlyARecord(),
                    dnsMode: getDNSMode(),
                    useLocal: getUseLocal()
                })
            })
            .catch((e) => {
                yakitNotify("error", `error: ${e}`)
                setToken("")
                setDomain("")
            })
            .finally(() => {
                setTimeout(() => setTokenLoading(false), 100)
            })
    }

    const update = useMemoizedFn(() => {
        getRemoteValue(DNS_LOG_PAGE_UPDATE_TOKEN).then((data) => {
            if (!data) {
                // Built-in Default
                updateToken()
            } else {
                let obj = JSON.parse(data)
                // Built-in
                if (obj.type === "builtIn") {
                    updateToken(obj)
                }
                // Custom
                else if (obj.type === "custom" && obj.ScriptName.length > 0) {
                    updateTokenByScript(obj)
                } else {
                    updateToken()
                }
            }
        })
    })

    const isQueryDNSLogLoad = useRef<boolean>(false)
    const getQueryDNSLogByToken = useMemoizedFn(() => {
        setLoading(true)
        isQueryDNSLogLoad.current = true
        ipcRenderer
            .invoke("QueryDNSLogByToken", {Token: token, DNSMode: getDNSMode(), UseLocal: getUseLocal()})
            .then((rsp: {Events: DNSLogEvent[]}) => {
                setTotal(rsp.Events.length)
                const lists = rsp.Events.filter((i) => {
                    if (getOnlyARecord()) {
                        return i.DNSType === "A"
                    }
                    return true
                })
                    .map((i, index) => {
                        return {...i, Index: index}
                    })
                    .reverse()

                if (lists.length <= 3) {
                    setLastRecords(lists.slice(0, 3))
                } else {
                    setLastRecords(lists.slice(lists.length - 3, lists.length))
                }
                setRecords(lists)
                lists.length > 0 && setLoading(false)
            })
            .catch(() => {
                setLoading(false)
            })
            .finally(() => {
                isQueryDNSLogLoad.current = false
            })
    })

    useEffect(() => {
        if (!token) {
            return
        }
        getQueryDNSLogByToken()
        const id = setInterval(() => {
            if (!isQueryDNSLogLoad.current) {
                getQueryDNSLogByToken()
            }
        }, 5000)
        return () => {
            clearInterval(id)
        }
    }, [token])

    const onInfoDetails = useMemoizedFn((info: DNSLogEvent) => {
        ipcRenderer.invoke("send-to-tab", {
            type: YakitRoute.DNSLog,
            data: {}
        })
        setTimeout(() => {
            ipcRenderer.invoke("dnslog-info-details", info)
        }, 200)
    })
    const onInfoAll = useMemoizedFn(() => {
        ipcRenderer.invoke("send-to-tab", {
            type: YakitRoute.DNSLog,
            data: {}
        })
    })

    // Reset
    const reset = useMemoizedFn(() => {
        setToken("")
        setDomain("")
        setLastRecords([])
        setRecords([])
        setTotal(0)
        setLoading(false)
        setTokenLoading(false)
        isQueryDNSLogLoad.current = false
        sendPageDnslog({...generateData(), isReset: true})
    })

    // Hide dnslog List?
    const [isHide, setIsHide] = useState<boolean>(false)

    const [listShow, setListShow] = useState<boolean>(false)
    const listDom = useMemo(() => {
        return (
            <div className={styles["list-info-wrapper"]}>
                <div className={styles["list-header-wrapper"]}>
                    <div className={styles["header-body"]}>
                        <div className={styles["title-style"]}>Access Logs</div>
                        <div className={styles["sub-title-style"]}>
                            Total <span className={styles["total-style"]}>{total}</span>
                        </div>
                    </div>
                    <div className={styles["extra-header-body"]}>
                        A Records Only
                        <YakitSwitch
                            wrapperClassName={styles["switch-style"]}
                            checked={onlyARecord}
                            onChange={(val: boolean) => {
                                setOnlyARecord(val)
                                sendPageDnslog({token, domain, onlyARecord: val, dnsMode, useLocal})
                            }}
                        />
                    </div>
                </div>

                <div className={styles["list-body"]}>
                    <div className={styles["body-header"]}>
                        <div className={classNames(styles["opt-style"], styles["opt-type"])}>Type</div>
                        <div className={classNames(styles["opt-style"], styles["opt-ip"])}>Remote IP</div>
                        <div className={classNames(styles["opt-style"], styles["opt-time"])}>Time</div>
                        <div className={classNames(styles["opt-style"], styles["opt-btn"])}>Action</div>
                    </div>
                    <div className={styles["body-container"]}>
                        <div className={styles["container-body"]}>
                            {records.map((item) => {
                                return (
                                    <div key={`${item.RemoteAddr}-${item.Timestamp}`} className={styles["list-opt"]}>
                                        <div className={classNames(styles["opt-style"], styles["opt-type"])}>
                                            {item.DNSType}
                                        </div>
                                        <div className={classNames(styles["opt-style"], styles["opt-ip"])}>
                                            {item.RemoteIP}
                                        </div>
                                        <div className={classNames(styles["opt-style"], styles["opt-time"])}>
                                            {formatTime(item.Timestamp)}
                                        </div>
                                        <div
                                            className={classNames(styles["opt-style"], styles["opt-btn"])}
                                            onClick={() => onInfoDetails(item)}
                                        >
                                            Details
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [onlyARecord, records])

    return (
        <div className={classNames(styles["menu-dnslog-wrapper"], {[styles["menu-dnslog-hide-wrapper"]]: isHide})}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    if (width <= 508) setIsHide(true)
                    else setIsHide(false)
                }}
                handleWidth={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />

            <div className={styles["dnslog-generate-host"]}>
                <div className={!!domain ? styles["generated-wrapper"] : styles["generate-wrapper"]}>
                    <div className={styles["title-style"]}>Use Yakit Built-in DNSLog Callback Service</div>
                    {!!domain ? (
                        <YakitButton key={"close"} danger size='small' icon={<QuitIcon />} onClick={reset}>
                            Close
                        </YakitButton>
                    ) : (
                        <YakitButton key={"create"} size='small' loading={tokenLoading} onClick={update}>
                            Generate Domain
                        </YakitButton>
                    )}
                </div>
                {!!domain && (
                    <YakitTag className={styles["dnslog-yakit-tag"]} color='info' copyText={domain} enableCopy={true}>
                        {domain}
                    </YakitTag>
                )}
                {/* Display Conditions: Domain Generated & Historical Data & Too Narrow */}
                {!!domain && isHide && records.length > 0 && (
                    <YakitButton type='text' onClick={onInfoAll}>
                        View Access Logs
                    </YakitButton>
                )}
            </div>

            <div className={styles["dnslog-arrow-right-wrapper"]}>
                <div className={styles["dnslog-arrow-right-body"]}>
                    <div className={styles["title-style"]}>
                        {!!domain ? (
                            <>
                                {loading ? (
                                    <>
                                        Loading&nbsp;&nbsp;<LoadingOutlined style={{color: "var(--yakit-primary-5)"}} />
                                    </>
                                ) : (
                                    <>
                                        <YakitButton
                                            type='text2'
                                            onClick={getQueryDNSLogByToken}
                                        >Manual Refresh<RefreshIcon /></YakitButton>
                                    </>
                                )}
                            </>
                        ) : (
                            "Access Logs"
                        )}
                    </div>
                    <div className={styles["icon-style"]}>
                        <ArrowNarrowRightIcon />
                    </div>
                </div>
            </div>

            <div className={styles["dnslog-list-wrapper"]}>
                <div className={styles["dnslog-list-body"]}>
                    {lastRecords.map((item, index) => {
                        return (
                            <div
                                key={`${item.RemoteAddr}-${item.Timestamp}-${index}`}
                                className={styles["list-opt-wrapper"]}
                            >
                                <div className={classNames(styles["opt-style"], styles["opt-type"])}>
                                    {item.DNSType}
                                </div>
                                <div className={classNames(styles["opt-style"], styles["opt-ip"])}>{item.RemoteIP}</div>
                                <div className={classNames(styles["opt-style"], styles["opt-time"])}>
                                    {formatTime(item.Timestamp)}
                                </div>
                                <div
                                    className={classNames(styles["opt-style"], styles["opt-btn"])}
                                    onClick={() => onInfoDetails(item)}
                                >
                                    Details
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div
                    className={classNames(styles["expand-func-wrapper"], {
                        [styles["active-expand-style"]]: listShow
                    })}
                >
                    <YakitPopover
                        overlayClassName={styles["dnslog-list-popover"]}
                        overlayStyle={{paddingTop: 2}}
                        placement='bottomRight'
                        trigger={"click"}
                        content={listDom}
                        visible={listShow}
                        onVisibleChange={(visible) => setListShow(visible)}
                    >
                        <div className={styles["body-style"]}>{listShow ? <ChevronUpIcon /> : <ChevronDownIcon />}</div>
                    </YakitPopover>
                </div>
            </div>
        </div>
    )
})
