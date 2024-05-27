import React, {ReactNode, memo, useEffect, useRef, useState} from "react"
import {Alert, Avatar, Button, Layout, Modal, Space, Upload} from "antd"
import {CameraOutlined} from "@ant-design/icons"
import {failed, info, success, yakitNotify} from "../utils/notification"
import {showModal} from "../utils/showModal"
import {
    CompletionTotal,
    MethodSuggestion,
    setYaklangBuildInMethodCompletion,
    setYaklangCompletions
} from "../utils/monacoSpec/yakCompletionSchema"
import {setUpYaklangMonaco} from "../utils/monacoSpec/yakEditor"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {AutoSpin} from "../components/AutoSpin"
import {addToTab} from "./MainTabs"
import Login from "./Login"
import SetPassword from "./SetPassword"
import {UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {SimpleQueryYakScriptSchema} from "./invoker/batch/QueryYakScriptParam"
import {refreshToken} from "@/utils/login"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {
    globalUserLogin,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    shouldVerifyEnpriTraceLogin
} from "@/utils/envfile"
import HeardMenu from "./layout/HeardMenu/HeardMenu"
import {CodeGV, LocalGV, RemoteGV} from "@/yakitGV"
import {EnterpriseLoginInfoIcon} from "@/assets/icons"
import {BaseConsole} from "../components/baseConsole/BaseConsole"
import CustomizeMenu from "./customizeMenu/CustomizeMenu"
import {ControlOperation} from "@/pages/dynamicControl/DynamicControl"
import {YakitHintModal} from "@/components/yakitUI/YakitHint/YakitHintModal"
import {useScreenRecorder} from "@/store/screenRecorder"
import PublicMenu, {RouteToPageProps} from "./layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/routes/newRoute"
import {YakChatCS} from "@/components/yakChat/chatCS"
import yakitCattle from "../assets/yakitCattle.png"
import {MainOperatorContent} from "./layout/mainOperatorContent/MainOperatorContent"
import {MultipleNodeInfo} from "./layout/mainOperatorContent/MainOperatorContentType"
import {WaterMark} from "@ant-design/pro-layout"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import "./main.scss"
import "./GlobalClass.scss"
import {YakitSystem} from "@/yakitGVDefine"

const {ipcRenderer} = window.require("electron")

export const defaultUserInfo: UserInfoProps = {
    isLogin: false,
    platform: null,
    githubName: null,
    githubHeadImg: null,
    wechatName: null,
    wechatHeadImg: null,
    qqName: null,
    qqHeadImg: null,
    companyName: null,
    companyHeadImg: null,
    role: null,
    user_id: null,
    token: "",
    checkPlugin: false
}

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
    isShowHome?: boolean
}

export interface MenuItem {
    Group: string
    YakScriptId: number
    Verbose: string
    Query?: SimpleQueryYakScriptSchema
    MenuItemId?: number
    GroupSort?: number
    YakScriptName?: string
}

export interface MenuItemType {
    key: string
    label?: ReactNode
    title?: string
    render?: (info: any) => ReactNode
    icon?: ReactNode
    danger?: boolean
    disabled?: boolean
}

export const judgeAvatar = (userInfo, size: number, avatarColor: string) => {
    const {companyHeadImg, companyName} = userInfo

    return companyHeadImg && !!companyHeadImg.length ? (
        <Avatar size={size} style={{cursor: "pointer"}} src={companyHeadImg} />
    ) : (
        <Avatar size={size} style={{backgroundColor: avatarColor, cursor: "pointer"}}>
            {companyName && companyName.slice(0, 1)}
        </Avatar>
    )
}

export interface SetUserInfoProp {
    userInfo: UserInfoProps
    setStoreUserInfo: (info: any) => void
    avatarColor: string
}

// Uploadable File Types
const FileType = ["image/png", "image/jpeg", "image/png"]

// User Info
export const SetUserInfo: React.FC<SetUserInfoProp> = React.memo((props) => {
    const {userInfo, setStoreUserInfo, avatarColor} = props

    // OSS Avatar Deletion
    const deleteAvatar = useMemoizedFn((imgName) => {
        NetWorkApi<API.DeleteResource, API.ActionSucceeded>({
            method: "post",
            url: "delete/resource",
            data: {
                file_type: "img",
                file_name: [imgName]
            }
        })
            .then((result) => {
                // if(result.ok){
                //     success("Original Avatar Deleted")
                // }
            })
            .catch((err) => {
                failed("Avatar Change Failed：" + err)
            })
            .finally(() => {})
    })

    // Change Avatar
    const setAvatar = useMemoizedFn(async (file) => {
        await ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                let imgUrl: string = res.data
                NetWorkApi<API.UpUserInfoRequest, API.ActionSucceeded>({
                    method: "post",
                    url: "urm/up/userinfo",
                    data: {
                        head_img: imgUrl
                    }
                })
                    .then((result) => {
                        if (result.ok) {
                            success("Avatar Changed Successfully")
                            setStoreUserInfo({
                                ...userInfo,
                                companyHeadImg: imgUrl
                            })
                            let imgName = imgUrl.split("/").reverse()[0]
                            deleteAvatar(imgName)
                        }
                    })
                    .catch((err) => {
                        failed("Avatar Change Failed：" + err)
                    })
                    .finally(() => {})
            })
            .catch((err) => {
                failed("Avatar Upload Failed")
            })
            .finally(() => {})
    })
    return (
        <div className='dropdown-menu-user-info'>
            <Upload.Dragger
                className='author-upload-dragger'
                accept={FileType.join(",")}
                // accept=".jpg, .jpeg, .png"
                multiple={false}
                maxCount={1}
                showUploadList={false}
                beforeUpload={(f) => {
                    if (!FileType.includes(f.type)) {
                        failed(`${f.name}Invalid File Type, Upload png, jpg, jpeg Only！`)
                        return false
                    }
                    setAvatar(f)
                    return false
                }}
            >
                <div className='img-box'>
                    <div className='img-box-mask'>{judgeAvatar(userInfo, 40, avatarColor)}</div>
                    <CameraOutlined className='hover-icon' />
                </div>
            </Upload.Dragger>

            <div
                className='content-box'
                style={
                    userInfo.role !== "admin"
                        ? {display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16}
                        : {}
                }
            >
                <div className='user-name'>{userInfo.companyName}</div>
                {userInfo.role === "admin" && (
                    <>
                        <div className='permission-show'>Admin</div>
                        <span className='user-admin-icon'>
                            <EnterpriseLoginInfoIcon />
                        </span>
                    </>
                )}
            </div>
        </div>
    )
})
// web-fuzzer Cached Data Attributes
export interface fuzzerInfoProp {
    time: string

    isHttps?: boolean
    // isGmTLS?: boolean
    // forceFuzz?: boolean
    // concurrent?: number
    // proxy?: string
    actualHost?: string
    // timeout?: number
    request?: string
    /**
     * @Param Submenu Name Save Field, currently webFuzzer only
     */
    verbose?: string
    /**@Param Group Info  */
    groupChildren?: MultipleNodeInfo[]
    id?: string
}

const Main: React.FC<MainProp> = React.memo((props) => {
    const [loading, setLoading] = useState(false)

    // Password Change Popup
    const [passwordShow, setPasswordShow] = useState<boolean>(false)

    // Login Box Status
    const [loginshow, setLoginShow, getLoginShow] = useGetState<boolean>(false)

    /** ---------- Remote Control Start ---------- */
    // Remote Control Overlay
    const [controlShow, setControlShow] = useState<boolean>(false)
    const [controlName, setControlName] = useState<string>("")
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
    // Timer Checks Connection/Disconnect
    useEffect(() => {
        const id = setInterval(() => {
            // API Request on Service Start
            ipcRenderer.invoke("alive-dynamic-control-status").then((is: boolean) => {
                if (is) {
                    getRemoteValue("REMOTE_OPERATION_ID").then((tunnel) => {
                        if (!!tunnel) {
                            NetWorkApi<any, API.RemoteStatusResponse>({
                                method: "get",
                                url: "remote/status",
                                params: {
                                    tunnel
                                }
                            }).then((res) => {
                                if (res.status) {
                                    setDynamicStatus({...dynamicStatus, isDynamicSelfStatus: true})
                                    setControlShow(true)
                                    setControlName(res.user_name || "")
                                } else {
                                    setDynamicStatus({...dynamicStatus, isDynamicSelfStatus: false})
                                    setControlShow(false)
                                }
                            })
                        }
                    })
                } else {
                    setControlShow(false)
                }
            })
        }, 15000)
        // Exit Remote Control Page
        ipcRenderer.on("lougin-out-dynamic-control-page-callback", async () => {
            setControlShow(false)
        })

        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners("lougin-out-dynamic-control-page-callback")
        }
    }, [])
    /** ---------- Remote Control End ---------- */
    /** ---------- Engine Console Start ---------- */
    // Display Console?
    const [isShowBaseConsole, setIsShowBaseConsole] = useState<boolean>(false)
    // Console Direction
    const [directionBaseConsole, setDirectionBaseConsole] = useState<"left" | "bottom" | "right">("left")
    // Monitor Console Opening
    useEffect(() => {
        ipcRenderer.on("callback-direction-console-log", (e, res: any) => {
            if (res?.direction) {
                setDirectionBaseConsole(res.direction)
                setIsShowBaseConsole(true)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("callback-direction-console-log")
        }
    }, [])
    // Cache Console Display for Mutex
    useEffect(() => {
        setLocalValue(RemoteGV.ShowBaseConsole, isShowBaseConsole)
    }, [isShowBaseConsole])
    /** ---------- Engine Console End ---------- */
    /** ---------- Login Status Change Start ---------- */
    const {userInfo, setStoreUserInfo} = useStore()
    const IsEnpriTrace = shouldVerifyEnpriTraceLogin()

    useEffect(() => {
        ipcRenderer.on("fetch-signin-token", (e, res: UserInfoProps) => {
            // Refresh User Info
            setStoreUserInfo(res)
            // Refresh Engine
            globalUserLogin(res.token)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-signin-token")
        }
    }, [])

    useEffect(() => {
        // Enterprise Initial Page (Logged In) User Info Refreshed
        if (shouldVerifyEnpriTraceLogin()) {
            ipcRenderer.send("company-refresh-in")
        }
    }, [])

    /** ---------- Login Status Change End ---------- */
    // Refresh Login Token
    useEffect(() => {
        ipcRenderer.on("refresh-token", (e, res: any) => {
            refreshToken(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-token")
        }
    }, [])
    // Load Completion
    useEffect(() => {
        ipcRenderer.invoke("GetYakitCompletionRaw").then((data: {RawJson: Uint8Array}) => {
            try {
                const completionJson = Buffer.from(data.RawJson).toString("utf8")
                const total = JSON.parse(completionJson) as CompletionTotal
                setYaklangCompletions(total)
                setUpYaklangMonaco()
            } catch (e) {
                console.info(e)
            }

            // success("Yak Language Autocomplete Loaded / Load Yak IDE Auto Completion Finished")
        })
        //
        ipcRenderer.invoke("GetYakVMBuildInMethodCompletion", {}).then((data: {Suggestions: MethodSuggestion[]}) => {
            try {
                if (!data) {
                    return
                }
                if (data.Suggestions.length <= 0) {
                    return
                }
                setYaklangBuildInMethodCompletion(data.Suggestions)
            } catch (e) {
                console.info(e)
            }
        })
    }, [])
    /** ---------- Other Logic End ---------- */

    /** @Name for Menu Display */
    const routeKeyToLabel = useRef<Map<string, string>>(new Map<string, string>())

    const {screenRecorderInfo} = useScreenRecorder()
    useUpdateEffect(() => {
        if (!screenRecorderInfo.isRecording) {
            addToTab("**screen-recorder")
        }
    }, [screenRecorderInfo.isRecording])

    /** Edit Menu Logic */
    const [isShowCustomizeMenu, setIsShowCustomizeMenu] = useState<boolean>(false) //Show Custom Menu Page?
    useEffect(() => {
        ipcRenderer.on("fetch-open-customize-menu", (e, type: YakitRoute) => {
            setIsShowCustomizeMenu(true)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-open-customize-menu")
        }
    }, [])

    /** yak-chat Logic */
    const [chatShow, setChatShow] = useState<boolean>(false)

    const onChatCS = useMemoizedFn(() => {
        setChatShow(true)
    })

    /** Notify Page Open */
    const openMenu = (info: RouteToPageProps) => {
        emiter.emit("menuOpenPage", JSON.stringify(info))
    }

    const waterMarkStr = (): string => {
        // Community Edition No Watermark
        if (isCommunityEdition()) {
            return ""
        } else if (userInfo.isLogin) {
            return userInfo.companyName || ""
        } else if (isEnpriTrace()) {
            return "EnpriTrace-Trial"
        } else if (isEnpriTraceAgent()) {
            return "EnpriTraceAgent-Trial"
        }
        return ""
    }

    const [defaultExpand, setDefaultExpand] = useState<boolean>(true)
    useEffect(() => {
        getRemoteValue(CodeGV.MenuExpand).then((result: string) => {
            if (!result) setDefaultExpand(true)
            try {
                const expandResult: boolean = JSON.parse(result)
                setDefaultExpand(expandResult)
            } catch (e) {
                setDefaultExpand(true)
            }
        })
    }, [])

    // Drag chartCS
    const chartCSDragAreaRef = useRef<any>(null)
    const chartCSDragItemRef = useRef<any>(null)
    const [chartCSDragAreaHeight, setChartCSDragAreaHeight] = useState<number>(0)
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
            const h = entry.target.getBoundingClientRect().height
            setChartCSDragAreaHeight(h)
        })
    })
    // Keeping Drag Element Visible on Bottom Resize
    useUpdateEffect(() => {
        if (chartCSDragItemRef.current) {
            const top = parseInt(getComputedStyle(chartCSDragItemRef.current).getPropertyValue("top"))
            const flag = top >= chartCSDragAreaHeight - 43 - 10 // Check Drag Element 10px from Bottom
            const currentTop = flag ? chartCSDragAreaHeight - 43 - 10 : top
            chartCSDragItemRef.current.style.top = currentTop + "px"
        }
    }, [chartCSDragAreaHeight, chartCSDragItemRef])

    useEffect(() => {
        if (chartCSDragAreaRef.current && chartCSDragItemRef.current) {
            const chartCSDragItemDom = chartCSDragItemRef.current
            const dragAreaDom = chartCSDragAreaRef.current

            resizeObserver.observe(dragAreaDom)
            dragAreaDom.addEventListener("dragover", function (e: {preventDefault: () => void}) {
                e.preventDefault()
            })
            dragAreaDom.addEventListener(
                "drop",
                function (e: {
                    dataTransfer: any
                    preventDefault: () => void
                    target: {getBoundingClientRect: () => any}
                    clientY: number
                }) {
                    e.preventDefault()
                    if (e.dataTransfer.getData("dragItem") === "chartCSDragItem") {
                        const rect = dragAreaDom.getBoundingClientRect()
                        const y = e.clientY - rect.top
                        const currentTop = y >= rect.height - 43 - 10 ? rect.height - 43 - 10 : y
                        chartCSDragItemDom.style.top = currentTop <= 0 ? 0 : currentTop + "px"
                    }
                }
            )
            chartCSDragItemDom.addEventListener("dragstart", function (e) {
                e.dataTransfer.setData("dragItem", "chartCSDragItem")
            })
        }
    }, [chartCSDragItemRef, chartCSDragAreaRef])

    /** -------------------- Preview Update Start -------------------- */
    // useEffect(() => {
    //     if (isCommunityEdition()) {
    //         ipcRenderer.invoke("fetch-system-name").then((type: YakitSystem) => {
    //             if (type === "Windows_NT") {
    //                 getLocalValue(LocalGV.UpdateForwardAnnouncement).then((val: string) => {
    //                     if (val !== LocalGV.JudgeUpdateForwardAnnouncement) setUpdateShow(true)
    //                 })
    //             }
    //         })
    //     }
    // }, [])
    // const [updateShow, setUpdateShow] = useState<boolean>(false)
    // const onUpdateCancenl = useMemoizedFn(() => {
    //     if (updateShow) setUpdateShow(false)
    // })
    // const onUpdateIgnore = useMemoizedFn(() => {
    //     setLocalValue(LocalGV.UpdateForwardAnnouncement, LocalGV.JudgeUpdateForwardAnnouncement)
    //     onUpdateCancenl()
    // })
    /** -------------------- Preview Update End -------------------- */

    return (
        <>
            <WaterMark content={waterMarkStr()} style={controlShow ? {display: "none"} : {overflow: "hidden", height: "100%"}}>
                <Layout
                    className='yakit-main-layout main-content-tabs yakit-layout-tabs'
                    style={controlShow ? {display: "none"} : {}}
                    ref={chartCSDragAreaRef}
                >
                    <AutoSpin spinning={loading}>
                        {isShowCustomizeMenu && (
                            <CustomizeMenu
                                visible={isShowCustomizeMenu}
                                onClose={() => setIsShowCustomizeMenu(false)}
                            />
                        )}

                        <div
                            style={{
                                display: isShowCustomizeMenu ? "none" : "flex",
                                flexDirection: "column",
                                height: "100%"
                            }}
                        >
                            {isCommunityEdition() ? (
                                <>
                                    <PublicMenu
                                        defaultExpand={defaultExpand}
                                        onMenuSelect={openMenu}
                                        setRouteToLabel={(val) => {
                                            val.forEach((value, key) => {
                                                routeKeyToLabel.current.set(key, value)
                                            })
                                        }}
                                    />
                                </>
                            ) : (
                                <HeardMenu
                                    defaultExpand={defaultExpand}
                                    onRouteMenuSelect={openMenu}
                                    setRouteToLabel={(val) => {
                                        val.forEach((value, key) => {
                                            routeKeyToLabel.current.set(key, value)
                                        })
                                    }}
                                />
                            )}
                            <MainOperatorContent routeKeyToLabel={routeKeyToLabel.current} />
                            {isShowBaseConsole && (
                                <BaseConsole
                                    setIsShowBaseConsole={setIsShowBaseConsole}
                                    directionBaseConsole={directionBaseConsole}
                                />
                            )}
                        </div>
                    </AutoSpin>

                    {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
                    <Modal
                        visible={passwordShow}
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
                    {isCommunityEdition() && <YakChatCS visible={chatShow} setVisible={setChatShow} />}
                    {isCommunityEdition() && !chatShow && (
                        <div className='chat-icon-wrapper' onClick={onChatCS} draggable={true} ref={chartCSDragItemRef}>
                            <img src={yakitCattle} />
                        </div>
                    )}
                </Layout>
            </WaterMark>
            {controlShow && <ControlOperation controlName={controlName} />}
            <YakitHintModal
                visible={false}
                title='Remote Connection Received'
                content={
                    <div>
                        User <span style={{color: "#F28B44"}}>Alex-null</span>{" "}
                        Incoming remote connection request, accept?？
                    </div>
                }
                cancelButtonText='Reject'
                okButtonText='Agree'
                onOk={() => {}}
                onCancel={() => {}}
            />

            {/* <UpdateForward
                visible={updateShow}
                onCancel={onUpdateCancenl}
                onOk={onUpdateCancenl}
                onIgnore={onUpdateIgnore}
            /> */}
        </>
    )
})

export default Main

// interface UpdateForwardProsp {
//     visible: boolean
//     onCancel: () => any
//     onOk: () => any
//     onIgnore: () => any
// }
// const UpdateForward: React.FC<UpdateForwardProsp> = memo((props) => {
//     const {visible, onCancel, onOk, onIgnore} = props

//     return (
//         <YakitModal
//             type='white'
//             maskClosable={false}
//             keyboard={false}
//             centered={true}
//             closable={false}
//             visible={visible}
//             title='Important Update Preview'
//             okText='Acknowledged!'
//             cancelText='Close'
//             cancelButtonProps={{style: {display: "none"}}}
//             onCancel={onCancel}
//             onOk={onOk}
//             footerExtra={
//                 <YakitButton type='text' onClick={onIgnore}>
//                     Do Not Remind Again
//                 </YakitButton>
//             }
//         >
//             <div className='update-forward-wrapper'>
//                 <div className='title-style'>Windows Custom Install Announcement!!!</div>
//                 <div className='content-style'>
//                     Next version custom install alert, advise backup of yakit-project folder due to data migration。
//                 </div>

//                 <div className='content-style'>
//                     <span className='highlight-style'>Notice!!</span>
//                     <div>1. Update engine before installation</div>
//                     <div>
//                         2. Migration copies yakit-project to install path, deletes original. If missing engine/data post-install, delete yakit-project from user folder for correct read
//                     </div>
//                 </div>
//             </div>
//         </YakitModal>
//     )
// })
