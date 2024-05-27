import React, {useState} from "react";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {Button, Form} from "antd";
import {InputItem} from "../../../utils/inputUtil";
import {YakEditor} from "../../../utils/editors";
import {saveABSFileToOpen} from "../../../utils/openWebsite";
import moment from "moment";
import {YakScriptParamsSetter} from "../YakScriptParamsSetter";
import {ImportMenuConfig} from "./consts_importConfigYakCode";
import {StartExecYakCodeModal, YakScriptParam} from "../../../utils/basic";

export interface SaveConfigProp {
    QueryConfig: SimpleQueryYakScriptSchema
    onSave: (filename: string) => any
}

export interface BatchScanConfig {
    group: string
    name: string
    query: SimpleQueryYakScriptSchema
}

export const SaveConfig: React.FC<SaveConfigProp> = (props) => {
    const [params, setParams] = useState<BatchScanConfig>({group: "", name: "", query: props.QueryConfig});
    return <div>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()
                const filename = `config-${moment().format("YYYY-MM-DD-HH-mm-SS")}.json`
                saveABSFileToOpen(filename, JSON.stringify(params))
                if (!!props.onSave) {
                    props.onSave(filename)
                }
            }}
        >
            <InputItem required={true} label={"Menu Group"} setValue={Group => setParams({...params, group: Group})}
                       value={params.group}/>
            <InputItem required={true} label={"Submenu"} setValue={Name => setParams({...params, name: Name})}
                       value={params.name}/>
            <Form.Item label={"Content"}>
                <div style={{height: 300}}>
                    <YakEditor type={"http"} readOnly={true} value={JSON.stringify(params.query)}/>
                </div>
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> Save Locally </Button>
            </Form.Item>
        </Form>
    </div>
};

export interface ImportConfigProp {

}

export const ImportConfig: React.FC<ImportConfigProp> = (props) => {
    const [startExecYakCodeModalVisible, setStartExecYakCodeModalVisible] = useState<boolean>(false)
    const [startExecYakCodeVerbose, setStartExecYakCodeVerbose] = useState<string>("")
    const [startExecYakCodeParams, setStartExecYakCodeParams] = useState<YakScriptParam>()
    
    return <div>
        <YakScriptParamsSetter
            Params={ImportMenuConfig.Params} primaryParamsOnly={true}
            onParamsConfirm={params => {
                setStartExecYakCodeModalVisible(true)
                setStartExecYakCodeVerbose("Import Config")
                setStartExecYakCodeParams({
                    Script: ImportMenuConfig.Code,
                    Params: params,
                })
            }}
        />
         <StartExecYakCodeModal
            visible={startExecYakCodeModalVisible}
            verbose={startExecYakCodeVerbose}
            params={startExecYakCodeParams as YakScriptParam}
            onClose={() => {
                setStartExecYakCodeModalVisible(false)
                setStartExecYakCodeVerbose("")
                setStartExecYakCodeParams(undefined)
            }}
            successInfo={false}
        ></StartExecYakCodeModal>
    </div>
};