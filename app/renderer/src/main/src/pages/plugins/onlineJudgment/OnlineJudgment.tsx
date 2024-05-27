import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useNetwork, useMemoizedFn} from "ahooks"
import React, {forwardRef, useState, useImperativeHandle, useEffect, useMemo} from "react"
import {OnlineJudgmentProps, OnlineResponseStatusProps} from "./OnlineJudgmentType"
import Online from "@/assets/online.png"
import Server from "@/assets/server.png"
import NoPermissions from "@/assets/no_permissions.png"

import {yakitNotify} from "@/utils/notification"

import styles from "./OnlineJudgment.module.scss"
import Login from "@/pages/Login"
import {useStore} from "@/store"

const {ipcRenderer} = window.require("electron")

export const OnlineJudgment: React.FC<OnlineJudgmentProps> = React.memo(
    forwardRef((props, ref) => {
        const {isJudgingLogin} = props
        const networkState = useNetwork()
        const [initLoading, setInitLoading] = useState<boolean>(true)
        const [loading, setLoading] = useState<boolean>(true)
        const [loginShow, setLoginShow] = useState<boolean>(false)

        const [onlineResponseStatus, setOnlineResponseStatus] = useState<OnlineResponseStatusProps>({
            code: 200,
            message: ""
        })

        const userInfo = useStore((s) => s.userInfo)

        useImperativeHandle(
            ref,
            () => {
                return {
                    onlineResponseStatus
                }
            },
            [onlineResponseStatus]
        )

        useEffect(() => {
            JudgingStatus()
        }, [networkState.online, userInfo.isLogin])

        const JudgingStatus = useMemoizedFn(() => {
            if (isJudgingLogin && !userInfo.isLogin) {
                setInitLoading(false)
                setLoading(false)
                setOnlineResponseStatus({
                    code: 401,
                    message: "Not logged in"
                })
            } else {
                if (networkState.online) {
                    getNetWork()
                } else {
                    setInitLoading(false)
                    setLoading(false)
                    setOnlineResponseStatus({
                        code: -1,
                        message: ""
                    })
                }
            }
        })

        const getNetWork = useMemoizedFn(() => {
            setLoading(true)
            ipcRenderer
                .invoke("fetch-netWork-status-by-request-interface")
                .then((res) => {
                    if (res.code === -1) {
                        yakitNotify("error", "Connection Failed:" + res.message)
                    }
                    setOnlineResponseStatus({
                        code: res.code,
                        message: res.message || ""
                    })
                })
                .catch((error) => {
                    yakitNotify("error", "Connection Failed:" + error)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                        setInitLoading(false)
                    }, 200)
                )
        })
        const errorNode = useMemo(() => {
            switch (onlineResponseStatus.code) {
                case 500:
                case 502:
                    return (
                        <>
                            <YakitEmpty
                                image={<img src={Server} alt='' />}
                                imageStyle={{width: 272, height: 265, marginBottom: 16}}
                                title='Server Error'
                                description='Server Error, Contact Admin'
                            />
                            <YakitButton
                                className={styles["refresh-button"]}
                                type='outline1'
                                icon={<OutlineRefreshIcon />}
                                onClick={getNetWork}
                            >
                                Refresh Page
                            </YakitButton>
                        </>
                    )
                case 401:
                    return (
                        <>
                            {/* {isCommunityEdition() ? (
                                <>
                                    <YakitEmpty
                                        image={<img src={NoPermissions} alt='' />}
                                        imageStyle={{width: 320, height: 250, marginBottom: 16}}
                                        title='No Access'
                                        description='Login to Access This Page'
                                    />
                                    <YakitButton
                                        className={styles["refresh-button"]}
                                        type='outline1'
                                        onClick={onLogin}
                                    >
                                        Login Now
                                    </YakitButton>
                                </>
                            ) : (
                                <YakitEmpty
                                    image={<img src={NoPermissions} alt='' />}
                                    imageStyle={{width: 320, height: 250, marginBottom: 16}}
                                    title='No Access'
                                    description='Contact Admin for Permissions'
                                />
                            )} */}
                            <YakitEmpty
                                image={<img src={NoPermissions} alt='' />}
                                imageStyle={{width: 320, height: 250, marginBottom: 16}}
                                title='No Access'
                                description='Login to Access This Page'
                            />
                            <YakitButton className={styles["refresh-button"]} type='outline1' onClick={() => onLogin()}>
                                Login Now
                            </YakitButton>
                        </>
                    )
                case 200:
                    break
                default:
                    return (
                        <>
                            <YakitEmpty
                                image={<img src={Online} alt='' />}
                                imageStyle={{width: 300, height: 210, marginBottom: 16}}
                                title='Check Private Domain & Network'
                                description='Connect to Access Yakit Plugin Store'
                            />
                            <YakitButton
                                className={styles["refresh-button"]}
                                type='outline1'
                                icon={<OutlineRefreshIcon />}
                                onClick={getNetWork}
                            >
                                Refresh Page
                            </YakitButton>
                        </>
                    )
            }
        }, [onlineResponseStatus])
        const onLogin = useMemoizedFn(() => {
            setLoginShow(true)
        })
        const onLoadingCancel = useMemoizedFn(() => {
            setLoginShow(false)
            JudgingStatus()
        })

        return initLoading ? (
            <YakitSpin wrapperClassName={styles["online-spin"]} />
        ) : (
            <>
                {onlineResponseStatus.code === 200 ? (
                    props.children
                ) : (
                    <YakitSpin spinning={loading}>
                        <div className={styles["online-network"]}>{errorNode}</div> 
                    </YakitSpin>
                )}

                {loginShow && <Login visible={loginShow} onCancel={onLoadingCancel} />}
            </>
        )
    })
)
