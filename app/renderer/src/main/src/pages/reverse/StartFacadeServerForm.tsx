import React, {useEffect, useState} from "react";
import {Button, Form} from "antd";
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil";

export interface GetTunnelServerExternalIPParams {
    Addr: string
    Secret: string
}

export interface StartFacadeServerParams {
    LocalFacadeHost: string
    LocalFacadePort: number

    EnableDNSLogServer: boolean
    DNSLogLocalPort: number

    // bridge
    ConnectParam?: GetTunnelServerExternalIPParams
    Verify?: boolean

    // remote
    FacadeRemotePort: number
    DNSLogRemotePort: number
    ExternalDomain: string
}

export interface StartFacadeServerFormProp {
    params: StartFacadeServerParams
    setParams: (p: StartFacadeServerParams) => any
    onSubmit: () => any
    remoteMode?: boolean
}

export const StartFacadeServerForm: React.FC<StartFacadeServerFormProp> = (props) => {
    const [remoteMode, setRemoteMode] = useState(false);
    const {params, setParams} = props;

    useEffect(() => {
        if (remoteMode) {
            setParams({...params, FacadeRemotePort: params.LocalFacadePort})
            if (params.EnableDNSLogServer) {
                setParams({...params, DNSLogRemotePort: params.DNSLogLocalPort})
            }
        } else {
            setParams({...params, FacadeRemotePort: 0})
            setParams({...params, DNSLogRemotePort: 0})
        }
    }, [remoteMode])

    return <div style={{marginTop: 20}}>
        <Form
            layout={"horizontal"} labelCol={{span: 5}} wrapperCol={{span: 17}}
            onSubmitCapture={e => {
                e.preventDefault()
                props.onSubmit();
            }}
        >
            <InputItem
                label={"Reverse Connect Server Address"}
                setValue={LocalFacadeHost => setParams({...params, LocalFacadeHost})}
                value={params.LocalFacadeHost}
                autoComplete={[
                    "0.0.0.0", "127.0.0.1",
                ]}
            />
            <InputInteger
                label={"Reverse Connect Server Port"}
                setValue={LocalFacadePort => setParams({...params, LocalFacadePort})} value={params.LocalFacadePort}
            />
            <SwitchItem label={"DNSLog"} setValue={EnableDNSLogServer => setParams({...params, EnableDNSLogServer})}
                        value={params.EnableDNSLogServer} help={"Start a Local DNS Server (UDP)"}
            />
            {params.EnableDNSLogServer && <>
                <InputInteger
                    label={"DNSLog Local Port"}
                    setValue={DNSLogLocalPort => setParams({...params, DNSLogLocalPort})} value={params.DNSLogLocalPort}
                />
            </>}
            {props.remoteMode && <>
                <SwitchItem label={"Public Network Penetration"} value={remoteMode} setValue={setRemoteMode}/>
                {remoteMode && <>
                    {/*<InputInteger label={"Public DNSLog Port"}*/}
                    {/*              setValue={DNSLogRemotePort => setParams({...params, DNSLogRemotePort})}*/}
                    {/*              value={params.DNSLogRemotePort}/>*/}
                    <InputInteger label={"Public Reverse Connect Server Port"}
                                  setValue={FacadeRemotePort => setParams({...params, FacadeRemotePort})}
                                  value={params.FacadeRemotePort}/>
                </>}
            </>}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> Start Reverse Connect Server </Button>
            </Form.Item>
        </Form>
    </div>
};