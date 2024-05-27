import React, {useState} from "react"
import {failed, info, warn} from "@/utils/notification"
import {useGetState, useMemoizedFn} from "ahooks"
import {yakProcess} from "./PerformanceDisplay"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {OutlineLoadingIcon} from "@/assets/icon/outline"

import styles from "./AllKillEngineConfirm.module.scss"

const {ipcRenderer} = window.require("electron")

export interface AllKillEngineConfirmProps {
    title?: string
    content?: string
    visible: boolean
    setVisible: (flag: boolean) => any
    onSuccess: () => any
}
/** Update Engine - Confirm Again and Kill */
export const AllKillEngineConfirm: React.FC<AllKillEngineConfirmProps> = React.memo((props) => {
    const {
        title = "Update Engine, Close All Local Processes",
        content = "关闭所有引擎和活动的本地程序，页面将加载。",
        visible,
        setVisible,
        onSuccess
    } = props

    const [loading, setLoading, getLoading] = useGetState<boolean>(false)

    const [currentPort, setCurrentPort] = useState<number>(0)
    const [process, setProcess] = useState<yakProcess[]>([])

    const onLoadingToFalse = useMemoizedFn(() => {
        setTimeout(() => {
            setLoading(false)
        }, 300)
    })

    const fetchProcess = useMemoizedFn((callback: () => any) => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                if (!visible) return
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                if (+hosts[1]) setCurrentPort(+hosts[1] || 0)
            })
            .catch((e) => {
                failed(`Get Engine Port Error ${e}`)
            })
            .finally(() => {
                ipcRenderer
                    .invoke("ps-yak-grpc")
                    .then((i: yakProcess[]) => {
                        if (!visible) return
                        setProcess(
                            i.map((element: yakProcess) => {
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
                        setTimeout(() => {
                            callback()
                        }, 300)
                    })
            })
    })

    const onExecute = useMemoizedFn(async () => {
        if (process.length === 0) {
            warn("No Engine Process Detected")
            onLoadingToFalse()
            return
        }

        const currentPS = process.find((item) => +item.port === currentPort)
        const otherPS = process.filter((item) => +item.port !== currentPort)
        /** Close Normal Indicator */
        let killFlag: string = ""

        if (otherPS.length > 0) {
            for (let i of otherPS) {
                try {
                    killFlag = await ipcRenderer.invoke("kill-yak-grpc", i.pid)
                } catch (error) {}
                if (!!killFlag) {
                    failed(`Engine Process (pid:${i.pid},port:${i.port})Close Failed ${killFlag}`)
                    onLoadingToFalse()
                    return
                } else {
                    info(`KILL yak PROCESS: ${i.pid}`)
                }
            }
        }
        if (currentPS) {
            let killFlag: string = ""
            try {
                killFlag = await ipcRenderer.invoke("kill-yak-grpc", currentPS.pid)
            } catch (error) {}
            if (!!killFlag) {
                failed(`Engine Process (pid:${currentPS.pid},port:${currentPS.port})Close Failed ${killFlag}`)
                onLoadingToFalse()
                return
            }
            info(`KILL yak PROCESS: ${currentPS.pid}`)
        }

        onSuccess()
    })

    const onCancel = useMemoizedFn(() => {
        setCurrentPort(0)
        setProcess([])
        setVisible(false)
    })

    const {delTemporaryProject} = useTemporaryProjectStore()

    const onOK = useMemoizedFn(async () => {
        // Delete Temp Project
        await delTemporaryProject()
        fetchProcess(() => {
            onExecute()
        })
    })

    return (
        <YakitHint
            visible={visible}
            heardIcon={loading ? <OutlineLoadingIcon className={styles["icon-rotate-animation"]} /> : undefined}
            title={loading ? "Closing Process, Please Wait ..." : title}
            content={content}
            okButtonText='Close Now'
            okButtonProps={{loading: loading}}
            onOk={onOK}
            cancelButtonText='Later'
            cancelButtonProps={{loading: loading}}
            onCancel={onCancel}
        />
    )
})
