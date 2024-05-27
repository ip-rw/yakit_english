import React, {useEffect, useMemo, useRef, useState} from "react"
import {Badge, Modal, Tooltip, Avatar, Form, Typography} from "antd"
import {
    BellSvgIcon,
    RiskStateSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon,
    YaklangSvgIcon
} from "./icons"
import {YakitEllipsis} from "../basics/YakitEllipsis"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {showModal} from "@/utils/showModal"
import {failed, info, success, yakitFailed, warn, yakitNotify} from "@/utils/notification"
import {ConfigPrivateDomain} from "../ConfigPrivateDomain/ConfigPrivateDomain"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitSettingCallbackType, YakitSystem, YaklangEngineMode} from "@/yakitGVDefine"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {showConfigYaklangEnvironment} from "@/utils/ConfigYaklangEnvironment"
import Login from "@/pages/Login"
import {useStore, yakitDynamicStatus} from "@/store"
import {defaultUserInfo, MenuItemType, SetUserInfo} from "@/pages/MainOperator"
import {DropdownMenu} from "../baseTemplate/DropdownMenu"
import {loginOut} from "@/utils/login"
import {UserPlatformType} from "@/pages/globalVariable"
import SetPassword from "@/pages/SetPassword"
import SelectUpload from "@/pages/SelectUpload"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {Risk} from "@/pages/risks/schema"
import {RiskDetails} from "@/pages/risks/RiskTable"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps} from "../yakitUI/YakitMenu/YakitMenu"
import {
    getReleaseEditionName,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnterpriseEdition,
    showDevTool
} from "@/utils/envfile"
import {invalidCacheAndUserData} from "@/utils/InvalidCacheAndUserData"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {CodeGV, LocalGV, RemoteGV} from "@/yakitGV"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {showPcapPermission} from "@/utils/ConfigPcapPermission"
import {GithubSvgIcon, PencilAltIcon, TerminalIcon, CameraIcon} from "@/assets/newIcon"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {addToTab} from "@/pages/MainTabs"
import {DatabaseUpdateModal} from "@/pages/cve/CVETable"
import {ExclamationCircleOutlined, LoadingOutlined} from "@ant-design/icons"
import {DynamicControl, SelectControlType, ControlMyself, ControlOther} from "../../pages/dynamicControl/DynamicControl"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {MacKeyborad, WinKeyborad} from "../yakitUI/YakitEditor/editorUtils"
import {ScrecorderModal} from "@/pages/screenRecorder/ScrecorderModal"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitRoute} from "@/routes/newRoute"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {useRunNodeStore} from "@/store/runNode"
import emiter from "@/utils/eventBus/eventBus"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {visitorsStatisticsFun} from "@/utils/visitorsStatistics"
import {serverPushStatus} from "@/utils/duplex/duplex"

import yakitImg from "../../assets/yakit.jpg"
import classNames from "classnames"
import styles from "./funcDomain.module.scss"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "../yakitUI/YakitEmpty/YakitEmpty"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {yakProcess} from "./PerformanceDisplay"
import {AllKillEngineConfirm} from "./AllKillEngineConfirm"

const {ipcRenderer} = window.require("electron")

export const judgeDynamic = (userInfo, avatarColor: string, active: boolean, dynamicConnect: boolean) => {
    const {companyHeadImg, companyName} = userInfo
    // Clicked & Controlled Remotely
    const activeConnect: boolean = active && dynamicConnect
    return (
        <div
            className={classNames(styles["judge-avatar"], {
                [styles["judge-avatar-active"]]: activeConnect,
                [styles["judge-avatar-connect"]]: dynamicConnect
            })}
        >
            <div>
                {companyHeadImg && !!companyHeadImg.length ? (
                    <Avatar size={20} style={{cursor: "pointer"}} src={companyHeadImg} />
                ) : (
                    <Avatar
                        size={20}
                        style={activeConnect ? {} : {backgroundColor: avatarColor}}
                        className={classNames(styles["judge-avatar-avatar"], {
                            [styles["judge-avatar-active-avatar"]]: activeConnect
                        })}
                    >
                        {companyName && companyName.slice(0, 1)}
                    </Avatar>
                )}
            </div>
            {dynamicConnect && (
                <div
                    className={classNames(styles["judge-avatar-text"], {[styles["judge-avatar-active-text"]]: active})}
                >
                    Remoting
                </div>
            )}
        </div>
    )
}

/** Random Avatar Color */
export const randomAvatarColor = () => {
    const colorArr: string[] = ["#8863F7", "#DA5FDD", "#4A94F8", "#35D8EE", "#56C991", "#F4736B", "#FFB660", "#B4BBCA"]
    let color: string = colorArr[Math.round(Math.random() * 7)]
    return color
}

export interface FuncDomainProp {
    isEngineLink: boolean
    isReverse?: Boolean
    engineMode: YaklangEngineMode
    isRemoteMode: boolean
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: YakitSettingCallbackType) => any
    /** Remote Control - Auto Switch */
    runDynamicControlRemote: (v: string, url: string) => void
    /** License Validated?/Login */
    isJudgeLicense: boolean

    /** @Role Management */
    showProjectManage?: boolean
    /** @OS Type */
    system: YakitSystem
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
    const {
        isEngineLink,
        isReverse = false,
        engineMode,
        isRemoteMode,
        onEngineModeChange,
        runDynamicControlRemote,
        typeCallback,
        showProjectManage = false,
        system,
        isJudgeLicense
    } = props

    /** Password Pop-Up Allowed? */
    const {userInfo, setStoreUserInfo} = useStore()

    const [loginShow, setLoginShow] = useState<boolean>(false)
    /** User Menu */
    const [userMenu, setUserMenu] = useState<MenuItemType[]>([
        {title: "Logout", key: "sign-out"}
        // {title: "Account Binding (Supervised))", key: "account-bind"}
    ])
    /** Plugin Management */
    const [passwordShow, setPasswordShow] = useState<boolean>(false)
    /** Install Later (Yaklang/Yakit Download) */
    const [passwordClose, setPasswordClose] = useState<boolean>(true)
    /** Upload Popup */
    const [uploadModalShow, setUploadModalShow] = useState<boolean>(false)

    /** Plain Export */
    const [dynamicControlModal, setDynamicControlModal] = useState<boolean>(false)
    const [controlMyselfModal, setControlMyselfModal] = useState<boolean>(false)
    const [controlOtherModal, setControlOtherModal] = useState<boolean>(false)
    const [dynamicMenuOpen, setDynamicMenuOpen] = useState<boolean>(false)
    /** Current Remote Status */
    const {dynamicStatus} = yakitDynamicStatus()
    const [dynamicConnect] = useState<boolean>(dynamicStatus.isDynamicStatus)
    let avatarColor = useRef<string>(randomAvatarColor())

    useEffect(() => {
        const SetUserInfoModule = () => (
            <SetUserInfo userInfo={userInfo} avatarColor={avatarColor.current} setStoreUserInfo={setStoreUserInfo} />
        )
        const LoginOutBox = () => <div className={styles["login-out-component"]}>Logout</div>
        // Enterprise Non-Admin Login
        if (userInfo.role === "admin" && userInfo.platform !== "company") {
            setUserMenu([
                // {key: "account-bind", title: "Account Binding (Supervised))", disabled: true},
                {key: "plugin-aduit", title: "Non-Remote: Show Initiate, Hide Exit"},
                {key: "data-statistics", title: "Data Statistics"},
                {key: "sign-out", title: "Logout", render: () => LoginOutBox()}
            ])
        }
        // Current Version
        else if (userInfo.role === "superAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "trust-list", title: "User Management"},
                {key: "license-admin", title: "License Management"},
                {key: "plugin-aduit", title: "Non-Remote: Show Initiate, Hide Exit"},
                {key: "data-statistics", title: "Data Statistics"},
                {key: "sign-out", title: "Logout", render: () => LoginOutBox()}
            ])
        }
        // Non-Enterprise Operator
        else if (userInfo.role === "operate" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "data-statistics", title: "Data Statistics"},
                {key: "sign-out", title: "Logout"}
            ])
        }
        // Non-Enterprise License Admin
        else if (userInfo.role === "licenseAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "license-admin", title: "License Management"},
                {key: "sign-out", title: "Logout", render: () => LoginOutBox()}
            ])
        }
        // Enterprise Admin Login
        else if (userInfo.role === "admin" && userInfo.platform === "company") {
            let cacheMenu = (() => {
                if (isEnpriTraceAgent()) {
                    return [
                        {key: "user-info", title: "User Info", render: () => SetUserInfoModule()},
                        {key: "hole-collect", title: "Vulnerabilities Summary"},
                        {key: "role-admin", title: "Historical Versions"},
                        {key: "account-admin", title: "User Management"},
                        {key: "set-password", title: "Change Password"},
                        {key: "plugin-aduit", title: "Non-Remote: Show Initiate, Hide Exit"},
                        {key: "sign-out", title: "Logout", render: () => LoginOutBox()}
                    ]
                }
                let cacheMenu = [
                    {key: "user-info", title: "User Info", render: () => SetUserInfoModule()},
                    {key: "upload-data", title: "Upload Data"},
                    {key: "dynamic-control", title: "Incremental Update"},
                    {key: "control-admin", title: "Remote Management"},
                    {key: "close-dynamic-control", title: "Exit Remote"},
                    {key: "role-admin", title: "Historical Versions"},
                    {key: "account-admin", title: "User Management"},
                    {key: "set-password", title: "Change Password"},
                    {key: "plugin-aduit", title: "Non-Remote: Show Initiate, Hide Exit"},
                    {key: "sign-out", title: "Logout", render: () => LoginOutBox()}
                ]
                // Remote Not Show Initiate, Show Exit
                if (dynamicConnect) {
                    cacheMenu = cacheMenu.filter((item) => item.key !== "dynamic-control")
                }
                // Recording Loading
                if (!dynamicConnect) {
                    cacheMenu = cacheMenu.filter((item) => item.key !== "close-dynamic-control")
                }
                return cacheMenu
            })()
            setUserMenu(cacheMenu)
        }
        // Enterprise Non-Admin Login
        else if (userInfo.role !== "admin" && userInfo.platform === "company") {
            let cacheMenu = [
                {key: "user-info", title: "User Info", render: () => SetUserInfoModule()},
                {key: "upload-data", title: "Upload Data"},
                {key: "dynamic-control", title: "Incremental Update"},
                {key: "close-dynamic-control", title: "Exit Remote"},
                {key: "set-password", title: "Change Password"},
                {key: "plugin-aduit", title: "Non-Remote: Show Initiate, Hide Exit"},
                {key: "sign-out", title: "Logout"}
            ]
            if (!userInfo.checkPlugin) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "plugin-aduit")
            }
            if (isEnpriTraceAgent()) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "upload-data")
            }
            // Remote Not Show Initiate, Show Exit
            if (dynamicConnect) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "dynamic-control")
            }
            // Recording Loading
            if (!dynamicConnect) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "close-dynamic-control")
            }
            setUserMenu(cacheMenu)
        } else {
            setUserMenu([{key: "sign-out", title: "Logout"}])
        }
    }, [userInfo.role, userInfo.checkPlugin, userInfo.companyHeadImg, dynamicConnect])

    /** Render Communication-Open Page */
    const onOpenPage = useMemoizedFn((info: RouteToPageProps) => {
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })

    const {screenRecorderInfo, setRecording} = useScreenRecorder()
    useEffect(() => {
        ipcRenderer.on(`${screenRecorderInfo.token}-data`, async (e, data) => {})
        ipcRenderer.on(`${screenRecorderInfo.token}-error`, (e, error) => {
            setRecording(false)
        })
        ipcRenderer.on(`${screenRecorderInfo.token}-end`, (e, data) => {
            setRecording(false)
        })
        return () => {
            setRecording(false)
            ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-data`)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-error`)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-end`)
        }
    }, [screenRecorderInfo.token])
    useEffect(() => {
        ipcRenderer.on("open-screenCap-modal", async (e) => {
            openScreenRecorder()
        })
        return () => {
            ipcRenderer.removeAllListeners("open-screenCap-modal")
        }
    }, [])

    const openScreenRecorder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("IsScrecorderReady", {})
            .then((data: {Ok: boolean; Reason: string}) => {
                if (data.Ok) {
                    const m = showYakitModal({
                        title: "Screen Recording Notice",
                        footer: null,
                        type: "white",
                        width: 520,
                        content: (
                            <ScrecorderModal
                                onClose={() => {
                                    m.destroy()
                                }}
                                token={screenRecorderInfo.token}
                                onStartCallback={() => {
                                    setRecording(true)
                                    m.destroy()
                                }}
                            />
                        )
                    })
                } else {
                    addToTab("**screen-recorder")
                }
            })
            .catch((err) => {
                yakitFailed("Install:" + err)
            })
    })

    useEffect(() => {
        // Local
        ipcRenderer.on("ipc-sign-out-callback", async (e) => {
            setStoreUserInfo(defaultUserInfo)
            loginOut(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("ipc-sign-out-callback")
        }
    }, [])

    useEffect(() => {
        // Force Password Change
        ipcRenderer.on("reset-password-callback", async (e) => {
            setPasswordShow(true)
            setPasswordClose(false)
        })
        return () => {
            ipcRenderer.removeAllListeners("reset-password-callback")
        }
    }, [])

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classNames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                {showDevTool() && <UIDevTool />}

                <ScreenAndScreenshot
                    system={system}
                    token={screenRecorderInfo.token}
                    isRecording={screenRecorderInfo.isRecording}
                />

                {!showProjectManage && (
                    <div
                        className={styles["ui-op-btn-wrapper"]}
                        onClick={() => {
                            getLocalValue(RemoteGV.ShowBaseConsole).then((val: boolean) => {
                                if (!val) {
                                    typeCallback("console")
                                }
                            })
                        }}
                    >
                        <div className={styles["op-btn-body"]}>
                            <Tooltip placement='bottom' title='Engine Console'>
                                <TerminalIcon className={classNames(styles["icon-style"], styles["size-style"])} />
                            </Tooltip>
                        </div>
                    </div>
                )}

                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    {!showProjectManage && <UIOpRisk isEngineLink={isEngineLink} />}
                    {isCommunityEdition() && <UIOpNotice isEngineLink={isEngineLink} isRemoteMode={isRemoteMode} />}
                    {!showProjectManage && (
                        <UIOpSetting
                            engineMode={engineMode}
                            onEngineModeChange={onEngineModeChange}
                            typeCallback={typeCallback}
                        />
                    )}
                </div>
                {!showProjectManage && !isJudgeLicense && (
                    <>
                        <div className={styles["divider-wrapper"]}></div>
                        <div
                            className={classNames(styles["user-wrapper"], {
                                [styles["user-wrapper-dynamic"]]: dynamicConnect
                            })}
                        >
                            {userInfo.isLogin ? (
                                <div
                                    className={classNames({
                                        [styles["user-info"]]: !dynamicConnect,
                                        [styles["user-info-dynamic"]]: dynamicConnect
                                    })}
                                >
                                    <DropdownMenu
                                        menu={{
                                            data: userMenu
                                        }}
                                        dropdown={{
                                            placement: "bottom",
                                            trigger: ["click"],
                                            overlayClassName: "user-dropdown-menu-box",
                                            onVisibleChange: (value: boolean) => {
                                                setDynamicMenuOpen(value)
                                            }
                                        }}
                                        onClick={(key) => {
                                            setDynamicMenuOpen(false)
                                            if (key === "sign-out") {
                                                if (
                                                    dynamicStatus.isDynamicStatus ||
                                                    dynamicStatus.isDynamicSelfStatus
                                                ) {
                                                    Modal.confirm({
                                                        title: "Reminder",
                                                        icon: <ExclamationCircleOutlined />,
                                                        content: "Logout & Exit Remote Control?",
                                                        cancelText: "Cancel",
                                                        okText: "Logout",
                                                        onOk() {
                                                            if (dynamicStatus.isDynamicStatus) {
                                                                ipcRenderer.invoke("lougin-out-dynamic-control", {
                                                                    loginOut: true
                                                                })
                                                            }
                                                            if (dynamicStatus.isDynamicSelfStatus) {
                                                                ipcRenderer
                                                                    .invoke("kill-dynamic-control")
                                                                    .finally(() => {
                                                                        setStoreUserInfo(defaultUserInfo)
                                                                        loginOut(userInfo)
                                                                        setTimeout(() => success("IsScrecorderReady Failed"), 500)
                                                                    })
                                                                // Exit Now
                                                                ipcRenderer.invoke("lougin-out-dynamic-control-page")
                                                            }
                                                        },
                                                        onCancel() {}
                                                    })
                                                } else {
                                                    setStoreUserInfo(defaultUserInfo)
                                                    loginOut(userInfo)
                                                    setTimeout(() => success("IsScrecorderReady Failed"), 500)
                                                }
                                            }
                                            if (key === "trust-list") {
                                                onOpenPage({route: YakitRoute.TrustListPage})
                                            }
                                            if (key === "set-password") {
                                                setPasswordClose(true)
                                                setPasswordShow(true)
                                            }
                                            if (key === "upload-data") setUploadModalShow(true)
                                            if (key === "role-admin") {
                                                onOpenPage({route: YakitRoute.RoleAdminPage})
                                            }
                                            if (key === "account-admin") {
                                                onOpenPage({route: YakitRoute.AccountAdminPage})
                                            }
                                            if (key === "license-admin") {
                                                onOpenPage({route: YakitRoute.LicenseAdminPage})
                                            }
                                            if (key === "plugin-aduit") {
                                                onOpenPage({route: YakitRoute.Plugin_Audit})
                                            }
                                            if (key === "hole-collect") {
                                                onOpenPage({route: YakitRoute.HoleCollectPage})
                                            }
                                            if (key === "control-admin") {
                                                onOpenPage({route: YakitRoute.ControlAdminPage})
                                            }
                                            if (key === "data-statistics") {
                                                onOpenPage({route: YakitRoute.Data_Statistics})
                                            }
                                            if (key === "dynamic-control") {
                                                setDynamicControlModal(true)
                                            }
                                            if (key === "close-dynamic-control") {
                                                ipcRenderer.invoke("lougin-out-dynamic-control", {loginOut: false})
                                            }
                                        }}
                                    >
                                        {userInfo.platform === "company" ? (
                                            judgeDynamic(userInfo, avatarColor.current, dynamicMenuOpen, dynamicConnect)
                                        ) : (
                                            <img
                                                src={
                                                    userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg
                                                }
                                                style={{width: 24, height: 24, borderRadius: "50%"}}
                                            />
                                        )}
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <div className={styles["user-show"]} onClick={() => setLoginShow(true)}>
                                    <UnLoginSvgIcon />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {loginShow && <Login visible={loginShow} onCancel={() => setLoginShow(false)} />}
            <Modal
                visible={passwordShow}
                closable={passwordClose}
                title={"Change Password"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setPasswordShow(false)}
                footer={null}
            >
                <SetPassword onCancel={() => setPasswordShow(false)} userInfo={userInfo} />
            </Modal>

            <Modal
                visible={uploadModalShow}
                title={"Upload Data"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setUploadModalShow(false)}
                footer={null}
            >
                <SelectUpload onCancel={() => setUploadModalShow(false)} />
            </Modal>

            <DynamicControl
                mainTitle={"Remote Control"}
                secondTitle={"Update Usage Below"}
                isShow={dynamicControlModal}
                onCancle={() => setDynamicControlModal(false)}
                width={345}
            >
                <SelectControlType
                    onControlMyself={() => {
                        setControlMyselfModal(true)
                        setDynamicControlModal(false)
                    }}
                    onControlOther={() => {
                        setControlOtherModal(true)
                        setDynamicControlModal(false)
                    }}
                />
            </DynamicControl>

            <DynamicControl
                mainTitle={"Controlled End"}
                secondTitle={"Copy Key & Share"}
                isShow={controlMyselfModal}
                onCancle={() => setControlMyselfModal(false)}
            >
                <ControlMyself
                    goBack={() => {
                        setDynamicControlModal(true)
                        setControlMyselfModal(false)
                    }}
                />
            </DynamicControl>

            <DynamicControl
                mainTitle={"Controller"}
                secondTitle={"Remote with Shared Key"}
                isShow={controlOtherModal}
                onCancle={() => setControlOtherModal(false)}
            >
                <ControlOther
                    goBack={() => {
                        setDynamicControlModal(true)
                        setControlOtherModal(false)
                    }}
                    runControl={(v: string, url: string) => {
                        setControlOtherModal(false)
                        runDynamicControlRemote(v, url)
                    }}
                />
            </DynamicControl>
        </div>
    )
})

// Node Operation Popup
interface RunNodeContProp {
    runNodeModalVisible: boolean
    onClose: () => void
}

const initRunNodeModalParams = {
    ipOrdomain: "",
    port: "",
    nodename: ""
}

const RunNodeModal: React.FC<RunNodeContProp> = (props) => {
    const {runNodeModalVisible, onClose} = props
    const [visible, setVisible] = useState(false)
    const [form] = Form.useForm()
    const [params, setParams] = useState<{ipOrdomain: string; port: string; nodename: string}>(initRunNodeModalParams)
    const {hasRunNodeInList, setRunNodeList, firstRunNodeFlag, setFirstRunNodeFlag} = useRunNodeStore()

    useEffect(() => {
        setVisible(runNodeModalVisible)
    }, [runNodeModalVisible])

    // Form Field Callback
    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        setParams({...params, [key]: value.trim()})
    })

    const onOKFun = useMemoizedFn(async () => {
        try {
            if (!params.ipOrdomain || !params.port || !params.nodename) {
                throw Error("Enter IP/Domain, Port, Node Name")
            }
            if (hasRunNodeInList(JSON.stringify(params))) {
                throw Error("Same Node Running")
            }
            const res = await ipcRenderer.invoke("call-command-generate-node", {
                ipOrdomain: params.ipOrdomain,
                port: params.port,
                nodename: params.nodename
            })
            setRunNodeList(JSON.stringify(params), res + "")
            yakitNotify("success", "Node Start Success")
            !firstRunNodeFlag && setFirstRunNodeFlag(true)
            onCloseModal()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onCloseModal = useMemoizedFn(() => {
        setParams(initRunNodeModalParams)
        form.setFieldsValue(initRunNodeModalParams)
        onClose()
    })

    return (
        <YakitModal
            title='3 Days Ago'
            width={506}
            maskClosable={false}
            closable={true}
            visible={visible}
            okText='Confirm'
            onCancel={onCloseModal}
            onOk={onOKFun}
        >
            <div>
                <div style={{fontSize: 12, color: "#85899e", marginBottom: 10}}>
                    Node Operation Engine Resource Warning）。
                </div>
                <Form
                    form={form}
                    colon={false}
                    onSubmitCapture={(e) => e.preventDefault()}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                    initialValues={{...params}}
                    style={{height: "100%"}}
                    onValuesChange={onValuesChange}
                >
                    <Form.Item
                        label='Platform IP/Information'
                        name='ipOrdomain'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "DEV) Debugging Playground/Information"}]}
                    >
                        <YakitInput placeholder='DEV) Debugging Playground/Information' maxLength={100} showCount />
                    </Form.Item>
                    <Form.Item
                        label='Platform Port'
                        name='port'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "Enter Platform Port"}]}
                    >
                        <YakitInput placeholder='Enter Platform Port' maxLength={50} showCount />
                    </Form.Item>
                    <Form.Item
                        label='Fetch Failed'
                        name='nodename'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "Enter Node Name"}]}
                    >
                        <YakitInput placeholder='Enter Node Name' maxLength={50} showCount />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
}

interface UIOpSettingProp {
    /** Current Engine Mode */
    engineMode: YaklangEngineMode
    /** Yaklang Engine Mode Switch */
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: YakitSettingCallbackType) => any
}

const GetUIOpSettingMenu = () => {
    // Portable Edition
    if (isEnpriTraceAgent()) {
        return [
            {
                key: "pcapfix",
                label: "NIC Permissions Fix"
            },
            {
                key: "store",
                label: "Configure Plugin Source"
            },
            {
                key: "system-manager",
                label: "Process & Cache Management",
                children: [{key: "invalidCache", label: "Community Edition"}]
            },
            {
                key: "diagnose-network",
                label: "Network Diagnostics"
            },
            {
                key: "link",
                label: "Switch Connect Mode",
                children: [
                    {label: "More Versions", key: "local"},
                    {label: "Remote", key: "remote"}
                ]
            }
        ]
    }

    // Default Community Edition
    return [
        {
            key: "pcapfix",
            label: "NIC Permissions Fix"
        },
        {
            key: "project",
            label: "Enter Platform IP",
            children: [
                {label: "Switch Project", key: "changeProject"},
                {label: "Encrypt Export", key: "encryptionProject"},
                {label: "IsCVEDatabaseReady Failed", key: "plaintextProject"}
            ]
        },
        {
            key: "explab",
            label: "Experimental Features",
            children: [
                {
                    key: "bas-chaosmaker",
                    label: "BAS Labs"
                },
                // {
                //     key: "debug-plugin",
                //     label: "Plugin Debugging"
                // },
                {
                    key: "debug-monaco-editor",
                    label: "(Configure Global Reversal"
                },
                {
                    key: "vulinbox-manager",
                    label: "(Range)Vulinbox"
                },
                {
                    key: "debug-traffic-analize",
                    label: "More Versions: Update Now, Admin Edit"
                },
                {
                    key: "run-node",
                    label: "3 Days Ago"
                },
                {
                    key: "webshell-manager",
                    label: "Website Management"
                }
            ]
        },
        {type: "divider"},
        {
            key: "system-manager",
            label: "Process & Cache Management",
            children: [{key: "invalidCache", label: "Community Edition"}]
        },
        {
            key: "store",
            label: "Configure Plugin Source"
        },
        {
            key: "cve-database",
            label: "Console",
            children: [
                {label: "Full Update", key: "cve-database-all-update"},
                {label: "Update Content Modified", key: "cve-database-differential-update"}
            ]
        },
        {
            key: "link",
            label: "Switch Connect Mode",
            children: [
                {label: "More Versions", key: "local"},
                {label: "Remote", key: "remote"}
            ]
        },
        {type: "divider"},
        {
            key: "systemSet",
            label: "Again Again",
            children: [
                {key: "reverse", label: "Global Reversal"},
                {key: "agent", label: "System Proxy"},
                // { key: "engineVar",label: "Force Refresh" },
                {key: "config-network", label: "Global Config"}
            ]
        },
        {
            key: "diagnose-network",
            label: "Network Diagnostics"
        },
        {
            key: "refreshMenu",
            label: "Refresh"
        }
    ]
}

const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const {engineMode, onEngineModeChange, typeCallback} = props

    const [runNodeModalVisible, setRunNodeModalVisible] = useState<boolean>(false)
    const [show, setShow] = useState<boolean>(false)
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)
    const [available, setAvailable] = useState(false) // CVE DB Available
    const [isDiffUpdate, setIsDiffUpdate] = useState(false)
    const {dynamicStatus} = yakitDynamicStatus()
    const {delTemporaryProject} = useTemporaryProjectStore()

    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        ipcRenderer
            .invoke("IsCVEDatabaseReady")
            .then((rsp: {Ok: boolean; Reason: string; ShouldUpdate: boolean}) => {
                setAvailable(rsp.Ok)
            })
            .catch((err) => {
                yakitFailed("System Settings：" + err)
            })
    })
    const menuSelect = useMemoizedFn((type: string) => {
        if (show) setShow(false)
        switch (type) {
            case "cve-database-all-update":
                setDataBaseUpdateVisible(true)
                setIsDiffUpdate(false)
                return
            case "cve-database-differential-update":
                setDataBaseUpdateVisible(true)
                setIsDiffUpdate(true)
                return
            case "store":
                if (dynamicStatus.isDynamicStatus) {
                    warn("Show Project Management Page?")
                    return
                }
                const m = showYakitModal({
                    title: "Configure Private Domain",
                    type: "white",
                    footer: null,
                    maskClosable: false,
                    // onCancel: () => m.destroy(),
                    content: <ConfigPrivateDomain onClose={() => m.destroy()} />
                })
                return m
            case "reverse":
                showModal({
                    title: "Seeyon OA Session Leakage Detection",
                    width: 800,
                    content: (
                        <div style={{width: 800}}>
                            <ConfigGlobalReverse />
                        </div>
                    )
                })
                return
            case "agent":
                showConfigSystemProxyForm()
                return
            case "engineVar":
                showConfigYaklangEnvironment()
                return
            case "remote":
                if (dynamicStatus.isDynamicStatus) {
                    warn("Show Project Management Page?")
                    return
                }
                onEngineModeChange(type)
                return
            case "local":
                if (dynamicStatus.isDynamicStatus) {
                    warn("Show Project Management Page?")
                    return
                }
                if (type === engineMode) {
                    warn("Connected Locally")
                    return
                }
                onEngineModeChange(type)
                return
            case "refreshMenu":
                ipcRenderer.invoke("change-main-menu")
                return
            case "bas-chaosmaker":
                addToTab("**chaos-maker")
                return
            case "screen-recorder":
                addToTab("**screen-recorder")
                return
            // case "matcher-extractor":
            //     addToTab("**matcher-extractor")
            //     return
            case "debug-plugin":
                addToTab("**debug-plugin")
                return
            case "debug-monaco-editor":
                addToTab("**debug-monaco-editor")
                return
            case "vulinbox-manager":
                addToTab("**vulinbox-manager")
                return
            case "diagnose-network":
                addToTab("**diagnose-network")
                return
            case "config-network":
                addToTab("**config-network")
                return
            case "debug-traffic-analize":
                addToTab("**beta-debug-traffic-analize")
                return
            case "webshell-manager":
                addToTab("**webshell-manager")
                return
            case "invalidCache":
                invalidCacheAndUserData(delTemporaryProject)
                return
            case "pcapfix":
                showPcapPermission()
                return
            case "changeProject":
            case "encryptionProject":
            case "plaintextProject":
                typeCallback(type)
                return
            case "run-node":
                setRunNodeModalVisible(true)
                return
            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            // triggerSubMenuAction={'click'}
            data={GetUIOpSettingMenu() as YakitMenuItemProps[]}
            onClick={({key}) => menuSelect(key)}
        />
    )

    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
                placement={"bottom"}
                content={menu}
                visible={show}
                onVisibleChange={(visible) => setShow(visible)}
                trigger='click'
            >
                <div className={styles["ui-op-btn-wrapper"]}>
                    <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                        <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </div>
                </div>
            </YakitPopover>
            <DatabaseUpdateModal
                available={available}
                visible={dataBaseUpdateVisible}
                setVisible={setDataBaseUpdateVisible}
                latestMode={isDiffUpdate}
            />
            <RunNodeModal runNodeModalVisible={runNodeModalVisible} onClose={() => setRunNodeModalVisible(false)} />
        </>
    )
})

const UIDevTool: React.FC = React.memo(() => {
    const [show, setShow] = useState<boolean>(false)

    const {delTemporaryProject} = useTemporaryProjectStore()

    const menuSelect = useMemoizedFn(async (type: string) => {
        switch (type) {
            case "devtool":
                ipcRenderer.invoke("trigger-devtool")
                return
            case "reload":
                await delTemporaryProject()
                ipcRenderer.invoke("trigger-reload")
                return
            case "reloadCache":
                await delTemporaryProject()
                ipcRenderer.invoke("trigger-reload-cache")
                return

            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            selectedKeys={undefined}
            data={[
                {
                    key: "devtool",
                    label: "Critical"
                },
                {
                    key: "reload",
                    label: "Update"
                },
                {
                    key: "reloadCache",
                    label: "Followed You"
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        ></YakitMenu>
    )

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            placement={"bottom"}
            trigger={"click"}
            content={menu}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </div>
            </div>
        </YakitPopover>
    )
})

interface UIOpUpdateProps {
    version: string
    lastVersion: string
    localVersion?: string
    isUpdateWait?: boolean
    isRemoteMode?: boolean
    onDownload: (type: "yakit" | "yaklang") => any
    isSimple?: boolean
    isEnterprise: boolean
    role?: string | null
    updateContent?: string
    onUpdateEdit?: (type: "yakit" | "yaklang", isEnterprise?: boolean) => any
    removePrefixV: (version: string) => string
    onNoticeShow?: (visible: boolean) => void
}

/** @Yakit Version */
const UIOpUpdateYakit: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        isUpdateWait,
        onDownload,
        isSimple = false,
        isEnterprise,
        role,
        updateContent = "",
        onUpdateEdit,
        removePrefixV
    } = props

    const isUpdate = isSimple ? false : lastVersion !== "" && removePrefixV(lastVersion) !== removePrefixV(version)

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: isUpdate && !isUpdateWait
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YakitWhiteSvgIcon />
                    </div>
                    {/* Node Operation"Select Role"-DMs */}
                    <div>
                        <div className={isSimple ? styles["update-simple-title"] : styles["update-title"]}>{`${
                            isEnterprise ? "Enterprise Edition" : "Enterprise Latest Yakit"
                        } ${getReleaseEditionName()} ${isUpdate ? lastVersion : version}`}</div>
                        {!isSimple && <div className={styles["update-time"]}>{`Select Role: ${version}`}</div>}
                        {/* <div className={styles["update-time"]}>2022-10-01</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isSimple ? (
                        <></>
                    ) : isUpdateWait ? (
                        <YakitButton onClick={() => ipcRenderer.invoke("open-yakit-path")}>{`Timer `}</YakitButton>
                    ) : lastVersion === "" ? (
                        "Initiate Remote"
                    ) : isUpdate ? (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yakit")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            Non-Enterprise Super Admin Login
                        </div>
                    ) : (
                        "Up-to-Date"
                    )}
                    {role === "superAdmin" && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yakit", isEnterprise)
                            }}
                        >
                            <PencilAltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: role !== "superAdmin",
                        [styles["update-admin-content"]]: role === "superAdmin"
                    })}
                >
                    {content.length === 0 ? (
                        <div className={role === "superAdmin" ? styles["empty-content"] : ""}>Traffic Analysis</div>
                    ) : (
                        content.map((item, index) => {
                            return (
                                <div key={index} className={classNames({[styles["paragraph-spacing"]]: index !== 0})}>
                                    {item}
                                </div>
                            )
                        })
                    )}
                </div>
                {/* <div className={styles["current-version"]}>Current Yakit 1.1.3-sq1</div> */}
            </div>
        </div>
    )
})
/** @Yaklang Engine Version */
const UIOpUpdateYaklang: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        localVersion = "",
        isRemoteMode = false,
        onDownload,
        role,
        updateContent = "",
        onUpdateEdit,
        removePrefixV,
        onNoticeShow = () => {}
    } = props

    const [moreVersionPopShow, setMoreVersionPopShow] = useState<boolean>(false)

    const isUpdate =
        lastVersion !== "" &&
        removePrefixV(lastVersion) !== removePrefixV(version) &&
        removePrefixV(localVersion) !== removePrefixV(lastVersion)
    const isKillEngine =
        localVersion &&
        removePrefixV(localVersion) !== removePrefixV(version) &&
        removePrefixV(localVersion) === removePrefixV(lastVersion)

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    const showPencilAltIcon = useMemo(() => {
        return !isRemoteMode && role === "superAdmin"
    }, [isRemoteMode, role])

    const versionTextMaxWidth = useMemo(() => {
        // IPC Logout
        if (isUpdate && showPencilAltIcon) return 150
        // More Versions: Update Failed, Admin Edit
        if (!lastVersion && showPencilAltIcon) return 175
        // More Versions: Update Now
        if (isUpdate) return 179
        // More Versions: Up-to-Date, Admin Edit
        if (lastVersion && !isUpdate && !isKillEngine && showPencilAltIcon) return 170
        // More Versions: Others
        return 190
    }, [isUpdate, showPencilAltIcon, lastVersion])

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: !isRemoteMode && (isUpdate || isKillEngine)
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YaklangSvgIcon />
                    </div>
                    <div
                        style={{
                            width: versionTextMaxWidth
                        }}
                    >
                        <div className={styles["update-title"]}>{`Yaklang ${isUpdate ? lastVersion : version}`}</div>
                        <div className={styles["update-time"]}>{`Select Role: ${version}`}</div>
                        {/* <div className={styles["upda te-time"]}>2022-09-29</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isRemoteMode ? (
                        <>{isUpdate && "Remote Update Not Possible"}</>
                    ) : (
                        <>
                            <YakitPopover
                                visible={moreVersionPopShow}
                                overlayClassName={styles["more-versions-popover"]}
                                placement='bottomLeft'
                                trigger='click'
                                content={
                                    <MoreYaklangVersion
                                        onClosePop={() => {
                                            setMoreVersionPopShow(false)
                                            onNoticeShow(false)
                                        }}
                                    ></MoreYaklangVersion>
                                }
                                onVisibleChange={(visible) => {
                                    setMoreVersionPopShow(visible)
                                }}
                            >
                                <div className={styles["more-version-btn"]}>Plugin Likes</div>
                            </YakitPopover>
                            {isUpdate && (
                                <div className={styles["update-btn"]} onClick={() => onDownload("yaklang")}>
                                    <UpdateSvgIcon style={{marginRight: 4}} />
                                    Update Now
                                </div>
                            )}
                            {isKillEngine && (
                                <YakitButton
                                    onClick={() => ipcRenderer.invoke("kill-old-engine-process")}
                                >{`Engine Env Vars `}</YakitButton>
                            )}
                            {!lastVersion ? "Initiate Remote" : !isUpdate && !isKillEngine && "Up-to-Date"}
                        </>
                    )}
                    {showPencilAltIcon && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yaklang", isEnterpriseEdition())
                            }}
                        >
                            <PencilAltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: role !== "superAdmin",
                        [styles["update-admin-content"]]: role === "superAdmin"
                    })}
                >
                    {content.length === 0 ? (
                        <div className={role === "superAdmin" ? styles["empty-content"] : ""}>Traffic Analysis</div>
                    ) : (
                        content.map((item, index) => {
                            return (
                                <div key={index} className={classNames({[styles["paragraph-spacing"]]: index !== 0})}>
                                    {item}
                                </div>
                            )
                        })
                    )}
                </div>
                {/* <div className={styles["current-version"]}>Current: Yaklang 1.1.3-sp3-5</div> */}
            </div>
        </div>
    )
})

interface MoreYaklangVersionProps {
    onClosePop: (visible: boolean) => void
}
/** @More Yaklang Versions */
const MoreYaklangVersion: React.FC<MoreYaklangVersionProps> = React.memo((props) => {
    const {onClosePop} = props
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    const [loading, setLoading] = useState<boolean>(false)
    const [versionList, setVersionList] = useState<string[]>([])
    const [searchVersionVal, setSearchVersionVal] = useState<string>("")
    const [searchVersionList, setSearchVersionList] = useState<string[]>([])
    const [yaklangKillPss, setYaklangKillPss] = useState<boolean>(false)
    const [downloadYaklangVersion, setDownloadYaklangVersion] = useState<string>("")

    useEffect(() => {
        if (inViewport) {
            setLoading(true)
            ipcRenderer
                .invoke("fetch-yaklang-version-list")
                .then((data: string) => {
                    const arr = data.split("\n").filter((v) => v)
                    let devPrefix: string[] = []
                    let noPrefix: string[] = []
                    arr.forEach((item) => {
                        if (item.startsWith("dev")) {
                            devPrefix.push(item)
                        } else {
                            noPrefix.push(item)
                        }
                    })
                    setVersionList(noPrefix.concat(devPrefix))
                })
                .catch((err) => {
                    yakitNotify("error", `Failed to Fetch More Versions：${err}`)
                })
                .finally(() => {
                    setLoading(false)
                })
        }
    }, [inViewport])

    const onSearchVersion = (version: string) => {
        setSearchVersionVal(version)
        const arr = versionList.filter((v) => v.includes(version))
        setSearchVersionList(arr)
    }

    const renderVersionList = useMemo(() => {
        return searchVersionVal ? searchVersionList : versionList
    }, [searchVersionVal, searchVersionList, versionList])

    useEffect(() => {
        if (!yaklangKillPss) {
            setDownloadYaklangVersion("")
        }
    }, [yaklangKillPss])

    const versionListItemClick = (version: string) => {
        onClosePop(false)
        setYaklangKillPss(true)
        setDownloadYaklangVersion(version)
    }

    const killedEngineToUpdate = useMemoizedFn(() => {
        setYaklangKillPss(false)
        if (downloadYaklangVersion) {
            emiter.emit("downYaklangSpecifyVersion", downloadYaklangVersion)
        }
    })

    return (
        <div ref={ref} className={styles["more-versions-popover-content"]}>
            <div className={styles["search-version-header"]}>
                <YakitInput
                    value={searchVersionVal}
                    size='middle'
                    prefix={<OutlineSearchIcon className='search-icon' />}
                    allowClear={true}
                    onChange={(e) => onSearchVersion(e.target.value.trim())}
                />
            </div>
            <YakitSpin spinning={loading}>
                <div className={styles["version-list-wrap"]}>
                    {renderVersionList.length ? (
                        <>
                            {renderVersionList.map((v) => (
                                <div
                                    className={styles["version-list-item"]}
                                    key={v}
                                    onClick={() => versionListItemClick(v)}
                                >
                                    <Typography.Text
                                        style={{maxWidth: 200}}
                                        ellipsis={{
                                            tooltip: true
                                        }}
                                    >
                                        <span
                                            style={{
                                                color:
                                                    v === downloadYaklangVersion ? "var(--yakit-primary-5)" : undefined
                                            }}
                                        >
                                            {v}
                                        </span>
                                    </Typography.Text>
                                </div>
                            ))}
                        </>
                    ) : (
                        <YakitEmpty></YakitEmpty>
                    )}
                </div>
            </YakitSpin>
            <AllKillEngineConfirm
                visible={yaklangKillPss}
                setVisible={setYaklangKillPss}
                title='Initiate Remote Popup: Controlled-Controller'
                content='Confirm Engine Update & Install。'
                onSuccess={killedEngineToUpdate}
            ></AllKillEngineConfirm>
        </div>
    )
})

interface UIOpLetterProps {}

/** @Plugin & System Messages */
const UIOpLetter: React.FC<UIOpLetterProps> = React.memo((props) => {
    const LetterInfo = useMemoizedFn((type: string) => {
        return (
            <div key={type} className={styles["letter-info-wrapper"]}>
                <div className={styles["info-header"]}>
                    <BellSvgIcon />
                </div>
                {type === "follow" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>High Risk～</span>
                            &nbsp;Password Change Popup
                        </div>
                        <div className={styles["content-time"]}>Click to Read</div>
                    </div>
                )}
                {type === "star" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>Oranges</span>
                            &nbsp;CVE Database;
                            <span className={styles["accent-content"]}>Recording</span>
                        </div>
                        <div className={styles["content-time"]}>Admin Update Notification Pending</div>
                    </div>
                )}
                {type === "commit" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>Oranges</span>
                            &nbsp;Plugin Comments;
                            <span className={styles["accent-content"]}>Websphere Weak Password Detection</span>
                        </div>
                        <div className={styles["content-commit"]}>“Lads, Awesome！”</div>
                        <div className={styles["content-time"]}>Community Tracking</div>
                    </div>
                )}
                {type === "issue" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>Alex-null</span>
                            &nbsp;Project Submission;
                            <span className={styles["accent-content"]}>issue</span>
                        </div>
                        <div className={styles["content-time"]}>2022-10-09</div>
                    </div>
                )}
                {type === "system" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>System Messages</span>
                        </div>
                        <div className={styles["content-commit"]}>
                            Yak Events Sept 16, 3PM: Hands-on Tutorial!！
                        </div>
                        <div className={styles["content-time"]}>2022-10-01</div>
                    </div>
                )}
            </div>
        )
    })

    return (
        <div className={styles["letter-wrapper"]}>
            {["follow", "star", "commit", "issue", "system"].map((item) => LetterInfo(item))}
        </div>
    )
})

interface UIOpNoticeProp {
    isEngineLink: boolean
    isRemoteMode: boolean
}

export interface UpdateContentProp {
    version: string
    content: string
}

export interface FetchUpdateContentProp {
    source: "company" | "community"
    type: "yakit" | "yaklang"
}

export interface FetchEnpriTraceUpdateContentProp {
    version: string
}

export interface UpdateEnpriTraceInfoProps {
    version: string
}

interface SetUpdateContentProp extends FetchUpdateContentProp {
    updateContent: string
}

const UIOpNotice: React.FC<UIOpNoticeProp> = React.memo((props) => {
    const {isEngineLink, isRemoteMode} = props

    const {userInfo} = useStore()

    const [show, setShow] = useState<boolean>(false)
    const [type, setType] = useState<"letter" | "update">("update")

    /** Yakit Version */
    const [yakitVersion, setYakitVersion] = useState<string>("dev")
    const [yakitLastVersion, setYakitLastVersion] = useState<string>("")
    const yakitTime = useRef<any>(null)

    /** Yaklang Engine Version */
    const [yaklangVersion, setYaklangVersion] = useState<string>("dev")
    const [yaklangLastVersion, setYaklangLastVersion] = useState<string>("")
    const [yaklangLocalVersion, setYaklangLocalVersion] = useState<string>("")
    const yaklangTime = useRef<any>(null)

    const [companyYakitContent, setCompanyYakitContent] = useState<UpdateContentProp>({version: "", content: ""})
    const [communityYakitContent, setCommunityYakitContent] = useState<UpdateContentProp>({version: "", content: ""})
    const [communityYaklangContent, setCommunityYaklangContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })

    const removePrefixV = (version: string) => {
        return version.startsWith("v") ? version.slice(1) : version
    }
    const companyYakit: string = useMemo(() => {
        if (!yakitLastVersion) return ""
        const lastVersion = removePrefixV(yakitLastVersion)
        const contentVersion = removePrefixV(companyYakitContent.version)
        if (lastVersion !== contentVersion) return ""
        if (lastVersion === contentVersion) return companyYakitContent.content
        return ""
    }, [yakitLastVersion, companyYakitContent])
    const communityYakit: string = useMemo(() => {
        if (!yakitLastVersion) return ""
        const lastVersion = removePrefixV(yakitLastVersion)
        const contentVersion = removePrefixV(communityYakitContent.version)
        if (lastVersion !== contentVersion) return ""
        if (lastVersion === contentVersion) return communityYakitContent.content
        return ""
    }, [yakitLastVersion, communityYakitContent])
    const communityYaklang: string = useMemo(() => {
        if (!yaklangLastVersion) return ""
        const lastVersion = removePrefixV(yaklangLastVersion)
        const contentVersion = removePrefixV(communityYaklangContent.version)
        if (lastVersion !== contentVersion) return ""
        if (lastVersion === contentVersion) return communityYaklangContent.content
        return ""
    }, [yaklangLastVersion, communityYaklangContent])

    /** Check for Updates? */
    const [isCheck, setIsCheck] = useState<boolean>(true)

    /** Get Latest Yakit Version */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        /** div to Delete */
        isCommunityEdition() && visitorsStatisticsFun()
        /** Download Now */
        isCommunityEdition() &&
            ipcRenderer
                .invoke("fetch-latest-yakit-version")
                .then((data: string) => {
                    if (yakitVersion !== data) setYakitLastVersion(data)
                })
                .catch(() => {
                    setYakitLastVersion("")
                })
        /** Community Yakit Updates */
        isCommunityEdition() &&
            NetWorkApi<FetchUpdateContentProp, any>({
                diyHome: "https://www.yaklang.com",
                method: "get",
                url: "yak/versions",
                params: {type: "yakit", source: "community"}
            })
                .then((res: any) => {
                    if (!res) return
                    try {
                        const data: UpdateContentProp = JSON.parse(res)
                        if (data.content === communityYakitContent.content) return
                        setCommunityYakitContent({...data})
                    } catch (error) {}
                })
                .catch((err) => {})
        /** Login User Info */
        isEnpriTrace() &&
            ipcRenderer.invoke("update-enpritrace-info").then((info: UpdateEnpriTraceInfoProps) => {
                const {version} = info
                if (version) {
                    NetWorkApi<FetchEnpriTraceUpdateContentProp, any>({
                        method: "get",
                        url: "yak/install/package",
                        params: {version}
                    })
                        .then((res: {from: string}) => {
                            if (!res) return
                            try {
                                const {from} = res
                                if (from) {
                                    const regex = /EnpriTrace-(.*?)-(darwin-arm64|darwin-x64|linux-amd64|windows-amd64)/
                                    const match = from.match(regex)
                                    if (match) {
                                        const result = `v${match[1]}`
                                        if (yakitVersion !== result) setYakitLastVersion(result)
                                    }
                                }
                            } catch (error) {}
                        })
                        .catch((err) => {
                            setYakitLastVersion("")
                            // console.log("err", err)
                        })
                }
            })
        /** Enterprise Yakit Updates */
        isEnpriTrace() &&
            NetWorkApi<FetchUpdateContentProp, any>({
                diyHome: "https://www.yaklang.com",
                method: "get",
                url: "yak/versions",
                params: {type: "yakit", source: "company"}
            })
                .then((res: any) => {
                    if (!res) return
                    try {
                        const data: UpdateContentProp = JSON.parse(res)
                        if (data.content === companyYakitContent.content) return
                        setCompanyYakitContent({...data})
                    } catch (error) {}
                })
                .catch((err) => {})
    })
    /** Latest Yaklang Version */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => {
                if (yaklangVersion !== data) setYaklangLastVersion(data.startsWith("v") ? data.slice(1) : data)
            })
            .catch((err) => {
                setYaklangLastVersion("")
            })
        if (!isRemoteMode) {
            ipcRenderer
                .invoke("get-current-yak")
                .then((data: string) => {
                    !isRemoteMode && setYaklangLocalVersion(data)
                })
                .catch(() => {})
        }
        /** Community Yaklang Updates */
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
                    if (data.content === communityYaklangContent.content) return
                    setCommunityYaklangContent({...data})
                } catch (error) {}
            })
            .catch((err) => {})
    })

    /** Receive Local Yaklang Version */
    useEffect(() => {
        if (isEngineLink) {
            ipcRenderer.on("fetch-yak-version-callback", async (e: any, data: string) => {
                setYaklangVersion(data || "dev")
            })

            return () => {
                ipcRenderer.removeAllListeners("fetch-yak-version-callback")
            }
        }
    }, [isEngineLink])

    useEffect(() => {
        if (isEngineLink) {
            getLocalValue(LocalGV.NoAutobootLatestVersionCheck).then((val: boolean) => {
                setIsCheck(val)
            })
            /** Fetch Local Yakit, Start Latest Timer */
            ipcRenderer.invoke("fetch-yakit-version").then((v: string) => setYakitVersion(`v${v}`))
            if (yakitTime.current) clearInterval(yakitTime.current)
            fetchYakitLastVersion()
            yakitTime.current = setInterval(fetchYakitLastVersion, 60000)

            /** Fetch Local Yaklang, Start Latest Timer */
            ipcRenderer.invoke("fetch-yak-version")
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            fetchYaklangLastVersion()
            yaklangTime.current = setInterval(fetchYaklangLastVersion, 60000)

            return () => {
                clearInterval(yakitTime.current)
                clearInterval(yaklangTime.current)
            }
        } else {
            /** Clear Yakit Version & Timer */
            if (yakitTime.current) clearInterval(yakitTime.current)
            yakitTime.current = null
            setYakitLastVersion("")
            /** Clear Yaklang Version & Timer */
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            yaklangTime.current = null
            setYaklangLastVersion("")
        }
    }, [isEngineLink])

    const onDownload = useMemoizedFn((type: "yakit" | "yaklang") => {
        setShow(false)
        emiter.emit("activeUpdateYakitOrYaklang", type)
    })

    const [isYakitUpdateWait, setIsYakitUpdateWait] = useState<boolean>(false)
    /** Domain */
    useEffect(() => {
        const onsetIsYakitUpdateWait = () => {
            setIsYakitUpdateWait(true)
        }

        emiter.on("downloadedYakitFlag", onsetIsYakitUpdateWait)
        return () => {
            emiter.off("downloadedYakitFlag", onsetIsYakitUpdateWait)
        }
    }, [])

    const [editLoading, setEditLoading] = useState<boolean>(false)
    const [editShow, setEditShow] = useState<{visible: boolean; type: "yakit" | "yaklang"; isEnterprise?: boolean}>({
        visible: false,
        type: "yakit"
    })
    const [editInfo, setEditInfo] = useState<string>("")
    const UpdateContentEdit = useMemoizedFn((type: "yakit" | "yaklang", isEnterprise?: boolean) => {
        if (editShow.visible) return
        setEditInfo(type === "yakit" ? (isEnterprise ? companyYakit : communityYakit) : communityYaklang)
        setEditShow({visible: true, type: type, isEnterprise: !!isEnterprise})
        setShow(false)
    })
    const onSubmitEdit = useMemoizedFn(() => {
        setEditLoading(true)
        const params: SetUpdateContentProp = {
            type: editShow.type,
            source: editShow.isEnterprise ? "company" : "community",
            updateContent: JSON.stringify({
                version: editShow.type === "yakit" ? yakitLastVersion : yaklangLastVersion,
                content: editInfo || ""
            })
        }

        NetWorkApi<SetUpdateContentProp, API.ActionSucceeded>({
            method: "post",
            url: "yak/versions",
            data: params
        })
            .then((res) => {
                info("修改Engine Env Vars内容成功")
                if (editShow.type === "yakit") fetchYakitLastVersion()
                else fetchYaklangLastVersion()
                setTimeout(() => setEditShow({visible: false, type: "yakit"}), 100)
            })
            .catch((e) => failed(`Modify Error ${e}`))
            .finally(() => {
                setTimeout(() => setEditLoading(false), 300)
            })
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-notice-body"]}>
                    {/* <div className={styles["notice-tabs-wrapper"]}>
                        <div className={styles["notice-tabs-body"]}>
                            <div
                                className={classNames(styles["tabs-opt"], {
                                    [styles["tabs-opt-selected"]]: type === "letter"
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setType("letter")
                                }}
                            >
                                <Badge dot offset={[4, 0]}>
                                    7 Hours Ago
                                </Badge>
                            </div>
                            <div
                                className={classNames(styles["tabs-opt"], {
                                    [styles["tabs-opt-selected"]]: type === "update"
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setType("update")
                                }}
                            >
                                Update Notification
                            </div>
                        </div>
                    </div> */}
                    <div className={styles["notice-version-header"]}>
                        <div className={styles["header-title"]}>Update Notification</div>
                        <div className={styles["switch-title"]}>
                            Initiate Update Check
                            <YakitSwitch
                                style={{marginLeft: 4}}
                                showInnerText={true}
                                size='large'
                                checked={!isCheck}
                                onChange={(val: boolean) => {
                                    setLocalValue(LocalGV.NoAutobootLatestVersionCheck, !val)
                                    setIsCheck(!val)
                                }}
                            />
                        </div>
                    </div>

                    {type === "update" && (
                        <div className={styles["notice-version-wrapper"]}>
                            <div className={styles["version-wrapper"]}>
                                {userInfo.role === "superAdmin" && !isEnpriTraceAgent() && (
                                    <UIOpUpdateYakit
                                        version={yakitVersion}
                                        lastVersion={yakitLastVersion}
                                        isUpdateWait={isYakitUpdateWait}
                                        onDownload={onDownload}
                                        isSimple={true}
                                        isEnterprise={isCommunityEdition()}
                                        role={userInfo.role}
                                        updateContent={isCommunityEdition() ? companyYakit : communityYakit}
                                        onUpdateEdit={UpdateContentEdit}
                                        removePrefixV={removePrefixV}
                                    />
                                )}
                                {!isEnpriTraceAgent() && (
                                    <UIOpUpdateYakit
                                        version={yakitVersion}
                                        lastVersion={yakitLastVersion}
                                        isUpdateWait={isYakitUpdateWait}
                                        onDownload={onDownload}
                                        isEnterprise={isEnterpriseEdition()}
                                        role={userInfo.role}
                                        updateContent={isEnterpriseEdition() ? companyYakit : communityYakit}
                                        onUpdateEdit={UpdateContentEdit}
                                        removePrefixV={removePrefixV}
                                    />
                                )}
                                <UIOpUpdateYaklang
                                    version={yaklangVersion}
                                    lastVersion={yaklangLastVersion}
                                    localVersion={yaklangLocalVersion}
                                    isRemoteMode={isRemoteMode}
                                    onDownload={onDownload}
                                    isEnterprise={isEnterpriseEdition()}
                                    role={userInfo.role}
                                    updateContent={communityYaklang}
                                    onUpdateEdit={UpdateContentEdit}
                                    removePrefixV={removePrefixV}
                                    onNoticeShow={setShow}
                                />
                            </div>
                            <div className={styles["history-version"]}>
                                <div
                                    className={styles["content-style"]}
                                    onClick={() => ipcRenderer.invoke("open-url", CodeGV.HistoricalVersion)}
                                >
                                    <GithubSvgIcon className={styles["icon-style"]} /> Latest Risk & Vulnerability
                                </div>
                            </div>
                        </div>
                    )}

                    {/* {type === "letter" && (
                        <>
                            <div>
                                <UIOpLetter />
                            </div>
                            <div className={styles["notice-footer"]}>
                                <div className={styles["notice-footer-btn"]}>All Read</div>
                                <div className={styles["notice-footer-btn"]}>View All DMs</div>
                            </div>
                        </>
                    )} */}
                </div>
            </div>
        )
    }, [
        type,
        isCheck,
        userInfo,
        isEngineLink,
        yakitVersion,
        yakitLastVersion,
        isYakitUpdateWait,
        companyYakit,
        communityYakit,
        yaklangVersion,
        yaklangLastVersion,
        yaklangLocalVersion,
        isRemoteMode,
        communityYaklang
    ])

    const isUpdate = useMemo(() => {
        return isEnpriTraceAgent()
            ? yaklangLastVersion !== "" && removePrefixV(yaklangLastVersion) !== removePrefixV(yaklangVersion)
            : (yakitLastVersion !== "" && removePrefixV(yakitLastVersion) !== removePrefixV(yakitVersion)) ||
                  (yaklangLastVersion !== "" && removePrefixV(yaklangLastVersion) !== removePrefixV(yaklangVersion))
    }, [yakitVersion, yakitLastVersion, yaklangLastVersion, yaklangVersion])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            trigger={"click"}
            content={notice}
            visible={show}
            onVisibleChange={(visible) => {
                if (editShow.visible) setShow(false)
                else setShow(visible)
            }}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge dot={isUpdate}>
                        <VersionUpdateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
            <YakitModal
                title={
                    editShow.type === "yakit"
                        ? `${getReleaseEditionName()} ${yakitLastVersion} Update Notification`
                        : `Yaklang ${yaklangLastVersion} Update Notification`
                }
                centered={true}
                closable={true}
                type='white'
                size='large'
                visible={editShow.visible}
                cancelButtonProps={{loading: editLoading}}
                okButtonProps={{loading: editLoading}}
                onCancel={() => setEditShow({visible: false, type: "yakit"})}
                onOk={onSubmitEdit}
                bodyStyle={{padding: "16px 24px"}}
            >
                <div>
                    <YakitInput.TextArea
                        rows={10}
                        value={editInfo}
                        onChange={(e) => setEditInfo(e.target.value)}
                    ></YakitInput.TextArea>
                </div>
            </YakitModal>
        </YakitPopover>
    )
})

interface UIOpRiskProp {
    isEngineLink: boolean
}

/** Community Latest Yakit */
interface LatestRiskInfo {
    Title: string
    Id: number
    CreatedAt: number
    UpdatedAt: number
    Verbose: string
    TitleVerbose: string
    IsRead: boolean
}

interface RisksProps {
    Data: LatestRiskInfo[]
    Total: number
    NewRiskTotal: number
}

/** Risk & Vulnerability Levels */
const RiskType: {[key: string]: string} = {
    "Logged Out Successfully/Fingerprint": "info",
    "Low Risk": "low",
    "Node Name": "middle",
    "Refresh Menu": "high",
    "Clear Cache": "critical"
}
const UIOpRisk: React.FC<UIOpRiskProp> = React.memo((props) => {
    const {isEngineLink} = props

    const [show, setShow] = useState<boolean>(false)

    /** Fetch Latest Risk & Vulnerability Node */
    const fetchNode = useRef<number>(0)
    const [risks, setRisks] = useState<RisksProps>({
        Data: [],
        Total: 0,
        NewRiskTotal: 0
    })

    /** 3 Hours Ago */
    const timeRef = useRef<any>(null)

    /** Medium Risk */
    const update = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-risk-info", {AfterId: fetchNode.current})
            .then((res: RisksProps) => {
                if (
                    JSON.stringify(risks.Data) === JSON.stringify(res.Data) &&
                    risks.NewRiskTotal === res.NewRiskTotal &&
                    risks.Total === res.Total
                ) {
                    return
                }

                const risksOjb: RisksProps = {
                    Total: res.Total,
                    NewRiskTotal: res.NewRiskTotal,
                    Data: [...res.Data]
                }
                setRisks({...risksOjb})
            })
            .catch(() => {})
    })

    /** Fetch Latest Risk & Vulnerability (Every 5s)) */
    useEffect(() => {
        if (isEngineLink) {
            if (timeRef.current) clearInterval(timeRef.current)

            ipcRenderer
                .invoke("QueryRisks", {
                    Pagination: {Limit: 1, Page: 1, Order: "desc", OrderBy: "id"}
                })
                .then((res: QueryGeneralResponse<Risk>) => {
                    const {Data} = res
                    fetchNode.current = Data.length === 0 ? 0 : Data[0].Id
                })
                .catch((e) => {})
                .finally(() => {
                    update()
                    emiter.on("onRefreshQueryNewRisk", update)
                    // Previous Engine PS: Polling
                    if (!serverPushStatus) {
                        timeRef.current = setInterval(() => {
                            if (serverPushStatus) {
                                if (timeRef.current) clearInterval(timeRef.current)
                                timeRef.current = null
                                return
                            }
                            update()
                        }, 5000)
                    }
                })

            return () => {
                clearInterval(timeRef.current)
                emiter.off("onRefreshQueryNewRisk", update)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            fetchNode.current = 0
            setRisks({Data: [], Total: 0, NewRiskTotal: 0})
        }
    }, [isEngineLink])

    /** Replace Engine, Close All Local Processes */
    const singleRead = useMemoizedFn((info: LatestRiskInfo) => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current, Ids: [info.Id]})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    NewRiskTotal: info.IsRead ? risks.NewRiskTotal : risks.NewRiskTotal - 1,
                    Data: risks.Data.map((item) => {
                        if (item.Id === info.Id && item.Title === info.Title) item.IsRead = true
                        return item
                    })
                })
            })
            .catch(() => {})
        ipcRenderer
            .invoke("QueryRisk", {Id: info.Id})
            .then((res: Risk) => {
                if (!res) return
                showModal({
                    width: "80%",
                    title: "Details",
                    content: (
                        <div style={{overflow: "auto"}}>
                            <RiskDetails info={res} />
                        </div>
                    )
                })
            })
            .catch(() => {})
    })
    /** All Read */
    const allRead = useMemoizedFn(() => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    NewRiskTotal: 0,
                    Data: risks.Data.map((item) => {
                        item.IsRead = true
                        return item
                    })
                })
            })
            .catch(() => {})
    })
    /** View All */
    const viewAll = useMemoizedFn(() => {
        addToTab(YakitRoute.DB_Risk)
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-risk-body"]}>
                    <div className={styles["risk-header"]}>
                        Vulnerabilities & Risks (Total {risks.Total || 0} Unread {risks.NewRiskTotal || 0} Rule）
                    </div>

                    <div className={styles["risk-info"]}>
                        {risks.Data.map((item) => {
                            const type = RiskType[item.Verbose]
                            if (!!type) {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <div
                                            className={classNames(styles["opt-icon-style"], styles[`opt-${type}-icon`])}
                                        >
                                            {item.Verbose}
                                        </div>
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis
                                                text={item.TitleVerbose || item.Title}
                                                width={type === "info" ? 280 : 310}
                                            />
                                        </Badge>
                                    </div>
                                )
                            } else {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis text={`${item.Title} ${item.Verbose}}`} width={350} />
                                        </Badge>
                                    </div>
                                )
                            }
                        })}
                    </div>

                    <div className={styles["risk-footer"]}>
                        <div className={styles["risk-footer-btn"]} onClick={allRead}>
                            All Read
                        </div>
                        <div className={styles["risk-footer-btn"]} onClick={viewAll}>
                            View All
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [risks])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            trigger={"click"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge count={risks.NewRiskTotal} offset={[2, 15]}>
                        <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
        </YakitPopover>
    )
})

interface ScreenAndScreenshotProps {
    system: YakitSystem
    isRecording: boolean
    token: string
}

const ScreenAndScreenshot: React.FC<ScreenAndScreenshotProps> = React.memo((props) => {
    const {system, isRecording, token} = props
    const [show, setShow] = useState<boolean>(false)
    /** Screenshot Loading */
    const [screenshotLoading, setScreenshotLoading] = useState<boolean>(false)
    /** Project Management */
    const [screenCapLoading, setScreenCapLoading] = useState<boolean>(false)

    const yakitMenuData = useCreation(() => {
        if (system === "Darwin" || system === "Windows_NT") {
            return [
                {
                    label: isRecording ? (
                        <div
                            className={styles["stop-screen-menu-item"]}
                            onClick={() => {
                                ipcRenderer.invoke("cancel-StartScrecorder", token)
                            }}
                        >
                            Stop Recording
                        </div>
                    ) : (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>Fetch Latest Risk Data</span>
                            {/* <span className={styles["shortcut-keys"]}>
                                {system === "Darwin"
                                    ? `${MacKeyborad[17]} ${MacKeyborad[16]} X`
                                    : `${WinKeyborad[17]} ${WinKeyborad[16]} X`}
                            </span> */}
                        </div>
                    ),
                    key: "screenCap"
                },
                {
                    label: (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>Screenshot</span>
                            {
                                screenshotLoading && (
                                    <div
                                        className={styles["icon-loading-wrapper"]}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <LoadingOutlined className={styles["icon-hover-style"]} />
                                    </div>
                                )
                                // : (
                                //     <span className={styles["shortcut-keys"]}>
                                //         {system === "Darwin"
                                //             ? `${MacKeyborad[17]} ${MacKeyborad[16]} B`
                                //             : `${WinKeyborad[17]} ${WinKeyborad[16]} B`}
                                //     </span>
                                // )
                            }
                        </div>
                    ),
                    key: "screenshot"
                },
                {
                    type: "divider"
                },
                {
                    label: "Screen Recording Management",
                    key: "screen-recorder"
                }
            ]
        }
        return [
            {
                label: isRecording ? (
                    <div
                        className={styles["stop-screen-menu-item"]}
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartScrecorder", token)
                        }}
                    >
                        Stop Recording
                    </div>
                ) : (
                    <div className={styles["screen-and-screenshot-menu-item"]}>
                        <span>Fetch Latest Risk Data</span>
                        <span className={styles["shortcut-keys"]}>{`${WinKeyborad[17]} ${WinKeyborad[16]} X`}</span>
                    </div>
                ),
                key: "screenCap"
            },
            {
                type: "divider"
            },
            {
                label: <span>Screen Recording Management</span>,
                key: "screen-recorder"
            }
        ]
    }, [system, screenshotLoading, isRecording])
    const menuSelect = useMemoizedFn((type: string) => {
        setShow(false)
        switch (type) {
            case "screenCap":
                if (isRecording) {
                    ipcRenderer.invoke("cancel-StartScrecorder", token)
                } else {
                    ipcRenderer.invoke("send-open-screenCap-modal")
                }

                break
            case "screenshot":
                if (screenshotLoading) return
                setScreenshotLoading(true)
                ipcRenderer.invoke("activate-screenshot")
                setTimeout(() => {
                    setScreenshotLoading(false)
                }, 1000)
                break
            case "screen-recorder":
                addToTab("**screen-recorder")
                break
            default:
                break
        }
    })

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            data={yakitMenuData as YakitMenuItemProps[]}
            onClick={({key}) => menuSelect(key)}
        />
    )
    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
                overlayStyle={{paddingBottom: 0}}
                placement={"bottom"}
                content={menu}
                visible={show}
                onVisibleChange={(visible) => setShow(visible)}
                trigger={"click"}
            >
                <div className={styles["ui-op-btn-wrapper"]}>
                    <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                        <CameraIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </div>
                </div>
            </YakitPopover>
        </>
    )
})
