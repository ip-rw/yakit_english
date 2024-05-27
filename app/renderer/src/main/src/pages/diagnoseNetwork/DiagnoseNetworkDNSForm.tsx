import React, {useState} from "react";
import {Form} from "antd";
import {InputItem} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";

export interface DiagnoseNetworkDNSFormProp {
    onSubmit: (data: { Domain: string }) => any
}

export const DiagnoseNetworkDNSForm: React.FC<DiagnoseNetworkDNSFormProp> = (props) => {
    const [params, setParams] = useState<{ Domain: string }>({Domain: "www.baidu.com"});
    return <Form size={"small"} onSubmitCapture={e => {
        e.preventDefault()

        props.onSubmit(params)
    }}>
        <InputItem
            label={"Test Domain"} setValue={Domain => setParams({...params, Domain})} value={params.Domain}
            required={true}
        />
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit"> Test DNS Availability </YakitButton>
        </Form.Item>
    </Form>
};