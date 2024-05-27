import {AutoCompleteProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"
import {CacheDataHistoryProps} from "../utils"
import {BaseSelectRef} from "rc-select"

/**
 * @description YakitAutoCompleteProps attributes
 * @augments AutoCompleteProps Inherit antd AutoCompleteProps default props
 * @param {"small" | "middle" | "large" } size Default middle
 * @param {string} cacheHistoryDataKey For caching/getRemoteValue for history data/getRemoteValue, default cache options and defaultValue
 * @param {number} cacheHistoryListLength Cache history list length
 * @param {boolean} isCacheDefaultValue Cache default value
 */
export interface YakitAutoCompleteProps extends AutoCompleteProps {
    size?: "small" | "middle" | "large"
    cacheHistoryDataKey?: string
    cacheHistoryListLength?: number
    /**Cache default value */
    isCacheDefaultValue?: boolean
    ref?: React.ForwardedRef<YakitAutoCompleteRefProps> & Ref<BaseSelectRef>
    /** Initial default value For absent cache value*/
    initValue?: string
}

export interface YakitAutoCompleteRefProps {
    onSetRemoteValues: (s: string) => void
    onGetRemoteValues: () => void
}

export interface YakitAutoCompleteCacheDataHistoryProps extends CacheDataHistoryProps {}
