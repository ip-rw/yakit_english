import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {failed, info, yakitFailed, yakitNotify} from "@/utils/notification"
import {ExclamationIcon} from "@/assets/newIcon"
import {YakitSystem} from "@/yakitGVDefine"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {
    ErrorIcon,
    HelpIcon,
    ShieldCheckIcon as AllShieldCheckIcon,
    SuccessIcon,
    WarningIcon,
    RocketIcon,
    RocketOffIcon
} from "./globalStateIcon"
import {showConfigSystemProxyForm, showConfigChromePathForm} from "@/utils/ConfigSystemProxy"
import {showModal} from "@/utils/showModal"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {Tooltip, Row, Col} from "antd"
import {isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"

import classNames from "classnames"
import styles from "./globalState.module.scss"
import {useRunNodeStore} from "@/store/runNode"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import emiter from "@/utils/eventBus/eventBus"
import {serverPushStatus} from "@/utils/duplex/duplex"
import {openABSFileLocated} from "@/utils/openWebsite"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"

const {ipcRenderer} = window.require("electron")

/** Different icons for different states */
const ShowIcon: Record<string, ReactNode> = {
    error: <ExclamationIcon className={styles["icon-style"]} />,
    warning: <ExclamationIcon className={styles["icon-style"]} />,
    success: <RocketIcon className={styles["icon-style"]} />,
    help: <RocketOffIcon className={styles["icon-style"]} />
}
/** Different component colors for different states */
const ShowColorClass: Record<string, string> = {
    error: styles["error-wrapper-bgcolor"],
    warning: styles["warning-wrapper-bgcolor"],
    success: styles["success-wrapper-bgcolor"],
    help: styles["help-wrapper-bgcolor"]
}

export interface GlobalReverseStateProp {
    isEngineLink: boolean
    system: YakitSystem
}

/** Global callback server parameters */
interface ReverseDetail {
    PublicReverseIP: string
    PublicReversePort: number
    LocalReverseAddr: string
    LocalReversePort: number
}

export const GlobalState: React.FC<GlobalReverseStateProp> = React.memo((props) => {
    const {isEngineLink, system} = props

    /** Auto-start global callback configured (default local)) */
    useEffect(() => {
        if (isEngineLink) {
            getRemoteValue(RemoteGV.GlobalBridgeAddr).then((addr) => {
                getRemoteValue(RemoteGV.GlobalBridgeSecret).then((secret) => {
                    ipcRenderer
                        .invoke("ConfigGlobalReverse", {
                            ConnectParams: {Addr: addr, Secret: secret},
                            LocalAddr: ""
                        })
                        .then((a: any) => console.info("AutoStart-GlobalCallback configured"))
                        .catch((e) => console.info(e))

                    getRemoteValue(RemoteGV.GlobalDNSLogBridgeInherit).then((data) => {
                        switch (`${data}`) {
                            case "true":
                                ipcRenderer
                                    .invoke("SetYakBridgeLogServer", {
                                        DNSLogAddr: addr,
                                        DNSLogSecret: `${secret}`
                                    })
                                    .then(() => info("Global DNSLog configured"))
                                    .catch((e) => failed(`Global DNSLog configuration failed：${e}`))
                                break
                            case "false":
                                getRemoteValue(RemoteGV.GlobalDNSLogAddr).then((dnslogAddr: string) => {
                                    if (!!dnslogAddr) {
                                        getRemoteValue(RemoteGV.GlobalDNSLogSecret).then((secret: string) => {
                                            ipcRenderer
                                                .invoke("SetYakBridgeLogServer", {
                                                    DNSLogAddr: dnslogAddr,
                                                    DNSLogSecret: `${secret}`
                                                })
                                                .then(() => info("Global DNSLog configured"))
                                                .catch((e) => failed(`Global DNSLog configuration failed：${e}`))
                                        })
                                    }
                                })
                                break
                        }
                    })
                })
            })
        }
    }, [isEngineLink])

    const [pcap, setPcap] = useState<{
        IsPrivileged: boolean
        Advice: string
        AdviceVerbose: string
    }>({Advice: "unknown", AdviceVerbose: "PCAP support info unavailable", IsPrivileged: false})
    /** Acquire network card permissions */
    const updatePcap = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("IsPrivilegedForNetRaw", {})
                .then((res) => {
                    setPcap(res)
                    resolve("pcap")
                })
                .catch((e) => reject(`error-pcap ${e}`))
        })
    })

    const [pluginTotal, setPluginTotal] = useState<number>(0)

    /** Get local plugin count */
    const updatePluginTotal = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("QueryYakScript", {
                    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
                })
                .then((item: QueryYakScriptsResponse) => {
                    if (isEnpriTraceAgent() && +item.Total < 100) {
                        // Portable version detects plugins if <100
                        setPluginTotal(0)
                    } else {
                        setPluginTotal(+item.Total || 0)
                    }
                    resolve("plugin-total")
                })
                .catch((e) => {
                    reject(`error-plugin-total ${e}`)
                })
        })
    })

    const [reverseState, setReverseState] = useState<boolean>(false)
    const [reverseDetails, setReverseDetails, getReverseDetails] = useGetState<ReverseDetail>({
        LocalReverseAddr: "",
        LocalReversePort: 0,
        PublicReverseIP: "",
        PublicReversePort: 0
    })
    const isReverseState = useMemo(() => {
        return reverseState && !!reverseDetails.PublicReverseIP && !!reverseDetails.PublicReversePort
    }, [reverseState, reverseDetails])
    /** Get global callback status and config */
    const updateGlobalReverse = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("get-global-reverse-server-status")
                .then((flag: boolean) => {
                    setReverseState(flag)
                    if (flag) {
                        ipcRenderer
                            .invoke("GetGlobalReverseServer", {})
                            .then((data: ReverseDetail) => {
                                if (JSON.stringify(data) !== JSON.stringify(getReverseDetails())) {
                                    setReverseDetails(data)
                                }
                                resolve("global-reverse")
                            })
                            .catch((e) => reject(`error-global-reverse ${e}`))
                    } else {
                        resolve("global-reverse")
                    }
                })
                .catch((e) => reject(`error-global-reverse ${e}`))
        })
    })

    const [systemProxy, setSystemProxy] = useState<{
        Enable: boolean
        CurrentProxy: string
    }>({Enable: false, CurrentProxy: ""})
    /** Get system proxy */
    const updateSystemProxy = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("GetSystemProxy", {})
                .then((res: {CurrentProxy: string; Enable: boolean}) => {
                    setSystemProxy(res)
                    resolve("system-proxy")
                })
                .catch((e) => reject(`error-system-proxy ${e}`))
        })
    })
    const [showChromeWarn, setShowChromeWarn] = useState<boolean>(false)
    /** Get Chrome Path */
    const updateChromePath = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("GetChromePath")
                .then((chromePath: string) => {
                    if (chromePath) return
                    else {
                        setShowChromeWarn(true)
                    }
                })
                .catch((e) => reject(`error-chrome-path ${e}`))
                .finally(() => {
                    resolve("chrome-path")
                })
        })
    })
    const [showMITMCertWarn, setShowMITMCertWarn] = useState<boolean>(false)

    const updateMITMCert = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("VerifySystemCertificate")
                .then((res) => {
                    if (res.valid) {
                        setShowMITMCertWarn(false)
                    } else {
                        setShowMITMCertWarn(true)
                    }
                    if (res.Reason != "") {
                        reject(`error-mitm-cert ${res.Reason}`)
                    }
                })
                .catch((e) => reject(`error-mitm-cert ${e}`))
                .finally(() => {
                    resolve("mitm-cert")
                })
        })
    })

    const [state, setState] = useState<string>("error")
    const [stateNum, setStateNum] = useState<number>(0)

    const updateState = useMemoizedFn(() => {
        let status = "success"
        let count = 0
        /**
         * @Reverse order of description and UI display due to priority
         * Priority Order: 'error' > 'warning' > 'help' > 'success'
         */
        if (!isEnpriTraceAgent()) {
            if (!systemProxy.Enable) status = "help"
            if (!reverseState || !reverseDetails.PublicReverseIP || !reverseDetails.PublicReversePort) {
                status = "warning"
                count = count + 1
            }
        }
        if (showChromeWarn) {
            status = "warning"
            count = count + 1
        }
        if (!pcap.IsPrivileged) {
            status = system === "Windows_NT" ? "warning" : "error"
            count = count + 1
        }
        if (pluginTotal === 0) {
            status = "error"
            count = count + 1
        }
        if (showMITMCertWarn) {
            status = "error"
            count = count + 1
        }
        setState(status)
        setStateNum(count)
    })
    // Poller logic running?
    const isRunRef = useRef<boolean>(false)
    const updateAllInfo = useMemoizedFn(() => {
        if (isRunRef.current) return

        isRunRef.current = true
        Promise.allSettled(
            serverPushStatus
                ? [updateSystemProxy(), updateGlobalReverse(), updatePcap(), updateChromePath(), updateMITMCert()]
                : [
                      updateSystemProxy(),
                      updateGlobalReverse(),
                      updatePcap(),
                      updatePluginTotal(),
                      updateChromePath(),
                      updateMITMCert()
                  ]
        )
            .then((values) => {
                isRunRef.current = false
                setTimeout(() => updateState(), 100)
            })
            .catch(() => {})
    })

    const [timeInterval, setTimeInterval, getTimeInterval] = useGetState<number>(5)
    const timeRef = useRef<any>(null)
    // Start global status poller
    useEffect(() => {
        let timer: any = null
        if (isEngineLink) {
            getRemoteValue(RemoteGV.GlobalStateTimeInterval).then((time: any) => {
                setTimeInterval(+time || 5)
                if ((+time || 5) > 5) updateAllInfo()
            })

            if (timer) clearInterval(timer)
            timer = setInterval(() => {
                setRemoteValue(RemoteGV.GlobalStateTimeInterval, `${getTimeInterval()}`)
            }, 20000)
            updatePluginTotal()
            emiter.on("onRefreshQueryYakScript", updatePluginTotal)
        } else {
            // init
            setPcap({Advice: "unknown", AdviceVerbose: "PCAP support info unavailable", IsPrivileged: false})
            setPluginTotal(0)
            setReverseState(false)
            setReverseDetails({
                LocalReverseAddr: "",
                LocalReversePort: 0,
                PublicReverseIP: "",
                PublicReversePort: 0
            })
            setSystemProxy({Enable: false, CurrentProxy: ""})

            setState("error")
            setStateNum(0)

            isRunRef.current = false
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
        }

        return () => {
            if (isEngineLink) emiter.off("onRefreshQueryYakScript", updatePluginTotal)
            if (timer) clearInterval(timer)
            timer = null
        }
    }, [isEngineLink])
    // After changing query interval
    useDebounceEffect(
        () => {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = setInterval(updateAllInfo, timeInterval * 1000)

            return () => {
                isRunRef.current = false
                if (timeRef.current) clearInterval(timeRef.current)
                timeRef.current = null
            }
        },
        [timeInterval],
        {wait: 300}
    )

    const [show, setShow] = useState<boolean>(false)

    const [pcapHintShow, setPcapHintShow] = useState<boolean>(false)
    const [pcapResult, setPcapResult] = useState<boolean>(false)
    const [pcapHintLoading, setPcapHintLoading] = useState<boolean>(false)
    // Enable PCAP permissions
    const openPcapPower = useMemoizedFn(() => {
        setPcapHintLoading(true)
        ipcRenderer
            .invoke(`PromotePermissionForUserPcap`, {})
            .then(() => {
                setPcapResult(true)
            })
            .catch((e) => {
                failed(`Failed to elevate PCAP user permissions：${e}`)
            })
            .finally(() => setPcapHintLoading(false))
    })

    const [pluginShow, setPluginShow] = useState<boolean>(false)
    // Download all cloud plugins
    const downloadAllPlugin = useMemoizedFn(() => {
        if (pluginShow) return
        setShow(false)
        setPluginShow(true)
    })

    // Chrome path set?
    const [isAlreadyChromePath, setAlreadyChromePath] = useState<boolean>(false)
    const setAlreadyChromePathStatus = (is: boolean) => setAlreadyChromePath(is)

    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            if (!setting) return
            const values: string = JSON.parse(setting)
            if (values.length > 0) {
                setAlreadyChromePath(true)
            }
        })
    }, [])

    /**
     * Run Node
     */
    const {firstRunNodeFlag, runNodeList, delRunNode, clearRunNodeList} = useRunNodeStore()
    const [closeRunNodeItemVerifyVisible, setCloseRunNodeItemVerifyVisible] = useState<boolean>(false)
    const [NoAlert, setNoAlert] = useState<boolean>(false) // Decide if confirm dialog should show
    const [delRunNodeItem, setDelRunNodeItem] = useState<{key: string; pid: string} | undefined>()

    useEffect(() => {
        // First run node shows prompt
        if (firstRunNodeFlag) {
            setShow(true)
            setTimeout(() => {
                setShow(false)
            }, 3000)
        }
    }, [firstRunNodeFlag])

    // Click to close all
    const onCloseAllRunNode = useMemoizedFn(() => {
        if (NoAlert) {
            handleKillAllRunNode()
        } else {
            setCloseRunNodeItemVerifyVisible(true)
        }
    })
    // Handle all node deletions
    const handleKillAllRunNode = async () => {
        let promises: (() => Promise<any>)[] = []
        Array.from(runNodeList).forEach(([key, pid]) => {
            promises.push(() => ipcRenderer.invoke("kill-run-node", {pid}))
        })
        try {
            await Promise.allSettled(promises.map((promiseFunc) => promiseFunc()))
            clearRunNodeList()
            yakitNotify("success", "Successfully closed all run nodes")
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // Click to close single run node
    const onCloseRunNodeItem = (key: string, pid: string) => {
        setDelRunNodeItem({key, pid})
        // If chose not to remind again, just close run node
        if (NoAlert) {
            handleKillRunNodeItem(key, pid)
        } else {
            setCloseRunNodeItemVerifyVisible(true)
        }
    }
    // Handle single node deletion
    const handleKillRunNodeItem = useMemoizedFn(async (key, pid) => {
        try {
            await ipcRenderer.invoke("kill-run-node", {pid})
            delRunNode(key)
            setDelRunNodeItem(undefined)
            yakitNotify("success", "Successfully closed run node")
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const content = useMemo(() => {
        return (
            <div className={styles["global-state-content-wrapper"]}>
                <div className={styles["body-header"]}>
                    <div className={styles["header-title"]}>System Check</div>
                    <div className={styles["header-hint"]}>
                        <span className={styles["hint-title"]}>
                            {stateNum === 0 ? `No exceptions` : `Detected${stateNum}Exceptions`}
                        </span>
                        {ShowIcon[state]}
                    </div>
                </div>
                <div className={styles["body-wrapper"]}>
                    {/* Network card permissions repair */}
                    {!pcap.IsPrivileged && (
                        <div className={styles["body-info"]}>
                            {system !== "Windows_NT" ? (
                                <>
                                    <div className={styles["info-left"]}>
                                        <ErrorIcon />
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>Network card permissions not repaired</div>
                                            <div className={styles["subtitle-style"]}>
                                                May affect some features, repair recommended
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles["info-right"]}>
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                if (pcapHintShow) return
                                                setShow(false)
                                                setPcapHintShow(true)
                                            }}
                                        >
                                            Repair
                                        </YakitButton>
                                    </div>
                                </>
                            ) : (
                                <div className={styles["info-left"]}>
                                    <WarningIcon />
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]}>Run as admin recommended</div>
                                        <div className={styles["subtitle-style"]}>Standard permissions may affect some features</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* MITM Certificate */}
                    {showMITMCertWarn && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <ErrorIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["title-style"]}>MITM Certificate</div>
                                    <div className={styles["subtitle-style"]}>
                                        MITM certificate not trusted, reinstall required
                                    </div>
                                </div>
                            </div>
                            <div className={styles["info-right"]}>
                                <YakitButton
                                    type='text'
                                    className={styles["btn-style"]}
                                    onClick={() => {
                                        setShow(false)
                                        const m = showYakitModal({
                                            title: "Generate auto-install script",
                                            width: "600px",
                                            centered: true,
                                            content: (
                                                <div style={{padding: 15}}>
                                                    Follow these steps：
                                                    <br />
                                                    <br />
                                                    1. Click OK to open script directory。
                                                    <br />
                                                    2. Double-click to open "auto-install-cert.bat/auto-install-cert.sh"
                                                    Run file to install。
                                                    <br />
                                                    3. If successful, you’ll see“Certificate successfully
                                                    installed.”Alert。
                                                    <br />
                                                    <br />
                                                    Close all apps that may block script execution。
                                                    <br />
                                                    After installation, MITM will run smoothly。
                                                    <br />
                                                    <br />
                                                    Contact us anytime for inquiries or further assistance。
                                                </div>
                                            ),
                                            onOk: () => {
                                                ipcRenderer
                                                    .invoke("generate-install-script", {})
                                                    .then((p: string) => {
                                                        if (p) {
                                                            openABSFileLocated(p)
                                                        } else {
                                                            failed("Generation failed")
                                                        }
                                                    })
                                                    .catch(() => {})
                                                m.destroy()
                                            }
                                        })
                                    }}
                                >
                                    Download and install
                                </YakitButton>
                            </div>
                        </div>
                    )}
                    {/* Local plugin download */}
                    {pluginTotal === 0 && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <ErrorIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["title-style"]}>No local plugins</div>
                                    <div className={styles["subtitle-style"]}>Official cloud plugins available for one-click</div>
                                </div>
                            </div>
                            <div className={styles["info-right"]}>
                                <YakitButton type='text' className={styles["btn-style"]} onClick={downloadAllPlugin}>
                                    One-click download
                                </YakitButton>
                            </div>
                        </div>
                    )}
                    {!isEnpriTraceAgent() && (
                        <>
                            {/* Global Callback */}
                            {!isReverseState && (
                                <div className={styles["body-info"]}>
                                    <div className={styles["info-left"]}>
                                        <WarningIcon />
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>Global callback not configured</div>
                                            <div className={styles["subtitle-style"]}>May affect certain features</div>
                                        </div>
                                    </div>
                                    <div className={styles["info-right"]}>
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showModal({
                                                    title: "Configure global callback",
                                                    width: 800,
                                                    content: (
                                                        <div style={{width: 800}}>
                                                            <ConfigGlobalReverse />
                                                        </div>
                                                    )
                                                })
                                            }}
                                        >
                                            Configure
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                            {/* Chrome Path */}
                            {showChromeWarn && (
                                <div className={styles["body-info"]}>
                                    <div className={styles["info-left"]}>
                                        {isAlreadyChromePath ? <SuccessIcon /> : <WarningIcon />}
                                        <div className={styles["left-body"]}>
                                            <div className={styles["title-style"]}>Chrome Path</div>
                                            <div className={styles["subtitle-style"]}>
                                                If Chrome fails to start, configure Chrome path
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles["info-right"]}>
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showConfigChromePathForm(setAlreadyChromePathStatus)
                                            }}
                                        >
                                            {isAlreadyChromePath ? "Configured" : "Configure"}
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                            {/* System Proxy */}
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    {systemProxy.Enable ? <SuccessIcon /> : <HelpIcon />}
                                    <div className={styles["left-body"]}>
                                        <div className={styles["system-proxy-title"]}>
                                            System Proxy
                                            <YakitTag color={systemProxy.Enable ? "success" : "danger"}>
                                                {systemProxy.Enable ? "Enabled" : "Not enabled"}
                                            </YakitTag>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    {systemProxy.Enable ? (
                                        <div className={styles["system-proxy-info"]}>
                                            {systemProxy.CurrentProxy}
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                className={styles["btn-style"]}
                                                onClick={() => {
                                                    setShow(false)
                                                    showConfigSystemProxyForm()
                                                }}
                                            >
                                                {" "}
                                                Disable
                                            </YakitButton>
                                        </div>
                                    ) : (
                                        <YakitButton
                                            type='text'
                                            className={styles["btn-style"]}
                                            onClick={() => {
                                                setShow(false)
                                                showConfigSystemProxyForm()
                                            }}
                                        >
                                            Configure
                                        </YakitButton>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    {isEnpriTraceAgent() && state === "success" && (
                        <div className={styles["body-info"]}>
                            <div className={styles["info-left"]}>
                                <SuccessIcon />
                                <div className={styles["left-body"]}>
                                    <div className={styles["system-proxy-title"]}>All configurations normal</div>
                                </div>
                            </div>
                            <div></div>
                        </div>
                    )}
                    {/* Run Node */}
                    {!!Array.from(runNodeList).length && (
                        <>
                            <div className={styles["body-info"]}>
                                <div className={styles["info-left"]}>
                                    <SuccessIcon />
                                    <div className={styles["left-body"]}>
                                        <div className={styles["title-style"]}>
                                            Enable Node
                                            <YakitTag color='success' style={{marginLeft: 8}}>
                                                Enabled
                                            </YakitTag>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["info-right"]}>
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-style"]}
                                        onClick={onCloseAllRunNode}
                                    >
                                        Close all
                                    </YakitButton>
                                </div>
                            </div>
                            <div className={styles["run-node-list"]}>
                                {Array.from(runNodeList).map(([key, value], index) => (
                                    <div className={styles["run-node-item"]} key={key}>
                                        <Row>
                                            <Col span={6} className={styles["ellipsis"]}>
                                                {JSON.parse(key).nodename}
                                            </Col>
                                            <Col span={15} className={styles["ellipsis"]}>
                                                {JSON.parse(key).ipOrdomain}:{JSON.parse(key).port}
                                            </Col>
                                            <Col span={3} style={{textAlign: "right"}}>
                                                <YakitButton
                                                    type='text'
                                                    colors='danger'
                                                    className={styles["btn-style"]}
                                                    onClick={() => onCloseRunNodeItem(key, value)}
                                                >
                                                    Close
                                                </YakitButton>
                                            </Col>
                                        </Row>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className={styles["body-setting"]}>
                    Refresh interval
                    <YakitInputNumber
                        size='small'
                        type='horizontal'
                        wrapperClassName={styles["yakit-input-number"]}
                        min={1}
                        formatter={(value) => `${value}s`}
                        parser={(value) => value!.replace("s", "")}
                        value={timeInterval}
                        onChange={(value) => {
                            if (!value) setTimeInterval(1)
                            else {
                                if (+value !== timeInterval) setTimeInterval(+value || 5)
                            }
                        }}
                    />
                </div>
            </div>
        )
    }, [
        pcap,
        pluginTotal,
        reverseState,
        reverseDetails,
        systemProxy,
        timeInterval,
        isAlreadyChromePath,
        showMITMCertWarn,
        stateNum,
        Array.from(runNodeList).length
    ])

    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["global-state-popover"], ShowColorClass[state])}
                placement={system === "Darwin" ? "bottomRight" : "bottomLeft"}
                content={content}
                visible={show}
                trigger='click'
                onVisibleChange={(visible) => setShow(visible)}
            >
                <div className={classNames(styles["global-state-wrapper"], ShowColorClass[state])}>
                    <div className={classNames(styles["state-body"])}>{ShowIcon[state]}</div>
                </div>
            </YakitPopover>
            <YakitHint
                visible={pcapHintShow}
                heardIcon={pcapResult ? <AllShieldCheckIcon /> : undefined}
                title={pcapResult ? "Network card permissions granted" : "Lacks network card permissions"}
                content={
                    pcapResult
                        ? "Network card repair takes time, please wait"
                        : "Linux & MacOS can grant full network card access by setting permissions"
                }
                okButtonText='Enable PC’AP permissions'
                cancelButtonText={pcapResult ? "Got It～" : "Remind me later"}
                okButtonProps={{loading: pcapHintLoading, style: pcapResult ? {display: "none"} : undefined}}
                cancelButtonProps={{loading: !pcapResult && pcapHintLoading}}
                onOk={openPcapPower}
                onCancel={() => {
                    setPcapResult(false)
                    setPcapHintShow(false)
                }}
                footerExtra={
                    pcapResult ? undefined : (
                        <Tooltip title={`${pcap.AdviceVerbose}: ${pcap.Advice}`}>
                            <YakitButton className={styles["btn-style"]} type='text' size='max'>
                                Manual repair
                            </YakitButton>
                        </Tooltip>
                    )
                }
            ></YakitHint>
            <YakitGetOnlinePlugin
                visible={pluginShow}
                setVisible={(v) => {
                    setPluginShow(v)
                }}
            />
            {/* Close run node confirm dialog */}
            <YakitHint
                visible={closeRunNodeItemVerifyVisible}
                title='Confirm node closure?'
                content='Confirm closes node and stops tasks on node'
                footerExtra={
                    <YakitCheckbox value={NoAlert} onChange={(e) => setNoAlert(e.target.checked)}>
                        Do not remind again
                    </YakitCheckbox>
                }
                onOk={() => {
                    delRunNodeItem
                        ? handleKillRunNodeItem(delRunNodeItem.key, delRunNodeItem.pid)
                        : handleKillAllRunNode()
                    setCloseRunNodeItemVerifyVisible(false)
                }}
                onCancel={() => {
                    setDelRunNodeItem(undefined)
                    setCloseRunNodeItemVerifyVisible(false)
                }}
            />
        </>
    )
})
