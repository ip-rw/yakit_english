import React, {useEffect, useMemo, useRef, useState} from "react"
import {Checkbox, CheckboxProps, Divider, Input} from "antd"
import {DownOutlined} from "@ant-design/icons"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewCodecUIStore.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {IMonacoEditor, NewHTTPPacketEditor, YakEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {InternalTextAreaProps, YakitInputProps} from "@/components/yakitUI/YakitInput/YakitInputType"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {DefaultOptionType} from "antd/lib/select"
import {queryYakScriptList} from "../yakitStore/network"
import {YakScript} from "../invoker/schema"
import {YakParamProps} from "../plugins/pluginsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
const {ipcRenderer} = window.require("electron")
export interface NewCodecInputUIProps extends YakitInputProps {
    // Title
    title?: string
    extra?: React.ReactNode
    // Required?
    require?: boolean
    // Border Radius Direction in L/R Layout
    direction?: "left" | "right"
}
export const NewCodecInputUI: React.FC<NewCodecInputUIProps> = (props) => {
    const {title, extra, require, direction, ...restProps} = props
    const [isFocus, setFocus] = useState<boolean>(false)
    const inputRef = useRef<any>(null)

    useEffect(() => {
        if (restProps.disabled) {
            setFocus(false)
        }
    }, [restProps.disabled])

    const onFocusBox = useMemoizedFn(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    })

    const onFocus = useMemoizedFn((e) => {
        setFocus(true)
    })

    const onBlur = useMemoizedFn((e) => {
        setFocus(false)
    })
    return (
        <div
            className={classNames(styles["new-codec-input-ui"], {
                [styles["new-codec-left-border-input-ui"]]: direction === "left"
            })}
            onClick={onFocusBox}
        >
            <div
                className={classNames(styles["main"], {
                    [styles["main-focus"]]: isFocus,
                    [styles["main-left-focus"]]: direction === "left"
                })}
            >
                <div className={styles["header"]}>
                    <div className={styles["title"]}>{title}</div>
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
                <div className={styles["content"]}>
                    <YakitInput
                        onFocus={onFocus}
                        onBlur={onBlur}
                        ref={inputRef}
                        placeholder='Please Enter...'
                        {...restProps}
                    />
                </div>
            </div>
            {extra && <div className={styles["extra"]}>{extra}</div>}
        </div>
    )
}

export interface NewCodecTextAreaUIProps extends InternalTextAreaProps {
    // Title
    title?: string
    extra?: React.ReactNode
    // Required?
    require?: boolean
    // Border Radius Direction in L/R Layout
    direction?: "left" | "right"
}

export const NewCodecTextAreaUI: React.FC<NewCodecTextAreaUIProps> = (props) => {
    const {title, extra, require, direction, ...restProps} = props
    const [isFocus, setFocus] = useState<boolean>(false)
    const inputRef = useRef<any>(null)

    useEffect(() => {
        if (restProps.disabled) {
            setFocus(false)
        }
    }, [restProps.disabled])

    const onFocusBox = useMemoizedFn(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    })

    const onFocus = useMemoizedFn((e) => {
        setFocus(true)
    })

    const onBlur = useMemoizedFn((e) => {
        setFocus(false)
    })
    return (
        <div
        className={classNames(styles["new-codec-textarea-ui"], {
            [styles["new-codec-left-border-textarea-ui"]]: direction === "left"
        })}
        onClick={onFocusBox}
    >
        <div
            className={classNames(styles["main"], {
                [styles["main-left-focus"]]: direction === "left"
            })}
        >
            <div className={styles["header"]}>
                <div className={styles["title"]}>{title}</div>
                {require && <div className={styles["icon"]}>*</div>}
            </div>
            <div className={styles["content"]}>
                <YakitInput.TextArea 
                    style={{height:60,maxHeight:120}}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    ref={inputRef}
                    placeholder='Please Enter...'
                    {...restProps}/>
            </div>
        </div>
        {extra && <div className={styles["extra"]}>{extra}</div>}
        {isFocus && <div className={styles['line']}/>}
    </div>)
}

export interface NewCodecCheckUIProps {
    // Disabled
    disabled?: boolean
    // Selectable Values
    options?: {label: string; value: string}[]
    // Selected Value
    value?: CheckboxValueType[]
    onChange?: (v: CheckboxValueType[]) => void
}
export const NewCodecCheckUI: React.FC<NewCodecCheckUIProps> = (props) => {
    const {disabled, options = [], value, onChange} = props
    return (
        <div className={styles["new-codec-check-ui"]}>
            <Checkbox.Group value={value} onChange={onChange}>
                {options.map((item) => (
                    <YakitCheckbox key={item.label} value={item.value} disabled={disabled}>
                        <div className={styles["text"]}>{item.label}</div>
                    </YakitCheckbox>
                ))}
            </Checkbox.Group>
        </div>
    )
}

export interface CodecType {
    key?: string
    verbose: string
    help?: React.ReactNode
    isYakScript?: boolean
}

export interface NewCodecSelectUIProps extends YakitSelectProps {
    // Title
    title?: string
    // Required?
    require?: boolean
    // Searchable?
    showSearch?: boolean
    // Border Radius Direction in L/R Layout
    directionBox?: "left" | "right"
    // Enable Community Plugin Query?
    isPlugin?: boolean
}
// Current Widget Style Fits This Size Only - For More Sizes, Extend Yourself
export const NewCodecSelectUI: React.FC<NewCodecSelectUIProps> = (props) => {
    const {require, title, showSearch, directionBox, options = [], isPlugin, onSearch, ...restProps} = props
    const [optionsList, setOptionsList] = useState<DefaultOptionType[]>(options)

    const [codecPlugin, setCodecPlugin] = useState<CodecType[]>([])
    useEffect(() => {
        if (isPlugin) {
            search()
        }
    }, [])

    const search = useMemoizedFn((keyword?: string) => {
        // setPluginLoading(true)
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                const codecPlugin: CodecType[] = i.map((script) => {
                    return {
                        key: script.ScriptName,
                        help: script.Help,
                        verbose: script.ScriptName,
                        isYakScript: true
                    }
                })
                const codecPluginSelect = codecPlugin.map((item) => ({label: item.key || "", value: item.key || ""}))
                setCodecPlugin(codecPlugin)
                setOptionsList(codecPluginSelect)
            },
            () =>
                setTimeout(() => {
                    // setPluginLoading(false)
                }, 300),
            10,
            undefined,
            keyword
        )
    })

    return (
        <div
            className={classNames(styles["new-codec-select-ui"], {
                [styles["new-codec-title-select-ui"]]: title,
                [styles["new-codec-no-title-select-ui"]]: !title,
                [styles["new-codec-no-title-search-select-ui"]]: showSearch && !title,
                [styles["new-codec-title-search-select-ui"]]: showSearch && title,
                [styles["new-codec-right-border-select-ui"]]: directionBox === "right"
            })}
        >
            {title && (
                <div className={styles["header"]}>
                    <div className={styles["title"]}>{title}</div>
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
            )}
            {showSearch ? (
                <YakitSelect
                    showSearch={true}
                    placeholder='Please Select...'
                    suffixIcon={
                        <div className={styles["search-icon"]}>
                            <OutlineSearchIcon />
                        </div>
                    }
                    onSearch={(v) => {
                        if (isPlugin) {
                            search(v)
                        } else {
                            onSearch && onSearch(v)
                        }
                    }}
                    {...restProps}
                >
                    {optionsList.map((item, index) => (
                        <YakitSelect.Option value={item.value} key={`${item.label}-${index}`}>
                            {item.label}
                        </YakitSelect.Option>
                    ))}
                </YakitSelect>
            ) : (
                <YakitSelect
                    placeholder='Please Select...'
                    onSearch={(v) => {
                        if (isPlugin) {
                            search(v)
                        } else {
                            onSearch && onSearch(v)
                        }
                    }}
                    {...restProps}
                >
                    {optionsList.map((item, index) => (
                        <YakitSelect.Option value={item.value} key={`${item.label}-${index}`}>
                            {item.label}
                        </YakitSelect.Option>
                    ))}
                </YakitSelect>
            )}
        </div>
    )
}
interface NewCodecEditorBodyProps extends NewCodecEditorProps {
    // Value
    editorValue: string
    setEditorValue: (v: string) => void
    // Fullscreen?
    extend: boolean
    // Fullscreen Callback
    onExtend?: () => void
    // Minimize Callback
    onClose?: () => void
    // Popup Open?
    isShowExtend?: boolean
}
export const NewCodecEditorBody: React.FC<NewCodecEditorBodyProps> = (props) => {
    const {
        title,
        require,
        extend,
        onExtend,
        onClose,
        isShowExtend,
        disabled,
        value = "",
        editorValue,
        setEditorValue,
        onChange
    } = props

    // Editor Instance
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    // Editor Focus State
    const [editorFocus, setEditorFocus] = useState<boolean>(false)
    // Editor
    useEffect(() => {
        if (reqEditor) {
            // Add Focus Gained Listener
            reqEditor.onDidFocusEditorText(() => {
                setEditorFocus(true)
            })
            // Add Focus Lost Listener
            reqEditor.onDidBlurEditorText(() => {
                setEditorFocus(false)
            })
        }
    }, [reqEditor])

    useEffect(() => {
        // On Popup Editor Change
        if (reqEditor && reqEditor.getValue() !== editorValue) {
            reqEditor.setValue(editorValue)
        }
    }, [reqEditor, editorValue])

    const onFocusEditor = useMemoizedFn(() => {
        if (disabled) return
        reqEditor && reqEditor.focus()
    })

    const onOperate = useMemoizedFn((e) => {
        e.stopPropagation()
        if (disabled) return
        if (extend) {
            onClose && onClose()
        } else {
            onExtend && onExtend()
        }
    })

    const editorContChange = useDebounceFn(
        (content) => {
            setEditorValue(content)
        },
        {wait: 100}
    ).run

    return (
        <div
            className={classNames(styles["new-codec-editor"], {
                [styles["new-codec-editor-no-extend"]]: !extend,
                [styles["new-codec-editor-extend"]]: extend,
                [styles["new-codec-editor-focus"]]: editorFocus
            })}
            onClick={onFocusEditor}
        >
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    {title}
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
                <div className={styles["extra"]}>
                    <div
                        className={classNames(styles["apply"], {
                            [styles["apply-disabled"]]: editorValue === value || disabled
                        })}
                        onClick={(e) => {
                            e.stopPropagation()
                            onChange && onChange(editorValue)
                        }}
                    >
                        Save
                    </div>
                    <Divider
                        type={"vertical"}
                        style={extend ? {margin: "4px 10px 0px 14px"} : {margin: "4px 4px 0px 8px"}}
                    />
                    <div
                        className={classNames(styles["expand-box"], {
                            [styles["expand-hover-box"]]: !disabled,
                            [styles["expand-disabled-box"]]: disabled
                        })}
                        onClick={onOperate}
                    >
                        {extend ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                    </div>
                </div>
            </div>
            <div className={styles["editor-box"]}>
                <YakitEditor
                    type='codec'
                    editorDidMount={(editor) => {
                        setReqEditor(editor)
                    }}
                    disabled={disabled}
                    value={editorValue}
                    setValue={editorContChange}
                />
            </div>
        </div>
    )
}

export interface NewCodecEditorProps {
    // Title
    title?: string
    // Value
    value?: string
    // Value Change Callback
    onChange?: (v: string) => void
    // Required?
    require?: boolean
    // Disabled
    disabled?: boolean
}
export const NewCodecEditor: React.FC<NewCodecEditorProps> = (props) => {
    const {value = "", onChange} = props
    const [editorValue, setEditorValue] = useState<string>("")
    // Popup Open?
    const [isShowExtend, setShowExtend] = useState<boolean>(false)
    useEffect(() => {
        setEditorValue(value)
    }, [value])

    // Auto Save
    useEffect(() => {
        const id = setInterval(() => {
            if (editorValue !== value) {
                onChange && onChange(editorValue)
            }
        }, 5000)
        return () => {
            clearInterval(id)
        }
    }, [editorValue, value, onChange])

    return (
        <>
            <NewCodecEditorBody
                isShowExtend={isShowExtend}
                editorValue={editorValue}
                setEditorValue={setEditorValue}
                extend={false}
                onExtend={() => setShowExtend(true)}
                {...props}
            />
            {isShowExtend && (
                <YakitModal
                    title={null}
                    footer={null}
                    width={1200}
                    type={"white"}
                    closable={false}
                    maskClosable={false}
                    hiddenHeader={true}
                    visible={isShowExtend}
                    bodyStyle={{padding: 0}}
                >
                    <NewCodecEditorBody
                        extend={true}
                        onClose={() => {
                            setShowExtend(false)
                        }}
                        editorValue={editorValue}
                        setEditorValue={(str) => {
                            setEditorValue(str)
                        }}
                        {...props}
                    />
                </YakitModal>
            )}
        </>
    )
}
