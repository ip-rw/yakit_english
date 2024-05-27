import React, {useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {MacUIOpCloseSvgIcon, WinUIOpCloseSvgIcon, YakitCopySvgIcon, YaklangInstallHintSvgIcon} from "../icons"
import {Checkbox, Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {DownloadingState, YakitSystem} from "@/yakitGVDefine"
import {failed, info, success} from "@/utils/notification"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {LocalGV} from "@/yakitGV"
import {getReleaseEditionName} from "@/utils/envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {safeFormatDownloadProcessState} from "../utils"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./InstallEngine.module.scss"

const {ipcRenderer} = window.require("electron")

export interface InstallEngineProps {
    system: YakitSystem
    visible: boolean
    onSuccess: () => any
    onRemoreLink: () => any
}

export const InstallEngine: React.FC<InstallEngineProps> = React.memo((props) => {
    const {system, visible, onSuccess, onRemoreLink} = props

    /** ---------- OS, Arch & Built-in Engine Related Start ---------- */
    const [platformArch, setPlatformArch] = useState<string>("")

    const [buildInEngineVersion, setBuildInEngineVersion] = useState("")
    const haveBuildInEngine = useMemo(() => {
        return buildInEngineVersion !== ""
    }, [buildInEngineVersion])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-and-arch").then((e: string) => setPlatformArch(e))
        ipcRenderer
            .invoke("GetBuildInEngineVersion")
            .then((ver) => setBuildInEngineVersion(ver))
            .catch(() => {})
    }, [])

    const [extractingBuildInEngine, setExtractingBuildInEngine] = useState(false)
    const initBuildInEngine = useMemoizedFn(() => {
        setExtractingBuildInEngine(true)
        ipcRenderer
            .invoke("InitBuildInEngine", {})
            .then(() => {
                info(`Built-in Engine Unzip Success`)
                showYakitModal({
                    closable: false,
                    maskClosable: false,
                    keyboard: false,
                    type: "white",
                    title: "Engine Unzip Success, Restart Needed",
                    content: (
                        <div className={styles["relaunch-hint"]}>
                            <YakitButton
                                onClick={() => {
                                    ipcRenderer
                                        .invoke("relaunch")
                                        .then(() => {})
                                        .catch((e) => {
                                            failed(`Restart Failed: ${e}`)
                                        })
                                }}
                            >
                                Click to Restart Now
                            </YakitButton>
                        </div>
                    ),
                    footer: null
                })
            })
            .catch((e) => {
                failed(`Built-in Engine Init Failed：${e}`)
            })
            .finally(() => setTimeout(() => setExtractingBuildInEngine(false), 300))
    })
    /** ---------- Get OS & Arch & Check Built-in Engine End ---------- */

    /** ---------- Download Status Start ---------- */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    useEffect(() => {
        ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
            if (isBreakDownload.current) return
            setDownloadProgress(safeFormatDownloadProcessState(state))
        })
        return () => {
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])

    /** ---------- Download Status End ---------- */

    /** ---------- Window Drag & Multiple Positions Start ---------- */
    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** Window Drag Event */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    // Window Topmost
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)
    // Window Topmost
    const [agrShow, setAgrShow] = useState<boolean>(false)
    // Window Topmost
    const [qsShow, setQSShow] = useState<boolean>(false)
    /** ---------- Window Drag & Multiple Positions End ---------- */

    /** Utilizer Agreement Checked Status */
    const [agrCheck, setAgrCheck] = useState<boolean>(false)
    /** Check Utilizer Agreement Status on One-click Install */
    const [checkStatus, setCheckStatus] = useState<boolean>(false)
    /** Shake Animation */
    const [isShake, setIsShake] = useState<boolean>(false)
    useEffect(() => {
        getLocalValue(LocalGV.IsCheckedUserAgreement).then((val: boolean) => {
            setAgrCheck(val)
        })
    }, [])
    useDebounceEffect(
        () => {
            if (agrCheck) {
                setLocalValue(LocalGV.IsCheckedUserAgreement, true)
            }
        },
        [agrCheck],
        {wait: 500}
    )

    const [install, setInstall] = useState<boolean>(false)

    /** Latest Remote yaklang Engine Version */
    const latestVersionRef = useRef<string>("")

    /** Interrupt Download Log? */
    const [cancelLoading, setCancelLoading] = useState<boolean>(false)
    const isBreakDownload = useRef<boolean>(false)
    /** Cancel Event */
    const onClose = useMemoizedFn(() => {
        setCancelLoading(true)
        isBreakDownload.current = true
        setDownloadProgress(undefined)
        setTimeout(() => {
            setInstall(false)
            setCancelLoading(false)
        }, 500)
    })
    /** Cancel Download Event */
    const onInstallClose = useMemoizedFn(() => {
        isBreakDownload.current = false
        if (downloadProgress) setDownloadProgress(undefined)
        if (install) setInstall(false)
    })

    /** Get Latest Online Engine Version */
    const fetchEngineLatestVersion = useMemoizedFn((callback?: () => any) => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => {
                if (isBreakDownload.current) return
                latestVersionRef.current = data.startsWith("v") ? data.slice(1) : data
                if (callback) callback()
            })
            .catch((e: any) => {
                failed(`Online Engine Version Fetch Failed ${e}`)
                onInstallClose()
            })
    })

    const downloadEngine = useMemoizedFn(() => {
        ipcRenderer
            .invoke("download-latest-yak", `${latestVersionRef.current}`)
            .then(() => {
                if (isBreakDownload.current) return

                if (!getDownloadProgress()?.size) return
                setDownloadProgress({
                    time: {
                        elapsed: downloadProgress?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getDownloadProgress().size
                })
                success("Download Complete")
                // Clear Main Process yaklang Version Cache
                ipcRenderer.invoke("clear-local-yaklang-version-cache")
                /** Install yaklang Engine */
                ipcRenderer
                    .invoke("install-yak-engine", `${latestVersionRef.current}`)
                    .then(() => {
                        if (isBreakDownload.current) return
                        success(`Install Success, Restart if Ineffective ${getReleaseEditionName()} Just So`)
                        onSuccess()
                    })
                    .catch((err: any) => {
                        failed(`Install Failed: ${err}`)
                        onInstallClose()
                    })
            })
            .catch((e: any) => {
                if (isBreakDownload.current) return
                failed(`Engine Download Failed: ${e}`)
                onInstallClose()
            })
    })

    /** One-click Install Event */
    const installEngine = useMemoizedFn(() => {
        setCheckStatus(true)
        if (!agrCheck) {
            /** Shake Prompt Animation */
            setIsShake(true)
            setTimeout(() => setIsShake(false), 1000)
            return
        }
        isBreakDownload.current = false

        setInstall(true)
        fetchEngineLatestVersion(() => downloadEngine())
    })

    /** Remote Connection */
    const remoteLink = useMemoizedFn(() => {
        setCheckStatus(true)
        if (!agrCheck) {
            setIsShake(true)
            setTimeout(() => setIsShake(false), 1000)
            return
        }
        onRemoreLink()
    })

    return (
        <div className={visible ? styles["install-engine-mask"] : styles["hidden-wrapper"]}>
            <Draggable
                defaultClassName={classNames(styles["install-update-modal"], styles["modal-wrapper"], {
                    [styles["modal-top-wrapper"]]: isTop === 0
                })}
                disabled={disabled}
                bounds={bounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]} onClick={() => setIsTop(0)}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(0)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                                <div
                                    className={styles["qs-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setQSShow(true)
                                        setIsTop(2)
                                    }}
                                >
                                    <OutlineQuestionmarkcircleIcon />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                {install ? (
                                    <div className={styles["hint-right-download"]}>
                                        <div className={styles["hint-right-title"]}>Engine Installing...</div>
                                        <div className={styles["download-progress"]}>
                                            <Progress
                                                strokeColor='#F28B44'
                                                trailColor='#F0F2F5'
                                                percent={Math.floor((downloadProgress?.percent || 0) * 100)}
                                            />
                                        </div>
                                        <div className={styles["download-info-wrapper"]}>
                                            <div>Remaining Time : {(downloadProgress?.time.remaining || 0).toFixed(2)}s</div>
                                            <div className={styles["divider-wrapper"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                            <div>Duration : {(downloadProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                            <div className={styles["divider-wrapper"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                            <div>
                                                Download Speed : {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s
                                            </div>
                                        </div>
                                        <div className={styles["download-btn"]}>
                                            <YakitButton
                                                loading={cancelLoading}
                                                size='max'
                                                type='outline2'
                                                onClick={onClose}
                                            >
                                                Cancel
                                            </YakitButton>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles["hint-right-title"]}>
                                            {haveBuildInEngine ? "Local Engine Uninitiated" : "Engine Not Installed"}
                                        </div>
                                        <div className={styles["hint-right-content"]}>
                                            {haveBuildInEngine
                                                ? `Authorize Built-in Engine: ${buildInEngineVersion}，Or Remote Start`
                                                : "Choose Yak Engine or Remote Connection"}
                                        </div>

                                        {platformArch === "darwin-arm64" && (
                                            <div className={styles["hint-right-macarm"]}>
                                                <div>
                                                    <div className={styles["mac-arm-hint"]}>
                                                        Current System (darwin-arm64), Rosetta 2 Required for Yak
                                                        Core Engine
                                                        <br />
                                                        Manual Rosetta Install Command
                                                    </div>
                                                    <div className={styles["mac-arm-command"]}>
                                                        softwareupdate --install-rosetta
                                                        <CopyComponents
                                                            className={styles["copy-icon"]}
                                                            copyText='softwareupdate --install-rosetta'
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={classNames(styles["hint-right-agreement"], {
                                                [styles["agr-shake-animation"]]: !agrCheck && isShake
                                            })}
                                        >
                                            <Checkbox
                                                className={classNames(
                                                    {[styles["agreement-checkbox"]]: !(!agrCheck && checkStatus)},
                                                    {
                                                        [styles["agreement-danger-checkbox"]]: !agrCheck && checkStatus
                                                    }
                                                )}
                                                checked={agrCheck}
                                                onChange={(e) => setAgrCheck(e.target.checked)}
                                            ></Checkbox>
                                            <span>
                                                Check to Agree{" "}
                                                <span
                                                    className={styles["agreement-style"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setAgrShow(true)
                                                        setIsTop(1)
                                                    }}
                                                >
                                                    《Utilizer Agreement》
                                                </span>
                                                To Continue Utilize
                                            </span>
                                        </div>

                                        <div className={styles["hint-right-btn"]}>
                                            <div>
                                                <YakitButton size='max' type='outline2' onClick={remoteLink}>
                                                    Remote Connection
                                                </YakitButton>
                                                {haveBuildInEngine && (
                                                    <YakitPopconfirm
                                                        placement='top'
                                                        title={
                                                            "Network Install Requires Public Internet, Prefer Built-in (Engine Init）"
                                                        }
                                                        onConfirm={installEngine}
                                                    >
                                                        <YakitButton
                                                            type={"text"}
                                                            size='small'
                                                            style={{fontSize: 12}}
                                                            disabled={!agrCheck}
                                                        >
                                                            Online Install
                                                        </YakitButton>
                                                    </YakitPopconfirm>
                                                )}
                                            </div>
                                            <div className={styles["btn-group-wrapper"]}>
                                                <YakitButton
                                                    size='max'
                                                    type='outline2'
                                                    onClick={() => ipcRenderer.invoke("UIOperate", "close")}
                                                >
                                                    Cancel
                                                </YakitButton>

                                                {!haveBuildInEngine && (
                                                    // No Built-in Engine
                                                    <YakitButton size='max' onClick={installEngine}>
                                                        One-click Install
                                                    </YakitButton>
                                                )}
                                                {haveBuildInEngine && (
                                                    // Built-in Engine Available
                                                    <YakitButton
                                                        size='max'
                                                        loading={extractingBuildInEngine}
                                                        disabled={!agrCheck}
                                                        onClick={initBuildInEngine}
                                                    >
                                                        Initialize Engine
                                                    </YakitButton>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
            <AgreementContentModal
                isTop={isTop}
                setIsTop={setIsTop}
                system={system}
                visible={agrShow}
                setVisible={setAgrShow}
            />
            <QuestionModal isTop={isTop} setIsTop={setIsTop} system={system} visible={qsShow} setVisible={setQSShow} />
        </div>
    )
})

interface AgrAndQSModalProps {
    isTop: 0 | 1 | 2
    setIsTop: (type: 0 | 1 | 2) => any
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @Utilizer Agreement Popup */
const AgreementContentModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <Draggable
            defaultClassName={classNames(
                styles["yakit-agr-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 1},
                visible ? styles["modal-wrapper"] : styles["hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-info-modal"]} onClick={() => setIsTop(1)}>
                    <div className={styles["agreement-content-modal-wrapper"]}>
                        {system === "Darwin" ? (
                            <div
                                className={classNames(styles["modal-header"], styles["mac-header"])}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(1)}
                            >
                                <div
                                    className={styles["close-wrapper"]}
                                    onMouseEnter={() => setShow(true)}
                                    onMouseLeave={() => setShow(false)}
                                    onClick={() => setVisible(false)}
                                >
                                    {show ? (
                                        <MacUIOpCloseSvgIcon />
                                    ) : (
                                        <div className={styles["close-btn"]}>
                                            <div className={styles["btn-icon"]}></div>
                                        </div>
                                    )}
                                </div>
                                <span>Utilizer Agreement</span>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["modal-header"], styles["win-header"])}
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(1)}
                            >
                                <span className={styles["header-title"]}>Utilizer Agreement</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["body-title"]}>Disclaimer</div>
                            <div className={styles["body-content"]}>
                                1. Tool Intended For <span className={styles["sign-content"]}>Authorized Utilize</span>{" "}
                                Legal Testing Env - Biz & Edu。
                                <br />
                                2. Legal & Authorized Scans。
                                <span className={styles["underline-content"]}>No Unauthorized Scans。</span>
                                <br />
                                3. No Reverse-Engineering, Decompiling, Cracking, Malware Distribution。
                                <br />
                                <span className={styles["sign-bold-content"]}>
                                    Anti-Illegal Action Rights。
                                </span>
                                <br />
                                Misuse Liability。
                                <br />
                                Before Using, Please{" "}
                                <span className={styles["sign-bold-content"]}>Read Terms Carefully。</span>
                                <br />
                                Limitation, Disclaimer & Other Significant Terms Notice{" "}
                                <span className={styles["sign-bold-content"]}>Bold</span>、
                                <span className={styles["underline-content"]}>Underline</span>
                                Notice Summary。
                                <br />
                                Don't Must Agree to Install/Utilize。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
})
/** @Yaklang-FAQ Popup */
export const QuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)
    const [latestVersion, setLatestVersion] = useState("")

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const copyCommand = useMemoizedFn((type: YakitSystem) => {
        let link: string = ""
        switch (type) {
            case "Darwin":
                link = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestVersion || "latest"}/yak_darwin_amd64`
                break
            case "Linux":
                link = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestVersion || "latest"}/yak_linux_amd64`
                break
            case "Windows_NT":
                link = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${
                    latestVersion || "latest"
                }/yak_windows_amd64.exe`
                break
        }
        ipcRenderer.invoke("set-copy-clipboard", link)
        success("Copy Success")
    })

    useEffect(() => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => setLatestVersion(data.startsWith("v") ? data.slice(1) : data))
            .catch((e: any) => {})
    }, [])

    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <Draggable
            defaultClassName={classNames(
                styles["yaklang-qs-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 2},
                visible ? styles["modal-wrapper"] : styles["hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-info-modal"]} onClick={() => setIsTop(2)}>
                    <div className={styles["question-modal-wrapper"]}>
                        {system === "Darwin" ? (
                            <div
                                className={classNames(styles["modal-header"], styles["mac-header"])}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(2)}
                            >
                                <div
                                    className={styles["close-wrapper"]}
                                    onMouseEnter={() => setShow(true)}
                                    onMouseLeave={() => setShow(false)}
                                    onClick={() => setVisible(false)}
                                >
                                    {show ? (
                                        <MacUIOpCloseSvgIcon />
                                    ) : (
                                        <div className={styles["close-btn"]}>
                                            <div className={styles["btn-icon"]}></div>
                                        </div>
                                    )}
                                </div>
                                <span>Yak Core Engine Download URL</span>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["modal-header"], styles["win-header"])}
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(2)}
                            >
                                <span className={styles["header-title"]}>Yak Core Engine Download URL</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["body-hint"]}>
                                <span className={styles["hint-sign"]}>Manual Install if Download Fails：</span>
                                <br />
                                Windows Engine Directory %HOME%)/yakit-projects/yak-engine/yak.exe
                                Identifies MacOS as / Linux Engine Placement ~/yakit-projects/yak-engine/Recognizes as yak
                            </div>

                            <div className={styles["body-link"]}>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 107}} className={styles["link-title"]}>
                                        Windows(x64) Download
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://yaklang.oss-cn-beijing.aliyuncs.com/yak/{latestVersion || "latest"}
                                        /yak_windows_amd64.exe
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Windows_NT")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 122}} className={styles["link-title"]}>
                                        MacOS(intel/m1) Download
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://yaklang.oss-cn-beijing.aliyuncs.com/yak/{latestVersion || "latest"}
                                        /yak_darwin_amd64
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Darwin")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 87}} className={styles["link-title"]}>
                                        Linux(x64) Download
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://yaklang.oss-cn-beijing.aliyuncs.com/yak/{latestVersion || "latest"}
                                        /yak_linux_amd64
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Linux")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
})
