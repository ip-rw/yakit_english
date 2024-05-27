import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {YaklangInstallHintSvgIcon} from "../icons"
import {Progress} from "antd"
import {DownloadingState} from "@/yakitGVDefine"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setLocalValue} from "@/utils/kv"
import {failed, success} from "@/utils/notification"
import {getReleaseEditionName, isEnterpriseEdition} from "@/utils/envfile"
import {FetchUpdateContentProp, UpdateContentProp} from "../FuncDomain"
import {NetWorkApi} from "@/services/fetch"
import {LocalGVS} from "@/enums/localGlobal"
import {safeFormatDownloadProcessState} from "../utils"

import classNames from "classnames"
import styles from "./UpdateYakitAndYaklang.module.scss"

const {ipcRenderer} = window.require("electron")

export interface UpdateYakitAndYaklangProps {
    currentYakit: string
    latestYakit: string
    setLatestYakit: (val: string) => any
    currentYaklang: string
    latestYaklang: string
    setLatestYaklang: (val: string) => any
    isShow: boolean
    onCancel: () => any
}

export const UpdateYakitAndYaklang: React.FC<UpdateYakitAndYaklangProps> = React.memo((props) => {
    const {
        currentYakit,
        latestYakit,
        setLatestYakit,
        currentYaklang,
        latestYaklang,
        setLatestYaklang,
        isShow,
        onCancel
    } = props

    const [yakitProgress, setYakitProgress, getYakitProgress] = useGetState<DownloadingState>()
    const isYakitBreak = useRef<boolean>(false)
    const [yaklangProgress, setYaklangProgress, getYaklangProgress] = useGetState<DownloadingState>()
    const isYaklangBreak = useRef<boolean>(false)

    const [installYakit, setInstallYakit] = useState<boolean>(false)
    const [installedYakit, setInstalledYakit] = useState<boolean>(false)
    const [yakitLoading, setYakitLoading] = useState<boolean>(false)
    const [installYaklang, setInstallYaklang] = useState<boolean>(false)
    const [yaklangLoading, setYaklangLoading] = useState<boolean>(false)

    const [yakitUpdateContent, setYakitUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })
    const [yaklangUpdateContent, setYaklangUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })

    const removePrefixV = (version: string) => {
        return version.startsWith('v') ? version.slice(1) : version
    }

    const yakitContent: string[] = useMemo(() => {
        if (!yakitUpdateContent.content) return []
        if (removePrefixV(yakitUpdateContent.version) !== removePrefixV(latestYakit)) return []
        if (yakitUpdateContent.content) {
            return yakitUpdateContent.content.split("\n")
        }
        return []
    }, [yakitUpdateContent])
    const yaklangContent: string[] = useMemo(() => {
        if (!yaklangUpdateContent.content) return []
        if (removePrefixV(yaklangUpdateContent.version) !== removePrefixV(latestYaklang)) return []
        if (yaklangUpdateContent.content) {
            return yaklangUpdateContent.content.split("\n")
        }
        return []
    }, [yaklangUpdateContent])

    /** Fetch yakit Updates */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        if (yakitUpdateContent.version) return

        NetWorkApi<FetchUpdateContentProp, any>({
            diyHome: "https://www.yaklang.com",
            method: "get",
            url: "yak/versions",
            params: {type: "yakit", source: isEnterpriseEdition() ? "company" : "community"}
        })
            .then((res: any) => {
                if (!res) return
                try {
                    const data: UpdateContentProp = JSON.parse(res)
                    if (removePrefixV(data.version) !== removePrefixV(latestYakit)) return
                    setYakitUpdateContent({...data})
                } catch (error) {}
            })
            .catch((err) => {})
    })
    /** Fetch yaklang Updates */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        if (yaklangUpdateContent.version) return

        NetWorkApi<FetchUpdateContentProp, any>({
            diyHome: "https://www.yaklang.com",
            method: "get",
            url: "yak/versions",
            params: {type: "yaklang", source: "community"}
        })
            .then((res: any) => {
                if (!res) return
                try {
                    const data: UpdateContentProp = JSON.parse(res)
                    if (removePrefixV(data.version) !== removePrefixV(latestYaklang)) return
                    setYaklangUpdateContent({...data})
                } catch (error) {}
            })
            .catch((err) => {})
    })

    useEffect(() => {
        if (latestYakit) fetchYakitLastVersion()
    }, [latestYakit])
    useEffect(() => {
        if (latestYaklang) fetchYaklangLastVersion()
    }, [latestYaklang])

    useEffect(() => {
        ipcRenderer.on("download-yakit-engine-progress", (e: any, state: DownloadingState) => {
            if (isYakitBreak.current) return
            setYakitProgress(safeFormatDownloadProcessState(state))
        })

        ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
            if (isYaklangBreak.current) return
            setYaklangProgress(safeFormatDownloadProcessState(state))
        })

        return () => {
            ipcRenderer.removeAllListeners("download-yakit-engine-progress")
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])

    const isShowYakit = useMemo(() => {
        if (!isShow) return false
        if (!currentYakit || !latestYakit) return false
        if (removePrefixV(currentYakit) !== removePrefixV(latestYakit)) return true
        return false
    }, [currentYakit, latestYakit, isShow])
    const isShowYaklang = useMemo(() => {
        if (!isShow) return false
        if (!currentYaklang || !latestYaklang) return false
        if (removePrefixV(currentYaklang) !== removePrefixV(latestYaklang)) return true
        return false
    }, [currentYaklang, latestYaklang, isShow])

    /** Do Not Remind Again */
    const noHint = () => {
        setLocalValue(LocalGVS.NoAutobootLatestVersionCheck, true)
        setLatestYakit("")
        setLatestYaklang("")
        onCancel()
    }

    const yakitLater = useMemoizedFn(() => {
        setLatestYakit("")
        if (!isShowYaklang) onCancel()
    })
    const yaklangLater = useMemoizedFn(() => {
        setLatestYaklang("")
        onCancel()
    })

    const yakitDownload = () => {
        let version = latestYakit
        if (version.startsWith("v")) version = version.slice(1)
        isYakitBreak.current = false
        setInstallYakit(true)
        ipcRenderer
            .invoke("download-latest-yakit", version, isEnterpriseEdition())
            .then(() => {
                if (isYakitBreak.current) return
                success("Download Complete")
                if (!getYakitProgress()?.size) return
                setYakitProgress({
                    time: {
                        elapsed: getYakitProgress()?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getYakitProgress().size
                })
                setInstallYakit(false)
                setInstalledYakit(true)
            })
            .catch((e: any) => {
                if (isYakitBreak.current) return
                failed(`Download Failed: ${e}`)
                setYakitProgress(undefined)
                setInstallYakit(false)
            })
    }
    const yakitBreak = useMemoizedFn(() => {
        setYakitLoading(true)
        isYakitBreak.current = true
        setInstallYakit(false)
        setYakitProgress(undefined)
        yakitLater()
        setTimeout(() => {
            setYakitLoading(false)
        }, 300)
    })
    const yakitUpdate = useMemoizedFn(() => {
        ipcRenderer.invoke("open-yakit-path")
        setTimeout(() => {
            ipcRenderer.invoke("UIOperate", "close")
        }, 100)
    })

    const yaklangDownload = useMemoizedFn(() => {
        isYaklangBreak.current = false
        setInstallYaklang(true)
        let version = latestYaklang
        if (version.startsWith("v")) version = version.slice(1)
        ipcRenderer
            .invoke("download-latest-yak", version)
            .then(() => {
                if (isYaklangBreak.current) return

                success("Download Complete")
                if (!getYaklangProgress()?.size) return
                setYaklangProgress({
                    time: {
                        elapsed: getYaklangProgress()?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getYaklangProgress().size
                })
                // Clear Main Process yaklang Version Cache
                ipcRenderer.invoke("clear-local-yaklang-version-cache")
                yaklangUpdate()
            })
            .catch((e: any) => {
                if (isYaklangBreak.current) return
                failed(`Engine Download Failed: ${e}`)
                setInstallYaklang(false)
                setYaklangProgress(undefined)
            })
    })
    const yaklangBreak = useMemoizedFn(() => {
        setYaklangLoading(true)
        isYaklangBreak.current = true
        setInstallYaklang(false)
        setYaklangProgress(undefined)
        yaklangLater()
        setTimeout(() => {
            setYaklangLoading(false)
        }, 300)
    })
    const yaklangUpdate = useMemoizedFn(() => {
        let version = latestYaklang
        if (version.startsWith("v")) version = version.slice(1)
        ipcRenderer
            .invoke("install-yak-engine", version)
            .then(() => {
                success(`Installation Successful, Restart if Not Effective ${getReleaseEditionName()} Immediately`)
            })
            .catch((err: any) => {
                failed(
                    `Installation Failed: ${
                        err.message.indexOf("operation not permitted") > -1 ? "Close Engine and Restart Software to Try" : err
                    }`
                )
            })
            .finally(() => {
                setTimeout(() => {
                    yaklangLater()
                }, 50);
            })
    })

    return (
        <div className={isShow ? styles["update-mask"] : styles["hidden-update-mask"]}>
            <div
                className={classNames(
                    styles["yaklang-update-modal"],
                    isShowYakit ? styles["engine-hint-modal-wrapper"] : styles["modal-hidden-wrapper"]
                )}
            >
                <div className={styles["modal-yaklang-engine-hint"]}>
                    <div className={styles["yaklang-engine-hint-wrapper"]}>
                        <div className={styles["hint-left-wrapper"]}>
                            <div className={styles["hint-icon"]}>
                                <YaklangInstallHintSvgIcon />
                            </div>
                        </div>

                        <div className={styles["hint-right-wrapper"]}>
                            {installedYakit ? (
                                <>
                                    <div className={styles["hint-right-title"]}>{getReleaseEditionName()} Download Succeeded</div>
                                    <div className={styles["hint-right-content"]}>
                                        Close Software for Installation, Double-Click Installer to Complete. Install Now?？
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div></div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yakitLater}>
                                                Cancel
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yakitUpdate}>
                                                OK
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            ) : installYakit ? (
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>Yakit Downloading...</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((yakitProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>Remaining Time : {(yakitProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>Duration : {(yakitProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>
                                            Download Speed : {((yakitProgress?.speed || 0) / 1000000).toFixed(2)}
                                            M/s
                                        </div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        <YakitButton
                                            loading={yakitLoading}
                                            size='max'
                                            type='outline2'
                                            onClick={yakitBreak}
                                        >
                                            Cancel
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["hint-right-title"]}>
                                        Detected {getReleaseEditionName()} Version Upgrade
                                    </div>
                                    <div className={styles["hint-right-content"]}>
                                        {`${getReleaseEditionName()} ${latestYakit} Update Notes :`}
                                    </div>
                                    <div className={styles["hint-right-update-content"]}>
                                        {yakitContent.length === 0
                                            ? "Admin Update Notifications Unedited"
                                            : yakitContent.map((item, index) => {
                                                  return <div key={`${item}-${index}`}>{item}</div>
                                              })}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div>
                                            <YakitButton size='max' type='outline2' onClick={noHint}>
                                                Do Not Remind Again
                                            </YakitButton>
                                        </div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yakitLater}>
                                                Later
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yakitDownload}>
                                                Update Now
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={classNames(
                    styles["yaklang-update-modal"],
                    isShowYaklang && !isShowYakit ? styles["engine-hint-modal-wrapper"] : styles["modal-hidden-wrapper"]
                )}
            >
                <div className={styles["modal-yaklang-engine-hint"]}>
                    <div className={styles["yaklang-engine-hint-wrapper"]}>
                        <div className={styles["hint-left-wrapper"]}>
                            <div className={styles["hint-icon"]}>
                                <YaklangInstallHintSvgIcon />
                            </div>
                        </div>

                        <div className={styles["hint-right-wrapper"]}>
                            {installYaklang ? (
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>Engine Downloading...</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((yaklangProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>Remaining Time : {(yaklangProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>Duration : {(yaklangProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>
                                            Download Speed : {((yaklangProgress?.speed || 0) / 1000000).toFixed(2)}
                                            M/s
                                        </div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        <YakitButton
                                            loading={yaklangLoading}
                                            size='max'
                                            type='outline2'
                                            onClick={yaklangBreak}
                                        >
                                            Cancel
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["hint-right-title"]}>Engine Version Upgrade Detected</div>
                                    <div className={styles["hint-right-content"]}>
                                        {/* {`Current Version：${currentYaklang}`}
                                        <br />
                                        {`Latest Version：${latestYaklang}`} */}
                                        {`Yaklang ${latestYaklang} Update Notes :`}
                                    </div>
                                    <div className={styles["hint-right-update-content"]}>
                                        {yaklangContent.length === 0
                                            ? "Admin Update Notifications Unedited"
                                            : yaklangContent.map((item, index) => {
                                                  return <div key={`${item}-${index}`}>{item}</div>
                                              })}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div>
                                            <YakitButton size='max' type='outline2' onClick={noHint}>
                                                Do Not Remind Again
                                            </YakitButton>
                                        </div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yaklangLater}>
                                                Later
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yaklangDownload}>
                                                Update Now
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
