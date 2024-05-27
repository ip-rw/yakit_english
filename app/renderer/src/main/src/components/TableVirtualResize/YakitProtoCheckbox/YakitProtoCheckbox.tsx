import React, {useState} from "react"
import styles from "./YakitProtoCheckbox.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"

export interface YakitProtoCheckboxProps {
    checked?: boolean
    indeterminate?: boolean
    onChange?: (e) => void
    disabled?: boolean
    wrapperClassName?: string
    wrapperStyle?: React.CSSProperties
}
/**
 * @description: Native Checkbox
 */
export const YakitProtoCheckbox: React.FC<YakitProtoCheckboxProps> = React.memo((props) => {
    const {wrapperClassName, indeterminate, wrapperStyle,...resProps} = props
    const [focus, setFocus] = useState<boolean>(false)

    return (
        <label
            className={classNames(styles["yakit-proto-checkbox-wrapper"], wrapperClassName)}
            style={{...wrapperStyle}}
        >
            <span
                className={classNames(styles["yakit-proto-checkbox"], {
                    [styles["yakit-checkbox-checked"]]: props.checked,
                    [styles["yakit-proto-checkbox-focus"]]: focus,
                    [styles["yakit-checkbox-checked-focus"]]: props.checked && focus,
                    [styles["yakit-checkbox-indeterminate"]]: indeterminate,
                    [styles["yakit-checkbox-disabled"]]: props.disabled
                })}
            >
                <input
                    {...resProps}
                    type='checkbox'
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    className={classNames(styles["yakit-checkbox-input"])}
                />
                <span className={classNames(styles["yakit-proto-checkbox-inner"])}></span>
            </span>
        </label>
    )
})
