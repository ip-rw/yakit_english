import React, {useState} from "react";
import {Empty, Form, Popconfirm, Space, Steps} from "antd";
import {randomString} from "@/utils/randomUtil";
import {ExecuteChaosMakerRuleRequest} from "@/pages/chaosmaker/ChaosMakerOperators";
import {InputInteger, SelectOne} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import "./ChaosMakerRunningSteps.scss"
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {AutoCard} from "@/components/AutoCard";
import {PluginResultUI, StatusCardProps} from "@/pages/yakitStore/viewers/base";
import {StatisticCard} from "@ant-design/pro-card";
import {StatusCardViewer} from "@/pages/mitm/MITMYakScriptLoader";

export interface ChaosMakerRunningStepsProp {
    params?: ExecuteChaosMakerRuleRequest
}

const {ipcRenderer} = window.require("electron");

export const ChaosMakerRunningSteps: React.FC<ChaosMakerRunningStepsProp> = (props) => {
    const [token, setToken] = useState(randomString(20));
    const [step, setStep] = useState(0);
    const [params, setParams] = useState<ExecuteChaosMakerRuleRequest>(props.params || {
        Groups: [],
        ExtraOverrideDestinationAddress: [],
        ExtraRepeat: 1,
        TrafficDelayMinSeconds: 1,
        TrafficDelayMaxSeconds: 20,
        GroupGapSeconds: 1,
        Concurrent: 10,
    });
    const [msg, setMsg] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        `ExecuteChaosMakerRule`,
        "ExecuteChaosMakerRule",
        token,
        () => {
            setExecuting(false)
            setStep(2)
        }
    )

    return <Space direction={"vertical"} style={{width: "100%"}}
    >
        {params && <Steps
            className={"chaos-maker-rule-steps"}
            current={step}
        >
            <Steps.Step
                className={step === 0 ? "chaos-maker-rule-step-active" : "chaos-maker-rule-step"}
                stepIndex={0} key={0} title={"Parameter"}
                description={<div>
                    Set Extra Params <br/>
                    Prepare to Observe
                </div>}
            />
            <Steps.Step
                className={step === 1 ? "chaos-maker-rule-step-active" : (
                    step > 1 ?  "chaos-maker-rule-step" :  "chaos-maker-rule-step-unactive"
                )}
                stepIndex={1} key={1} title={"Run Sim Attack"} description={(
                <>
                    {
                        step === 1 && <Popconfirm
                            title={"Confirm Stop Current Process？"}
                            onConfirm={() => {
                                ipcRenderer.invoke("cancel-ExecuteChaosMakerRule", token)
                            }}
                        >
                            <YakitButton type="primary" colors="danger" onClick={() => {

                            }}>
                                Stop Simulation
                            </YakitButton>
                        </Popconfirm>

                    }
                </>
            )}/>
            <Steps.Step className={step === 2 ? "chaos-maker-rule-step-active" : (
                step > 2 ?  "chaos-maker-rule-step" :  "chaos-maker-rule-step-unactive"
            )} stepIndex={2}
                        key={2} title={"Sim Attack Report"}/>
        </Steps>}
        {!params && <Empty description={"Select Desired Scenario Rules"}/>}
        {step === 0 && <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()

                setStep(1)
                ipcRenderer.invoke("ExecuteChaosMakerRule", params, token)
            }}
        >
            <InputInteger label={"Concurrent Sims"} setValue={Concurrent => setParams({...params, Concurrent})}
                          value={params.Concurrent} help={"Higher Concurrency, Faster Sim Speed"}/>
            <SelectOne oldTheme={false} label={"Repeat Sim"} data={[
                {text: "Infinite Repeat", value: -1},
                {text: "NoRepeat", value: 0},
                {text: "Repeat 10 Times", value: 10},
            ]} setValue={ExtraRepeat => setParams({...params, ExtraRepeat})} value={params.ExtraRepeat}/>
            <InputInteger label={"Scenario Interval"} help={"Seconds Between Major Sim Categories"}
                          setValue={GroupGapSeconds => setParams({...params, GroupGapSeconds})}
                          value={params.GroupGapSeconds}/>
            <Form.Item colon={false} label={" "}>
                <YakitButton size={"max"} type="primary" htmlType="submit"> Run Sim Scenario </YakitButton>
            </Form.Item>
        </Form>}
        {step === 1 && <AutoCard style={{padding: 0, marginTop: 10, height: "100%"}} bordered={false} bodyStyle={{
            padding: 0, margin: 0,
        }}
        >
            <PluginResultUI
                debugMode={false} defaultConsole={false}
                results={infoState.messageState}
                progress={infoState.processState}
                risks={infoState.riskState}
                featureType={infoState.featureTypeState}
                feature={infoState.featureMessageState}
                statusCards={infoState.statusState}
                loading={executing}
                onXtermRef={setXtermRef}
            />
        </AutoCard>}
        {step === 2 && <AutoCard
            style={{padding: 0, marginTop: 10, height: "100%"}}
            bordered={false}
            bodyStyle={{
                padding: 0, margin: 0,
            }}
        >
            <StatusCardViewer status={(() => {
                const data: StatusCardProps[] = [];
                infoState.statusState.forEach((i) => {
                    i.info.map(i => {
                        data.push({
                            Id: i.Id, Data: i.Data, Timestamp: i.Timestamp,
                        })
                    })
                })
                return data
            })()}/>
        </AutoCard>}
    </Space>

};