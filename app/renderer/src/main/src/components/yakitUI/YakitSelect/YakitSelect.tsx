import {Select} from "antd"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    YakitBaseSelectRef,
    YakitDefaultOptionType,
    YakitSelectCacheDataHistoryProps,
    YakitSelectProps
} from "./YakitSelectType"
import styles from "./YakitSelect.module.scss"
import classNames from "classnames"
import {BaseOptionType} from "antd/lib/select"
import {YakitTag} from "../YakitTag/YakitTag"
import {ChevronDownIcon, ChevronUpIcon} from "@/assets/newIcon"
import {useInViewport, useMemoizedFn} from "ahooks"
import {CacheDataHistoryProps, YakitOptionTypeProps, onGetRemoteValuesBase, onSetRemoteValuesBase} from "../utils"
import {setRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"
import {OutlineCheckIcon, OutlineXIcon} from "@/assets/icon/outline"

const {Option, OptGroup} = Select

/**
 * @Dropdown Select
 * @augments SwitchProps: Inherits SelectProps from antd
 * @param {string} wrapperClassName: Switch wrapper className
 * @param {CSSProperties} Single-select
 */
export const YakitSelectCustom = <ValueType, OptionType>(
    {
        className,
        size = "middle",
        wrapperClassName = "",
        wrapperStyle,
        cacheHistoryDataKey = "",
        isCacheDefaultValue = true,
        cacheHistoryListLength = 10,
        defaultOptions,
        ...props
    }: YakitSelectProps<OptionType>,
    ref: React.Ref<YakitBaseSelectRef>
) => {
    const selectRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(selectRef)
    // Label Mode: Label = Value ×
    const [mouseEnterItem, setMouseEnterItem] = useState<string>("")
    const [show, setShow] = useState<boolean>(false)
    const [cacheHistoryData, setCacheHistoryData] = useState<YakitSelectCacheDataHistoryProps>({
        options: [],
        defaultValue: []
    })
    useEffect(() => {
        if (cacheHistoryDataKey && inViewport) onGetRemoteValues()
    }, [cacheHistoryDataKey, inViewport])
    useImperativeHandle(
        ref,
        () => ({
            onSetRemoteValues: (value: string[]) => {
                const newValue = value.length > 0 ? value : props.value
                onSetRemoteValues(newValue)
            },
            onGetRemoteValues: () => {
                return cacheHistoryData
            }
        }),
        [cacheHistoryData, props.value]
    )
    /**@Cache data getter */
    const onSetRemoteValues = useMemoizedFn((newValue: string[]) => {
        if (!cacheHistoryDataKey) return
        if (props.mode === "tags") {
            // Cache not supported
            const cacheHistoryDataValues: string[] = cacheHistoryData.options.map((ele) => ele.value)
            const addValue = newValue.filter((ele) => !cacheHistoryDataValues.includes(ele))
            const newOption = [
                ...addValue.map((item) => ({value: item, label: item})),
                ...cacheHistoryData.options
            ].filter((_, index) => index < cacheHistoryListLength)
            const cacheHistory: CacheDataHistoryProps = {
                defaultValue: newValue.join(","),
                options: newOption
            }
            const cacheData = {
                options: cacheHistory.options,
                defaultValue: isCacheDefaultValue ? cacheHistory.defaultValue : ""
            }
            setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheData))
                .then(() => {
                    // onGetRemoteValues()
                    setCacheHistoryData({
                        defaultValue: newValue,
                        options: newOption
                    })
                })
                .catch((e) => {
                    yakitNotify("error", `${cacheHistoryDataKey}Cache save error:` + e)
                })
        } else if (props.mode === "multiple") {
            // Multi-select;Due to menuItemSelectedIcon property;Mainly renders props.label including forced icon
        } else {
            //  deletion not supported
            onSetRemoteValuesBase({cacheHistoryDataKey, newValue: newValue.join(","), isCacheDefaultValue}).then(
                (value: CacheDataHistoryProps) => {
                    // onGetRemoteValues()
                    setCacheHistoryData({
                        defaultValue: value.defaultValue ? value.defaultValue.split(",") : [],
                        options: value.options
                    })
                }
            )
        }
    })
    /**@Get cached data */
    const onGetRemoteValues = useMemoizedFn(() => {
        if (!cacheHistoryDataKey) return
        onGetRemoteValuesBase(cacheHistoryDataKey).then((cacheData) => {
            const value = cacheData.defaultValue ? cacheData.defaultValue.split(",") : []
            let newOption: YakitDefaultOptionType[] = getNewOption(cacheData.options, !!cacheData.firstUse)
            //SetValue outside form
            if (isCacheDefaultValue) {
                if (props.onChange) props.onChange(value, newOption)
            }
            setCacheHistoryData({defaultValue: value, options: newOption as unknown as YakitOptionTypeProps})
        })
    })
    const getNewOption = useMemoizedFn((options, firstUse: boolean) => {
        let newOption: YakitDefaultOptionType[] = []
        if (options.length > 0) {
            newOption = options as YakitDefaultOptionType[]
        } else if (defaultOptions?.length > 0 && firstUse) {
            newOption = (defaultOptions || []) as YakitDefaultOptionType[]
        } else if ((props?.options?.length || 0) > 0) {
            newOption = props.options as YakitDefaultOptionType[]
        }
        return newOption || []
    })
    /**@Delete cache item */
    const delCatchOptionItem = (e: React.MouseEvent<Element, MouseEvent>, item: YakitDefaultOptionType) => {
        e.stopPropagation()
        if (cacheHistoryDataKey) {
            if (props.mode === "tags") {
                const newHistoryList = cacheHistoryData.options.filter((i) => i.value !== item.value)
                const cacheData = {
                    options: newHistoryList,
                    defaultValue: isCacheDefaultValue ? cacheHistoryData.defaultValue.join(",") : ""
                }
                const cacheHistory = {
                    options: newHistoryList,
                    defaultValue: cacheHistoryData.defaultValue
                }
                setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheData))
                    .then(() => {
                        setCacheHistoryData({
                            options: cacheHistory.options,
                            defaultValue: cacheHistory.defaultValue
                        })
                    })
                    .catch((e) => {
                        yakitNotify("error", `${cacheHistoryDataKey}Cache save error:` + e)
                    })
            } else if (props.mode === "multiple") {
                // Cache deletion not supported
            } else {
                // Cache deletion not supported
            }
        }
    }

    const renderItem = (item: YakitDefaultOptionType) => {
        const copyItem = {...item}
        // wrapperStyle: Switch wrapper style
        copyItem.tabLable = item.label

        let showClose = false
        const newValue = props.value ?? ""
        // Label and value often differ here
        if (mouseEnterItem === item.value && !newValue.includes(item.value)) {
            showClose = true
        }

        let showSelectedIcon = false
        if (["tags", "multiple"].includes(props.mode || "") && !showClose && newValue.includes(item.value)) {
            showSelectedIcon = true
        }

        copyItem.label = (
            <div
                className={styles["yakit-option-item"]}
                onMouseEnter={(e) => {
                    setMouseEnterItem(item.value + "")
                }}
                onMouseLeave={() => {
                    setMouseEnterItem("")
                }}
            >
                {copyItem.label}
                <OutlineXIcon
                    style={{
                        display: showClose ? "block" : "none"
                    }}
                    className={styles["option-item-close"]}
                    onClick={(e) => delCatchOptionItem(e, item)}
                />
                <OutlineCheckIcon
                    style={{
                        display: showSelectedIcon ? "block" : "none"
                    }}
                    className={styles["option-item-checked"]}
                />
            </div>
        )
        return copyItem
    }

    // Support cache deletion? Only tags supported
    const supportDelCache = useMemo(() => {
        if (cacheHistoryDataKey) {
            if (props.mode === "tags") {
                return true
            } else if (props.mode === "multiple") {
                // Multi-select: cache deletion not supported
                return false
            } else {
                // Single-select: cache
                return false
            }
        } else {
            return false
        }
    }, [cacheHistoryDataKey, props.mode])

    let extraProps: {defaultValue?: string[]; options?: YakitDefaultOptionType[]} = {}
    if (!props.children) {
        const renderNewOptions = [...cacheHistoryData.options]
        // Hover item: to display or not<></>, input value selected, due to antd limit, filtered option still in dropdown
        if (supportDelCache && Array.isArray(props.value)) {
            props.value.forEach((value) => {
                const exists = renderNewOptions.some((item) => item.value === value)
                if (!exists) {
                    renderNewOptions.push({label: value, value: value})
                }
            })
        }
        extraProps = {
            ...extraProps,
            options: supportDelCache
                ? renderNewOptions.map((item) => renderItem(item))
                : getNewOption(cacheHistoryData.options, true),
            defaultValue: cacheHistoryData.defaultValue
        }
    }
    return (
        <div
            ref={selectRef}
            className={classNames(
                "ant-select",
                "ant-select-in-form-item",
                styles["yakit-select"],
                {
                    [styles["yakit-select-wrapper-tags"]]: props.mode === "tags" || props.mode === "multiple",
                    [styles["yakit-select-large"]]: size === "large",
                    [styles["yakit-select-middle"]]: size === "middle",
                    [styles["yakit-select-small"]]: size === "small"
                },
                wrapperClassName
            )}
            style={wrapperStyle}
        >
            <Select
                suffixIcon={
                    show ? (
                        <ChevronUpIcon className={styles["yakit-select-icon"]} />
                    ) : (
                        <ChevronDownIcon className={styles["yakit-select-icon"]} />
                    )
                }
                tagRender={(props) => {
                    const tabEle =
                        extraProps.options?.find((item) => item.value === props.value)?.tabLable || props.label
                    return (
                        <YakitTag size={size} {...props}>
                            <span className='content-ellipsis' style={{width: "100%"}}>
                                {tabEle}
                            </span>
                        </YakitTag>
                    )
                }}
                {...props}
                {...extraProps}
                menuItemSelectedIcon={supportDelCache ? <></> : props.menuItemSelectedIcon}
                size='middle'
                dropdownClassName={classNames(
                    styles["yakit-select-popup"],
                    {
                        [styles["yakit-select-wrapper-tags"]]: props.mode === "tags" || props.mode === "multiple",
                        [styles["yakit-select-popup-y"]]: show
                    },
                    props.dropdownClassName
                )}
                onDropdownVisibleChange={(open) => {
                    setShow(open)
                    if (props.onDropdownVisibleChange) props.onDropdownVisibleChange(open)
                }}
            >
                {props.children}
            </Select>
        </div>
    )
}

export const YakitSelect = React.forwardRef(YakitSelectCustom) as unknown as (<
    ValueType = any,
    OptionType extends BaseOptionType | YakitDefaultOptionType = YakitDefaultOptionType
>(
    props: React.PropsWithChildren<YakitSelectProps<ValueType, OptionType>> & {
        ref?: React.Ref<YakitBaseSelectRef>
    }
) => React.ReactElement) & {
    SECRET_COMBOBOX_MODE_DO_NOT_USE: string
    Option: typeof Option
    OptGroup: typeof OptGroup
}

YakitSelect.Option = Option
YakitSelect.OptGroup = OptGroup
