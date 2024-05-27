import React, {useEffect, useState, useRef} from "react"
import {AutoComplete, Button, Form, Input, Select, Tooltip} from "antd"
import "./ConfigPrivateDomain.scss"
import {NetWorkApi} from "@/services/fetch"
import {failed, success, yakitFailed} from "@/utils/notification"
import {loginOut, aboutLoginUpload, loginHTTPFlowsToOnline} from "@/utils/login"
import {useDebounceFn, useMemoizedFn, useGetState} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useStore} from "@/store"
import yakitImg from "@/assets/yakit.jpg"
import {API} from "@/services/swagger/resposeType"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "../yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {InformationCircleIcon} from "@/assets/newIcon"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {YakitAutoCompleteRefProps} from "../yakitUI/YakitAutoComplete/YakitAutoCompleteType"
const {ipcRenderer} = window.require("electron")

interface OnlineProfileProps {
    BaseUrl: string
    Proxy: string
    user_name: string
    pwd: string
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}

interface ConfigPrivateDomainProps {
    onClose?: () => void
    onSuccee?: () => void
    // Enterprise login?
    enterpriseLogin?: boolean | undefined
    // Show skip option?
    skipShow?: boolean
}

export const ConfigPrivateDomain: React.FC<ConfigPrivateDomainProps> = React.memo((props) => {
    const {onClose, onSuccee, enterpriseLogin = false, skipShow = false} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const httpHistoryRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [defaultHttpUrl, setDefaultHttpUrl] = useState<string>("")
    const httpProxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [formValue, setFormValue, getFormValue] = useGetState<OnlineProfileProps>({
        BaseUrl: "",
        Proxy: "",
        user_name: "",
        pwd: ""
    })
    useEffect(() => {
        getHttpSetting()
    }, [])
    // Global listen to login status
    const {userInfo, setStoreUserInfo} = useStore()

    const syncLoginOut = async () => {
        try {
            await loginOut(userInfo)
        } catch (error) {}
    }
    // Enterprise Login
    const loginUser = useMemoizedFn(() => {
        const {user_name, pwd} = getFormValue()
        NetWorkApi<API.UrmLoginRequest, API.UserData>({
            method: "post",
            url: "urm/login",
            data: {
                user_name,
                pwd
            }
        })
            .then((res: API.UserData) => {
                ipcRenderer.invoke("company-sign-in", {...res}).then((data) => {
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
                        token: res.token,
                        checkPlugin: res?.checkPlugin || false
                    }
                    setStoreUserInfo(user)
                    if (data?.next) {
                        aboutLoginUpload(res.token)
                        loginHTTPFlowsToOnline(res.token)
                        success("Enterprise login successful")
                        onClose && onClose()
                        onSuccee && onSuccee()
                    }
                    // Force password change on first login
                    if (!res.loginTime) {
                        ipcRenderer.invoke("reset-password", {...res})
                    }
                })
            })
            .catch((err) => {
                setTimeout(() => setLoading(false), 300)
                failed("Enterprise login failed：" + err)
            })
            .finally(() => {})
    })

    const onFinish = useMemoizedFn((v: OnlineProfileProps) => {
        setLoading(true)
        const values = {
            ...formValue,
            ...v,
            IsCompany: enterpriseLogin
        }
        ipcRenderer
            .invoke("SetOnlineProfile", {
                ...values
            })
            .then((data) => {
                addHttpHistoryList(values.BaseUrl)
                if (values.Proxy) {
                    addProxyList(values.Proxy)
                }
                setFormValue(values)
                if (!enterpriseLogin) {
                    ipcRenderer.invoke("ipc-sign-out")
                    success("Private domain set successfully")
                    syncLoginOut()
                    onClose && onClose()
                }
                ipcRenderer.send("edit-baseUrl", {baseUrl: values.BaseUrl})
                if (v?.pwd) {
                    // Encrypt
                    ipcRenderer
                        .invoke("Codec", {Type: "base64", Text: v.pwd, Params: [], ScriptName: ""})
                        .then((res) => {
                            setRemoteValue(RemoteGV.HttpSetting, JSON.stringify({...values, pwd: res.Result}))
                        })
                        .catch(() => {})
                } else {
                    setRemoteValue(RemoteGV.HttpSetting, JSON.stringify(values))
                }
            })
            .catch((e: any) => {
                // !enterpriseLogin && setTimeout(() => setLoading(false), 300)
                failed("Failed to set private domain:" + e)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })
    useEffect(() => {
        ipcRenderer.on("edit-baseUrl-status", (e, res: any) => {
            enterpriseLogin && loginUser()
            emiter.emit("onSwitchPrivateDomain", "") // Signal sent after successfully modifying private domain
        })
        return () => {
            ipcRenderer.removeAllListeners("edit-baseUrl-status")
        }
    }, [])
    const addHttpHistoryList = useMemoizedFn((url) => {
        httpHistoryRef.current.onSetRemoteValues(url)
    })
    const getHttpSetting = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (!setting) return
            const value = JSON.parse(setting)
            setDefaultHttpUrl(value.BaseUrl)
            if (value?.pwd && value.pwd.length > 0) {
                // Decrypt
                ipcRenderer
                    .invoke("Codec", {Type: "base64-decode", Text: value.pwd, Params: [], ScriptName: ""})
                    .then((res) => {
                        form.setFieldsValue({
                            ...value,
                            pwd: res.Result
                        })
                        setFormValue({...value, pwd: res.Result})
                    })
                    .catch(() => {})
            } else {
                form.setFieldsValue({
                    ...value
                })
                setFormValue({...value})
            }
        })
    })
    /**@Add proxy list history to description */
    const addProxyList = useMemoizedFn((url) => {
        httpProxyRef.current.onSetRemoteValues(url)
    })
    // Check if input passes
    const judgePass = () => [
        {
            validator: (_, value) => {
                let re =
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.<>?;:\[\]{}~!@#$%^&*()_+-="])[A-Za-z\d.<>?;:\[\]{}~!@#$%^&*()_+-="]{8,20}/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("Password 8-20 chars, incl. upper/lowercase, digits, special chars")
                }
            }
        }
    ]
    // Check if URL
    const judgeUrl = () => [
        {
            validator: (_, value) => {
                let re = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
                if (/\s/.test(value)) {
                    return Promise.reject("Private domain address contains spaces")
                } else if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("Enter a valid private domain address")
                }
            }
        }
    ]
    return (
        <div className='private-domain'>
            {enterpriseLogin && (
                <div className='login-title-show'>
                    <div className='icon-box'>
                        <img src={yakitImg} className='type-icon-img' />
                    </div>
                    <div className='title-box'>Enterprise Login</div>
                </div>
            )}
            <Form {...layout} form={form} name='control-hooks' onFinish={(v) => onFinish(v)} size='small'>
                <Form.Item
                    name='BaseUrl'
                    label='Private Domain Address'
                    rules={[{required: true, message: "Required field"}, ...judgeUrl()]}
                >
                    <YakitAutoComplete
                        ref={httpHistoryRef}
                        cacheHistoryDataKey={CacheDropDownGV.ConfigBaseUrl}
                        initValue={defaultHttpUrl}
                        placeholder='Enter your private domain address'
                        defaultOpen={!enterpriseLogin}
                    />
                </Form.Item>
                {!enterpriseLogin && (
                    <Form.Item
                        name='Proxy'
                        label={
                            <span className='form-label'>
                                Set Proxy
                                <Tooltip
                                    title='Set proxy when unable to access plugin store'
                                    overlayStyle={{width: 150}}
                                >
                                    <InformationCircleIcon className='info-icon' />
                                </Tooltip>
                            </span>
                        }
                    >
                        <YakitAutoComplete
                            ref={httpProxyRef}
                            cacheHistoryDataKey={CacheDropDownGV.ConfigProxy}
                            placeholder='Set Proxy'
                        />
                    </Form.Item>
                )}
                {enterpriseLogin && (
                    <Form.Item name='user_name' label='Username' rules={[{required: true, message: "Required field"}]}>
                        <YakitInput placeholder='Enter your username' allowClear />
                    </Form.Item>
                )}
                {enterpriseLogin && (
                    <Form.Item
                        name='pwd'
                        label='Password'
                        rules={[{required: true, message: "Required field"}, ...judgePass()]}
                    >
                        <YakitInput.Password placeholder='Enter your password' allowClear />
                    </Form.Item>
                )}
                {enterpriseLogin ? (
                    <Form.Item label={" "} colon={false} className='form-item-submit'>
                        {skipShow && (
                            <YakitButton
                                style={{width: 165, marginRight: 12}}
                                onClick={() => {
                                    onSuccee && onSuccee()
                                }}
                                size='large'
                            >
                                Skip
                            </YakitButton>
                        )}
                        <YakitButton
                            size='large'
                            type='primary'
                            htmlType='submit'
                            style={{width: 165, marginLeft: skipShow ? 0 : 43}}
                            loading={loading}
                        >
                            Login
                        </YakitButton>
                    </Form.Item>
                ) : (
                    <div className='form-btns'>
                        <YakitButton type='outline2' onClick={(e) => onClose && onClose()}>
                            Cancel
                        </YakitButton>
                        <YakitButton type='primary' htmlType='submit' loading={loading}>
                            Confirm
                        </YakitButton>
                    </div>
                )}
            </Form>
        </div>
    )
})
