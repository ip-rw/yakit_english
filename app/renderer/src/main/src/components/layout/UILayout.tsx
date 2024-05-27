import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {MacUIOp} from "./MacUIOp"
import {PerformanceDisplay, yakProcess} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {TemporaryProjectPop, WinUIOp} from "./WinUIOp"
import {GlobalState} from "./GlobalState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {
    EngineWatchDogCallbackType,
    YakitSettingCallbackType,
    YakitStatusType,
    YakitSystem,
    YaklangEngineMode
} from "@/yakitGVDefine"
import {failed, info, warn, yakitFailed} from "@/utils/notification"
import {LocalGV, RemoteGV} from "@/yakitGV"
import {EngineModeVerbose, YakitLoading} from "../basics/YakitLoading"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {YaklangEngineWatchDog, YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog"
import {StringToUint8Array} from "@/utils/str"
import {EngineLog} from "./EngineLog"
import {BaseMiniConsole} from "../baseConsole/BaseConsole"
import {getReleaseEditionName, isCommunityEdition, isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {AllKillEngineConfirm} from "./AllKillEngineConfirm"
import {SoftwareSettings} from "@/pages/softwareSettings/SoftwareSettings"
import {PolygonIcon, StopIcon} from "@/assets/newIcon"
import EnterpriseJudgeLogin from "@/pages/EnterpriseJudgeLogin"
import {
    ExportProjectProps,
    NewProjectAndFolder,
    ProjectDescription,
    TransferProject
} from "@/pages/softwareSettings/ProjectManage"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {useScreenRecorder} from "@/store/screenRecorder"
import {ResultObjProps, remoteOperation} from "@/pages/dynamicControl/DynamicControl"
import {useStore, yakitDynamicStatus} from "@/store"
import yakitCattle from "@/assets/yakitCattle.png"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import emiter from "@/utils/eventBus/eventBus"
import {RemoteEngine} from "./RemoteEngine/RemoteEngine"
import {RemoteLinkInfo} from "./RemoteEngine/RemoteEngineType"
import {LocalEngine} from "./LocalEngine/LocalEngine"
import {InstallEngine} from "./update/InstallEngine"
import {LocalEngineLinkFuncProps} from "./LocalEngine/LocalEngineType"
import {DownloadYakit} from "./update/DownloadYakit"
import {DownloadYaklang} from "./update/DownloadYaklang"
import {HelpDoc} from "./HelpDoc/HelpDoc"
import {SolidHomeIcon} from "@/assets/icon/solid"
import {ChatCSGV} from "@/enums/chatCS"
import {CheckEngineVersion} from "./CheckEngineVersion/CheckEngineVersion"
import {EngineRemoteGV} from "@/enums/engine"
import {outputToPrintLog} from "./WelcomeConsoleUtil"

import classNames from "classnames"
import styles from "./uiLayout.module.scss"
import { setNowProjectDescription } from "@/pages/globalVariable"

const {ipcRenderer} = window.require("electron")

const DefaultCredential: YaklangEngineWatchDogCredential = {
    Host: "127.0.0.1",
    IsTLS: false,
    Password: "",
    PemBytes: undefined,
    Port: 0,
    Mode: undefined
}

export interface UILayoutProp {
    children?: React.ReactNode
    linkSuccess?: () => any
}

const UILayout: React.FC<UILayoutProp> = (props) => {
    /** ---------- Software Level Settings Start ---------- */
    // Top Can Drag and Move Software Position
    const [drop, setDrop] = useState<boolean>(true)
    useEffect(() => {
        emiter.on("setYakitHeaderDraggable", (v: boolean) => setDrop(v))
        return () => {
            emiter.off("setYakitHeaderDraggable")
        }
    }, [])

    /** MACOS Double-Click to Zoom (Not Maximize)) */
    const maxScreen = () => {
        ipcRenderer
            .invoke("UIOperate", "max")
            .then(() => {})
            .catch(() => {})
    }
    /** ---------- Software Level Settings End ---------- */

    /** ---------- Software State Attributes Start ---------- */
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [arch, setArch] = useState<string>("x64")
    const isDev = useRef<boolean>(false)

    /** Local Engine Self-Check Log Output */
    const [checkLog, setCheckLog] = useState<string[]>(["Software Starting, Preliminary Checks..."])

    /** Engine Installed */
    const isEngineInstalled = useRef<boolean>(false)

    /** Current Engine Mode */
    const [engineMode, setEngineMode] = useState<YaklangEngineMode>()
    const cacheEngineMode = useRef<YaklangEngineMode>()
    const onSetEngineMode = useMemoizedFn((v?: YaklangEngineMode) => {
        setEngineMode(v)
        cacheEngineMode.current = v
    })
    /** Is Remote Mode */
    const isRemoteEngine = useMemo(() => engineMode === "remote", [engineMode])

    /** Authentication Information */
    const [credential, setCredential] = useState<YaklangEngineWatchDogCredential>({...DefaultCredential})

    /** yakit Usage State */
    const [yakitStatus, setYakitStatus] = useState<YakitStatusType>("")
    const cacheYakitStatus = useRef<YakitStatusType>("")
    const onSetYakitStatus = useMemoizedFn((v: YakitStatusType) => {
        setYakitStatus(v)
        cacheYakitStatus.current = v
    })

    /** Current Engine Connection Status */
    const [engineLink, setEngineLink] = useState<boolean>(false)
    const cacheEngineLink = useRef<boolean>(false)
    const onSetEngineLink = useMemoizedFn((v: boolean) => {
        setEngineLink(v)
        cacheEngineLink.current = v
    })

    /** First-Time Local Connection Startup */
    const isInitLocalLink = useRef<boolean>(true)

    // Local Connection Ref
    const localEngineRef = useRef<LocalEngineLinkFuncProps>(null)
    // Continuous Engine Process Connection State Monitoring
    const [keepalive, setKeepalive] = useState<boolean>(false)
    /** ---------- Software State Attributes End ---------- */

    /** ---------- Engine Status and Connection Logic Start ---------- */
    /** Plugin Vulnerability Database Self-Check */
    const handleBuiltInCheck = useMemoizedFn(() => {
        ipcRenderer
            .invoke("InitCVEDatabase")
            .then(() => {
                info("Vulnerability Database Self-Check Complete")
            })
            .catch((e) => {
                info(`Vulnerability Database Check Error：${e}`)
            })
    })

    /**
     * Get Information
     * 1. Development Environment
     * 2. Operating System
     * 3. CPU Architecture
     * 4. Engine Existence
     */
    const handleFetchBaseInfo = useMemoizedFn(async (nextFunc?: () => any) => {
        try {
            isDev.current = !!(await ipcRenderer.invoke("is-dev"))
        } catch (error) {}
        try {
            const systemName: YakitSystem = await ipcRenderer.invoke("fetch-system-name")
            setSystem(systemName)
        } catch (error) {}
        try {
            const cpuArch: string = await ipcRenderer.invoke("fetch-cpu-arch")
            setArch(cpuArch)
        } catch (error) {}
        try {
            const isInstalled = await ipcRenderer.invoke("is-yaklang-engine-installed")
            isEngineInstalled.current = isInstalled
        } catch (error) {}

        if (nextFunc) nextFunc()
    })

    /** Get Last Engine Connection Mode */
    const handleLinkEngineMode = useMemoizedFn(() => {
        setCheckLog(["Get Last Engine Connection Mode..."])
        getLocalValue(LocalGV.YaklangEngineMode).then((val: YaklangEngineMode) => {
            switch (val) {
                case "remote":
                    setCheckLog((arr) => arr.concat(["Connection Mode: Remote Success"]))
                    setTimeout(() => {
                        handleChangeLinkMode(true)
                    }, 1000)

                    return
                case "local":
                    setCheckLog((arr) => arr.concat(["Connection Mode: Local Success"]))
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
                default:
                    setCheckLog((arr) => arr.concat(["Connection Mode Not Obtained - Default (Local) Mode"]))
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
            }
        })
    })

    // Switch to Remote Mode
    const handleLinkRemoteMode = useMemoizedFn(() => {
        onDisconnect()
        onSetYakitStatus("")
        onSetEngineMode("remote")
    })
    // Local Connection Status Setting
    const setLinkLocalEngine = useMemoizedFn(() => {
        onDisconnect()
        onSetYakitStatus("")
        onSetEngineMode("local")
        handleStartLocalLink(isInitLocalLink.current)
        isInitLocalLink.current = false
    })
    // Switch to Local Mode
    const handleLinkLocalMode = useMemoizedFn(() => {
        if (isEngineInstalled.current) {
            if (!isInitLocalLink.current) {
                setLinkLocalEngine()
                return
            }
            setCheckLog(["Check Local Engine Installation..."])
            setCheckLog((arr) => arr.concat(["Local Engine Installed, Preparing to Connect..."]))
            setTimeout(() => {
                setLinkLocalEngine()
            }, 1000)
        } else {
            setCheckLog(["Check Local Engine Installation..."])
            setCheckLog((arr) => arr.concat(["Local Engine Not Installed, Preparing Install Popup"]))
            setTimeout(() => {
                onSetYakitStatus("install")
                onSetEngineMode(undefined)
            }, 1000)
        }
    })

    // Switch Connection Mode
    const handleChangeLinkMode = useMemoizedFn((isRemote?: boolean) => {
        setCheckLog([])
        if (!!isRemote) {
            handleLinkRemoteMode()
        } else {
            handleLinkLocalMode()
        }
    })

    // Two Modes of Local Connection
    const handleStartLocalLink = useMemoizedFn((isInit?: boolean) => {
        if (isInit) {
            if (localEngineRef.current) localEngineRef.current.init()
        } else {
            if (localEngineRef.current) localEngineRef.current.link()
        }
    })

    useEffect(() => {
        setTimeout(() => {
            /**
             * dev Environment, No Need to Reconnect if Local Engine Already Connected
             */
            if (isDev.current) {
                if (cacheEngineLink.current && cacheEngineMode.current === "local") return
            }

            handleBuiltInCheck()
            handleFetchBaseInfo(() => {
                handleLinkEngineMode()
            })
        }, 1000)
    }, [])

    /**
     * 1. Clear Log Information|Set Remote Connection Loading to False)|
     * 2. Execute External Callback on Successful Connection
     * 3. Cache Connection Mode on Successful Connection
     * 4. Engine File Existence Monitoring
     */
    useEffect(() => {
        if (engineLink) {
            setCheckLog([])
            setRemoteLinkLoading(false)

            if (props.linkSuccess) {
                props.linkSuccess()
                // Following Three Lines Are Old Logic
                onSetYakitStatus("link")
                setShowEngineLog(false)
            }

            setLocalValue(LocalGV.YaklangEngineMode, cacheEngineMode.current)

            const waitTime: number = 20000
            const id = setInterval(() => {
                ipcRenderer.invoke("is-yaklang-engine-installed").then((flag: boolean) => {
                    if (isEngineInstalled.current === flag) return
                    isEngineInstalled.current = flag
                    isInitLocalLink.current = true
                    // Clear Main Process yaklang Version Cache
                    ipcRenderer.invoke("clear-local-yaklang-version-cache")
                })
            }, waitTime)
            return () => {
                clearInterval(id)
            }
        } else {
            // Clear Main Process yaklang Version Cache
            ipcRenderer.invoke("clear-local-yaklang-version-cache")
        }
    }, [engineLink])
    /** ---------- Engine Status and Connection Logic End ---------- */

    /** ---------- Software State and Engine Connection Method Start ---------- */
    // Disconnect
    const onDisconnect = useMemoizedFn(() => {
        setCredential({...DefaultCredential})
        setKeepalive(false)
        onSetEngineLink(false)
    })
    // Start Engine Connection
    const onStartLinkEngine = useMemoizedFn((isDynamicControl?: boolean) => {
        setTimeout(() => {
            emiter.emit("startAndCreateEngineProcess", isDynamicControl)
        }, 100)
    })

    // Callback After Status Completed
    const handleStatusCompleted = useMemoizedFn((type: YakitStatusType) => {
        switch (type) {
            case "install":
                // After Engine Installation
                setCheckLog([])
                isEngineInstalled.current = true
                handleLinkLocalMode()
                return

            default:
                return
        }
    })

    // Start Local Engine Connection
    const handleLinkLocalEngine = useMemoizedFn((port: number) => {
        setCheckLog([`Local Engine Low Privilege Mode, Starting Local Engine - Port: ${port}`])
        setCredential({
            Host: "127.0.0.1",
            IsTLS: false,
            Password: "",
            PemBytes: undefined,
            Port: port,
            Mode: "local"
        })
        onSetYakitStatus("ready")
        onStartLinkEngine()
        outputToPrintLog("local-start-test-engine-link-status")
    })

    const [remoteLinkLoading, setRemoteLinkLoading] = useState<boolean>(false)
    // Start Remote Engine Connection
    const handleLinkRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        setRemoteLinkLoading(true)
        setCredential({
            Host: info.host,
            IsTLS: info.tls,
            Password: info.tls ? info.password : "",
            PemBytes: StringToUint8Array(info.tls ? info.caPem || "" : ""),
            Port: parseInt(info.port),
            Mode: "remote"
        })
        onStartLinkEngine()
    })
    // Switch Remote to Local
    const handleRemoteToLocal = useMemoizedFn(() => {
        onSetEngineMode(undefined)
        handleChangeLinkMode()
    })
    /** ---------- Software State and Engine Connection Method End ---------- */

    /** ---------- Various Operation Logic Handling Start ---------- */
    // Engine Log Terminal
    const [yakitConsole, setYakitConsole] = useState<boolean>(false)

    /**
     * Open Engine Log Terminal
     */
    useEffect(() => {
        emiter.on("openEngineLogTerminal", () => {
            setYakitConsole(true)
        })
        return () => {
            emiter.off("openEngineLogTerminal")
        }
    }, [])

    useEffect(() => {
        if (engineLink) {
        } else {
            setYakitConsole(false)
        }
    }, [engineLink])

    const setTimeoutLoading = useMemoizedFn((setLoading: (v: boolean) => any) => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 2000)
    })

    // Manual Reconnect Button Loading
    const [restartLoading, setRestartLoading] = useState<boolean>(false)
    // Refresh Button Loading in Remote Control
    const [remoteControlRefreshLoading, setRemoteControlRefreshLoading] = useState<boolean>(false)
    useEffect(() => {
        if (engineLink) {
            setRestartLoading(false)
            setRemoteControlRefreshLoading(false)
        }
    }, [engineLink])
    // Loading Page Switch Engine Connection Mode
    const loadingClickCallback = useMemoizedFn((type: YaklangEngineMode | YakitStatusType) => {
        switch (type) {
            case "checkError":
                // Engine Permission Error - Manually Restart Engine
                setTimeoutLoading(setRestartLoading)
                setLinkLocalEngine()
                return
            case "error":
                // Engine Connection Timeout
                setTimeoutLoading(setRestartLoading)
                handleStartLocalLink(isInitLocalLink.current)
                isInitLocalLink.current = false
                setKeepalive(false)
                return
            case "break":
                // Engine Disconnect Initiated
                setTimeoutLoading(setRestartLoading)
                handleStartLocalLink(isInitLocalLink.current)
                isInitLocalLink.current = false
                return
            case "control-remote":
                // Refresh in Remote Control Connection
                setTimeoutLoading(setRemoteControlRefreshLoading)
                onStartLinkEngine(true)
                return

            case "remote":
                handleLinkRemoteMode()
                return
            case "local":
                handleLinkLocalMode()
                return

            default:
                return
        }
    })

    const handleOperations = useMemoizedFn((type: YakitSettingCallbackType | YaklangEngineMode) => {
        switch (type) {
            case "break":
                if (cacheYakitStatus.current === "link") {
                    onSetYakitStatus("break")
                    setTimeout(() => {
                        setCheckLog(["Disconnected, Please Manually Connect Engine"])
                        onDisconnect()
                    }, 100)
                }
                return

            case "local":
                info(`Switching Engine Status: ${EngineModeVerbose("local")}`)
                delTemporaryProject()
                onSetEngineMode(undefined)
                onDisconnect()
                handleLinkLocalMode()
                return
            case "remote":
                info(`Switching Engine Status: ${EngineModeVerbose("remote")}`)
                delTemporaryProject()
                onSetEngineMode(undefined)
                handleLinkRemoteMode()
                return

            case "console":
                setYakitConsole(true)
                return

            case "changeProject":
                // yakit-ui Enter Project Management
                changeYakitMode("soft")
                return
            case "encryptionProject":
                // Encrypted Export
                if (!currentProject || !currentProject.Id) {
                    failed("Project Cannot Be Exported Due to Lack of Critical Information!")
                    return
                }
                setShowProjectManage(true)
                const encryption = structuredClone(currentProject)
                if (encryption.ProjectName === "[temporary]") {
                    encryption.ProjectName = "Temporary Project"
                    setIsExportTemporaryProjectFlag(true)
                }
                setProjectModalInfo({visible: true, isNew: false, isExport: true, project: encryption})
                return
            case "plaintextProject":
                // Project Plain Text Export
                if (!currentProject || !currentProject.Id) {
                    failed("Project Cannot Be Exported Due to Lack of Critical Information!")
                    return
                }
                setShowProjectManage(true)
                const plaintext = structuredClone(currentProject)
                if (plaintext.ProjectName === "[temporary]") {
                    plaintext.ProjectName = "Temporary Project"
                    setIsExportTemporaryProjectFlag(true)
                }
                setProjectTransferShow({
                    visible: true,
                    isExport: true,
                    data: {
                        Id: plaintext.Id,
                        ProjectName: plaintext.ProjectName,
                        Password: ""
                    }
                })
                return

            default:
                break
        }
    })
    /** ---------- Various Operation Logic Handling End ---------- */

    /** ---------- yakit and yaklang Updates (Under Engine Connection) & Kill Engine Process Start ---------- */
    // Update yakit-modal
    const [yakitDownload, setYakitDownload] = useState<boolean>(false)
    // Update yaklang - Close All Engine Processes Modal
    const [yaklangKillPss, setYaklangKillPss] = useState<boolean>(false)
    // Update yaklang-modal
    const [yaklangDownload, setYaklangDownload] = useState<boolean>(false)
    // Listening for yakit or yaklang Updates on UI
    const handleActiveDownloadModal = useMemoizedFn((type: string) => {
        if (yaklangKillPss || yakitDownload) return
        if (type === "yakit") setYakitDownload(true)
        if (type === "yaklang") setYaklangKillPss(true)
    })
    // Update Engine After Killing Process
    const killedEngineToUpdate = useMemoizedFn(() => {
        setYaklangKillPss(false)
        if (!yaklangDownload) {
            onSetEngineLink(false)
            setKeepalive(false)
            setYaklangDownload(true)
        }
    })

    // Update Yaklang Version After Killing Engine Process
    const [yaklangSpecifyVersion, setYaklangSpecifyVersion] = useState<string>("")
    const downYaklangSpecifyVersion = (version: string) => {
        setYaklangSpecifyVersion(version)
        killedEngineToUpdate()
    }
    useEffect(() => {
        emiter.on("downYaklangSpecifyVersion", downYaklangSpecifyVersion)
        return () => {
            emiter.off("downYaklangSpecifyVersion", downYaklangSpecifyVersion)
        }
    }, [])

    const onDownloadedYaklang = useMemoizedFn(() => {
        setYaklangDownload(false)
        setLinkLocalEngine()
    })

    const [killOldEngine, setKillOldEngine] = useState<boolean>(false)
    const [killLoading, setKillLoading] = useState<boolean>(false)
    const killOldProcess = useMemoizedFn(() => {
        let isFailed: boolean = false
        let port: number = 0
        let pid: number = 0

        if (cacheEngineLink.current) {
            setKillLoading(true)

            ipcRenderer
                .invoke("fetch-yaklang-engine-addr")
                .then((data) => {
                    const hosts: string[] = (data.addr as string).split(":")
                    if (hosts.length !== 2) return
                    if (+hosts[1]) port = +hosts[1] || 0
                })
                .catch((e) => {
                    failed(`Engine Process Error ${e}`)
                    isFailed = true
                })
                .finally(() => {
                    if (isFailed) {
                        setTimeout(() => setKillLoading(false), 300)
                        return
                    }
                    ipcRenderer
                        .invoke("ps-yak-grpc")
                        .then((i: yakProcess[]) => {
                            const pss = i.find((item) => +item.port === port)
                            if (pss) pid = pss.pid || 0
                        })
                        .catch((e) => {
                            failed(`PS | GREP yak failed ${e}`)
                            isFailed = true
                        })
                        .finally(() => {
                            if (isFailed) {
                                setTimeout(() => setKillLoading(false), 300)
                                return
                            }
                            if (!pid) {
                                failed("Engine Process Not Found During Connection")
                                setTimeout(() => setKillLoading(false), 300)
                                return
                            }

                            ipcRenderer
                                .invoke("kill-yak-grpc", pid)
                                .then(() => {
                                    info(`KILL yak PROCESS: ${pid}`)
                                    setKillOldEngine(false)
                                    setLinkLocalEngine()
                                })
                                .catch((e) => {
                                    failed(`PS | GREP yak failed ${e}`)
                                })
                                .finally(() => {
                                    setTimeout(() => setKillLoading(false), 100)
                                })
                        })
                })
        }
    })

    useEffect(() => {
        emiter.on("activeUpdateYakitOrYaklang", handleActiveDownloadModal)
        ipcRenderer.on("kill-old-engine-process-callback", () => {
            setKillOldEngine(true)
        })
        return () => {
            emiter.off("onScrollToByClick", handleActiveDownloadModal)
            ipcRenderer.removeAllListeners("kill-old-engine-process-callback")
        }
    }, [])
    /** ---------- yakit and yaklang Updates (Under Engine Connection) & Kill Engine Process End ---------- */

    /** ---------- Software Binding Engine Version Detection Prompt Start ---------- */
    const [builtInVersion, setBuiltInVersion] = useState<string>("")
    const [currentVersion, setCurrentVersion] = useState<string>("")
    /** Version Check Performed */
    const isExecuteRef = useRef<boolean>(false)

    const showCheckVersion = useMemo(() => {
        if (isExecuteRef.current) return false
        if (isDev.current) return false
        if (!builtInVersion) return false
        if (!currentVersion) return false

        // semver Version Check Library, Currently Unused
        if (currentVersion < builtInVersion) return true
        return false
    }, [builtInVersion, currentVersion])

    useEffect(() => {
        // Listen Event - Get Current Engine Version
        ipcRenderer.on("fetch-yak-version-callback", async (e: any, v: string) => {
            if (isExecuteRef.current) return
            let version = v.replace(/\r?\n/g, "")
            if (version.startsWith("v")) version = version.slice(1)
            setCurrentVersion(version)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-yak-version-callback")
        }
    }, [])

    useEffect(() => {
        if (engineLink) {
            if (isExecuteRef.current) return
            getRemoteValue(EngineRemoteGV.RemoteCheckEngineVersion)
                .then((v?: string) => {
                    if (!v || v === "false") {
                        // Get Software's Built-in Version
                        ipcRenderer
                            .invoke("fetch-built-in-engine-version")
                            .then((v: string) => {
                                if (isExecuteRef.current) return
                                let version = v.replace(/\r?\n/g, "")
                                if (version.startsWith("v")) version = version.slice(1)
                                setBuiltInVersion(version)
                            })
                            .catch(() => {})
                        // Get Current Engine Version
                        ipcRenderer.invoke("fetch-yak-version")
                    } else {
                        isExecuteRef.current = true
                    }
                })
                .catch(() => {})
        }
    }, [engineLink])

    const onCheckVersionCancel = useMemoizedFn((flag: boolean) => {
        isExecuteRef.current = true
        if (flag) {
            if (yaklangKillPss) return
            setYaklangKillPss(true)
        }
        setBuiltInVersion("")
        setCurrentVersion("")
    })
    /** ---------- Software Binding Engine Version Detection Prompt End ---------- */

    /** ---------- Remote Control (Controller) Start ---------- */
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
    const {userInfo} = useStore()

    useEffect(() => {
        // Listen for Remote Control Exit
        ipcRenderer.on("login-out-dynamic-control-callback", async (params) => {
            if (dynamicStatus.isDynamicStatus) {
                // Switch to Local
                handleLinkLocalMode()

                setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                await remoteOperation(false, dynamicStatus, userInfo)
                // Logout Confirmation
                if (params?.loginOut) {
                    ipcRenderer.invoke("ipc-sign-out")
                }
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("login-out-dynamic-control-callback")
        }
    }, [dynamicStatus.isDynamicStatus])
    /** yaklang Remote Control - Auto Remote Mode Connection */
    const runControlRemote = useMemoizedFn((v: string, baseUrl: string) => {
        try {
            const resultObj: ResultObjProps = JSON.parse(v)

            // Cache Remote Control Parameters
            setDynamicStatus({...dynamicStatus, baseUrl, ...resultObj})
            ipcRenderer
                .invoke("Codec", {Type: "base64-decode", Text: resultObj.pubpem, Params: [], ScriptName: ""})
                .then((res) => {
                    onSetYakitStatus("control-remote")
                    setCheckLog(["Remote Control Connecting..."])
                    onDisconnect()

                    setCredential(() => {
                        return {
                            Host: resultObj.host,
                            IsTLS: true,
                            Password: resultObj.secret,
                            PemBytes: StringToUint8Array(res?.Result || ""),
                            Port: resultObj.port,
                            Mode: "remote"
                        }
                    })
                    onStartLinkEngine(true)
                })
                .catch((err) => {
                    warn(`Base64 Decode Failed:${err}`)
                })
        } catch (error) {
            warn(`Parse Failed:${error}`)
        }
    })
    /** ---------- Remote Control (Controller) End ---------- */

    /** Display Engine Log Content */
    const [showEngineLog, setShowEngineLog] = useState<boolean>(false)

    /** ---------- EE Version - License Start ---------- */
    // Enterprise - License Validation Post Engine Connection=>Enterprise Login Display
    const [isJudgeLicense, setJudgeLicense] = useState<boolean>(isEnterpriseEdition())
    useEffect(() => {
        // User Logout - Validate License=>Enterprise Login Display
        ipcRenderer.on("again-judge-license-login", () => {
            setJudgeLicense(true)
        })
        return () => {
            ipcRenderer.removeAllListeners("again-judge-license-login")
        }
    }, [])
    /** ---------- EE Version - License End ---------- */

    /** ---------- Project Management & Export & Temporary Project Start ---------- */
    const [yakitMode, setYakitMode] = useState<"soft" | "">("")
    // Display Project Management
    const [showProjectManage, setShowProjectManage] = useState<boolean>(false)
    // Prompt from Temporary Project to Management Page
    const [linkDatabaseHint, setLinkDatabaseHint] = useState<boolean>(false)
    // Prompt from Temporary Project to Management Page
    const [closeTemporaryProjectVisible, setCloseTemporaryProjectVisible] = useState<boolean>(false)

    const changeYakitMode = useMemoizedFn((type: "soft") => {
        if (type === "soft" && yakitMode !== "soft") {
            if (temporaryProjectId && !temporaryProjectNoPromptFlag) {
                setCloseTemporaryProjectVisible(true)
            } else {
                setLinkDatabaseHint(true)
            }
        }
    })

    const onOkEnterProjectMag = () => {
        setYakitMode("soft")
        setShowProjectManage(true)
        setCurrentProject(undefined)
        setNowProjectDescription(undefined)
    }

    /** Project Management Selected Project Callback */
    const softwareSettingFinish = useMemoizedFn(() => {
        setYakitMode("")
        setShowProjectManage(false)
        ipcRenderer.invoke("GetCurrentProject").then((rsp: ProjectDescription) => {
            setCurrentProject(rsp || undefined)
            setNowProjectDescription(rsp || undefined)
        })
    })

    // Current Project in Use
    const [currentProject, setCurrentProject] = useState<ProjectDescription>()
    const [projectModalLoading, setProjectModalLoading] = useState<boolean>(false)
    // Project Name
    const projectName = useMemo(() => {
        if (showProjectManage) return ""
        if (!!currentProject?.ProjectName) {
            if (currentProject.ProjectName.length > 10) return `${currentProject.ProjectName.slice(0, 10)}...`
            else return currentProject.ProjectName
        }
        return ""
    }, [currentProject, showProjectManage])
    // Project Encrypted Export
    const [projectModalInfo, setProjectModalInfo] = useState<{
        visible: boolean
        isNew?: boolean
        isFolder?: boolean
        isExport?: boolean
        isImport?: boolean
        project?: ProjectDescription
        parentNode?: ProjectDescription
    }>({visible: false})
    // Project Plain Text Export
    const [projectTransferShow, setProjectTransferShow] = useState<{
        isExport?: boolean
        isImport?: boolean
        visible: boolean
        data?: ExportProjectProps
    }>({
        visible: false
    })

    const {
        temporaryProjectId,
        temporaryProjectNoPromptFlag,
        isExportTemporaryProjectFlag,
        setTemporaryProjectNoPromptFlag,
        setIsExportTemporaryProjectFlag,
        delTemporaryProject
    } = useTemporaryProjectStore()

    // Project Plain Text Export Success Callback
    const handleExportTemporaryProject = () => {
        if (isExportTemporaryProjectFlag) {
            setIsExportTemporaryProjectFlag(false)
            // Menu Plain Text Export Component (TransferProject) Notification for Data Refresh in Project Management
            // Signal to ProjectManage for getPageInfo (Also Temporary Project Deletion))
            emiter.emit("onGetProjectInfo")
        }
        setProjectTransferShow({visible: false})
    }
    /** ---------- Project Management & Export & Temporary Project End ---------- */

    /** @name Software Top Title */
    const getAppTitleName: string = useMemo(() => {
        // Engine Not Connected or Portable - Default Title
        if (!engineLink || isEnpriTraceAgent()) return getReleaseEditionName()
        else if (
            !isExportTemporaryProjectFlag &&
            temporaryProjectId &&
            temporaryProjectId === (currentProject?.Id ? currentProject?.Id + "" : "")
        ) {
            return "Temporary Project"
        } else {
            return projectName ? projectName : getReleaseEditionName()
        }
    }, [projectName, engineLink, temporaryProjectId, currentProject])
    /**  yakit Home Page Entry */
    const pageShowHome = useMemo(() => {
        const flag = engineLink && !isJudgeLicense && !showProjectManage
        return flag
    }, [engineLink, isJudgeLicense, showProjectManage])

    /** ---------- Switching Engine Logic Start ---------- */
    const [switchEngineLoading, setSwitchEngineLoading] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.on("fetch-switch-conn-refresh", (e, d: boolean) => {
            setSwitchEngineLoading(d)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-switch-conn-refresh")
        }
    }, [])

    useEffect(() => {
        emiter.on("onSwitchEngine", onOkEnterProjectMag)
        return () => {
            emiter.off("onSwitchEngine", onOkEnterProjectMag)
        }
    }, [])
    /** ---------- Switching Engine Logic End ---------- */

    /** ---------- ChatCS Start ---------- */
    /** Chat-CS Logic */
    const [showChatCS, setShowChatCS] = useState<boolean>(true)
    const onChatCS = useMemoizedFn(() => {
        setShowChatCS(false)
        setRemoteValue(ChatCSGV.KnowChatCS, "true")
    })

    useEffect(() => {
        if (engineLink) {
            getRemoteValue(ChatCSGV.KnowChatCS)
                .then((value: any) => {
                    if (!value) return
                    else setShowChatCS(false)
                })
                .catch(() => {})
        }
    }, [engineLink])

    /** ---------- ChatCS End ---------- */

    /** ---------- Recording Status Display at Top Start ---------- */
    const {screenRecorderInfo} = useScreenRecorder()
    const stopScreen = useCreation(() => {
        return (
            <>
                {screenRecorderInfo.isRecording && (
                    <YakitButton
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
                        }}
                        type='primary'
                        colors='danger'
                        className={styles["stop-screen-recorder"]}
                        size='large'
                    >
                        <div className={styles["stop-icon"]}>
                            <StopIcon />
                        </div>
                        <span className={styles["stop-text"]}>Recording</span>
                    </YakitButton>
                )}
            </>
        )
    }, [screenRecorderInfo])
    /** ---------- Recording Status Display at Top End ---------- */
    const SELinkedEngine = useMemoizedFn(() => {
        onSetEngineLink(true)
    })
    const onLinkedEngine = useMemoizedFn(async () => {
        // EE & CE
        try {
            const flag = await getRemoteValue(RemoteGV.TemporaryProjectNoPrompt)
            if (flag) {
                setTemporaryProjectNoPromptFlag(flag === "true")
            }
            // INFO Default to Default Project in Development Environment
            if (isDev.current) {
                const res = await ipcRenderer.invoke("GetDefaultProject")
                if (res) {
                    ipcRenderer.invoke("SetCurrentProject", {Id: +res.Id})
                    setCurrentProject(res)
                    setNowProjectDescription(res)
                    setShowProjectManage(false)
                    setYakitMode("")
                }
            } else {
                setShowProjectManage(true)
                setYakitMode("soft")
            }
        } catch (error) {
            yakitFailed(error + "")
        }

        setTimeout(() => onSetEngineLink(true), 100)
    })

    /**
     * Listener for Engine Start Process Errors
     */
    useEffect(() => {
        ipcRenderer.on("start-yaklang-engine-error", (_, error: string) => {
            setCheckLog((arr) => arr.concat([`${error}`]))
        })
        return () => {
            ipcRenderer.removeAllListeners("start-yaklang-engine-error")
        }
    }, [])

    const onReady = useMemoizedFn(() => {
        outputToPrintLog(`Connection Successful - start-engineLink:${cacheEngineLink.current}`)
        if (!cacheEngineLink.current) {
            isEnpriTraceAgent() ? SELinkedEngine() : onLinkedEngine()
        }

        setCheckLog([])
        onSetYakitStatus("link")

        // Connection Successful, Save Port Cache
        switch (cacheEngineMode.current) {
            case "local":
                if (dynamicStatus.isDynamicStatus) return
                setLocalValue(LocalGV.YaklangEnginePort, credential.Port)
                return
        }
    })
    const onFailed = useMemoizedFn((count: number) => {
        // Counts Over 20 Are Invalid
        if (count > 20) {
            setKeepalive(false)
            return
        }
        outputToPrintLog(`Connection Failed: ${count}Times`)

        onSetEngineLink(false)

        if (dynamicStatus.isDynamicStatus && cacheYakitStatus.current !== "control-remote") {
            setCheckLog(["Remote Control Reconnecting..."])
            onSetYakitStatus("control-remote")
            return
        } else {
            if (cacheYakitStatus.current === "control-remote") {
                if (count === 5) {
                    setCheckLog(["遥控器退出错误，无连接"])
                    failed("遥控器退出错误，无连接。")
                    setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                    remoteOperation(false, dynamicStatus, userInfo)
                    onSetYakitStatus("control-remote-timeout")
                    onDisconnect()
                }
                return
            }
        }

        if (cacheYakitStatus.current === "error" && count === 20) {
            // After 20 Attempts Post Disconnection, No Further Attempts
            setCheckLog((arr) => {
                return arr.slice(1).concat(["Connection Timeout, Manually Start Engine"])
            })
            return
        }

        if (cacheYakitStatus.current === "link" || cacheYakitStatus.current === "ready") {
            // Triggered When Connecting or Already Connected
            if (cacheEngineMode.current === "remote") {
                failed("Remote Connection Disconnected")
                onDisconnect()
                onSetYakitStatus("")
            }
            if (cacheEngineMode.current === "local") {
                if (cacheYakitStatus.current === "link") setCheckLog(["Engine Connection Timeout, Attempting Reconnect"])
                if (count > 8) {
                    onSetYakitStatus("error")
                }
            }
        }
    })

    const onWatchDogCallback = useMemoizedFn((type: EngineWatchDogCallbackType) => {
        switch (type) {
            case "control-remote-connect-failed":
                setCheckLog(["遥控器退出错误，无连接"])
                onSetYakitStatus("control-remote-timeout")
                return
            case "remote-connect-failed":
                setTimeout(() => {
                    setRemoteLinkLoading(false)
                }, 300)
                return

            default:
                return
        }
    })

    return (
        <div className={styles["ui-layout-wrapper"]}>
            <div className={styles["ui-layout-container"]}>
                <div className={styles["container-wrapper"]}>
                    <YaklangEngineWatchDog
                        credential={credential}
                        /* keepalive Triggers Ready and Failed */
                        keepalive={keepalive}
                        engineLink={engineLink}
                        onKeepaliveShouldChange={setKeepalive}
                        onReady={onReady}
                        onFailed={onFailed}
                        failedCallback={onWatchDogCallback}
                    />
                    <div id='yakit-header' className={styles["ui-layout-header"]}>
                        {system === "Darwin" ? (
                            <div className={classNames(styles["header-body"], styles["mac-header-body"])}>
                                {/* Cover Bottom Border */}
                                <div
                                    style={{left: yakitMode === "soft" ? 76 : -45}}
                                    className={styles["header-border-yakit-mask"]}
                                ></div>

                                <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                                    {getAppTitleName}-{`${EngineModeVerbose(engineMode || "local", dynamicStatus)}`}
                                </div>

                                <div className={styles["header-left"]}>
                                    <div>
                                        <MacUIOp
                                            currentProjectId={currentProject?.Id ? currentProject?.Id + "" : ""}
                                            pageChildrenShow={pageShowHome}
                                        />
                                    </div>

                                    {engineLink && (
                                        <>
                                            {!isEnpriTraceAgent() && (
                                                <div
                                                    className={classNames(styles["yakit-mode-icon"], {
                                                        [styles["yakit-mode-selected"]]: yakitMode === "soft"
                                                    })}
                                                    onClick={() => changeYakitMode("soft")}
                                                >
                                                    <SolidHomeIcon className={styles["mode-icon-selected"]} />
                                                </div>
                                            )}

                                            <div className={styles["divider-wrapper"]}></div>
                                            <YakitGlobalHost isEngineLink={engineLink} />
                                        </>
                                    )}
                                    <div className={styles["short-divider-wrapper"]}>
                                        <div className={styles["divider-style"]}></div>
                                    </div>

                                    <div className={styles["left-cpu"]}>
                                        <PerformanceDisplay engineMode={engineMode} typeCallback={handleOperations} />
                                    </div>
                                </div>
                                <div
                                    className={classNames(styles["header-title"], {
                                        [styles["header-title-drop"]]: drop
                                    })}
                                    onDoubleClick={maxScreen}
                                />
                                <div className={styles["header-right"]}>
                                    {stopScreen}

                                    <HelpDoc system={system} arch={arch} engineLink={engineLink} />

                                    {engineLink && (
                                        <>
                                            <FuncDomain
                                                isEngineLink={engineLink}
                                                engineMode={engineMode || "remote"}
                                                isRemoteMode={isRemoteEngine}
                                                onEngineModeChange={handleOperations}
                                                runDynamicControlRemote={runControlRemote}
                                                typeCallback={handleOperations}
                                                showProjectManage={showProjectManage}
                                                system={system}
                                                isJudgeLicense={isJudgeLicense}
                                            />
                                            {!showProjectManage && (
                                                <>
                                                    <div className={styles["divider-wrapper"]}></div>
                                                    <GlobalState isEngineLink={engineLink} system={system} />
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={classNames(styles["header-body"], styles["win-header-body"])}>
                                <div
                                    style={{left: yakitMode === "soft" ? 44 : -45}}
                                    className={styles["header-border-yakit-mask"]}
                                ></div>

                                <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                                    <>
                                        {getAppTitleName}-{`${EngineModeVerbose(engineMode || "local", dynamicStatus)}`}
                                    </>
                                </div>

                                <div className={styles["header-left"]}>
                                    {engineLink && (
                                        <>
                                            {!showProjectManage && (
                                                <GlobalState isEngineLink={engineLink} system={system} />
                                            )}

                                            {!isEnpriTraceAgent() && (
                                                <div
                                                    className={classNames(styles["yakit-mode-icon"], {
                                                        [styles["yakit-mode-selected"]]: false && yakitMode === "soft"
                                                    })}
                                                    onClick={() => changeYakitMode("soft")}
                                                >
                                                    <SolidHomeIcon className={styles["mode-icon-selected"]} />
                                                </div>
                                            )}

                                            <div className={styles["divider-wrapper"]}></div>
                                            <div>
                                                <FuncDomain
                                                    isEngineLink={engineLink}
                                                    isReverse={true}
                                                    engineMode={engineMode || "remote"}
                                                    isRemoteMode={isRemoteEngine}
                                                    onEngineModeChange={handleOperations}
                                                    runDynamicControlRemote={runControlRemote}
                                                    typeCallback={handleOperations}
                                                    showProjectManage={showProjectManage}
                                                    system={system}
                                                    isJudgeLicense={isJudgeLicense}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <HelpDoc system={system} arch={arch} engineLink={engineLink} />

                                    {stopScreen}
                                </div>

                                <div
                                    className={classNames(styles["header-title"], {
                                        [styles["header-title-drop"]]: drop
                                    })}
                                    onDoubleClick={maxScreen}
                                />

                                <div className={styles["header-right"]}>
                                    <div className={styles["left-cpu"]}>
                                        <PerformanceDisplay engineMode={engineMode} typeCallback={handleOperations} />
                                    </div>
                                    <div className={styles["short-divider-wrapper"]}>
                                        <div className={styles["divider-style"]}></div>
                                    </div>
                                    {engineLink && (
                                        <>
                                            <YakitGlobalHost isEngineLink={engineLink} />
                                            <div className={styles["divider-wrapper"]}></div>
                                        </>
                                    )}
                                    <WinUIOp
                                        currentProjectId={currentProject?.Id ? currentProject?.Id + "" : ""}
                                        pageChildrenShow={pageShowHome}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div id='yakit-uilayout-body' className={styles["ui-layout-body"]}>
                        {yakitStatus === "install" && (
                            // Download Engine When Local Engine Absent
                            <InstallEngine
                                visible={yakitStatus === "install"}
                                system={system}
                                onSuccess={() => handleStatusCompleted("install")}
                                onRemoreLink={() => {
                                    setCheckLog([])
                                    handleLinkRemoteMode()
                                }}
                            />
                        )}

                        {!engineLink && !isRemoteEngine && yaklangDownload && (
                            // Update Engine
                            <DownloadYaklang yaklangSpecifyVersion={yaklangSpecifyVersion} system={system} visible={yaklangDownload} onCancel={onDownloadedYaklang} />
                        )}

                        <LocalEngine
                            ref={localEngineRef}
                            system={system}
                            setLog={setCheckLog}
                            onLinkEngine={handleLinkLocalEngine}
                            setYakitStatus={onSetYakitStatus}
                        />
                        {!engineLink && isRemoteEngine && yakitStatus !== "control-remote" && (
                            <RemoteEngine
                                loading={remoteLinkLoading}
                                setLoading={setRemoteLinkLoading}
                                installedEngine={isEngineInstalled.current}
                                onSubmit={handleLinkRemoteEngine}
                                onSwitchLocalEngine={handleRemoteToLocal}
                            />
                        )}

                        {!engineLink && !isRemoteEngine && (
                            <YakitLoading
                                checkLog={checkLog}
                                yakitStatus={yakitStatus}
                                engineMode={engineMode || "local"}
                                restartLoading={restartLoading}
                                remoteControlRefreshLoading={remoteControlRefreshLoading}
                                btnClickCallback={loadingClickCallback}
                                showEngineLog={showEngineLog}
                                setShowEngineLog={setShowEngineLog}
                            />
                        )}

                        {engineLink && (
                            <YakitSpin spinning={switchEngineLoading}>
                                {isJudgeLicense ? (
                                    <EnterpriseJudgeLogin
                                        setJudgeLicense={setJudgeLicense}
                                        setJudgeLogin={(v: boolean) => {}}
                                    />
                                ) : showProjectManage ? (
                                    <SoftwareSettings
                                        engineMode={engineMode || "local"}
                                        onEngineModeChange={handleLinkRemoteMode}
                                        onFinish={softwareSettingFinish}
                                    />
                                ) : (
                                    props.children
                                )}
                            </YakitSpin>
                        )}

                        {engineLink && (yaklangKillPss || yakitDownload) && (
                            <div className={styles["ui-layout-body-mask"]}>
                                <AllKillEngineConfirm
                                    visible={yaklangKillPss}
                                    setVisible={setYaklangKillPss}
                                    onSuccess={killedEngineToUpdate}
                                />
                                {/* Update yakit */}
                                <DownloadYakit system={system} visible={yakitDownload} setVisible={setYakitDownload} />
                            </div>
                        )}

                        {engineLink && (
                            <CheckEngineVersion
                                engineMode={engineMode || "local"}
                                visible={showCheckVersion}
                                builtInVersion={builtInVersion}
                                currentVersion={currentVersion}
                                onCancel={onCheckVersionCancel}
                            />
                        )}

                        <YakitHint
                            getContainer={document.getElementById("yakit-uilayout-body") || undefined}
                            mask={false}
                            visible={engineLink && killOldEngine}
                            title='New Engine Version Found'
                            content='New Local Engine Version Available, Close to Use New Version?？'
                            okButtonProps={{loading: killLoading}}
                            onOk={killOldProcess}
                            cancelButtonProps={{loading: killLoading}}
                            onCancel={() => setKillOldEngine(false)}
                        />
                    </div>
                </div>
            </div>
            <div
                className={classNames({
                    [styles["uilayout-log"]]: showEngineLog,
                    [styles["uilayout-hidden-log"]]: !showEngineLog,
                    [styles["uilayout-noshow-log"]]: engineLink
                })}
            >
                <EngineLog visible={engineLink} setVisible={setShowEngineLog} />
            </div>
            <BaseMiniConsole visible={yakitConsole} setVisible={setYakitConsole} />

            {/* Project Encrypted Export Popup */}
            <NewProjectAndFolder
                {...projectModalInfo}
                setVisible={(open: boolean) => setProjectModalInfo({visible: open})}
                loading={projectModalLoading}
                setLoading={setProjectModalLoading}
                onModalSubmit={() => {
                    setProjectModalInfo({visible: false})
                    setTimeout(() => setProjectModalLoading(false), 300)
                }}
            />
            {/* Project Plain Text Export Popup */}
            <TransferProject
                {...projectTransferShow}
                onSuccess={handleExportTemporaryProject}
                setVisible={(open: boolean) => setProjectTransferShow({visible: open})}
            />

            {/* Confirm Box for Project Management from Normal Project */}
            <YakitHint
                visible={linkDatabaseHint}
                title='Enter Project Management'
                content='Confirm Return to Project Management Page for Active Tasks?'
                onOk={() => {
                    onOkEnterProjectMag()
                    setLinkDatabaseHint(false)
                }}
                onCancel={() => setLinkDatabaseHint(false)}
            />
            {/* Prompt for Project Management from Temporary Project */}
            {closeTemporaryProjectVisible && (
                <TemporaryProjectPop
                    onOk={async () => {
                        onOkEnterProjectMag()
                        setCloseTemporaryProjectVisible(false)
                    }}
                    onCancel={() => {
                        setCloseTemporaryProjectVisible(false)
                    }}
                />
            )}

            {isCommunityEdition() && pageShowHome && showChatCS && (
                <div className={styles["chat-cs-hint-wrapper"]}>
                    <div className={styles["hint-wrapper"]}>
                        <div className={styles["hint-modal-wrapper"]}>
                            <div className={styles["modal-content"]}>
                                <div className={styles["content-style"]}>ChatCS</div>
                                <div className={styles["subcontent-style"]}>Ask NiuNiu for Security Questions~</div>
                            </div>
                            <div className={styles["modal-btn"]} onClick={onChatCS}>
                                Understood
                            </div>
                        </div>
                        <div className={styles["hint-modal-arrow"]}>
                            <PolygonIcon />
                        </div>

                        <div className={styles["show-chat-icon-wrapper"]}>
                            <img src={yakitCattle} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UILayout
