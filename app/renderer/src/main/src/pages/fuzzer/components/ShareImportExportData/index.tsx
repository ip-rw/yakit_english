import React, {useState, useRef, useEffect} from "react"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {OutlineShareIcon, OutlineExportIcon, OutlineImportIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import styles from "./index.module.scss"
import {useStore} from "@/store"
import {success, yakitNotify, yakitFailed, warn} from "@/utils/notification"
import CopyToClipboard from "react-copy-to-clipboard"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {HTTPFlowsShareRequest, HTTPFlowsShareResponse, ShareDataProps} from "./shareDataType"
import {isCommunityEdition} from "@/utils/envfile"
import {saveABSFileAnotherOpen} from "@/utils/openWebsite"
import {Uint8ArrayToString, StringToUint8Array} from "@/utils/str"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {YakitRoute} from "@/routes/newRoute"
import {FuzzerRequestProps} from "../../HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "../../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import emiter from "@/utils/eventBus/eventBus"
import {randomString} from "@/utils/randomUtil"
import {generateGroupId} from "@/pages/layout/mainOperatorContent/MainOperatorContent"
import {MultipleNodeInfo} from "@/pages/layout/mainOperatorContent/MainOperatorContentType"
import {DefFuzzerTableMaxData} from "@/defaultConstants/HTTPFuzzerPage"

const {ipcRenderer} = window.require("electron")

const toFuzzerAdvancedConfigValue = (value: FuzzerRequestProps) => {
    const resProps: AdvancedConfigValueProps = {
        isHttps: value.IsHTTPS,
        isGmTLS: value.IsGmTLS,
        actualHost: value.ActualAddr,
        proxy: value.Proxy ? value.Proxy.split(",") : [],
        noSystemProxy: value.NoSystemProxy,
        resNumlimit: DefFuzzerTableMaxData,
        fuzzTagMode: value.FuzzTagMode,
        fuzzTagSyncIndex: value.FuzzTagSyncIndex,
        noFixContentLength: value.NoFixContentLength,
        timeout: value.PerRequestTimeoutSeconds,
        batchTarget: value.BatchTarget || new Uint8Array(),
        repeatTimes: value.RepeatTimes,
        concurrent: value.Concurrent,
        minDelaySeconds: value.DelayMinSeconds,
        maxDelaySeconds: value.DelayMaxSeconds,
        maxRetryTimes: value.MaxRetryTimes,
        retryWaitSeconds: value.RetryWaitSeconds,
        retryMaxWaitSeconds: value.RetryMaxWaitSeconds,
        retry: !!value.RetryInStatusCode,
        retryConfiguration: {
            statusCode: value.RetryInStatusCode,
            keyWord: ""
        },
        noRetry: !!value.RetryNotInStatusCode,
        noRetryConfiguration: {
            statusCode: value.RetryNotInStatusCode,
            keyWord: ""
        },
        noFollowRedirect: value.NoFollowRedirect,
        redirectCount: value.RedirectTimes,
        followJSRedirect: value.FollowJSRedirect,
        dnsServers: value.DNSServers,
        etcHosts: value.EtcHosts,
        filterMode: value.HitColor ? "onlyMatch" : "match",
        hitColor: value.HitColor || "",
        matchersCondition: value.MatchersCondition === "and" ? "and" : "or",
        matchers: value.Matchers,
        extractors: value.Extractors,
        params: value.Params,
        cookie: value.MutateMethods.find((item) => item.Type === "Cookie")?.Value || [{Key: "", Value: ""}],
        headers: value.MutateMethods.find((item) => item.Type === "Headers")?.Value || [{Key: "", Value: ""}],
        methodGet: value.MutateMethods.find((item) => item.Type === "Get")?.Value || [{Key: "", Value: ""}],
        methodPost: value.MutateMethods.find((item) => item.Type === "Post")?.Value || [{Key: "", Value: ""}],
        inheritCookies: value.InheritCookies,
        inheritVariables: value.InheritVariables
    }
    return resProps
}

export const ShareImportExportData: React.FC<ShareDataProps> = ({
    supportShare = true,
    supportExport = true,
    supportImport = true,
    getShareContent = () => {},
    module,
    getFuzzerRequestParams
}) => {
    const yamlContRef = useRef<string>("")

    // Share
    const handleShare = useMemoizedFn(() => {
        getShareContent((content) => {
            const m = showYakitModal({
                title: "Share Package ID",
                content: <ShareModal module={module} shareContent={JSON.stringify(content)} />,
                footer: null
            })
        })
    })

    // Export
    const handlExport = useMemoizedFn((e: {clientX: number; clientY: number}) => {
        showByRightContext(
            {
                width: 150,
                data: [
                    {key: "pathTemplate", label: "Export as Path Template"},
                    {key: "rawTemplate", label: "Export as Raw Template"}
                ],
                onClick: ({key}) => {
                    switch (key) {
                        case "pathTemplate":
                            onExportToYaml("path")
                            break
                        case "rawTemplate":
                            onExportToYaml("raw")
                            break
                        default:
                            break
                    }
                }
            },
            e.clientX,
            e.clientY
        )
    })
    const onExportToYaml = async (tempType: "path" | "raw") => {
        const requests = getFuzzerRequestParams()
        const params = {
            Requests: {Requests: Array.isArray(requests) ? requests : [getFuzzerRequestParams()]},
            TemplateType: tempType
        }
        try {
            const {Status, YamlContent}: {Status: {Ok: boolean; Reason: string}; YamlContent: string} =
                await ipcRenderer.invoke("ExportHTTPFuzzerTaskToYaml", params)
            if (Status.Ok) {
                if (!!Status.Reason) {
                    Status.Reason.split("\n").forEach((msg) => {
                        warn(msg)
                    })
                }
                await saveABSFileAnotherOpen({
                    name: tempType + "-temp.yaml",
                    data: YamlContent,
                    successMsg: "Export Yaml Succeeded",
                    errorMsg: ""
                })
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // Import
    const handlImport = useMemoizedFn((e: {clientX: number; clientY: number}) => {
        showByRightContext(
            {
                width: 150,
                data: [
                    {key: "dataPacketId", label: "Import Package ID"},
                    {key: "yamlDocument", label: "Import Yaml File"}
                ],
                onClick: ({key}) => {
                    switch (key) {
                        case "dataPacketId":
                            onImportShare()
                            break
                        case "yamlDocument":
                            onOpenImportYamlPop()
                            break
                        default:
                            break
                    }
                }
            },
            e.clientX,
            e.clientY
        )
    })

    const onOpenImportYamlPop = useMemoizedFn(() => {
        yamlContRef.current = ""
        const m = showYakitModal({
            type: "white",
            title: (
                <div className={styles.importYamlPopTitle}>
                    Import Yaml File
                    <span className={styles.importText}>
                        Drag Files Here, or
                        <YakitButton type='text' onClick={onOpenSystemDialog} style={{fontSize: 14}}>
                            Click here
                        </YakitButton>
                        Upload, Code Paste Supported
                    </span>
                </div>
            ),
            onOkText: "Import",
            width: 800,
            content: <MultimodeImportYaml readYamlContent={readYamlContent} />,
            onCancel: (e) => {
                m.destroy()
            },
            onOk: (e) => {
                // BUG Sporadic Editor Content, yamlContRef.current Empty, Reason Unknown
                if (yamlContRef.current) {
                    execImportYaml()
                    m.destroy()
                } else {
                    yakitNotify("info", "Select or Paste File to Import")
                }
            }
        })
    })

    const onOpenSystemDialog = async () => {
        try {
            const {canceled, filePaths} = await ipcRenderer.invoke("openDialog", {
                title: "Select File",
                properties: ["openFile"]
            })
            if (canceled) return
            if (filePaths.length) {
                let absolutePath = filePaths[0].replace(/\\/g, "\\")
                readYamlContent(absolutePath)
            } else {
                throw new Error("Get Path Failed")
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    const readYamlContent = useMemoizedFn(async (absolutePath: string) => {
        try {
            const yamlContent = await ipcRenderer.invoke("fetch-file-content", absolutePath)
            emiter.emit("onImportYamlPopEditorContent", yamlContent)
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const execImportYaml = async () => {
        try {
            const {Status, Requests}: {Status: {Ok: boolean; Reason: string}; Requests: any} = await ipcRenderer.invoke(
                "ImportHTTPFuzzerTaskFromYaml",
                {
                    YamlContent: yamlContRef.current
                }
            )
            if (Status.Ok) {
                if (!!Status.Reason) {
                    Status.Reason.split("\n").forEach((msg) => {
                        warn(msg)
                    })
                }
                if (Requests.Requests.length === 1) {
                    const params = Requests.Requests[0]
                    await ipcRenderer.invoke("send-to-tab", {
                        type: "fuzzer",
                        data: {
                            isCache: false,
                            request: Uint8ArrayToString(params.RequestRaw),
                            advancedConfigValue: toFuzzerAdvancedConfigValue(params)
                        }
                    })
                } else {
                    assemblyFuzzerSequenceData(Requests.Requests)
                }
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // Sequence Export Assembly Data
    const assemblyFuzzerSequenceData = (Requests: FuzzerRequestProps[]) => {
        // Assemble Menu Group Info
        const groupId = generateGroupId()
        const groupChildren: MultipleNodeInfo[] = []
        Requests.forEach((item, index) => {
            const time = (new Date().getTime() + index).toString()
            const tabId = `httpFuzzer-[${randomString(6)}]-${time}`
            const childItem: MultipleNodeInfo = {
                groupChildren: [],
                groupId,
                id: tabId,
                pageParams: {
                    id: tabId,
                    advancedConfigValue: toFuzzerAdvancedConfigValue(item),
                    request: Uint8ArrayToString(item.RequestRaw)
                },
                sortFieId: index + 1,
                verbose: `WF-[${index + 1}]`
            }
            groupChildren.push(childItem)
        })

        // verbose sortField color Event Sent to MainOperatorContent Assemble
        const groupItem = {
            groupChildren,
            groupId: "0",
            id: groupId,
            sortFieId: 999,
            expand: true,
            verbose: "",
            color: ""
        }
        emiter.emit("onFuzzerSequenceImportUpdateMenu", JSON.stringify(groupItem))
    }

    useEffect(() => {
        const editorContentChange = (yamlContent: string) => {
            yamlContRef.current = yamlContent
        }
        emiter.on("onImportYamlEditorChange", editorContentChange)
        return () => {
            emiter.off("onImportYamlEditorChange", editorContentChange)
        }
    }, [])

    return (
        <>
            {supportShare && (
                <YakitButton
                    type='outline2'
                    icon={<OutlineShareIcon />}
                    style={{marginRight: 8}}
                    onClick={handleShare}
                />
            )}
            {supportExport && (
                <YakitButton
                    type='outline2'
                    icon={<OutlineExportIcon />}
                    style={{marginRight: 8}}
                    onClick={handlExport}
                    onContextMenuCapture={handlExport}
                />
            )}
            {supportImport && (
                <YakitButton
                    type='outline2'
                    icon={<OutlineImportIcon />}
                    onClick={handlImport}
                    onContextMenuCapture={handlImport}
                />
            )}
        </>
    )
}

interface MultimodeImportYamlProp {
    readYamlContent: (absolutePath: string) => Promise<void>
}

const MultimodeImportYaml: React.FC<MultimodeImportYamlProp> = React.memo(({readYamlContent}) => {
    const multimodeImportYamlRef = useRef<any>()
    const [yamlContent, setYamlCont] = useState<string>("")

    useEffect(() => {
        const updateYamlContent = (cont: string) => {
            setYamlCont(cont)
        }
        emiter.on("onImportYamlPopEditorContent", updateYamlContent)
        return () => {
            emiter.off("onImportYamlPopEditorContent", updateYamlContent)
        }
    }, [])

    useEffect(() => {
        const multimodeImportYamlDom = multimodeImportYamlRef.current
        // Prevent Default Drag & Drop
        const handleDragover = (event: DragEvent) => {
            event.preventDefault()
        }
        multimodeImportYamlDom.addEventListener("dragover", handleDragover)
        // Handle File Drag & Drop Event
        const handleDrap = (event: DragEvent) => {
            event.preventDefault()
            const file = event.dataTransfer?.files[0] as any
            const name = file?.name || ""
            const suffix = name.slice(name.lastIndexOf("."), name.length)
            if (![".yaml"].includes(suffix)) {
                yakitNotify("warning", "File Upload Error, Retry")
                return
            }
            readYamlContent(file?.path)
        }
        multimodeImportYamlDom.addEventListener("drop", handleDrap)
        return () => {
            setYamlCont("")
            multimodeImportYamlDom.removeEventListener("drop", handleDrap)
            multimodeImportYamlDom.addEventListener("dragover", handleDragover)
        }
    }, [])

    const editorContChange = useDebounceFn(
        (count) => {
            emiter.emit("onImportYamlEditorChange", Uint8ArrayToString(count))
        },
        {wait: 100}
    ).run

    return (
        <div className={styles.multimodeImportYaml} ref={multimodeImportYamlRef}>
            <NewHTTPPacketEditor
                key={yamlContent}
                originValue={StringToUint8Array(yamlContent)}
                noHeader={true}
                onChange={editorContChange}
            ></NewHTTPPacketEditor>
        </div>
    )
})

interface ShareModalProps {
    module: string
    shareContent: string
}
export const ShareModal: React.FC<ShareModalProps> = React.memo((props) => {
    const {module, shareContent} = props
    const [expiredTime, setExpiredTime] = useState<number>(15)
    const [pwd, setPwd] = useState<boolean>(false)
    const [shareNumber, setShareNumber] = useState<boolean>(false)
    const [limit_num, setLimit_num] = useState<number>(1)
    const [shareResData, setShareResData] = useState<API.ShareResponse>({
        share_id: "",
        extract_code: ""
    })

    const [shareLoading, setShareLoading] = useState<boolean>(false)
    const {userInfo} = useStore()
    /**
     * @Description General share, no special handling, e.g., web Fuzzer
     */
    const onShareOrdinary = useMemoizedFn(() => {
        const params: API.ShareRequest = {
            expired_time: expiredTime,
            share_content: shareContent,
            module,
            pwd,
            token: userInfo.token
        }
        if (shareNumber) {
            params.limit_num = limit_num
        }
        if (shareResData.share_id) {
            params.share_id = shareResData.share_id
        }

        setShareLoading(true)
        NetWorkApi<API.ShareRequest, API.ShareResponse>({
            url: "module/share",
            method: "post",
            data: params
        })
            .then((res) => {
                setShareResData({
                    ...res
                })
            })
            .catch((err) => {
                yakitNotify("error", "Share Failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setShareLoading(false)
                }, 200)
            })
    })
    const onShareHttpHistory = useMemoizedFn(() => {
        try {
            if (!isCommunityEdition() && !userInfo.token) {
                yakitNotify("error", "Please Login to Share")
                return
            }
            const ids = JSON.parse(shareContent)

            const shareHttpHistoryParams: HTTPFlowsShareRequest = {
                Ids: ids,
                ExpiredTime: expiredTime,
                Pwd: pwd,
                Token: userInfo.token,
                Module: module
            }
            if (shareNumber) {
                shareHttpHistoryParams.LimitNum = limit_num
            }
            if (shareResData.share_id) {
                shareHttpHistoryParams.ShareId = shareResData.share_id
            }
            setShareLoading(true)
            ipcRenderer
                .invoke("HTTPFlowsShare", shareHttpHistoryParams)
                .then((res: HTTPFlowsShareResponse) => {
                    setShareResData({
                        share_id: res.ShareId,
                        extract_code: res.ExtractCode
                    })
                })
                .catch((err) => {
                    yakitNotify("error", "Share Failed:" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setShareLoading(false)
                    }, 200)
                })
        } catch (error) {
            yakitNotify("error", "Share Data Conversion Failed:" + error)
        }
    })
    const onShare = useMemoizedFn(() => {
        switch (module) {
            case YakitRoute.DB_HTTPHistory:
                onShareHttpHistory()
                break
            default:
                onShareOrdinary()
                break
        }
    })
    const disabled = !!shareResData?.share_id
    return (
        <div style={{padding: 24}}>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>Set Expiry：</span>
                <YakitRadioButtons
                    disabled={disabled}
                    value={expiredTime}
                    onChange={(e) => setExpiredTime(e.target.value)}
                    options={[
                        {
                            label: "5 Minutes",
                            value: 5
                        },
                        {
                            label: "15 Minutes",
                            value: 15
                        },
                        {
                            label: "1 Hour",
                            value: 60
                        },
                        {
                            label: "1 Day",
                            value: 1440
                        }
                    ]}
                />
            </div>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>Password：</span>
                <YakitSwitch disabled={disabled} checked={pwd} onChange={(checked) => setPwd(checked)} />
            </div>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>Limit Share Count：</span>
                <YakitSwitch
                    disabled={disabled}
                    checked={shareNumber}
                    onChange={(checked) => setShareNumber(checked)}
                />
                &emsp;
                {shareNumber && (
                    <YakitInputNumber
                        min={1}
                        value={limit_num}
                        onChange={(v) => setLimit_num(v as number)}
                        size='small'
                        formatter={(value) => `${value}Times`}
                        disabled={disabled}
                    />
                )}
            </div>
            {shareResData.share_id && (
                <div className={styles["content-value"]}>
                    <span className={styles["label-text"]}>Share ID：</span>
                    <span className={styles["display-flex"]}>
                        {shareResData.share_id} <CopyComponents copyText={shareResData.share_id} />
                    </span>
                </div>
            )}
            {shareResData.extract_code && (
                <div className={styles["content-value"]}>
                    <span className={styles["label-text"]}>Password：</span>
                    <span>{shareResData.extract_code}</span>
                </div>
            )}
            <div className={styles["btn-footer"]}>
                <YakitButton type='primary' onClick={onShare} loading={shareLoading} disabled={disabled}>
                    Generate Share Secret
                </YakitButton>
                {shareResData.share_id && (
                    <CopyToClipboard
                        text={
                            shareResData.extract_code
                                ? `${shareResData.share_id}\r\nPassword：${shareResData.extract_code}`
                                : `${shareResData.share_id}`
                        }
                        onCopy={(text, ok) => {
                            if (ok) success("Copied to Clipboard")
                        }}
                    >
                        <YakitButton type={disabled ? "primary" : "outline1"}>Copy Share Link</YakitButton>
                    </CopyToClipboard>
                )}
            </div>
        </div>
    )
})
