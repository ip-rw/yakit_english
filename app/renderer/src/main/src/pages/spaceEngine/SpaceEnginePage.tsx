import React, {ReactNode, useEffect, useRef, useState} from "react"
import styles from "./SpaceEnginePage.module.scss"
import {OutlineInformationcircleIcon, OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {Form} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    GetSpaceEngineAccountStatusRequest,
    GetSpaceEngineStatusProps,
    apiCancelFetchPortAssetFromSpaceEngine,
    apiFetchPortAssetFromSpaceEngine,
    apiGetGlobalNetworkConfig,
    apiGetSpaceEngineAccountStatus,
    apiGetSpaceEngineStatus,
    apiSetGlobalNetworkConfig
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {
    GlobalNetworkConfig,
    ThirdPartyApplicationConfig,
    defaultParams
} from "@/components/configNetwork/ConfigNetworkPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ThirdPartyApplicationConfigForm} from "@/components/configNetwork/ThirdPartyApplicationConfig"
import {OutputFormComponentsByType} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "../plugins/pluginsType"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {SpaceEngineStartParams, SpaceEngineStatus, getDefaultSpaceEngineStartParams} from "@/models/SpaceEngine"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {ZoomeyeHelp} from "./ZoomeyeHelp"

interface SpaceEnginePageProps {
    /**Page ID */
    pageId: string
}
export const SpaceEnginePage: React.FC<SpaceEnginePageProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Space_Engine, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.Space_Engine].label
    })
    const [form] = Form.useForm()
    /**Expand?/Collapse */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())
    /**Is Executing */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [scanBeforeSave, setScanBeforeSave] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    const spaceEngineWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(spaceEngineWrapperRef)
    const tokenRef = useRef<string>(randomString(40))

    const defaultTabs = useCreation(() => {
        if (scanBeforeSave) {
            return [
                {tabName: "Scan Port List", type: "port"},
                {tabName: "Logs", type: "log"},
                {tabName: "Console", type: "console"}
            ]
        }
        return [
            {tabName: "Logs", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [scanBeforeSave])

    const [streamInfo, spaceEngineStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "FetchPortAssetFromSpaceEngine",
        apiKey: "FetchPortAssetFromSpaceEngine",
        token: tokenRef.current,
        onEnd: () => {
            spaceEngineStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
                setIsExecuting(false)
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `Debug Task ID on Start: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        if (inViewport) emiter.on("secondMenuTabDataChange", onSetTabName)
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
        }
    }, [inViewport])
    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageInfo())
    })
    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })
    const onStartExecute = useMemoizedFn((value) => {
        setScanBeforeSave(!!value?.ScanBeforeSave)
        spaceEngineStreamEvent.reset()
        setExecuteStatus("process")
        setRuntimeId("")
        const params: SpaceEngineStartParams = {
            ...value,
            PageSize: 100,
            Concurrent: 20
        }
        apiFetchPortAssetFromSpaceEngine(params, tokenRef.current).then(() => {
            setIsExecuting(true)
            setIsExpand(false)
            spaceEngineStreamEvent.start()
        })
    })
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiCancelFetchPortAssetFromSpaceEngine(tokenRef.current).then(() => {
            spaceEngineStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /**Execute Button at Top */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    return (
        <div className={styles["space-engine-wrapper"]} ref={spaceEngineWrapperRef}>
            <ExpandAndRetract
                className={styles["space-engine-heard"]}
                onExpand={onExpand}
                isExpand={isExpand}
                status={executeStatus}
            >
                <span className={styles["space-engine-heard-tabName"]}>{tabName}</span>
                <div>
                    {isExecuting
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={onStopExecute}>
                                      Exec Plugin Names Array
                                  </YakitButton>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onExecuteInTop}>Risk Items</YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )}
                </div>
            </ExpandAndRetract>
            <div className={styles["space-engine-content"]}>
                <div
                    className={classNames(styles["space-engine-form-wrapper"], {
                        [styles["space-engine-form-wrapper-hidden"]]: !isExpand
                    })}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //Center Input Field
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} Required Field"
                        }}
                        labelWrap={true}
                        initialValues={getDefaultSpaceEngineStartParams()}
                    >
                        <SpaceEngineFormContent disabled={isExecuting} inViewport={inViewport} />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["space-engine-form-operate"]}>
                                {isExecuting ? (
                                    <YakitButton danger onClick={onStopExecute} size='large'>
                                        Exec Plugin Names Array
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        className={styles["space-engine-form-operate-start"]}
                                        htmlType='submit'
                                        size='large'
                                    >
                                        Start Execution
                                    </YakitButton>
                                )}
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {isShowResult && (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                    />
                )}
            </div>
        </div>
    )
})
interface SpaceEngineFormContentProps {
    disabled: boolean
    inViewport: boolean
}
const SpaceEngineFormContent: React.FC<SpaceEngineFormContentProps> = React.memo((props) => {
    const {disabled, inViewport} = props
    const [globalNetworkConfig, setGlobalNetworkConfig] = useState<GlobalNetworkConfig>(defaultParams)
    const [engineStatus, setEngineStatus] = useState<SpaceEngineStatus>()
    useEffect(() => {
        onGetGlobalNetworkConfig()
    }, [inViewport])
    const onSelectType = useMemoizedFn((key) => {
        const param: GetSpaceEngineStatusProps = {
            Type: key
        }
        apiGetSpaceEngineStatus(param).then((value) => {
            switch (value.Status) {
                case "normal":
                    break
                default:
                    yakitNotify("error", "Space Engine Validation Failed" + value.Info || value.Status)
                    onSetGlobalNetworkConfig(key)
                    break
            }
            setEngineStatus(value)
        })
    })
    /**Global Network Config */
    const onGetGlobalNetworkConfig = useMemoizedFn(() => {
        apiGetGlobalNetworkConfig().then(setGlobalNetworkConfig)
    })
    /**Third-Party App Config */
    const onSetGlobalNetworkConfig = useMemoizedFn((type) => {
        const initData: ThirdPartyApplicationConfig = globalNetworkConfig.AppConfigs.find(
            (ele) => ele.Type === type
        ) || {
            APIKey: "",
            Domain: "",
            Namespace: "",
            Type: type,
            UserIdentifier: "",
            UserSecret: "",
            WebhookURL: ""
        }
        let m = showYakitModal({
            title: "Add Third-Party App",
            width: 600,
            closable: true,
            maskClosable: false,
            footer: null,
            content: (
                <div style={{margin: 24}}>
                    <ThirdPartyApplicationConfigForm
                        data={initData}
                        onAdd={(e) => {
                            let existed = false
                            const existedResult = (globalNetworkConfig.AppConfigs || []).map((i) => {
                                if (i.Type === e.Type) {
                                    existed = true
                                    return {...i, ...e}
                                }
                                return {...i}
                            })
                            if (!existed) {
                                existedResult.push(e)
                            }
                            const editItem = existedResult.find((ele) => ele.Type === e.Type)
                            if (editItem) {
                                const checkParams: GetSpaceEngineAccountStatusRequest = {
                                    Type: editItem.Type,
                                    Key: editItem.APIKey,
                                    Account: editItem.UserIdentifier
                                }
                                apiGetSpaceEngineAccountStatus(checkParams).then((value) => {
                                    switch (value.Status) {
                                        case "normal":
                                            const params = {...globalNetworkConfig, AppConfigs: existedResult}
                                            apiSetGlobalNetworkConfig(params).then(() => {
                                                onGetGlobalNetworkConfig()
                                                m.destroy()
                                            })
                                            break
                                        default:
                                            yakitNotify("error", "Set Engine Failed:" + value.Info || value.Status)
                                            break
                                    }
                                })
                            }
                        }}
                        onCancel={() => m.destroy()}
                        isCanInput={false}
                    />
                </div>
            )
        })
    })
    const codecItem: YakParamProps = useCreation(() => {
        return {
            Field: "Filter",
            FieldVerbose: "Search Criteria",
            Required: true,
            TypeVerbose: "yak",
            DefaultValue: "",
            Help: ""
        }
    }, [])
    const engineExtra: ReactNode = useCreation(() => {
        if (!engineStatus) return null
        return (
            <span className={styles["engine-help"]}>
                {engineStatus.Info ? `${engineStatus.Info}，` : ""}
                Remaining Limit：{Number(engineStatus.Remain) === -1 ? "Unlimited" : engineStatus.Remain}
                {engineStatus.Type === "zoomeye" && (
                    <span className={styles["engine-help-zoomeye"]} onClick={() => onOpenHelpModal()}>
                        <span>ZoomEye Base Syntax</span> <OutlineQuestionmarkcircleIcon />
                    </span>
                )}
            </span>
        )
    }, [engineStatus])
    const onOpenHelpModal = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "ZoomEye Base Syntax",
            type: "white",
            width:'60vw',
            cancelButtonProps: {style: {display: "none"}},
            onOkText: "Understood",
            onOk: () => m.destroy(),
            bodyStyle: {padding: '8px 24px'},
            content: <ZoomeyeHelp />
        })
    })
    return (
        <>
            <Form.Item name='Type' label='Engine' rules={[{required: true}]} extra={engineExtra}>
                <YakitSelect
                    options={[
                        {label: "ZoomEye", value: "zoomeye"},
                        {label: "Fofa", value: "fofa"},
                        {label: "Hunter", value: "hunter"},
                        {label: "Shodan", value: "shodan"},
                        {label: "Quake", value: "quake"}
                    ]}
                    onSelect={onSelectType}
                    disabled={disabled}
                />
            </Form.Item>
            <OutputFormComponentsByType item={codecItem} codeType='plaintext' disabled={disabled} />
            <Form.Item name='MaxPage' label='Max Pages' rules={[{required: true}]}>
                <YakitInputNumber min={1} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item name='MaxRecord' label='Max Records' rules={[{required: true}]}>
                <YakitInputNumber min={1} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='ScanBeforeSave'
                label='Scan Validation'
                rules={[{required: true}]}
                valuePropName='checked'
                tooltip={{
                    icon: <OutlineInformationcircleIcon />,
                    title: "Enable Scan for Yakit Port Validation"
                }}
            >
                <YakitSwitch size='large' disabled={disabled} />
            </Form.Item>
        </>
    )
})
