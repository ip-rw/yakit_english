import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {PluginDebugBodyProps, PluginDebugProps} from "./PluginDebugType"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePuzzleIcon, OutlineRefreshIcon, OutlineSparklesIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {GetPluginLanguage, pluginTypeToName} from "../builtInData"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {CodeScoreModule} from "../funcTemplate"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, yakitNotify} from "@/utils/notification"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {Divider, Form} from "antd"
import {
    ExecuteEnterNodeByPluginParams,
    OutputFormComponentsByType,
    PluginExecuteProgress,
    PluginFixFormParams
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "../pluginsType"
import {
    ExtraParamsNodeByType,
    FixExtraParamsNode
} from "../operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {CustomPluginExecuteFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {ParamsToGroupByGroupName, getValueByType, getYakExecutorParam, onCodeToInfo} from "../editDetails/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {DebugPluginRequest, apiCancelDebugPlugin, apiDebugPlugin} from "../utils"

import classNames from "classnames"
import styles from "./PluginDebug.module.scss"

export const PluginDebug: React.FC<PluginDebugProps> = memo((props) => {
    const {plugin, getContainer, visible, onClose, onMerge} = props

    const getContainerSize = useSize(getContainer)
    // Drawer Display Height
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    /** Plugin Type */
    const pluginType = useMemo(() => {
        return plugin?.Type || "yak"
    }, [plugin])

    // Plugin Code (Modified))
    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            return () => {
                setContent("")
            }
        }
    }, [visible])

    // Close
    const onCancel = useMemoizedFn(() => {
        if (onClose) onClose()
    })

    /** --------------- Auto Grade Start --------------- */
    const [scoreShow, setScoreShow] = useState<boolean>(false)
    const onOpenScore = useMemoizedFn(() => {
        if (!scoreShow) {
            setIsPass(0)
            setTimeout(() => {
                setScoreShow(true)
            }, 10)
        }
    })
    /** @Description Undetected;Fail;Pass */
    const [isPass, setIsPass] = useState<number>(0)
    // Pass Grade?
    const onCallbackScore = useMemoizedFn((v: boolean) => {
        setIsPass(v ? 2 : 1)
    })
    const onOkScore = useMemoizedFn(() => {
        onOpenDiff()
        onCancelScore()
    })
    const onCancelScore = useMemoizedFn(() => {
        if (scoreShow) setScoreShow(false)
    })
    /** --------------- Auto Grade End --------------- */

    /** --------------- Merge Code Start --------------- */
    const [diffShow, setDiffShow] = useState<boolean>(false)
    // Force Update Comparator Display
    const triggerDiffUpdate = useRef<boolean>(false)
    // Editor Language
    const diffLanguage = useMemo(() => {
        return GetPluginLanguage(pluginType)
    }, [pluginType])

    const onOpenDiff = useMemoizedFn(() => {
        if (!plugin) {
            failed("Plugin Info Not Found, Close Debug and Retry")
            return
        }

        if (plugin.Content === content) {
            if (onClose) onClose()
            return
        } else {
            triggerDiffUpdate.current = !triggerDiffUpdate.current
            setDiffShow(true)
        }
    })
    const onOkDiff = useMemoizedFn(() => {
        if (onMerge) onMerge(content)
        onCancelDiff()
    })
    const onCancelDiff = useMemoizedFn(() => {
        if (diffShow) setDiffShow(false)
    })
    /** --------------- Merge Code End --------------- */

    return (
        <>
            <YakitDrawer
                getContainer={getContainer}
                placement='bottom'
                mask={false}
                closable={false}
                keyboard={false}
                height={showHeight}
                visible={visible}
                className={classNames(styles["plugin-debug-drawer"])}
                title={<div className={styles["header-title"]}>Plugin Debug</div>}
                extra={
                    <div className={styles["header-extra-wrapper"]}>
                        <YakitButton type='outline2' icon={<OutlineSparklesIcon />} onClick={onOpenScore}>
                            Auto Grade
                        </YakitButton>
                        <YakitButton icon={<OutlinePuzzleIcon />} onClick={onOpenDiff}>
                            Merge Code
                        </YakitButton>

                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onCancel} />
                    </div>
                }
                onClose={onCancel}
            >
                {visible && <PluginDebugBody plugin={plugin} newCode={content} setNewCode={setContent} />}
            </YakitDrawer>

            <YakitModal
                title='Code Comparison'
                type='white'
                width='80%'
                centered={true}
                maskClosable={false}
                closable={true}
                visible={diffShow}
                okText='Merge'
                onCancel={onCancelDiff}
                onOk={onOkDiff}
            >
                <div className={styles["diff-code-modal"]}>
                    <YakitDiffEditor
                        leftDefaultCode={plugin?.Content || ""}
                        leftReadOnly={true}
                        rightDefaultCode={content}
                        setRightCode={setContent}
                        triggerUpdate={triggerDiffUpdate.current}
                        language={diffLanguage}
                    />
                </div>
            </YakitModal>

            <YakitModal
                title='Plugin Grade'
                type='white'
                width={506}
                centered={true}
                maskClosable={false}
                closable={true}
                destroyOnClose={true}
                visible={scoreShow}
                okText='Merge Code'
                okButtonProps={{
                    icon: <OutlinePuzzleIcon />,
                    style: isPass === 2 ? undefined : {display: "none"}
                }}
                cancelButtonProps={{style: isPass !== 0 ? undefined : {display: "none"}}}
                onOk={onOkScore}
                onCancel={onCancelScore}
            >
                <CodeScoreModule
                    type={pluginType}
                    code={content}
                    isStart={scoreShow}
                    successWait={10}
                    successHint='Passed Validation'
                    failedHint='Validation Failed, Modify as Prompted'
                    callback={onCallbackScore}
                />
            </YakitModal>
        </>
    )
})

export const PluginDebugBody: React.FC<PluginDebugBodyProps> = memo((props) => {
    const {plugin, newCode, setNewCode} = props

    /** Plugin Type */
    const pluginType = useMemo(() => {
        return plugin?.Type || "yak"
    }, [plugin])
    // Plugin Tag Color
    const pluginTypeColor = useMemo(() => {
        try {
            return pluginTypeToName[pluginType].color || undefined
        } catch (error) {
            return undefined
        }
    }, [pluginType])

    // Plugin Params
    const [params, setParams] = useState<YakParamProps[]>([])
    /** Required Params */
    const requiredParams = useMemo(() => {
        return params.filter((item) => !!item.Required) || []
    }, [params])
    /** Optional Params */
    const groupParams = useMemo(() => {
        const arr = params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [params])

    const [fetchParamsLoading, setFetchParamsLoading] = useState<boolean>(false)
    // Fetch Params
    const onFetchParams = useMemoizedFn(async () => {
        if (fetchParamsLoading) return
        if (!plugin) {
            failed("Plugin Info Not Found, Close Debug and Retry")
            return
        }

        setFetchParamsLoading(true)
        const codeInfo = await onCodeToInfo(plugin.Type, newCode || "")
        if (codeInfo) {
            setParams(codeInfo.CliParameter)
        }
        setTimeout(() => {
            setFetchParamsLoading(false)
        }, 200)
    })

    // init
    useEffect(() => {
        if (plugin) {
            if (plugin.Type === "yak") setParams(plugin.Params || [])
            // Fixed Params for Non-Yak Plugin
            else setParams([])
            setNewCode(newCode || plugin.Content || "")
        } else {
            failed("Plugin Info Not Found, Close Debug and Retry")
        }

        return () => {
            setParams([])
        }
    }, [plugin])
    // Update Form Content
    useUpdateEffect(() => {
        initFormValue()
    }, [params])

    /** --------------- Partial Logic Start --------------- */
    const [form] = Form.useForm()

    // Set Non-Yak|Lua) Plugin Param Default
    const onSettingDefault = useMemoizedFn(() => {
        let defaultValue: CustomPluginExecuteFormValue = {
            IsHttps: false,
            IsRawHTTPRequest: false,
            RawHTTPRequest: Buffer.from("", "utf-8"),
            Method: "GET",
            Path: [],
            GetParams: [],
            Headers: [],
            Cookie: []
        }
        form.setFieldsValue({...defaultValue})
    })

    const initFormValue = useMemoizedFn(() => {
        if (!["yak", "lua"].includes(pluginType)) {
            onSettingDefault()
            return
        }

        // Data in Form
        let formData: CustomPluginExecuteFormValue = {}
        if (form) formData = (form.getFieldsValue() || {}) as CustomPluginExecuteFormValue

        let newFormValue: CustomPluginExecuteFormValue = {}
        params.forEach((ele) => {
            let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
            const value = getValueByType(initValue, ele.TypeVerbose)
            newFormValue = {
                ...newFormValue,
                [ele.Field]: value
            }
        })
        form.setFieldsValue({...newFormValue})
    })

    const pluginRequiredItem = (type: string) => {
        switch (type) {
            case "yak":
            case "lua":
                return (
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={pluginType}
                        isExecuting={isExecuting}
                    />
                )
            case "codec":
                const codecItem: YakParamProps = {
                    Field: "Input",
                    FieldVerbose: "Input",
                    Required: true,
                    TypeVerbose: "yak",
                    DefaultValue: "",
                    Help: "Input"
                }
                return (
                    <OutputFormComponentsByType
                        key='Input-Input'
                        item={codecItem}
                        codeType='plaintext'
                        disabled={isExecuting}
                    />
                )
            case "mitm":
            case "port-scan":
            case "nuclei":
                return <PluginFixFormParams form={form} disabled={isExecuting} />
            default:
                return null
        }
    }

    /** Request Type - Hide Extra Params for Raw Requests */
    const requestType = Form.useWatch("requestType", form)

    /** Hide Optional Params? */
    const isShowGroupParams = useMemo(() => {
        if (pluginType === "yak" || pluginType === "lua") return false
        if (requestType !== "input") return true
        return false
    }, [pluginType, requestType])

    const pathRef = useRef<YakitBaseSelectRef>({
        onGetRemoteValues: () => {},
        onSetRemoteValues: (s: string[]) => {}
    })
    /** Reset Fixed Params in Form */
    const onSettingExtraParams = useMemoizedFn((restValue) => {
        form.setFieldsValue({...restValue})
    })

    const pluginOptionalItem = (type: string) => {
        switch (type) {
            case "yak":
            case "lua":
                return groupParams.length > 0 ? (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>Extra Params (Optional))</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={pluginType} />

                        <div className={styles["to-end"]}>End of Content～</div>
                    </>
                ) : null

            case "mitm":
            case "port-scan":
            case "nuclei":
                return (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>Extra Params (Optional))</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <FixExtraParamsNode
                            form={form}
                            pathRef={pathRef}
                            onReset={onSettingExtraParams}
                            bordered={true}
                            httpPathWrapper={styles["optional-params-wrapper"]}
                        />
                    </>
                )

            default:
                return null
        }
    }
    /** --------------- Partial Logic End --------------- */

    /** --------------- Execute Partial Logic Start --------------- */
    const [activeTab, setActiveTab] = useState<string>("code")

    /** In Progress? */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")
    const tokenRef = useRef<string>(randomString(40))
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => setIsExecuting(false), 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `Guest: ${rId}`)
            setRuntimeId(rId)
        }
    })

    const onStartExecute = useMemoizedFn(() => {
        if (form) {
            form.validateFields()
                .then((value: any) => {
                    // console.log("Form Values on Plugin Execution", value)
                    // Save Param - Request Path Options
                    if (pathRef && pathRef.current) {
                        pathRef.current.onSetRemoteValues(value?.Path || [])
                    }

                    const requestParams: DebugPluginRequest = {
                        Code: newCode,
                        PluginType: pluginType,
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    switch (pluginType) {
                        case "yak":
                        case "lua":
                            const request: Record<string, any> = {}
                            for (let el of params) request[el.Field] = value[el.Field] || undefined
                            requestParams.ExecParams = getYakExecutorParam({...value})
                            break
                        case "codec":
                            break
                        case "mitm":
                        case "port-scan":
                        case "nuclei":
                            requestParams.HTTPRequestTemplate = {
                                ...value,
                                IsRawHTTPRequest: value.requestType === "original",
                                RawHTTPRequest: value.RawHTTPRequest
                                    ? Buffer.from(value.RawHTTPRequest, "utf8")
                                    : Buffer.from("", "utf8")
                            }
                            break
                        default:
                            break
                    }

                    debugPluginStreamEvent.reset()
                    setRuntimeId("")
                    setActiveTab("execResult")
                    apiDebugPlugin(requestParams, tokenRef.current).then(() => {
                        setIsExecuting(true)
                        debugPluginStreamEvent.start()
                    })
                })
                .catch(() => {})
        }
    })

    /**Text Empty If No Answer */
    const onStopExecute = useMemoizedFn(() => {
        apiCancelDebugPlugin(tokenRef.current).then(() => {
            debugPluginStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /** --------------- Execute Partial Logic End --------------- */

    // Dock Mode - Floating
    return (
        <div className={styles["plugin-debug-wrapper"]}>
            <div className={styles["left-wrapper"]}>
                <YakitCard
                    title='Param List'
                    style={{borderTop: 0}}
                    headClassName={styles["left-header-wrapper"]}
                    extra={
                        <div className={styles["header-extra"]}>
                            {plugin?.Type === "yak" && (
                                <>
                                    <YakitButton type='text' loading={fetchParamsLoading} onClick={onFetchParams}>
                                        Fetch Params
                                        <OutlineRefreshIcon />
                                    </YakitButton>
                                    <div className={styles["divider-wrapper"]}></div>
                                </>
                            )}
                            {isExecuting ? (
                                <YakitButton danger onClick={onStopExecute}>
                                    Just Input
                                </YakitButton>
                            ) : (
                                <YakitButton icon={<SolidPlayIcon />} onClick={onStartExecute}>
                                    Update Last Item
                                </YakitButton>
                            )}
                        </div>
                    }
                    bodyClassName={styles["left-body-wrapper"]}
                >
                    <div className={styles["form-wrapper"]}>
                        <Form
                            form={form}
                            onFinish={() => {}}
                            size='small'
                            labelCol={{span: 8}}
                            wrapperCol={{span: 16}}
                            labelWrap={true}
                            validateMessages={{
                                /* eslint-disable no-template-curly-in-string */
                                required: "${label} Required Field"
                            }}
                        >
                            <div className={styles["custom-params-wrapper"]}>{pluginRequiredItem(pluginType)}</div>
                            {isShowGroupParams ? null : pluginOptionalItem(pluginType)}
                        </Form>
                    </div>
                </YakitCard>
            </div>
            <div className={styles["right-wrapper"]}>
                <div className={styles["right-header-wrapper"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={activeTab}
                        options={[
                            {value: "code", label: "Source Code"},
                            {value: "execResult", label: "Execution result"}
                        ]}
                        onChange={(e) => setActiveTab(e.target.value)}
                    />
                    <div className={styles["header-info"]}>
                        <YakitTag color={pluginTypeColor as YakitTagColor}>
                            {pluginTypeToName[pluginType].name || pluginType}
                        </YakitTag>
                        {
                            <div
                                className={classNames(styles["info-name"], "yakit-content-single-ellipsis")}
                                title={plugin?.ScriptName || ""}
                            >
                                {plugin?.ScriptName || ""}
                            </div>
                        }
                    </div>
                </div>

                <div className={styles["right-body-wrapper"]}>
                    <div
                        tabIndex={activeTab !== "code" ? -1 : 1}
                        className={classNames(styles["tab-show"], {
                            [styles["tab-hidden"]]: activeTab !== "code"
                        })}
                    >
                        <YakitEditor type={pluginType} value={newCode} setValue={setNewCode} />
                    </div>

                    <div
                        tabIndex={activeTab !== "execResult" ? -1 : 1}
                        className={classNames(styles["tab-show"], {
                            [styles["tab-hidden"]]: activeTab !== "execResult"
                        })}
                    >
                        {runtimeId ? (
                            <>
                                {streamInfo.progressState.length > 1 && (
                                    <div className={styles["plugin-executing-progress"]}>
                                        {streamInfo.progressState.map((ele, index) => (
                                            <React.Fragment key={ele.id}>
                                                {index !== 0 && <Divider type='vertical' style={{margin: 0, top: 2}} />}
                                                <PluginExecuteProgress percent={ele.progress} name={ele.id} />
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                                <div className={styles["result-body"]}>
                                    <PluginExecuteResult
                                        streamInfo={streamInfo}
                                        runtimeId={runtimeId}
                                        loading={isExecuting}
                                    />
                                </div>
                            </>
                        ) : (
                            <YakitEmpty style={{marginTop: 60}} description={"Click 'Execute' to Start"} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
})
