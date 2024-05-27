import React, {useEffect, useRef, useState} from "react"
import {Form, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, info, warn, yakitNotify} from "@/utils/notification"
import "./index.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitRoute} from "@/routes/newRoute"

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}
const tailLayout = {
    wrapperCol: {offset: 5, span: 16}
}

const {ipcRenderer} = window.require("electron")

interface ShareImportProps {
    onClose: () => void
}

interface pwdRequestProps {
    share_id: string
    token: string
}

export function onImportShare() {
    const m = showYakitModal({
        title: "Import data packet ID",
        content: <ShareImport onClose={() => m.destroy()} />,
        footer: null
    })
}

export const ShareImport: React.FC<ShareImportProps> = (props) => {
    const {onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowPassword, setIsShowPassword] = useState<boolean>(false)
    // Global Login Listener
    const {userInfo} = useStore()
    const onFinish = useMemoizedFn((value) => {
        if (value.extract_code) {
            onShareExtract(value)
        } else {
            onExtractPwd(value)
        }
    })
    /**
     * @Desc verify password first
     */
    const onExtractPwd = useMemoizedFn((value) => {
        setLoading(true)
        const pwdRequest: pwdRequestProps = {
            share_id: value.share_id,
            token: userInfo.token
        }
        NetWorkApi<pwdRequestProps, boolean>({
            url: "module/extract/pwd",
            method: "get",
            params: {...pwdRequest}
        })
            .then((pwd) => {
                if (pwd) {
                    setIsShowPassword(true)
                    warn("Share requires password input!")
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                } else {
                    onShareExtract(value)
                }
            })
            .catch((err) => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
                yakitNotify("error", "Password verification failed：" + err)
            })
    })
    /**
     * @Desc get share data
     */
    const onShareExtract = useMemoizedFn((value) => {
        if (userInfo.isLogin) {
            value.token = userInfo.token
        }
        setLoading(true)
        NetWorkApi<API.ShareResponse, API.ExtractResponse>({
            url: "module/extract",
            method: "post",
            data: value
        })
            .then((res) => {
                switch (res.module) {
                    case "fuzzer":
                        handleWebFuzzerShare(res)
                        break
                    case YakitRoute.HTTPHacker:
                    case YakitRoute.DB_HTTPHistory:
                        handleHttpHistoryShare(res)
                        break
                    default:
                        break
                }
            })
            .catch((err) => {
                yakitNotify("error", "Get share data failed：" + err)
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleWebFuzzerShare = useMemoizedFn((res: API.ExtractResponse) => {
        ipcRenderer
            .invoke("send-to-tab", {
                type: res.module,
                data: {
                    shareContent: res.extract_content
                }
            })
            .then(() => {
                onClose()
            })
            .catch((err) => {
                yakitNotify("error", "Open web fuzzer failed:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleHttpHistoryShare = useMemoizedFn((res: API.ExtractResponse) => {
        ipcRenderer
            .invoke("HTTPFlowsExtract", {
                ShareExtractContent: res.extract_content
            })
            .then(() => {
                ipcRenderer
                    .invoke("send-to-tab", {
                        type: res.module
                    })
                    .then(() => {
                        setTimeout(() => {
                            ipcRenderer.invoke("send-positioning-http-history", {
                                activeTab: "history"
                            })
                        }, 200)
                    })
                onClose()
            })
            .catch((err) => {
                yakitNotify("error", "Save HttpHistory share data failed" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    return (
        <>
            <Form {...layout} name='control-hooks' onFinish={onFinish} style={{padding: 24}}>
                <Form.Item name='share_id' label='Share ID' rules={[{required: true, message: "Required Field"}]}>
                    <YakitInput placeholder='Enter share ID' />
                </Form.Item>
                {isShowPassword && (
                    <Form.Item name='extract_code' label='Password' rules={[{required: true, message: "Required Field"}]}>
                        <YakitInput placeholder='Enter Password' allowClear />
                    </Form.Item>
                )}
                <Form.Item {...tailLayout}>
                    <YakitButton type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                        Confirm
                    </YakitButton>
                </Form.Item>
            </Form>
        </>
    )
}
