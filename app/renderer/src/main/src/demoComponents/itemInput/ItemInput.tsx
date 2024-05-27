import React, {memo, useMemo} from "react"
import {Form} from "antd"
import {
    ItemAutoCompleteProps,
    ItemInputDraggerPathProps,
    ItemInputFloatProps,
    ItemInputIntegerProps,
    ItemInputProps,
    ItemTextAreaProps
} from "./ItemInputType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"

const {Item} = Form

/** @name - Input Field */
export const DemoItemInput: React.FC<ItemInputProps> = memo((p) => {
    const {
        label,
        help,
        formItemStyle,
        required,
        placeholder,
        disable,
        width,
        allowClear,
        type,
        prefix,
        suffix,
        isBubbing,
        value,
        setValue
    } = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitInput
                style={{width: width || "100%"}}
                disabled={!!disable}
                placeholder={placeholder}
                allowClear={allowClear}
                type={type}
                value={value}
                onChange={(e) => {
                    if (isBubbing) e.stopPropagation()
                    setValue && setValue(e.target.value)
                }}
                prefix={prefix}
                suffix={suffix}
                onPressEnter={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
                onFocus={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
                onClick={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
            />
        </Item>
    )
})

/** @name - Text Area */
export const DemoItemTextArea: React.FC<ItemTextAreaProps> = memo((p) => {
    const {
        label,
        help,
        formItemStyle,
        required,
        placeholder,
        disable,
        width,
        allowClear,
        textareaRow,
        autoSize,
        isBubbing,
        value,
        setValue
    } = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitInput.TextArea
                style={{width: width || "100%"}}
                rows={textareaRow}
                autoSize={autoSize}
                disabled={!!disable}
                placeholder={placeholder}
                allowClear={allowClear}
                value={value}
                onChange={(e) => {
                    if (isBubbing) e.stopPropagation()
                    setValue && setValue(e.target.value)
                }}
                onPressEnter={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
                onFocus={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
                onClick={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
            />
        </Item>
    )
})

/** @name - Tooltip Input Field */
export const DemoItemAutoComplete: React.FC<ItemAutoCompleteProps> = memo((p) => {
    const {
        label,
        help,
        formItemStyle,
        required,
        placeholder,
        disable,
        width,
        allowClear,
        autoComplete,
        isBubbing,
        value,
        setValue
    } = p

    const autoOptions = useMemo(() => {
        if (!autoComplete) return []
        else {
            try {
                return autoComplete.map((item) => {
                    return {label: item, value: item}
                })
            } catch (error) {
                return []
            }
        }
    }, [autoComplete])

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitAutoComplete
                style={{width: width || "100%"}}
                disabled={!!disable}
                placeholder={placeholder}
                allowClear={allowClear}
                value={value}
                onChange={(value) => {
                    setValue && setValue(value)
                }}
                onFocus={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
                onClick={(e) => {
                    if (isBubbing) e.stopPropagation()
                }}
                options={autoOptions}
            />
        </Item>
    )
})

/** @name - Numeric Field (Integer)) */
export const DemoItemInputInteger: React.FC<ItemInputIntegerProps> = memo((p) => {
    const {label, help, formItemStyle, required, width, size, min, max, defaultValue, disable, value, setValue} = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitInputNumber
                style={{width: width || "100%"}}
                disabled={disable}
                defaultValue={defaultValue}
                size={size}
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(e) => setValue && setValue(e as number)}
            />
        </Item>
    )
})

/** @name - Numeric Field (Float)) */
export const DemoItemInputFloat: React.FC<ItemInputFloatProps> = memo((p) => {
    const {
        label,
        help,
        formItemStyle,
        required,
        width,
        size,
        min,
        max,
        defaultValue,
        disable,
        precision = 2,
        value,
        setValue
    } = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitInputNumber
                style={{width: width || "100%"}}
                disabled={disable}
                defaultValue={defaultValue}
                size={size}
                min={min}
                max={max}
                precision={precision}
                step={0.01}
                value={value}
                onChange={(e) => setValue && setValue(e as number)}
            />
        </Item>
    )
})

/**
 * @name - File Path Field
 * @description File/Folder Drag-and-Drop Support, setContent for Files Only
 */
export const DemoItemInputDraggerPath: React.FC<ItemInputDraggerPathProps> = memo((p) => {
    const {
        label,
        help,
        formItemStyle,
        required,
        renderType = "input",
        selectType,
        placeholder,
        disable,
        width,
        allowClear,
        size,
        textareaRow,
        autoSize,
        value,
        setValue
    } = p

    return (
        <YakitFormDragger
            formItemProps={{
                label: label,
                help: help,
                style: {...formItemStyle},
                required: required
            }}
            // multiple={false}
            // maxCount={1}
            // showUploadList={false}
            value={value}
            onChange={setValue}
            selectType={selectType}
            renderType={renderType}
            inputProps={{
                style: {width: width || "100%"},
                size: size as any,
                disabled: !!disable,
                placeholder: placeholder,
                allowClear: allowClear
            }}
            textareaProps={{
                style: {width: width || "100%"},
                disabled: !!disable,
                placeholder: placeholder,
                allowClear: allowClear,
                rows: textareaRow,
                autoSize: autoSize
            }}
        />
    )
})
