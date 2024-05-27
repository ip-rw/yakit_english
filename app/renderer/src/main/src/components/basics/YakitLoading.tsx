import React, {useMemo} from "react"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"
import {YakitStatusType, YaklangEngineMode} from "@/yakitGVDefine"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {getReleaseEditionName, isCommunityEdition, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {DynamicStatusProps} from "@/store"
import {Tooltip} from "antd"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"

import yakitSE from "@/assets/yakitSE.png"
import yakitEE from "@/assets/yakitEE.png"
import styles from "./yakitLoading.module.scss"

const {ipcRenderer} = window.require("electron")

/** Main Load Screen Message */
const LoadingTitle: string[] = [
    "No Hard Jobs, Just Brave Souls。",
    "Tired from work? Yes! But no crying, it'Risky E-Bike Use。",
    "Work not just for wealth, but also friends and family",
    "Work hard today, secure your position tomorrow",
    "Overwork Kills, Laziness Deadlier。",
    "Some love, some watch the sea at night, some can't wake up with alarms, good morning workers!",
    "Workers, the spirit of workers, the best among people",
    "@Everyone, Yakit means no worries！",
    "Without Yakit, you might fall behind",
    "Trying Yakit? Security's finest",
    "Everyone in CyberSec has a Yakit, so fragrant！",

    "WebFuzzer Add Dict ——FruitFungus",
    "Yakit No SOCKS ——FruitFungus ",
    "Trending DES AES Tags ——FruitFungus",
    "Yakit: PenTest Ideal ——WineZero",
    "Fast Fuzz Reload ——k1115h0t",
    "Explore new worlds, don't Be Bored! ——Chelth",
    "<script>alert(‘Hello Yakit!’)</script> ——Crimson Snow",
    "Mice Reign Supreme! ——Chelth"
]

export const EngineModeVerbose = (m: YaklangEngineMode, n?: DynamicStatusProps) => {
    if (n && n.isDynamicStatus) {
        return "Control Mode"
    }
    switch (m) {
        case "local":
            return "Local Mode"
        case "remote":
            return "Remote Mode"
        default:
            return "Unknown Mode"
    }
}

export interface YakitLoadingProp {
    /** Yakit Mode */
    yakitStatus: YakitStatusType
    /** Engine Mode */
    engineMode: YaklangEngineMode

    /** Software Check Log */
    checkLog: string[]

    showEngineLog: boolean
    setShowEngineLog: (flag: boolean) => any

    /** Manual Reconnect Loading */
    restartLoading: boolean
    /** Remote Refresh Loading */
    remoteControlRefreshLoading: boolean

    btnClickCallback: (type: YaklangEngineMode | YakitStatusType) => any
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {
        yakitStatus,
        engineMode,
        showEngineLog,
        setShowEngineLog,
        restartLoading,
        remoteControlRefreshLoading,
        btnClickCallback,
        checkLog
    } = props

    const btns = useMemo(() => {
        if (yakitStatus === "checkError") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("checkError")}
                    >
                        Manual Engine Connect
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        Switch To{engineMode === "local" ? "Remote" : "Local"}Mode
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "break") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("break")}
                    >
                        Manual Engine Connect
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        Switch To{engineMode === "local" ? "Remote" : "Local"}Mode
                    </YakitButton>
                </>
            )
        }
        if (yakitStatus === "error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("error")}
                    >
                        Manual Engine Connect
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        Switch To{engineMode === "local" ? "Remote" : "Local"}Mode
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='text'
                        onClick={() => setShowEngineLog(!showEngineLog)}
                    >
                        {showEngineLog ? "Hide Log" : "View Log"}
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "control-remote") {
            return (
                <>
                    <YakitButton
                        loading={remoteControlRefreshLoading}
                        className={styles["btn-style"]}
                        size='max'
                        onClick={() => btnClickCallback("control-remote")}
                    >
                        Refresh
                    </YakitButton>
                    <YakitButton
                        loading={remoteControlRefreshLoading}
                        className={styles["btn-style"]}
                        type='outline2'
                        size='max'
                        onClick={() => btnClickCallback("local")}
                    >
                        Back
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "control-remote-timeout") {
            return (
                <YakitButton
                    loading={restartLoading}
                    className={styles["btn-style"]}
                    type='outline2'
                    size='max'
                    onClick={() => btnClickCallback("local")}
                >
                    Return to Local
                </YakitButton>
            )
        }

        return <></>
    }, [yakitStatus, restartLoading, remoteControlRefreshLoading, engineMode, showEngineLog])

    /** Load Page Slogan */
    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])
    /** Title */
    const Title = useMemo(
        () => (yakitStatus === "control-remote" ? "Remote Control Active ..." : `Welcome ${getReleaseEditionName()}`),
        [yakitStatus]
    )

    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["body-content"]}>
                    <div className={styles["yakit-loading-title"]}>
                        <div className={styles["title-style"]}>{Title}</div>
                        {isCommunityEdition() && <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>}
                    </div>

                    {/* Community - Start Logo */}
                    {isCommunityEdition() && (
                        <div className={styles["yakit-loading-icon-wrapper"]}>
                            <div className={styles["theme-icon-wrapper"]}>
                                <div className={styles["theme-icon"]}>
                                    <YakitThemeLoadingSvgIcon />
                                </div>
                            </div>
                            <div className={styles["white-icon"]}>
                                <YakitLoadingSvgIcon />
                            </div>
                        </div>
                    )}
                    {/* Enterprise - Start Logo */}
                    {isEnpriTrace() && (
                        <div className={styles["yakit-loading-icon-wrapper"]}>
                            <div className={styles["white-icon"]}>
                                <img src={yakitEE} alt='No Image' />
                            </div>
                        </div>
                    )}
                    {/* Portable - Start Logo */}
                    {isEnpriTraceAgent() && (
                        <div className={styles["yakit-loading-icon-wrapper"]}>
                            <div className={styles["white-icon"]}>
                                <img src={yakitSE} alt='No Image' />
                            </div>
                        </div>
                    )}

                    <div className={styles["yakit-loading-content"]}>
                        <div className={styles["log-wrapper"]}>
                            <div className={styles["log-body"]}>
                                {checkLog.map((item, index) => {
                                    return <div key={item}>{item}</div>
                                })}
                            </div>
                        </div>

                        <div className={styles["engine-log-btn"]}>
                            {btns}
                            <div
                                className={styles["engine-help-wrapper"]}
                                onClick={() => {
                                    ipcRenderer.invoke("open-yaklang-path")
                                }}
                            >
                                Open Engine Folder
                                <Tooltip title={`Run after opening folder'start-engine-grpc'，Cmd Init Engine`}>
                                    <OutlineQuestionmarkcircleIcon />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
