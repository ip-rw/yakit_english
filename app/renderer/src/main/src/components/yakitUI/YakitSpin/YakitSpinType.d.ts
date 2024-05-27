import {SpinProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

/**
 * @description Properties of YakitAutoCompleteProps
 * @augments YakitSpinProps Inherits default SpinProps from antd
 */
export interface YakitSpinProps extends Omit<SpinProps, "className"> {
    ref?: any
}
