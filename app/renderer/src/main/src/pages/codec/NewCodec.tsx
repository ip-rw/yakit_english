import React, {useEffect, useMemo, useRef, useState} from "react"
import {Divider, Tooltip, Upload} from "antd"
import {useGetState, useMemoizedFn, useThrottleFn, useUpdateEffect, useDebounceEffect, useSize} from "ahooks"
import styles from "./NewCodec.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDragsortIcon, SolidPlayIcon, SolidStarIcon} from "@/assets/icon/solid"
import {ExclamationIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {
    OutlineArrowBigUpIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineBanIcon,
    OutlineClockIcon,
    OutlineDocumentduplicateIcon,
    OutlineDotshorizontalIcon,
    OutlineImportIcon,
    OutlinePauseIcon,
    OutlinePlayIcon,
    OutlineSearchIcon,
    OutlineStarIcon,
    OutlineStorageIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {
    DragDropContext,
    Droppable,
    Draggable,
    BeforeCapture,
    DropResult,
    ResponderProvided,
    DragStart,
    DragUpdate,
    DraggableProvided
} from "@hello-pangea/dnd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {v4 as uuidv4} from "uuid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {NewCodecCheckUI, NewCodecEditor, NewCodecInputUI, NewCodecSelectUI, NewCodecTextAreaUI} from "./NewCodecUIStore"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {EnterOutlined} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {pluginTypeToName} from "../plugins/builtInData"
const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

const SaveCodecMethods = "SaveCodecMethods"

interface NewCodecRightEditorBoxProps {
    isExpand: boolean
    setExpand: (v: boolean) => void
    inputEditor: string
    outputEditorByte?: Uint8Array
    setInputEditor: (v: string) => void
    outputEditor: string
    runLoading: boolean
}
// Codec Right Editor
export const NewCodecRightEditorBox: React.FC<NewCodecRightEditorBoxProps> = (props) => {
    const {isExpand, setExpand, outputEditorByte, inputEditor, setInputEditor, outputEditor, runLoading} = props
    const [noInputWordwrap, setNoInputWordwrap] = useState<boolean>(false)
    const [noOutputWordwrap, setNoOutputWordwrap] = useState<boolean>(false)
    const [inputMenuOpen, setInputMenuOpen] = useState<boolean>(false)
    const [outputMenuOpen, setOutputMenuOpen] = useState<boolean>(false)
    const editorBoxRef = useRef<HTMLDivElement>(null)
    const uploadRef = useRef<HTMLDivElement>(null)
    const size = useSize(editorBoxRef)
    const Expand = () => (
        <div
            className={styles["expand-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )

    const judgeStringSize = useMemoizedFn((str: string) => {
        // Convert String to Bytes
        const bytes = new Blob([str]).size
        // Convert Bytes to KB
        const kilobytes = bytes / 1024
        // Truncate to 500KB if size > 500KB
        if (kilobytes > 500) {
            // Calculate Truncated Characters
            const charactersToKeep = Math.floor((500 * 1024) / 2) // 2 Bytes per Character
            // Substring
            const truncatedString = str.substring(0, charactersToKeep)
            return {
                hidden: true,
                value: truncatedString
            }
        } else {
            // Return Original String if Size <= 500KB
            return {
                hidden: false,
                value: str
            }
        }
    })

    const inputObj = useMemo(() => {
        return judgeStringSize(inputEditor)
    }, [inputEditor])

    const outPutObj = useMemo(() => {
        return judgeStringSize(outputEditor)
    }, [outputEditor])

    // Import
    const onImport = useMemoizedFn((path: string) => {
        ipcRenderer
            .invoke("importCodecByPath", path)
            .then((r: string) => {
                setInputEditor(r)
            })
            .catch((e) => {
                failed(`import Codec failed ${e}`)
            })
            .finally(() => {})
    })

    // Clear
    const onClear = useMemoizedFn(() => {
        setInputEditor("")
    })

    // Save
    const onSave = useMemoizedFn(() => {
        if (!outputEditorByte) {
            warn("No Saved Content")
            return
        }
        ipcRenderer
            .invoke("openDialog", {
                title: "Choose Folder",
                properties: ["openDirectory"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\")).join(",")
                    ipcRenderer
                        .invoke("SaveCodecOutputToTxt", {
                            data: Buffer.from(outputEditorByte),
                            outputDir: absolutePath,
                            fileName: `Output-${new Date().getTime()}.txt`
                        })
                        .then((r) => {
                            if (r?.ok) {
                                success("Save Successful")
                                r?.outputDir && openABSFileLocated(r.outputDir)
                            }
                        })
                        .catch((e) => {
                            failed(`Save Codec failed ${e}`)
                        })
                        .finally(() => {})
                }
            })
    })

    // Replace
    const onReplace = useMemoizedFn(() => {
        setInputEditor(outputEditor)
    })

    // Copy
    const onCopy = useMemoizedFn(() => {
        ipcRenderer.invoke("set-copy-clipboard", outputEditor)
        success("Copy Success")
    })

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }

    const inputMenuData = useMemo(() => {
        return [
            {
                key: "import",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineImportIcon />
                        <div className={styles["menu-name"]}>Import</div>
                    </div>
                )
            },
            {
                key: "wordwrap",
                label: (
                    <div className={classNames(styles["extra-menu"], styles["menu-menu-size"])}>
                        <EnterOutlined />
                        <div className={styles["menu-name"]}>{noInputWordwrap ? "Word Wrap" : "No Wrap"}</div>
                    </div>
                )
            }
        ]
    }, [noInputWordwrap])

    const outputMenuData = useMemo(() => {
        return [
            {
                key: "save",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineStorageIcon />
                        <div className={styles["menu-name"]}>Save</div>
                    </div>
                )
            },
            {
                key: "replace",
                label: (
                    <div className={classNames(styles["extra-menu"], styles["menu-menu-stroke"])}>
                        <OutlineArrowBigUpIcon />
                        <div className={styles["menu-name"]}>Replace Output with Input</div>
                    </div>
                )
            },
            {
                key: "copy",
                label: (
                    <div className={styles["extra-menu"]}>
                        <OutlineDocumentduplicateIcon />
                        <div className={styles["menu-name"]}>Copy</div>
                    </div>
                )
            },
            {
                key: "wordwrap",
                label: (
                    <div className={classNames(styles["extra-menu"], styles["menu-menu-size"])}>
                        <EnterOutlined />
                        <div className={styles["menu-name"]}>{noOutputWordwrap ? "Word Wrap" : "No Wrap"}</div>
                    </div>
                )
            }
        ]
    }, [noOutputWordwrap])

    return (
        <div className={styles["new-codec-editor-box"]} ref={editorBoxRef}>
            <YakitResizeBox
                isVer={true}
                isShowDefaultLineStyle={false}
                lineDirection='bottom'
                lineStyle={{backgroundColor: "#f0f1f3", height: 4}}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={
                    <div className={classNames(styles["input-box"], styles["editor-box"])}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>
                                <span className={styles["text"]}>Input</span>
                                {inputObj.hidden && (
                                    <Tooltip title={size && size.width > 450 ? null : "Super Large Input"}>
                                        <YakitTag style={{marginLeft: 8}} color='danger'>
                                            <div className={styles["tag-box"]}>
                                                <ExclamationIcon className={styles["icon-style"]} />
                                                {size && size.width > 450 && <span>Super Large Input</span>}
                                            </div>
                                        </YakitTag>
                                    </Tooltip>
                                )}
                            </div>
                            <div className={styles["extra"]}>
                                <Tooltip title={"Import"}>
                                    <Upload
                                        className={classNames(styles["upload-box"], {
                                            [styles["upload-box-hidden"]]: size && size.width <= 300
                                        })}
                                        accept={"text/plain"}
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f) => {
                                            const file_name = f.name
                                            const suffix = suffixFun(file_name)
                                            if (![".txt"].includes(suffix)) {
                                                warn("Invalid file format, please re-import")
                                                return false
                                            }
                                            // @ts-ignore
                                            const path: string = f?.path || ""
                                            if (path.length > 0) {
                                                onImport(path)
                                            }
                                            return false
                                        }}
                                    >
                                        <div className={styles["extra-icon"]} ref={uploadRef}>
                                            <OutlineImportIcon />
                                        </div>
                                    </Upload>
                                </Tooltip>
                                {size && size.width > 300 && (
                                    <Tooltip title={"No Wrap"}>
                                        <YakitButton
                                            size={"small"}
                                            type={noInputWordwrap ? "text" : "primary"}
                                            icon={<EnterOutlined />}
                                            onClick={() => {
                                                setNoInputWordwrap(!noInputWordwrap)
                                            }}
                                        />
                                    </Tooltip>
                                )}

                                {size && size.width <= 300 && (
                                    <YakitDropdownMenu
                                        menu={{
                                            data: inputMenuData as YakitMenuItemProps[],
                                            onClick: ({key}) => {
                                                setInputMenuOpen(false)
                                                switch (key) {
                                                    case "import":
                                                        uploadRef.current && uploadRef.current.click()
                                                        break
                                                    case "wordwrap":
                                                        setNoInputWordwrap(!noInputWordwrap)
                                                        break
                                                    default:
                                                        break
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            overlayClassName: styles["codec-input-menu"],
                                            trigger: ["click"],
                                            placement: "bottomRight",
                                            onVisibleChange: (v) => {
                                                setInputMenuOpen(v)
                                            },
                                            visible: inputMenuOpen
                                        }}
                                    >
                                        <div className={styles["extra-icon"]}>
                                            <OutlineDotshorizontalIcon />
                                        </div>
                                    </YakitDropdownMenu>
                                )}
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                <div className={styles["clear"]} onClick={onClear}>
                                    Clear
                                </div>
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakitEditor
                                type='plaintext'
                                value={inputObj.value}
                                setValue={(content: string) => {
                                    setInputEditor(content)
                                }}
                                noWordWrap={noInputWordwrap}
                                // loading={loading}
                            />
                        </div>
                    </div>
                }
                secondNode={
                    <div className={classNames(styles["output-box"], styles["editor-box"])}>
                        <YakitSpin spinning={runLoading}>
                            <div className={styles["header"]}>
                                <div className={styles["title"]}>
                                    <span className={styles["text"]}>Output</span>
                                    {outPutObj.hidden && (
                                        <Tooltip
                                            title={size && size.width > 450 ? null : "Super Large Output, click save to download"}
                                        >
                                            <YakitTag style={{marginLeft: 8}} color='danger'>
                                                <div className={styles["tag-box"]}>
                                                    <ExclamationIcon className={styles["icon-style"]} />
                                                    {size && size.width > 450 && (
                                                        <span>Super Large Output, click save to download</span>
                                                    )}
                                                </div>
                                            </YakitTag>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className={styles["extra"]}>
                                    {size && size.width > 300 ? (
                                        <>
                                            <Tooltip title={"Save"}>
                                                <div className={styles["extra-icon"]} onClick={onSave}>
                                                    <OutlineStorageIcon />
                                                </div>
                                            </Tooltip>
                                            <Tooltip title={"Replace Output with Input"}>
                                                <div className={styles["extra-icon"]} onClick={onReplace}>
                                                    <OutlineArrowBigUpIcon />
                                                </div>
                                            </Tooltip>
                                            <Tooltip title={"Copy"}>
                                                <div className={styles["extra-icon"]} onClick={onCopy}>
                                                    <OutlineDocumentduplicateIcon />
                                                </div>
                                            </Tooltip>
                                            <Tooltip title={"No Wrap"}>
                                                <YakitButton
                                                    size={"small"}
                                                    type={noOutputWordwrap ? "text" : "primary"}
                                                    icon={<EnterOutlined />}
                                                    onClick={() => {
                                                        setNoOutputWordwrap(!noOutputWordwrap)
                                                    }}
                                                />
                                            </Tooltip>
                                        </>
                                    ) : (
                                        <YakitDropdownMenu
                                            menu={{
                                                data: outputMenuData as YakitMenuItemProps[],
                                                onClick: ({key}) => {
                                                    setOutputMenuOpen(false)
                                                    switch (key) {
                                                        case "save":
                                                            onSave()
                                                            break
                                                        case "replace":
                                                            onReplace()
                                                            break
                                                        case "copy":
                                                            onCopy()
                                                            break
                                                        case "wordwrap":
                                                            setNoOutputWordwrap(!noOutputWordwrap)
                                                            break
                                                        default:
                                                            break
                                                    }
                                                }
                                            }}
                                            dropdown={{
                                                overlayClassName: styles["codec-output-menu"],
                                                trigger: ["click"],
                                                placement: "bottomRight",
                                                onVisibleChange: (v) => {
                                                    setOutputMenuOpen(v)
                                                },
                                                visible: outputMenuOpen
                                            }}
                                        >
                                            <div className={styles["extra-icon"]}>
                                                <OutlineDotshorizontalIcon />
                                            </div>
                                        </YakitDropdownMenu>
                                    )}

                                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                    {Expand()}
                                </div>
                            </div>
                            <div className={styles["editor"]}>
                                <YakitEditor
                                    readOnly={true}
                                    type='plaintext'
                                    value={outPutObj.value}
                                    noWordWrap={noOutputWordwrap}
                                    // loading={loading}
                                />
                            </div>
                        </YakitSpin>
                    </div>
                }
            />
        </div>
    )
}

interface ValueByUIProps {
    index: number
    type: string
    val: any
}

interface NewCodecMiddleTypeItemProps {
    data: RightItemsProps
    outerKey: string
    rightItems: RightItemsProps[]
    setRightItems: (v: RightItemsProps[]) => void
    provided: DraggableProvided
}

export const NewCodecMiddleTypeItem: React.FC<NewCodecMiddleTypeItemProps> = (props) => {
    const {data, outerKey, rightItems, setRightItems, provided} = props

    const {title, node} = data
    const [itemStatus, setItemStatus] = useState<"run" | "suspend" | "shield">()

    useEffect(() => {
        const itemArr = rightItems.filter((item) => item.key === outerKey)
        if (itemArr.length > 0) {
            setItemStatus(itemArr[0].status || "run")
        }
    }, [rightItems, outerKey])
    // Block
    const onShieldFun = useMemoizedFn(() => {
        const newRightItems = rightItems.map((item) => {
            if (item.key === outerKey) {
                item.status = itemStatus === "shield" ? "run" : "shield"
                return item
            }
            return item
        })
        setRightItems(newRightItems)
    })

    // Abort
    const onSuspendFun = useMemoizedFn(() => {
        const newRightItems = rightItems.map((item) => {
            if (item.key === outerKey) {
                item.status = itemStatus === "suspend" ? "run" : "suspend"
                return item
            }
            return item
        })
        setRightItems(newRightItems)
    })

    // Delete
    const onDeleteFun = useMemoizedFn(() => {
        const newRightItems = rightItems.filter((item) => item.key !== outerKey)
        setRightItems(newRightItems)
    })

    // Change Control Value
    const setValueByUI = useMemoizedFn((obj: ValueByUIProps) => {
        const {val, index, type} = obj
        const itemArr = rightItems.filter((item) => item.key === outerKey)
        const newNode = itemArr[0]?.node
        if (Array.isArray(newNode)) {
            if (newNode[index].type !== "flex") {
                if (newNode[index].type === "inputSelect") {
                    // Combined Control - Input/Select
                    const initNode = newNode as RightItemsTypeProps[]
                    initNode[index][type].value = val
                    const newRightItems = rightItems.map((item) => {
                        if (item.key === outerKey) {
                            item.node = initNode
                            return item
                        }
                        return item
                    })
                    setRightItems(newRightItems)
                } else {
                    const initNode = newNode as RightItemsTypeNoUniteProps[]
                    initNode[index].value = val
                    const newRightItems = rightItems.map((item) => {
                        if (item.key === outerKey) {
                            item.node = initNode
                            return item
                        }
                        return item
                    })
                    setRightItems(newRightItems)
                }
            }
        }
    })

    // Control
    const onShowUI = useMemoizedFn((item: RightItemsTypeProps, index: number, direction?: "left" | "right") => {
        const params = {
            index,
            type: item.type
        }
        switch (item.type) {
            case "input":
                // Input Module
                return (
                    <NewCodecInputUI
                        title={item.title}
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        defaultValue={item.defaultValue}
                        value={item.value}
                        onChange={(e) => setValueByUI({...params, val: e.target.value})}
                        direction={direction}
                    />
                )
            case "text":
                // Textarea Module
                return (
                    <NewCodecTextAreaUI
                        title={item.title}
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        defaultValue={item.defaultValue}
                        value={item.value}
                        onChange={(e) => setValueByUI({...params, val: e.target.value})}
                    />
                )
            case "checkbox":
                // Checkbox Module
                return (
                    <NewCodecCheckUI
                        disabled={itemStatus === "shield" || item.disabled}
                        options={item.checkArr}
                        value={item.value}
                        onChange={(checkedValues: CheckboxValueType[]) => setValueByUI({...params, val: checkedValues})}
                    />
                )
            case "select":
                // Dropdown Module
                return (
                    <NewCodecSelectUI
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        title={item.title}
                        showSearch={item.showSearch}
                        options={item.selectArr}
                        value={item.value}
                        isPlugin={item.isPlugin}
                        onSelect={(val) => setValueByUI({...params, val})}
                        directionBox={direction}
                    />
                )
            case "editor":
                // Editor Module
                return (
                    <NewCodecEditor
                        disabled={itemStatus === "shield" || item.disabled}
                        title={item.title}
                        require={item.require}
                        value={item.value}
                        onChange={(val) => setValueByUI({...params, val})}
                    />
                )
            default:
                return <></>
        }
    })
    return (
        <div
            className={classNames(styles["new-codec-middle-type-item"], {
                // Run
                [styles["type-item-run"]]: itemStatus === "run",
                // Abort
                [styles["type-item-suspend"]]: itemStatus === "suspend",
                // Block
                [styles["type-item-shield"]]: itemStatus === "shield"
            })}
        >
            <div className={styles["type-header"]} {...provided.dragHandleProps}>
                <div className={styles["type-title"]}>
                    <div className={styles["drag-icon"]}>
                        <SolidDragsortIcon />
                    </div>
                    <div
                        className={classNames(styles["text"], {
                            [styles["text-default"]]: itemStatus !== "shield",
                            [styles["text-active"]]: itemStatus === "shield"
                        })}
                    >
                        {title}
                    </div>
                </div>
                <div className={styles["type-extra"]}>
                    <Tooltip title={itemStatus !== "shield" ? "Disable" : "Enable"}>
                        <div
                            className={classNames(styles["extra-icon"], {
                                [styles["extra-icon-default"]]: itemStatus !== "shield",
                                [styles["extra-icon-active"]]: itemStatus === "shield"
                            })}
                            onClick={onShieldFun}
                        >
                            <OutlineBanIcon />
                        </div>
                    </Tooltip>
                    <Tooltip title={itemStatus !== "suspend" ? "Enable Breakpoints" : "Disable Breakpoints"}>
                        <div
                            className={classNames(styles["extra-icon"], {
                                [styles["extra-icon-default"]]: itemStatus !== "suspend",
                                [styles["extra-icon-active"]]: itemStatus === "suspend"
                            })}
                            onClick={onSuspendFun}
                        >
                            {itemStatus !== "suspend" ? <OutlinePauseIcon /> : <OutlinePlayIcon />}
                        </div>
                    </Tooltip>
                    <div className={styles["close-icon"]} onClick={onDeleteFun}>
                        <OutlineXIcon />
                    </div>
                </div>
            </div>
            {node?.map((item, index) => {
                switch (item.type) {
                    case "flex":
                        // Left-Right Layout
                        return (
                            <div
                                style={{display: "flex", flexDirection: "row", gap: 8, marginTop: 8}}
                                key={`${data.key}-${index}`}
                            >
                                <div style={{flex: item.leftFlex || 3}}>
                                    {/* Left */}
                                    {onShowUI(item.leftNode, index)}
                                </div>
                                <div style={{flex: item.rightFlex || 2}}>
                                    {/* Right */}
                                    {onShowUI(item.rightNode, index)}
                                </div>
                            </div>
                        )
                    case "inputSelect":
                        return (
                            <div
                                style={{display: "flex", flexDirection: "row", marginTop: 8}}
                                key={`${data.key}-${index}`}
                            >
                                <div style={{flex: 3}}>
                                    {/* Left */}
                                    {onShowUI(item.input, index, "left")}
                                </div>
                                <div style={{flex: 2, borderLeft: "1px solid #EAECF3"}}>
                                    {/* Right */}
                                    {onShowUI(item.select, index, "right")}
                                </div>
                            </div>
                        )
                    case "checkbox":
                        return (
                            <div
                                key={`${data.key}-${index}`}
                                style={{display: "inline-block", marginTop: 8, marginRight: 8}}
                            >
                                {onShowUI(item, index)}
                            </div>
                        )
                    default:
                        return (
                            <div key={`${data.key}-${index}`} style={{marginTop: 8}}>
                                {onShowUI(item, index)}
                            </div>
                        )
                }
            })}
        </div>
    )
}

interface CodecRunListHistoryStoreProps {
    popoverVisible: boolean
    setPopoverVisible: (v: boolean) => void
    onSelect: (v: SaveObjProps) => void
}
const CodecRunListHistory = "CodecRunListHistory"
export const CodecRunListHistoryStore: React.FC<CodecRunListHistoryStoreProps> = React.memo((props) => {
    const {popoverVisible, setPopoverVisible, onSelect} = props
    const [mitmSaveData, setMitmSaveData] = useState<SaveObjProps[]>([])
    useEffect(() => {
        onMitmSaveFilter()
    }, [popoverVisible])
    const onMitmSaveFilter = useMemoizedFn(() => {
        getRemoteValue(CodecRunListHistory).then((data) => {
            if (!data) {
                setMitmSaveData([])
                return
            }
            try {
                const cacheData: SaveObjProps[] = JSON.parse(data)
                setMitmSaveData(cacheData)
            } catch (error) {}
        })
    })

    const removeItem = useMemoizedFn((historyName: string) => {
        setMitmSaveData((mitmSaveData) => mitmSaveData.filter((item) => item.historyName !== historyName))
    })

    useUpdateEffect(() => {
        setRemoteValue(CodecRunListHistory, JSON.stringify(mitmSaveData))
    }, [mitmSaveData])

    const onSelectItem = useMemoizedFn((item: SaveObjProps) => {
        onSelect(item)
        setPopoverVisible(false)
    })
    return (
        <div className={styles["codec-run-list-history-store"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>History Store</div>
                {mitmSaveData.length !== 0 && (
                    <YakitButton
                        type='text'
                        colors='danger'
                        onClick={() => {
                            setMitmSaveData([])
                        }}
                    >
                        Clear
                    </YakitButton>
                )}
            </div>

            {mitmSaveData.length > 0 ? (
                <div className={styles["list"]}>
                    {mitmSaveData.map((item, index) => (
                        <div
                            key={item.historyName}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-border"]]: index !== mitmSaveData.length - 1,
                                [styles["list-item-border-top"]]: index === 0
                            })}
                            onClick={() => {
                                onSelectItem(item)
                            }}
                        >
                            <div className={styles["name"]}>{item.historyName}</div>
                            <div
                                className={styles["opt"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeItem(item.historyName)
                                }}
                            >
                                <OutlineTrashIcon />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={classNames(styles["no-data"])}>No Data Available</div>
            )}
        </div>
    )
})

interface SaveObjProps {
    historyName: string
    rightItems: RightItemsProps[]
}

interface NewCodecMiddleRunListProps {
    id: string
    fold: boolean
    setFold: (v: boolean) => void
    rightItems: RightItemsProps[]
    setRightItems: (v: RightItemsProps[]) => void
    inputEditor: string
    setOutputEditor: (v: string) => void
    setOutputEditorByte: (v: Uint8Array) => void
    isClickToRunList: React.MutableRefObject<boolean>
    setRunLoading: (v: boolean) => void
}

interface CheckFailProps {
    key: string
    index: number
    message: string
}

interface CodecWorkProps {
    CodecType: string
    Params: {Key: string; Value: any}[]
}

const getMiddleItemStyle = (isDragging, draggableStyle) => {
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

const CodecAutoRun = "CodecAutoRun"
// Codec Middle Executable List
export const NewCodecMiddleRunList: React.FC<NewCodecMiddleRunListProps> = (props) => {
    const {
        id,
        fold,
        setFold,
        rightItems,
        setRightItems,
        inputEditor,
        setOutputEditor,
        setOutputEditorByte,
        isClickToRunList,
        setRunLoading
    } = props

    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
    const [_, setFilterName, getFilterName] = useGetState<string>("")
    // Auto-Run
    const [autoRun, setAutoRun] = useState<boolean>(false)
    useDebounceEffect(
        () => {
            if (autoRun && rightItems.length > 0 && inputEditor.length > 0) {
                runCodec()
            }
        },
        [autoRun, rightItems, inputEditor],
        {leading: true, wait: 500}
    )
    useEffect(() => {
        getRemoteValue(CodecAutoRun).then((data) => {
            if (data) {
                try {
                    const {autoRun} = JSON.parse(data)
                    setAutoRun(autoRun)
                } catch (error) {}
            }
        })
    }, [])
    useUpdateEffect(() => {
        // Cache Selected Options
        setRemoteValue(
            CodecAutoRun,
            JSON.stringify({
                autoRun
            })
        )
    }, [autoRun])

    // Check for Scrollbar
    const isScrollbar = useMemoizedFn((element: HTMLElement) => {
        return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
    })
    useUpdateEffect(() => {
        const runScrollToRef = document.getElementById(`codec-middle-run-scroll-${id}`)
        if (runScrollToRef && isClickToRunList.current) {
            isClickToRunList.current = false
            if (isScrollbar(runScrollToRef)) {
                // Scrollbar Reached Bottom
                runScrollToRef.scrollTop = runScrollToRef.scrollHeight - runScrollToRef.clientHeight - 16
            }
        }
    }, [rightItems, isClickToRunList])

    // History Options
    const onMenuSelect = useMemoizedFn((v: SaveObjProps) => {
        setRightItems(v.rightItems)
    })

    // Save to History
    const onSaveCodecRunListHistory = useMemoizedFn(() => {
        if (rightItems.length === 0) {
            warn("Drag Codec Tool from Left List to Use")
            return
        }
        const m = showYakitModal({
            title: "Save Codec Order",
            content: (
                <div className={styles["codec-save-modal"]}>
                    <YakitInput.TextArea
                        placeholder='Name your codec order...'
                        showCount
                        maxLength={50}
                        onChange={(e) => {
                            setFilterName(e.target.value)
                        }}
                    />
                    <div className={styles["btn-box"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setFilterName("")
                                m.destroy()
                            }}
                        >
                            Cancel
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            onClick={() => {
                                if (getFilterName().length === 0) {
                                    warn("Please Enter Name")
                                    return
                                }
                                const saveObj: SaveObjProps = {
                                    historyName: getFilterName(),
                                    rightItems
                                }
                                getRemoteValue(CodecRunListHistory).then((data) => {
                                    if (!data) {
                                        setRemoteValue(CodecRunListHistory, JSON.stringify([saveObj]))
                                        info("Save Successful")
                                        m.destroy()
                                        return
                                    }
                                    try {
                                        const cacheData: SaveObjProps[] = JSON.parse(data)
                                        if (
                                            cacheData.filter((item) => item.historyName === getFilterName()).length > 0
                                        ) {
                                            warn("Duplicate Name")
                                        } else {
                                            setRemoteValue(CodecRunListHistory, JSON.stringify([saveObj, ...cacheData]))
                                            info("Save Successful")
                                            m.destroy()
                                        }
                                    } catch (error) {}
                                })
                            }}
                        >
                            Save
                        </YakitButton>
                    </div>
                </div>
            ),
            onCancel: () => {
                setFilterName("")
                m.destroy()
            },
            footer: null,
            width: 400
        })
    })

    // Execute Function
    const runCodecFun = useMemoizedFn((runItems: RightItemsProps[]) => {
        let newCodecParams: {Text: string; WorkFlow: CodecWorkProps[]} = {
            Text: inputEditor,
            WorkFlow: []
        }
        runItems.forEach((item) => {
            let obj: CodecWorkProps = {
                CodecType: item.codecType,
                Params: []
            }
            if (Array.isArray(item.node)) {
                const node = item.node as RightItemsTypeProps[]
                node.forEach((itemIn) => {
                    if (itemIn.type === "inputSelect") {
                        const {input,select} = itemIn
                        obj.Params.push({
                            Key: input.name,
                            Value: input.value||""
                        })
                        obj.Params.push({
                            Key: select.name,
                            Value: select.value||""
                        })
                        
                    } else if (itemIn.type === "checkbox") {
                        const {name, value = []} = itemIn
                        obj.Params.push({
                            Key: name,
                            Value: value.includes(name)
                        })
                    } else {
                        const {name, value = ""} = itemIn
                        obj.Params.push({
                            Key: name,
                            Value: value
                        })
                    }
                })
            }
            newCodecParams.WorkFlow.push(obj)
        })
        setRunLoading(true)
        // console.log("newCodecParams---",newCodecParams);
        
        ipcRenderer
            .invoke("NewCodec", newCodecParams)
            .then((data: {Result: string; RawResult: Uint8Array}) => {
                // Change Output after Execution
                setOutputEditorByte(data.RawResult)
                setOutputEditor(data.Result)
            })
            .catch((e) => {
                failed(`newCodec failed ${e}`)
            })
            .finally(() => {
                setRunLoading(false)
            })
    })

    // Execute Validation
    const runCodec = useMemoizedFn(() => {
        // Filter Skipped Items
        const rightItemsSkip = rightItems.filter((item) => item.status !== "shield")
        // Get Abort Item and Items Before
        const rightItemsStop: RightItemsProps[] = []
        rightItemsSkip.some((item) => {
            rightItemsStop.push(item)
            return item.status === "suspend"
        })
        // Validation Failure Items
        const checkFail: CheckFailProps[] = []
        // Validate Conditionally (e.g., Required)/Regex)
        rightItemsStop.forEach((item) => {
            const {key, title} = item
            if (Array.isArray(item.node)) {
                item.node.forEach((itemIn, indexIn) => {
                    if (itemIn.type === "input" || itemIn.type === "text") {
                        const rightItem = itemIn as RightItemsInputProps
                        const {require, value, regex} = rightItem
                        // Check if required
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:Required Field`
                            })
                        }
                        // Validate Regex
                        if (regex && value) {
                            const regexp = new RegExp(regex)
                            if (!regexp.test(value)) {
                                checkFail.push({
                                    key,
                                    index: indexIn,
                                    message: `${title}-${rightItem.title}-${regexp}:Validation Failed`
                                })
                            }
                        }
                    } else if (itemIn.type === "checkbox") {
                        // Checkboxes as false if unchecked, no validation needed
                    } else if (itemIn.type === "select") {
                        const rightItem = itemIn as RightItemsSelectProps
                        const {require, value} = rightItem
                        // Check if required
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:Required Field`
                            })
                        }
                    } else if (itemIn.type === "editor") {
                        const rightItem = itemIn as RightItemsEditorProps
                        const {require, value} = rightItem
                        // Check if required
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:Required Field`
                            })
                        }
                    } 
                    else if(itemIn.type === "inputSelect"){
                        const rightItem = itemIn as RightItemsInputSelectProps
                        const inputItem = rightItem.input
                        const selectItem = rightItem.select
                        const {require, value, regex} = inputItem
                        // Validate Input Required
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${inputItem.title}:Required Field`
                            })
                        }
                        // Validate Input Regex
                        if (regex && value) {
                            const regexp = new RegExp(regex)
                            if (!regexp.test(value)) {
                                checkFail.push({
                                    key,
                                    index: indexIn,
                                    message: `${title}-${inputItem.title}-${regexp}:Validation Failed`
                                })
                            }
                        }
                        // Validate Select Required
                        if (selectItem.require && !selectItem.value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${selectItem.title}:Required Field`
                            })
                        }
                    }
                    else if (itemIn.type === "flex") {
                        // Reserved for Layout
                    }
                })
            }
        })
        if (checkFail.length > 0) {
            // Notice
            warn(checkFail[0].message)
        } else {
            // Execute Function
            runCodecFun(rightItemsStop)
        }
    })

    // Clear
    const onClear = useMemoizedFn(() => {
        setRightItems([])
    })

    return (
        <div className={styles["new-codec-run-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    {!fold && (
                        <Tooltip placement='right' title='Expand Codec Category'>
                            <SideBarOpenIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setFold(true)
                                }}
                            />
                        </Tooltip>
                    )}
                    <span>Codec Order</span>
                    <span className={styles["count"]}>{rightItems.length}</span>
                </div>
                <div className={styles["extra"]}>
                    <Tooltip title={"Save"}>
                        <div className={styles["extra-icon"]} onClick={onSaveCodecRunListHistory}>
                            <OutlineStorageIcon />
                        </div>
                    </Tooltip>
                    <YakitPopover
                        overlayClassName={styles["http-history-table-drop-down-popover"]}
                        content={
                            <CodecRunListHistoryStore
                                onSelect={(v) => onMenuSelect(v)}
                                popoverVisible={popoverVisible}
                                setPopoverVisible={setPopoverVisible}
                            />
                        }
                        trigger='click'
                        placement='bottomRight'
                        onVisibleChange={setPopoverVisible}
                        visible={popoverVisible}
                    >
                        <Tooltip title={"History Store"}>
                            <div className={styles["extra-icon"]}>
                                <OutlineClockIcon />
                            </div>
                        </Tooltip>
                    </YakitPopover>
                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                    <div className={styles["clear"]} onClick={onClear}>
                        Clear
                    </div>
                </div>
            </div>
            <div className={styles["run-list"]}>
                {/* Drop Target on Right */}
                <Droppable droppableId='right' direction='vertical'>
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            id={`codec-middle-run-scroll-${id}`}
                            {...provided.droppableProps}
                            style={
                                rightItems.length > 0
                                    ? {height: "100%", overflow: "auto"}
                                    : {height: "100%", overflow: "hidden"}
                            }
                        >
                            {rightItems.length > 0 ? (
                                <>
                                    {rightItems.map((item, index) => (
                                        <Draggable
                                            key={`run-${item.key}`}
                                            draggableId={`run-${item.key}`}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...getMiddleItemStyle(
                                                            snapshot.isDragging,
                                                            provided.draggableProps.style
                                                        )
                                                    }}
                                                >
                                                    <NewCodecMiddleTypeItem
                                                        key={`run-${item.key}`}
                                                        data={item}
                                                        outerKey={item.key}
                                                        rightItems={rightItems}
                                                        setRightItems={setRightItems}
                                                        provided={provided}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    <div style={{height: 16}}></div>
                                </>
                            ) : (
                                <div className={styles["no-data"]}>
                                    <YakitEmpty title='Drag Codec Tool from Left List to Use' />
                                </div>
                            )}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
            <div className={styles["run-box"]}>
                <YakitCheckbox
                    disabled={rightItems.length === 0 || inputEditor.length === 0}
                    checked={autoRun}
                    onChange={(e) => setAutoRun(e.target.checked)}
                >
                    Auto-Execute
                </YakitCheckbox>
                <YakitButton
                    disabled={rightItems.length === 0 || inputEditor.length === 0}
                    size='max'
                    className={styles["run-box-btn"]}
                    icon={<SolidPlayIcon />}
                    onClick={runCodec}
                >
                    Execute Now
                </YakitButton>
            </div>
        </div>
    )
}

interface NewCodecLeftDragListItemProps {
    node: CodecMethod[]
    collectList: string[]
    getCollectData: (v: string[]) => void
    onClickToRunList: (v: CodecMethod) => void
    parentItem?: LeftDataProps
}

let lastIsDragging = false
const getLeftItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // Regex Match two args in translate function
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            lastIsDragging = true
            // Extract & Convert Two Values to Numbers
            const [value1, value2] = match.slice(1).map(Number)
            // Check if Value < 0
            if (value1 < 0) {
                // Set Value to 0
                const modifiedString = transform.replace(
                    /translate\((-?\d+)px, (-?\d+)px\)/,
                    `translate(0px, ${value2}px)`
                )
                transform = modifiedString
            }
        } else {
            if (!lastIsDragging) {
                // Handle Drag-Drop Style Overflow）
                transform = `translate(0px, 0px)`
            }
        }
    } else {
        lastIsDragging = false
    }
    return {
        ...draggableStyle,
        transform
    }
}

// Drag Source on Left
export const NewCodecLeftDragListItem: React.FC<NewCodecLeftDragListItemProps> = (props) => {
    const {node, collectList, parentItem, getCollectData, onClickToRunList} = props

    const dragListItemDom = useMemoizedFn((item: CodecMethod) => (
        <YakitPopover
            // visible={true}
            placement='right'
            overlayClassName={styles["drag-list-item-popover"]}
            content={
                <div className={styles["popover-content"]}>
                    <div className={styles["title"]}>{item.CodecName}</div>
                    <div className={styles["content"]}>{item.Desc}</div>
                </div>
            }
        >
            <div className={styles["drag-list-item"]} onClick={() => onClickToRunList(item)}>
                <div className={styles["title"]}>
                    <div className={styles["drag-icon"]}>
                        <SolidDragsortIcon />
                    </div>
                    <span className={styles["text"]}>{item.CodecName}</span>
                </div>
                <div className={styles["extra"]}>
                    {collectList.includes(item.CodecName) ? (
                        <div
                            className={classNames(styles["star-icon"], styles["star-icon-active"])}
                            onClick={(e) => {
                                e.stopPropagation()
                                const list = collectList.filter((itemIn) => itemIn !== item.CodecName)
                                getCollectData(list)
                                setRemoteValue(SaveCodecMethods, JSON.stringify(list))
                            }}
                        >
                            <SolidStarIcon />
                        </div>
                    ) : (
                        <div
                            className={classNames(styles["star-icon"], styles["star-icon-default"])}
                            onClick={(e) => {
                                e.stopPropagation()
                                getCollectData([...collectList, item.CodecName])
                                setRemoteValue(SaveCodecMethods, JSON.stringify([...collectList, item.CodecName]))
                            }}
                        >
                            <OutlineStarIcon />
                        </div>
                    )}
                </div>
            </div>
        </YakitPopover>
    ))

    return (
        <Droppable
            droppableId='left'
            direction='vertical'
            isDropDisabled={true}
            renderClone={(provided, snapshot, rubric) => {
                const item: CodecMethod[] =
                    node.filter(
                        (item) => `${parentItem?.title || "search"}-${item.CodecName}` === rubric.draggableId
                    ) || []
                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                            ...getLeftItemStyle(snapshot.isDragging, provided.draggableProps.style)
                        }}
                    >
                        <>
                            {item.length > 0 && (
                                <div className={styles["drag-list-item-clone"]}>
                                    <div className={styles["title"]}>
                                        <div className={styles["drag-icon"]}>
                                            <SolidDragsortIcon />
                                        </div>
                                        <span className={styles["text"]}>{item[0].CodecName}</span>
                                    </div>
                                    <div className={styles["extra"]}>
                                        {collectList.includes(item[0].CodecName) ? (
                                            <div
                                                className={classNames(styles["star-icon"], styles["star-icon-active"])}
                                            >
                                                <SolidStarIcon />
                                            </div>
                                        ) : (
                                            <div
                                                className={classNames(styles["star-icon"], styles["star-icon-default"])}
                                            >
                                                <OutlineStarIcon />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    </div>
                )
            }}
        >
            {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                    {node.map((item, index) => {
                        return (
                            <Draggable
                                key={`${parentItem?.title || "search"}-${item.CodecName}`}
                                draggableId={`${parentItem?.title || "search"}-${item.CodecName}`}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                            ...getLeftItemStyle(snapshot.isDragging, provided.draggableProps.style)
                                        }}
                                    >
                                        {dragListItemDom(item)}
                                    </div>
                                )}
                            </Draggable>
                        )
                    })}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

interface NewCodecLeftDragListProps {
    fold: boolean
    setFold: (v: boolean) => void
    leftData: LeftDataProps[]
    leftCollectData: LeftDataProps[]
    collectList: string[]
    leftSearchData: CodecMethod[]
    isShowSearchList: boolean
    getCollectData: (v: string[]) => void
    onClickToRunList: (v: CodecMethod) => void
    searchValue?: string
    setSearchValue?: (v: string) => void
}

interface LeftDataProps {
    title: string
    node: CodecMethod[]
}

// Codec Left Drag List
export const NewCodecLeftDragList: React.FC<NewCodecLeftDragListProps> = (props) => {
    const {
        fold,
        setFold,
        leftData,
        leftCollectData,
        collectList,
        searchValue,
        leftSearchData,
        setSearchValue,
        isShowSearchList,
        getCollectData,
        onClickToRunList
    } = props
    const [activeKey, setActiveKey] = useState<string[]>([])

    return (
        <div
            className={classNames(styles["new-codec-drag-list"], {
                [styles["new-codec-drag-list-show"]]: fold,
                [styles["new-codec-drag-list-hidden"]]: !fold
            })}
        >
            <div className={styles["header"]}>
                <div className={styles["title"]}>Codec Category</div>
                <div className={classNames(styles["extra"], styles["fold-icon"])}>
                    <Tooltip placement='top' title='Collapse Codec Category'>
                        <SideBarCloseIcon
                            className={styles["fold-icon"]}
                            onClick={() => {
                                setFold(false)
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["search"]}>
                <YakitInput
                    prefix={
                        <div className={styles["prefix"]}>
                            <OutlineSearchIcon />
                        </div>
                    }
                    style={{width: "100%"}}
                    placeholder='Keyword Search Prompt'
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue && setSearchValue(e.target.value)
                    }}
                />
            </div>
            <div className={styles["left-drag-list"]}>
                <YakitSpin spinning={false}>
                    {/* Left List */}
                    <>
                        {isShowSearchList ? (
                            <div className={styles["left-drag-list-collapse"]}>
                                <NewCodecLeftDragListItem
                                    node={leftSearchData}
                                    collectList={collectList}
                                    getCollectData={getCollectData}
                                    onClickToRunList={onClickToRunList}
                                />
                                <div className={styles["to-end"]}>Reached Bottom～</div>
                            </div>
                        ) : (
                            <YakitCollapse
                                expandIcon={() => <></>}
                                accordion={true}
                                activeKey={activeKey}
                                onChange={(key) => {
                                    const arr = key as string[]
                                    setActiveKey(arr)
                                }}
                                className={styles["left-drag-list-collapse"]}
                            >
                                {[...leftCollectData, ...leftData].map((item, index) => {
                                    return (
                                        <YakitPanel
                                            header={
                                                (activeKey || []).includes(item.title) ? (
                                                    <div className={styles["panel-active-title"]}>{item.title}</div>
                                                ) : (
                                                    item.title
                                                )
                                            }
                                            key={item.title}
                                            extra={
                                                item.title === "My Favorited Tools" ? (
                                                    <>
                                                        {/* <div className={classNames(styles['star-icon'],styles['star-icon-default'])} onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}>
                                                    <OutlineStarIcon/>
                                                </div> */}
                                                        <div
                                                            style={{color: "#FFD583"}}
                                                            className={classNames(
                                                                styles["star-icon"],
                                                                styles["star-icon-active"]
                                                            )}
                                                            // onClick={(e) => {
                                                            //     e.stopPropagation()
                                                            // }}
                                                        >
                                                            <SolidStarIcon />
                                                        </div>
                                                    </>
                                                ) : null
                                            }
                                        >
                                            {item.node.length > 0 && (
                                                <NewCodecLeftDragListItem
                                                    node={item.node}
                                                    parentItem={item}
                                                    collectList={collectList}
                                                    getCollectData={getCollectData}
                                                    onClickToRunList={onClickToRunList}
                                                />
                                            )}
                                        </YakitPanel>
                                    )
                                })}
                                <div className={styles["to-end"]}>Reached Bottom～</div>
                            </YakitCollapse>
                        )}
                    </>
                </YakitSpin>
            </div>
        </div>
    )
}
// InputBox
interface RightItemsInputProps {
    // Title
    title?: string
    // Parameter Name
    name: string
    // Mandatory
    require?: boolean
    // Disabled
    disabled?: boolean
    // Default Value
    defaultValue?: string
    // Value
    value?: string
    // Regex Validation
    regex?: string
    // Control Type
    type: "input" | "text"
}

// Checkbox
interface RightItemsCheckProps {
    // Optional Value
    checkArr: {label: string; value: string}[]
    // Parameter Name
    name: string
    // Selected Value
    value?: string[]
    // Control Type
    type: "checkbox"
    // Disabled
    disabled?: boolean
    // Mandatory
    require?: boolean
}

// Dropdown Selector
interface RightItemsSelectProps {
    // Title
    title?: string
    // Parameter Name
    name: string
    // Optional Value
    selectArr: {label: string; value: string}[]
    // Selected Value
    value?: string
    // Disabled
    disabled?: boolean
    // Mandatory
    require?: boolean
    // Searchable
    showSearch?: boolean
    // Control Type
    type: "select"
    // Enable Plugin Search from Community
    isPlugin?: boolean
}

// Editor
interface RightItemsEditorProps {
    // Title
    title?: string
    // Parameter Name
    name: string
    // Disabled
    disabled?: boolean
    // Mandatory
    require?: boolean
    // Editor Value
    value?: string
    // Control Type
    type: "editor"
}

// Combined Control - Input/Select
interface RightItemsInputSelectProps {
    input: RightItemsInputProps
    select: RightItemsSelectProps
    // Control Type
    type: "inputSelect"
}

// Remove Combined Control
type RightItemsTypeNoUniteProps =
    | RightItemsInputProps
    | RightItemsCheckProps
    | RightItemsSelectProps
    | RightItemsEditorProps

// All Controls
type RightItemsTypeProps = RightItemsTypeNoUniteProps | RightItemsInputSelectProps

// Left-Right Layout
interface RightItemsFlexProps {
    // Width Ratio Left-Right (default 3:2))
    leftFlex?: number
    rightFlex?: number
    // Left-Right Content
    leftNode: RightItemsTypeProps
    rightNode: RightItemsTypeProps
    // Control Type
    type: "flex"
}
interface RightItemsProps {
    title: string
    codecType: string
    key: string
    node?: (RightItemsTypeProps | RightItemsFlexProps)[]
    // Block/Abort
    status?: "shield" | "suspend" | "run"
}
const initialRightItems: RightItemsProps[] = [
    // {
    //     title: "Item A",
    //     codecType:"55",
    //     key:"QQ",
    //     node: [
    //         {
    //             leftNode: {name:"DD",type: "input", title: "IV"},
    //             rightNode: {name:"BB",selectArr: [{label:"B",value:"B"}, {label:"K",value:"K"},{label:"M",value:"M"}], type: "select"},
    //             type: "flex"
    //         },
    //     ]
    // },
]
export interface CodecParam {
    Name: string
    Type: string
    Options: string[]
    Required: boolean
    DefaultValue: string
    Desc: string
    Regex: string
    Label: string
    Connector: CodecParam
}
export interface CodecMethod {
    Tag: string
    CodecName: string
    CodecMethod: string
    Desc: string
    Params: CodecParam[]
}
export interface CodecMethods {
    Methods: CodecMethod[]
}
export interface NewCodecProps {
    id: string
}
export const NewCodec: React.FC<NewCodecProps> = (props) => {
    const {id} = props
    // Toggle Codec Category
    const [fold, setFold] = useState<boolean>(true)
    // Expand All
    const [isExpand, setExpand] = useState<boolean>(false)
    const [rightItems, setRightItems] = useState<RightItemsProps[]>(initialRightItems)
    const [leftData, setLeftData] = useState<LeftDataProps[]>([])
    // My Favorites
    const [leftCollectData, setLeftCollectData] = useState<LeftDataProps[]>([])
    const [collectList, setCollectList] = useState<string[]>([])

    const [leftSearchData, setLeftSearchData] = useState<CodecMethod[]>([])
    const [searchValue, setSearchValue] = useState<string>()
    // Show Search List
    const [isShowSearchList, setShowSearchList] = useState<boolean>(false)
    const cacheCodecRef = useRef<CodecMethod[]>([])
    // Input/Output Editor Content
    const [inputEditor, setInputEditor] = useState<string>("")
    const [outputEditor, setOutputEditor] = useState<string>("")
    const [outputEditorByte, setOutputEditorByte] = useState<Uint8Array>()
    // Executing
    const [runLoading, setRunLoading] = useState<boolean>(false)
    // Add to Run List on Click
    const isClickToRunList = useRef<boolean>(false)

    // Calculate Total Encoding Value
    const differentiate = useMemoizedFn((str: string) => {
        let sum = 0
        for (let i = 0; i < str.length; i++) {
            sum += str.charCodeAt(i)
        }
        return sum
    })

    // Build Left List Data
    const initLeftData = useMemoizedFn((Methods: CodecMethod[]) => {
        // Category ClassName
        let tagList: string[] = []
        let data: LeftDataProps[] = []
        // Fixed Order
        const NewMethods = Methods.sort((a, b) => differentiate(a.CodecName) - differentiate(b.CodecName))
        NewMethods.forEach((item) => {
            if (tagList.includes(item.Tag)) {
                const newData = data.map((itemIn) => {
                    const {title, node} = itemIn
                    if (itemIn.title === item.Tag) {
                        return {
                            title,
                            node: [...node, item]
                        }
                    }
                    return itemIn
                })
                data = newData
            } else {
                data.push({
                    title: item.Tag,
                    node: [item]
                })
                tagList.push(item.Tag)
            }
        })

        // Find title as "Other" Index of item
        const index = data.findIndex((item) => item.title === "Other")
        // Move item to end of array if found
        if (index !== -1) {
            const otherItem = data.splice(index, 1)[0]
            data.push(otherItem)
        }
        // console.log("initLeftData---", data, Methods)
        setLeftData(data)
    })

    // Get Favorites List
    const getCollectData = useMemoizedFn((star?: string[]) => {
        const setStar = (starList: string[]) => {
            const filterCodec = cacheCodecRef.current.filter((item) => starList.includes(item.CodecName))
            /* Order required for Favorites, filterCodec by starList */
            filterCodec.sort((a, b) => {
                const indexA = starList.indexOf(a.CodecName)
                const indexB = starList.indexOf(b.CodecName)
                return indexA - indexB
            })
            setCollectList(starList)
            if (filterCodec.length > 0) {
                setLeftCollectData([
                    {
                        title: "My Favorited Tools",
                        node: filterCodec
                    }
                ])
            } else {
                setLeftCollectData([])
            }
        }
        if (star) {
            setStar(star)
        } else {
            getRemoteValue(SaveCodecMethods).then((res) => {
                // If Favorites Exist
                if (res) {
                    try {
                        const cacheList: string[] = JSON.parse(res)
                        setStar(cacheList)
                    } catch (error) {}
                } else {
                    setLeftCollectData([])
                    setCollectList([])
                }
            })
        }
    })

    // Get codec list
    const getLeftData = useMemoizedFn(() => {
        ipcRenderer.invoke("GetAllCodecMethods").then((res: CodecMethods) => {
            const {Methods} = res
            cacheCodecRef.current = Methods
            getCollectData()
            initLeftData(Methods)
        })
    })

    useDebounceEffect(
        () => {
            if (searchValue && searchValue.length) {
                const filterCodec = cacheCodecRef.current.filter((item) => item.CodecName.includes(searchValue))
                setLeftSearchData(filterCodec)
                setShowSearchList(true)
            } else {
                setShowSearchList(false)
                getLeftData()
            }
        },
        [searchValue],
        {leading: true, wait: 500}
    )

    const initNode = useMemoizedFn((codecItem: CodecMethod) => {
        return codecItem.Params.map((item) => {
            try {
                const {Type, Options, Label, Name, Required, DefaultValue, Regex, Desc} = item
                switch (Type) {
                    case "select":
                        return {
                            type: "select",
                            selectArr: Options.map((item) => ({label: item, value: item})),
                            title: Label,
                            name: Name,
                            require: Required,
                            value: DefaultValue || undefined
                        } as RightItemsSelectProps
                    case "text":
                    case "input":
                        return {
                            type: Type,
                            title: Label,
                            name: Name,
                            require: Required,
                            regex: Regex
                        } as RightItemsInputProps
                    case "checkbox":
                        let checkArr = [{label: Label, value: Name}]
                        return {
                            type: "checkbox",
                            name: Name,
                            checkArr,
                            require: Required
                        } as RightItemsCheckProps
                    case "monaco":
                        return {
                            type: "editor",
                            title: Label,
                            name: Name,
                            require: Required,
                            value: pluginTypeToName["codec"]?.content
                        } as RightItemsEditorProps
                    case "search":
                        // SelectArr for search control from API
                        return {
                            type: "select",
                            selectArr: [],
                            title: Label,
                            name: Name,
                            require: Required,
                            isPlugin: true,
                            showSearch: true
                        } as RightItemsSelectProps
                    // Combined Control - Input/Select
                    case "inputSelect":
                        return {
                            type: "inputSelect",
                            input: {
                                type: "input",
                                title: Label,
                                name: Name,
                                require: Required,
                                regex: Regex
                            },
                            select: {
                                type: "select",
                                selectArr: item.Connector.Options.map((item) => ({label: item, value: item})),
                                title: item.Connector.Label,
                                name: item.Connector.Name,
                                require: item.Connector.Required,
                                value: item.Connector.DefaultValue || undefined
                            }
                        } as RightItemsInputSelectProps
                    default:
                        return {
                            title: "Unrecognized Data",
                            require: false,
                            type: "input"
                        } as RightItemsInputProps
                }
            } catch (error) {
                return {
                    title: "Unrecognized Data",
                    require: false,
                    type: "input"
                } as RightItemsInputProps
            }
        })
    })

    /**
     * @description: Click to add to run list
     */
    const onClickToRunList = useMemoizedFn((item: CodecMethod) => {
        const node = initNode(item)
        const newRightItems: RightItemsProps[] = JSON.parse(JSON.stringify(rightItems))
        newRightItems.push({title: item.CodecName, codecType: item.CodecMethod, key: uuidv4(), node})
        setRightItems(newRightItems)
        isClickToRunList.current = true
    })

    /**
     * @description: Calculation after Drag End
     */
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        const {source, destination, draggableId} = result
        // console.log("onDragEnd", result)

        // Drag from Left to Right
        if (source.droppableId === "left" && destination && destination.droppableId === "right") {
            const firstDashIndex = draggableId.indexOf("-")
            // Source for Group/Search
            const sourceType = draggableId.substring(0, firstDashIndex)
            // Get Drag Item
            const CodecName = draggableId.substring(firstDashIndex + 1)
            const codecArr = cacheCodecRef.current.filter((item) => item.CodecName === CodecName)
            if (codecArr.length > 0) {
                const codecItem = codecArr[0]
                const node = initNode(codecItem)
                const newRightItems: RightItemsProps[] = JSON.parse(JSON.stringify(rightItems))
                newRightItems.splice(destination.index, 0, {
                    title: codecItem.CodecName,
                    codecType: codecItem.CodecMethod,
                    key: uuidv4(),
                    node
                })
                setRightItems(newRightItems)
            }
        }

        // Inner Sorting on Right
        if (source.droppableId === "right" && destination && destination.droppableId === "right") {
            const newRightItems: RightItemsProps[] = JSON.parse(JSON.stringify(rightItems))
            const [removed] = newRightItems.splice(source.index, 1)
            newRightItems.splice(destination.index, 0, removed)
            setRightItems([...newRightItems])
        }
    })

    /**
     * @description: Calculates if movement is within target range
     */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
        },
        {wait: 200}
    ).run

    const onBeforeCapture = useMemoizedFn((result: BeforeCapture) => {})

    const onDragStart = useMemoizedFn((result: DragStart) => {
        if (!result.source) return
        // console.log("onDragStart---", result)
    })

    return (
        <div className={styles["new-codec"]}>
            {!isExpand && (
                <DragDropContext
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    onDragUpdate={onDragUpdate}
                    onBeforeCapture={onBeforeCapture}
                >
                    <NewCodecLeftDragList
                        fold={fold}
                        setFold={setFold}
                        leftData={leftData}
                        leftCollectData={leftCollectData}
                        collectList={collectList}
                        leftSearchData={leftSearchData}
                        isShowSearchList={isShowSearchList}
                        searchValue={searchValue}
                        setSearchValue={setSearchValue}
                        getCollectData={getCollectData}
                        onClickToRunList={onClickToRunList}
                    />
                    <NewCodecMiddleRunList
                        id={id}
                        fold={fold}
                        setFold={setFold}
                        rightItems={rightItems}
                        setRightItems={setRightItems}
                        inputEditor={inputEditor}
                        setOutputEditor={setOutputEditor}
                        setOutputEditorByte={setOutputEditorByte}
                        isClickToRunList={isClickToRunList}
                        setRunLoading={setRunLoading}
                    />
                </DragDropContext>
            )}
            <NewCodecRightEditorBox
                isExpand={isExpand}
                setExpand={setExpand}
                inputEditor={inputEditor}
                setInputEditor={setInputEditor}
                outputEditor={outputEditor}
                outputEditorByte={outputEditorByte}
                runLoading={runLoading}
            />
        </div>
    )
}
