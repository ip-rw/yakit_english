import React, {memo, useMemo, useRef} from "react"
import {Progress} from "antd"
import {useDebounceFn, useMemoizedFn, useVirtualList} from "ahooks"
import styles from "./YakitUploadModal.module.scss"
import {failed, warn, yakitFailed} from "@/utils/notification"
import {OutlinePaperclipIcon} from "@/assets/icon/outline"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {SolidDocumentdownloadIcon, SolidXcircleIcon} from "@/assets/icon/solid"
const {ipcRenderer} = window.require("electron")

export interface SaveProgressStream {
    Progress: number
    Speed?: string
    CostDurationVerbose?: string
    RestDurationVerbose?: string
}

export interface LogListInfo {
    message: string
    isError?: boolean
    key: string
}

export interface ImportAndExportStatusInfo {
    title: string
    streamData: SaveProgressStream
    logListInfo: LogListInfo[]
    showDownloadDetail: boolean // Show Download Details?
}

export const ImportAndExportStatusInfo: React.FC<ImportAndExportStatusInfo> = memo((props) => {
    const {title, streamData, logListInfo, showDownloadDetail} = props

    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)

    const [list] = useVirtualList(logListInfo, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 24,
        overscan: 5
    })

    const height = useMemo(() => {
        if (list.length < 2) return 24
        return 200
    }, [list])

    return (
        <div className={styles["yaklang-engine-hint-wrapper"]}>
            <div className={styles["hint-left-wrapper"]}>
                <div className={styles["hint-icon"]}>
                    <SolidDocumentdownloadIcon />
                </div>
            </div>

            <div className={styles["hint-right-wrapper"]}>
                <div className={styles["hint-right-download"]}>
                    <div className={styles["hint-right-title"]}>{title}</div>
                    <div className={styles["download-progress"]}>
                        <Progress
                            strokeColor='#F28B44'
                            trailColor='#F0F2F5'
                            percent={Math.floor((streamData.Progress || 0) * 100)}
                            showInfo={false}
                        />
                        <div className={styles["progress-title"]}>Progress {Math.round(streamData.Progress * 100)}%</div>
                    </div>
                    {showDownloadDetail && (
                        <div className={styles["download-info-wrapper"]}>
                            <>
                                {streamData.RestDurationVerbose && (
                                    <>
                                        <div>
                                            Remaining Time :{" "}
                                            {streamData.Progress === 1 ? "0s" : streamData.RestDurationVerbose}
                                        </div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    </>
                                )}
                            </>
                            <>
                                {streamData.CostDurationVerbose && (
                                    <>
                                        <div>Duration : {streamData.CostDurationVerbose}</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    </>
                                )}
                            </>
                            <>
                                {streamData.Speed && (
                                    <>
                                        <div>Download Speed : {streamData.Speed}M/s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                    </>
                                )}
                            </>
                        </div>
                    )}
                    <div
                        className={styles["log-info"]}
                        ref={containerRef}
                        style={{height: height, marginTop: list.length !== 0 ? 10 : 0}}
                    >
                        <div ref={wrapperRef}>
                            {list.map((item) => (
                                <div
                                    key={item.data.key}
                                    className={styles["log-item"]}
                                    style={{color: item.data.isError ? "#f00" : "#85899e"}}
                                >
                                    {item.data.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

export interface UploadList {
    path: string
    name: string
}

interface FileRegexInfo {
    fileType?: string[] // Upload File Extension Type
    fileTypeErrorMsg?: string
    fileNameRegex?: RegExp // Filename Regex
    fileNameErrorMsg?: string
}

export interface YakitUploadComponentProps {
    step: 1 | 2 // Step 1 or 2, Step 1 Uploads, Step 2 Shows Progress
    stepOneSubTitle: React.ReactElement | string // Step 1 - Subtitle
    fileRegexInfo?: FileRegexInfo // File Verification Info
    directory?: boolean // Upload Folder? Default is Folder
    uploadList: UploadList[] // Upload List
    onUploadList: (uploadList: UploadList[]) => void
    nextTitle?: string // Step 2 - Title
    showDownloadDetail?: boolean // Step 2 - Show Progress Bar - Remaining Time - Duration - Download Speed
    streamData?: SaveProgressStream // Step 2 - Import Stream Data
    logListInfo?: LogListInfo[] // Step 2 - Log During Import
}

/**
 * Concurrent File/Folder Uploads Not Supported
 */
export const YakitUploadComponent: React.FC<YakitUploadComponentProps> = (props) => {
    const {
        step,
        stepOneSubTitle,
        fileRegexInfo,
        directory = true,
        uploadList = [],
        onUploadList,
        nextTitle = "Importing",
        showDownloadDetail = false,
        streamData,
        logListInfo
    } = props

    const beforeUploadFun = useDebounceFn(
        (fileList: any[]) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                if (fileRegexInfo) {
                    const {
                        fileType = [],
                        fileNameRegex,
                        fileTypeErrorMsg = "Invalid Upload Format, Please Upload Correct File Type",
                        fileNameErrorMsg = "Invalid Upload Format, Please Upload Correct File Type"
                    } = fileRegexInfo

                    if (!directory) {
                        const index = f.name.indexOf('.')
                        
                        if (index === -1) {
                            failed("Do Not Upload Folders")
                            return false
                        } else {
                            // Verify Filename Extension
                            const extname = f.name.split('.').pop()
                            if (fileType.length && !fileType.includes('.' + extname)) {
                                failed(`${f.name}${fileTypeErrorMsg}`)
                                return false
                            }
                        }
                    }

                    // Verify Filename/Folder Name
                    if (fileNameRegex && !fileNameRegex.test(f.name)) {
                        failed(`${f.name}${fileNameErrorMsg}`)
                        return
                    }
                }

                if (uploadList.map((item) => item.path).includes(f.path)) {
                    warn(`${f.path}Selected`)
                    return
                }
                let name = f.name.split(".")[0]
                arr.push({
                    path: f.path,
                    name
                })
            })
            onUploadList([...uploadList, ...arr])
        },
        {
            wait: 200
        }
    ).run

    const onUploadFolder = useMemoizedFn(async () => {
        try {
            const data: {filePaths: string[]} = await ipcRenderer.invoke("openDialog", {
                title: "Choose Folder",
                properties: ["openDirectory", "multiSelections"]
            })
            if (data.filePaths.length) {
                let arr: {
                    path: string
                    name: string
                }[] = []

                const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\"))
                const setAllPath = new Set(uploadList.map((item) => item.path))
                absolutePath.forEach((path) => {
                    const name = path.split("\\").pop() || ""
                    if (fileRegexInfo && name) {
                        const {fileNameRegex, fileNameErrorMsg = "Invalid Upload Format, Please Upload Correct File Type"} = fileRegexInfo

                        if (fileNameRegex && !fileNameRegex.test(name)) {
                            failed(`${name}${fileNameErrorMsg}`)
                            return
                        }
                    }

                    if (setAllPath.has(path)) {
                        warn(`${path}Selected`)
                        return
                    }

                    name &&
                        arr.push({
                            path: path,
                            name
                        })
                })
                onUploadList([...uploadList, ...arr])
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    return (
        <div className={styles["yakit-upload-component"]}>
            {step === 1 && (
                <>
                    <div className={styles["info-box"]}>
                        <div className={styles["card-box"]}>
                            <>
                                <div className={styles["upload-dragger-box"]}>
                                    {/* Do Not Set "directory" Attribute, Causes Frontend Lag */}
                                    <Dragger
                                        className={styles["upload-dragger"]}
                                        // accept={fileRegexInfo?.fileType?.join(',')} No Limits Here, Needs Frontend Msg
                                        multiple={true}
                                        showUploadList={false}
                                        beforeUpload={(f: any, fileList: any) => {
                                            beforeUploadFun(fileList)
                                            return false
                                        }}
                                    >
                                        <div className={styles["upload-info"]}>
                                            <div className={styles["add-file-icon"]}>
                                                <PropertyIcon />
                                            </div>
                                            <div className={styles["content"]}>
                                                <div className={styles["title"]}>
                                                    Drag Files Here, or
                                                    <span
                                                        className={styles["hight-light"]}
                                                        onClick={(e) => {
                                                            if (directory) {
                                                                e.stopPropagation()
                                                                onUploadFolder()
                                                            }
                                                        }}
                                                    >
                                                        Click to Import
                                                    </span>
                                                </div>
                                                <div className={styles["sub-title"]}>{stepOneSubTitle}</div>
                                            </div>
                                        </div>
                                    </Dragger>
                                </div>
                            </>
                        </div>
                        <div className={styles["upload-list"]}>
                            {uploadList.map((item, index) => (
                                <div className={styles["upload-list-item"]} key={index}>
                                    <div className={styles["link-icon"]}>
                                        <OutlinePaperclipIcon />
                                    </div>
                                    <div className={styles["text"]}>{item.path}</div>
                                    <div
                                        className={styles["close-icon"]}
                                        onClick={() => {
                                            const newUploadList = uploadList.filter(
                                                (itemIn) => itemIn.path !== item.path
                                            )
                                            onUploadList(newUploadList)
                                        }}
                                    >
                                        <SolidXcircleIcon />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {step === 2 && streamData && (
                <ImportAndExportStatusInfo
                    title={nextTitle}
                    streamData={streamData}
                    showDownloadDetail={showDownloadDetail}
                    logListInfo={logListInfo || []}
                />
            )}
        </div>
    )
}
