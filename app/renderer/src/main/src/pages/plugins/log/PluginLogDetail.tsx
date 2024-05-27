import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePuzzleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {SolidBanIcon} from "@/assets/icon/solid"
import {PluginLogDetailProps} from "./PluginLogDetailType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginBaseParamProps, PluginDataProps, PluginSettingParamProps} from "../pluginsType"
import {pluginTypeToName} from "../builtInData"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {PluginDebugBody} from "../pluginDebug/PluginDebug"
import classNames from "classnames"
import {apiAuditPluginDetaiCheck, apiFetchPluginDetailCheck} from "../utils"
import {API} from "@/services/swagger/resposeType"
import {convertRemoteToLocalRisks, convertRemoteToRemoteInfo, onCodeToInfo} from "../editDetails/utils"
import {yakitNotify} from "@/utils/notification"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Form} from "antd"
import {CodeScoreModule} from "../funcTemplate"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import styles from "./PluginLogDetail.module.scss"

export const PluginLogDetail: React.FC<PluginLogDetailProps> = memo((props) => {
    const {getContainer, uuid, info, visible, onClose, onChange} = props

    const getContainerSize = useSize(getContainer)
    // Drawer Display Height
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    const [activeTab, setActiveTab] = useState<string>("diff")

    // Close
    const onCancel = useMemoizedFn(() => {
        onClose()
    })

    /** ---------- Fetch Plugin Log Info Start ---------- */
    const [fetchLoading, setFetchLoading] = useState<boolean>(false)

    // PR Modify Data
    const [prInfo, setPRInfo] = useState<API.PluginsAuditDetailResponse>()
    // Plugin type
    const pluginType = useMemo(() => {
        if (prInfo) return prInfo.type || undefined
        return "yak" || undefined
    }, [prInfo])
    // Plugin Type Name and Tag Color
    const pluginTypeTag = useMemo(() => {
        if (pluginType && pluginTypeToName[pluginType]) {
            return {
                color: pluginTypeToName[pluginType].color,
                name: pluginTypeToName[pluginType].name || pluginType
            }
        }
        return undefined
    }, [pluginType])
    // Plugin Language
    const pluginLanguage = useMemo(() => {
        if (pluginType) {
            return pluginTypeToName[pluginType]?.language || "yak"
        }
        return undefined
    }, [pluginType])
    // Editor and Reason for Editing
    // const [apply, setApply] = useState<{name: string; img: string; description: string}>()

    // Base Info
    const baseInfo = useRef<PluginBaseParamProps>()
    // Config Info
    const settingInfo = useRef<PluginSettingParamProps>()

    // Comparator - Source
    const oldCode = useRef<string>("")
    // Comparator - Modify Source
    const [newCode, setNewCode] = useState<string>("")
    // Trigger Comparator Refresh
    const [triggerDiff, setTriggerDiff] = useState<boolean>(true)
    useUpdateEffect(() => {
        setTriggerDiff((prev) => !prev)
    }, [activeTab])

    // Plugin Debug Data
    const [plugin, setPlugin] = useState<PluginDataProps>()

    // Fetch Plugin PR Info
    const fetchPluginInfo = useMemoizedFn(() => {
        if (fetchLoading) return

        setFetchLoading(true)
        apiFetchPluginDetailCheck({uuid: uuid, list_type: "log", up_log_id: info.id})
            .then(async (res) => {
                if (res) {
                    // console.log(
                    //     `method:post|api:plugins/audit/detail`,
                    //     `\nrequest:${JSON.stringify({uuid: uuid, list_type: "log", up_log_id: info.id})}`,
                    //     `\nresponse"${JSON.stringify(res)}`
                    // )
                    setPRInfo(res)
                    // Fetch Comparator - Modify Source
                    setNewCode(res.content)
                    // Fetch Comparator - Source
                    if (res.merge_before_plugins) oldCode.current = res.merge_before_plugins.content || ""
                    // Fetch Editor Info
                    // if (res.apply_user_name && res.apply_user_head_img) {
                    //     setApply({
                    //         name: res.apply_user_name || "",
                    //         img: res.apply_user_head_img || "",
                    //         description: res.logDescription || ""
                    //     })
                    // }
                    // Fetch Base Info
                    let infoData: PluginBaseParamProps = {
                        ScriptName: res.script_name,
                        Help: res.help,
                        RiskDetail: convertRemoteToLocalRisks(res.riskInfo),
                        Tags: []
                    }
                    try {
                        infoData.Tags = (res.tags || "").split(",") || []
                    } catch (error) {}
                    baseInfo.current = {...infoData}
                    // Fetch Config Info
                    let settingData: PluginSettingParamProps = {
                        EnablePluginSelector: !!res.enable_plugin_selector,
                        PluginSelectorTypes: res.plugin_selector_types,
                        Content: res.content || ""
                    }
                    settingInfo.current = {...settingData}
                    //Fetch Param Info
                    const paramsList =
                        res.type === "yak" ? await onCodeToInfo(res.type, res.content) : {CliParameter: []}
                    setPlugin({
                        ScriptName: res.script_name,
                        Type: res.type,
                        Params: paramsList?.CliParameter || [],
                        Content: res.content
                    })
                    setTriggerDiff((prev) => !prev)
                } else {
                    yakitNotify("error", `Fetch Modify Content Empty, Please Retry!`)
                    onCancel()
                }
            })
            .catch((err) => {
                onCancel()
            })
            .finally(() => {
                setTimeout(() => {
                    setFetchLoading(false)
                }, 200)
            })
    })

    useEffect(() => {
        if (visible) {
            if (uuid && info) fetchPluginInfo()
        }
    }, [visible])
    /** ---------- Fetch Plugin Log Info End ---------- */

    const [modifyLoading, setModifyLoading] = useState<boolean>(false)
    // Merge|Cancel Merge
    const changePRInfo: (isPass: boolean, reason?: string) => Promise<string> = useMemoizedFn((isPass, reason) => {
        return new Promise(async (resolve, reject) => {
            if (prInfo) {
                // Generate Merge Result Data
                const audit: API.PluginsAudit = {
                    listType: "log",
                    status: isPass ? "true" : "false",
                    uuid: prInfo.uuid,
                    logDescription: (reason || "").trim() || undefined,
                    upPluginLogId: prInfo.up_log_id || 0
                }
                // Generate Plugin Data
                const data: PluginDataProps = {
                    ScriptName: prInfo.script_name,
                    Type: prInfo.type,
                    Content: newCode,
                    Help: baseInfo.current?.Help,
                    Tags: (baseInfo.current?.Tags || []).join(",") || undefined,
                    EnablePluginSelector: settingInfo.current?.EnablePluginSelector,
                    PluginSelectorTypes: settingInfo.current?.PluginSelectorTypes
                }
                // Yak Type - Source Analysis for Params and Risks
                if (data.Type === "yak") {
                    const codeInfo = await onCodeToInfo(data.Type, data.Content)
                    if (codeInfo) {
                        data.RiskDetail = codeInfo.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
                        data.Params = codeInfo.CliParameter
                    }
                } else {
                    // Non-yak Type - Exclude Params and Risks
                    data.RiskDetail = []
                    data.Params = []
                }
                const info = convertRemoteToRemoteInfo(prInfo, data)

                apiAuditPluginDetaiCheck({...info, ...audit})
                    .then(() => {
                        resolve("success")
                    })
                    .catch(() => {
                        reject()
                    })
            } else {
                yakitNotify("error", `Plugin Modification Info Not Found, Please Close and Retry`)
                reject()
            }
        })
    })

    /** ---------- Cancel Merge Start ---------- */
    const [noPass, setNoPass] = useState<boolean>(false)
    const [form] = Form.useForm()
    const onOpenNoPass = useMemoizedFn(() => {
        if (modifyLoading) return

        if (noPass) return
        if (form) form.setFieldsValue({noPassReason: ""})
        setModifyLoading(true)
        setNoPass(true)
    })
    // Submit Reason for Not Merging
    const submitNoPass = useMemoizedFn(() => {
        if (form) {
            form.validateFields()
                .then((value: {noPassReason: string}) => {
                    setModifyLoading(true)
                    changePRInfo(false, value.noPassReason)
                        .then(() => {
                            onChange(false, value.noPassReason)
                        })
                        .catch(() => {
                            onCancelNoPass()
                        })
                })
                .catch(() => {})
        }
    })
    const onCancelNoPass = useMemoizedFn(() => {
        setNoPass(false)
        setModifyLoading(false)
    })
    /** ---------- Cancel Merge End ---------- */

    /** ---------- Merge Code Start ---------- */
    const [pass, setPass] = useState<boolean>(false)
    const onOpenPass = useMemoizedFn(() => {
        if (modifyLoading) return

        if (prInfo?.is_private) {
            setModifyLoading(true)
            changePRInfo(true)
                .then(() => {
                    onChange(true)
                })
                .catch(() => {
                    setTimeout(() => {
                        setModifyLoading(false)
                    }, 300)
                })
        } else {
            if (pass) return
            setModifyLoading(true)
            setScore(0)
            setPass(true)
        }
    })
    /** @Description 0 - Undetected;1 - Unqualified;2 - Qualified */
    const [score, setScore] = useState<number>(0)
    // Scoring Check Callback
    const onCallbackScore = useMemoizedFn((pass: boolean) => {
        if (!pass) {
            setScore(1)
            return
        }
        setModifyLoading(true)
        changePRInfo(true)
            .then(() => {
                onChange(true)
            })
            .catch(() => {
                setTimeout(() => {
                    setModifyLoading(false)
                }, 300)
            })
    })
    const onCancelPass = useMemoizedFn(() => {
        setPass(false)
    })
    /** ---------- Merge Code End ---------- */

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
                className={classNames(styles["plugin-log-detail-drawer"])}
                title={
                    <YakitRadioButtons
                        size='large'
                        buttonStyle='solid'
                        value={activeTab}
                        options={[
                            {value: "diff", label: "Source Comparison"},
                            {value: "debug", label: "Plugin Debug"}
                        ]}
                        onChange={(e) => setActiveTab(e.target.value)}
                    />
                }
                extra={
                    <div className={styles["header-extra-wrapper"]}>
                        <YakitButton
                            type='outline1'
                            colors='danger'
                            loading={modifyLoading}
                            icon={<SolidBanIcon />}
                            onClick={onOpenNoPass}
                        >
                            Cancel Merge
                        </YakitButton>
                        <YakitButton
                            colors='success'
                            loading={modifyLoading}
                            icon={<OutlinePuzzleIcon />}
                            onClick={onOpenPass}
                        >
                            Merge Code
                        </YakitButton>

                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onCancel} />
                    </div>
                }
                onClose={onCancel}
            >
                <YakitSpin spinning={fetchLoading}>
                    <div className={styles["plugin-log-wrapper"]}>
                        {activeTab === "diff" && (
                            <div className={styles["diff-wrapper"]}>
                                {(true || !!pluginTypeTag) && (
                                    <div className={styles["diff-header"]}>
                                        <YakitTag color={pluginTypeTag?.color as YakitTagColor}>
                                            {pluginTypeTag?.name || ""}
                                        </YakitTag>
                                        <div className={styles["header-title"]}>{plugin?.ScriptName || ""}</div>
                                    </div>
                                )}
                                <div className={styles["diff-body"]}>
                                    {pluginLanguage && (
                                        <YakitDiffEditor
                                            leftDefaultCode={oldCode.current}
                                            leftReadOnly={true}
                                            rightDefaultCode={newCode}
                                            setRightCode={setNewCode}
                                            triggerUpdate={triggerDiff}
                                            language={pluginLanguage}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === "debug" && (
                            <PluginDebugBody plugin={plugin} newCode={newCode} setNewCode={setNewCode} />
                        )}
                    </div>
                </YakitSpin>
            </YakitDrawer>

            <YakitModal
                title='Reason for Not Merging Description'
                type='white'
                width={448}
                centered={true}
                maskClosable={false}
                closable={true}
                visible={noPass}
                onCancel={onCancelNoPass}
                onOk={submitNoPass}
            >
                <Form form={form}>
                    <Form.Item label='' name='noPassReason' rules={[{required: true, message: "Reason for Not Merging Required"}]}>
                        <YakitInput.TextArea
                            placeholder='Briefly Describe Reason for Not Merging, to Inform Editor...'
                            autoSize={{minRows: 3, maxRows: 3}}
                            showCount
                            maxLength={150}
                        />
                    </Form.Item>
                </Form>
            </YakitModal>

            <YakitModal
                title='Modify Source Scoring'
                type='white'
                width={506}
                centered={true}
                maskClosable={false}
                closable={false}
                destroyOnClose={true}
                visible={pass}
                okButtonProps={{style: {display: "none"}}}
                footer={score === 1 ? undefined : null}
                onCancel={onCancelPass}
            >
                <CodeScoreModule
                    type={pluginType || "yak"}
                    code={"yakit.AutoInitYakit()\n\n# Input your code!\n\n"}
                    isStart={pass}
                    successWait={10}
                    successHint='Good Performance, Pass Check, Begin Merge Modification'
                    failedHint='Check Failed, Modify According to Tips'
                    callback={onCallbackScore}
                />
            </YakitModal>
        </>
    )
})
