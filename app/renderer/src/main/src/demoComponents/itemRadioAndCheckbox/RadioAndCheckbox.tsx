import React, {memo} from "react"
import {Checkbox, Form, Radio} from "antd"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {ItemCheckBoxProps, ItemRadioProps} from "./RadioAndCheckboxtype"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

import "../demoStyle.scss"

const {Item} = Form

/** @name Form Item - Radio Group */
export const DemoItemRadio: React.FC<ItemRadioProps> = memo((p) => {
    const {label, help, formItemStyle, required, disabled, size, value, setValue, data} = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <Radio.Group
                className='demo-item-radio-wrapper'
                disabled={disabled}
                size={size}
                value={value}
                onChange={(e) => setValue && setValue(e.target.value)}
                options={data}
            />
        </Item>
    )
})

/** @name Form Item - Radio Button Group */
export const DemoItemRadioButton: React.FC<ItemRadioProps> = memo((p) => {
    const {label, help, formItemStyle, required, disabled, size, value, setValue, data} = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitRadioButtons
                className='demo-item-radio-button-wrapper'
                disabled={disabled}
                size={size}
                value={value}
                onChange={(e) => setValue && setValue(e.target.value)}
                buttonStyle='solid'
                options={data}
            />
        </Item>
    )
})

/** @name Form Item - Checkbox Group */
export const DemoItemCheckBox: React.FC<ItemCheckBoxProps> = memo((p) => {
    const {label, help, formItemStyle, required, disabled, value, setValue, data} = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <Checkbox.Group
                className='demo-item-checkbox-wrapper'
                disabled={disabled}
                value={value}
                onChange={(value) => setValue && setValue(value as string[])}
            >
                {data.map((item) => {
                    return (
                        <YakitCheckbox key={item.value} value={item.value} disabled={item.disabled}>
                            {item.label}
                        </YakitCheckbox>
                    )
                })}
            </Checkbox.Group>
        </Item>
    )
})
