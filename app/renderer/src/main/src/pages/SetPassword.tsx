import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Form, Input, Button} from "antd"
import {warn,failed, success} from "@/utils/notification"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {} from "@ant-design/icons"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {loginOut, refreshToken} from "@/utils/login"
import {UserInfoProps, yakitDynamicStatus} from "@/store"
const {ipcRenderer} = window.require("electron")

export interface SetPasswordProps {
    userInfo:UserInfoProps,
    onCancel:()=>any
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}


const SetPassword: React.FC<SetPasswordProps> = (props) => {
    const [form] = Form.useForm()
    const {userInfo,onCancel} = props
    const {getFieldValue} = form;
    const [loading, setLoading] = useState<boolean>(false)
    const {dynamicStatus} = yakitDynamicStatus()
    const onFinish = useMemoizedFn((values:API.UpUserInfoRequest) => {
        const {old_pwd,pwd,confirm_pwd} = values
        if(getFieldValue("confirm_pwd")!==getFieldValue("pwd")){
            warn("New passwords do not match, please retry")
        }
        else{
            NetWorkApi<API.UpUserInfoRequest, API.ActionSucceeded>({
                method: "post",
                url: "urm/up/userinfo",
                data: {
                    old_pwd,
                    pwd,
                    confirm_pwd
                }
                })
                .then((result) => {
                    if(result.ok){
                        success("Password changed successfully, please re-login")
                        onCancel()
                        if(dynamicStatus.isDynamicStatus){
                            ipcRenderer.invoke("lougin-out-dynamic-control",{loginOut:true})
                        }
                        else{
                            loginOut(userInfo)
                            ipcRenderer.invoke("ipc-sign-out")
                        }
                    }
                })
                .catch((err) => {
                    setLoading(false)
                    failed("Pwd change failed:" + err)
                })
                .finally(() => {
                })
        }
    })
    // Input validation
    const judgePass = () => [
        {
            validator: (_, value) => {
                let re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.<>?;:\[\]{}~!@#$%^&*()_+-="])[A-Za-z\d.<>?;:\[\]{}~!@#$%^&*()_+-="]{8,20}/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("Password: 8-20 characters, must include uppercase, lowercase, digit, special char")
                }
            }
        }
    ]
    
    return (
        <div>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='old_pwd' label='Old Password' rules={[{required: true, message: "Required Field"}]}>
                    <Input.Password placeholder='Enter your old password' allowClear />
                </Form.Item>
                <Form.Item
                    name='pwd'
                    label='New Password'
                    rules={[{required: true, message: "Required Field"}, ...judgePass()]}
                >
                    <Input.Password placeholder='Enter new password' allowClear />
                </Form.Item>
                <Form.Item
                    name='confirm_pwd'
                    label='Confirm Password'
                    rules={[{required: true, message: "Required Field"}, ...judgePass()]}
                >
                    <Input.Password placeholder='Confirm your password' allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button type='primary' htmlType='submit' loading={loading}>
                        Change Password
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export default SetPassword
