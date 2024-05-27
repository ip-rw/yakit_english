import React, {useState, useMemo, useRef, useEffect} from "react"

import YakitSteps from "./YakitSteps/YakitSteps"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn, useGetState} from "ahooks"
import {Radio, Progress} from "antd"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {randomString} from "@/utils/randomUtil"
import {DownloadOnlinePluginAllResProps} from "@/pages/yakitStore/YakitStorePage"
import {failed, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakScript} from "@/pages/invoker/schema"
import {CodeScoreModule} from "../funcTemplate"
import usePluginUploadHooks, {SaveYakScriptToOnlineRequest, SaveYakScriptToOnlineResponse} from "../pluginUploadHooks"

import "../plugins.scss"
import styles from "./PluginLocalUpload.module.scss"

interface PluginLocalUploadProps {
    pluginNames: string[]
    onClose: () => void
}

const {ipcRenderer} = window.require("electron")

export const PluginLocalUpload: React.FC<PluginLocalUploadProps> = React.memo((props) => {
    const {pluginNames, onClose} = props
    const [current, setCurrent] = useState<number>(0)
    const [isPrivate, setIsPrivate] = useState<boolean>(true)

    const [successPluginNames, setSuccessPluginNames] = useState<string[]>([])

    const onPrivateSelectionPrev = useMemoizedFn((v) => {
        if (v) {
            // true Selected as Private, Skipping Scan, Directly Uploading
            setCurrent(current + 2)
            setSuccessPluginNames(pluginNames)
        } else {
            setCurrent(current + 1)
        }
        setIsPrivate(v)
    })
    const onAutoTestNext = useMemoizedFn((pluginNames) => {
        setCurrent(current + 1)
        setSuccessPluginNames(pluginNames)
    })
    const steps = useMemo(() => {
        return [
            {
                title: "Selective Privacy/Public",
                content: <PluginIsPrivateSelection onNext={onPrivateSelectionPrev} />
            },
            {
                title: "Auto Scan",
                content: (
                    <PluginAutoTest
                        show={current === 1}
                        pluginNames={pluginNames}
                        onNext={onAutoTestNext}
                        onCancel={onClose}
                    />
                )
            },
            {
                title: "Uploading",
                content: (
                    <PluginUpload
                        show={current === 2 && successPluginNames.length > 0}
                        pluginNames={successPluginNames}
                        onSave={onClose}
                        onCancel={onClose}
                        isPrivate={isPrivate}
                    />
                )
            }
        ]
    }, [current, successPluginNames, pluginNames, isPrivate])
    return (
        <div className={styles["plugin-local-upload"]}>
            <YakitSteps current={current}>
                {steps.map((item) => (
                    <YakitSteps.YakitStep key={item.title} title={item.title} />
                ))}
            </YakitSteps>
            <div className={styles["header-wrapper"]}>
                <div className={styles["title-style"]}>Notice：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["opt-content"]}>
                        <div className={styles["content-order"]}>1</div>
                        Batch Upload Supports Only New Additions, Update Plugins via Edit One By One
                    </div>
                </div>
            </div>
            <div className={styles["plugin-local-upload-steps-content"]}>{steps[current]?.content}</div>
        </div>
    )
})

interface PluginIsPrivateSelectionProps {
    /**Next Step */
    onNext: (b: boolean) => void
}
const PluginIsPrivateSelection: React.FC<PluginIsPrivateSelectionProps> = React.memo((props) => {
    const {onNext} = props
    const [isPrivate, setIsPrivate] = useState<boolean>(true)
    const onClickNext = useMemoizedFn(() => {
        onNext(isPrivate)
    })
    return (
        <>
            <div className={styles["plugin-isPrivate-select"]}>
                <Radio
                    className='plugins-radio-wrapper'
                    checked={isPrivate}
                    onClick={(e) => {
                        setIsPrivate(true)
                    }}
                >
                    Private (Viewable By Self Only)
                </Radio>
                <Radio
                    className='plugins-radio-wrapper'
                    checked={!isPrivate}
                    onClick={(e) => {
                        setIsPrivate(false)
                    }}
                >
                    Public (Post-Review, Listed on Plugin Store)
                </Radio>
            </div>
            <div className={styles["plugin-local-upload-steps-action"]}>
                <YakitButton onClick={onClickNext}>Next Step</YakitButton>
            </div>
        </>
    )
})
interface PluginAutoTestProps {
    /**Display Status */
    show: boolean
    /**Selected Plugins */
    pluginNames: string[]
    /**Cancel */
    onCancel: () => void
    /**
     * Next Step
     */
    onNext: (names: string[]) => void
}
interface MessageListProps {
    Message: string
    MessageType: string
}
interface SmokingEvaluatePluginBatchRequest {
    ScriptNames: string[]
}
interface SmokingEvaluatePluginBatchResponse {
    Progress: number
    Message: string
    MessageType: string
}
const PluginAutoTest: React.FC<PluginAutoTestProps> = React.memo((props) => {
    const {show, pluginNames, onNext, onCancel} = props
    const taskTokenRef = useRef(randomString(40))
    const [percent, setPercent] = useState<number>(0)
    const [messageList, setMessageList] = useState<MessageListProps[]>([])
    const [isHaveError, setIsHaveError] = useState<boolean>(false)
    const [isShowRetry, setIsShowRetry] = useState<boolean>(false)
    const [successPluginNames, setSuccessPluginNames] = useState<string[]>([])

    useEffect(() => {
        const taskToken = taskTokenRef.current
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, onProgressData)
        ipcRenderer.on(`${taskToken}-end`, () => {})
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            setIsShowRetry(true)
            yakitNotify("error", "Auto-Score Exception, Please Retry")
        })
        return () => {
            ipcRenderer.invoke("cancel-SmokingEvaluatePluginBatch", taskToken)
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [])
    useEffect(() => {
        if (show) {
            startAutoTest()
            onReset()
        }
    }, [show])
    /**Reset Data */
    const onReset = useMemoizedFn(() => {
        setPercent(0)
        setMessageList([])
        setIsHaveError(false)
        setIsShowRetry(false)
    })
    const onProgressData = useMemoizedFn((_, data: SmokingEvaluatePluginBatchResponse) => {
        try {
            if (data.Progress === 2) {
                const pluginNameList: string[] = JSON.parse(data.Message || "[]") || []
                setSuccessPluginNames(pluginNameList)
                if (pluginNameList.length === pluginNames.length) {
                    yakitNotify("success", "Scan Complete, All Successful, Proceeding to Next Step Upload Automatically")
                    setTimeout(() => {
                        onNext(pluginNameList)
                    }, 200)
                } else if (pluginNameList.length === 0) {
                    yakitNotify("error", "Scan Complete, All Failed, Cannot Proceed with Upload")
                } else {
                    setIsHaveError(true)
                }
            } else {
                const p = Math.floor(data.Progress * 100)
                setPercent(p)
                setMessageList([
                    {
                        Message: data.Message,
                        MessageType: data.MessageType
                    },
                    ...messageList
                ])
            }
        } catch (error) {}
    })
    const startAutoTest = useMemoizedFn(() => {
        const params: SmokingEvaluatePluginBatchRequest = {
            ScriptNames: pluginNames
        }
        ipcRenderer
            .invoke("SmokingEvaluatePluginBatch", params, taskTokenRef.current)
            .then(() => {})
            .catch((e) => {
                failed(`Start Scan Failed:${e}`)
            })
    })
    const onClickNext = useMemoizedFn(() => {
        onNext(successPluginNames)
    })
    const onClickCancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SmokingEvaluatePluginBatch", taskTokenRef.current)
        onCancel()
    })
    const onClickRetry = useMemoizedFn(() => {
        onReset()
        startAutoTest()
    })
    return (
        <>
            <div className={styles["plugin-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `Scanned ${percent}%`}
                />
                {messageList.length > 0 && (
                    <div className={styles["plugin-message-list"]}>
                        {messageList.map((i) => {
                            return (
                                <p
                                    className={classNames(styles["plugin-message"], {
                                        [styles["plugin-message-error"]]: i.MessageType === "error"
                                    })}
                                >
                                    {i.Message}
                                </p>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className={styles["plugin-local-upload-steps-action"]}>
                <YakitButton type='outline2' onClick={onClickCancel}>
                    Cancel
                </YakitButton>
                {isShowRetry && <YakitButton onClick={onClickRetry}>Retry</YakitButton>}
                {isHaveError && <YakitButton onClick={onClickNext}>Next Step</YakitButton>}
            </div>
        </>
    )
})
interface PluginUploadProps {
    /**Upload All Local Plugins with One Click? */
    isUploadAll?: boolean
    /**Selected Plugin as Private/Public Status */
    isPrivate: boolean
    /**Display Status */
    show: boolean
    /**Selected Plugins */
    pluginNames: string[]
    /**Cancel */
    onCancel: () => void
    /**
     * Next Step
     */
    onSave: () => void
    /**Bottom Button ClassName */
    footerClassName?: string
}
export const PluginUpload: React.FC<PluginUploadProps> = React.memo((props) => {
    const {isUploadAll, isPrivate, show, pluginNames, onSave, onCancel, footerClassName} = props
    const taskTokenRef = useRef(randomString(40))
    const [percent, setPercent] = useState<number>(0)
    const [messageList, setMessageList] = useState<MessageListProps[]>([])
    const [isHaveError, setIsHaveError] = useState<boolean>(false)
    const [isShowRetry, setIsShowRetry] = useState<boolean>(false)

    useEffect(() => {
        if (show) {
            startUpload()
            onReset()
        }
    }, [show])
    /**Reset Data */
    const onReset = useMemoizedFn(() => {
        setPercent(0)
        setMessageList([])
        setIsHaveError(false)
        setIsShowRetry(false)
    })
    const onProgressData = useMemoizedFn((data: SaveYakScriptToOnlineResponse) => {
        const p = Math.floor(data.Progress * 100)
        setPercent(p)
        setMessageList([
            {
                Message: data.Message,
                MessageType: data.MessageType
            },
            ...messageList
        ])
        if (data.Progress === 1) {
            if (data.MessageType === "finalError") {
                setIsHaveError(true)
            } else {
                setTimeout(() => {
                    onSave()
                }, 200)
            }
        }
    })
    const {onStart, onCancel: onPluginUploadCancel} = usePluginUploadHooks({
        taskToken: taskTokenRef.current,
        onUploadData: onProgressData,
        onUploadSuccess: () => {},
        onUploadEnd: () => {},
        onUploadError: () => {
            setIsShowRetry(true)
        }
    })
    const startUpload = useMemoizedFn(() => {
        const params: SaveYakScriptToOnlineRequest = {
            ScriptNames: pluginNames,
            IsPrivate: isPrivate,
            All: isUploadAll
        }
        onStart(params)
    })
    const onClickNext = useMemoizedFn(() => {
        onSave()
    })
    const onClickCancel = useMemoizedFn(() => {
        onPluginUploadCancel()
        onCancel()
    })
    const onClickRetry = useMemoizedFn(() => {
        onReset()
        startUpload()
    })
    return (
        <>
            <div className={styles["plugin-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `Uploaded ${percent}%`}
                />
                {messageList.length > 0 && (
                    <div className={styles["plugin-message-list"]}>
                        {messageList.map((i) => {
                            return (
                                <p
                                    className={classNames(styles["plugin-message"], {
                                        [styles["plugin-message-error"]]: i.MessageType === "error"
                                    })}
                                >
                                    {i.Message}
                                </p>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className={classNames(styles["plugin-local-upload-steps-action"], footerClassName)}>
                <YakitButton type='outline2' onClick={onClickCancel}>
                    Cancel
                </YakitButton>
                {isShowRetry && <YakitButton onClick={onClickRetry}>Retry</YakitButton>}
                {isHaveError && <YakitButton onClick={onClickNext}>Complete</YakitButton>}
            </div>
        </>
    )
})

interface PluginLocalUploadSingleProps {
    onClose: () => void
    /**Upload Success Callback */
    onUploadSuccess: () => void
    plugin: YakScript
}
export const PluginLocalUploadSingle: React.FC<PluginLocalUploadSingleProps> = React.memo((props) => {
    const {plugin, onClose, onUploadSuccess} = props
    const [current, setCurrent] = useState<number>(0)
    const [isPrivate, setIsPrivate] = useState<boolean>(true)
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)

    const taskTokenRef = useRef(randomString(40))

    const {onStart} = usePluginUploadHooks({
        isSingle:true,
        taskToken: taskTokenRef.current,
        onUploadData: () => {},
        onUploadSuccess: () => {
            onUploadSuccess()
            onClose()
        },
        onUploadEnd: () => {
            setUploadLoading(false)
        },
        onUploadError: () => {
            setUploadLoading(false)
        }
    })

    const onPrivateSelectionPrev = useMemoizedFn((v) => {
        setCurrent(current + 1)
        setIsPrivate(v)
    })
    /**Scan Then Upload */
    const onUpload = useMemoizedFn(() => {
        const params: SaveYakScriptToOnlineRequest = {
            ScriptNames: [plugin.ScriptName],
            IsPrivate: isPrivate,
            All: false
        }
        setUploadLoading(true)
        onStart(params)
    })
    const steps = useMemo(() => {
        return [
            {
                title: "Selective Privacy/Public",
                content: (
                    <PluginIsPrivateSelectionSingle
                        onUpload={onUpload}
                        onNext={onPrivateSelectionPrev}
                        uploadLoading={uploadLoading}
                    />
                )
            },
            {
                title: "Auto Scan",
                content: <PluginAutoTestSingle plugin={plugin} onNext={onUpload} />
            }
        ]
    }, [current, plugin, isPrivate, uploadLoading])
    return (
        <div className={styles["plugin-local-upload-single"]}>
            <div className={styles["plugin-local-upload-steps-content"]}>{steps[current]?.content}</div>
        </div>
    )
})

interface PluginAutoTestSingleProps {
    plugin: YakScript
    /**Next Step */
    onNext: () => void
}
const PluginAutoTestSingle: React.FC<PluginAutoTestSingleProps> = React.memo((props) => {
    const {plugin, onNext} = props
    const onCodeScoreCallback = useMemoizedFn((isPass: boolean) => {
        if (isPass) {
            onNext()
        }
    })
    return (
        <>
            <CodeScoreModule type={plugin.Type} code={plugin.Content} isStart={true} callback={onCodeScoreCallback} />
        </>
    )
})

interface PluginIsPrivateSelectionSingleProps {
    uploadLoading: boolean
    /**Next Step */
    onNext: (b: boolean) => void
    /**Upload */
    onUpload: (b: boolean) => void
}
const PluginIsPrivateSelectionSingle: React.FC<PluginIsPrivateSelectionSingleProps> = React.memo((props) => {
    const {uploadLoading, onNext, onUpload} = props
    const [isPrivate, setIsPrivate] = useState<boolean>(true)

    const onClickNext = useMemoizedFn(() => {
        onNext(isPrivate)
    })
    const onClickUpload = useMemoizedFn(() => {
        onUpload(isPrivate)
    })
    return (
        <div className={styles["plugin-private-select-single"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["title-style"]}>Notice：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["opt-content"]}>
                        <div className={styles["content-order"]}>1</div>
                        No Need for Auto Scan for Private Plugins
                    </div>
                    <div className={styles["opt-content"]}>
                        <div className={styles["content-order"]}>2</div>
                        Public Plugin Automatically Uploads After Successful Scan
                    </div>
                </div>
            </div>

            <div className={styles["plugin-isPrivate-select"]}>
                <Radio
                    className='plugins-radio-wrapper'
                    checked={isPrivate}
                    onClick={(e) => {
                        setIsPrivate(true)
                    }}
                >
                    Private (Viewable By Self Only)
                </Radio>
                <Radio
                    className='plugins-radio-wrapper'
                    checked={!isPrivate}
                    onClick={(e) => {
                        setIsPrivate(false)
                    }}
                >
                    Public (Post-Review, Listed on Plugin Store)
                </Radio>
            </div>
            <div className={styles["plugin-local-upload-steps-action"]}>
                {isPrivate ? (
                    <YakitButton onClick={onClickUpload} loading={uploadLoading}>
                        Upload
                    </YakitButton>
                ) : (
                    <YakitButton onClick={onClickNext}>Scan and Upload</YakitButton>
                )}
            </div>
        </div>
    )
})
