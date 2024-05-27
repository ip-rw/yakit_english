import {SelectProps} from "antd"
import {OptionProps} from "rc-select/lib/Option"
import {ReactNode} from "react"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {CacheDataHistoryProps, YakitOptionTypeProps} from "../utils"
import {BaseSelectRef} from "rc-select"
import {BaseOptionType, DefaultOptionType} from "antd/lib/select"
import {type} from "os"

/**
 * @description: YakitSelectProps
 * @Inherits SelectProps Default props
 * @param {string} wrapperClassName Decorator div className
 * @param {CSSProperties} wrapperStyle Decorator div style
 * @param {string} cacheHistoryDataKey Cache data key value
 * @param {number} cacheHistoryListLength Cache data list length
 * @param {OptionType} defaultOptions 
 * @param {boolean} isCacheDefaultValue false caches default, not shown on page
 */

export interface YakitSelectProps<
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType | YakitOptionTypeProps = DefaultOptionType
> extends SelectProps {
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
    size?: YakitSizeType
    /**@name Cache data key */
    cacheHistoryDataKey?: string
    /**@name Cache data list length*/
    cacheHistoryListLength?: number
    defaultOptions?: OptionType
    /** false caches default value, not shown on page */
    isCacheDefaultValue?: boolean
}
export interface YakitSelectOptionProps extends OptionProps {}

export interface YakitSelectCacheDataHistoryProps extends Omit<CacheDataHistoryProps, "options", "defaultValue"> {
    options?: OptionType
    defaultValue: string[]
}

export interface YakitBaseSelectRef {
    onSetRemoteValues: (s: string[]) => void
    onGetRemoteValues: () => void
}

export interface YakitDefaultOptionType extends DefaultOptionType {
    tabLable?: React.ReactNode
}
