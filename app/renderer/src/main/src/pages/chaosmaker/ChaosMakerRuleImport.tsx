import React, {useState} from "react";
import {Form, Popconfirm, Space} from "antd";
import {SelectOne} from "@/utils/inputUtil";
import {YakEditor} from "@/utils/editors";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {useMemoizedFn} from "ahooks";
import {failed, info} from "@/utils/notification";

export interface ChaosMakerRuleImportProp {
    onFinished?: ()=>any
}

export interface ChaosMakerRuleImportParams {
    RuleType: string
    Content: string
}

const {ipcRenderer} = window.require("electron");

export const ChaosMakerRuleImport: React.FC<ChaosMakerRuleImportProp> = (props) => {
    const [params, setParams] = useState<ChaosMakerRuleImportParams>({
        RuleType: "suricata", Content: "",
    });

    const onSubmit = useMemoizedFn(() => {
        if (params.Content === "") {
            failed("Rule content empty")
            return
        }

        ipcRenderer.invoke("ImportChaosMakerRules", {...params}).then(()=>{
            info("Import Success")
            if (props.onFinished) {
                props.onFinished()
            }
        })
    })

    return <AutoCard size={"small"} bordered={true} title={"Import Traffic Rules"} extra={(
        <Space>
            <Popconfirm
                title={"Confirm rule import?？"}
                onConfirm={()=>{
                    onSubmit()
                }}
            >
                <YakitButton>Import Traffic Rules</YakitButton>
            </Popconfirm>
        </Space>
    )}>
        <Form
            onSubmitCapture={e => {
                e.preventDefault()

                onSubmit()
            }}
            layout={"vertical"}
        >
            <SelectOne label={"Traffic Type"} data={[
                {value: "suricata", text: "Suricata Traffic Rules"},
                {value: "http-request", text: "HTTP"},
                {value: "tcp", text: "TCP"},
                {value: "icmp", text: "ICMP"},
                {value: "linklayer", text: "Link Layer"},
            ]} setValue={RuleType => setParams({...params, RuleType})} value={params.RuleType}/>
            <Form.Item label={"Rules"} style={{height: "100%"}} required={true}>
                <div style={{height: "300px"}}>
                    <YakEditor
                        type={"html"}
                        setValue={Content => setParams({...params, Content})}
                        value={params.Content}
                        noMiniMap={true}
                    />
                </div>
            </Form.Item>
        </Form>
    </AutoCard>
};