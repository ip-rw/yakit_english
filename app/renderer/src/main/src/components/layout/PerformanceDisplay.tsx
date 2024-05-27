import React, {useState, useEffect, useRef, useMemo} from "react"
import {failed, info, success} from "@/utils/notification"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {LoadingOutlined} from "@ant-design/icons"
import {useInViewport, useMemoizedFn} from "ahooks"
import {Popconfirm} from "antd"
import {Sparklines, SparklinesCurve} from "react-sparklines"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {CheckedSvgIcon, GooglePhotosLogoSvgIcon} from "./icons"
import {YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog"
import {useRunNodeStore} from "@/store/runNode"
import emiter from "@/utils/eventBus/eventBus"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"

import classNames from "classnames"
import styles from "./performanceDisplay.module.scss"

const {ipcRenderer} = window.require("electron")

interface PerformanceDisplayProps {
    engineMode: YaklangEngineMode | undefined
    typeCallback: (type: "break") => any
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = React.memo((props) => {
    // CPU and Memory Visualization
    const [cpu, setCpu] = useState<number[]>([])

    const [showLine, setShowLine] = useState<boolean>(true)
    const showLineTime = useRef<any>(null)

    useEffect(() => {
        ipcRenderer.invoke("start-compute-percent")
        const time = setInterval(() => {
            ipcRenderer.invoke("fetch-compute-percent").then((res) => setCpu(res))
        }, 500)

        return () => {
            clearInterval(time)
            ipcRenderer.invoke("clear-compute-percent")
        }
    }, [])

    const onWinResize = (e: UIEvent) => {
        if (showLineTime.current) clearTimeout(showLineTime.current)
        showLineTime.current = setTimeout(() => {
            if (document) {
                const header = document.getElementById("yakit-header")
                if (header) {
                    setShowLine(header.clientWidth >= 1000)
                }
            }
        }, 100)
    }

    useEffect(() => {
        if (window) {
            window.addEventListener("resize", onWinResize)
            return () => {
                window.removeEventListener("resize", onWinResize)
                if (showLineTime.current) clearTimeout(showLineTime.current)
                showLineTime.current = null
            }
        }
    }, [])

    return (
        <div className={styles["system-func-wrapper"]}>
            <div className={styles["cpu-wrapper"]}>
                <div className={styles["cpu-title"]}>
                    <span className={styles["title-headline"]}>CPU </span>
                    <span className={styles["title-content"]}>{`${cpu[cpu.length - 1] || 0}%`}</span>
                </div>

                {showLine && (
                    <div className={styles["cpu-spark"]}>
                        <Sparklines data={cpu} width={96} height={10} max={96}>
                            <SparklinesCurve color='#85899E' />
                        </Sparklines>
                    </div>
                )}
            </div>
            <UIEngineList {...props} />
        </div>
    )
})

export interface yakProcess {
    port: number
    pid: number
    ppid?: number
    cmd: string
    origin: any
}

interface UIEngineListProp {
    engineMode: YaklangEngineMode | undefined
    typeCallback: (type: "break") => any
}

/** @Active Engines List */
const UIEngineList: React.FC<UIEngineListProp> = React.memo((props) => {
    const {engineMode, typeCallback} = props

    const [show, setShow] = useState<boolean>(false)

    const listRef = useRef(null)
    const [inViewport] = useInViewport(listRef)

    const [psLoading, setPSLoading] = useState<boolean>(false)
    const [process, setProcess] = useState<yakProcess[]>([])
    const {runNodeList} = useRunNodeStore()
    const [port, setPort] = useState<number>(0)

    const fetchPSList = useMemoizedFn(() => {
        if (psLoading) return

        setPSLoading(true)
        ipcRenderer
            .invoke("ps-yak-grpc")
            .then((i: yakProcess[]) => {
                const valuesArray = Array.from(runNodeList.values())
                // Filter running nodes
                setProcess(
                    i
                        .filter((item) => !valuesArray.includes(item.pid.toString()))
                        .map((element: yakProcess) => {
                            return {
                                port: element.port,
                                pid: element.pid,
                                cmd: element.cmd,
                                origin: element.origin
                            }
                        })
                )
            })
            .catch((e) => {
                failed(`PS | GREP yak failed ${e}`)
            })
            .finally(() => {
                setPSLoading(false)
            })
    })
    const fetchCurrentPort = () => {
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                if (+hosts[1]) setPort(+hosts[1] || 0)
            })
            .catch(() => {})
    }
    useEffect(() => {
        if (inViewport) {
            fetchPSList()
            fetchCurrentPort()

            let id = setInterval(() => {
                fetchPSList()
                fetchCurrentPort()
            }, 3000)
            return () => {
                clearInterval(id)
            }
        }
    }, [inViewport])

    const allClose = useMemoizedFn(async () => {
        await delTemporaryProject()
        ;(process || []).forEach((i) => {
            ipcRenderer.invoke("kill-yak-grpc", i.pid).then((val) => {
                if (!val) {
                    info(`KILL yak PROCESS: ${i.pid}`)
                    if (+i.port === port && isLocal) typeCallback("break")
                }
            })
        })
        setTimeout(() => success("Engine Process Shutting Down..."), 1000)
    })

    const isLocal = useMemo(() => {
        return engineMode === "local"
    }, [engineMode])

    const {delTemporaryProject} = useTemporaryProjectStore()

    return (
        <YakitPopover
            visible={show}
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-engine-list-dropdown"])}
            placement={"bottomRight"}
            content={
                <div ref={listRef} className={styles["ui-engine-list-wrapper"]}>
                    <div className={styles["ui-engine-list-body"]}>
                        <div className={styles["engine-list-header"]}>
                            Local Yak Process Mgmt
                            <Popconfirm
                                title={"Resetting engine version reverts to factory settings and forces restart"}
                                onConfirm={async () => {
                                    await delTemporaryProject()
                                    process.map((i) => {
                                        ipcRenderer.invoke(`kill-yak-grpc`, i.pid)
                                    })
                                    ipcRenderer
                                        .invoke("RestoreEngineAndPlugin", {})
                                        .finally(() => {
                                            info("Engine restored successfully")
                                            ipcRenderer.invoke("relaunch")
                                        })
                                        .catch((e) => {
                                            failed(`Engine Restore Failed：${e}`)
                                        })
                                }}
                            >
                                <YakitButton style={{marginLeft: 8}}>Reset Engine Version</YakitButton>
                            </Popconfirm>
                            {psLoading && <LoadingOutlined className={styles["loading-icon"]} />}
                        </div>
                        <div className={styles["engine-list-container"]}>
                            {process.map((i) => {
                                return (
                                    <div key={i.pid} className={styles["engine-list-opt"]}>
                                        <div className={styles["left-body"]}>
                                            <YakitTag color={isLocal && +i.port === port ? "success" : undefined}>
                                                {`PID: ${i.pid}`}
                                                {isLocal && +i.port === port && (
                                                    <CheckedSvgIcon style={{marginLeft: 8}} />
                                                )}
                                            </YakitTag>
                                            <div className={styles["engine-ps-info"]}>
                                                {`yak grpc --port ${i.port === 0 ? "Retrieving" : i.port}`}
                                                &nbsp;
                                                {isLocal && +i.port === port && (
                                                    <span className={styles["current-ps-info"]}>{"(Current)"}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles["right-body"]}>
                                            <YakitButton
                                                type='text'
                                                onClick={() => {
                                                    setShow(false)
                                                    showYakitModal({
                                                        title: "YakProcess Details",
                                                        content: <div style={{padding: 8}}>{JSON.stringify(i)}</div>,
                                                        footer: null
                                                    })
                                                }}
                                            >
                                                Details
                                            </YakitButton>

                                            <Popconfirm
                                                title={<>Confirm engine switch,</>}
                                                onConfirm={async () => {
                                                    if (+i.port !== port) {
                                                        await delTemporaryProject()
                                                    }
                                                    const switchEngine: YaklangEngineWatchDogCredential = {
                                                        Mode: "local",
                                                        Port: i.port,
                                                        Host: "127.0.0.1"
                                                    }
                                                    ipcRenderer.invoke("switch-conn-refresh", true)
                                                    ipcRenderer
                                                        .invoke("connect-yaklang-engine", switchEngine)
                                                        .then(() => {
                                                            setTimeout(() => {
                                                                success(`Switch Core Engine Successful！`)
                                                                if (!isEnpriTraceAgent() && +i.port !== port) {
                                                                    emiter.emit("onSwitchEngine")
                                                                }
                                                                ipcRenderer.invoke("switch-conn-refresh", false)
                                                            }, 500)
                                                        })
                                                        .catch((e) => {
                                                            failed(e)
                                                        })
                                                }}
                                            >
                                                <YakitButton
                                                    type='outline1'
                                                    colors='success'
                                                    disabled={+i.port === 0 || (isLocal && +i.port === port)}
                                                >
                                                    Switch Engine
                                                </YakitButton>
                                            </Popconfirm>

                                            <Popconfirm
                                                title={
                                                    <>
                                                        Confirm close will force process termination,
                                                        <br />
                                                        If connecting again without closing Yakit for the current engine,
                                                        <br />
                                                        Then click on the loading page"Other Modes - Manually Start Engine"
                                                    </>
                                                }
                                                onConfirm={async () => {
                                                    if (+i.port === port) {
                                                        await delTemporaryProject()
                                                    }

                                                    ipcRenderer
                                                        .invoke("kill-yak-grpc", i.pid)
                                                        .then((val) => {
                                                            if (!val) {
                                                                isLocal && +i.port === port && typeCallback("break")
                                                                success("Engine Process Shutting Down...")
                                                            }
                                                        })
                                                        .catch((e: any) => {})
                                                        .finally(fetchPSList)
                                                }}
                                            >
                                                <YakitButton type='outline1' colors='danger'>
                                                    Close Engine
                                                </YakitButton>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={styles["engine-list-footer"]}>
                            <div></div>
                            <Popconfirm
                                title={
                                    <div style={{width: 330}}>
                                        Confirm close will force process termination,
                                        <br />
                                        If connecting again without closing Yakit for the current engine,
                                        <br />
                                        Then click on the loading page"Other Modes - Manually Start Engine"
                                    </div>
                                }
                                onConfirm={() => allClose()}
                            >
                                <div className={styles["engine-list-footer-btn"]}>Close All</div>
                            </Popconfirm>
                        </div>
                    </div>
                </div>
            }
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <GooglePhotosLogoSvgIcon className={classNames({[styles["icon-rotate-animation"]]: !show})} />
                </div>
            </div>
        </YakitPopover>
    )
})
