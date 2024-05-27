import React, {useEffect, useRef, useState} from "react"
import {WinUIOpCloseSvgIcon, WinUIOpMaxSvgIcon, WinUIOpMinSvgIcon, WinUIOpRestoreSvgIcon} from "./icons"
import {useMemoizedFn} from "ahooks"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {useRunNodeStore} from "@/store/runNode"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {yakitFailed} from "@/utils/notification"
import {useTemporaryProjectStore} from "@/store/temporaryProject"

import styles from "./uiOperate.module.scss"

const {ipcRenderer} = window.require("electron")

export interface WinUIOpProp {
    currentProjectId: string // Current project id
    pageChildrenShow: boolean
}

export const WinUIOp: React.FC<WinUIOpProp> = React.memo((props) => {
    const [isMax, setIsMax] = useState<boolean>(false)

    const operate = useMemoizedFn((type: "close" | "min" | "max") => {
        ipcRenderer.invoke("UIOperate", type)
    })

    useEffect(() => {
        ipcRenderer.invoke("is-maximize-screen")
        ipcRenderer.on("callback-is-maximize-screen", (_, value: boolean) => {
            setIsMax(value)
        })

        ipcRenderer.on("callback-win-maximize", async (e: any) => setIsMax(true))
        ipcRenderer.on("callback-win-unmaximize", async (e: any) => setIsMax(false))

        return () => {
            ipcRenderer.removeAllListeners("callback-win-maximize")
            ipcRenderer.removeAllListeners("callback-win-unmaximize")
        }
    }, [])

    const {runNodeList, clearRunNodeList} = useRunNodeStore()
    const [closeRunNodeItemVerifyVisible, setCloseRunNodeItemVerifyVisible] = useState<boolean>(false)
    const {temporaryProjectId, temporaryProjectNoPromptFlag} = useTemporaryProjectStore()
    const lastTemporaryProjectIdRef = useRef<string>("")
    const [closeTemporaryProjectVisible, setCloseTemporaryProjectVisible] = useState<boolean>(false)
    const lastTemporaryProjectNoPromptRef = useRef<boolean>(false)

    useEffect(() => {
        lastTemporaryProjectNoPromptRef.current = temporaryProjectNoPromptFlag
    }, [temporaryProjectNoPromptFlag])

    useEffect(() => {
        lastTemporaryProjectIdRef.current = temporaryProjectId
    }, [temporaryProjectId])

    const handleCloseSoft = async () => {
        if (props.pageChildrenShow) {
            /**
             * When the close button appears inside a project, the situation prompting a popup
             * Popups for temporary projects should appear last.
             */
            // If running nodes exist
            if (Array.from(runNodeList).length) {
                setCloseRunNodeItemVerifyVisible(true)
                return
            }

            // If a temporary project is open
            if (
                lastTemporaryProjectIdRef.current &&
                props.currentProjectId &&
                lastTemporaryProjectIdRef.current === props.currentProjectId &&
                !lastTemporaryProjectNoPromptRef.current
            ) {
                setCloseTemporaryProjectVisible(true)
                return
            }
        }
        operate("close")
    }

    const handleKillAllRunNode = async () => {
        let promises: (() => Promise<any>)[] = []
        Array.from(runNodeList).forEach(([key, pid]) => {
            promises.push(() => ipcRenderer.invoke("kill-run-node", {pid}))
        })
        try {
            await Promise.allSettled(promises.map((promiseFunc) => promiseFunc()))
            clearRunNodeList()
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    return (
        <div
            className={styles["win-ui-op-wrapper"]}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div className={styles["win-ui-op-body"]}>
                <div className={styles["op-btn"]} onClick={() => operate("min")}>
                    <WinUIOpMinSvgIcon className={styles["icon-style"]} />
                </div>
                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>

                <div className={styles["op-btn"]} onClick={() => operate("max")}>
                    {isMax ? (
                        <WinUIOpRestoreSvgIcon className={styles["icon-style"]} />
                    ) : (
                        <WinUIOpMaxSvgIcon className={styles["icon-style"]} />
                    )}
                </div>
                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>

                <div className={styles["op-btn"]} onClick={handleCloseSoft}>
                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                </div>
                {/* Confirm node shutdown dialog */}
                <YakitHint
                    visible={closeRunNodeItemVerifyVisible}
                    title='Confirm node shutdown?'
                    content='Shutting down Yakit defaults to turning off all active nodes.'
                    onOk={async () => {
                        await handleKillAllRunNode()
                        setCloseRunNodeItemVerifyVisible(false)
                        handleCloseSoft()
                    }}
                    onCancel={() => {
                        setCloseRunNodeItemVerifyVisible(false)
                    }}
                />

                {/* Confirm exit temporary project dialog */}
                {closeTemporaryProjectVisible && (
                    <TemporaryProjectPop
                        title='Shut down Yakit'
                        content='Yakit will automatically exit temporary projects, not saving any data. Export data via Settings > Project Management before exiting.'
                        onOk={async () => {
                            setCloseTemporaryProjectVisible(false)
                            operate("close")
                        }}
                        onCancel={() => {
                            setCloseTemporaryProjectVisible(false)
                        }}
                    />
                )}
            </div>
        </div>
    )
})

interface TemporaryProjectPopProp {
    onOk: () => void
    onCancel: () => void
    title?: string
    content?: any
}

export const TemporaryProjectPop: React.FC<TemporaryProjectPopProp> = (props) => {
    const [temporaryProjectNoPrompt, setTemporaryProjectNoPrompt] = useState<boolean>(false)

    const {setTemporaryProjectNoPromptFlag} = useTemporaryProjectStore()

    const onok = useMemoizedFn(() => {
        setTemporaryProjectNoPromptFlag(temporaryProjectNoPrompt)
        props.onOk()
    })

    return (
        <YakitHint
            visible={true}
            title={props.title || "Exit Temp Project"}
            footerExtra={
                <YakitCheckbox
                    value={temporaryProjectNoPrompt}
                    onChange={(e) => setTemporaryProjectNoPrompt(e.target.checked)}
                >
                    Do Not Remind Again
                </YakitCheckbox>
            }
            content={
                props.content ? (
                    props.content
                ) : (
                    <>
                        <div>
                            Confirm Exit, Temporary Project Data Will Not Be Saved, Including Traffic, Ports, Domains, and Vulnerability Data。
                        </div>
                        <div>Export data in Settings-Project Management before exiting</div>
                    </>
                )
            }
            onOk={onok}
            onCancel={props.onCancel}
        />
    )
}
