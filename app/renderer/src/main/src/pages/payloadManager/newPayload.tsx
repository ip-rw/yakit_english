import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider, Form, Input, Progress, Tooltip} from "antd"
import {
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useMemoizedFn,
    useSize,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import styles from "./NewPayload.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClipboardcopyIcon,
    OutlineCogIcon,
    OutlineDatabasebackupIcon,
    OutlineDocumentduplicateIcon,
    OutlineExportIcon,
    OutlineFolderaddIcon,
    OutlineImportIcon,
    OutlinePaperclipIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineSparklesIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {OutlineAddPayloadIcon, PropertyIcon, PropertyNoAddIcon} from "./icon"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {DragDropContext, Droppable, Draggable, BeforeCapture, DropResult, ResponderProvided, DragStart, DragUpdate} from "@hello-pangea/dnd"
import {
    SolidChevrondownIcon,
    SolidChevronrightIcon,
    SolidDatabaseIcon,
    SolidDocumentdownloadIcon,
    SolidDocumenttextIcon,
    SolidDotsverticalIcon,
    SolidDragsortIcon,
    SolidFolderopenIcon,
    SolidStoreIcon,
    SolidXcircleIcon
} from "@/assets/icon/solid"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import Dragger from "antd/lib/upload/Dragger"
import {v4 as uuidv4} from "uuid"
import {DeletePayloadProps, NewPayloadTable, Payload, QueryPayloadParams} from "./newPayloadTable"
import {callCopyToClipboard} from "@/utils/basic"
import { PaginationSchema, QueryGeneralResponse} from "../invoker/schema"
import {randomString} from "@/utils/randomUtil"
import _isEqual from "lodash/isEqual"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import emiter from "@/utils/eventBus/eventBus"
import {Uint8ArrayToString} from "@/utils/str"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakEditor} from "@/utils/editors"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitRoute} from "@/routes/newRoute"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import { YakitRadioButtons } from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
const {ipcRenderer} = window.require("electron")

interface UploadStatusInfoProps {
    title: string
    streamData: SavePayloadProgress
    cancelRun: () => void
    logInfo: string[]
    // Display Remaining Time-Speed: Default Off
    showDownloadDetail?: boolean
    // Auto-Close
    autoClose?: boolean
    // Close
    onClose?: () => void
}

export const UploadStatusInfo: React.FC<UploadStatusInfoProps> = (props) => {
    const {title, streamData, logInfo, cancelRun, onClose, showDownloadDetail = true, autoClose} = props
    useEffect(() => {
        if (autoClose && streamData.Progress === 1) {
            onClose && onClose()
        }
    }, [autoClose, streamData.Progress])

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
                            {/* <div>Remaining Time : {streamData.Progress === 1 ? "0s" : streamData.RestDurationVerbose}</div>
                            <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div> */}
                            <div>Duration : {streamData.CostDurationVerbose}</div>
                            {/* <div className={styles["divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div>Download Speed : {streamData.Speed}M/s</div> */}
                        </div>
                    )}
                    <div className={styles["log-info"]}>
                        {logInfo.map((item) => (
                            <div key={item} className={styles["log-item"]}>
                                {item}
                            </div>
                        ))}
                    </div>
                    <div className={styles["download-btn"]}>
                        <YakitButton loading={false} size='large' type='outline2' onClick={cancelRun}>
                            Cancel
                        </YakitButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
interface CreateDictionariesProps {
    type: "dictionaries" | "payload"
    onClose: () => void
    title: string
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    folder?: string
    group?: string
}

interface SavePayloadProgress {
    Progress: number
    Speed: string
    CostDurationVerbose: string
    RestDurationVerbose: string
    Message: string
}

// New Dict
export const CreateDictionaries: React.FC<CreateDictionariesProps> = (props) => {
    const {onClose, type, title, onQueryGroup, folder, group} = props
    const isDictionaries = type === "dictionaries"
    // Uploadable File Types
    const FileType = ["text/plain", "text/csv"]
    // Collect Uploaded Data
    const [dictionariesName, setDictionariesName] = useState<string>("")
    const [uploadList, setUploadList] = useState<{path: string; name: string}[]>([])
    const [editorValue,setEditorValue] = useState<string>("")
    // token
    const [token, setToken] = useState(randomString(20))
    const [fileToken, setFileToken] = useState(randomString(20))
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>()
    const logInfoRef = useRef<string[]>([])
    // Repeat Alert: Keep Modal Open
    const messageWarnRef = useRef<boolean>(false)

    // Upload File/Manual Input
    const [uploadType,setUploadType] = useState<"dragger"|"editor">("dragger")

    // Storage Type
    const [storeType, setStoreType] = useState<"database" | "file">()

    const isDisabled = useMemo(() => {
        if (isDictionaries&&uploadType==="dragger") {
            return uploadList.length === 0 || dictionariesName.length === 0
        }
        if(isDictionaries&&uploadType==="editor"){
            return editorValue.length === 0 || dictionariesName.length === 0
        }
        return uploadType==="dragger"?uploadList.length === 0:editorValue.length === 0
    }, [uploadList, dictionariesName, isDictionaries,uploadType,editorValue])

    // DB Storage
    const onSavePayload = useMemoizedFn(() => {
        setStoreType("database")                                     
        ipcRenderer.invoke(
            "SavePayloadStream",
            {
                IsFile: uploadType==="dragger",
                IsNew: isDictionaries,
                Content: editorValue,
                FileName: uploadList.map((item) => item.path),
                Group: group || dictionariesName,
                Folder: folder || ""
            },
            token
        )
    })

    // File Storage
    const onSavePayloadToFile = useMemoizedFn(() => {
        setStoreType("database")

        // Dual Stream
        ipcRenderer.invoke(
            "SavePayloadToFileStream",
            {
                IsFile: uploadType==="dragger",
                IsNew: true,
                Content: editorValue,
                FileName: uploadList.map((item) => item.path),
                Group: group || dictionariesName,
                Folder: folder || ""
            },
            fileToken
        )
    })

    // Cancel DB Task
    const cancelSavePayload = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayload", token)
    })

    // Cancel File Storage Task
    const cancelSavePayloadFile = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SavePayloadFile", fileToken)
    })

    // Monitor DB Task
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            if (error === `group[${group || dictionariesName}] exist`) {
                messageWarnRef.current = true
                warn("Dict Name Exists")
                return
            }
            failed(`[SavePayload] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            if (messageWarnRef.current) {
                messageWarnRef.current = false
                return
            }
            info("[SavePayload] finished")
            logInfoRef.current = []
            cancelRun()
        })

        return () => {
            ipcRenderer.invoke("cancel-SavePayload", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [group, dictionariesName])

    // Monitor File Storage Task
    useEffect(() => {
        ipcRenderer.on(`${fileToken}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                    if (data.Message === "step2" && data.Progress === 1) {
                        setStoreType("file")
                    }
                    setStreamData(data)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${fileToken}-error`, (e: any, error: any) => {
            if (error === `group[${group || dictionariesName}] exist`) {
                messageWarnRef.current = true
                warn("Dict Name Exists")
                return
            }
            failed(`[SavePayloadFile] error:  ${error}`)
        })
        ipcRenderer.on(`${fileToken}-end`, (e: any, data: any) => {
            if (messageWarnRef.current) {
                messageWarnRef.current = false
                return
            }
            info("[SavePayloadFile] finished")
            logInfoRef.current = []
            cancelRun()
        })

        return () => {
            ipcRenderer.invoke("cancel-SavePayloadFile", fileToken)
            ipcRenderer.removeAllListeners(`${fileToken}-data`)
            ipcRenderer.removeAllListeners(`${fileToken}-error`)
            ipcRenderer.removeAllListeners(`${fileToken}-end`)
        }
    }, [group, dictionariesName])

    const cancelRun = useMemoizedFn(() => {
        if (isDictionaries) {
            onQueryGroup({
                Group: group || dictionariesName,
                Folder: folder || ""
            })
        } else {
            onQueryGroup()
        }
        onClose()
        // Notify Table on Expand
        if (group || folder) {
            emiter.emit("refreshTableEvent")
        }
    })

    const beforeUploadFun = useDebounceFn(
        (fileList: any[]) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                if (!FileType.includes(f.type)) {
                    failed(`${f.name}Non-txt/csv File: Upload Correct Format！`)
                    return false
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

            if (dictionariesName.length === 0 && arr.length > 0) {
                setDictionariesName(arr[0].name)
            }
            setUploadList([...uploadList, ...arr])
        },
        {
            wait: 200
        }
    ).run
    return (
        <div className={styles["create-dictionaries"]}>
            {!streamData && (
                <>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>{title}</div>
                        <div className={styles["extra"]} onClick={onClose}>
                            <OutlineXIcon />
                        </div>
                    </div>
                    {isDictionaries && (
                        <div className={styles["explain"]}>
                            <div className={styles["explain-bg"]}>
                                <div className={styles["title"]}>Storage Option Choice：</div>
                                <div className={styles["content"]}>
                                    <div className={styles["item"]}>
                                        <div className={styles["dot"]}>1</div>
                                        <div className={styles["text"]}>
                                            File Storage: Save Locally, No Hit Counts，
                                            <span className={styles["hight-text"]}>Faster Upload</span>
                                        </div>
                                    </div>
                                    <div className={styles["item"]}>
                                        <div className={styles["dot"]}>2</div>
                                        <div className={styles["text"]}>
                                            DB Storage: Save to DB, Supports Hit Counts，
                                            <span className={styles["hight-text"]}>Easier Search</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={styles["info-box"]}>
                        {isDictionaries && (
                            <div className={styles["input-box"]}>
                                <div className={styles["name"]}>
                                    Dict Name<span className={styles["must"]}>*</span>:
                                </div>
                                <div>
                                    <YakitInput
                                        style={{width: "100%"}}
                                        placeholder='Please Enter...'
                                        value={dictionariesName}
                                        onChange={(e) => {
                                            setDictionariesName(e.target.value)
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className={styles['card-box']}>
                            <div className={styles['card-heard']}>
                            <YakitRadioButtons
                        value={uploadType}
                        onChange={(e) => {
                            if(e.target.value==="dragger"){
                                setEditorValue("")
                            }   
                            if(e.target.value==="editor"){
                                setUploadList([])
                            }
                            setUploadType(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "dragger",
                                label: "Upload File"
                            },
                            {
                                value: "editor",
                                label: "Manual Input"
                            },
                        ]}
                        // size={"small"}
                    />
                            </div>
                            <>
                            {uploadType==="dragger"?
                           <div className={styles["upload-dragger-box"]}>
                            <Dragger
                                className={styles["upload-dragger"]}
                                // accept={FileType.join(",")} 
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
                                            <span className={styles["hight-light"]}>Click to Import</span>
                                        </div>
                                        <div className={styles["sub-title"]}>Bulk Upload for Folders (TXT only)/csv)</div>
                                    </div>
                                </div>
                            </Dragger>
                        </div> :<div className={styles['upload-editor-box']}>
                        <YakEditor
                            type='plaintext'
                            value={editorValue}
                            setValue={(content: string) => {
                                setEditorValue(content)
                            }}
                            noWordWrap={true}
                        />
                        </div>
                        }
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
                                            if (item.name === dictionariesName) {
                                                setDictionariesName(
                                                    newUploadList.length > 0 ? newUploadList[0].name : ""
                                                )
                                            }
                                            setUploadList(newUploadList)
                                        }}
                                    >
                                        <SolidXcircleIcon />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles["submit-box"]}>
                        {isDictionaries ? (
                            <>
                                <YakitButton
                                    size='large'
                                    disabled={isDisabled}
                                    type='outline1'
                                    icon={<SolidDatabaseIcon />}
                                    onClick={onSavePayload}
                                >
                                    DB Storage
                                </YakitButton>
                                <YakitButton
                                    size='large'
                                    disabled={isDisabled}
                                    icon={<SolidDocumenttextIcon />}
                                    onClick={onSavePayloadToFile}
                                >
                                    File Storage
                                </YakitButton>
                            </>
                        ) : (
                            <>
                                <YakitButton size='large' disabled={isDisabled} type='outline1' onClick={onClose}>
                                    Cancel
                                </YakitButton>
                                <YakitButton size='large' disabled={isDisabled} onClick={onSavePayload}>
                                    Import
                                </YakitButton>
                            </>
                        )}
                    </div>
                </>
            )}

            {streamData && (
                <UploadStatusInfo
                    title={storeType === "database" ? "Importing..." : "Auto-Deduplicate: Wait..."}
                    streamData={streamData}
                    cancelRun={cancelRun}
                    logInfo={logInfoRef.current}
                />
            )}
        </div>
    )
}

// Sample Data for Customization
// const initialData: DataItem[] = [
//     {
//         type: "Folder",
//         name: "Folder 1",
//         id: "11111",
//         node: [
//             {
//                 type: "File",
//                 name: "File 1-1",
//                 id: "111111"
//             },
//             {
//                 type: "File",
//                 name: "File 1-2",
//                 id: "111112"
//             }
//         ]
//     },
//     {
//         type: "File",
//         name: "File 2-2",
//         id: "222222"
//     },
//     {
//         type: "Folder",
//         name: "Folder 3",
//         id: "333333",
//         node: [
//             {
//                 type: "File",
//                 name: "File 3-1",
//                 id: "3333331"
//             },
//             {
//                 type: "File",
//                 name: "File 3-2",
//                 id: "3333332"
//             }
//         ]
//     }
// ]

const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = "translate(0px" + transform.substring(index, transform.length)
    }
    return {
        ...draggableStyle,
        transform
    }
}

const cloneItemStyle = (draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (transform) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = "translate(0px" + transform.substring(index, transform.length)
    }
    return {
        ...draggableStyle,
        transform
    }
}

// Get Item by Group
const findItemByGroup = (items: DataItem[], group: string): DataItem | null => {
    for (const item of items) {
        if (item.name === group && item.type !== "Folder") {
            return item
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = findItemByGroup(item.node, group)
            if (foundInNode) {
                return foundInNode
            }
        }
    }
    return null
}

// Get Item by Id
const findItemById = (items: DataItem[], targetId: string): DataItem | null => {
    for (const item of items) {
        if (item.id === targetId) {
            return item
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = findItemById(item.node, targetId)
            if (foundInNode) {
                return foundInNode
            }
        }
    }
    return null
}

// Get Item by Id (to Folder Level))
const findFoldersById = (items: DataItem[], targetId: string) => {
    for (const item of items) {
        if (item.id === targetId) {
            return item
        } else if (item.type === "Folder" && item.node) {
            const foundInNode = findFoldersById(item.node, targetId)
            if (foundInNode) {
                return item
            }
        }
    }
    return null
}

// Arrays Equal?
const compareArrays = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
        return false
    }

    for (let i = 0; i < arr1.length; i++) {
        if (!_isEqual(arr1[i], arr2[i])) {
            return false
        }
    }
    return true
}

// Detect in String/*,
const isIncludeSpecial = (v: string) => /[/*,]/.test(v)

// Backend Structure to Render Array
const nodesToDataFun = (nodes: PayloadGroupNodeProps[]) => {
    return nodes.map((item) => {
        const {Type, Name, Nodes, Number} = item
        let obj: DataItem = {
            type: Type,
            name: Name,
            id: `${Type}-${Name}`,
            number: Number
        }
        if (Nodes.length > 0) {
            return {
                ...obj,
                node: Nodes.map((itemIn) => ({
                    type: itemIn.Type,
                    name: itemIn.Name,
                    id: `${itemIn.Type}-${itemIn.Name}`,
                    number: itemIn.Number
                }))
            }
        }
        return obj
    })
}

interface DataItem {
    type: "File" | "Folder" | "DataBase"
    name: string
    id: string
    number: number
    // New Creation
    isCreate?: boolean
    node?: DataItem[]
}

interface MoveLevelProps {
    draggableId: string
    level: "inside" | "outside"
}

export interface PayloadGroupNodeProps {
    Type: "File" | "Folder" | "DataBase"
    Name: string
    Nodes: PayloadGroupNodeProps[]
    Number: number
}

const droppable = "droppable"
const droppableGroup = "droppableGroup"

export interface NewPayloadListProps {
    data: DataItem[]
    setData: (v: DataItem[]) => void
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    cacheNodesRef: any
    setGroup: (v: string) => void
    setFolder: (v: string) => void
    setContentType: (v?: "editor" | "table") => void
    codePath?: string
    // Block All Drags: Click to Insert Only
    onlyInsert?: boolean
    // Insert Modal Needed
    onClose?: () => void
    // Execute
    selectItem: string | undefined
    setSelectItem: (v: string) => void
}

export const NewPayloadList: React.FC<NewPayloadListProps> = (props) => {
    const {
        data,
        setData,
        onQueryGroup,
        cacheNodesRef,
        setGroup,
        setFolder,
        setContentType,
        codePath,
        onlyInsert,
        onClose,
        selectItem,
        setSelectItem
    } = props

    const [dropType, setDropType] = useState<string>(droppable)
    const [subDropType, setSubDropType] = useState<string>(droppableGroup)
    const [combineIds, setCombineIds] = useState<string[]>([])
    const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)

    const [moveLevel, setMoveLevel] = useState<MoveLevelProps>()
    const moveLevelRef = useRef<MoveLevelProps>()

    // Record Non-Expanded Folders)
    const [notExpandArr, setNotExpandArr] = useState<string[]>([])

    useUpdateEffect(() => {
        onUpdateAllPayloadGroup(data)
    }, [JSON.stringify(data)])

    useEffect(() => {
        emiter.on("refreshListEvent", onRefreshListEvent)
        return () => {
            emiter.off("refreshListEvent", onRefreshListEvent)
        }
    }, [])

    const onRefreshListEvent = useMemoizedFn(() => {
        onQueryGroup()
    })

    useEffect(() => {
        if (selectItem) {
            const selectData = findFoldersById(data, selectItem)
            if (selectData) {
                if (selectData.type === "Folder") {
                    setFolder(selectData.name)
                    let item = selectData.node?.filter((item) => item.id === selectItem) || []
                    let group: string = item.length > 0 ? item[0].name : ""
                    let type: string = item.length > 0 ? item[0].type : ""
                    setGroup(group)
                    setContentType(type === "DataBase" ? "table" : "editor")
                } else {
                    setFolder("")
                    setGroup(selectData.name)
                    setContentType(selectData.type === "DataBase" ? "table" : "editor")
                }
            }
        }
    }, [selectItem])

    // Render Array to Backend Structure
    const dataToNodesFun = useMemoizedFn((data: DataItem[]) => {
        return data.map((item) => {
            let obj: PayloadGroupNodeProps = {
                Name: item.name,
                Type: item.type,
                Nodes: [],
                Number: item.number
            }
            if (item.node) {
                obj.Nodes = item.node.map((itemIn) => ({
                    Name: itemIn.name,
                    Type: itemIn.type,
                    Nodes: [],
                    Number: itemIn.number
                }))
            }
            return obj
        })
    })

    // Notify Backend on Drag Order
    const onUpdateAllPayloadGroup = useMemoizedFn((data: DataItem[]) => {
        // Exclude New Folders
        const newData = data.filter((item) => item.isCreate !== true)
        // Render Array to Backend Structure
        const newNodes: PayloadGroupNodeProps[] = dataToNodesFun(newData)
        // Compare: Equal?
        const isEqual: boolean = compareArrays(cacheNodesRef.current, newNodes)
        // Notify Backend on Order Change
        if (!isEqual) {
            ipcRenderer
                .invoke("UpdateAllPayloadGroup", {
                    Nodes: newNodes
                })
                .then(() => {
                    cacheNodesRef.current = newNodes
                    onQueryGroup()
                })
                .catch((e: any) => {
                    failed(`Data Update Failed：${e}`)
                })
        }
    })

    // Swap by Index
    const moveArrayElement = useMemoizedFn((arr, fromIndex, toIndex) => {
        // Index Check
        if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
            console.error("Invalid indices")
            return arr // Return Original Array
        }

        // Remove/Insert Item in Array
        const [element] = arr.splice(fromIndex, 1)
        arr.splice(toIndex, 0, element)

        return arr // Return Moved Array
    })

    useEffect(() => {
        onQueryGroup()
    }, [])

    // Unique Folder Name
    const getOnlyFolderName = useMemoizedFn(() => {
        const existingFolderNames = data.filter((item) => item.type === "Folder").map((item) => item.name)
        // Create Folder Name
        let newFolderName: string
        let index = 1
        do {
            newFolderName = `Unnamed Detection${index}`
            index++
        } while (existingFolderNames.includes(newFolderName))
        return newFolderName
    })

    // Merge Outside Files/Folders
    const mergingGroup = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId, type, combine} = result
        if (!combine) {
            return
        }
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const sourceItem: DataItem = copyData[source.index]
        const combineItem = findItemById(data, combine.draggableId)
        // Merge Outside File to Folder
        if (sourceItem.type !== "Folder" && combineItem && combineItem.type === "Folder") {
            // Remove Item
            copyData.splice(source.index, 1)
            combineItem.node = combineItem.node ? [sourceItem, ...combineItem.node] : [sourceItem]
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    return combineItem
                }
                return item
            })
            setData(newData)
        }
        // Merge Two Outside Files
        if (sourceItem.type !== "Folder" && combineItem && combineItem.type !== "Folder") {
            // Remove Item
            copyData.splice(source.index, 1)
            // Generate UUID
            const uuid = uuidv4()
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    let item: DataItem = {
                        type: "Folder",
                        name: getOnlyFolderName(),
                        id: uuid,
                        node: [combineItem, sourceItem],
                        number: parseInt(combineItem.number + "") + parseInt(sourceItem.number + "")
                    }
                    return item
                }
                return item
            })
            setData(newData)
        }
    })
    // Merge Group to Outside Folder)
    const mergeWithinAndOutsideGroup = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId, type, combine} = result
        if (!combine) {
            return
        }
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const sourceFolders = findFoldersById(copyData, source.droppableId)
        const combineItem = findItemById(data, combine.draggableId)
        if (sourceFolders && sourceFolders?.node && combineItem && combineItem.type === "Folder") {
            const sourceItem = sourceFolders.node[source.index]
            sourceFolders.node.splice(source.index, 1)
            combineItem.node = combineItem.node ? [sourceItem, ...combineItem.node] : [sourceItem]
            const newData = copyData.map((item) => {
                if (item.id === sourceFolders.id) {
                    return sourceFolders
                }
                if (item.id === combineItem.id) {
                    return combineItem
                }
                return item
            })
            setData(newData)
        }
        if (sourceFolders && sourceFolders?.node && combineItem && combineItem.type !== "Folder") {
            const sourceItem = sourceFolders.node[source.index]
            sourceFolders.node.splice(source.index, 1)
            // Generate UUID
            const uuid = uuidv4()
            const newData = copyData.map((item) => {
                if (item.id === combineItem.id) {
                    let item: DataItem = {
                        type: "Folder",
                        name: getOnlyFolderName(),
                        id: uuid,
                        node: [combineItem, sourceItem],
                        number: parseInt(combineItem.number + "") + parseInt(sourceItem.number + "")
                    }
                    return item
                }
                return item
            })
            setData(newData)
        }
    })
    // Drag End Callback
    const onDragEnd = useMemoizedFn((result: DropResult,provided: ResponderProvided) => {
        try {
            const {source, destination, draggableId, type, combine} = result
            /** Merge Group ---------start--------- */
            if (combine) {
                // Merge Two Outside Files
                if (source.droppableId === "droppable-payload" && combine.droppableId === "droppable-payload") {
                    mergingGroup(result)
                }
                // Merge Group to Outside Folder)
                if (source.droppableId !== "droppable-payload" && combine.droppableId === "droppable-payload") {
                    mergeWithinAndOutsideGroup(result)
                }
            }
            setIsCombineEnabled(true)
            setMoveLevel(undefined)
            setCombineIds([])
            moveLevelRef.current = undefined
            /** Merge Group ---------end--------- */
            if (!destination) {
                return
            }
            const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
            // Drag within Same Level (Outer))
            if (source.droppableId === "droppable-payload" && destination.droppableId === "droppable-payload") {
                const newArray: DataItem[] = moveArrayElement(data, source.index, destination.index)
                setData(newArray)
            }
            // Drag within Same Level (Inner))
            else if (source.droppableId === destination.droppableId) {
                const foldersArr = findFoldersById(copyData, source.droppableId)
                if (foldersArr) {
                    const newArray: DataItem[] = moveArrayElement(foldersArr.node, source.index, destination.index)
                    foldersArr.node = newArray
                    const newData = copyData.map((item) => {
                        if (item.id === foldersArr.id) {
                            return foldersArr
                        }
                        return item
                    })
                    setData(newData)
                }
            }
            // Cross-Level Drag: Delete Old, Add New
            else {
                // Drag Outside to Inside
                if (source.droppableId === "droppable-payload") {
                    const cacheData: DataItem = copyData[source.index]
                    // Remove Item
                    copyData.splice(source.index, 1)
                    const foldersItem = findFoldersById(copyData, destination.droppableId)
                    if (foldersItem) {
                        foldersItem.node?.splice(destination.index, 0, cacheData)
                        const newData = copyData.map((item) => {
                            if (item.id === foldersItem.id) {
                                return foldersItem
                            }
                            return item
                        })
                        setData(newData)
                    }
                }
                // Drag Inside to Another Inside
                else if (
                    source.droppableId !== "droppable-payload" &&
                    destination.droppableId !== "droppable-payload"
                ) {
                    const foldersItem = findFoldersById(copyData, source.droppableId)
                    const dropFoldersItem = findFoldersById(copyData, destination.droppableId)
                    if (foldersItem?.node && dropFoldersItem) {
                        const cacheData: DataItem = foldersItem.node[source.index]
                        // Remove Item
                        foldersItem.node.splice(source.index, 1)
                        const newData = copyData.map((item) => {
                            if (item.id === foldersItem.id) {
                                return foldersItem
                            }
                            if (item.id === dropFoldersItem.id && item.node) {
                                item.node.splice(destination.index, 0, cacheData)
                                return item
                            }
                            return item
                        })
                        setData(newData)
                    }
                }
                // Drag Outside to Inside
                else {
                    const foldersItem = findFoldersById(copyData, source.droppableId)
                    if (foldersItem?.node) {
                        const cacheData: DataItem = foldersItem.node[source.index]
                        // Remove Item
                        foldersItem.node.splice(source.index, 1)
                        copyData.splice(destination.index, 0, cacheData)
                        const newData = copyData.map((item) => {
                            if (item.id === foldersItem.id) {
                                return foldersItem
                            }
                            return item
                        })
                        setData(newData)
                    }
                }
            }
        } catch (error) {}
    })

    /**
     * @CalcMoveInRangeOfDestDrag
     */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
            // if (droppableId === "droppable-payload") {
            //     // No Merge if Drag Item is Group
            // }

            const moveNode = findItemById(data, draggableId)
            if (combine) {
                // Detected Merge
                const ids = [combine.draggableId, draggableId]
                // Disallow Merge on Folder Drag
                const moveType = findItemById(data, draggableId)
                if (moveType && moveType.type !== "Folder") {
                    setCombineIds(ids)
                }
                // // Merge Inside to Outside
                // if(droppableId!=="droppable-payload"&&combine.droppableId==="droppable-payload"){

                // }
                setMoveLevel(moveLevelRef.current)
                return
            }
            // Drag Level Change: Update Style
            if (moveNode && destination && moveNode.type !== "Folder") {
                if (
                    (droppableId === "droppable-payload" || destination.droppableId === "droppable-payload") &&
                    droppableId !== destination.droppableId
                ) {
                    const moveLevelObj: MoveLevelProps = {
                        draggableId,
                        level: droppableId === "droppable-payload" ? "inside" : "outside"
                    }
                    moveLevelRef.current = moveLevelObj
                    setMoveLevel(moveLevelObj)
                } else {
                    const moveLevelObj: MoveLevelProps = {
                        draggableId,
                        level: droppableId === "droppable-payload" ? "outside" : "inside"
                    }
                    moveLevelRef.current = moveLevelObj
                    setMoveLevel(moveLevelObj)
                }
            }

            setCombineIds([])
        },
        {wait: 200}
    ).run

    const onBeforeCapture = useMemoizedFn((result: BeforeCapture) => {
        // Is File by Id
        const item = findItemById(data, result.draggableId)
        if (item && item.type !== "Folder") {
            setDropType(droppableGroup)
            setSubDropType(droppableGroup)
        } else {
            setDropType(droppable)
            setSubDropType(droppableGroup)
        }
    })

    const onDragStart = useMemoizedFn((result: DragStart, provided: ResponderProvided) => {
        if (!result.source) return
        // Disallow Merge on Folder Drag
        const moveType = findItemById(data, result.draggableId)
        if (moveType && moveType.type === "Folder") {
            setIsCombineEnabled(false)
        }
    })

    // Get Payload
    const getPayloadCount = useMemo(() => {
        let count: number = 0
        data.forEach((item) => {
            if (item.type !== "Folder") {
                count += 1
            }
            if (item.node) {
                item.node.forEach(() => {
                    count += 1
                })
            }
        })
        return count
    }, [data])

    return (
        <div className={styles["new-payload-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>{onlyInsert ? "Choose Dict to Insert" : "Payload Dict Management"}</div>
                    <div className={styles["count"]}>{getPayloadCount}</div>
                </div>
                <div className={styles["extra"]}>
                    {onlyInsert ? (
                        <Tooltip title={"To Payload Dict Management"}>
                            <YakitButton
                                type='text2'
                                icon={<OutlineCogIcon />}
                                onClick={() => {
                                    onClose && onClose()
                                    ipcRenderer.invoke("open-route-page", {route: YakitRoute.PayloadManager})
                                }}
                            />
                        </Tooltip>
                    ) : (
                        <YakitDropdownMenu
                            menu={{
                                data: [
                                    {
                                        key: "createDictionaries",
                                        label: (
                                            <div className={styles["extra-menu"]}>
                                                <OutlineAddPayloadIcon />
                                                <div className={styles["menu-name"]}>New Dict</div>
                                            </div>
                                        )
                                    },
                                    {
                                        key: "createFolder",
                                        label: (
                                            <div className={styles["extra-menu"]}>
                                                <OutlineFolderaddIcon />
                                                <div className={styles["menu-name"]}>Create New Folder</div>
                                            </div>
                                        )
                                    }
                                ],
                                onClick: ({key}) => {
                                    switch (key) {
                                        case "createDictionaries":
                                            const m = showYakitModal({
                                                getContainer: document.getElementById("new-payload") || document.body,
                                                title: null,
                                                footer: null,
                                                width: 520,
                                                type: "white",
                                                closable: false,
                                                maskClosable: false,
                                                hiddenHeader: true,
                                                content: (
                                                    <CreateDictionaries
                                                        title='New Dict'
                                                        type='dictionaries'
                                                        onQueryGroup={onQueryGroup}
                                                        onClose={() => {
                                                            m.destroy()
                                                        }}
                                                    />
                                                )
                                            })
                                            break
                                        case "createFolder":
                                            // Generate UUID
                                            const uuid = uuidv4()
                                            setData([
                                                {
                                                    type: "Folder",
                                                    name: "",
                                                    id: uuid,
                                                    isCreate: true,
                                                    number: 0
                                                },
                                                ...data
                                            ])
                                            break
                                        default:
                                            break
                                    }
                                }
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottomRight"
                            }}
                        >
                            <Tooltip title={"Add"}>
                                <YakitButton type='secondary2' icon={<OutlinePlusIcon />} />
                            </Tooltip>
                        </YakitDropdownMenu>
                    )}
                </div>
            </div>
            <div className={styles["content"]}>
                <div className={styles["drag-list"]}>
                    {onlyInsert ? (
                        <>
                            {data.map((item, index) => {
                                const fileOutside =
                                    moveLevel?.draggableId === item.id ? moveLevel.level === "outside" : true
                                const isCombine = combineIds[0] === item.id
                                /* Render Your Folder/File Component */
                                /* Use item.type for Folder/File */
                                return item.type === "Folder" ? (
                                    // Render Folder Component
                                    <FolderComponent
                                        key={`${item.id}-${index}`}
                                        folder={item}
                                        selectItem={selectItem}
                                        setSelectItem={setSelectItem}
                                        data={data}
                                        setData={setData}
                                        subDropType={subDropType}
                                        moveLevel={moveLevel}
                                        isCombine={isCombine}
                                        codePath={codePath}
                                        notExpandArr={notExpandArr}
                                        setNotExpandArr={setNotExpandArr}
                                        onQueryGroup={onQueryGroup}
                                        setContentType={setContentType}
                                        onlyInsert={onlyInsert}
                                    />
                                ) : (
                                    // Render File Component
                                    <FileComponent
                                        key={`${item.id}-${index}`}
                                        file={item}
                                        selectItem={selectItem}
                                        setSelectItem={setSelectItem}
                                        data={data}
                                        setData={setData}
                                        isInside={!fileOutside}
                                        isCombine={isCombine}
                                        codePath={codePath}
                                        onQueryGroup={onQueryGroup}
                                        setContentType={setContentType}
                                        onlyInsert={onlyInsert}
                                    />
                                )
                            })}
                            <div className={styles["to-end"]}>Reached Bottom～</div>
                        </>
                    ) : (
                        <>
                            <DragDropContext
                                onDragEnd={onDragEnd}
                                onDragStart={onDragStart}
                                onDragUpdate={onDragUpdate}
                                onBeforeCapture={onBeforeCapture}
                            >
                                <Droppable
                                    droppableId='droppable-payload'
                                    direction='vertical'
                                    type={dropType}
                                    isCombineEnabled={isCombineEnabled}
                                >
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps}>
                                            {data.map((item, index) => {
                                                const fileOutside =
                                                    moveLevel?.draggableId === item.id
                                                        ? moveLevel.level === "outside"
                                                        : true
                                                const isCombine = combineIds[0] === item.id
                                                return (
                                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    // ...provided.draggableProps.style
                                                                    ...getItemStyle(
                                                                        snapshot.isDragging,
                                                                        provided.draggableProps.style
                                                                    )
                                                                }}
                                                            >
                                                                {/* Render Your Folder/File Component */}
                                                                {/* Use item.type for Folder/File */}
                                                                {item.type === "Folder" ? (
                                                                    // Render Folder Component
                                                                    <FolderComponent
                                                                        folder={item}
                                                                        selectItem={selectItem}
                                                                        setSelectItem={setSelectItem}
                                                                        data={data}
                                                                        setData={setData}
                                                                        subDropType={subDropType}
                                                                        moveLevel={moveLevel}
                                                                        isCombine={isCombine}
                                                                        codePath={codePath}
                                                                        notExpandArr={notExpandArr}
                                                                        setNotExpandArr={setNotExpandArr}
                                                                        onQueryGroup={onQueryGroup}
                                                                        setContentType={setContentType}
                                                                        isDragging={snapshot.isDragging}
                                                                    />
                                                                ) : (
                                                                    // Render File Component
                                                                    <FileComponent
                                                                        file={item}
                                                                        selectItem={selectItem}
                                                                        setSelectItem={setSelectItem}
                                                                        data={data}
                                                                        setData={setData}
                                                                        isInside={!fileOutside}
                                                                        isCombine={isCombine}
                                                                        codePath={codePath}
                                                                        onQueryGroup={onQueryGroup}
                                                                        setContentType={setContentType}
                                                                        isDragging={snapshot.isDragging}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                )
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                            <div className={styles["to-end"]}>Reached Bottom～</div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

interface FileComponentCloneProps {
    file: DataItem
    selectItem?: string
    isInside?: boolean
}

// Drag Element Generator
export const FileComponentClone: React.FC<FileComponentCloneProps> = (props) => {
    const {file, selectItem, isInside = true} = props
    const menuOpen = false
    return (
        <div
            className={classNames(styles["file"], {
                [styles["file-active"]]: file.id === selectItem,
                [styles["file-no-active"]]: file.id !== selectItem,
                [styles["file-inside"]]: isInside,
                [styles["file-outside"]]: !isInside
            })}
        >
            <div className={styles["file-header"]}>
                <div className={styles["drag-icon"]}>
                    <SolidDragsortIcon />
                </div>
                {file.type === "DataBase" ? (
                    <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                        <SolidDatabaseIcon />
                    </div>
                ) : (
                    <div className={classNames(styles["file-icon"], styles["file-icon-document"])}>
                        <SolidDocumenttextIcon />
                    </div>
                )}

                <div className={styles["file-name"]}>{file.name}</div>
            </div>
            <div
                className={classNames(styles["extra"], {
                    [styles["extra-dot"]]: menuOpen,
                    [styles["extra-hover"]]: !menuOpen
                })}
            >
                <div className={styles["file-count"]}>10</div>
                <div
                    className={styles["extra-icon"]}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <SolidDotsverticalIcon />
                </div>
            </div>
        </div>
    )
}

interface FolderComponentProps {
    folder: DataItem
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    subDropType: string
    moveLevel?: MoveLevelProps
    // Merge?
    isCombine?: boolean
    // Export Params
    codePath?: string
    // No Expand Record for Folder
    notExpandArr: string[]
    setNotExpandArr: (v: string[]) => void
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    setContentType: (v?: "editor" | "table") => void
    onlyInsert?: boolean
    // Dragging
    isDragging?: boolean
}
export const FolderComponent: React.FC<FolderComponentProps> = (props) => {
    const {
        folder,
        selectItem,
        setSelectItem,
        data,
        setData,
        subDropType,
        moveLevel,
        isCombine,
        codePath,
        notExpandArr,
        setNotExpandArr,
        onQueryGroup,
        setContentType,
        onlyInsert,
        isDragging
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(folder.isCreate === true)
    const [inputName, setInputName] = useState<string>(folder.name)
    // delete
    const [deleteVisible, setDeleteVisible] = useState<boolean>(false)
    const getAllFolderName = useMemoizedFn(() => {
        return data.filter((item) => item.type === "Folder").map((item) => item.name)
    })

    const setFolderNameById = useMemoizedFn(() => {
        // Folders on Top Level
        const newData = data.map((item) => {
            if (item.id === folder.id) {
                return {...item, name: inputName}
            }
            return item
        })
        setData(newData)
    })

    // Rename File
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        const allFolderName = getAllFolderName()
        const pass: boolean = !isIncludeSpecial(inputName)
        if (inputName.length > 0 && !allFolderName.includes(inputName) && pass) {
            // Create
            if (folder.isCreate) {
                ipcRenderer
                    .invoke("CreatePayloadFolder", {
                        Name: inputName
                    })
                    .then(() => {
                        success("Successful Folder Creation")
                        setInputName(inputName)
                        setFolderNameById()
                    })
                    .catch((e: any) => {
                        failed(`Create Folder Failed：${e}`)
                        setData(data.filter((item) => !item.isCreate))
                    })
            }
            // Edit
            else {
                ipcRenderer
                    .invoke("RenamePayloadFolder", {
                        Name: folder.name,
                        NewName: inputName
                    })
                    .then(() => {
                        success("Modified successfully")
                        setInputName(inputName)
                        setFolderNameById()
                    })
                    .catch((e: any) => {
                        setInputName(folder.name)
                        failed(`Edit Failed：${e}`)
                    })
            }
        } else {
            !pass && warn("Forbidden Names/*,")
            // No Create If Empty
            if (folder.isCreate) {
                setData(data.filter((item) => !item.isCreate))
                allFolderName.includes(inputName) && inputName.length !== 0 && warn("Folder Name Exists")
            }
            // Empty Edit Revert
            else {
                // No Changes
                setInputName(folder.name)
                folder.name !== inputName && allFolderName.includes(inputName) && warn("Folder Name Exists: No Edit")
            }
        }
    })

    const onDeleteFolderById = useMemoizedFn((id: string) => {
        // Folders on Top Level
        const newData = data.filter((item) => item.id !== id)
        setData(newData)
        // Re-select on Delete
        const sourceFolders = findFoldersById(data, id)
        if (sourceFolders && sourceFolders?.node) {
            let results = sourceFolders.node.find((item) => item.id === selectItem)
            if (results) setContentType(undefined)
        }
    })

    // Delete Folder
    const onDeleteFolder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeletePayloadByFolder", {
                Name: folder.name
            })
            .then(() => {
                success("Delete Success")
                onDeleteFolderById(folder.id)
                setDeleteVisible(false)
            })
            .catch((e: any) => {
                failed(`Delete Failed：${e}`)
            })
    })

     // Right-Click Menu
     const handleRightClick = useMemoizedFn((e)=>{
        e.preventDefault();
        if(!onlyInsert){
            setMenuOpen(true) 
        }
    })
    return (
        <>
            {isEditInput ? (
                <div className={styles["file-input"]} style={{paddingLeft: 8}}>
                    <YakitInput
                        value={inputName}
                        autoFocus
                        showCount
                        maxLength={50}
                        onPressEnter={() => {
                            onChangeValue()
                        }}
                        onBlur={() => {
                            onChangeValue()
                        }}
                        onChange={(e) => {
                            setInputName(e.target.value)
                        }}
                    />
                </div>
            ) : (
                <div
                    className={classNames(styles["folder"], {
                        [styles["folder-active"]]: folder.id === selectItem,
                        [styles["folder-no-active"]]: folder.id !== selectItem,
                        [styles["folder-menu"]]: menuOpen,
                        [styles["folder-combine"]]: isCombine,
                        [styles["folder-no-combine"]]: !isCombine,
                        [styles["folder-border"]]: !isCombine && !menuOpen && !isDragging && notExpandArr.includes(folder.id)
                    })}
                    onClick={() => {
                        if (onlyInsert) {
                            setSelectItem(folder.id)
                        }
                        if (notExpandArr.includes(folder.id)) {
                            setNotExpandArr(notExpandArr.filter((item) => item !== folder.id))
                        } else {
                            setNotExpandArr([...notExpandArr, folder.id])
                        }
                    }}
                    onContextMenu={handleRightClick}
                >
                    <div className={styles["folder-header"]}>
                        <div className={styles["is-fold-icon"]}>
                            {!notExpandArr.includes(folder.id) ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />}
                        </div>
                        <div className={styles["folder-icon"]}>
                            <SolidFolderopenIcon />
                        </div>
                        <div className={classNames(styles["folder-name"], "yakit-content-single-ellipsis")}>
                            {inputName}
                        </div>
                    </div>
                    <div
                        className={classNames(styles["extra"], {
                            [styles["extra-dot"]]: !onlyInsert && menuOpen,
                            [styles["extra-hover"]]: !onlyInsert && !menuOpen
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles["file-count"]}>{folder?.node ? folder.node.length : 0}</div>
                        {!onlyInsert && (
                            <YakitDropdownMenu
                                menu={{
                                    data: [
                                        {
                                            key: "copyFuzztag",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineDocumentduplicateIcon />
                                                    <div className={styles["menu-name"]}>Copy Fuzztag</div>
                                                </div>
                                            )
                                        },
                                        {
                                            key: "addChildPayload",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineAddPayloadIcon />
                                                    <div className={styles["menu-name"]}>Add Subset Dict</div>
                                                </div>
                                            )
                                        },
                                        {
                                            key: "rename",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlinePencilaltIcon />
                                                    <div className={styles["menu-name"]}>Rename</div>
                                                </div>
                                            )
                                        },
                                        {
                                            type: "divider"
                                        },
                                        {
                                            key: "delete",
                                            label: (
                                                <div className={styles["extra-menu"]}>
                                                    <OutlineTrashIcon />
                                                    <div className={styles["menu-name"]}>Delete</div>
                                                </div>
                                            ),
                                            type: "danger"
                                        }
                                    ],
                                    onClick: ({key}) => {
                                        setMenuOpen(false)
                                        switch (key) {
                                            case "copyFuzztag":
                                                callCopyToClipboard(`{{payload(${inputName}/*)}}`)
                                                break
                                            case "addChildPayload":
                                                // Note on Folders
                                                const m = showYakitModal({
                                                    getContainer:
                                                        document.getElementById("new-payload") || document.body,
                                                    title: null,
                                                    footer: null,
                                                    width: 520,
                                                    type: "white",
                                                    closable: false,
                                                    maskClosable: false,
                                                    hiddenHeader: true,
                                                    content: (
                                                        <CreateDictionaries
                                                            title='Add Subset Dict'
                                                            type='dictionaries'
                                                            onQueryGroup={onQueryGroup}
                                                            folder={folder.name}
                                                            onClose={() => {
                                                                m.destroy()
                                                            }}
                                                        />
                                                    )
                                                })
                                                break
                                            case "rename":
                                                setEditInput(true)
                                                break
                                            case "delete":
                                                setDeleteVisible(true)
                                                break
                                            default:
                                                break
                                        }
                                    }
                                }}
                                dropdown={{
                                    trigger: ["click"],
                                    placement: "bottomRight",
                                    onVisibleChange: (v) => {
                                        setMenuOpen(v)
                                    },
                                    visible: menuOpen
                                }}
                            >
                                <div className={styles["extra-icon"]}>
                                    <SolidDotsverticalIcon />
                                </div>
                            </YakitDropdownMenu>
                        )}
                    </div>
                </div>
            )}

            {onlyInsert ? (
                <>
                    {!notExpandArr.includes(folder.id) &&
                        Array.isArray(folder.node) &&
                        folder.node.map((file, index) => (
                            <FileComponent
                                key={file.id}
                                file={file}
                                folder={folder.name}
                                selectItem={selectItem}
                                setSelectItem={setSelectItem}
                                data={data}
                                setData={setData}
                                isInside={true}
                                codePath={codePath}
                                onQueryGroup={onQueryGroup}
                                setContentType={setContentType}
                                onlyInsert={onlyInsert}
                                endBorder={(folder.node?.length||0)-1===index}
                            />
                        ))}
                </>
            ) : (
                <>
                    {!notExpandArr.includes(folder.id) && (
                        <Droppable
                            droppableId={`${folder.id}`}
                            type={subDropType}
                            isCombineEnabled={false}
                            direction='vertical'
                            renderClone={(provided, snapshot, rubric) => {
                                const file: DataItem[] =
                                    folder.node?.filter((item, index) => `${item.id}` === rubric.draggableId) || []

                                const cloneStyle = cloneItemStyle(provided.draggableProps.style)
                                const fileInside =
                                    moveLevel?.draggableId === file[0].id ? moveLevel.level === "inside" : true
                                return (
                                    <div
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        ref={provided.innerRef}
                                        style={{...cloneStyle}}
                                    >
                                        <>
                                            {file.length > 0 && (
                                                <FileComponentClone
                                                    file={file[0]}
                                                    selectItem={selectItem}
                                                    isInside={fileInside}
                                                />
                                            )}
                                        </>
                                    </div>
                                )
                            }}
                        >
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                    {Array.isArray(folder.node) &&
                                        folder.node.map((file, index) => (
                                            <Draggable key={file.id} draggableId={file.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...provided.draggableProps.style
                                                        }}
                                                    >
                                                        {/* Render File Component */}
                                                        <FileComponent
                                                            file={file}
                                                            folder={folder.name}
                                                            selectItem={selectItem}
                                                            setSelectItem={setSelectItem}
                                                            data={data}
                                                            setData={setData}
                                                            isInside={true}
                                                            codePath={codePath}
                                                            onQueryGroup={onQueryGroup}
                                                            setContentType={setContentType}
                                                            endBorder={(folder.node?.length||0)-1===index}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    )}
                </>
            )}
            {deleteVisible && (
                <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} onFinish={onDeleteFolder} />
            )}
        </>
    )
}

interface DeleteConfirmProps {
    visible: boolean
    setVisible: (v: boolean) => void
    onFinish: () => void
}

// Delete Confirm Modal
export const DeleteConfirm: React.FC<DeleteConfirmProps> = (props) => {
    const {visible, setVisible, onFinish} = props
    const [check, setCheck] = useState<boolean>(false)
    const [showConfirm, setShowConfirm] = useState<boolean>(false)
    const NewPayloadDeleteConfirm = "NewPayloadDeleteConfirm"
    useEffect(() => {
        getRemoteValue(NewPayloadDeleteConfirm).then((res) => {
            if (!res) {
                setShowConfirm(true)
                return
            }
            try {
                const obj = JSON.parse(res)
                if (!obj.check) {
                    setShowConfirm(true)
                } else {
                    onFinish()
                }
            } catch (error) {}
        })
    }, [])

    const onCheck = useMemoizedFn((v: boolean) => {
        setCheck(v)
        setRemoteValue(NewPayloadDeleteConfirm, JSON.stringify({check: v}))
    })

    return (
        <>
            {/* Delete Confirm Modal */}
            <YakitHint
                visible={showConfirm && visible}
                title='Delete?'
                content='Confirm Delete: Permanent'
                footerExtra={
                    <YakitCheckbox value={check} onChange={(e) => onCheck(e.target.checked)}>
                        Do not remind again
                    </YakitCheckbox>
                }
                onOk={() => {
                    onFinish()
                }}
                onCancel={() => {
                    setVisible(false)
                }}
            />
        </>
    )
}

interface FileComponentProps {
    file: DataItem
    folder?: string
    selectItem?: string
    setSelectItem: (id: string) => void
    data: DataItem[]
    setData: (v: DataItem[]) => void
    onQueryGroup: (obj?: {Group: string; Folder: string}) => void
    // Inner Layer?
    isInside?: boolean
    // Merge?
    isCombine?: boolean
    // Export Needed Data
    codePath?: string
    // Display Control
    setContentType: (v?: "editor" | "table") => void
    onlyInsert?: boolean
    // Dragging
    isDragging?: boolean
    // Show Border at Bottom?
    endBorder?: boolean
}

export const FileComponent: React.FC<FileComponentProps> = (props) => {
    const {
        file,
        folder,
        selectItem,
        setSelectItem,
        isInside = true,
        isCombine,
        data,
        setData,
        onQueryGroup,
        codePath = "",
        setContentType,
        onlyInsert,
        isDragging,
        endBorder
    } = props
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [isEditInput, setEditInput] = useState<boolean>(file.isCreate === true)
    const [inputName, setInputName] = useState<string>(file.name)
    // DB Storage Token
    const [token, setToken] = useState(randomString(20))
    const [visible, setVisible] = useState<boolean>(false)

    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [exportType, setExportType] = useState<"all" | "file">()
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])

    // delete
    const [deleteVisible, setDeleteVisible] = useState<boolean>(false)

    // Rename by Id
    const setFileById = useMemoizedFn((id: string, newName: string) => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, id)
        if (selectData) {
            if (selectData.type === "Folder") {
                let node =
                    selectData.node?.map((item) => {
                        if (item.id === id) {
                            return {...item, name: newName}
                        }
                        return item
                    }) || []
                const newData = copyData.map((item) => {
                    if (item.id === selectData.id) {
                        return {...item, node}
                    }
                    return item
                })
                setData(newData)
            } else {
                const newData = copyData.map((item) => {
                    if (item.id === id) {
                        return {...item, name: newName}
                    }
                    return item
                })
                setData(newData)
            }
        }
    })

    // Get All Filenames
    const getAllFileName = useMemoizedFn(() => {
        let name: string[] = []
        data.forEach((item) => {
            if (item.type !== "Folder") {
                name.push(item.name)
            }
            if (item.node) {
                item.node.forEach((itemIn) => {
                    name.push(itemIn.name)
                })
            }
        })
        return name
    })

    // Rename File
    const onChangeValue = useMemoizedFn(() => {
        setEditInput(false)
        const allFileName = getAllFileName()
        const pass: boolean = !isIncludeSpecial(inputName)
        if (inputName.length > 0 && !allFileName.includes(inputName) && pass) {
            ipcRenderer
                .invoke("RenamePayloadGroup", {
                    Name: file.name,
                    NewName: inputName
                })
                .then(() => {
                    success("Modified successfully")
                    setInputName(inputName)
                    setFileById(file.id, inputName)
                })
                .catch((e: any) => {
                    setInputName(file.name)
                    failed(`Edit Failed：${e}`)
                })
        } else {
            file.name !== inputName && allFileName.includes(inputName) && warn("Duplicate Name: Edit Failed")
            !pass && warn("Forbidden Names/*,")
            setInputName(file.name)
        }
    })

    // Delete by Id
    const onDeletePayloadById = useMemoizedFn((id: string) => {
        const copyData: DataItem[] = JSON.parse(JSON.stringify(data))
        const selectData = findFoldersById(copyData, id)
        if (selectData) {
            if (selectData.type === "Folder") {
                let node = selectData.node?.filter((item) => item.id !== id)
                const newData = copyData.map((item) => {
                    if (item.id === selectData.id && node) {
                        return {...item, node}
                    } else if (item.id === selectData.id && node === undefined) {
                        delete item.node
                        return item
                    }
                    return item
                })
                setData(newData)
                let results = selectData.node?.find((item) => item.id === selectItem)
                if (results) setContentType(undefined)
            } else {
                const newData = copyData.filter((item) => item.id !== id)
                setData(newData)

                if (selectItem === id) setContentType(undefined)
            }
        }
    })

    // Delete Payload
    const onDeletePayload = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeletePayloadByGroup", {
                Group: file.name
            })
            .then(() => {
                success("Delete Success")
                onDeletePayloadById(file.id)
                setDeleteVisible(false)
            })
            .catch((e: any) => {
                failed(`Delete Failed：${e}`)
            })
    })

    // Export CSV
    const onExportCsv = useMemoizedFn(() => {
        setExportVisible(true)
        setExportType("all")
    })

    // File Export
    const onExportTxt = useMemoizedFn(() => {
        setExportVisible(true)
        setExportType("file")
    })

    // Convert to DB Storage
    const onGroupToDatabase = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "ConvertPayloadGroupToDatabase",
            {
                Name: inputName
            },
            token
        )
        if (file.id === selectItem) setContentType(undefined)
        setVisible(true)
    })

    // Cancel DB Storage
    const cancelRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-ConvertPayloadGroupToDatabase", token)
    })

    // Switch to DB Storage
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[ToDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            logInfoRef.current = []
            onQueryGroup({
                Group: file.name,
                Folder: folder || ""
            })
            info("[ToDatabase] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-ConvertPayloadGroupToDatabase", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const fileMenuData = useMemo(() => {
        // DB Export to CSV, File Export to TXT
        return file.type === "DataBase"
            ? [
                  {
                      key: "copyFuzztag",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineDocumentduplicateIcon />
                              <div className={styles["menu-name"]}>Copy Fuzztag</div>
                          </div>
                      )
                  },
                  {
                      key: "importPayload",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineImportIcon />
                              <div className={styles["menu-name"]}>Expand Dict</div>
                          </div>
                      )
                  },
                  {
                      key: "exportCsv",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineExportIcon />
                              <div className={styles["menu-name"]}>Export Dict</div>
                          </div>
                      )
                  },
                  {
                      key: "rename",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlinePencilaltIcon />
                              <div className={styles["menu-name"]}>Rename</div>
                          </div>
                      )
                  },
                  {
                      type: "divider"
                  },
                  {
                      key: "delete",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineTrashIcon />
                              <div className={styles["menu-name"]}>Delete</div>
                          </div>
                      ),
                      type: "danger"
                  }
              ]
            : [
                  {
                      key: "copyFuzztag",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineDocumentduplicateIcon />
                              <div className={styles["menu-name"]}>Copy Fuzztag</div>
                          </div>
                      )
                  },
                  {
                      key: "exportTxt",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineExportIcon />
                              <div className={styles["menu-name"]}>Export Dict</div>
                          </div>
                      )
                  },
                  {
                      key: "rename",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlinePencilaltIcon />
                              <div className={styles["menu-name"]}>Rename</div>
                          </div>
                      )
                  },
                  {
                      key: "toDatabase",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineDatabasebackupIcon />
                              <div className={styles["menu-name"]}>Convert to DB Storage</div>
                          </div>
                      )
                  },
                  {
                      type: "divider"
                  },
                  {
                      key: "delete",
                      label: (
                          <div className={styles["extra-menu"]}>
                              <OutlineTrashIcon />
                              <div className={styles["menu-name"]}>Delete</div>
                          </div>
                      ),
                      type: "danger"
                  }
              ]
    }, [])

    // Right-Click Menu
    const handleRightClick = useMemoizedFn((e)=>{
        e.preventDefault();
        if(!onlyInsert){
            setSelectItem(file.id)
            setMenuOpen(true)  
        }
    })
    return (
        <>
            {isEditInput ? (
                <div className={styles["file-input"]} style={{paddingLeft: isInside ? 28 : 8}}>
                    <YakitInput
                        value={inputName}
                        autoFocus
                        showCount
                        maxLength={50}
                        onPressEnter={() => {
                            onChangeValue()
                        }}
                        onBlur={() => {
                            onChangeValue()
                        }}
                        onChange={(e) => {
                            setInputName(e.target.value)
                        }}
                    />
                </div>
            ) : (
                <div
                    className={classNames(styles["file"], {
                        [styles["file-active"]]: file.id === selectItem,
                        [styles["file-no-active"]]: file.id !== selectItem,
                        [styles["file-menu"]]: menuOpen && file.id !== selectItem,
                        [styles["file-combine"]]: isCombine,
                        [styles["file-outside"]]: !isInside,
                        [styles["file-inside"]]: isInside,
                        [styles["file-dragging"]]: !isInside && !isDragging,
                        [styles["file-end-border"]]: endBorder
                    })}
                    onClick={() => {
                        setSelectItem(file.id)
                    }}
                    onContextMenu={handleRightClick}
                >
                    <div className={styles["file-header"]}>
                        {!onlyInsert&&<div className={styles["drag-icon"]}>
                            <SolidDragsortIcon />
                        </div>}
                        {file.type === "DataBase" ? (
                            <div className={classNames(styles["file-icon"], styles["file-icon-database"])}>
                                <SolidDatabaseIcon />
                            </div>
                        ) : (
                            <div className={classNames(styles["file-icon"], styles["file-icon-document"])}>
                                <SolidDocumenttextIcon />
                            </div>
                        )}

                        <div className={styles["file-name"]}>{inputName}</div>
                    </div>
                    <div
                        className={classNames(styles["extra"], {
                            [styles["extra-dot"]]: !onlyInsert && menuOpen,
                            [styles["extra-hover"]]: !onlyInsert && !menuOpen
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles["file-count"]} style={onlyInsert ? {display: "block"} : {}}>
                            {file.type === "DataBase" ? file.number : ""}
                        </div>
                        {!onlyInsert && (
                            <YakitDropdownMenu
                                menu={{
                                    data: fileMenuData as YakitMenuItemProps[],
                                    onClick: ({key}) => {
                                        setMenuOpen(false)
                                        switch (key) {
                                            case "copyFuzztag":
                                                callCopyToClipboard(`{{payload(${inputName})}}`)
                                                break
                                            case "importPayload":
                                                const m = showYakitModal({
                                                    getContainer:
                                                        document.getElementById("new-payload") || document.body,
                                                    title: null,
                                                    footer: null,
                                                    width: 520,
                                                    type: "white",
                                                    closable: false,
                                                    maskClosable: false,
                                                    hiddenHeader: true,
                                                    content: (
                                                        <CreateDictionaries
                                                            title='Expand for Cyber Defense Tool'
                                                            type='payload'
                                                            onQueryGroup={onQueryGroup}
                                                            folder={folder}
                                                            group={inputName}
                                                            onClose={() => {
                                                                m.destroy()
                                                            }}
                                                        />
                                                    )
                                                })
                                                break
                                            case "exportCsv":
                                                onExportCsv()
                                                break
                                            case "exportTxt":
                                                onExportTxt()
                                                break
                                            case "rename":
                                                setEditInput(true)
                                                break
                                            case "toDatabase":
                                                onGroupToDatabase()
                                                break
                                            case "delete":
                                                setDeleteVisible(true)
                                                break
                                            default:
                                                break
                                        }
                                    }
                                }}
                                dropdown={{
                                    overlayClassName: styles["payload-list-menu"],
                                    trigger: ["click"],
                                    placement: "bottomRight",
                                    onVisibleChange: (v) => {
                                        setMenuOpen(v)
                                    },
                                    visible: menuOpen
                                }}
                            >
                                <div className={styles["extra-icon"]}>
                                    <SolidDotsverticalIcon />
                                </div>
                            </YakitDropdownMenu>
                        )}
                    </div>
                </div>
            )}
            <YakitModal
                centered
                getContainer={document.getElementById("new-payload") || document.body}
                visible={visible}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <UploadStatusInfo
                    title={"Converting to DB Storage..."}
                    streamData={streamData}
                    cancelRun={() => {
                        cancelRemoveDuplicate()
                        setVisible(false)
                    }}
                    onClose={() => {
                        setVisible(false)
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
            {deleteVisible && (
                <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} onFinish={onDeletePayload} />
            )}
            {exportVisible && (
                <ExportByGrpc
                    group={file.name}
                    folder={folder || ""}
                    setExportVisible={setExportVisible}
                    isFile={exportType === "file"}
                />
            )}
        </>
    )
}

interface MoveOrCopyPayloadProps {
    group: string
    copyMoveValueRef: any
}

interface MoveOrCopyParamsProps {
    file: string
    folder?: string
}

export const MoveOrCopyPayload: React.FC<MoveOrCopyPayloadProps> = (props) => {
    const {copyMoveValueRef, group} = props
    const [value, setValue] = useState<string>()
    const [fileArr, setFileArr] = useState<MoveOrCopyParamsProps[]>([])
    useEffect(() => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                let arr: MoveOrCopyParamsProps[] = []
                res.Nodes.forEach((item) => {
                    if (item.Type !== "Folder") {
                        arr.push({file: item.Name, folder: ""})
                    } else {
                        item.Nodes.forEach((itemIn) => {
                            arr.push({file: itemIn.Name, folder: item.Name})
                        })
                    }
                })
                setFileArr(arr.filter((item) => item.file !== group))
            })
            .catch((e: any) => {
                failed(`Data Fetch Failed：${e}`)
            })
            .finally()
    }, [])
    return (
        <div style={{padding: "20px 24px"}}>
            <YakitSelect
                value={value}
                onSelect={(val) => {
                    setValue(val)
                    let item = fileArr.filter((item) => item.file === val)[0]
                    copyMoveValueRef.current = item
                }}
                placeholder='Please Select...'
            >
                {fileArr.map((item) => (
                    <YakitSelect value={item.file} key={item.file}>
                        {item.file}
                    </YakitSelect>
                ))}
            </YakitSelect>
        </div>
    )
}

interface PayloadContentProps {
    isExpand?: boolean
    setExpand?: (v: boolean) => void
    showContentType: "editor" | "table"
    group: string
    folder: string
    onlyInsert?: boolean
    onClose?: () => void
}

interface PayloadFileDataProps {
    Data: Uint8Array
    IsBigFile: boolean
}

interface GetAllPayloadFromFileResponse {
    Progress: number
}

export const PayloadContent: React.FC<PayloadContentProps> = (props) => {
    const {isExpand, setExpand, showContentType, group, folder, onlyInsert, onClose} = props
    const [isEditMonaco, setEditMonaco] = useState<boolean>(false)
    const [editorValue, setEditorValue] = useState<string>("")
    const [payloadFileData, setPayloadFileData] = useState<PayloadFileDataProps>()

    const [selectPayloadArr, setSelectPayloadArr] = useState<number[]>([])
    const [params, setParams, getParams] = useGetState<QueryPayloadParams>({
        Keyword: "",
        Folder: "",
        Group: "",
        Pagination: {Page: 1, Limit: 20, Order: "asc", OrderBy: "id"}
    })
    const [response, setResponse] = useState<QueryGeneralResponse<Payload>>()
    const pagination: PaginationSchema | undefined = response?.Pagination
    const [loading, setLoading] = useState<boolean>(false)

    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [exportType, setExportType] = useState<"all" | "file">()
    // Deduplicate Token
    const [token, setToken] = useState(randomString(20))
    const [visible, setVisible] = useState<boolean>(false)

    const copyMoveValueRef = useRef<MoveOrCopyParamsProps>()

    const headerRef = useRef<HTMLDivElement>(null)
    const size = useSize(headerRef)

    useEffect(() => {
        emiter.on("refreshTableEvent", onRefreshTableEvent)
        return () => {
            emiter.off("refreshTableEvent", onRefreshTableEvent)
        }
    }, [])

    const onRefreshTableEvent = useMemoizedFn(() => {
        onQueryPayload()
    })

    useDebounceEffect(
        () => {
            reset()
            // Get Table Data
            if (showContentType === "table") {
                onQueryPayload()
            }
            // Get Editor Data
            else {
                onQueryEditor(group, folder)
            }
        },
        [group, folder, showContentType],
        {
            wait: 200
        }
    )

    const reset = useMemoizedFn(() => {
        setEditorValue("")
        setPayloadFileData(undefined)
        setResponse(undefined)
        setSelectPayloadArr([])
    })

    const Expand = () => (
        <div
            className={styles["icon-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )

    const onQueryEditor = useMemoizedFn((Group: string, Folder: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("QueryPayloadFromFile", {
                Group,
                Folder
            })
            .then((data: PayloadFileDataProps) => {
                setPayloadFileData(data)
                setEditorValue(Uint8ArrayToString(data.Data))
                setLoading(false)
            })
            .catch((e: any) => {
                failed("Editor Data Failed")
            })
    })

    const onQueryPayload = useMemoizedFn((page?: number, limit?: number) => {
        const obj: QueryPayloadParams = {
            ...getParams(),
            Group: group,
            Folder: folder,
            Pagination: {
                ...getParams().Pagination,
                Page: page || getParams().Pagination.Page,
                Limit: limit || getParams().Pagination.Limit
            }
        }
        ipcRenderer
            .invoke("QueryPayload", obj)
            .then((data: QueryGeneralResponse<Payload>) => {
                setResponse(data)
                // Refresh Notification
                emiter.emit("refreshListEvent")
            })
            .catch((e: any) => {
                failed(`QueryPayload failed：${e}`)
            })
    })

    const onDeletePayload = useMemoizedFn((deletePayload: DeletePayloadProps) => {
        ipcRenderer
            .invoke("DeletePayload", deletePayload)
            .then(() => {
                let page = pagination?.Page
                // Delete All Moves to Page 1
                if(pagination&&deletePayload.Ids?.length===response?.Data.length){
                    page = 1
                }
                onQueryPayload(page, pagination?.Limit)
                setSelectPayloadArr([])
                success("Delete Success")
            })
            .catch((e: any) => {
                failed("Delete Failed：" + e)
            })
    })

    const onCopyOrMoveFun = useMemoizedFn((id?: number, isCopy = false) => {
        return new Promise((resolve, reject) => {
            if (copyMoveValueRef.current === undefined) {
                warn("Choose a Dict")
                resolve(false)
            } else {
                const {folder, file} = copyMoveValueRef.current
                ipcRenderer
                    .invoke("BackUpOrCopyPayloads", {
                        Ids: id ? [id] : selectPayloadArr,
                        Group: file,
                        Folder: folder,
                        Copy: isCopy
                    })
                    .then(() => {
                        success("Success")
                        onQueryPayload()
                        resolve(true)
                        // Refresh Notification
                        emiter.emit("refreshListEvent")
                    })
                    .catch((e: any) => {
                        failed(`Dict Operations Failed${e}`)
                        resolve(false)
                    })
                    .finally()
            }
        })
    })

    const onCopyToOtherPayload = useMemoizedFn((id?: number) => {
        copyMoveValueRef.current = undefined
        const m = showYakitModal({
            title: "Backup to Another Dict",
            width: 400,
            type: "white",
            closable: false,
            content: <MoveOrCopyPayload copyMoveValueRef={copyMoveValueRef} group={group} />,
            onCancel: () => {
                m.destroy()
            },
            onOk: async () => {
                let result = await onCopyOrMoveFun(id, true)
                if (result) {
                    setSelectPayloadArr([])
                    m.destroy()
                }
            }
        })
    })

    const onMoveToOtherPayload = useMemoizedFn((id?: number) => {
        copyMoveValueRef.current = undefined
        const y = showYakitModal({
            title: "Move to Other Dict",
            width: 400,
            type: "white",
            closable: false,
            content: <MoveOrCopyPayload copyMoveValueRef={copyMoveValueRef} group={group} />,
            onCancel: () => {
                y.destroy()
            },
            onOk: async () => {
                let result = await onCopyOrMoveFun(id)
                if (result) {
                    setSelectPayloadArr([])
                    y.destroy()
                }
            }
        })
    })

    const onSaveFileFun = useMemoizedFn(() => {
        ipcRenderer
            .invoke("UpdatePayloadToFile", {
                GroupName: group,
                Content: editorValue
            })
            .then((data) => {
                onQueryEditor(group, folder)
                setResponse(data)
                setEditMonaco(false)
                success("Save Successful")
            })
            .catch((e: any) => {
                failed(`UpdatePayloadToFile failed:${e}`)
            })
    })

    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])

    // Auto-Deduplicate
    const onRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "RemoveDuplicatePayloads",
            {
                Name: group
            },
            token
        )
        setVisible(true)
    })

    // Cancel Deduplication
    const cancelRemoveDuplicate = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-RemoveDuplicatePayloads", token)
    })

    // Monitor Deduplication
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[RemoveDuplicate] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            logInfoRef.current = []
            info("[RemoveDuplicate] finished")
            onQueryEditor(group, folder)
        })
        return () => {
            ipcRenderer.invoke("cancel-RemoveDuplicatePayloads", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [group, folder])

    const isNoSelect: boolean = useMemo(() => selectPayloadArr.length === 0, [selectPayloadArr])

    return (
        <div className={styles["payload-content"]}>
            <div className={styles["header"]} ref={headerRef}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>{group}</div>
                    <div className={styles["sub-title"]}>
                        {showContentType === "editor" && payloadFileData?.IsBigFile ? (
                            <YakitTag color='danger'>Large Dict</YakitTag>
                        ) : selectPayloadArr.length > 0 ? (
                            <div className={styles["total-item"]}>
                                <span className={styles["total-item-text"]}>Selected</span>
                                <span className={styles["total-item-number"]}>{selectPayloadArr?.length}</span>
                            </div>
                        ) : (
                            `Through Fuzz Module {{Dict: x)}} To Render`
                        )}
                    </div>
                </div>
                {!onlyInsert && showContentType === "table" && (
                    <div className={styles["extra"]}>
                        <YakitInput.Search
                            placeholder='Keyword Search Prompt'
                            value={params.Keyword}
                            onChange={(e) => {
                                setParams({...params, Keyword: e.target.value})
                            }}
                            style={{maxWidth: 200}}
                            onSearch={() => {
                                onQueryPayload()
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 16}} />
                        <YakitButton
                            type='outline1'
                            colors='danger'
                            icon={<OutlineTrashIcon />}
                            disabled={isNoSelect}
                            onClick={() => {
                                if (!isNoSelect) {
                                    onDeletePayload({Ids: selectPayloadArr})
                                }
                            }}
                        />
                        {isNoSelect && (
                            <YakitButton
                                type='outline2'
                                icon={<OutlineExportIcon />}
                                onClick={() => {
                                    setExportType("all")
                                    setExportVisible(true)
                                }}
                            >
                                Export
                            </YakitButton>
                        )}
                        {!isNoSelect && size && (
                            <>
                                {size.width < 950 ? (
                                    <>
                                        <Tooltip title={"Backup to Another Dict"}>
                                            <YakitButton
                                                type='outline2'
                                                icon={<OutlineDocumentduplicateIcon />}
                                                onClick={() => onCopyToOtherPayload()}
                                            />
                                        </Tooltip>
                                        <Tooltip title={"Move to Other Dict"}>
                                            <YakitButton
                                                type='outline2'
                                                icon={<OutlineClipboardcopyIcon />}
                                                onClick={() => onMoveToOtherPayload()}
                                            />
                                        </Tooltip>
                                    </>
                                ) : (
                                    <>
                                        <YakitButton
                                            type='outline2'
                                            icon={<OutlineDocumentduplicateIcon />}
                                            onClick={() => onCopyToOtherPayload()}
                                        >
                                            Backup to Another Dict
                                        </YakitButton>
                                        <YakitButton
                                            type='outline2'
                                            icon={<OutlineClipboardcopyIcon />}
                                            onClick={() => onMoveToOtherPayload()}
                                        >
                                            Move to Other Dict
                                        </YakitButton>
                                    </>
                                )}
                            </>
                        )}
                        <YakitButton
                            icon={<OutlinePlusIcon />}
                            onClick={() => {
                                const m = showYakitModal({
                                    getContainer: document.getElementById("new-payload") || document.body,
                                    title: null,
                                    footer: null,
                                    width: 520,
                                    type: "white",
                                    closable: false,
                                    maskClosable: false,
                                    hiddenHeader: true,
                                    content: (
                                        <CreateDictionaries
                                            title='Expand for Cyber Defense Tool'
                                            type='payload'
                                            onQueryGroup={() => emiter.emit("refreshListEvent")}
                                            group={group}
                                            onClose={() => {
                                                m.destroy()
                                            }}
                                        />
                                    )
                                })
                            }}
                        >
                            Expand
                        </YakitButton>
                        {setExpand && Expand()}
                    </div>
                )}

                {!onlyInsert && showContentType === "editor" && (
                    <>
                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: !isEditMonaco
                            })}
                        >
                            <YakitButton
                                type='outline2'
                                icon={<OutlineXIcon />}
                                onClick={() => {
                                    setEditMonaco(false)
                                    payloadFileData && setEditorValue(Uint8ArrayToString(payloadFileData.Data))
                                }}
                            >
                                Cancel
                            </YakitButton>
                            <YakitButton icon={<SolidStoreIcon />} onClick={onSaveFileFun}>
                                Save
                            </YakitButton>
                            {setExpand && Expand()}
                        </div>

                        <div
                            className={classNames(styles["extra"], {
                                [styles["extra-hidden"]]: isEditMonaco
                            })}
                        >
                            <YakitButton
                                type='outline2'
                                icon={<OutlineExportIcon />}
                                onClick={() => {
                                    setExportType("file")
                                    setExportVisible(true)
                                }}
                            >
                                Export
                            </YakitButton>
                            {payloadFileData?.IsBigFile === false && (
                                <>
                                    <YakitButton
                                        type='outline2'
                                        icon={<OutlineSparklesIcon />}
                                        onClick={onRemoveDuplicate}
                                    >
                                        Auto-Deduplicate
                                    </YakitButton>
                                    <YakitButton
                                        onClick={() => {
                                            setEditMonaco(true)
                                        }}
                                        icon={<OutlinePencilaltIcon />}
                                    >
                                        Edit
                                    </YakitButton>
                                </>
                            )}

                            {setExpand && Expand()}
                        </div>
                    </>
                )}

                {onlyInsert && (
                    <div className={styles["extra"]}>
                        <div
                            className={styles["close-btn"]}
                            onClick={() => {
                                onClose && onClose()
                            }}
                        >
                            <OutlineXIcon />
                        </div>
                    </div>
                )}
            </div>
            <div className={styles["content"]}>
                {showContentType === "editor" && (
                    <div className={styles["editor-box"]}>
                        <YakEditor
                            type='plaintext'
                            readOnly={!isEditMonaco}
                            // noLineNumber={true}
                            value={editorValue}
                            setValue={(content: string) => {
                                setEditorValue(content)
                            }}
                            loading={loading}
                            noWordWrap={true}
                        />
                    </div>
                )}
                {showContentType === "table" && (
                    <div className={styles["table-box"]}>
                        <NewPayloadTable
                            onCopyToOtherPayload={onCopyToOtherPayload}
                            onMoveToOtherPayload={onMoveToOtherPayload}
                            selectPayloadArr={selectPayloadArr}
                            setSelectPayloadArr={setSelectPayloadArr}
                            onDeletePayload={onDeletePayload}
                            onQueryPayload={onQueryPayload}
                            pagination={pagination}
                            params={params}
                            response={response}
                            setResponse={setResponse}
                            setParams={setParams}
                            onlyInsert={onlyInsert}
                        />
                    </div>
                )}
            </div>
            <YakitModal
                centered
                getContainer={document.getElementById("new-payload") || document.body}
                visible={visible}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <UploadStatusInfo
                    title={"Auto-Deduplicating: Wait..."}
                    streamData={streamData}
                    cancelRun={() => {
                        cancelRemoveDuplicate()
                        setVisible(false)
                    }}
                    onClose={() => {
                        setVisible(false)
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
            {exportVisible && (
                <ExportByGrpc
                    group={group}
                    folder={folder}
                    setExportVisible={setExportVisible}
                    isFile={exportType === "file"}
                />
            )}
        </div>
    )
}

interface ExportByGrpcProps {
    group: string
    folder: string
    setExportVisible: (v: boolean) => void
    isFile?: boolean
}
export const ExportByGrpc: React.FC<ExportByGrpcProps> = (props) => {
    const {group, folder, setExportVisible, isFile} = props
    // Export Token
    const [exportToken, setExportToken] = useState(randomString(20))
    // export-show
    const [exportStreamData, setExportStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    // Export Path
    const exportPathRef = useRef<string>()
    // Display Modal?
    const [showModal, setShowModal] = useState<boolean>(false)

    useEffect(() => {
        onExportFileFun()
    }, [])

    // Export Task
    const onExportFileFun = useMemoizedFn(() => {
        ipcRenderer
            .invoke("openDialog", {
                title: "Choose Folder",
                properties: ["openDirectory"]
            })
            .then((data: any) => {
                if (data.filePaths.length) {
                    let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")
                    ipcRenderer
                        .invoke("pathJoin", {
                            dir: absolutePath,
                            file: `${group}.${isFile ? "txt" : "csv"}`
                        })
                        .then((currentPath: string) => {
                            exportPathRef.current = currentPath
                            ipcRenderer.invoke(
                                isFile ? "ExportAllPayloadFromFile" : "ExportAllPayload",
                                {
                                    Group: group,
                                    Folder: folder,
                                    SavePath: currentPath
                                },
                                exportToken
                            )
                            setShowModal(true)
                        })
                } else {
                    setExportVisible(false)
                }
            })
    })
    // Cancel Export
    const cancelExportFile = useMemoizedFn(() => {
        ipcRenderer.invoke(isFile ? "cancel-ExportAllPayloadFromFile" : "cancel-ExportAllPayload", exportToken)
    })

    const onExportStreamData = useThrottleFn(
        (data) => {
            setExportStreamData({...exportStreamData, Progress: data.Progress})
        },
        {wait: 500}
    ).run

    // Monitor Export Task
    useEffect(() => {
        ipcRenderer.on(`${exportToken}-data`, async (e: any, data: GetAllPayloadFromFileResponse) => {
            if (data) {
                try {
                    onExportStreamData(data)
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${exportToken}-error`, (e: any, error: any) => {
            failed(`[ExportFile] error:  ${error}`)
        })
        ipcRenderer.on(`${exportToken}-end`, (e: any, data: any) => {
            info("[ExportFile] finished")
            setShowModal(false)
            setExportVisible(false)
            exportPathRef.current && openABSFileLocated(exportPathRef.current)
        })
        return () => {
            ipcRenderer.invoke(isFile ? "cancel-ExportAllPayloadFromFile" : "cancel-ExportAllPayload", exportToken)
            ipcRenderer.removeAllListeners(`${exportToken}-data`)
            ipcRenderer.removeAllListeners(`${exportToken}-error`)
            ipcRenderer.removeAllListeners(`${exportToken}-end`)
        }
    }, [])
    return (
        <YakitModal
            centered
            getContainer={document.getElementById("new-payload") || document.body}
            visible={showModal}
            title={null}
            footer={null}
            width={520}
            type='white'
            closable={false}
            hiddenHeader={true}
            bodyStyle={{padding: 0}}
        >
            <UploadStatusInfo
                title={"Exporting: Wait..."}
                streamData={exportStreamData}
                cancelRun={() => {
                    cancelExportFile()
                    setExportVisible(false)
                }}
                logInfo={[]}
                showDownloadDetail={false}
            />
        </YakitModal>
    )
}

export interface NewPayloadProps {}
export const NewPayload: React.FC<NewPayloadProps> = (props) => {
    // Expand All
    const [isExpand, setExpand] = useState<boolean>(false)
    const [showContentType, setContentType] = useState<"editor" | "table">()

    // table/Editor Filter
    const [selectItem, setSelectItem] = useState<string>()
    const [group, setGroup] = useState<string>("")
    const [folder, setFolder] = useState<string>("")

    const [codePath, setCodePath] = useState<string>("")

    const [data, setData] = useState<DataItem[]>([])

    // Close Payload
    const [isClosePayload,setClosePayload] = useState<boolean>(false)
    // First Enter
    const [isFirstEnter, setFirstEnter] = useState<boolean>(false)
    const NewPayloadFirstEnter = "NewPayloadFirstEnter"
    // DB Storage Token
    const [token, setToken] = useState(randomString(20))
    // First Import Progress
    const [visible, setVisible] = useState<boolean>(false)
    // show
    const [streamData, setStreamData] = useState<SavePayloadProgress>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<string[]>([])
    // First Page Request?
    const queryGroupRef = useRef<boolean>(true)

    // Check Order Change
    const cacheNodesRef = useRef<PayloadGroupNodeProps[]>([])

    const onQueryGroup = (obj?: {Group: string; Folder: string}) => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                cacheNodesRef.current = res.Nodes
                let newData: DataItem[] = nodesToDataFun(res.Nodes)
                setData(newData)
                if (obj) {
                    // Select
                    const {Group, Folder} = obj
                    // Is File by Id
                    const item = findItemByGroup(newData, Group)
                    if (item) {
                        setGroup(Group)
                        setFolder(Folder)
                        setContentType(item.type === "DataBase" ? "table" : "editor")
                        setSelectItem(item.id)
                    }
                }
                if (newData.length === 0) {
                    setExpand(true)
                } else {
                    if (queryGroupRef.current) {
                        // Select on First Enter
                        queryGroupRef.current = false
                        let obj: any = {}
                        // Open First File in Array
                        newData.forEach((item) => {
                            if (item.type === "Folder" && item.node) {
                                if (!obj?.Group) {
                                    obj.Folder = item.name
                                }
                                item.node.forEach((itemIn) => {
                                    if (!obj?.Group) {
                                        obj.Group = itemIn.name
                                        obj.ContentType = itemIn.type === "DataBase" ? "table" : "editor"
                                        obj.Id = itemIn.id
                                    }
                                })
                            } else {
                                if (item.type !== "Folder" && !obj?.Group) {
                                    obj.Folder = ""
                                    obj.Group = item.name
                                    obj.ContentType = item.type === "DataBase" ? "table" : "editor"
                                    obj.Id = item.id
                                }
                            }
                        })
                        if (obj.Group) {
                            setGroup(obj.Group)
                            setFolder(obj.Folder)
                            setContentType(obj.ContentType)
                            setSelectItem(obj.Id)
                        }
                    } else {
                        // Re-select if obj/group Not Found
                        if (!obj) {
                            // Is File by Id
                            const item = findItemByGroup(newData, group)
                            if (item === null) {
                                reset()
                            }
                        }
                        setExpand(false)
                    }
                }
            })
            .catch((e: any) => {
                failed(`Failed to Get Dictionary List：${e}`)
            })
            .finally()
    }

    useEffect(() => {
        ipcRenderer.invoke("fetch-code-path").then((path: string) => {
            ipcRenderer
                .invoke("is-exists-file", path)
                .then(() => {
                    setCodePath("")
                })
                .catch(() => {
                    setCodePath(path)
                })
        })
    }, [])

    useEffect(() => {
        ipcRenderer
            .invoke("YakVersionAtLeast", {
                AtLeastVersion: "v1.2.9-sp3",
                YakVersion: ""
            })
            .then((res: {Ok: boolean}) => {
                if (res.Ok) {
                    // On Page Enter
                    getRemoteValue(NewPayloadFirstEnter).then((res) => {
                        if (!res) {
                            setFirstEnter(true)
                        }
                    })
                } else {
                    setClosePayload(true)
                }
            })
            .catch((e)=>{
                setClosePayload(true)
            })
    }, [])

    const reset = useMemoizedFn(() => {
        setContentType(undefined)
        setSelectItem(undefined)
        setGroup("")
        setFolder("")
    })

    // Migrate Data
    const initNewPayload = useMemoizedFn(() => {
        ipcRenderer.invoke("MigratePayloads", {}, token)
        setFirstEnter(false)
        setVisible(true)
    })

    // Cancel Migrate
    const cancelMigratePayloads = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-MigratePayloads", token)
    })

    // Monitor Migrate Data
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: SavePayloadProgress) => {
            if (data) {
                try {
                    setStreamData(data)
                    if (data.Message.length > 0) {
                        logInfoRef.current = [data.Message, ...logInfoRef.current].slice(0, 8)
                    }
                } catch (error) {}
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[MigratePayloads] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[MigratePayloads] finished")
            logInfoRef.current = []
            setRemoteValue(NewPayloadFirstEnter, JSON.stringify({import: true}))
            onQueryGroup()
        })
        return () => {
            ipcRenderer.invoke("cancel-MigratePayloads", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    return (
        <div className={styles["new-payload"]} id='new-payload'>
            <div className={styles["payload-list-box"]} style={isExpand ? {width: 0, opacity: 0} : {}}>
                <NewPayloadList
                    data={data}
                    setData={setData}
                    cacheNodesRef={cacheNodesRef}
                    onQueryGroup={onQueryGroup}
                    setGroup={setGroup}
                    setFolder={setFolder}
                    setContentType={setContentType}
                    codePath={codePath}
                    selectItem={selectItem}
                    setSelectItem={setSelectItem}
                />
            </div>
            {data.length === 0 ? (
                <div className={styles["no-data"]}>
                    <YakitEmpty
                        title='No Payload Dict'
                        // description='Quick Access to Official/Built Dicts'
                        children={
                            <YakitButton
                                icon={<OutlineAddPayloadIcon />}
                                onClick={() => {
                                    const m = showYakitModal({
                                        getContainer: document.getElementById("new-payload") || document.body,
                                        title: null,
                                        footer: null,
                                        width: 520,
                                        type: "white",
                                        closable: false,
                                        maskClosable: false,
                                        hiddenHeader: true,
                                        content: (
                                            <CreateDictionaries
                                                title='New Dict'
                                                type='dictionaries'
                                                onQueryGroup={onQueryGroup}
                                                onClose={() => {
                                                    setExpand(true)
                                                    m.destroy()
                                                }}
                                            />
                                        )
                                    })
                                }}
                            >
                                New Dict
                            </YakitButton>
                        }
                    />
                </div>
            ) : (
                <>
                    {showContentType ? (
                        <PayloadContent
                            isExpand={isExpand}
                            setExpand={setExpand}
                            showContentType={showContentType}
                            group={group}
                            folder={folder}
                        />
                    ) : (
                        <div className={styles["no-data"]}>
                            <YakitEmpty title='Select Dict from List' />
                        </div>
                    )}
                </>
            )}
            <YakitHint
                visible={isFirstEnter}
                title='Migrate Data'
                content='This task does not contain non-English text for translation. Please provide the text you need translated.。'
                footer={
                    <div style={{marginTop: 24, textAlign: "right"}}>
                        <YakitButton size='max' onClick={initNewPayload}>
                            Confirm
                        </YakitButton>
                    </div>
                }
            />
            <YakitHint
                visible={isClosePayload}
                title='Engine Version Too Low'
                content='Engine Too Old for New Payload: Update Required'
                footer={
                    <div style={{marginTop: 24, textAlign: "right"}}>
                        <YakitButton size='max' onClick={()=>{
                            setClosePayload(false)
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.PayloadManager}))
                        }}>
                            Confirm
                        </YakitButton>
                    </div>
                }
            />
            <YakitModal
                centered
                getContainer={document.getElementById("new-payload") || document.body}
                visible={visible}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <UploadStatusInfo
                    title={"Migrate Data: Wait..."}
                    streamData={streamData}
                    cancelRun={() => {
                        cancelMigratePayloads()
                        setVisible(false)
                    }}
                    onClose={() => {
                        setVisible(false)
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                    autoClose={true}
                />
            </YakitModal>
        </div>
    )
}

export interface ReadOnlyNewPayloadProps {
    onClose: () => void
    selectorHandle: (v: string) => void
    Nodes: PayloadGroupNodeProps[]
}
export const ReadOnlyNewPayload: React.FC<ReadOnlyNewPayloadProps> = (props) => {
    const {selectorHandle, onClose, Nodes} = props
    const [showContentType, setContentType] = useState<"editor" | "table">()

    // table/Editor Filter
    const [selectItem, setSelectItem] = useState<string>()
    const [group, setGroup] = useState<string>("")
    const [folder, setFolder] = useState<string>("")

    const [codePath, setCodePath] = useState<string>("")

    const [data, setData] = useState<DataItem[]>([])
    // Check Order Change
    const cacheNodesRef = useRef<PayloadGroupNodeProps[]>([])

    // Get Once on Page Load
    const onQueryGroup = () => {
        cacheNodesRef.current = Nodes
        let newData: DataItem[] = nodesToDataFun(Nodes)
        setData(newData)
    }

    useEffect(() => {
        ipcRenderer.invoke("fetch-code-path").then((path: string) => {
            ipcRenderer
                .invoke("is-exists-file", path)
                .then(() => {
                    setCodePath("")
                })
                .catch(() => {
                    setCodePath(path)
                })
        })
    }, [])

    const selectInfo = useMemo(() => {
        return group.length > 0 ? group : folder
    }, [group, folder])

    return (
        <div
            style={{height: 720, borderRadius: 4, overflow: "hidden"}}
            className={classNames(styles["new-payload-only-insert"], styles["new-payload"])}
        >
            <div className={styles["payload-list-box"]}>
                <NewPayloadList
                    data={data}
                    setData={setData}
                    cacheNodesRef={cacheNodesRef}
                    onQueryGroup={onQueryGroup}
                    setGroup={setGroup}
                    setFolder={setFolder}
                    setContentType={setContentType}
                    codePath={codePath}
                    onlyInsert={true}
                    onClose={onClose}
                    selectItem={selectItem}
                    setSelectItem={setSelectItem}
                />
                <div className={styles["payload-list-bottom"]}>
                    <div className={styles["show"]}>
                        <div className={styles["text"]}>Selected：</div>
                        {selectInfo.length > 0 && <YakitTag color='info'>{selectInfo}</YakitTag>}
                    </div>
                    <div className={styles["option"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                onClose()
                            }}
                        >
                            Cancel
                        </YakitButton>
                        <YakitButton
                            disabled={group.length === 0 && folder.length === 0}
                            onClick={() => {
                                if (group.length === 0) {
                                    selectorHandle(`{{payload(${folder}/*)}}`)
                                } else {
                                    selectorHandle(`{{payload(${group})}}`)
                                }
                            }}
                        >
                            Insert
                        </YakitButton>
                    </div>
                </div>
            </div>

            {showContentType && group.length !== 0 ? (
                <PayloadContent
                    showContentType={showContentType}
                    group={group}
                    folder={folder}
                    onlyInsert={true}
                    onClose={onClose}
                />
            ) : (
                <div className={styles["no-data"]}>
                    <div
                        className={styles["close-btn"]}
                        onClick={() => {
                            onClose()
                        }}
                    >
                        <OutlineXIcon />
                    </div>
                    {folder.length !== 0 ? (
                        <div className={styles["select-folder"]}>
                            <div className={styles["icon"]}>
                                <PropertyNoAddIcon />
                            </div>
                            <div className={styles["title"]}>{selectInfo}</div>
                            <div className={styles["sub-title"]}>Support Insert for Fuzz</div>
                        </div>
                    ) : (
                        <YakitEmpty title='Select Dict/Folder to Insert' />
                    )}
                </div>
            )}
        </div>
    )
}
