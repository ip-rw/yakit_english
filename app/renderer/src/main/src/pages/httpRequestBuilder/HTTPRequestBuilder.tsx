import React, {useState, useImperativeHandle, useRef, useEffect} from "react"
import {useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {Divider, Form} from "antd"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array} from "@/utils/str"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {yakitFailed} from "@/utils/notification"
import styles from "./HTTPRequestBuilder.module.scss"
import {PluginTypes} from "../pluginDebugger/PluginDebuggerPage"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {SetVariableItem} from "../fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig"
import classNames from "classnames"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"

const {YakitPanel} = YakitCollapse

export interface HTTPRequestBuilderProp {
    pluginType: PluginTypes
    value: HTTPRequestBuilderParams
    setValue: (params: HTTPRequestBuilderParams) => any
}

export interface KVPair {
    Key: string
    Value: string
}

type fields = keyof HTTPRequestBuilderParams

export const getDefaultHTTPRequestBuilderParams = (): HTTPRequestBuilderParams => {
    return {
        Body: new Uint8Array(),
        Method: "GET",
        Input: "",
        GetParams: [{Key: "", Value: ""}],
        Cookie: [],
        Headers: [
            {
                Key: "User-Agent",
                Value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            }
        ],
        IsHttps: false,
        IsRawHTTPRequest: false,
        MultipartFileParams: [],
        MultipartParams: [],
        Path: ["/"],
        PostParams: [],
        RawHTTPRequest: new Uint8Array(),
        IsHttpFlowId: false,
        HTTPFlowId: []
    }
}

export const HTTPRequestBuilder: React.FC<HTTPRequestBuilderProp> = (props) => {
    const {pluginType} = props
    const [form] = Form.useForm()
    const [params, setParams] = useState(props.value || getDefaultHTTPRequestBuilderParams())
    const [reqType, setReqType] = useState<"raw" | "template">("template")
    const [activeKey, setActiveKey] = useState<string[]>(["GET Params"])
    const getParamsRef = useRef<any>()
    const postParamsRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()

    // Form Field Change Callback
    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        if (key === "reqType") {
            setParams({...params, IsRawHTTPRequest: value === "raw"})
            setReqType(value)
            return
        }
        setParams({...params, [key]: value})
    })

    const onReset = useMemoizedFn((restValue) => {
        setParams({
            ...params,
            ...restValue
        })
        form.setFieldsValue({...restValue})
    })

    // Reset
    const handleReset = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: fields,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        onReset({
            [field]: [{Key: "", Value: ""}]
        })
        ref.current.setVariableActiveKey(["0"])
    }

    // Add
    const handleAdd = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: fields,
        actKey: string,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = v[field] || []
        const index = variables.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            onReset({
                [field]: [...variables, {Key: "", Value: ""}]
            })
            ref.current.setVariableActiveKey([...(ref.current.variableActiveKey || []), `${variables?.length || 0}`])
        } else {
            yakitFailed(`Var Added${index}】设置后添加`)
        }
        if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
            setActiveKey([...activeKey, actKey])
        }
    }

    // Delete
    const handleRemove = (i: number, field: fields) => {
        const v = form.getFieldsValue()
        const variables = v[field] || []
        variables.splice(i, 1)
        onReset({
            [field]: [...variables]
        })
    }

    const rawEditorChange = useMemoizedFn((editorVal) => {
        setParams({...params, RawHTTPRequest: StringToUint8Array(editorVal)})
    })

    useUpdateEffect(() => {
        props.setValue(params)
    }, [params])

    useUpdateEffect(() => {
        if (pluginType === "nuclei") {
            onReset(getDefaultHTTPRequestBuilderParams())
        }
    }, [pluginType])

    return (
        <Form
            form={form}
            colon={false}
            onSubmitCapture={(e) => e.preventDefault()}
            labelCol={{span: 6}}
            wrapperCol={{span: 18}}
            initialValues={{...params, reqType}}
            style={{height: "100%"}}
            onValuesChange={onValuesChange}
        >
            {pluginType !== "nuclei" && (
                <Form.Item label='HTTPS' name='IsHttps' valuePropName='checked' style={{marginBottom: 4}}>
                    <YakitSwitch />
                </Form.Item>
            )}
            <Form.Item label='Request type' name='reqType' style={{marginBottom: 4}}>
                <YakitRadioButtons
                    size='small'
                    buttonStyle='solid'
                    options={
                        pluginType !== "nuclei"
                            ? [
                                  {
                                      value: "raw",
                                      label: "Original request"
                                  },
                                  {
                                      value: "template",
                                      label: "Request config"
                                  }
                              ]
                            : [
                                  {
                                      value: "template",
                                      label: "Request config"
                                  }
                              ]
                    }
                />
            </Form.Item>
            {reqType === "raw" ? (
                <div className={styles.rawEditor}>
                    <NewHTTPPacketEditor
                        originValue={params.RawHTTPRequest}
                        onChange={rawEditorChange}
                        noMinimap={true}
                        noLineNumber={true}
                        showLineBreaksState={true}
                        isShowBeautifyRender={false}
                        hideSearch={true}
                        noTitle={true}
                        noHex={true}
                        simpleMode={true}
                        noModeTag={true}
                    />
                </div>
            ) : (
                <>
                    <Form.Item
                        label='Scan Target'
                        name='Input'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "Enter scan target"}]}
                    >
                        <YakitInput.TextArea placeholder='Enter scan target' size='small' />
                    </Form.Item>
                    {pluginType !== "nuclei" && (
                        <>
                            <Form.Item label='HTTP method' name='Method' style={{marginBottom: 4}}>
                                <YakitSelect
                                    options={["GET", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT"].map(
                                        (item) => ({
                                            value: item,
                                            label: item
                                        })
                                    )}
                                    size='small'
                                />
                            </Form.Item>
                            <Form.Item label='Request path' name='Path' style={{marginBottom: 12}}>
                                <YakitSelect
                                    allowClear
                                    options={["/", "/admin"].map((item) => ({value: item, label: item}))}
                                    size='small'
                                    mode='tags'
                                    maxTagCount='responsive'
                                    placeholder='Please Enter...'
                                />
                            </Form.Item>
                            <YakitCollapse
                                destroyInactivePanel={false}
                                activeKey={activeKey}
                                onChange={(key) => setActiveKey(key as string[])}
                                className={styles["arg-keys-list"]}
                            >
                                <YakitPanel
                                    header='GET Params'
                                    key='GET Params'
                                    // className={styles["arg-keys-list-panel"]}
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "GetParams", getParamsRef)}
                                                size='small'
                                            >
                                                Reset
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "GetParams", "GET Params", getParamsRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                Add
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={getParamsRef}
                                        field='GetParams'
                                        onDel={(i) => {
                                            handleRemove(i, "GetParams")
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                                <YakitPanel
                                    header='POST Params'
                                    key='POST Params'
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "PostParams", postParamsRef)}
                                                size='small'
                                            >
                                                Reset
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "PostParams", "POST Params", postParamsRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                Add
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={postParamsRef}
                                        field='PostParams'
                                        onDel={(i) => {
                                            handleRemove(i, "PostParams")
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                                <YakitPanel
                                    header='Header'
                                    key='Header'
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "Headers", headersRef)}
                                                size='small'
                                            >
                                                Reset
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "Headers", "Header", headersRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                Add
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={headersRef}
                                        field='Headers'
                                        onDel={(i) => {
                                            handleRemove(i, "Headers")
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                                <YakitPanel
                                    header='Cookie'
                                    key='Cookie'
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "Cookie", cookieRef)}
                                                size='small'
                                            >
                                                Reset
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "Cookie", "Cookie", cookieRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                Add
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={cookieRef}
                                        field='Cookie'
                                        onDel={(i) => {
                                            handleRemove(i, "Cookie")
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                            </YakitCollapse>
                        </>
                    )}
                </>
            )}
        </Form>
    )
}

interface VariableListProps {
    /**Temp cache field name in fuzzer data center */
    cacheType?: "variableActiveKeys"
    /**Cached page ID in fuzzer data center */
    pageId?: string
    field: fields | string
    extra?: (i: number, info: {key; name}) => React.ReactNode
    ref: React.Ref<any>
    collapseWrapperClassName?: string
    onDel?: (i: number) => any
}

/**
 * Used only in fuzzer advanced settings
 */
export const VariableList: React.FC<VariableListProps> = React.forwardRef(
    ({extra, field, collapseWrapperClassName = "", onDel, pageId, cacheType}, ref) => {
        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )
        const [variableActiveKey, setVariableActiveKey] = useState<string[]>(["0"])

        const formListRef = useRef<HTMLDivElement>(null)

        const [inViewport = true] = useInViewport(formListRef)

        useImperativeHandle(
            ref,
            () => ({
                variableActiveKey,
                setVariableActiveKey: onSetActiveKey
            }),
            [variableActiveKey]
        )

        useEffect(() => {
            if (!cacheType) return
            if (!pageId) return
            if (inViewport) {
                getVariableActiveKey()
                emiter.on("onRefVariableActiveKey", getVariableActiveKey)
            }
            return () => {
                emiter.off("onRefVariableActiveKey", getVariableActiveKey)
            }
        }, [pageId, inViewport])
        const onSetActiveKey = useMemoizedFn((key: string[] | string) => {
            setVariableActiveKey(key as string[])
            onUpdateVariableActiveKey(key as string[])
        })
        const getVariableActiveKey = useMemoizedFn(() => {
            if (!cacheType) return
            if (!pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
                const {webFuzzerPageInfo} = currentItem.pageParamsInfo
                const activeKeys = webFuzzerPageInfo[cacheType] || ["0"]
                setVariableActiveKey([...activeKeys])
            }
        })
        const onUpdateVariableActiveKey = useDebounceFn(
            (key: string[]) => {
                if (!cacheType) return
                if (!pageId) return
                const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
                if (!currentItem) return
                if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                    const newCurrentItem: PageNodeItemProps = {
                        ...currentItem,
                        pageParamsInfo: {
                            webFuzzerPageInfo: {
                                ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                                [cacheType]: key
                            }
                        }
                    }
                    updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                }
            },
            {wait: 200, leading: true}
        ).run
        return (
            <Form.List name={field}>
                {(fields, {add}) => {
                    return (
                        <>
                            <div ref={formListRef} />
                            <YakitCollapse
                                destroyInactivePanel={true}
                                defaultActiveKey={variableActiveKey}
                                activeKey={variableActiveKey}
                                onChange={onSetActiveKey}
                                className={classNames(styles["variable-list"], collapseWrapperClassName)}
                                bordered={false}
                            >
                                {fields.map(({key, name}, i) => (
                                    <YakitPanel
                                        key={`${key + ""}`}
                                        header={`Variables ${name}`}
                                        className={styles["variable-list-panel"]}
                                        extra={
                                            <div className={styles["extra-wrapper"]}>
                                                <TrashIcon
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (onDel) onDel(i)
                                                    }}
                                                    className={styles["variable-list-remove"]}
                                                />
                                                {extra ? extra(i, {key, name}) : null}
                                            </div>
                                        }
                                    >
                                        <SetVariableItem name={name} />
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            {fields?.length === 0 && (
                                <>
                                    <YakitButton
                                        type='outline2'
                                        onClick={() => {
                                            add({Key: "", Value: "", Type: "raw"})
                                            onSetActiveKey([
                                                ...(variableActiveKey || []),
                                                `${variableActiveKey?.length}`
                                            ])
                                        }}
                                        icon={<PlusIcon />}
                                        block
                                    >
                                        Add
                                    </YakitButton>
                                </>
                            )}
                        </>
                    )
                }}
            </Form.List>
        )
    }
)
