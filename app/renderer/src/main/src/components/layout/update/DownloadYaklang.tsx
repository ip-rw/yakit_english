import React, {useState, useRef, useEffect} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {getReleaseEditionName} from "@/utils/envfile"
import {failed, success} from "@/utils/notification"
import {YakitSystem, DownloadingState} from "@/yakitGVDefine"
import {useGetState, useMemoizedFn} from "ahooks"
import {Progress} from "antd"
import {YaklangInstallHintSvgIcon} from "../icons"
import {QuestionModal} from "./InstallEngine"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {safeFormatDownloadProcessState} from "../utils"

import classNames from "classnames"
import styles from "./DownloadYaklang.module.scss"

const {ipcRenderer} = window.require("electron")

interface DownloadYaklangProps {
    yaklangSpecifyVersion: string
    system: YakitSystem
    visible: boolean
    onCancel: () => any
}

/** @Name Yaklang Engine Update Prompt */
export const DownloadYaklang: React.FC<DownloadYaklangProps> = React.memo((props) => {
    const {yaklangSpecifyVersion, system, visible, onCancel} = props

    /** FAQ Popup Displayed? */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** Pin to Top? */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** Remote Yaklang Version */
    const yakLangVersion = useRef<string>("")
    /** Download Progress Data */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    // Interrupt Download?
    const isBreakRef = useRef<boolean>(false)
    // Execution Failure?
    const [isFailed, setIsFailed] = useState<boolean>(false)

    const fetchVersion = useMemoizedFn(() => {
        let isTry: boolean = false // Need to Retry?

        setIsFailed(false)
        setDownloadProgress(undefined)

        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => {
                yakLangVersion.current = data.startsWith("v") ? data.slice(1) : data
            })
            .catch((e: any) => {
                if (isBreakRef.current) return
                failed(`Failed to Get Latest Engine Version ${e}`)
                setIsFailed(true)
                isTry = true
            })
            .finally(() => {
                if (isBreakRef.current) return
                if (isTry) return
                downloadYak()
            })
    })

    const downloadYak = () => {
        ipcRenderer
            .invoke("download-latest-yak", yakLangVersion.current)
            .then(() => {
                if (isBreakRef.current) return

                success("Download Complete")
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
                // Clear Main Process Yaklang Cache
                ipcRenderer.invoke("clear-local-yaklang-version-cache")
                onUpdate()
            })
            .catch((e: any) => {
                if (isBreakRef.current) return
                failed(`Engine Download Failed: ${e}`)
                setDownloadProgress(undefined)
                setIsFailed(true)
            })
    }

    /**
     * 1. Get Engine Version (Includes'v'Characters) and Download
     * 2. Monitor Local Download Progress
     */
    useEffect(() => {
        if (visible) {
            isBreakRef.current = false

            if (yaklangSpecifyVersion) {
                yakLangVersion.current = yaklangSpecifyVersion
                downloadYak()
            } else {
                fetchVersion()
            }

            ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
                if (isBreakRef.current) return
                setDownloadProgress(safeFormatDownloadProcessState(state))
            })

            return () => {
                ipcRenderer.removeAllListeners("download-yak-engine-progress")
            }
        } else {
            isBreakRef.current = true
        }
    }, [visible])

    /** Update Now */
    const onUpdate = useMemoizedFn(() => {
        if (isBreakRef.current) return
        ipcRenderer
            .invoke("install-yak-engine", yakLangVersion.current)
            .then(() => {
                success(`Installation Successful, Restart if Not Effective ${getReleaseEditionName()} Then`)
            })
            .catch((err: any) => {
                failed(`Installation Failed: ${err.message.indexOf("operation not permitted") > -1 ? "Please Close Engine and Retry" : err}`)
            })
            .finally(() => {
                onClose()
            })
    })

    /** Popup Drag Event */
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

    const onClose = useMemoizedFn(() => {
        isBreakRef.current = true
        setDownloadProgress(undefined)
        setQSShow(false)
        onCancel()
    })

    return (
        <div className={visible ? styles["mask-wrapper"] : styles["hidden-wrapper"]}>
            <Draggable
                defaultClassName={classNames(styles["yaklang-update-modal"], {
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
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>Yaklang Engine Downloading...</div>
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
                                        <div>Download Speed : {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s</div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        {isFailed && (
                                            <YakitButton
                                                size='max'
                                                type='outline2'
                                                onClick={() =>
                                                    yaklangSpecifyVersion ? downloadYak() : fetchVersion()
                                                }
                                            >
                                                Retry
                                            </YakitButton>
                                        )}
                                        <YakitButton size='max' type='outline2' onClick={onClose}>
                                            Cancel
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
            <QuestionModal isTop={isTop} setIsTop={setIsTop} system={system} visible={qsShow} setVisible={setQSShow} />
        </div>
    )
})
