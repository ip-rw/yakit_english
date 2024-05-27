import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import styles from "./PluginExecuteExtraParams.module.scss"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, FormInstance} from "antd"
import {
    PluginExecuteExtraFormValue,
    CustomPluginExecuteFormValue,
    YakExtraParamProps
} from "./LocalPluginExecuteDetailHeardType"
import {yakitFailed} from "@/utils/notification"
import {FormContentItemByType} from "./LocalPluginExecuteDetailHeard"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {SolidPlusIcon} from "@/assets/icon/solid"
import {KVPair} from "@/models/kv"
import {PluginGV} from "../../builtInData"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"

const {YakitPanel} = YakitCollapse

type ExtraParamsValue = PluginExecuteExtraFormValue | CustomPluginExecuteFormValue
interface PluginExecuteExtraParamsProps {
    ref?: any
    pluginType: string
    extraParamsValue: ExtraParamsValue
    extraParamsGroup: YakExtraParamProps[]
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: ExtraParamsValue) => void
}

export interface PluginExecuteExtraParamsRefProps {
    form: FormInstance<any>
}
const PluginExecuteExtraParams: React.FC<PluginExecuteExtraParamsProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {extraParamsGroup = [], pluginType, extraParamsValue, visible, setVisible, onSave} = props

        const [form] = Form.useForm()

        const pathRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
            onGetRemoteValues: () => {},
            onSetRemoteValues: (s: string[]) => {}
        })

        useImperativeHandle(ref, () => ({form}), [form])
        useEffect(() => {
            if (visible) {
                form.setFieldsValue({...extraParamsValue})
            }
        }, [visible, extraParamsValue])
        const onClose = useMemoizedFn(() => {
            onSaveSetting()
        })
        /**
         * @description Save Advanced Settings
         */
        const onSaveSetting = useMemoizedFn(() => {
            switch (pluginType) {
                case "yak":
                case "lua":
                    form.validateFields().then((formValue: CustomPluginExecuteFormValue) => {
                        onSave(formValue)
                    })
                    break
                case "mitm":
                case "port-scan":
                case "nuclei":
                    form.validateFields().then((formValue: HTTPRequestBuilderParams) => {
                        if (formValue.Path) {
                            pathRef.current.onSetRemoteValues(formValue.Path)
                        }
                        onSave(formValue as ExtraParamsValue)
                    })
                    break
                default:
                    break
            }
        })

        /**yak/Generate based on backend return;mitm/port-scan/nuclei frontend fixed;codec no extra parameters*/
        const pluginParamsNodeByPluginType = (type: string) => {
            switch (type) {
                case "yak":
                case "lua":
                    return (
                        <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                            <ExtraParamsNodeByType extraParamsGroup={extraParamsGroup} pluginType={pluginType} />
                            <div className={styles["to-end"]}>Reached Bottom～</div>
                        </Form>
                    )

                case "mitm":
                case "port-scan":
                case "nuclei":
                    return (
                        <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                            <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
                            <div className={styles["to-end"]}>Reached Bottom～</div>
                        </Form>
                    )

                default:
                    return <></>
            }
        }
        /**Reset form values in fixed extra parameters */
        const onReset = useMemoizedFn((restValue) => {
            form.setFieldsValue({...restValue})
        })
        return (
            <YakitDrawer
                className={styles["plugin-execute-extra-params-drawer"]}
                visible={visible}
                onClose={onClose}
                width='40%'
                title='Extra params'
            >
                {pluginParamsNodeByPluginType(pluginType)}
            </YakitDrawer>
        )
    })
)
export default PluginExecuteExtraParams

interface ExtraParamsNodeByTypeProps {
    extraParamsGroup: YakExtraParamProps[]
    pluginType: string
}
export const ExtraParamsNodeByType: React.FC<ExtraParamsNodeByTypeProps> = React.memo((props) => {
    const {extraParamsGroup, pluginType} = props
    const defaultActiveKey = useMemo(() => {
        return extraParamsGroup.map((ele) => ele.group)
    }, [extraParamsGroup])
    return (
        <YakitCollapse defaultActiveKey={defaultActiveKey} className={styles["extra-params-node-type"]}>
            {extraParamsGroup.map((item, index) => (
                <YakitPanel key={`${item.group}`} header={`Param Group：${item.group}`}>
                    {item.data?.map((formItem) => (
                        <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                            <FormContentItemByType item={formItem} pluginType={pluginType} />
                        </React.Fragment>
                    ))}
                </YakitPanel>
            ))}
        </YakitCollapse>
    )
})

interface FixExtraParamsNodeProps {
    pathRef: React.MutableRefObject<YakitBaseSelectRef>
    form: FormInstance<HTTPRequestBuilderParams>
    onReset: (fields) => void

    /** YakitCollapse bordered, needed for plugin debug page style */
    bordered?: boolean
    /** HTTP method and request path wrapper style, needed for plugin debug page style */
    httpPathWrapper?: string
}
type Fields = keyof HTTPRequestBuilderParams
export const FixExtraParamsNode: React.FC<FixExtraParamsNodeProps> = React.memo((props) => {
    const {onReset, pathRef, form, bordered, httpPathWrapper} = props
    const [activeKey, setActiveKey] = useState<string[]>(["GET Params"])

    const getParamsRef = useRef<any>()
    const postParamsRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()

    const getParams = Form.useWatch("GetParams", form)
    const postParams = Form.useWatch("PostParams", form)
    const headers = Form.useWatch("Headers", form)
    const cookie = Form.useWatch("Cookie", form)

    // Reset
    const handleReset = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: Fields,
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
        field: Fields,
        actKey: string,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = (v[field] || []) as KVPair[]
        const index = variables.findIndex((ele: KVPair) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            onReset({
                [field]: [...variables, {Key: "", Value: ""}]
            })
            ref.current.setVariableActiveKey([...(ref.current.variableActiveKey || []), `${variables?.length || 0}`])
        } else {
            yakitFailed(`Var Added${index}】After Setting`)
        }
        if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
            setActiveKey([...activeKey, actKey])
        }
    }
    // Delete
    const handleRemove = (i: number, field: Fields) => {
        const v = form.getFieldsValue()
        const variables = (v[field] || []) as KVPair[]
        variables.splice(i, 1)
        onReset({
            [field]: [...variables]
        })
    }
    return (
        <div className={styles["plugin-extra-params"]}>
            <div className={httpPathWrapper}>
                <Form.Item label='HTTP method' name='Method' initialValue='GET'>
                    <YakitSelect
                        options={["GET", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT"].map((item) => ({
                            value: item,
                            label: item
                        }))}
                        size='small'
                    />
                </Form.Item>
                <Form.Item label='Request path' name='Path'>
                    <YakitSelect
                        ref={pathRef}
                        allowClear
                        defaultOptions={["/", "/admin"].map((item) => ({value: item, label: item}))}
                        mode='tags'
                        placeholder='Please Enter...'
                        cacheHistoryDataKey={PluginGV.LocalExecuteExtraPath}
                        isCacheDefaultValue={false}
                        size='small'
                    />
                </Form.Item>
            </div>
            <YakitCollapse
                destroyInactivePanel={false}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={!!bordered}
                className={styles["kv-params-wrapper"]}
            >
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            GET Params
                            {getParams?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{getParams?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
                    key='GET Params'
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
                                <SolidPlusIcon className={styles["plus-icon"]} />
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
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            POST Params
                            {postParams?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{postParams?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                    forceRender={true}
                >
                    <VariableList
                        ref={postParamsRef}
                        field='PostParams'
                        onDel={(i) => {
                            handleRemove(i, "PostParams")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            Header
                            {headers?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{headers?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                    forceRender={true}
                >
                    <VariableList
                        ref={headersRef}
                        field='Headers'
                        onDel={(i) => {
                            handleRemove(i, "Headers")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
                <YakitPanel
                    header={
                        <div className={styles["yakit-panel-heard"]}>
                            Cookie
                            {cookie?.length ? (
                                <span className={styles["yakit-panel-heard-number"]}>{cookie?.length}</span>
                            ) : (
                                ""
                            )}
                        </div>
                    }
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
                                <SolidPlusIcon className={styles["plus-icon"]} />
                            </YakitButton>
                        </>
                    }
                    forceRender={true}
                >
                    <VariableList
                        ref={cookieRef}
                        field='Cookie'
                        onDel={(i) => {
                            handleRemove(i, "Cookie")
                        }}
                        collapseWrapperClassName={styles["variable-list-wrapper"]}
                    />
                </YakitPanel>
            </YakitCollapse>
        </div>
    )
})
