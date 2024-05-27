import React, {useEffect, useMemo, useRef, useState} from "react"
import {Avatar, Space, Timeline} from "antd"
import {PlusOutlined} from "@ant-design/icons"
import styles from "./HTTPFuzzerEditorMenu.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    DocumentDuplicateSvgIcon,
    DragSortIcon,
    IconSolidCodeIcon,
    IconSolidSparklesIcon,
    IconSolidTagIcon,
    IconOutlinePencilAltIcon,
    TrashIcon
} from "@/assets/newIcon"
import {DragDropContext, Droppable, Draggable, DraggingStyle} from "@hello-pangea/dnd"
import {AutoDecodeResult} from "@/utils/encodec"
import {callCopyToClipboard} from "@/utils/basic"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryFuzzerLabelResponseProps} from "./StringFuzzer"
import {setRemoteValue} from "@/utils/kv"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {SolidTerminalIcon} from "@/assets/icon/solid"
import {defaultLabel} from "@/defaultConstants/HTTPFuzzerPage"
const {ipcRenderer} = window.require("electron")

export interface CountDirectionProps {
    x?: string
    y?: string
}

export interface EditorDetailInfoProps {
    direction: CountDirectionProps
    top: number
    bottom: number
    left: number
    right: number
    focusX: number
    focusY: number
    lineHeight: number
    scrollTop: number
}

const directionStyle = (editorInfo, isCenter = true) => {
    const {direction, top = 0, left = 0, bottom = 0, right = 0} = editorInfo || {}
    let obj: any = {}
    if (direction) {
        if (direction.x === "middle" && isCenter) {
            obj.transform = "translate(-38%, 0px)"
        }
        if (direction.x === "right") {
            obj.right = 0
        }
        if (direction.y === "bottom") {
            obj.bottom = "32px"
        }
    }
    return obj
}

// DragBoundsLR
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // Regex Match two args in translate function
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            // Extract & Convert Two Values to Numbers
            const [value1, value2] = match.slice(1).map(Number)
            const modifiedString = transform.replace(/translate\((-?\d+)px, (-?\d+)px\)/, `translate(0px, ${value2}px)`)
            transform = modifiedString
        }
    }

    return {
        ...draggableStyle,
        transform
    }
}

export interface HTTPFuzzerClickEditorMenuProps {
    close: () => void
    editorInfo?: EditorDetailInfoProps
    insert: (v: QueryFuzzerLabelResponseProps) => void
    addLabel: () => void
    className?: string
    // StartupShutdownTimer?
    fizzSelectTimeoutId?: any
    closeTimeout?: boolean
}

export interface LabelDataProps {
    DefaultDescription: string
    Description?: string
    Label?: string
}

export const FUZZER_LABEL_LIST_NUMBER = "fuzzer-label-list-number"

export const HTTPFuzzerClickEditorMenu: React.FC<HTTPFuzzerClickEditorMenuProps> = (props) => {
    const {close, editorInfo, insert, addLabel, fizzSelectTimeoutId, closeTimeout = true} = props

    const {direction, top = 0, left = 0, bottom = 0, right = 0, scrollTop = 0} = editorInfo || {}
    const [labelData, setLabelData] = useState<QueryFuzzerLabelResponseProps[]>([])
    const [selectLabel, setSelectLabel] = useState<string>()
    const [inputValue, setInputValue] = useState<string>()
    const [isEnterSimple, setEnterSimple] = useState<boolean>(false)
    const [destinationDrag, setDestinationDrag] = useState<string>("droppable-editor")
    // InChineseInput?
    const isComposition = useRef<boolean>(false)
    // Dragging?
    const isDragging = useRef<boolean>(false)
    // MouseInMain?
    const isMainEnter = useRef<boolean>(false)
    // MouseInSimple?
    const isSimpleEnter = useRef<boolean>(false)
    // MenuWidth
    const [menuWidth, setMenuWidth] = useState<number>()
    // MenuHeight
    const [menuHeight, setMenuHeight] = useState<number>()

    const getData = () => {
        ipcRenderer.invoke("QueryFuzzerLabel").then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
            const {Data} = data
            if (Array.isArray(Data) && Data.length > 0) {
                setLabelData(Data)
                setSelectLabel(undefined)
            }
        })
    }

    const [boxHidden, setBoxHidden] = useState<boolean>(true)
    // ShowAfter0.8Secs
    useEffect(() => {
        setTimeout(() => {
            setBoxHidden(false)
        }, 800)
    }, [])
    // AutoClose5SecsIdle
    const closeTimeoutFun = useMemoizedFn(() => {
        const closeTimeoutId = setTimeout(() => {
            close()
        }, 5 * 1000)
        // ReturnTimeoutIdForCancel
        return closeTimeoutId
    })
    useEffect(() => {
        if (closeTimeout && fizzSelectTimeoutId) {
            if (isMainEnter.current || isSimpleEnter.current) {
                fizzSelectTimeoutId.current && clearTimeout(fizzSelectTimeoutId.current)
            } else {
                fizzSelectTimeoutId.current = undefined
                fizzSelectTimeoutId.current = closeTimeoutFun()
            }
        }
    }, [isMainEnter.current, isSimpleEnter.current])

    useEffect(() => {
        if (right - left < 720) {
            let width: number = Math.floor((right - left) / 2)
            setMenuWidth(width)
        }
        if (bottom - top < 700) {
            let height: number = Math.floor((bottom - top) / 2 - 30)
            setMenuHeight(height)
        }
        getData()
    }, [])

    const insertLabel = (item: QueryFuzzerLabelResponseProps) => {
        if (isSelect(item)) {
            // UndoChanges
            setSelectLabel(undefined)
        } else {
            insert(item)
        }
    }
    const delLabel = (Hash: string) => {
        ipcRenderer.invoke("DeleteFuzzerLabel", {Hash}).then(() => {
            getData()
        })
    }
    const reset = () => {
        // ReaddDefaultAfterDelTag
        ipcRenderer.invoke("DeleteFuzzerLabel", {}).then(() => {
            setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: defaultLabel.length}))
            ipcRenderer
                .invoke("SaveFuzzerLabel", {
                    Data: defaultLabel
                })
                .then(() => {
                    getData()
                })
        })
    }
    const isSelect = (item: QueryFuzzerLabelResponseProps) => selectLabel === item.Hash

    const dragList = (newItems) => {
        // Resort
        ipcRenderer.invoke("DeleteFuzzerLabel", {}).then(() => {
            setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: newItems.length}))
            ipcRenderer.invoke("SaveFuzzerLabel", {
                Data: newItems
            })
        })
    }

    // DragCompleteCallback
    const onDragEnd = (result) => {
        isDragging.current = false
        if (!result.destination) return

        const newItems = Array.from(labelData)
        const [reorderedItem] = newItems.splice(result.source.index, 1)
        newItems.splice(result.destination.index, 0, reorderedItem)

        setLabelData(newItems)
        dragList([...newItems].reverse())
    }

    /**
     * @CalcMoveInRangeOfDestDrag
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    return (
        <div
            className={classNames(styles["http-fuzzer-click-editor"], {
                [styles["box-hidden"]]: boxHidden
            })}
            onMouseLeave={() => {
                isMainEnter.current = false
                setTimeout(() => {
                    if (!isSimpleEnter.current && !isDragging.current && !isComposition.current) {
                        setEnterSimple(false)
                    }
                }, 100)
            }}
        >
            <div className={classNames(styles["http-fuzzer-click-editor-simple"], props.className || "")}>
                <div
                    className={styles["show-box"]}
                    onMouseEnter={() => {
                        isMainEnter.current = true
                        setEnterSimple(true)
                    }}
                >
                    <IconSolidTagIcon className={styles["tag"]} />
                    <div className={styles["content"]}>Insert Tag</div>
                    {isEnterSimple ? (
                        <ChevronUpIcon className={styles["up"]} />
                    ) : (
                        <ChevronDownIcon className={styles["down"]} />
                    )}
                </div>
            </div>
            {isEnterSimple && (
                <div
                    className={classNames(styles["http-fuzzer-click-editor-menu"])}
                    // DragFreezeWarning
                    onMouseLeave={() => {
                        isSimpleEnter.current = false
                        setTimeout(() => {
                            if (!isDragging.current && !isMainEnter.current && !isComposition.current)
                                setEnterSimple(false)
                        }, 100)
                    }}
                    onMouseEnter={() => {
                        isSimpleEnter.current = true
                    }}
                    onCompositionStart={() => {
                        isComposition.current = true
                    }}
                    onCompositionEnd={() => {
                        isComposition.current = false
                    }}
                    style={{
                        ...directionStyle(editorInfo, false),
                        maxHeight: menuHeight ? menuHeight : 350,
                        width: menuWidth ? menuWidth : 360
                    }}
                >
                    <div className={styles["menu-header"]}>
                        <div className={styles["menu-header-left"]}>
                            FavTags
                            {!(menuWidth && menuWidth < 220) && (
                                <span className={styles["menu-header-left-count"]}>{labelData.length || ""}</span>
                            )}
                        </div>
                        <div className={styles["menu-header-opt"]}>
                            <YakitButton
                                style={{paddingLeft: 2, paddingRight: 2}}
                                type='text'
                                onClick={() => addLabel()}
                            >
                                Add <PlusOutlined />
                            </YakitButton>
                            <div className={styles["line"]}></div>
                            <YakitButton type='text2' style={{color: "#85899E"}} onClick={() => reset()}>
                                Undo
                            </YakitButton>
                        </div>
                    </div>

                    <div className={styles["menu-list"]}>
                        <DragDropContext
                            onDragEnd={onDragEnd}
                            onDragUpdate={onDragUpdate}
                            onBeforeDragStart={() => {
                                isDragging.current = true
                            }}
                        >
                            <Droppable droppableId='droppable-editor'>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {labelData.map((item, index) => (
                                            <Draggable key={item?.Description} draggableId={`${item.Id}`} index={index}>
                                                {(provided, snapshot) => {
                                                    const draggablePropsStyle = provided.draggableProps
                                                        .style as DraggingStyle

                                                    return (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{
                                                                ...draggablePropsStyle,
                                                                ...getItemStyle(
                                                                    snapshot.isDragging,
                                                                    provided.draggableProps.style
                                                                ),
                                                                top:
                                                                    isDragging.current && draggablePropsStyle?.top
                                                                        ? draggablePropsStyle.top - top + scrollTop
                                                                        : "none",
                                                                left:
                                                                    isDragging.current && draggablePropsStyle?.left
                                                                        ? draggablePropsStyle.left - left - 60
                                                                        : "none"
                                                            }}
                                                        >
                                                            <div
                                                                className={classNames(styles["menu-list-item"], {
                                                                    [styles["menu-list-item-drag"]]: snapshot.isDragging
                                                                })}
                                                                onClick={() => insertLabel(item)}
                                                            >
                                                                <div
                                                                    className={styles["menu-list-item-info"]}
                                                                    style={{
                                                                        overflow: "hidden",
                                                                        maxWidth: menuWidth ? menuWidth - 30 : 260
                                                                    }}
                                                                >
                                                                    <DragSortIcon
                                                                        className={styles["drag-sort-icon"]}
                                                                    />
                                                                    {isSelect(item) ? (
                                                                        <YakitInput
                                                                            defaultValue={item.Description}
                                                                            className={styles["input"]}
                                                                            size='small'
                                                                            onChange={(e) => {
                                                                                setInputValue(e.target.value)
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <>
                                                                            <div className={styles["title"]}>
                                                                                {item.Description}
                                                                            </div>
                                                                            {(!menuWidth || menuWidth > 250) && (
                                                                                <div
                                                                                    className={classNames(
                                                                                        styles["sub-title"],
                                                                                        {
                                                                                            [styles["sub-title-left"]]:
                                                                                                !!item.Description
                                                                                        }
                                                                                    )}
                                                                                >
                                                                                    {item.Label}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className={styles["menu-list-item-opt"]}>
                                                                    {isSelect(item) ? (
                                                                        <YakitButton
                                                                            type='text'
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                if (inputValue) {
                                                                                    ipcRenderer
                                                                                        .invoke("SaveFuzzerLabel", {
                                                                                            Data: [
                                                                                                {
                                                                                                    ...item,
                                                                                                    Description:
                                                                                                        inputValue
                                                                                                }
                                                                                            ]
                                                                                        })
                                                                                        .then(() => {
                                                                                            getData()
                                                                                        })
                                                                                }
                                                                            }}
                                                                        >
                                                                            Confirm
                                                                        </YakitButton>
                                                                    ) : (
                                                                        <>
                                                                            {!item.DefaultDescription.endsWith(
                                                                                "-fixed"
                                                                            ) && (
                                                                                <>
                                                                                    <IconOutlinePencilAltIcon
                                                                                        className={classNames(
                                                                                            styles["form-outlined"]
                                                                                        )}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            setSelectLabel(item.Hash)
                                                                                            setInputValue(
                                                                                                item.Description
                                                                                            )
                                                                                        }}
                                                                                    />
                                                                                    <TrashIcon
                                                                                        className={classNames(
                                                                                            styles["trash-icon"]
                                                                                        )}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            delLabel(item.Hash)
                                                                                        }}
                                                                                    />
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                    // DraggingThis?
                                                }}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            )}
        </div>
    )
}

export interface EncodeComponentProps {
    insert: (v: any) => void
}
interface decodeDataProps {
    color: string
    avatar: string
    title: string
    sub_title: string
    encode: (v: string) => string
}
export const EncodeComponent: React.FC<EncodeComponentProps> = (props) => {
    const {insert} = props
    const decodeData = useRef<decodeDataProps[]>([
        {
            color: "rgba(136, 99, 247, 0.6)",
            avatar: "m",
            title: "Md5Encode",
            sub_title: "md5",
            encode: (v: string) => `{{md5(${v})}}`
        },
        {
            color: "rgba(74, 148, 248, 0.6)",
            avatar: "b",
            title: "Base64 Encode",
            sub_title: "base64enc",
            encode: (v: string) => `{{base64enc(${v})}}`
        },
        {
            color: "rgba(74, 148, 248, 0.6)",
            avatar: "b",
            title: "Base64 then URL Encode",
            sub_title: "{{urlenc(base64enc(xxx))}}",
            encode: (v: string) => `{{urlenc(base64enc(${v}))}}`
        },
        {
            color: "rgba(86, 201, 145, 0.6)",
            avatar: "h",
            title: "HEX Encode）",
            sub_title: "hexenc",
            encode: (v: string) => `{{hexenc(${v})}}`
        },
        {
            color: "rgba(244, 115, 107, 0.6)",
            avatar: "h",
            title: "HTML Encode",
            sub_title: "htmlenc",
            encode: (v: string) => `{{htmlenc(${v})}}`
        },
        {
            color: "rgba(255, 182, 96, 0.6)",
            avatar: "u",
            title: "URL Encode",
            sub_title: "urlenc",
            encode: (v: string) => `{{urlenc(${v})}}`
        },
        {
            color: "rgba(218, 95, 221, 0.6)",
            avatar: "u",
            title: "URLEncodeSpecialCharsOnly）",
            sub_title: "urlescape",
            encode: (v: string) => `{{urlescape(${v})}}`
        }
    ])
    return (
        <div className={styles["encode-box"]}>
            {decodeData.current.map((item) => {
                return (
                    <div key={item.title} className={styles["encode-item"]} onClick={() => insert(item.encode)}>
                        <Avatar size={16} style={{color: "rgba(49, 52, 63, 1)", backgroundColor: item.color}}>
                            {item.avatar}
                        </Avatar>
                        <div className={styles["title"]}>{item.title}</div>
                        <div className={styles["sub-title"]}>{item.sub_title}</div>
                    </div>
                )
            })}
        </div>
    )
}

interface DecodeCopyReplaceProps {
    item: AutoDecodeResult
    // ShowBorders?
    isShowBorder: boolean
    index?: number
    // ReadOnly?
    isReadOnly?: boolean
    replace?: (v: string) => void
}

export const DecodeCopyReplace: React.FC<DecodeCopyReplaceProps> = (props) => {
    const {item, index, isShowBorder, isReadOnly, replace} = props
    const itemStr: string = new Buffer(item.Result).toString("utf8")
    return (
        <div className={styles["decode-copy-replace"]}>
            <div
                className={classNames(styles["header"], {
                    [styles["header-solid"]]: isShowBorder
                })}
            >
                <div className={styles["header-info"]}>
                    {!isShowBorder && <div className={styles["title"]}>Step [{index}]</div>}
                    <div className={styles["sub-title"]}>{item.TypeVerbose}</div>
                </div>
                <div className={styles["header-opt"]}>
                    <div
                        className={styles["yakit-copy"]}
                        onClick={() => {
                            callCopyToClipboard(itemStr)
                        }}
                    >
                        <DocumentDuplicateSvgIcon className={styles["document-duplicate-svg-icon"]} />
                    </div>
                    {!isReadOnly && (
                        <YakitButton
                            size='small'
                            onClick={() => {
                                replace && replace(itemStr)
                            }}
                        >
                            Replace
                        </YakitButton>
                    )}
                </div>
            </div>
            <div
                className={classNames(styles["content"], {
                    [styles["content-solid"]]: isShowBorder
                })}
            >
                {itemStr}
            </div>
        </div>
    )
}

export interface DecodeComponentProps {
    isReadOnly?: boolean
    rangeValue: string
    replace?: (v: string) => void
}

export const DecodeComponent: React.FC<DecodeComponentProps> = (props) => {
    const {isReadOnly, rangeValue, replace} = props
    const [status, setStatus] = useState<"none" | "only" | "many">()
    const [result, setResult] = useState<AutoDecodeResult[]>([])
    useEffect(() => {
        try {
            if (!rangeValue) {
                setStatus("none")
                return
            }
            ipcRenderer.invoke("AutoDecode", {Data: rangeValue}).then((e: {Results: AutoDecodeResult[]}) => {
                // console.log("Results", e.Results)
                const {Results} = e
                let successArr: AutoDecodeResult[] = []
                let failArr: AutoDecodeResult[] = []
                Results.map((item) => {
                    if (item.Type === "No") {
                        failArr.push(item)
                    } else {
                        successArr.push(item)
                    }
                })
                setResult(successArr)
                if (successArr.length === 0) {
                    setStatus("none")
                } else if (successArr.length === 1) {
                    setStatus("only")
                } else {
                    setStatus("many")
                }
            })
        } catch (e) {
            failed("editor exec auto-decode failed")
        }
    }, [])

    return (
        <div className={styles["decode-box"]}>
            {isReadOnly && <div className={styles["title"]}>SmartDecode</div>}
            {status === "only" && (
                <div className={styles["only-one"]}>
                    <DecodeCopyReplace isReadOnly={isReadOnly} item={result[0]} isShowBorder={true} replace={replace} />
                </div>
            )}
            {status === "many" && (
                <div className={styles["timeline-box"]}>
                    <Timeline>
                        {result.map((item, index) => {
                            return (
                                <Timeline.Item
                                    className={styles["timeline-item"]}
                                    dot={<SolidTerminalIcon className={styles["solid-terminal-icon"]} />}
                                >
                                    <DecodeCopyReplace
                                        item={item}
                                        index={index + 1}
                                        isShowBorder={false}
                                        replace={replace}
                                        isReadOnly={isReadOnly}
                                    />
                                </Timeline.Item>
                            )
                        })}
                    </Timeline>
                </div>
            )}
            {status === "none" && <div className={styles["none-decode"]}>NoDecodeInfo</div>}
        </div>
    )
}

export interface HTTPFuzzerRangeEditorMenuProps {
    close: () => void
    editorInfo?: EditorDetailInfoProps
    insert: (v: any) => void
    rangeValue: string
    replace?: (v: string) => void
    hTTPFuzzerClickEditorMenuProps?: HTTPFuzzerClickEditorMenuProps
    fizzRangeTimeoutId?: any
}
export const HTTPFuzzerRangeEditorMenu: React.FC<HTTPFuzzerRangeEditorMenuProps> = (props) => {
    const {close, editorInfo, insert, rangeValue, replace, hTTPFuzzerClickEditorMenuProps, fizzRangeTimeoutId} = props
    const {direction, top = 0, left = 0, bottom = 0, right = 0} = editorInfo || {}
    // MenuWidth
    const [menuWidth, setMenuWidth] = useState<number>()
    // MenuHeight
    const [menuHeight, setMenuHeight] = useState<number>()
    useEffect(() => {
        if (right - left < 720) {
            let width: number = Math.floor((right - left) / 2)
            setMenuWidth(width)
        }
        if (bottom - top < 720) {
            let height: number = Math.floor((bottom - top) / 2 - 30)
            setMenuHeight(height)
        }
    }, [])
    const [segmentedType, setSegmentedType] = useState<"decode" | "encode">()
    // MouseInMain?
    const isMainEnter = useRef<boolean>(false)
    // MouseInSimple?
    const isSimpleEnter = useRef<boolean>(false)

    const [boxHidden, setBoxHidden] = useState<boolean>(true)
    // ShowAfter0.8Secs
    useEffect(() => {
        fizzRangeTimeoutId.current = undefined
        fizzRangeTimeoutId.current = closeTimeoutFun()
        setTimeout(() => {
            setBoxHidden(false)
        }, 800)
    }, [])
    // AutoClose5SecsIdle
    const closeTimeoutFun = useMemoizedFn(() => {
        const closeTimeoutId = setTimeout(() => {
            close()
        }, 5 * 1000)
        // ReturnTimeoutIdForCancel
        return closeTimeoutId
    })

    return (
        <div
            className={classNames(styles["http-fuzzer-range-editor-body"], {
                [styles["box-hidden"]]: boxHidden
            })}
            onMouseEnter={() => {
                fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
            }}
            onMouseLeave={() => {
                fizzRangeTimeoutId.current = undefined
                fizzRangeTimeoutId.current = closeTimeoutFun()
            }}
        >
            {hTTPFuzzerClickEditorMenuProps && (
                <HTTPFuzzerClickEditorMenu
                    className={styles["range-click-editor-menu"]}
                    closeTimeout={false}
                    {...hTTPFuzzerClickEditorMenuProps}
                />
            )}

            <div className={styles["http-fuzzer-range-editor"]}>
                <div className={styles["http-fuzzer-range-editor-simple"]}>
                    <div className={styles["show-box"]}>
                        <div className={styles["line"]}></div>
                        <div
                            className={styles["encode-box"]}
                            onMouseEnter={() => {
                                isMainEnter.current = true
                                setSegmentedType("encode")
                            }}
                            onMouseLeave={() => {
                                isMainEnter.current = false
                                setTimeout(() => {
                                    if (!isSimpleEnter.current) {
                                        setSegmentedType(undefined)
                                    }
                                }, 100)
                            }}
                        >
                            <IconSolidCodeIcon className={styles["tag"]} />
                            <div className={styles["content"]}>Encode</div>
                            {segmentedType === "encode" ? (
                                <ChevronUpIcon className={styles["up"]} />
                            ) : (
                                <ChevronDownIcon className={styles["down"]} />
                            )}
                        </div>
                        <div className={styles["line"]}></div>
                        <div
                            className={styles["decode-box"]}
                            onClick={() => {
                                setSegmentedType("decode")
                            }}
                        >
                            <IconSolidSparklesIcon className={styles[""]} />
                            <div className={styles["content"]}>Decode</div>
                        </div>
                    </div>
                </div>
                {segmentedType && (
                    <div
                        style={{
                            ...directionStyle(editorInfo),
                            maxHeight: menuHeight ? menuHeight : 360,
                            width: menuWidth ? menuWidth : 360
                        }}
                        className={classNames(styles["http-fuzzer-range-editor-menu"])}
                        onMouseLeave={() => {
                            isSimpleEnter.current = false
                            setTimeout(() => {
                                if (!isMainEnter.current) setSegmentedType(undefined)
                            }, 100)
                        }}
                        onMouseEnter={() => {
                            isSimpleEnter.current = true
                        }}
                    >
                        <div className={styles["menu-content"]}>
                            {segmentedType === "encode" ? (
                                <EncodeComponent insert={insert} />
                            ) : (
                                <DecodeComponent rangeValue={rangeValue} replace={replace} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

interface HTTPFuzzerRangeReadOnlyEditorMenuProps {
    editorInfo?: EditorDetailInfoProps
    rangeValue: string
    fizzRangeTimeoutId?: any
    close: () => void
}

export const HTTPFuzzerRangeReadOnlyEditorMenu: React.FC<HTTPFuzzerRangeReadOnlyEditorMenuProps> = (props) => {
    const {editorInfo, rangeValue, fizzRangeTimeoutId, close} = props
    const [segmentedType, setSegmentedType] = useState<"decode">()
    const {direction, top = 0, left = 0, bottom = 0, right = 0} = editorInfo || {}
    // MenuWidth
    const [menuWidth, setMenuWidth] = useState<number>()
    // MenuHeight
    const [menuHeight, setMenuHeight] = useState<number>()

    const [boxHidden, setBoxHidden] = useState<boolean>(true)
    // ShowAfter0.8Secs
    useEffect(() => {
        fizzRangeTimeoutId.current = undefined
        fizzRangeTimeoutId.current = closeTimeoutFun()
        setTimeout(() => {
            setBoxHidden(false)
        }, 800)
    }, [])
    // AutoClose5SecsIdle
    const closeTimeoutFun = useMemoizedFn(() => {
        const closeTimeoutId = setTimeout(() => {
            close()
        }, 5 * 1000)
        // ReturnTimeoutIdForCancel
        return closeTimeoutId
    })

    useEffect(() => {
        if (right - left < 720) {
            let width: number = Math.floor((right - left) / 2)
            setMenuWidth(width)
        }
        if (bottom - top < 500) {
            let height: number = Math.floor((bottom - top) / 2 - 30)
            setMenuHeight(height)
        }
    }, [])
    return (
        <div
            className={classNames(styles["http-fuzzer-read-editor"], {
                [styles["box-hidden"]]: boxHidden
            })}
            onMouseEnter={() => {
                fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
            }}
            onMouseLeave={() => {
                fizzRangeTimeoutId.current = undefined
                fizzRangeTimeoutId.current = closeTimeoutFun()
            }}
        >
            <div className={styles["http-fuzzer-read-editor-simple"]}>
                <div className={styles["show-box"]}>
                    <div className={styles["decode-box"]} onClick={() => setSegmentedType("decode")}>
                        <IconSolidSparklesIcon className={styles[""]} />
                        <div className={styles["content"]}>Decode</div>
                    </div>
                </div>
            </div>
            {segmentedType && (
                <div
                    style={{
                        ...directionStyle(editorInfo),
                        maxHeight: menuHeight ? menuHeight : 250,
                        width: menuWidth ? menuWidth : 360
                    }}
                    className={classNames(styles["http-fuzzer-range-read-only-editor-menu"])}
                    onMouseLeave={() => setSegmentedType(undefined)}
                >
                    <DecodeComponent rangeValue={rangeValue} isReadOnly={true} />
                </div>
            )}
        </div>
    )
}
