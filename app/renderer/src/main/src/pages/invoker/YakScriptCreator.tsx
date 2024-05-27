import React, {useState} from "react"
import {Button, Form, Input, List, Popconfirm, Space, Tag} from "antd"
import {InputItem, ManyMultiSelectForString, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {YakScript} from "./schema"
import {PlusOutlined} from "@ant-design/icons"
import {showModal} from "../../utils/showModal"
import {failed, info} from "../../utils/notification"
import {DeleteOutlined} from "@ant-design/icons"
import {CustomDnsLogPlatformTemplate, YakTemplate} from "./data/CodecPluginTemplate"
import {useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import "./YakScriptCreator.scss"
import { addTag, removeTag } from "../customizeMenu/utils"
import { YakParamProps } from "../plugins/pluginsType"

export const BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES = "__yakit_plugin_names__"

/*
*                            {value: "yak", text: "Yak Native Module"},
                           {value: "mitm", text: "MITM Module"},
                           {value: "packet-hack", text: "Packet Inspection"},
                           {value: "port-scan", text: "Port Scan Plugin"},
                           {value: "codec", text: "Codec Module"},
                           {value: "nuclei", text: "nuclei Yaml Module"},
* */
export const getPluginTypeVerbose = (t: "yak" | "mitm" | "port-scan" | "nuclei" | "codec" | "packet-hack" | string) => {
    switch (t) {
        case "nuclei":
            return "Nuclei Yaml Module"
        case "yak":
            return "Yak Native Module"
        case "codec":
            return "Codec Encoding Module"
        case "mitm":
            return "MITM Plugin"
        case "port-scan":
            return "Port Scan Plugin"
        default:
            return "Unknown Type"
    }
}

export interface FromLayoutProps {
    labelCol: object
    wrapperCol: object
}

const defParams = {
    Content: YakTemplate,
    Tags: "",
    Author: "",
    Level: "",
    IsHistory: false,
    IsIgnore: false,
    CreatedAt: 0,
    Help: "",
    Id: 0,
    Params: [],
    ScriptName: "",
    Type: "yak",
    IsGeneralModule: false,
    PluginSelectorTypes: "mitm,port-scan",
    UserId: 0,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    GeneralModuleVerbose: "",
    GeneralModuleKey: "",
    FromGit: "",
    UUID: ""
}

interface YakScriptFormContentProps {
    params: YakScript
    setParams: (y: YakScript) => void
    modified?: YakScript | undefined
    setParamsLoading?: (b: boolean) => void
    isShowAuthor?: boolean
    disabled?: boolean
}

export const YakScriptFormContent: React.FC<YakScriptFormContentProps> = (props) => {
    const {params, modified, setParams, setParamsLoading, isShowAuthor = true, disabled} = props
    const isNucleiPoC = params.Type === "nuclei"
    return (
        <>
            <SelectOne
                disabled={!!modified}
                label={"Module Type"}
                data={[
                    {value: "yak", text: "Yak Native Module"},
                    {value: "mitm", text: "MITM Module"},
                    {value: "packet-hack", text: "Packet Inspection"},
                    {value: "port-scan", text: "Port Scan Plugin"},
                    {value: "codec", text: "Codec Module"},
                    {value: "nuclei", text: "nuclei Yaml Module"}
                ]}
                setValue={(Type) => {
                    if (["packet-hack", "codec", "nuclei"].includes(Type))
                        setParams({
                            ...params,
                            Type,
                            IsGeneralModule: false
                        })
                    else setParams({...params, Type})
                }}
                value={params.Type}
            />
            <InputItem
                label={"Yak Module Name"}
                required={true}
                setValue={(ScriptName) => setParams({...params, ScriptName})}
                value={params.ScriptName}
                disable={disabled}
            />
            <InputItem
                label={"Brief Description"}
                setValue={(Help) => setParams({...params, Help})}
                value={params.Help}
                disable={disabled}
            />
            {isShowAuthor && (
                <InputItem
                    label={"Module Author"}
                    setValue={(Author) => setParams({...params, Author})}
                    value={params.Author}
                    disable={disabled}
                />
            )}
            <ManyMultiSelectForString
                label={"Tags"}
                data={[{value: "Tutorial", label: "Tutorial"}]}
                mode={"tags"}
                setValue={(Tags) => setParams({...params, Tags})}
                value={params.Tags && params.Tags !== "null" ? params.Tags : ""}
                disabled={disabled}
            />
            {["yak", "mitm"].includes(params.Type) && (
                <Form.Item label={"Add Param"}>
                    <Button
                        type={"link"}
                        onClick={() => {
                            if (disabled) return
                            let m = showModal({
                                title: "Add New Param",
                                width: "60%",
                                content: (
                                    <>
                                        <CreateYakScriptParamForm
                                            onCreated={(param) => {
                                                let flag = false
                                                const paramArr = (params.Params || []).map((item) => {
                                                    if (item.Field === param.Field) {
                                                        flag = true
                                                        info(
                                                            `Parameter [${param.Field}]${
                                                                param.FieldVerbose ? `(${param.FieldVerbose})` : ""
                                                            } Already Exists, Overwritten`
                                                        )
                                                        return param
                                                    }
                                                    return item
                                                })
                                                if (!flag) paramArr.push(param)
                                                setParams({...params, Params: [...paramArr]})
                                                m.destroy()
                                            }}
                                        />
                                    </>
                                )
                            })
                        }}
                        disabled={disabled}
                    >
                        Add / Set Param <PlusOutlined />
                    </Button>
                </Form.Item>
            )}
            {params.Params.length > 0 ? (
                <Form.Item label={" "} colon={false}>
                    <List
                        size={"small"}
                        bordered={true}
                        pagination={false}
                        renderItem={(p) => {
                            return (
                                <List.Item key={p.Field}>
                                    <Space size={1}>
                                        {p.Required && <div className='form-item-required-title'>*</div>}
                                        Parameter Name：
                                    </Space>
                                    <Tag color={"geekblue"}>
                                        {p.FieldVerbose && `${p.FieldVerbose} / `}
                                        {p.Field}
                                    </Tag>
                                    Type：
                                    <Tag color={"blue"}>
                                        {p.TypeVerbose} {p.DefaultValue && `Default Value：${p.DefaultValue}`}
                                    </Tag>
                                    {p.DefaultValue && `Default Value: ${p.DefaultValue}`}
                                    {(!isNucleiPoC && (
                                        <Space style={{marginLeft: 20}}>
                                            <Button
                                                size={"small"}
                                                onClick={() => {
                                                    let m = showModal({
                                                        title: `Modify Known Params: ${p.FieldVerbose}(${p.Field})`,
                                                        width: "60%",
                                                        content: (
                                                            <>
                                                                <CreateYakScriptParamForm
                                                                    modifiedParam={p}
                                                                    onCreated={(param) => {
                                                                        setParams({
                                                                            ...params,
                                                                            Params: [
                                                                                ...params.Params.filter(
                                                                                    (i) => i.Field !== param.Field
                                                                                ),
                                                                                param
                                                                            ]
                                                                        })
                                                                        m.destroy()
                                                                    }}
                                                                />
                                                            </>
                                                        )
                                                    })
                                                }}
                                                disabled={disabled}
                                            >
                                                Modify Params
                                            </Button>
                                            <Popconfirm
                                                title={"Confirm Param Deletion?？"}
                                                onConfirm={(e) => {
                                                    if (setParamsLoading) setParamsLoading(true)
                                                    setParams({
                                                        ...params,
                                                        Params: params.Params.filter((i) => i.Field !== p.Field)
                                                    })
                                                }}
                                            >
                                                <Button size={"small"} type={"link"} danger={true} disabled={disabled}>
                                                    Delete Param
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    )) ||
                                        "--"}
                                </List.Item>
                            )
                        }}
                        dataSource={params.Params}
                    ></List>
                </Form.Item>
            ) : (
                ""
            )}
            {params.Type === "yak" && (
                <>
                    <SwitchItem
                        label='Enable Plugin UI Linkage'
                        value={params.EnablePluginSelector}
                        setValue={(EnablePluginSelector) => setParams({...params, EnablePluginSelector})}
                        disabled={disabled}
                    />
                    <SwitchItem
                        label='Custom DNSLOG'
                        value={params.Tags && params.Tags.includes("custom-dnslog-platform") ? true : false}
                        setValue={(enalbed) => {
                            let obj = {
                                ...params, 
                                Tags: enalbed? addTag(params.Tags === "null"?"":params.Tags, "custom-dnslog-platform"): removeTag(params.Tags, "custom-dnslog-platform"),
                                Content:defParams.Content
                            }
                            if(enalbed){obj.Content = CustomDnsLogPlatformTemplate}
                            setParams(obj)
                        }}
                        disabled={disabled}
                    />
                    {params.EnablePluginSelector && (
                        <ManyMultiSelectForString
                            label={"Plugin Linkage Type"}
                            value={params.PluginSelectorTypes}
                            data={["mitm", "port-scan"].map((i) => {
                                return {value: i, label: getPluginTypeVerbose(i)}
                            })}
                            mode={"multiple"}
                            setValue={(res) => {
                                setParams({...params, PluginSelectorTypes: res})
                            }}
                            help={"Use cli.String(`yakit-plugin-file`) Get Selected Plugin"}
                            disabled={disabled}
                        />
                    )}
                </>
            )}
             {params.Type === "codec" && (
                <>
                    <SwitchItem
                        label='Custom HTTP Packet Transformation'
                        value={  
                            params.Tags && params.Tags.includes("allow-custom-http-packet-mutate") ? true : false
                        }
                        setValue={(enalbed) => setParams({...params, Tags: enalbed? addTag(params.Tags === "null"?"":params.Tags, "allow-custom-http-packet-mutate"): removeTag(params.Tags, "allow-custom-http-packet-mutate")})}
                        disabled={disabled}
                    />
                </>
            )}
        </>
    )
}

export interface CreateYakScriptParamFormProp {
    modifiedParam?: YakParamProps
    onCreated: (params: YakParamProps) => any
}

export const CreateYakScriptParamForm: React.FC<CreateYakScriptParamFormProp> = (props) => {
    const [params, setParams] = useState<YakParamProps>(
        props.modifiedParam || {
            DefaultValue: "",
            Field: "",
            FieldVerbose: "",
            Help: "",
            TypeVerbose: ""
        }
    )
    const [extraSetting, setExtraSetting] = useState<{[key: string]: any}>(
        props.modifiedParam?.ExtraSetting ? JSON.parse(props.modifiedParam.ExtraSetting) : {}
    )
    // Type Conversion on Selection
    const typeChange = useMemoizedFn((type: string) => {
        switch (type) {
            case "select":
                setExtraSetting({
                    double: false,
                    data: []
                })
                break
            case "upload-path":
                setExtraSetting({isTextArea: false})
                break
            default:
                setExtraSetting({})
                break
        }
        setParams({...params, TypeVerbose: type, DefaultValue: ""})
    })
    // Submit Param Verification
    const verify = useMemoizedFn(() => {
        const type = params.TypeVerbose
        switch (type) {
            case "select":
                if (extraSetting.data.length === 0) {
                    failed("Dropdown Option, Min. 1 Item")
                    return false
                }
                return true
            default:
                return true
        }
    })
    // Submit Param Transformation
    const convert = useMemoizedFn(() => {
        const type = params.TypeVerbose
        const setting: YakParamProps = cloneDeep(params)
        const extra = cloneDeep(extraSetting)
        const extraStr = JSON.stringify(extraSetting)

        switch (type) {
            case "select":
                const dataObj = {}
                extra.data.map((item) => {
                    if (item.value in dataObj && item.key) dataObj[item.value] = item.key
                    if (!(item.value in dataObj)) dataObj[item.value] = item.key
                })

                const data: any = []
                for (let item in dataObj) data.push({key: dataObj[item], value: item})
                extra.data = data
                setting.ExtraSetting = JSON.stringify(extra)

                return setting
            case "upload-path":
                extra.isTextArea = setting.Required ? extra.isTextArea : false
                setting.ExtraSetting = JSON.stringify(extra)
                return setting
            default:
                setting.ExtraSetting = extraStr === "{}" ? undefined : extraStr
                return setting
        }
    })

    const updateExtraSetting = useMemoizedFn((type: string, kind: string, key: string, value: any, index?: number) => {
        const extra = cloneDeep(extraSetting)
        switch (type) {
            case "select":
                if (Array.isArray(extra.data) && kind === "update" && index !== undefined) {
                    extra.data[index][key] = value
                    setExtraSetting({...extra})
                }
                if (Array.isArray(extra.data) && kind === "del" && index !== undefined) {
                    extra.data.splice(index, 1)
                    setExtraSetting({...extra})
                }
                return
            default:
                return
        }
    })

    const selectOptSetting = (item: {key: string; value: string}, index: number) => {
        return (
            <div key={index} className='select-type-opt'>
                <span className='opt-hint-title'>Option Name</span>
                <Input
                    className='opt-hint-input'
                    size='small'
                    value={item.key}
                    onChange={(e) => updateExtraSetting("select", "update", "key", e.target.value, index)}
                />
                <span className='opt-hint-title'>
                    <span className='form-item-required-title'>*</span>Option Value
                </span>
                <Input
                    className='opt-hint-input'
                    required
                    size='small'
                    value={item.value}
                    placeholder='Required'
                    onChange={(e) => updateExtraSetting("select", "update", "value", e.target.value, index)}
                />
                <Button
                    type='link'
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => updateExtraSetting("select", "del", "", "", index)}
                />
            </div>
        )
    }

    const extraSettingComponent = useMemoizedFn((type: string) => {
        switch (type) {
            case "select":
                return (
                    <div>
                        <SwitchItem
                            label={"Supports Multiple Selections"}
                            setValue={(value) => setExtraSetting({...extraSetting, double: value})}
                            value={!!extraSetting.double}
                            help={"Multi-Select Saves as Array"}
                        />
                        <Form.Item label='Dropdown Option Data' className='creator-form-item-margin'>
                            <Button
                                type='link'
                                onClick={() => {
                                    ;(extraSetting.data || []).push({key: "", value: ""})
                                    setExtraSetting({...extraSetting})
                                }}
                            >
                                Add Option <PlusOutlined />
                            </Button>
                        </Form.Item>
                        <Form.Item label={" "} colon={false} className='creator-form-item-margin'>
                            {(extraSetting.data || []).map((item, index) => selectOptSetting(item, index))}
                        </Form.Item>
                    </div>
                )
            case "upload-path":
                if (!params.Required) {
                    return <></>
                }
                return (
                    <div>
                        <SwitchItem
                            label={"Text Area Display"}
                            setValue={(value) => setExtraSetting({...extraSetting, isTextArea: value})}
                            value={!!extraSetting.isTextArea}
                        />
                    </div>
                )
            default:
                break
        }
    })

    return (
        <>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (!verify()) return false
                    props.onCreated(convert())
                }}
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
            >
                <InputItem
                    disable={!!props.modifiedParam}
                    label={"Param Name (EN)）"}
                    required={true}
                    placeholder={"Input Param Name to Add"}
                    setValue={(Field) => setParams({...params, Field})}
                    value={params.Field}
                    help={"Param Names Without Special Characters / '-' Etc."}
                />
                <InputItem
                    label={"Param Display Name)"}
                    placeholder={"Input Desired Param Name"}
                    setValue={(FieldVerbose) => setParams({...params, FieldVerbose})}
                    value={params.FieldVerbose}
                />
                <SwitchItem
                    label={"Required Params"}
                    setValue={(Required) => setParams({...params, Required})}
                    value={params.Required}
                />
                <ManySelectOne
                    label={"Select Param Type"}
                    data={[
                        {text: "String / string", value: "string"},
                        {text: "Bool / boolean", value: "boolean"},
                        {text: "HTTP Packet / yak", value: "http-packet"},
                        {text: "Yak Code Block / yak", value: "yak"},
                        {text: "Text Block / text", value: "text"},
                        {text: "Integer (Positive)） / uint", value: "uint"},
                        {text: "Float / float", value: "float"},
                        {text: "Upload File Path / uploadPath", value: "upload-path"},
                        {text: "Dropdown Box / select", value: "select"}
                    ]}
                    setValue={(TypeVerbose) => typeChange(TypeVerbose)}
                    value={params.TypeVerbose}
                />
                {!["upload-path", "boolean"].includes(params.TypeVerbose) && (
                    <InputItem
                        label={"Default Value"}
                        placeholder={"Param Default Value"}
                        setValue={(DefaultValue) => setParams({...params, DefaultValue})}
                        value={params.DefaultValue}
                        help={params.TypeVerbose === "select" ? "Use Comma (,) as Separator " : undefined}
                    />
                )}
                {["boolean"].includes(params.TypeVerbose) && (
                    <ManySelectOne
                        label={"Default Value"}
                        placeholder={"Param Default Value"}
                        data={[
                            {text: "Bool / true", value: "true"},
                            {text: "Bool / false", value: "false"}
                        ]}
                        setValue={(value) => {
                            setParams({...params, DefaultValue: value})
                        }}
                        value={params.DefaultValue}
                    />
                )}
                {extraSettingComponent(params.TypeVerbose)}

                <InputItem
                    label={"Param Help"}
                    setValue={(Help) => setParams({...params, Help})}
                    value={params.Help}
                    textarea={true}
                    textareaRow={4}
                    placeholder={"Param Help Text"}
                />
                {!params.Required && (
                    <InputItem
                        label={"Param Group"}
                        setValue={(Group) => setParams({...params, Group})}
                        value={params.Group}
                        placeholder={"Param Grouping`"}
                    />
                )}
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        Add Param{" "}
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
}
