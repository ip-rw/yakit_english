import {useRef, useEffect, useState, Suspense, lazy} from "react"
// by types
import {failed, warn, yakitFailed} from "./utils/notification"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "./utils/kv"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "./services/fetch"
import {API} from "./services/swagger/resposeType"
import {useStore, yakitDynamicStatus} from "./store"
import {aboutLoginUpload, loginHTTPFlowsToOnline, refreshToken} from "./utils/login"
import UILayout from "./components/layout/UILayout"
import {isCommunityEdition, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {RemoteGV} from "./yakitGV"
import {YakitModal} from "./components/yakitUI/YakitModal/YakitModal"
import styles from "./app.module.scss"
import {NowProjectDescription, coordinate} from "./pages/globalVariable"
import {remoteOperation} from "./pages/dynamicControl/DynamicControl"
import {useTemporaryProjectStore} from "./store/temporaryProject"
import {useRunNodeStore} from "./store/runNode"
import {LocalGVS} from "./enums/localGlobal"

/** Partial Page Lazy Load */
const Main = lazy(() => import("./pages/MainOperator"))
const {ipcRenderer} = window.require("electron")

/** Shortcut Directory */
const InterceptKeyword = ["KeyR", "KeyW"]

interface OnlineProfileProps {
    BaseUrl: string
    Password?: string
    IsCompany?: boolean
}

function NewApp() {
    /** Display User Agreement */
    const [agreed, setAgreed] = useState(false)
    const {userInfo} = useStore()

    useEffect(() => {
        // Unzip Command Engine Script
        ipcRenderer.invoke("generate-start-engine")
    }, [])

    /**
     * Render Global Error Listening & Collect Errors
     */
    useEffect(() => {
        const unhandledrejectionError = (e) => {
            const content = e?.reason?.stack || ""
            if (content) ipcRenderer.invoke("render-error-log", content)
        }
        const errorLog = (err) => {
            const content = err?.error?.stack || ""
            if (content) ipcRenderer.invoke("render-error-log", content)
        }
        ipcRenderer.invoke("is-dev").then((flag: boolean) => {
            if (!flag) {
                window.addEventListener("unhandledrejection", unhandledrejectionError)
                window.addEventListener("error", errorLog)
            }
        })
        return () => {
            window.removeEventListener("unhandledrejection", unhandledrejectionError)
            window.removeEventListener("error", errorLog)
        }
    }, [])

    // Global Mouse Position Tracking)
    const handleMouseMove = useDebounceFn(
        useMemoizedFn((e: MouseEvent) => {
            const {screenX, screenY, clientX, clientY, pageX, pageY} = e

            coordinate.screenX = screenX
            coordinate.screenY = screenY
            coordinate.clientX = clientX
            coordinate.clientY = clientY
            coordinate.pageX = pageX
            coordinate.pageY = pageY
        }),
        {wait: 50}
    ).run
    useEffect(() => {
        document.addEventListener("mousemove", handleMouseMove)
        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
        }
    }, [])

    // Disable Browser Spell Check on change for input & textarea
    useEffect(() => {
        const handleInputEvent = (event) => {
            const {target} = event
            const isInput = target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
            if (isInput) {
                const spellCheck = target.getAttribute("spellCheck")
                if (spellCheck || spellCheck === null) {
                    target.setAttribute("spellCheck", "false")
                }
            }
        }
        document.addEventListener("change", handleInputEvent)
        return () => {
            document.removeEventListener("change", handleInputEvent)
        }
    }, [])

    /** Display User Agreement */
    useEffect(() => {
        getLocalValue(LocalGVS.UserProtocolAgreed)
            .then((value: any) => {
                setAgreed(!!value)
            })
            .catch(() => {})
    }, [])

    // Global Login Status Listener
    const setStoreUserInfo = useStore((state) => state.setStoreUserInfo)

    /** Yaklang Engine Config Post-Connection */
    const linkSuccess = () => {
        testYak()
    }

    const testYak = () => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (!setting) {
                ipcRenderer
                    .invoke("GetOnlineProfile", {})
                    .then((data: OnlineProfileProps) => {
                        ipcRenderer.sendSync("sync-edit-baseUrl", {baseUrl: data.BaseUrl}) // Sync
                        setRemoteValue(RemoteGV.HttpSetting, JSON.stringify({BaseUrl: data.BaseUrl}))
                        refreshLogin()
                    })
                    .catch((e) => {
                        failed(`Fetch Failed:${e}`)
                    })
            } else {
                const values = JSON.parse(setting)
                ipcRenderer
                    .invoke("SetOnlineProfile", {
                        ...values,
                        IsCompany: true
                    } as OnlineProfileProps)
                    .then(() => {
                        ipcRenderer.sendSync("sync-edit-baseUrl", {baseUrl: values.BaseUrl}) // Sync
                        setRemoteValue(RemoteGV.HttpSetting, JSON.stringify(values))
                        refreshLogin()
                    })
                    .catch((e: any) => failed("Set Private Domain Failed:" + e))
            }
        })
    }

    const refreshLogin = useMemoizedFn(() => {
        // Get Engine Token (Enterprise/Community))
        const TokenSource = isCommunityEdition() ? RemoteGV.TokenOnline : RemoteGV.TokenOnlineEnterprise
        // Enterprise Version Skips Auto-Login
        if (!isCommunityEdition()) return
        getRemoteValue(TokenSource)
            .then((resToken) => {
                if (!resToken) {
                    return
                }
                // Get User Info by Token
                NetWorkApi<API.UserInfoByToken, API.UserData>({
                    method: "post",
                    url: "auth/user",
                    data: {
                        token: resToken
                    }
                })
                    .then((res) => {
                        setRemoteValue(TokenSource, resToken)
                        const user = {
                            isLogin: true,
                            platform: res.from_platform,
                            githubName: res.from_platform === "github" ? res.name : null,
                            githubHeadImg: res.from_platform === "github" ? res.head_img : null,
                            wechatName: res.from_platform === "wechat" ? res.name : null,
                            wechatHeadImg: res.from_platform === "wechat" ? res.head_img : null,
                            qqName: res.from_platform === "qq" ? res.name : null,
                            qqHeadImg: res.from_platform === "qq" ? res.head_img : null,
                            companyName: res.from_platform === "company" ? res.name : null,
                            companyHeadImg: res.from_platform === "company" ? res.head_img : null,
                            role: res.role,
                            user_id: res.user_id,
                            token: resToken,
                            checkPlugin: res?.checkPlugin || false
                        }
                        ipcRenderer.sendSync("sync-update-user", user)
                        setStoreUserInfo(user)
                        refreshToken(user)
                    })
                    .catch((e) => setRemoteValue(TokenSource, ""))
            })
            .catch(() => setRemoteValue(TokenSource, ""))
    })

    /**
     * Intercept Global Shortcuts [(win:ctrl|mac:command) + 26 Letters]
     * Control via InterceptKeyword
     */
    const handlekey = useMemoizedFn((ev: KeyboardEvent) => {
        let code = ev.code
        // Block Current Event
        if ((ev.metaKey || ev.ctrlKey) && InterceptKeyword.includes(code)) {
            ev.stopPropagation()
            ev.preventDefault()
            return false
        }
        return
    })
    useEffect(() => {
        document.addEventListener("keydown", handlekey)
        return () => {
            document.removeEventListener("keydown", handlekey)
        }
    }, [])

    const {temporaryProjectId, delTemporaryProject} = useTemporaryProjectStore()
    const temporaryProjectIdRef = useRef<string>("")
    useEffect(() => {
        temporaryProjectIdRef.current = temporaryProjectId
    }, [temporaryProjectId])

    const {runNodeList, clearRunNodeList} = useRunNodeStore()
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

    // Ensure Render Process Tasks Complete on Exit
    const {dynamicStatus} = yakitDynamicStatus()
    useEffect(() => {
        ipcRenderer.on("close-windows-renderer", async (e, res: any) => {
            // Hide showMessageBox if Other Popups Exist
            const showCloseMessageBox = !(Array.from(runNodeList).length || temporaryProjectIdRef.current)
            // API Calls in allSettled Before Closing
            try {
                await Promise.allSettled([handleKillAllRunNode(), delTemporaryProject()])
            } catch (error) {}
            // Notify App Exit
            if (dynamicStatus.isDynamicStatus) {
                warn("Remote Control Off...")
                await remoteOperation(false, dynamicStatus)
                ipcRenderer.invoke("app-exit", {showCloseMessageBox})
            } else {
                ipcRenderer.invoke("app-exit", {showCloseMessageBox})
            }
        })
        ipcRenderer.on("minimize-windows-renderer", async (e, res: any) => {
            const {token} = userInfo
            if(token.length > 0){
                aboutLoginUpload(token)
                loginHTTPFlowsToOnline(token)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("close-windows-renderer")
            ipcRenderer.removeAllListeners("minimize-windows-renderer")
        }
    }, [dynamicStatus.isDynamicStatus,userInfo])

    if (!agreed) {
        return (
            <>
                <div className={styles["yakit-mask-drag-wrapper"]}></div>
                <YakitModal
                    title='User Agreement'
                    centered={true}
                    visible={true}
                    closable={false}
                    width='75%'
                    cancelText={"Close / Closed"}
                    onCancel={() => ipcRenderer.invoke("UIOperate", "close")}
                    onOk={() => {
                        setLocalValue(LocalGVS.UserProtocolAgreed, true)
                        setAgreed(true)
                    }}
                    okText='Ive Read & Agree to the Agreement'
                    bodyStyle={{padding: "16px 24px 24px 24px"}}
                >
                    <div className={styles["yakit-agr-modal-body"]}>
                        <div className={styles["body-title"]}>Disclaimer</div>
                        <div className={styles["body-content"]}>
                            1. Tool for <span className={styles["sign-content"]}>Authorized Use Only</span>{" "}
                            为公司安全与自我学习，配置目标环境。
                            <br />
                            确保合法性与授权。
                            <span className={styles["underline-content"]}>禁止未授权扫描。</span>
                            <br />
                            I'阅读并完全同意后使用?。
                            <br />
                            <span className={styles["sign-bold-content"]}>
                                违禁行为的法律后果。
                            </span>
                            <br />
                            为公司安全与自我学习，配置目标环境。
                            <br />
                            Before Using, Please{" "}
                            <span className={styles["sign-bold-content"]}>阅读并完全同意后使用。</span>
                            <br />
                            Important Terms Notice{" "}
                            <span className={styles["sign-bold-content"]}>Bold</span>、
                            <span className={styles["underline-content"]}>Underline</span>
                            突出警告。
                            <br />
                            为公司安全与自我学习，配置目标环境。
                        </div>
                    </div>
                </YakitModal>
            </>
        )
    }

    return (
        <UILayout linkSuccess={linkSuccess}>
            <Suspense fallback={<div>Loading Main</div>}>
                <Main onErrorConfirmed={() => {}} />
            </Suspense>
        </UILayout>
    )
}

export default NewApp
