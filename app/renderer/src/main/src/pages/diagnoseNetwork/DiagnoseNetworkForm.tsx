import React from "react";
import {Form} from "antd";
import {useGetState} from "ahooks";
import {InputInteger, InputItem, SwitchItem} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";

export interface DiagnoseNetworkFormProp {
    onSubmit: (params: DiagnoseNetworkParams) => any
}

export interface DiagnoseNetworkParams {
    NetworkTimeout: number
    ConnectTarget: string
    Proxy: string
    ProxyAuthUsername: string
    ProxyAuthPassword: string
    ProxyToAddr: string
}

export const DiagnoseNetworkForm: React.FC<DiagnoseNetworkFormProp> = (props) => {
    const [params, setParams] = useGetState<DiagnoseNetworkParams>({
        ConnectTarget: "www.baidu.com",
        NetworkTimeout: 5,
        Proxy: "",
        ProxyAuthPassword: "",
        ProxyAuthUsername: "",
        ProxyToAddr: ""
    });
    return <Form
        size={"small"}
        onSubmitCapture={e => {
            e.preventDefault()

            props.onSubmit(params)
        }}
    >
        <InputItem label={"Destination"}
                   setValue={ConnectTarget => setParams({...params, ConnectTarget})}
                   value={params.ConnectTarget} required={true}
        />
        <InputInteger label={"Timeout"} setValue={NetworkTimeout => setParams({...params, NetworkTimeout})}
                      value={params.NetworkTimeout}/>
        <InputItem label={"Proxy Addr"} help={"Optional, if filled, specify the proxy test target"} setValue={Proxy => setParams({...params, Proxy})} value={params.Proxy}/>
        {!!params.Proxy && <InputItem label={"Test URL"} help={"Enter the proxy address to test, e.g., www.google.com"} setValue={ProxyToAddr => setParams({...params, ProxyToAddr})} value={params.ProxyToAddr}/>}
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit"> Diagnose Network Config </YakitButton>
        </Form.Item>
    </Form>
};