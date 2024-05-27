import {YakitRoute} from "@/routes/newRoute"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import React, {useEffect, useRef, useState} from "react"
import {shallow} from "zustand/shallow"
import cloneDeep from "lodash/cloneDeep"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {Form} from "antd"
import styles from "./FuzzerPageSetting.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {yakitFailed} from "@/utils/notification"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {ExtractorsPanel, MatchersPanel, VariablePanel} from "../HttpQueryAdvancedConfig/FuzzerConfigPanels"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {defaultWebFuzzerPageInfo} from "@/defaultConstants/HTTPFuzzerPage"

export interface DebugProps {
    httpResponse: string
    type: MatchingAndExtraction
    activeKey: string
}
interface FuzzerPageSettingProps {
    pageId: string
    defaultHttpResponse: string
    triggerIn: boolean
    triggerOut: boolean
    setTriggerOut: (b: boolean) => void
    onDebug: (v: DebugProps) => void
}
const FuzzerPageSetting: React.FC<FuzzerPageSettingProps> = React.memo((props) => {
    const {pageId, defaultHttpResponse, onDebug, triggerIn, triggerOut, setTriggerOut} = props
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })
    const [form] = Form.useForm()
    const [activeKey, setActiveKey] = useState<string[]>() // Collapse opened key
    const [advancedConfigValue, setAdvancedConfigValue] = useState<AdvancedConfigValueProps>(
        initWebFuzzerPageInfo().advancedConfigValue
    )

    const formBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(formBodyRef)

    useEffect(() => {
        getRemoteValue(RemoteGV.FuzzerSequenceSettingShow).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : ["Matcher", "Data Extractor", "Set Variable"])
            } catch (error) {
                yakitFailed("Failed To Retrieve ActiveKey For SeqConfig Collapse:" + error)
            }
        })
    }, [])
    useUpdateEffect(() => {
        if (!inViewport) return
        const newAdvancedConfigValue = initWebFuzzerPageInfo().advancedConfigValue
        form.setFieldsValue({...newAdvancedConfigValue}) // form.setFieldsValue Does Not Trigger onValuesChange
        setAdvancedConfigValue({...newAdvancedConfigValue})
    }, [pageId, inViewport, triggerIn])
    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        onUpdatePageInfo(allFields)
    })
    const onUpdatePageInfo = useDebounceFn(
        (params: AdvancedConfigValueProps) => {
            if (!pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            if (!currentItem) return
            if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                const newAdvancedConfigValue = {
                    ...advancedConfigValue,
                    ...params
                }
                const newCurrentItem: PageNodeItemProps = {
                    ...currentItem,
                    pageParamsInfo: {
                        webFuzzerPageInfo: {
                            ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                            advancedConfigValue: {
                                ...newAdvancedConfigValue
                            }
                        }
                    }
                }
                updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                // Refresh Latest Value Under pageId
                setTriggerOut(!triggerOut)
            }
        },
        {wait: 500, leading: true}
    ).run
    /**
     * @Toggle Collapse, Cache activeKey
     */
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
        setRemoteValue(RemoteGV.FuzzerSequenceSettingShow, JSON.stringify(key))
    })
    /**Edit Matchers & Extractors */
    const onEdit = useMemoizedFn((index, type: MatchingAndExtraction) => {
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:${index}`
        })
    })
    const onAddMatchingAndExtractionCard = useMemoizedFn((type: MatchingAndExtraction) => {
        const keyMap = {
            matchers: "Matcher",
            extractors: "Data Extractor"
        }
        if (activeKey?.findIndex((ele) => ele === keyMap[type]) === -1) {
            onSwitchCollapse([...activeKey, keyMap[type]])
        }
        onDebug({
            httpResponse: defaultHttpResponse,
            type,
            activeKey: `ID:0`
        })
    })
    /**Add Extra Ops, Expand On Add When Collapsed */
    const onAddExtra = useMemoizedFn((type: string) => {
        if (activeKey?.findIndex((ele) => ele === type) === -1) {
            onSwitchCollapse([...activeKey, type])
        }
    })
    return (
        <div className={styles["form-body"]} ref={formBodyRef}>
            <Form
                form={form}
                colon={false}
                onValuesChange={(changedFields, allFields) => {
                    onSetValue(allFields)
                }}
                size='small'
                labelCol={{span: 10}}
                wrapperCol={{span: 14}}
                initialValues={{
                    ...advancedConfigValue
                }}
            >
                <YakitCollapse
                    activeKey={activeKey}
                    onChange={(key) => onSwitchCollapse(key)}
                    destroyInactivePanel={true}
                    bordered={false}
                >
                    <MatchersPanel
                        key='Matcher'
                        onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                        onEdit={onEdit}
                        onSetValue={onSetValue}
                    />
                    <ExtractorsPanel
                        key='Data Extractor'
                        onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                        onEdit={onEdit}
                        onSetValue={onSetValue}
                    />
                    <VariablePanel
                        pageId={pageId}
                        key='Set Variable'
                        defaultHttpResponse={defaultHttpResponse}
                        onAdd={onAddExtra}
                        onSetValue={onSetValue}
                    />
                </YakitCollapse>

                <div className={styles["to-end"]}>Reached Bottom～</div>
            </Form>
        </div>
    )
})

export default FuzzerPageSetting
