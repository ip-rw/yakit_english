import React, {ReactNode} from "react"
import {Col, Form, FormItemProps, Input, InputProps, Row, Upload, Select} from "antd"
import "@ant-design/compatible/assets/index.css"
import {DraggerProps} from "antd/lib/upload"
import {TextAreaProps} from "antd/lib/input"

import "./FormItemUtil.css"
import {ManyMultiSelectForString} from "../../utils/inputUtil"
import { YakitSelect } from "../yakitUI/YakitSelect/YakitSelect"
import { YakitSelectProps } from "../yakitUI/YakitSelect/YakitSelectType"

const {Item} = Form
const {Dragger} = Upload
const {TextArea} = Input
const {Option} = Select

interface ItemDraggerProps extends DraggerProps {
    className?: string
}
interface ItemExtraProps extends FormItemProps {}
interface ItemInputProps extends InputProps {
    isBubbing?: boolean // Prevent Event Bubbling
    setValue?: (s: string) => any
}
interface ItemTextAreaProps extends TextAreaProps {
    isBubbing?: boolean // Prevent Event Bubbling
    setValue?: (s: string) => any
}
interface ItemSelectProps<T> extends YakitSelectProps<T> {
    ref?: any
    setValue?: (value: any) => any
    data?: T[]
    optText?: string
    optValue?: string
    optKey?: string
    optDisabled?: string
    renderOpt?: (info: T) => ReactNode
}

interface ItemGeneralParams {
    // Item Attributes
    item?: ItemExtraProps
    // Wrap with item Component, false disables prefixNode & suffixNode
    isItem?: boolean
    // Prefix Element in Form-Item
    prefixNode?: ReactNode
    // Prefix Element in Form-Item
    suffixNode?: ReactNode
}

/* Drag-n-Drop Upload, textarea type */
export interface ItemDraggerTextAreaProps extends ItemGeneralParams {
    // Dragger Attributes
    dragger?: ItemDraggerProps
    // Textarea Attributes
    textarea?: ItemTextAreaProps
}
export const ItemDraggerTextArea: React.FC<ItemDraggerTextAreaProps> = (props) => {
    const {
        isItem = true,
        // @ts-ignore
        dragger: {className: DraggerClassName, ...restDragger} = {},
        item = {},
        // @ts-ignore
        textarea: {isBubbing = false, setValue, ...restTextarea} = {},
        prefixNode,
        suffixNode
    } = props

    if (!isItem) {
        return (
            <Dragger
                {...restDragger}
                className={`file-upload-dragger ${DraggerClassName || ""}`}
                // accept={restDragger.accept || "text/plain"}
                accept={restDragger.accept || ""}
            >
                <TextArea
                    {...restTextarea}
                    spellCheck={false}
                    onChange={(e) => {
                        if (restTextarea.onChange) restTextarea.onChange(e)
                        setValue && setValue(e.target.value)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                    onPressEnter={(e) => {
                        if (restTextarea.onPressEnter) restTextarea.onPressEnter(e)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                    onFocus={(e) => {
                        if (restTextarea.onFocus) restTextarea.onFocus(e)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                    onClick={(e) => {
                        if (restTextarea.onClick) restTextarea.onClick(e)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                ></TextArea>
            </Dragger>
        )
    }

    return (
        <Item {...item}>
            <Row gutter={8}>
                <Col span={prefixNode ? 4 : 0}>{prefixNode}</Col>

                <Col span={24 - (prefixNode ? 1 : 0) * 6 - (suffixNode ? 1 : 0) * 6}>
                    <Dragger
                        {...restDragger}
                        className={`file-upload-dragger ${DraggerClassName || ""}`}
                        // accept={restDragger.accept || "text/plain"}
                        accept={restDragger.accept || ""}
                    >
                        <TextArea
                            {...restTextarea}
                            spellCheck={false}
                            onChange={(e) => {
                                if (restTextarea.onChange) restTextarea.onChange(e)
                                setValue && setValue(e.target.value)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onPressEnter={(e) => {
                                if (restTextarea.onPressEnter) restTextarea.onPressEnter(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onFocus={(e) => {
                                if (restTextarea.onFocus) restTextarea.onFocus(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onClick={(e) => {
                                if (restTextarea.onClick) restTextarea.onClick(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                        ></TextArea>
                    </Dragger>
                </Col>

                <Col span={suffixNode ? 4 : 0}>{suffixNode}</Col>
            </Row>
        </Item>
    )
}

/* Drag-n-Drop Upload, input type */
export interface ItemDraggerInputProps extends ItemGeneralParams {
    // Dragger Attributes
    dragger?: ItemDraggerProps
    // Input Attributes
    input?: ItemInputProps
}
export const ItemDraggerInput: React.FC<ItemDraggerInputProps> = (props) => {
    const {
        isItem = true,
        // @ts-ignore
        dragger: {className: DraggerClassName, ...restDragger} = {},
        item = {},
        // @ts-ignore
        input: {isBubbing = false, setValue, ...restInput} = {},
        prefixNode,
        suffixNode
    } = props

    if (!isItem) {
        return (
            <Dragger
                {...restDragger}
                className={`file-upload-dragger ${DraggerClassName || ""}`}
                accept={restDragger.accept === undefined ? "text/plain" : restDragger.accept}
            >
                <Input
                    {...restInput}
                    onChange={(e) => {
                        if (restInput.onChange) restInput.onChange(e)
                        setValue && setValue(e.target.value)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                    onPressEnter={(e) => {
                        if (restInput.onPressEnter) restInput.onPressEnter(e)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                    onFocus={(e) => {
                        if (restInput.onFocus) restInput.onFocus(e)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                    onClick={(e) => {
                        if (restInput.onClick) restInput.onClick(e)
                        if (!!isBubbing) e.stopPropagation()
                    }}
                ></Input>
            </Dragger>
        )
    }

    return (
        <Item {...item}>
            <Row gutter={8}>
                <Col span={prefixNode ? 4 : 0}>{prefixNode}</Col>

                <Col span={24 - (prefixNode ? 1 : 0) * 6 - (suffixNode ? 1 : 0) * 6}>
                    <Dragger
                        {...restDragger}
                        className={`file-upload-dragger ${DraggerClassName || ""}`}
                        accept={restDragger.accept === undefined ? "text/plain" : restDragger.accept}
                    >
                        <Input
                            {...restInput}
                            onChange={(e) => {
                                if (restInput.onChange) restInput.onChange(e)
                                setValue && setValue(e.target.value)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onPressEnter={(e) => {
                                if (restInput.onPressEnter) restInput.onPressEnter(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onFocus={(e) => {
                                if (restInput.onFocus) restInput.onFocus(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onClick={(e) => {
                                if (restInput.onClick) restInput.onClick(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                        ></Input>
                    </Dragger>
                </Col>

                <Col span={suffixNode ? 4 : 0}>{suffixNode}</Col>
            </Row>
        </Item>
    )
}

/* Dropdown Component */
export interface ItemSelectsProps<T> extends ItemGeneralParams {
    // Select Attributes
    select?: ItemSelectProps<T>
}
export const ItemSelects: React.FC<ItemSelectsProps<any>> = (props) => {
    const {
        isItem = true,
        item = {},
        // @ts-ignore
        select: {
            setValue,
            data = [],
            optText = "text",
            optValue = "value",
            optKey,
            optDisabled = "disabled",
            renderOpt,
            ...restSelect
        } = {},
        prefixNode,
        suffixNode
    } = props
    if (!isItem) {
        return (
            <YakitSelect
                {...restSelect}
                onChange={(value, option) => {
                    if (setValue) setValue(value)
                    if (restSelect.onChange) restSelect.onChange(value, option)
                }}
            >
                {data.map((item, index) => {
                    const flag = Object.prototype.toString.call(item) === "[object Object]"
                    const value = flag ? item[optValue] : item
                    const title = flag ? item[optText] : item
                    const key = optKey?item[optText] : null
                    return (
                        <YakitSelect.Option
                            key={key || value || index}
                            value={value}
                            title={title}
                            disabled={item[optDisabled]}
                            record={item}
                        >
                            {!!renderOpt ? renderOpt(item) : item[optText] ? item[optText] : value}
                        </YakitSelect.Option>
                    )
                })}
            </YakitSelect>
        )
    }

    return (
        <Item {...item}>
            <Row gutter={8}>
                <Col span={prefixNode ? 4 : 0}>{prefixNode}</Col>

                <Col span={24 - (prefixNode ? 1 : 0) * 6 - (suffixNode ? 1 : 0) * 6}>
                    <YakitSelect
                        {...restSelect}
                        onChange={(value, option) => {
                            if (setValue) setValue(value)
                            if (restSelect.onChange) restSelect.onChange(value, option)
                        }}
                    >
                        {data.map((item, index) => {
                            const flag = Object.prototype.toString.call(item) === "[object Object]"
                            const value = flag ? item[optValue] : item
                            const title = flag ? item[optText] : item

                            return (
                                <YakitSelect.Option
                                    key={value || index}
                                    value={value}
                                    title={title}
                                    disabled={item[optDisabled]}
                                    record={item}
                                >
                                    {!!renderOpt ? renderOpt(item) : item[optText] ? item[optText] : value}
                                </YakitSelect.Option>
                            )
                        })}
                    </YakitSelect>
                </Col>

                <Col span={suffixNode ? 4 : 0}>{suffixNode}</Col>
            </Row>
        </Item>
    )
}
