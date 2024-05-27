import {
    InformationCircleIcon,
    PlusSmIcon,
    PlusIcon,
    TrashIcon,
    ResizerIcon,
    HollowLightningBoltIcon,
    EyeIcon
} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {useInViewport, useMemoizedFn} from "ahooks"
import {Form, Tooltip, Space, Divider} from "antd"
import React, {useState, useRef, useEffect, useMemo, ReactNode} from "react"
import {inputHTTPFuzzerHostConfigItem} from "../HTTPFuzzerHosts"
import {HttpQueryAdvancedConfigProps, AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"
import styles from "./HttpQueryAdvancedConfig.module.scss"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {
    ExtractorItem,
    MatcherAndExtractionDrawer,
    MatcherItem
} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import classNames from "classnames"
import {
    ExtractorValueProps,
    MatcherValueProps,
    MatchingAndExtraction
} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {YakitPopover, YakitPopoverProp} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AutoTextarea} from "../components/AutoTextarea/AutoTextarea"
import "hint.css"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import emiter from "@/utils/eventBus/eventBus"
import {AgentConfigModal} from "@/pages/mitm/MITMServerStartForm/MITMServerStartForm"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {OutlineBadgecheckIcon} from "@/assets/icon/outline"
import {CacheDropDownGV} from "@/yakitGV"
import {ExtractorsPanel, MatchersPanel, VariablePanel} from "./FuzzerConfigPanels"
import {DefFuzzerTableMaxData} from "@/defaultConstants/HTTPFuzzerPage"
import {matcherTypeList, extractorTypeList} from "../MatcherAndExtractionCard/constants"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

const WEB_FUZZ_Advanced_Config_ActiveKey = "WEB_FUZZ_Advanced_Config_ActiveKey"

const fuzzTagModeOptions = [
    {
        value: "close",
        label: "Close"
    },
    {
        value: "standard",
        label: "Standard"
    },
    {
        value: "legacy",
        label: "Compatible"
    }
]

const fuzzTagSyncOptions = [
    {
        value: false,
        label: "Cross Product"
    },
    {
        value: true,
        label: "Fork/Sync"
    }
]

type fields = keyof AdvancedConfigValueProps

export const HttpQueryAdvancedConfig: React.FC<HttpQueryAdvancedConfigProps> = React.memo((props) => {
    const {
        advancedConfigValue,
        visible,
        onInsertYakFuzzer,
        onValuesChange,
        defaultHttpResponse,
        outsideShowResponseMatcherAndExtraction,
        onShowResponseMatcherAndExtraction,
        inViewportCurrent,
        id,
        matchSubmitFun,
        showFormContentType,
        proxyListRef,
        isbuttonIsSendReqStatus
    } = props

    const [activeKey, setActiveKey] = useState<string[]>() // Collapse opened key

    const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
    const [defActiveKey, setDefActiveKey] = useState<string>("")
    const [type, setType] = useState<MatchingAndExtraction>("matchers")

    const [httpResponse, setHttpResponse] = useState<string>(defaultHttpResponse)

    const [form] = Form.useForm()
    const queryRef = useRef(null)
    const [inViewport = true] = useInViewport(queryRef)

    const [batchTargetModalVisible, setBatchTargetModalVisible] = useState<boolean>(false)

    // Match-Only Popups
    const [isOpenByMacth, setOpenByMacth] = useState<boolean>(false)

    const retry = useMemo(() => advancedConfigValue.retry, [advancedConfigValue.retry])
    const noRetry = useMemo(() => advancedConfigValue.noRetry, [advancedConfigValue.noRetry])
    const etcHosts = useMemo(() => advancedConfigValue.etcHosts || [], [advancedConfigValue.etcHosts])
    const matchersList = useMemo(() => advancedConfigValue.matchers || [], [advancedConfigValue.matchers])
    const extractorList = useMemo(() => advancedConfigValue.extractors || [], [advancedConfigValue.extractors])
    const matchersCondition = useMemo(
        () => advancedConfigValue.matchersCondition,
        [advancedConfigValue.matchersCondition]
    )
    const filterMode = useMemo(() => advancedConfigValue.filterMode, [advancedConfigValue.filterMode])
    const hitColor = useMemo(() => advancedConfigValue.hitColor || "red", [advancedConfigValue.hitColor])
    const batchTarget = useMemo(
        () => advancedConfigValue.batchTarget || new Uint8Array(),
        [advancedConfigValue.batchTarget]
    )

    useEffect(() => {
        setHttpResponse(defaultHttpResponse)
    }, [defaultHttpResponse])

    useEffect(() => {
        if (!inViewport) setVisibleDrawer(false)
    }, [inViewport])

    useEffect(() => {
        emiter.on("openMatcherAndExtraction", openDrawer)
        getRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey).then((data) => {
            try {
                // setTimeout(() => {
                //     setActiveKey(data ? JSON.parse(data) : "Request Config")
                // }, 100)
                setActiveKey(data ? JSON.parse(data) : "Request Config")
            } catch (error) {
                yakitFailed("Failed to Get Active Panel Key:" + error)
            }
        })
        return () => {
            emiter.off("openMatcherAndExtraction", openDrawer)
        }
    }, [])

    const openDrawer = useMemoizedFn((val) => {
        try {
            const res = JSON.parse(val)
            if (inViewportCurrent && !visibleDrawer) {
                setVisibleDrawer(true)
            }
            setHttpResponse(res.httpResponseCode)
        } catch (error) {
            yakitNotify("error", "Data Parse Failed in openMatcherAndExtraction")
        }
    })

    useEffect(() => {
        form.setFieldsValue(advancedConfigValue)
    }, [advancedConfigValue])

    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        let newValue: AdvancedConfigValueProps = {...advancedConfigValue, ...allFields}
        if (newValue.isGmTLS) {
            newValue.isHttps = true
        }
        onValuesChange({
            ...newValue
        })
    })
    /**
     * @Toggle Collapse, Cache activeKey
     */
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
        setRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey, JSON.stringify(key))
    })
    const onReset = useMemoizedFn((restValue) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            ...restValue
        })
    })
    /**Add Extra Ops, Expand On Add When Collapsed */
    const onAddExtra = useMemoizedFn((type: string) => {
        if (activeKey?.findIndex((ele) => ele === type) === -1) {
            onSwitchCollapse([...activeKey, type])
        }
    })

    const onAddMatchingAndExtractionCard = useMemoizedFn((type: MatchingAndExtraction) => {
        const keyMap = {
            matchers: "Matcher",
            extractors: "Data Extractor"
        }
        if (activeKey?.findIndex((ele) => ele === keyMap[type]) === -1) {
            onSwitchCollapse([...activeKey, keyMap[type]])
        }
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction(type, "ID:0")
        } else {
            setType(type)
            setVisibleDrawer(true)
        }
    })

    const onOpenMatchingAndExtractionCardEvent = useMemoizedFn((pageId: string) => {
        if (pageId === id) {
            onAddMatchingAndExtractionCard("matchers")
            setOpenByMacth(true)
        }
    })

    useEffect(() => {
        emiter.on("onOpenMatchingAndExtractionCard", onOpenMatchingAndExtractionCardEvent)
        return () => {
            emiter.off("onOpenMatchingAndExtractionCard", onOpenMatchingAndExtractionCardEvent)
        }
    }, [])

    /**Edit Matchers & Extractors */
    const onEdit = useMemoizedFn((index, type: MatchingAndExtraction) => {
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction("matchers", `ID:${index}`)
        } else {
            setVisibleDrawer(true)
            setDefActiveKey(`ID:${index}`)
            setType(type)
        }
    })
    const retryActive: string[] = useMemo(() => {
        let newRetryActive = ["Retry Condition"]
        if (retry) {
            newRetryActive = [...newRetryActive, "Retry Condition"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "Retry Condition")
        }
        if (noRetry) {
            newRetryActive = [...newRetryActive, "No Retry Condition"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "No Retry Condition")
        }
        return newRetryActive
    }, [retry, noRetry])

    const getTextWidth = (text: string) => {
        const tempElement = document.createElement("span")
        tempElement.style.cssText = `
            display: inline-block;
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
        `
        tempElement.textContent = text
        document.body.appendChild(tempElement)
        const width = tempElement.clientWidth
        document.body.removeChild(tempElement)
        return width
    }
    const onClose = useMemoizedFn(() => {
        if (isOpenByMacth) {
            setOpenByMacth(false)
        }
        setVisibleDrawer(false)
    })
    const onSave = useMemoizedFn((matcher, extractor) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            filterMode: matcher.filterMode,
            hitColor: matcher.hitColor || "red",
            matchersCondition: matcher.matchersCondition,
            matchers: matcher.matchersList || [],
            extractors: extractor.extractorList || []
        })
        if (isOpenByMacth) {
            setTimeout(() => {
                matchSubmitFun()
            }, 500)
        }
    })

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)

    const methodGetRef = useRef<any>()
    const methodPostRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()
    // Add
    const handleVariableAdd = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: fields,
        actKey: string,
        val: object,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = v[field] || []
        const index = variables.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            form.setFieldsValue({
                [field]: [...variables, {...val}]
            })
            onSetValue({
                ...v,
                [field]: [...variables, {...val}]
            })
            if (ref.current) {
                ref.current.setVariableActiveKey([
                    ...(ref.current.variableActiveKey || []),
                    `${variables?.length || 0}`
                ])
            }
        } else {
            yakitFailed(`Var Added${index}】Add After Setting`)
        }
        if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
            setActiveKey([...activeKey, actKey])
        }
    }
    // Delete
    const handleVariableDel = (i: number, field: fields) => {
        const v = form.getFieldsValue()
        const variables = v[field] || []
        variables.splice(i, 1)
        form.setFieldsValue({
            [field]: [...variables]
        })
        onSetValue({
            ...v,
            [field]: [...variables]
        })
    }
    // Reset
    const handleVariableReset = useMemoizedFn(
        (
            e: React.MouseEvent<HTMLElement, MouseEvent>,
            field: fields,
            val: object,
            ref: React.MutableRefObject<any>
        ) => {
            e.stopPropagation()
            onReset({
                [field]: [{...val}]
            })
            if (ref.current) {
                ref.current.setVariableActiveKey(["0"])
            }
        }
    )

    const renderContent = useMemoizedFn(() => {
        switch (showFormContentType) {
            case "config":
                return (
                    <>
                        <div className={styles["advanced-config-extra-formItem"]}>
                            <Form.Item label='Force HTTPS' name='isHttps' valuePropName='checked'>
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item label='SM TLS' name='isGmTLS' valuePropName='checked'>
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        Real Host
                                        <Tooltip title='Configure Real Host for Collision' overlayStyle={{width: 150}}>
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>
                                }
                                name='actualHost'
                            >
                                <YakitInput placeholder='Please Enter...' size='small' />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        Set Proxy
                                        <Tooltip
                                            title='Auto-Select Proxy for Requests'
                                            overlayStyle={{width: 150}}
                                        >
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>
                                }
                                name='proxy'
                                style={{marginBottom: 5}}
                            >
                                <YakitSelect
                                    ref={proxyListRef}
                                    cacheHistoryDataKey={CacheDropDownGV.WebFuzzerProxyList}
                                    isCacheDefaultValue={false}
                                    defaultOptions={[
                                        {
                                            label: "http://127.0.0.1:7890",
                                            value: "http://127.0.0.1:7890"
                                        },
                                        {
                                            label: "http://127.0.0.1:8080",
                                            value: "http://127.0.0.1:8080"
                                        },
                                        {
                                            label: "http://127.0.0.1:8082",
                                            value: "http://127.0.0.1:8082"
                                        }
                                    ]}
                                    allowClear
                                    placeholder='Please Enter...'
                                    mode='tags'
                                    size='small'
                                    maxTagCount={1}
                                    dropdownMatchSelectWidth={245}
                                />
                            </Form.Item>
                            <YakitButton
                                size='small'
                                type='text'
                                onClick={() => setAgentConfigModalVisible(true)}
                                icon={<PlusSmIcon />}
                                style={{marginLeft: 100, marginBottom: 12}}
                            >
                                Configure Proxy Auth
                            </YakitButton>
                            <Form.Item label={"Disable System Proxy"} name={"noSystemProxy"} valuePropName='checked'>
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item label='Response Limit' name='resNumlimit' style={{marginBottom: 12}}>
                                <YakitInputNumber
                                    type='horizontal'
                                    size='small'
                                    min={1}
                                    max={DefFuzzerTableMaxData}
                                    disabled={!isbuttonIsSendReqStatus}
                                />
                            </Form.Item>
                        </div>
                        <YakitCollapse
                            activeKey={activeKey}
                            onChange={(key) => onSwitchCollapse(key)}
                            destroyInactivePanel={true}
                        >
                            <YakitPanel
                                header='Request Config'
                                key='Request Config'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                fuzzTagMode: "standard",
                                                fuzzTagSyncIndex: false,
                                                isHttps: false,
                                                noFixContentLength: false,
                                                actualHost: "",
                                                timeout: 30
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        Reset
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='Fuzztag Helper'>
                                    <YakitButton
                                        size='small'
                                        type='outline1'
                                        onClick={() => onInsertYakFuzzer()}
                                        icon={<PlusSmIcon />}
                                    >
                                        Insert yak.fuzz Syntax
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item
                                    label={
                                        <span className={styles["advanced-config-form-label"]}>
                                            Render Fuzz
                                            <Tooltip
                                                title='Omit Inner Braces in Nested Compatible Mode {{base64(url(www.example.com))}}，Standard Mode Must, Disable Fuzztag on Close。'
                                                overlayStyle={{width: 150}}
                                            >
                                                <InformationCircleIcon className={styles["info-icon"]} />
                                            </Tooltip>
                                        </span>
                                    }
                                    name='fuzzTagMode'
                                >
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        options={fuzzTagModeOptions}
                                        size={"small"}
                                    />
                                </Form.Item>

                                <Form.Item label='Render Mode' name='fuzzTagSyncIndex'>
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        options={fuzzTagSyncOptions}
                                        size={"small"}
                                    />
                                </Form.Item>

                                <Form.Item label='No Length Fix' name='noFixContentLength' valuePropName='checked'>
                                    <YakitSwitch />
                                </Form.Item>

                                <Form.Item label='Timeout Duration' name='timeout' style={{marginBottom: 12}}>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item label='Batch Targets' name='batchTarget' style={{marginBottom: 0}}>
                                    <YakitButton
                                        style={{marginTop: 3}}
                                        size='small'
                                        type='text'
                                        onClick={() => setBatchTargetModalVisible(true)}
                                        icon={
                                            JSON.stringify(advancedConfigValue.batchTarget) !== "{}" ? (
                                                Uint8ArrayToString(
                                                    advancedConfigValue.batchTarget || new Uint8Array()
                                                ) ? (
                                                    <OutlineBadgecheckIcon style={{color: "#56C991"}} />
                                                ) : (
                                                    <PlusSmIcon />
                                                )
                                            ) : (
                                                <PlusSmIcon />
                                            )
                                        }
                                    >
                                        {JSON.stringify(advancedConfigValue.batchTarget) !== "{}" ? (
                                            Uint8ArrayToString(advancedConfigValue.batchTarget || new Uint8Array()) ? (
                                                <div style={{color: "#56C991"}}>Configured</div>
                                            ) : (
                                                "Configure Batch Targets"
                                            )
                                        ) : (
                                            "Configure Batch Targets"
                                        )}
                                    </YakitButton>
                                </Form.Item>
                            </YakitPanel>
                            <YakitPanel
                                header='Concurrency Config'
                                key='Packet Config'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                concurrent: 20,
                                                proxy: [],
                                                noSystemProxy: false,
                                                minDelaySeconds: undefined,
                                                maxDelaySeconds: undefined,
                                                repeatTimes: 0
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        Reset
                                    </YakitButton>
                                }
                            >
                                <Form.Item
                                    label='Repeat Requests'
                                    name='repeatTimes'
                                    help={`For Testing Race Conditions/High Concurrency`}
                                >
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item label='Concurrent Threads' name='concurrent'>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>

                                <Form.Item label='Random Delay' style={{marginBottom: 0}}>
                                    <div className={styles["advanced-config-delay"]}>
                                        <Form.Item
                                            name='minDelaySeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                prefix='Min'
                                                suffix='s'
                                                size='small'
                                                className={styles["delay-input-left"]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name='maxDelaySeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                prefix='Max'
                                                suffix='s'
                                                size='small'
                                                className={styles["delay-input-right"]}
                                            />
                                        </Form.Item>
                                    </div>
                                </Form.Item>
                            </YakitPanel>
                            <YakitPanel
                                header='Retry Config'
                                key='Retry Config'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                maxRetryTimes: 3,
                                                retrying: true,
                                                noRetrying: false,
                                                retryConfiguration: {
                                                    statusCode: undefined,
                                                    keyWord: undefined
                                                },
                                                noRetryConfiguration: {
                                                    statusCode: undefined,
                                                    keyWord: undefined
                                                }
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        Reset
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='Retry Count' name='maxRetryTimes'>
                                    <YakitInputNumber type='horizontal' size='small' min={0} />
                                </Form.Item>
                                <YakitCollapse activeKey={retryActive} destroyInactivePanel={true} bordered={false}>
                                    <YakitPanel
                                        header={
                                            <Form.Item name='retry' noStyle valuePropName='checked'>
                                                <YakitCheckbox>
                                                    <span style={{marginLeft: 6, cursor: "pointer"}}>Retry Condition</span>
                                                </YakitCheckbox>
                                            </Form.Item>
                                        }
                                        key='Retry Condition'
                                        className={styles["advanced-config-collapse-secondary-item"]}
                                    >
                                        <Form.Item label='Status Code' name={["retryConfiguration", "statusCode"]}>
                                            <YakitInput placeholder='200,300-399' size='small' disabled={!retry} />
                                        </Form.Item>
                                    </YakitPanel>
                                    <YakitPanel
                                        header={
                                            <Form.Item name='noRetry' noStyle valuePropName='checked'>
                                                <YakitCheckbox>
                                                    <span style={{marginLeft: 6, cursor: "pointer"}}>No Retry Condition</span>
                                                </YakitCheckbox>
                                            </Form.Item>
                                        }
                                        key='No Retry Condition'
                                        className={styles["advanced-config-collapse-secondary-item"]}
                                    >
                                        <Form.Item
                                            label='Status Code'
                                            name={["noRetryConfiguration", "statusCode"]}
                                            style={{marginBottom: 0}}
                                        >
                                            <YakitInput placeholder='200,300-399' size='small' disabled={!noRetry} />
                                        </Form.Item>
                                    </YakitPanel>
                                </YakitCollapse>
                            </YakitPanel>
                            <YakitPanel
                                header='Redirect Config'
                                key='Redirect Config'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                redirectCount: 3,
                                                noFollowRedirect: true,
                                                followJSRedirect: false
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        Reset
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='Disable Redirect' name='noFollowRedirect' valuePropName={"checked"}>
                                    <YakitSwitch />
                                </Form.Item>
                                <Form.Item label='Redirect Count' name='redirectCount'>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item
                                    label='JS Redirect'
                                    name='followJSRedirect'
                                    valuePropName={"checked"}
                                    style={{marginBottom: 0}}
                                >
                                    <YakitSwitch />
                                </Form.Item>
                            </YakitPanel>
                            <YakitPanel
                                header={"DNS Config"}
                                key={"DNS Config"}
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                dnsServers: [],
                                                etcHosts: []
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        Reset
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='DNS Server' name='dnsServers'>
                                    <YakitSelect
                                        options={["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"].map((i) => {
                                            return {value: i, label: i}
                                        })}
                                        mode='tags'
                                        allowClear={true}
                                        size={"small"}
                                        placeholder={"Specify DNS Server"}
                                    />
                                </Form.Item>
                                <Form.Item label={"Hosts Config"} name='etcHosts' style={{marginBottom: 0}}>
                                    <Space direction={"vertical"}>
                                        {(etcHosts || []).map((i, n) => (
                                            <Tooltip
                                                title={
                                                    getTextWidth(`${i.Key} => ${i.Value}`) >= 123
                                                        ? `${i.Key} => ${i.Value}`
                                                        : ""
                                                }
                                                key={`${i.Key} => ${i.Value}`}
                                            >
                                                <YakitTag
                                                    closable={true}
                                                    onClose={() => {
                                                        const newEtcHosts = etcHosts.filter((j) => j.Key !== i.Key)
                                                        const v = form.getFieldsValue()
                                                        onSetValue({
                                                            ...v,
                                                            etcHosts: newEtcHosts
                                                        })
                                                    }}
                                                    key={`${i.Key}-${n}`}
                                                >
                                                    <div
                                                        className={styles.etcHostsText}
                                                    >{`${i.Key} => ${i.Value}`}</div>
                                                </YakitTag>
                                            </Tooltip>
                                        ))}
                                        <YakitButton
                                            onClick={() => {
                                                inputHTTPFuzzerHostConfigItem((obj) => {
                                                    const newEtcHosts = [
                                                        ...etcHosts.filter((i) => i.Key !== obj.Key),
                                                        obj
                                                    ]
                                                    const v = form.getFieldsValue()
                                                    onSetValue({
                                                        ...v,
                                                        etcHosts: newEtcHosts
                                                    })
                                                })
                                            }}
                                        >
                                            Add Hosts Mapping
                                        </YakitButton>
                                    </Space>
                                </Form.Item>
                            </YakitPanel>
                        </YakitCollapse>
                    </>
                )
            case "rule":
                return (
                    <>
                        <YakitCollapse
                            activeKey={activeKey}
                            onChange={(key) => onSwitchCollapse(key)}
                            destroyInactivePanel={true}
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
                                key='Set Variable'
                                defaultHttpResponse={defaultHttpResponse}
                                onAdd={onAddExtra}
                                pageId={id}
                                onSetValue={onSetValue}
                            />
                            <YakitPanel
                                header='GET Params'
                                key='GET Params'
                                extra={
                                    <>
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            onClick={(e) =>
                                                handleVariableReset(e, "methodGet", {Key: "", Value: ""}, methodGetRef)
                                            }
                                            size='small'
                                        >
                                            Reset
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "methodGet",
                                                    "GET Params",
                                                    {Key: "", Value: ""},
                                                    methodGetRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
                                            size='small'
                                        >
                                            Add
                                            <PlusIcon />
                                        </YakitButton>
                                    </>
                                }
                            >
                                <VariableList
                                    ref={methodGetRef}
                                    field='methodGet'
                                    onDel={(i) => handleVariableDel(i, "methodGet")}
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
                                            onClick={(e) =>
                                                handleVariableReset(
                                                    e,
                                                    "methodPost",
                                                    {Key: "", Value: ""},
                                                    methodPostRef
                                                )
                                            }
                                            size='small'
                                        >
                                            Reset
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "methodPost",
                                                    "POST Params",
                                                    {Key: "", Value: ""},
                                                    methodPostRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
                                            size='small'
                                        >
                                            Add
                                            <PlusIcon />
                                        </YakitButton>
                                    </>
                                }
                            >
                                <VariableList
                                    ref={methodPostRef}
                                    field='methodPost'
                                    onDel={(i) => handleVariableDel(i, "methodPost")}
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
                                            onClick={(e) =>
                                                handleVariableReset(e, "cookie", {Key: "", Value: ""}, cookieRef)
                                            }
                                            size='small'
                                        >
                                            Reset
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "cookie",
                                                    "Cookie",
                                                    {Key: "", Value: ""},
                                                    cookieRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
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
                                    field='cookie'
                                    onDel={(i) => handleVariableDel(i, "cookie")}
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
                                            onClick={(e) =>
                                                handleVariableReset(e, "headers", {Key: "", Value: ""}, headersRef)
                                            }
                                            size='small'
                                        >
                                            Reset
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "headers",
                                                    "Header",
                                                    {Key: "", Value: ""},
                                                    headersRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
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
                                    field='headers'
                                    onDel={(i) => handleVariableDel(i, "headers")}
                                ></VariableList>
                            </YakitPanel>
                        </YakitCollapse>
                    </>
                )
            default:
                return <></>
        }
    })
    return (
        <div
            className={classNames(styles["http-query-advanced-config"])}
            style={{display: visible ? "" : "none"}}
            ref={queryRef}
        >
            <Form
                form={form}
                colon={false}
                onValuesChange={(changedFields, allFields) => {
                    onSetValue(allFields)
                }}
                size='small'
                labelCol={{span: 10}}
                wrapperCol={{span: 14}}
                style={{overflowY: "auto"}}
                initialValues={{
                    ...advancedConfigValue
                }}
            >
                {renderContent()}
                <div className={styles["to-end"]}>Reached Bottom～</div>
            </Form>
            <MatcherAndExtractionDrawer
                visibleDrawer={visibleDrawer}
                defActiveType={type}
                httpResponse={httpResponse}
                defActiveKey={defActiveKey}
                matcherValue={{filterMode, matchersList: matchersList || [], matchersCondition, hitColor}}
                extractorValue={{extractorList: extractorList || []}}
                onClose={onClose}
                onSave={onSave}
            />
            <AgentConfigModal
                agentConfigModalVisible={agentConfigModalVisible}
                onCloseModal={() => setAgentConfigModalVisible(false)}
                generateURL={(url) => {
                    const v = form.getFieldsValue()
                    const copyProxyArr = structuredClone(v.proxy)
                    copyProxyArr.push(url)
                    proxyListRef.current.onSetRemoteValues([...new Set(copyProxyArr)])
                    onSetValue({
                        ...v,
                        proxy: [...new Set(copyProxyArr)]
                    })
                }}
            ></AgentConfigModal>
            <BatchTargetModal
                batchTargetModalVisible={batchTargetModalVisible}
                onCloseModal={() => setBatchTargetModalVisible(false)}
                batchTarget={batchTarget}
                getBatchTarget={(batchTarget) => {
                    const v = form.getFieldsValue()
                    onSetValue({
                        ...v,
                        batchTarget
                    })
                }}
            ></BatchTargetModal>
        </div>
    )
})

interface BatchTargetModalProp {
    batchTargetModalVisible: boolean
    onCloseModal: () => void
    batchTarget: Uint8Array
    getBatchTarget: (batchTarget: Uint8Array) => void
}

// Batch Targets
const BatchTargetModal: React.FC<BatchTargetModalProp> = React.memo((props) => {
    const {batchTargetModalVisible, onCloseModal, batchTarget, getBatchTarget} = props
    const [form] = Form.useForm()

    const onOKFun = useMemoizedFn(async () => {
        form.validateFields().then((values) => {
            getBatchTarget(StringToUint8Array(values.BatchTarget) || new Uint8Array())
            onCloseModal()
        })
    })

    const onClose = useMemoizedFn(() => {
        form.resetFields()
        onCloseModal()
    })

    return (
        <YakitModal
            visible={batchTargetModalVisible}
            title='Configure Batch Targets'
            width={600}
            maskClosable={false}
            destroyOnClose={true}
            closable
            centered
            okText='Confirm'
            onCancel={onClose}
            onOk={onOKFun}
            bodyStyle={{padding: 0}}
        >
            <div style={{padding: 15}}>
                <Form
                    form={form}
                    colon={false}
                    onSubmitCapture={(e) => e.preventDefault()}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                    style={{height: "100%"}}
                    initialValues={{
                        BatchTarget: JSON.stringify(batchTarget) === "{}" ? "" : Uint8ArrayToString(batchTarget)
                    }}
                >
                    <YakitFormDraggerContent
                        style={{width: "100%"}}
                        formItemProps={{
                            name: "BatchTarget",
                            label: "Scan Target",
                            rules: [{required: false}]
                        }}
                        accept='.txt,.xlsx,.xls,.csv'
                        textareaProps={{
                            placeholder: "Enter Scan Targets, Separate Multiple with“English Comma”Or New Line Separated",
                            rows: 3
                        }}
                        help='Drag TXT, Excel files here or'
                        valueSeparator={"\r\n"}
                        fileLimit={1024}
                    />
                </Form>
            </div>
        </YakitModal>
    )
})

interface SetVariableItemProps {
    name: number
}

export const SetVariableItem: React.FC<SetVariableItemProps> = React.memo((props) => {
    const {name} = props

    return (
        <div className={styles["variable-item"]}>
            <Form.Item name={[name, "Key"]} noStyle wrapperCol={{span: 24}}>
                <input placeholder='Variable Name' className={styles["variable-item-input"]} />
            </Form.Item>

            <div className={styles["variable-item-textarea-body"]}>
                <Form.Item name={[name, "Value"]} noStyle wrapperCol={{span: 24}}>
                    <AutoTextarea className={styles["variable-item-textarea"]} placeholder='Variable Value' />
                </Form.Item>
                <ResizerIcon className={styles["resizer-icon"]} />
            </div>
        </div>
    )
})

interface MatchersListProps {
    matcherValue: MatcherValueProps
    onAdd: () => void
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}
/**Matcher */
export const MatchersList: React.FC<MatchersListProps> = React.memo((props) => {
    const {matcherValue, onAdd, onRemove, onEdit} = props
    const {matchersList} = matcherValue
    return (
        <>
            <Form.List name='matchers'>
                {() => (
                    <>
                        {matchersList.map((matcherItem, index) => (
                            <Form.Item noStyle key={`ID:${index}`}>
                                <div className={styles["matchersList-item"]} key={`ID:${index}`}>
                                    <div className={styles["matchersList-item-heard"]}>
                                        <span className={styles["item-id"]}>ID&nbsp;{index}</span>
                                        <span>
                                            [{matcherTypeList.find((e) => e.value === matcherItem.MatcherType)?.label}]
                                        </span>
                                        <span className={styles["item-number"]}>{matcherItem.Group?.length}</span>
                                    </div>
                                    <MatchersAndExtractorsListItemOperate
                                        onRemove={() => onRemove(index)}
                                        onEdit={() => onEdit(index)}
                                        popoverContent={
                                            <MatcherItem
                                                matcherItem={matcherItem}
                                                onEdit={() => {}}
                                                notEditable={true}
                                                httpResponse=''
                                            />
                                        }
                                    />
                                </div>
                            </Form.Item>
                        ))}
                    </>
                )}
            </Form.List>
            {matchersList?.length === 0 && (
                <>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon />}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        Add
                    </YakitButton>
                </>
            )}
        </>
    )
})

interface ExtractorsListProps {
    extractorValue: ExtractorValueProps
    onAdd: () => void
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}
/**Data Extractor */
export const ExtractorsList: React.FC<ExtractorsListProps> = React.memo((props) => {
    const {extractorValue, onAdd, onRemove, onEdit} = props
    const {extractorList} = extractorValue
    return (
        <>
            <Form.List name='extractors'>
                {() => (
                    <>
                        {extractorList.map((extractorItem, index) => (
                            <Form.Item noStyle key={`${extractorItem.Name}-${index}`}>
                                <div className={styles["matchersList-item"]}>
                                    <div className={styles["matchersList-item-heard"]}>
                                        <span className={styles["item-id"]}>
                                            {extractorItem.Name || `data_${index}`}
                                        </span>
                                        <span>
                                            [{extractorTypeList.find((e) => e.value === extractorItem.Type)?.label}]
                                        </span>
                                        <span className={styles["item-number"]}>{extractorItem.Groups?.length}</span>
                                    </div>
                                    <MatchersAndExtractorsListItemOperate
                                        onRemove={() => onRemove(index)}
                                        onEdit={() => onEdit(index)}
                                        popoverContent={
                                            <ExtractorItem
                                                extractorItem={extractorItem}
                                                onEdit={() => {}}
                                                notEditable={true}
                                                httpResponse=''
                                            />
                                        }
                                    />
                                </div>
                            </Form.Item>
                        ))}
                    </>
                )}
            </Form.List>
            {extractorList?.length === 0 && (
                <>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon />}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        Add
                    </YakitButton>
                </>
            )}
        </>
    )
})

interface MatchersAndExtractorsListItemOperateProps {
    onRemove: () => void
    onEdit: () => void
    popoverContent: ReactNode
}

const MatchersAndExtractorsListItemOperate: React.FC<MatchersAndExtractorsListItemOperateProps> = React.memo(
    (props) => {
        const {onRemove, onEdit, popoverContent} = props
        const [visiblePopover, setVisiblePopover] = useState<boolean>(false)
        return (
            <div
                className={classNames(styles["matchersList-item-operate"], {
                    [styles["matchersList-item-operate-hover"]]: visiblePopover
                })}
            >
                <TrashIcon className={styles["trash-icon"]} onClick={() => onRemove()} />

                <Tooltip title='Debug'>
                    <HollowLightningBoltIcon
                        className={styles["hollow-lightningBolt-icon"]}
                        onClick={() => {
                            onEdit()
                        }}
                    />
                </Tooltip>
                <TerminalPopover
                    popoverContent={popoverContent}
                    visiblePopover={visiblePopover}
                    setVisiblePopover={setVisiblePopover}
                />
            </div>
        )
    }
)

interface TerminalPopoverProps extends YakitPopoverProp {
    popoverContent: ReactNode
    visiblePopover: boolean
    setVisiblePopover: (b: boolean) => void
}

/**
 * @Description is Test Component, Not Global Use Advised. Fixes antd Popover Arrow Targeting Issue
 */
export const TerminalPopover: React.FC<TerminalPopoverProps> = React.memo((props) => {
    const {popoverContent, visiblePopover, setVisiblePopover} = props
    const popoverContentRef = useRef<any>()
    const terminalIconRef = useRef<any>()
    const onSetArrowTop = useMemoizedFn(() => {
        if (terminalIconRef.current && popoverContentRef.current) {
            try {
                const {top: iconOffsetTop, height: iconHeight} = terminalIconRef.current.getBoundingClientRect()
                const {top: popoverContentOffsetTop} = popoverContentRef.current.getBoundingClientRect()
                const arrowTop = iconOffsetTop - popoverContentOffsetTop + iconHeight / 2
                popoverContentRef.current.style.setProperty("--arrow-top", `${arrowTop}px`)
            } catch (error) {}
        }
    })
    return (
        <YakitPopover
            placement='right'
            overlayClassName={classNames(styles["matching-extraction-content"], styles["terminal-popover"])}
            content={
                <div className={styles["terminal-popover-content"]} ref={popoverContentRef}>
                    {popoverContent}
                </div>
            }
            visible={visiblePopover}
            onVisibleChange={(v) => {
                if (v) {
                    setTimeout(() => {
                        onSetArrowTop()
                    }, 200)
                }
                setVisiblePopover(v)
            }}
        >
            <span ref={terminalIconRef} style={{height: 24, lineHeight: "16px"}}>
                <EyeIcon className={styles["terminal-icon"]} />
            </span>
        </YakitPopover>
    )
})
