import {Upload, Form, Spin, Divider} from "antd"
import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {
    FileDraggerProps,
    YakitDraggerContentProps,
    YakitDraggerProps,
    YakitFormDraggerContentProps,
    YakitFormDraggerProps
} from "./YakitFormType.d"
import styles from "./YakitForm.module.scss"
import classNames from "classnames"
import {YakitInput} from "../YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {failed, yakitNotify} from "@/utils/notification"
import {OutlineUploadIcon} from "@/assets/icon/outline"
import {YakitAutoComplete} from "../YakitAutoComplete/YakitAutoComplete"

const {Dragger} = Upload

const {ipcRenderer} = window.require("electron")

/**Meets Accepted File Types? */
const isAcceptEligible = (path: string, accept?: string) => {
    const index = path.lastIndexOf(".")
    const fileType = path.substring(index, path.length)
    if (accept === ".*") {
        return index === -1 ? false : true
    }
    return accept ? accept.split(",").includes(fileType) : true
}

/**
 * @description:YakitFormDragger File Drag-and-Drop in Form, Folder Drag Not Supported
 * @augments YakitFormDraggerProps Inherits DraggerProps from antd & YakitDraggerProps
 */
export const YakitFormDragger: React.FC<YakitFormDraggerProps> = React.memo((props) => {
    const {formItemProps = {}, size, formItemClassName, ...restProps} = props
    return (
        <Form.Item
            {...formItemProps}
            className={classNames(
                styles["form-label-middle"],
                {
                    [styles["form-label-small"]]: size === "small",
                    [styles["form-label-large"]]: size === "large"
                },
                formItemClassName
            )}
        >
            <YakitDragger size={size} {...restProps} />
        </Form.Item>
    )
})

/**
 * @description:YakitDragger Drag Support: File/Folder File Path Includes Only Top-Level Folder or File, Excludes Sub-directory File Counts;
 * @description Use YakitDraggerContent to Display File Content
 * @augments YakitDraggerProps 
 * eg:  <YakitFormDraggerContent
        className={styles["plugin-execute-form-item"]}
        formItemProps={{
             name: "Input",
             label: "Scan Target",
             rules: [{required: true}]
        }}
        accept='.txt,.xlsx,.xls,.csv'
        textareaProps={{
            placeholder: "Enter Scan Targets, Separate Multiple with“English Comma”Or New Line Separated"
        }}
        help='Drag TXT, Excel files here or'
        disabled={disabled}
    />
 */
export const YakitDragger: React.FC<YakitDraggerProps> = React.memo((props) => {
    const {
        size,
        inputProps = {},
        help = "Drag Files Here or Click",
        value: fileName,
        onChange: setFileName,
        setContent,
        showDefHelp = true,
        selectType = "file",
        renderType = "input",
        textareaProps = {},
        autoCompleteProps = {},
        disabled,
        isShowPathNumber = true,
        multiple,
        showFailedFlag = true
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [name, setName] = useState<string>("")
    /**File Processing */
    const getContent = useMemoizedFn((path: string, fileType: string) => {
        if (!path) {
            failed("Enter Path")
            return
        }
        const index = path.lastIndexOf(".")

        if (selectType === "file" && index === -1) {
            failed("Enter Valid Path")
            return
        }

        if (props.accept && !props.accept.split(",").includes(fileType)) {
            failed(`Supports Only${props.accept}File Format`)
            return
        }
        // Set Name
        if (setFileName) {
            setFileName(path)
        }
        if (selectType === "file" && setContent) {
            setUploadLoading(true)
            ipcRenderer
                .invoke("fetch-file-content", path)
                .then((res) => {
                    setContent(res)
                })
                .catch((err) => {
                    failed("Data Retrieval Failed：" + err)
                    setContent("")
                })
                .finally(() => setTimeout(() => setUploadLoading(false), 200))
        }
    })

    const renderContentValue = useMemoizedFn(() => {
        switch (renderType) {
            case "textarea":
                return (
                    <YakitInput.TextArea
                        placeholder='Path Supports Manual Entry, Separate Multiple with Comma'
                        value={fileName || name}
                        disabled={disabled}
                        {...textareaProps}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (setFileName) setFileName(e.target.value)
                            if (textareaProps.onChange) textareaProps.onChange(e)
                            e.stopPropagation()
                        }}
                        onPressEnter={(e) => {
                            e.stopPropagation()
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                showFailedFlag && failed("Enter Valid Path")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (textareaProps.onPressEnter) textareaProps.onPressEnter(e)
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (textareaProps.onFocus) textareaProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (textareaProps.onClick) textareaProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                showFailedFlag && failed("Enter Valid Path")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (textareaProps.onBlur) textareaProps.onBlur(e)
                        }}
                    />
                )
            case "autoComplete":
                return (
                    <YakitAutoComplete
                        placeholder='Path Manual Entry Supported'
                        value={fileName || name}
                        disabled={disabled}
                        {...autoCompleteProps}
                        onChange={(value, option) => {
                            setName(value)
                            if (setFileName) setFileName(value)
                            if (autoCompleteProps.onChange) autoCompleteProps.onChange(value, option)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation()
                                const index = name.lastIndexOf(".")
                                if (selectType === "file" && index === -1) {
                                    showFailedFlag && failed("Enter Valid Path")
                                    return
                                }
                                const type = name.substring(index, name.length)
                                getContent(name, type)
                            }
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (autoCompleteProps.onFocus) autoCompleteProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (autoCompleteProps.onClick) autoCompleteProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                showFailedFlag && failed("Enter Valid Path")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (autoCompleteProps.onBlur) autoCompleteProps.onBlur(e)
                        }}
                    />
                )
            default:
                return (
                    <YakitInput
                        placeholder='Path Supports Manual Entry, Separate Multiple with Comma'
                        size={size}
                        value={fileName || name}
                        disabled={disabled}
                        {...inputProps}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (setFileName) setFileName(e.target.value)
                            if (inputProps.onChange) inputProps.onChange(e)
                            e.stopPropagation()
                        }}
                        onPressEnter={(e) => {
                            e.stopPropagation()
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                showFailedFlag && failed("Enter Valid Path")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (inputProps.onPressEnter) inputProps.onPressEnter(e)
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                            if (inputProps.onFocus) inputProps.onFocus(e)
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (inputProps.onClick) inputProps.onClick(e)
                        }}
                        onBlur={(e) => {
                            e.stopPropagation()
                            if (!name) return
                            const index = name.lastIndexOf(".")
                            if (selectType === "file" && index === -1) {
                                showFailedFlag && failed("Enter Valid Path")
                                return
                            }
                            const type = name.substring(index, name.length)
                            getContent(name, type)
                            if (inputProps.onBlur) inputProps.onBlur(e)
                        }}
                    />
                )
        }
    })

    const renderContent = useMemoizedFn((helpNode: ReactNode) => {
        return (
            <Spin spinning={uploadLoading}>
                {renderContentValue()}
                <div
                    className={classNames(styles["dragger-help-middle"], {
                        [styles["dragger-help-small"]]: size === "small",
                        [styles["dragger-help-large"]]: size === "large"
                    })}
                >
                    {(showDefHelp && <>{helpNode}</>) || <></>}
                </div>
            </Spin>
        )
    })
    /**
     * @description Select Folder
     */
    const onUploadFolder = useMemoizedFn(() => {
        if (disabled) return
        const properties = ["openDirectory"]
        if (multiple !== false) {
            properties.push("multiSelections")
        }
        ipcRenderer
            .invoke("openDialog", {
                title: "Choose Folder",
                properties
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, "\\")).join(",")
                    // Set Name
                    if (setFileName) setFileName(absolutePath)
                }
            })
    })
    /**Choose File */
    const onUploadFile = useMemoizedFn(() => {
        if (disabled) return
        const properties = ["openFile"]
        if (multiple !== false) {
            properties.push("multiSelections")
        }
        ipcRenderer
            .invoke("openDialog", {
                title: "Select File",
                properties
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength) {
                    const absolutePath: string[] = []
                    data.filePaths.forEach((p) => {
                        const path = p.replace(/\\/g, "\\")
                        if (isAcceptEligible(path, props.accept || ".*")) {
                            absolutePath.push(path)
                        }
                    })
                    // Set Name
                    if (setFileName) setFileName(absolutePath.join(","))
                }
            })
    })
    /**Drag-and-Drop Folder Path Echo Text Processing */
    const afterFolderDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        let isNoFit: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", "Multi-select Not Supported")
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            const number = path.lastIndexOf(".")
            if (number !== -1) {
                isNoFit.push(path)
            } else {
                paths.push(path)
            }
        }
        if (isNoFit.length > 0) {
            yakitNotify("error", "Automatically Filtered Ineligible Data")
        }
        if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(","))
    })
    /**Drag File Processing */
    const afterFileDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        let isNoFit: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", "Multi-select Not Supported")
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            if (isAcceptEligible(path, props.accept || ".*")) {
                paths.push(path)
            } else {
                isNoFit.push(path)
            }
        }
        if (isNoFit.length > 0) {
            yakitNotify("error", "Automatically Filtered Ineligible Data")
        }
        if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(","))
    })
    /**Drag File/Folder Path Echo */
    const afterAllDrop = useMemoizedFn((e) => {
        const {files = []} = e.dataTransfer
        let paths: string[] = []
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
            yakitNotify("error", "Multi-select Not Supported")
            return
        }
        for (let index = 0; index < filesLength; index++) {
            const element = files[index]
            const path = element.path || ""
            paths.push(path)
        }
        if (setFileName) setFileName(paths.join(","))
    })
    const fileNumber = useMemo(() => {
        let arr: string[] = []
        try {
            const path = fileName || name
            arr = path ? path.split(",") : []
        } catch (error) {
            yakitNotify("error", "File Path Count Error, Separate with Comma")
        }
        return arr.length
    }, [fileName, name])
    return (
        <>
            {selectType === "file" && (
                <FileDragger onDrop={afterFileDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    Upload File
                                </span>
                            </span>
                            {isShowPathNumber && (
                                <span>
                                    Detected<span className={styles["dragger-help-number"]}>{fileNumber}</span>File Paths
                                </span>
                            )}
                        </div>
                    )}
                </FileDragger>
            )}
            {selectType === "folder" && (
                <FileDragger onDrop={afterFolderDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    Upload Folder
                                </span>
                            </span>
                            {isShowPathNumber && (
                                <span>
                                    Detected<span className={styles["dragger-help-number"]}>{fileNumber}</span>File Paths
                                </span>
                            )}
                        </div>
                    )}
                </FileDragger>
            )}
            {selectType === "all" && (
                <FileDragger onDrop={afterAllDrop}>
                    {renderContent(
                        <div className={styles["form-item-help"]}>
                            <span>
                                {help}
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFile()
                                    }}
                                >
                                    Upload File
                                </span>
                                <Divider type='vertical' />
                                <span
                                    className={classNames(styles["dragger-help-active"], {
                                        [styles["dragger-help-active-disabled"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUploadFolder()
                                    }}
                                >
                                    Upload Folder
                                </span>
                            </span>

                            {isShowPathNumber && (
                                <span>
                                    Detected<span className={styles["dragger-help-number"]}>{fileNumber}</span>File Paths
                                </span>
                            )}
                        </div>
                    )}
                </FileDragger>
            )}
        </>
    )
})
/**Displays File Content, Not Path; File Selection Only */
export const YakitDraggerContent: React.FC<YakitDraggerContentProps> = React.memo((props) => {
    const {
        value,
        disabled,
        size,
        textareaProps = {},
        onChange,
        help,
        showDefHelp,
        fileLimit = 1024,
        valueSeparator = ",",
        ...restProps
    } = props
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const renderContent = useMemoizedFn((helpNode: ReactNode) => {
        return (
            <Spin spinning={uploadLoading}>
                <YakitInput.TextArea
                    placeholder='Path Supports Manual Entry, Separate Multiple with Comma'
                    value={value}
                    disabled={disabled}
                    {...textareaProps}
                    onChange={(e) => {
                        if (onChange) onChange(e.target.value)
                        if (textareaProps.onChange) textareaProps.onChange(e)
                        e.stopPropagation()
                    }}
                    onPressEnter={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onPressEnter) textareaProps.onPressEnter(e)
                    }}
                    onFocus={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onFocus) textareaProps.onFocus(e)
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onClick) textareaProps.onClick(e)
                    }}
                    onBlur={(e) => {
                        e.stopPropagation()
                        if (textareaProps.onBlur) textareaProps.onBlur(e)
                    }}
                />
                <div
                    className={classNames(styles["dragger-help-middle"], {
                        [styles["dragger-help-small"]]: size === "small",
                        [styles["dragger-help-large"]]: size === "large"
                    })}
                >
                    {helpNode}
                </div>
            </Spin>
        )
    })
    /**Eligible File, Read Content */
    const onHandlerFile = useMemoizedFn((item: {size: number; path: string}) => {
        if (item.size / 1024 > fileLimit) {
            yakitNotify("error", `File Size Cannot Exceed${fileLimit}KB`)
            return
        }
        const path = item.path.replace(/\\/g, "\\")
        if (isAcceptEligible(path, props.accept || ".*")) {
            onGetContent(path)
        } else {
            yakitNotify("error", "File Type Unsupported")
        }
    })
    /**Drag File Processing */
    const afterFileDrop = useMemoizedFn((e) => {
        if (disabled) return
        const {files = []} = e.dataTransfer
        const filesLength = files.length
        if (filesLength > 1) {
            yakitNotify("error", "Multi-file Select Picks One")
        }
        if (filesLength > 0) {
            const item = files[0]
            onHandlerFile(item)
        }
    })
    /**Choose File */
    const onUploadFile = useMemoizedFn((e) => {
        e.stopPropagation()
        if (disabled) return
        ipcRenderer
            .invoke("openDialog", {
                title: "Select File",
                properties: ["openFile"]
            })
            .then((data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength === 1) {
                    const path: string = data.filePaths[0].replace(/\\/g, "\\")
                    ipcRenderer
                        .invoke("fetch-file-info-by-path", path)
                        .then((fileInfo) => {
                            onHandlerFile({
                                size: fileInfo.size,
                                path
                            })
                        })
                        .catch((err) => {
                            yakitNotify("error", "File Data Read Error:" + err)
                        })
                } else if (filesLength > 1) {
                    yakitNotify("error", "Single File Upload Only")
                }
            })
    })
    /**Get File Content by Path */
    const onGetContent = useMemoizedFn((path: string) => {
        setUploadLoading(true)
        ipcRenderer
            .invoke("fetch-file-content", path)
            .then((res: string | {name: string; data: string[]}[]) => {
                if (Array.isArray(res)) {
                    // Table File Reads
                    let data: string[] = []
                    res.forEach((element) => {
                        data = data.concat(element.data)
                    })
                    const value = data.join(valueSeparator)
                    if (onChange) onChange(value)
                } else {
                    // Other File Reads
                    if (onChange) onChange(res)
                }
            })
            .catch((err) => {
                failed("Data Retrieval Failed：" + err)
            })
            .finally(() => setTimeout(() => setUploadLoading(false), 200))
    })
    return (
        <>
            <Dragger
                onDrop={afterFileDrop}
                {...restProps}
                disabled={disabled}
                showUploadList={false}
                directory={false}
                multiple={false}
                className={classNames(styles["yakit-dragger"], props.className)}
                beforeUpload={() => {
                    return false
                }}
            >
                {renderContent(
                    <div className={classNames(styles["form-item-help"], styles["form-item-content-help"])}>
                        <label>
                            {help ? help : showDefHelp ? "Drag Files Here or" : ""}
                            <span
                                className={classNames(styles["dragger-help-active"], {
                                    [styles["dragger-help-active-disabled"]]: disabled
                                })}
                                onClick={onUploadFile}
                            >
                                <OutlineUploadIcon className={styles["upload-icon"]} /> Click here
                            </span>
                            Upload
                        </label>
                    </div>
                )}
            </Dragger>
        </>
    )
})

/**Form Item Displays File Content, Not Path; File Selection Only */
export const YakitFormDraggerContent: React.FC<YakitFormDraggerContentProps> = React.memo((props) => {
    const {formItemProps = {}, size, formItemClassName, ...restProps} = props
    return (
        <Form.Item
            {...formItemProps}
            className={classNames(
                styles["form-label-middle"],
                {
                    [styles["form-label-small"]]: size === "small",
                    [styles["form-label-large"]]: size === "large"
                },
                formItemClassName
            )}
        >
            <YakitDraggerContent {...restProps} size={size} />
        </Form.Item>
    )
})

const FileDragger: React.FC<FileDraggerProps> = React.memo((props) => {
    const {disabled, multiple, onDrop, className, children} = props
    return (
        <div
            onDropCapture={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (disabled) return
                const {files = []} = e.dataTransfer
                const filesLength = files.length
                if (multiple === false && filesLength > 1) {
                    yakitNotify("error", "Multi-select Not Allowed")
                    return
                }
                if (onDrop) onDrop(e)
            }}
            className={classNames(styles["yakit-dragger"], className)}
        >
            {children}
        </div>
    )
})
