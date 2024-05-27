import React, {useEffect, useState} from "react"
import {Form, Space} from "antd"
import {YakEditor} from "../../utils/editors"
import {callCopyToClipboard} from "../../utils/basic"
import {AutoCard} from "../../components/AutoCard"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState, useMemoizedFn} from "ahooks"
import {RefreshIcon} from "@/assets/newIcon"
import {ExclamationCircleOutlined, FullscreenOutlined} from "@ant-design/icons/lib"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import styles from "./HTTPFuzzerHotPatch.module.scss"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {yakitNotify} from "@/utils/notification"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {WEB_FUZZ_HOTPATCH_CODE} from "@/defaultConstants/HTTPFuzzerPage"

export interface HTTPFuzzerHotPatchProp {
    onInsert?: (s: string) => any
    onSaveCode?: (code: string) => any
    onSaveHotPatchCodeWithParamGetterCode?: (code: string) => any
    onCancel: () => void
    initialHotPatchCode?: string
    initialHotPatchCodeWithParamGetter?: string
}

const HotPatchDefaultContent = `// Use Tags {{yak(handle|param)}} Triggers hot reload calls
handle = func(param) {
    // Can directly return a string here
    return codec.EncodeBase64("base64-prefix" + param) + sprintf("_origin(%v)", param)
}

// Use Tags {{yak(handle1|...)}} Triggers hot reload calls
handle1 = func(param) {
    // This special Hook also supports returning arrays
    return ["12312312", "abc", "def"]
}

// beforeRequest allows for preprocessing data before sending, defined as func(origin []byte) []byte
beforeRequest = func(req) {
    /*
        // We can provide some basic usages, like simply replacing a timestamp～
        req = str.ReplaceAll(req, "TIMESTAMP_INT64", sprint(time.Now().Unix()))
    */ 
    return []byte(req)
}

// afterRequest allows processing for each response, defined as func(origin []byte) []byte
afterRequest = func(rsp) {
    return []byte(rsp)
}

// mirrorHTTPFlow allows processing for each request response, defined as func(req []byte, rsp []byte, params map[string]any) map[string]any
// Returned values serve as parameters for the next request or extracted data, ideal for decrypting response content here
mirrorHTTPFlow = func(req, rsp, params) {
    return params
}
`

const HotPatchParamsGetterDefault = `__getParams__ = func() {
    /*
        __getParams__ is a user-controllable parameter for generating initial complex data：
        Can process all data in this function：
        
        1. CSRF Bypass
        2. Gather additional info for strong correlation transformations
    */
    return {
        // "array-params": [1, 2, 3, 512312],  # Available {{params(array-params)}}
        // "foo-params": "asdfasdfassss",      # Available {{params(foo-params)}}
    }
}`

const {ipcRenderer} = window.require("electron")

const HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG = "HTTPFuzzerHotPatch_DYNAMICPARAMS_FLAG"
const HTTPFuzzerHotPatch_TEMPLATE_DEMO = "HTTPFuzzerHotPatch_TEMPLATE_DEMO"

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
    const [params, setParams, getParams] = useGetState({
        Template: `{{yak(handle|{{params(test)}})}}`,
        HotPatchCode: !!props.initialHotPatchCode ? props.initialHotPatchCode : HotPatchDefaultContent,
        HotPatchCodeWithParamGetter: !!props.initialHotPatchCodeWithParamGetter
            ? props.initialHotPatchCodeWithParamGetter
            : HotPatchParamsGetterDefault,
        TimeoutSeconds: 20,
        Limit: 300
    })
    const [loading, setLoading] = useState(false)
    const [hotPatchEditorHeight, setHotPatchEditorHeight] = useState(400)
    const [paramEditorHeight, setParamEditorHeight] = useState(250)

    useEffect(() => {
        getRemoteValue(HTTPFuzzerHotPatch_TEMPLATE_DEMO).then((e) => {
            if (!!e) {
                setParams({...params, Template: e})
            }
        })
        return () => {
            setRemoteValue(HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {})
        }
    }, [])

    const onClose = useMemoizedFn(async () => {
        const remoteData = await getRemoteValue(WEB_FUZZ_HOTPATCH_CODE)
        if (remoteData !== params.HotPatchCode) {
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "Do Not Save",
                onOkText: "Save",
                icon: <ExclamationCircleOutlined />,
                style: {top: "20%"},
                onOk: () => {
                    if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                    props.onCancel()
                    m.destroy()
                },
                onCancel: () => {
                    props.onCancel()
                    m.destroy()
                },
                content: "Save Changes to Hot Reload Code?】"
            })
        } else {
            props.onCancel()
        }
    })

    return (
        <div className={styles["http-fuzzer-hotPatch"]}>
            <div className={styles["http-fuzzer-hotPatch-heard"]}>
                <span>Debug / Insert Hot Reload Code</span>
                <OutlineXIcon onClick={onClose} />
            </div>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                    if (props.onSaveHotPatchCodeWithParamGetterCode)
                        props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter)

                    setLoading(true)
                    ipcRenderer
                        .invoke("StringFuzzer", {...params})
                        .then((response: {Results: Uint8Array[]}) => {
                            const data: string[] = (response.Results || []).map((buf) =>
                                new Buffer(buf).toString("utf8")
                            )
                            showYakitDrawer({
                                title: "HotPatch Tag Result",
                                width: "45%",
                                content: (
                                    <AutoCard
                                        size={"small"}
                                        bordered={false}
                                        title={<span style={{color: "var(--yakit-header-color)"}}>Result Display</span>}
                                        extra={
                                            <Space>
                                                <YakitButton
                                                    type='text'
                                                    onClick={() => {
                                                        callCopyToClipboard(data.join("\n"))
                                                    }}
                                                >
                                                    Copy Fuzz Result
                                                </YakitButton>
                                                <YakitButton
                                                    type='text'
                                                    onClick={() => {
                                                        callCopyToClipboard(params.Template)
                                                    }}
                                                >
                                                    {" "}
                                                    Copy Fuzz Tag
                                                </YakitButton>
                                            </Space>
                                        }
                                    >
                                        <YakEditor value={data.join("\r\n")} readOnly={true} />
                                    </AutoCard>
                                )
                            })
                        })
                        .finally(() => setTimeout(() => setLoading(false), 300))
                }}
                layout={"vertical"}
                className={styles["http-fuzzer-hotPatch-form"]}
            >
                <Form.Item
                    label={
                        <Space>
                            Template Content
                            <YakitButton
                                type='text'
                                onClick={() => {
                                    callCopyToClipboard(params.Template)
                                }}
                            >
                                Click to Copy
                            </YakitButton>
                            {props.onInsert && (
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        if (props.onInsert) props.onInsert(params.Template)
                                        if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                                    }}
                                >
                                    Insert at Editor Position
                                </YakitButton>
                            )}
                            {/*<Tooltip title={<>{`Support：{{params(...)}} Tags`}</>}>*/}
                            {/*    <YakitCheckbox*/}
                            {/*        checked={dynamicParam}*/}
                            {/*        onChange={(e) => {*/}
                            {/*            setDynamicParam(e.target.checked)*/}
                            {/*        }}*/}
                            {/*    >*/}
                            {/*        Preload Params Expansion*/}
                            {/*    </YakitCheckbox>*/}
                            {/*</Tooltip>*/}
                        </Space>
                    }
                >
                    <div style={{height: 60}}>
                        <YakEditor
                            type={"http"}
                            value={params.Template}
                            setValue={(Template) => setParams({...getParams(), Template})}
                        />
                    </div>
                </Form.Item>
                <Form.Item
                    label={
                        <Space style={{lineHeight: "16px"}}>
                            Hot Reload Code
                            {props.onSaveCode && (
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        try {
                                            if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)
                                            setTimeout(() => {
                                                yakitNotify("success", "Save Successful")
                                            }, 100)
                                        } catch (error) {
                                            yakitNotify("error", "Save Failed:" + error)
                                        }
                                    }}
                                >
                                    Save
                                </YakitButton>
                            )}
                            <div>
                                <YakitPopconfirm
                                    title={"Clicking this will reset hot reload code, code may be lost, proceed with caution"}
                                    onConfirm={() => {
                                        if (props.onSaveCode) props.onSaveCode(params.HotPatchCode)

                                        setParams({...params, HotPatchCode: HotPatchDefaultContent})
                                    }}
                                >
                                    <YakitButton icon={<RefreshIcon />} type='text' />
                                </YakitPopconfirm>
                                <YakitPopover
                                    title={"Expand Editor"}
                                    content={
                                        <>
                                            <YakitRadioButtons
                                                value={hotPatchEditorHeight}
                                                onChange={(e) => {
                                                    setHotPatchEditorHeight(e.target.value)
                                                }}
                                                buttonStyle='solid'
                                                options={[
                                                    {
                                                        value: 250,
                                                        label: "Small"
                                                    },
                                                    {
                                                        value: 400,
                                                        label: "Medium"
                                                    },
                                                    {
                                                        value: 600,
                                                        label: "Large"
                                                    }
                                                ]}
                                            />
                                        </>
                                    }
                                >
                                    <YakitButton icon={<FullscreenOutlined />} type='text' />
                                </YakitPopover>
                            </div>
                        </Space>
                    }
                >
                    <div style={{height: hotPatchEditorHeight}}>
                        <YakEditor
                            type={"yak"}
                            value={params.HotPatchCode}
                            setValue={(HotPatchCode) => setParams({...getParams(), HotPatchCode})}
                        />
                    </div>
                </Form.Item>
                <Form.Item help={"Debug Notice: Debug execute will only run for up to 20 seconds or render up to 300 Payloads"}>
                    <YakitButton loading={loading} type='primary' htmlType='submit'>
                        Debug Execute
                    </YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
}
