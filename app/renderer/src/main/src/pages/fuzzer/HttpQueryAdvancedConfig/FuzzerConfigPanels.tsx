import React, {useRef} from "react"
import styles from "./HttpQueryAdvancedConfig.module.scss"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {Divider, Form} from "antd"
import {HollowLightningBoltIcon} from "@/assets/newIcon"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {ColorSelect, ExtractionResultsContent} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {ExtractorsList, MatchersList} from "./HttpQueryAdvancedConfig"
import {AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"
import {StringToUint8Array} from "@/utils/str"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {
    filterModeOptions,
    matchersConditionOptions,
    defMatcherAndExtractionCode
} from "../MatcherAndExtractionCard/constants"

const {YakitPanel} = YakitCollapse
const {ipcRenderer} = window.require("electron")

interface MatchersPanelProps {
    onAddMatchingAndExtractionCard: (type: MatchingAndExtraction) => void
    onEdit: (index: number, type: MatchingAndExtraction) => void
    onSetValue?: (v: AdvancedConfigValueProps) => void
}
export const MatchersPanel: React.FC<MatchersPanelProps> = React.memo((props) => {
    const {onAddMatchingAndExtractionCard, onEdit, onSetValue, ...restProps} = props
    const form = Form.useFormInstance()
    const filterMode = Form.useWatch("filterMode", form)
    const matchersCondition = Form.useWatch("matchersCondition", form)
    const hitColor = Form.useWatch("hitColor", form)
    const matchers = Form.useWatch("matchers", form) || []
    const onReset = useMemoizedFn((restValue) => {
        form.setFieldsValue({
            ...restValue
        })
        onChangeValue(restValue)
    })
    const onRemoveMatcher = useMemoizedFn((i) => {
        const newMatchers = matchers.filter((m, n) => n !== i)
        form.setFieldsValue({
            matchers: newMatchers
        })
        onChangeValue(newMatchers)
    })
    /** setFieldsValue Does Not Trigger Form onValuesChange, Throw to External Solution */
    const onChangeValue = useMemoizedFn((restValue) => {
        if (onSetValue) {
            const v = form.getFieldsValue()
            onSetValue({
                ...v,
                ...restValue
            })
        }
    })
    const onEditMatcher = useMemoizedFn((index: number) => {
        onEdit(index, "matchers")
    })
    const matcherValue = useCreation(() => {
        return {
            matchersList: matchers,
            filterMode,
            matchersCondition,
            hitColor
        }
    }, [matchers, filterMode, matchersCondition, hitColor])
    return (
        <>
            <YakitPanel
                {...restProps}
                header={
                    <div className={styles["matchers-panel"]}>
                        Matcher
                        <div className={styles["matchers-number"]}>{matchers?.length}</div>
                    </div>
                }
                key='Matcher'
                extra={
                    <>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={(e) => {
                                e.stopPropagation()
                                const restValue = {
                                    matchers: [],
                                    filterMode: "onlyMatch",
                                    hitColor: "red",
                                    matchersCondition: "and"
                                }
                                onReset(restValue)
                            }}
                            size='small'
                        >
                            Reset
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton
                            type='text'
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddMatchingAndExtractionCard("matchers")
                            }}
                            className={styles["btn-padding-right-0"]}
                        >
                            Add/Debug
                            <HollowLightningBoltIcon />
                        </YakitButton>
                    </>
                }
                className={styles["panel-wrapper"]}
            >
                <div className={styles["matchers-heard"]}>
                    <div className={styles["matchers-heard-left"]}>
                        <Form.Item name='filterMode' noStyle>
                            <YakitRadioButtons buttonStyle='solid' options={filterModeOptions} size='small' />
                        </Form.Item>
                        {filterMode === "onlyMatch" && (
                            <Form.Item name='hitColor' noStyle>
                                <ColorSelect size='small' />
                            </Form.Item>
                        )}
                    </div>
                    <Form.Item name='matchersCondition' noStyle>
                        <YakitRadioButtons buttonStyle='solid' options={matchersConditionOptions} size='small' />
                    </Form.Item>
                </div>
                <MatchersList
                    matcherValue={matcherValue}
                    onAdd={() => onAddMatchingAndExtractionCard("matchers")}
                    onRemove={onRemoveMatcher}
                    onEdit={onEditMatcher}
                />
            </YakitPanel>
        </>
    )
})

interface ExtractorsPanelProps extends MatchersPanelProps {}
export const ExtractorsPanel: React.FC<ExtractorsPanelProps> = React.memo((props) => {
    const {onAddMatchingAndExtractionCard, onEdit, onSetValue, ...restProps} = props
    const form = Form.useFormInstance()
    const extractors = Form.useWatch("extractors", form) || []
    const onReset = useMemoizedFn((restValue) => {
        form.setFieldsValue({
            ...restValue
        })
        onChangeValue(restValue)
    })
    const onRemoveExtractors = useMemoizedFn((i) => {
        const newExtractors = extractors.filter((m, n) => n !== i)
        form.setFieldsValue({
            extractors: newExtractors
        })
        onChangeValue(newExtractors)
    })
    /** setFieldsValue Does Not Trigger Form onValuesChange, Throw to External Solution */
    const onChangeValue = useMemoizedFn((restValue) => {
        if (onSetValue) {
            const v = form.getFieldsValue()
            onSetValue({
                ...v,
                ...restValue
            })
        }
    })
    const onEditExtractors = useMemoizedFn((index: number) => {
        onEdit(index, "extractors")
    })
    const extractorValue = useCreation(() => {
        return {
            extractorList: extractors
        }
    }, [extractors])
    return (
        <>
            <YakitPanel
                {...restProps}
                header={
                    <div className={styles["matchers-panel"]}>
                        Data Extractor
                        <div className={styles["matchers-number"]}>{extractors?.length}</div>
                    </div>
                }
                key='Data Extractor'
                extra={
                    <>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={(e) => {
                                e.stopPropagation()
                                const restValue = {
                                    extractors: []
                                }
                                onReset(restValue)
                            }}
                            size='small'
                        >
                            Reset
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton
                            type='text'
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddMatchingAndExtractionCard("extractors")
                            }}
                            className={styles["btn-padding-right-0"]}
                        >
                            Add/Debug
                            <HollowLightningBoltIcon />
                        </YakitButton>
                    </>
                }
            >
                <ExtractorsList
                    extractorValue={extractorValue}
                    onAdd={() => onAddMatchingAndExtractionCard("extractors")}
                    onRemove={onRemoveExtractors}
                    onEdit={onEditExtractors}
                />
            </YakitPanel>
        </>
    )
})
const variableModeOptions = [
    {
        value: "nuclei-dsl",
        label: "nuclei"
    },
    {
        value: "fuzztag",
        label: "fuzztag"
    },
    {
        value: "raw",
        label: "raw"
    }
]
interface VariablePanelProps {
    pageId: string
    defaultHttpResponse: string
    onAdd: (s: string) => void
    onSetValue: (v: AdvancedConfigValueProps) => void
}
export const VariablePanel: React.FC<VariablePanelProps> = React.memo((props) => {
    const {defaultHttpResponse, onAdd, pageId, onSetValue, ...restProps} = props
    const form = Form.useFormInstance()
    const params = Form.useWatch("params", form) || []

    const variableRef = useRef<any>()

    const onResetPrams = useMemoizedFn(() => {
        const newParams = [{Key: "", Value: "", Type: "raw"}]
        form.setFieldsValue({
            params: newParams
        })
        variableRef.current?.setVariableActiveKey(["0"])
        onChangeValue({
            params: newParams
        })
    })
    /** @description Variable Preview */
    const onRenderVariables = useMemoizedFn((e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation()
        ipcRenderer
            .invoke("RenderVariables", {
                Params: form.getFieldValue("params") || [],
                HTTPResponse: StringToUint8Array(defaultHttpResponse || defMatcherAndExtractionCode)
            })
            .then((rsp: {Results: {Key: string; Value: string}[]}) => {
                showYakitModal({
                    title: "Rendered Variable Content",
                    footer: <></>,
                    width: "60%",
                    content: (
                        <ExtractionResultsContent
                            list={(rsp.Results || []).filter((i) => {
                                return !(i.Key === "" && i.Value === "")
                            })}
                        />
                    )
                })
            })
            .catch((err) => {
                yakitNotify("error", "Preview Failed:" + err)
            })
    })
    const onAddPrams = useMemoizedFn(() => {
        onAdd("Set Variable")
        const index = params.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            const newParams = [...params, {Key: "", Value: "", Type: "raw"}]
            form.setFieldsValue({
                params: newParams
            })
            onChangeValue({
                params: newParams
            })
            onSetActiveKey()
        } else {
            yakitFailed(`Please Add Variable${index}】Pre-Add Settings`)
        }
    })

    const onSetActiveKey = useMemoizedFn(() => {
        const newActiveKeys = [...(variableRef.current?.variableActiveKey || []), `${params?.length || 0}`]
        variableRef.current?.setVariableActiveKey([...newActiveKeys])
    })
    const onRemove = useMemoizedFn((index: number) => {
        const newParams = params.filter((_, i) => i !== index)
        form.setFieldsValue({
            params: [...newParams]
        })
        onChangeValue({
            params: newParams
        })
    })
    /** setFieldsValue Does Not Trigger Form onValuesChange, Throw to External Solution */
    const onChangeValue = useMemoizedFn((restValue) => {
        if (onSetValue) {
            const v = form.getFieldsValue()
            onSetValue({
                ...v,
                ...restValue
            })
        }
    })
    return (
        <>
            <YakitPanel
                {...restProps}
                header='Set Variable'
                key='Set Variable'
                extra={
                    <>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={(e) => {
                                e.stopPropagation()
                                onResetPrams()
                            }}
                            size='small'
                        >
                            Reset
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton type='text' onClick={onRenderVariables} size='small'>
                            Preview
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddPrams()
                            }}
                            className={styles["btn-padding-right-0"]}
                            size='small'
                        >
                            Add
                            <OutlinePlusIcon />
                        </YakitButton>
                    </>
                }
                className={styles["params-panel"]}
            >
                <VariableList
                    cacheType='variableActiveKeys'
                    pageId={pageId}
                    ref={variableRef}
                    field='params'
                    onDel={onRemove}
                    extra={(i, info) => (
                        <Form.Item name={[info.name, "Type"]} noStyle wrapperCol={{span: 24}}>
                            <YakitRadioButtons
                                style={{marginLeft: 4}}
                                buttonStyle='solid'
                                options={variableModeOptions}
                                size={"small"}
                            />
                        </Form.Item>
                    )}
                ></VariableList>
            </YakitPanel>
        </>
    )
})
