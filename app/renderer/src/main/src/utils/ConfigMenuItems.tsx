import React, {useEffect, useState} from "react"
import {Button, Form, Popconfirm, Space, Spin} from "antd"
import {YakCodeEditor} from "./editors"
import {StringToUint8Array, Uint8ArrayToString} from "./str"
import {info} from "./notification"
import {InputFileNameItem, InputFileNameItemProps, SelectOne} from "./inputUtil"
import {showModal} from "./showModal"
import {saveABSFileToOpen} from "./openWebsite"
import {randomString} from "./randomUtil"

export const updateMenuItem = () => {
    ipcRenderer.invoke("change-main-menu", {}).then(() => {
        info("Update Menu Bar")
    })
}

export const showConfigMenuItems = () => {
    let m = showModal({
        title: "Configure Menu Bar",
        width: 800,
        content: (
            <ConfigMenuItems
                onFinished={() => {
                    m.destroy()
                    updateMenuItem()
                }}
            />
        )
    })
}

interface ConfigMenuItemsProp {
    onFinished?: () => any
}

const {ipcRenderer} = window.require("electron")

const ConfigMenuItems: React.FC<ConfigMenuItemsProp> = (props) => {
    const [config, setConfig] = useState("")
    const [jsonFileName, setJsonFileName] = useState("")
    const [mode, setMode] = useState<"import" | "export" | "import-file">("export")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 500)

        if (mode === "export") {
            ipcRenderer.invoke("ExportMenuItem", {}).then((rsp: {RawJson: string}) => {
                setConfig(rsp.RawJson)
            })
        } else {
            setConfig("")
        }
    }, [mode])

    return (
        <Form
            labelCol={{span: 4}}
            wrapperCol={{span: 18}}
            onSubmitCapture={(e) => {
                e.preventDefault()

                if (mode === "import") {
                    ipcRenderer
                        .invoke("ImportMenuItem", {
                            RawJson: config
                        })
                        .then(() => {
                            info("Import Success")
                            if (props.onFinished) props.onFinished()
                        })
                }

                if (mode === "import-file") {
                    ipcRenderer
                        .invoke("ImportMenuItem", {
                            JsonFileName: jsonFileName
                        })
                        .then(() => {
                            info("Import Success")
                            if (props.onFinished) props.onFinished()
                        })
                }
            }}
        >
            <SelectOne
                label={" "}
                colon={false}
                data={[
                    {text: "Import Config File", value: "import-file"},
                    {text: "Import JSON", value: "import"},
                    {text: "Export Config", value: "export"}
                ]}
                value={mode}
                setValue={setMode}
                help={
                    mode === "import" ? `Append Menu Config, No Full Overwrite` : "Export Config to JSON"
                }
            />
            {loading ? (
                <Spin />
            ) : (
                <>
                    {mode === "import" && (
                        <Form.Item label={"JSON Config"}>
                            <div style={{height: 400}}>
                                <YakCodeEditor
                                    originValue={StringToUint8Array(config, "utf8")}
                                    language={"json"}
                                    onChange={(r) => setConfig(Uint8ArrayToString(r, "utf8"))}
                                />
                            </div>
                        </Form.Item>
                    )}
                    {mode === "import-file" && (
                        <InputFileNameItem label={"Filename"} filename={jsonFileName} setFileName={setJsonFileName} />
                    )}
                    {mode === "export" && (
                        <Form.Item
                            label={"JSON Config"}
                            help={
                                <>
                                    <Button
                                        onClick={() => {
                                            saveABSFileToOpen(`config-${randomString(10)}.json`, config)
                                        }}
                                        type={"link"}
                                    >
                                        Download as JSON File
                                    </Button>
                                </>
                            }
                        >
                            <div style={{height: 400}}>
                                <YakCodeEditor
                                    originValue={StringToUint8Array(config, "utf8")}
                                    language={"json"}
                                    readOnly={true}
                                />
                            </div>
                        </Form.Item>
                    )}
                    <Form.Item colon={false} label={" "}>
                        <Space>
                            {(mode === "import" || mode === "import-file") && (
                                <Button type='primary' htmlType='submit'>
                                    {" "}
                                    Import{" "}
                                </Button>
                            )}
                            <Popconfirm
                                title={"Delete Current Config, Irreversible, Confirm?？"}
                                onConfirm={() => {
                                    ipcRenderer.invoke("DeleteAllMenuItem", {}).then(() => {
                                        info("Deleted All Menu Configs Successfully")
                                        if (props.onFinished) props.onFinished()
                                    })
                                }}
                            >
                                <Button type={"primary"} danger={true}>
                                    {" "}
                                    Delete All{" "}
                                </Button>
                            </Popconfirm>
                        </Space>
                    </Form.Item>
                </>
            )}
        </Form>
    )
}
