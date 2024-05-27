import React, {useEffect, useState} from "react"
import {randomString} from "./randomUtil"
import {info} from "./notification"
import {showModal} from "./showModal"
import {Button, Form, Space} from "antd"
import {InputItem, SwitchItem} from "./inputUtil"
import {AutoCard} from "../components/AutoCard"
import {useGetState} from "ahooks"
import {openABSFileLocated} from "./openWebsite"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"

export interface ExtractableValue {
    StringValue: string
    BytesValue: Uint8Array
}

export interface ExtractableData {
    [key: string]: ExtractableValue
}

export interface GeneralExporterProp extends basicConfig {
    Data: ExtractableData[]
}

interface basicConfig {
    JsonOutput: boolean
    CSVOutput: boolean
    DirName: string
    FilePattern: string
}

const {ipcRenderer} = window.require("electron")

const GeneralExporter: React.FC<GeneralExporterProp> = (props) => {
    const [token, setToken] = useState(randomString(30))
    const [paths, setPaths, getPaths] = useGetState<string[]>([])

    useEffect(() => {
        if (!token) {
            return
        }

        ipcRenderer.on(`${token}-data`, (_, data: {FilePath: string}) => {
            const origin = getPaths()
            origin.push(data.FilePath)
            setPaths(origin.map((v) => v))
        })
        ipcRenderer.on(`${token}-end`, () => {
            info("Export complete")
        })
        ipcRenderer.on(`${token}-error`, (_, e) => {})

        const {JsonOutput, CSVOutput, DirName, FilePattern} = props
        ipcRenderer
            .invoke("ExtractDataToFile", {
                token,
                params: {JsonOutput, CSVOutput, DirName, FilePattern}
            })
            .then(() => {
                info("Send generated file config success...")
            })
        props.Data.forEach((value) => {
            ipcRenderer
                .invoke("ExtractDataToFile", {
                    token,
                    params: {Data: value}
                })
                .then(() => {})
        })
        ipcRenderer.invoke("ExtractDataToFile", {token, params: {Finished: true}})

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return (
        <AutoCard title={"Retrieve generated file (click to open file location）"}>
            <Space direction={"vertical"}>
                {paths.map((i) => {
                    return (
                        <YakitButton
                            type='text'
                            onClick={() => {
                                openABSFileLocated(i)
                            }}
                        >
                            {i}
                        </YakitButton>
                    )
                })}
            </Space>
        </AutoCard>
    )
}

export const exportData = (data: ExtractableData[]) => {
    showYakitModal({
        title: "Data Export",
        width: "60%",
        footer: null,
        content: (
            <>
                <GeneralExporterForm Data={data} />
            </>
        )
    })
}

export const testExportData = () => {
    exportData([
        {KYE: {StringValue: "asdfasdfasdfasdfasdf", BytesValue: new Uint8Array()}},
        {KYE: {StringValue: "asdfasasdf", BytesValue: new Uint8Array()}},
        {KYE: {StringValue: "asdfassdf", BytesValue: new Uint8Array()}}
    ])
}

interface GeneralExporterFormProp {
    Config?: basicConfig
    Data: ExtractableData[]
}

const GeneralExporterForm: React.FC<GeneralExporterFormProp> = (props) => {
    const [params, setParams] = useState<basicConfig>(
        !!props.Config
            ? props.Config
            : {
                  CSVOutput: true,
                  DirName: "",
                  FilePattern: "",
                  JsonOutput: true
              }
    )
    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                showYakitModal({
                    title: "Generate export file",
                    width: "50%",
                    footer: null,
                    content: <GeneralExporter {...params} Data={props.Data} />
                })
            }}
            style={{padding: 24}}
        >
            <Form.Item label={"Export JSON"} valuePropName='checked'>
                <YakitSwitch
                    onChange={(JsonOutput) => setParams({...params, JsonOutput})}
                    checked={params.JsonOutput}
                />
            </Form.Item>
            <Form.Item label={"Export CSV"} valuePropName='checked'>
                <YakitSwitch onChange={(CSVOutput) => setParams({...params, CSVOutput})} checked={params.CSVOutput} />
            </Form.Item>
            <Form.Item label={"Output to directory"} valuePropName='checked'>
                <YakitInput
                    placeholder={"Empty by default, yakit temp directory"}
                    onChange={(e) => setParams({...params, DirName: e.target.value})}
                    value={params.DirName}
                />
            </Form.Item>
            <Form.Item label={"Filename"} valuePropName='checked'>
                <YakitInput
                    placeholder={"'*' Random string fill-in, no suffix required"}
                    onChange={(e) => setParams({...params, FilePattern: e.target.value})}
                    value={params.FilePattern}
                />
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <YakitButton type='primary' htmlType='submit'>
                    Generate data to local file{" "}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}
