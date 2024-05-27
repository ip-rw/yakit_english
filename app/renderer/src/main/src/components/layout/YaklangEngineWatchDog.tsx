import React, {useEffect, useRef, useState} from "react"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {isEngineConnectionAlive, outputToPrintLog, outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {EngineWatchDogCallbackType, YaklangEngineMode} from "@/yakitGVDefine"
import {EngineModeVerbose} from "@/components/basics/YakitLoading"
import {failed} from "@/utils/notification"
import {setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {useStore, yakitDynamicStatus} from "@/store"
import {remoteOperation} from "@/pages/dynamicControl/DynamicControl"
import {isEnpriTraceAgent} from "@/utils/envfile"
import emiter from "@/utils/eventBus/eventBus"

export interface YaklangEngineWatchDogCredential {
    Mode?: YaklangEngineMode
    Host: string
    Port: number

    /**
     * Advanced login authentication.
     * */
    IsTLS?: boolean
    PemBytes?: Uint8Array
    Password?: string
}

const {ipcRenderer} = window.require("electron")

export interface YaklangEngineWatchDogProps {
    credential: YaklangEngineWatchDogCredential
    keepalive: boolean
    engineLink: boolean

    onReady?: () => any
    onFailed?: (failedCount: number) => any
    onKeepaliveShouldChange?: (keepalive: boolean) => any

    failedCallback: (type: EngineWatchDogCallbackType) => any
}

export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo(
    (props: YaklangEngineWatchDogProps) => {
        // Auto-restart engine process?
        const [autoStartProgress, setAutoStartProgress] = useState(false)
        // Restarting engine process?
        const startingUp = useRef<boolean>(false)
        const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
        const {userInfo} = useStore()

        /** Engine info authentication. */
        const engineTest = useMemoizedFn((isDynamicControl?: boolean) => {
            outputToPrintLog(
                `engineTest-start:\nmode:${props.credential.Mode}|port:${props.credential.Port}|isDynamicControl:${isDynamicControl}`
            )
            // Reset state.
            setAutoStartProgress(false)
            const mode = props.credential.Mode
            if (!mode) {
                return
            }

            if (props.credential.Port <= 0) {
                outputToWelcomeConsole("Port set to null, cannot connect to engine.")
                return
            }

            /**
             * Be careful with authentication, try connecting once after getting accurate info, proceed only if connection successful.
             * Unable to connect without engine running, will start engine based on status.
             */
            outputToWelcomeConsole("Attempting to connect to Yaklang core engine.")
            ipcRenderer
                .invoke("connect-yaklang-engine", props.credential)
                .then(() => {
                    outputToPrintLog(`engineTest-success: mode:${props.credential.Mode}`)
                    outputToWelcomeConsole(`Connected to core engine successfully.！`)
                    if (props.onKeepaliveShouldChange) {
                        props.onKeepaliveShouldChange(true)
                    }
                    // If remote control, then change private domain to
                    if (isDynamicControl) {
                        // Remote control activated.
                        setDynamicStatus({...dynamicStatus, isDynamicStatus: true})
                        remoteOperation(true, dynamicStatus, userInfo)
                        if (dynamicStatus.baseUrl && dynamicStatus.baseUrl.length > 0) {
                            setRemoteValue(RemoteGV.HttpSetting, JSON.stringify({BaseUrl: dynamicStatus.baseUrl}))
                        }
                    }
                })
                .catch((e) => {
                    outputToPrintLog(`engineTest-failed: mode:${props.credential.Mode}`)
                    outputToWelcomeConsole("Not connected to engine, trying to start engine process.")
                    switch (mode) {
                        case "local":
                            outputToWelcomeConsole("Try to start local process.")
                            setAutoStartProgress(true)
                            return
                        case "remote":
                            outputToWelcomeConsole("Remote mode does not auto-start local engine.")
                            if (isDynamicControl) {
                                props.failedCallback("control-remote-connect-failed")
                            } else {
                                props.failedCallback("remote-connect-failed")
                            }
                            failed(`${e}`)
                            return
                    }
                })
                .finally(() => {
                    outputToWelcomeConsole("Engine connection complete.")
                })
        })

        /** Accepts engine connection commands. */
        useEffect(() => {
            emiter.on("startAndCreateEngineProcess", (v?: boolean) => {
                engineTest(!!v)
            })
            return () => {
                emiter.off("startAndCreateEngineProcess")
            }
        }, [])

        // This hook.
        useDebounceEffect(
            () => {
                const mode = props.credential.Mode
                if (!mode) {
                    return
                }

                if (mode === "remote") {
                    return
                }

                if (props.credential.Port <= 0) {
                    return
                }

                if (!autoStartProgress) {
                    // Exit if process not started.
                    return
                }

                outputToPrintLog(`Attempting to start new engine process: port.:${props.credential.Port}`)

                // Only normal mode involves engine start process.
                outputToWelcomeConsole(`Starting local engine process with normal rights, local port is: ${props.credential.Port}`)

                setTimeout(() => {
                    if (props.onKeepaliveShouldChange) {
                        props.onKeepaliveShouldChange(true)
                    }
                }, 600)

                ipcRenderer
                    .invoke("is-port-available", props.credential.Port)
                    .then(() => {
                        if (startingUp.current) {
                            return
                        }
                        startingUp.current = true
                        ipcRenderer
                            .invoke("start-local-yaklang-engine", {
                                port: props.credential.Port,
                                isEnpriTraceAgent: isEnpriTraceAgent()
                            })
                            .then(() => {
                                outputToWelcomeConsole("Engine started successfully.！")
                                outputToPrintLog(`Local new engine process started successfully.`)
                            })
                            .catch((e) => {
                                console.info(e)
                                outputToWelcomeConsole("Engine start failed.:" + e)
                                outputToPrintLog(`Local new engine process failed to start.: ${e}`)
                            })
                            .finally(() => {
                                startingUp.current = false
                            })
                    })
                    .catch((e) => {
                        outputToWelcomeConsole(
                            `Port in use, cannot start local engine.（${EngineModeVerbose(mode as YaklangEngineMode)}）`
                        )
                        outputToWelcomeConsole(`Reason for error.: ${e}`)
                        outputToPrintLog(`Port in use.: ${e}`)
                    })
            },
            [autoStartProgress, props.onKeepaliveShouldChange, props.credential],
            {leading: false, wait: 1000}
        )

        useEffect(() => {
            if (!props.engineLink) setAutoStartProgress(false)
        }, [props.engineLink])

        /** Before connecting to the engine, try connecting every 1 second. After connecting, try every 5 seconds. */
        const attemptConnectTime = useMemoizedFn(() => {
            return props.engineLink ? 5000 : 1000
        })

        /**
         * Engine connection attempt logic.
         * Engine valid connection attempts: 1-20.
         */
        useEffect(() => {
            const keepalive = props.keepalive
            if (!keepalive) {
                if (props.onFailed) {
                    props.onFailed(100)
                }
                return
            }
            outputToPrintLog(`Checking if engine process started.`)

            let count = 0
            let failedCount = 0
            let notified = false
            const connect = () => {
                count++
                isEngineConnectionAlive()
                    .then(() => {
                        outputToPrintLog(`Keepalive state.: ${keepalive}`)
                        if (!keepalive) {
                            return
                        }
                        if (!notified) {
                            outputToWelcomeConsole("Engine ready for connection.")
                            notified = true
                        }
                        failedCount = 0
                        if (props.onReady) {
                            props.onReady()
                        }
                    })
                    .catch((e) => {
                        failedCount++
                        if (failedCount > 0 && failedCount <= 20) {
                            outputToWelcomeConsole(`Engine not fully started, cannot connect, failed attempts.：${failedCount}`)
                        }

                        if (props.onFailed) {
                            props.onFailed(failedCount)
                        }
                    })
            }
            connect()
            const id = setInterval(connect, attemptConnectTime())
            return () => {
                clearInterval(id)
            }
        }, [props.keepalive, props.onReady, props.onFailed])
        return <></>
    }
)
