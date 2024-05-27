import React, {useState} from "react"
import {Form} from "antd"
import {InputItem} from "@/utils/inputUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

export interface TracerouteFormProp {
    onSubmit: (data: {Host: string}) => any
}

export const TracerouteForm: React.FC<TracerouteFormProp> = (props) => {
    const [params, setParams] = useState<{Host: string}>({Host: "8.8.8.8"})
    return (
        <Form
            size={"small"}
            onSubmitCapture={(e) => {
                e.preventDefault()
                props.onSubmit(params)
            }}
        >
            <InputItem
                label={"Host"}
                setValue={(Host) => setParams({...params, Host})}
                value={params.Host}
                required={true}
            />
            <Form.Item colon={false} label={" "}>
                <YakitButton type='primary' htmlType='submit'>
                    {" "}
                    TraceNetPath{" "}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}
