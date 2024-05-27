import React, {useEffect, useRef, useState} from "react"
import {Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useGetState, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "@/pages/invoker/schema"
import {yakitFailed} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {CloudDownloadIcon, SolidCloudDownloadIcon} from "@/assets/newIcon"
import {ScreenRecorderList} from "@/pages/screenRecorder/ScreenRecorderList"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import styles from "./ScreenRecorderPage.module.scss"
import screcorderEmpty from "./screcorderEmpty.png"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

export interface ScreenRecorderPageProp {}

const {ipcRenderer} = window.require("electron")

export const ScreenRecorderPage: React.FC<ScreenRecorderPageProp> = (props) => {
    const [available, setAvailable] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [loading, setLoading] = useState(false)
    const [installVisible, setInstallVisible] = useState<boolean>(false)

    const init = () => {
        setLoading(true)
        ipcRenderer
            .invoke("IsScrecorderReady", {})
            .then((data: {Ok: boolean; Reason: string}) => {
                setAvailable(data.Ok)
            })
            .catch((err) => {
                yakitFailed("IsScrecorderReady Failed:" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <YakitSpin spinning={loading}>
            {available ? (
                <ScreenRecorderList refreshTrigger={refreshTrigger} />
            ) : (
                <div className={styles["not-installed-empty"]}>
                    <YakitEmpty
                        image={<img src={screcorderEmpty} alt='' />}
                        imageStyle={{height: 200,margin: 'auto',marginBottom: 24}}
                        title={<div style={{fontSize: 14}}>Screen Recorder not installed</div>}
                        description='Click“Install Screen Recorder”，Screen Recorder successfully installed and ready to use'
                    />
                    <div className={styles["not-installed-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => {
                                setInstallVisible(true)
                            }}
                        >
                            Install Screen Recorder
                        </YakitButton>
                    </div>
                </div>
            )}
            <YakitHint
                visible={installVisible}
                title='Installing Screen Recorder...'
                heardIcon={<SolidCloudDownloadIcon style={{color: "var(--yakit-warning-5)"}} />}
                onCancel={() => {
                    setInstallVisible(false)
                }}
                okButtonProps={{style: {display: "none"}}}
                isDrag={true}
                mask={false}
            >
                <InstallFFmpeg
                    visible={installVisible}
                    onFinish={() => {
                        setInstallVisible(false)
                        init()
                    }}
                />
            </YakitHint>
        </YakitSpin>
    )
}

export interface InstallFFmpegProp {
    visible: boolean
    onFinish: () => void
}

export const InstallFFmpeg: React.FC<InstallFFmpegProp> = (props) => {
    const {onFinish, visible} = props
    const [token, setToken] = useState(randomString(40))
    const [results, setResults, getResult] = useGetState<string[]>([])
    const [percent, setPercent, getPercent] = useGetState<number>(0)

    const timer = useRef<number>(0) //Timeout Handling
    const prePercent = useRef<number>(0) // Last Progress Value

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            if (getPercent() === prePercent.current) {
                timer.current += 1
            } else {
                prePercent.current = getPercent()
                timer.current = 0
            }
            if (timer.current > 30) {
                yakitFailed(`[[InstallScreenRecorder] error: Connection timed out`)
                timer.current = 0
            }
            setPercent(Math.ceil(data.Progress))
            setResults([Uint8ArrayToString(data.Message), ...getResult()])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitFailed("Download Failed：" + error)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            onFinish()
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallScrecorder", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const install = useMemoizedFn(() => {
        ipcRenderer.invoke("InstallScrecorder", {}, token)
    })

    useEffect(() => {
        if (visible) {
            install()
        } else {
            ipcRenderer.invoke("cancel-InstallScrecorder", token)
        }
        setPercent(0)
        setResults([])
        timer.current = 0
        prePercent.current = 0
    }, [visible])

    return (
        <>
            <div className={styles["download-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `Downloaded ${percent}%`}
                />
            </div>
            <div className={styles["download-progress-messages"]}>
                {results.map((i) => {
                    return <p>{i}</p>
                })}
            </div>
        </>
    )
}
