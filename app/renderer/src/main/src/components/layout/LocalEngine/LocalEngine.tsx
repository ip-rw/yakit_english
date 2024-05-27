import React, {forwardRef, memo, useImperativeHandle, useMemo, useRef, useState} from "react"
import {LocalEngineProps} from "./LocalEngineType"
import {LocalGVS} from "@/enums/localGlobal"
import {getLocalValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {getRandomLocalEnginePort} from "../WelcomeConsoleUtil"
import {isCommunityEdition} from "@/utils/envfile"
import {failed, info} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {UpdateYakitAndYaklang} from "../update/UpdateYakitAndYaklang"

const {ipcRenderer} = window.require("electron")

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {system, setLog, onLinkEngine, setYakitStatus} = props

        const [localPort, setLocalPort] = useState<number>(0)

        const [currentYakit, setCurrentYakit] = useState<string>("")
        const [latestYakit, setLatestYakit] = useState<string>("")
        const [currentYaklang, setCurrentYaklang] = useState<string>("")
        const [latestYaklang, setLatestYaklang] = useState<string>("")

        /**
         * Only at software startup|Engine logic from nonexistent to existent
         * Check local DB permissions
         */
        const handleCheckDataBase = useMemoizedFn(() => {
            const firstHint = "Start checking DB permissions"
            setLog([firstHint])
            let isError: boolean = false
            ipcRenderer
                .invoke("check-local-database")
                .then((e) => {
                    isError = e === "not allow to write" && system !== "Windows_NT"
                    if (isError) {
                        setLog([firstHint, "Adjusting DB permissions error, non-WIN check)"])
                        setDatabaseErrorVisible(true)
                    } else {
                        setLog([firstHint, "DB permissions OK"])
                        handleLinkEnginePort()
                    }
                })
                .catch((e) => {
                    setLog([firstHint, `Check failed: ${e}`])
                    handleLinkEnginePort()
                })
        })

        /** Get last local engine port cache */
        const handleLinkEnginePort = useMemoizedFn(() => {
            getLocalValue(LocalGVS.YaklangEnginePort)
                .then((portRaw) => {
                    const port = parseInt(portRaw)
                    if (!port) {
                        getRandomLocalEnginePort((p) => {
                            onFetchLocalAndLatsVersion()
                            setLocalPort(p)
                        })
                    } else {
                        onFetchLocalAndLatsVersion()
                        setLocalPort(port)
                    }
                })
                .catch(() => {
                    getRandomLocalEnginePort((p) => {
                        onFetchLocalAndLatsVersion()
                        setLocalPort(p)
                    })
                })
        })

        const onFetchLocalAndLatsVersion = useMemoizedFn(() => {
            setTimeout(() => {
                handleFetchYakitAndYaklangLocalVersion(handleFetchYakitAndYaklangLatestVersion)
            }, 500)
        })

        /** Block update popups? */
        const preventUpdateHint = useRef<boolean>(false)
        /** Update dialog popped? */
        const isShowedUpdateHint = useRef<boolean>(false)

        const handleFetchYakitAndYaklangLocalVersion = useMemoizedFn(async (callback?: () => any) => {
            try {
                let localYakit = (await ipcRenderer.invoke("fetch-yakit-version")) || ""
                setCurrentYakit(localYakit)
            } catch (error) {}

            try {
                setLog(["Get engine version..."])
                let localYaklang = (await ipcRenderer.invoke("get-current-yak")) || ""
                setLog(["Get engine version...", `Engine version——${localYaklang}`, "Preparing for local connection"])
                setCurrentYaklang(localYaklang)
                setTimeout(() => {
                    if (isShowedUpdateHint.current) return
                    preventUpdateHint.current = true
                    // 2s to detect update dialog
                    handleLinkLocalEnging()
                }, 2000)
            } catch (error) {
                setLog(["Get engine version...", `Error: ${error}`])
                setYakitStatus("checkError")
            }

            if (callback) callback()
        })

        const handleFetchYakitAndYaklangLatestVersion = useMemoizedFn(() => {
            if (!isCommunityEdition()) {
                // No update checks for non-CE
                preventUpdateHint.current = true
                return
            }
            getLocalValue(LocalGVS.NoAutobootLatestVersionCheck).then((val: boolean) => {
                if (val) preventUpdateHint.current = true

                if (!val) {
                    ipcRenderer
                        .invoke("fetch-latest-yakit-version")
                        .then((data: string) => {
                            if (preventUpdateHint.current) return
                            setLatestYakit(data || "")
                        })
                        .catch((err) => {})
                    ipcRenderer
                        .invoke("fetch-latest-yaklang-version")
                        .then((data: string) => {
                            if (preventUpdateHint.current) return
                            setLatestYaklang(data.startsWith('v') ? data.slice(1) : data)
                        })
                        .catch((err) => {})
                }
            })
        })

        // Init local conn pre-check
        const initLink = useMemoizedFn(() => {
            isShowedUpdateHint.current = false
            preventUpdateHint.current = isCommunityEdition() ? false : true
            handleCheckDataBase()
        })
        // Direct connect after version check
        const toLink = useMemoizedFn(() => {
            isShowedUpdateHint.current = false
            preventUpdateHint.current = true
            handleFetchYakitAndYaklangLocalVersion()
        })

        useImperativeHandle(
            ref,
            () => ({
                init: initLink,
                link: toLink
            }),
            []
        )

        // Start local engine connection
        const handleLinkLocalEnging = useMemoizedFn(() => {
            // Begin local engine connection
            onLinkEngine(localPort)
            // No more update checks after local conn
            setLatestYakit("")
            setLatestYaklang("")
        })

        /** ---------- Autostart Update Check Dialog Start ---------- */
        const isShowUpdate = useMemo(() => {
            if (!isCommunityEdition()) return false

            if (!!currentYakit && !!latestYakit && `v${currentYakit}` !== latestYakit) {
                isShowedUpdateHint.current = true
                return true
            }
            if (!!currentYaklang && !!latestYaklang && currentYaklang !== latestYaklang) {
                isShowedUpdateHint.current = true
                return true
            }

            return false
        }, [currentYakit, latestYakit, currentYaklang, latestYaklang])

        const onCancelUpdateHint = useMemoizedFn(() => {
            preventUpdateHint.current = true
            handleLinkLocalEnging()
        })
        /** ---------- Autostart Update Check Dialog End ---------- */

        /** ---------- DB Permissions Logic Start ---------- */
        const [databaseErrorVisible, setDatabaseErrorVisible] = useState<boolean>(false)
        const [databaseErrorLoading, setDatabaseErrorLoading] = useState<boolean>(false)
        const onFixDatabaseError = useMemoizedFn(() => {
            setDatabaseErrorLoading(true)
            ipcRenderer
                .invoke("fix-local-database")
                .then((e) => {
                    info("Repair successful")
                })
                .catch((e) => {
                    failed(`Fix DB permissions error：${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setDatabaseErrorVisible(false)
                        setDatabaseErrorLoading(false)
                        handleLinkEnginePort()
                    }, 300)
                })
        })
        /** ---------- DB Permissions Logic End ---------- */

        return (
            <>
                {isCommunityEdition() && (
                    <UpdateYakitAndYaklang
                        currentYakit={currentYakit}
                        latestYakit={latestYakit}
                        setLatestYakit={setLatestYakit}
                        currentYaklang={currentYaklang}
                        latestYaklang={latestYaklang}
                        setLatestYaklang={setLatestYaklang}
                        isShow={isShowUpdate}
                        onCancel={onCancelUpdateHint}
                    />
                )}
                {databaseErrorVisible && (
                    <YakitHint
                        getContainer={document.getElementById("yakit-uilayout-body") || undefined}
                        mask={false}
                        isDrag={true}
                        visible={databaseErrorVisible}
                        title='yaklang DB error'
                        content='Attempt to fix DB write perms (may need ROOT)）'
                        okButtonText='Fix now'
                        okButtonProps={{loading: databaseErrorLoading}}
                        cancelButtonProps={{style: {display: "none"}}}
                        onOk={onFixDatabaseError}
                    />
                )}
            </>
        )
    })
)
