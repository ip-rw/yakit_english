import {SegmentedProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

/**
 * @description: Segmenter Props
 * @property {string} wrapperClassName
 * @property {SizeType} size: Size
 */
interface YakitSegmentedProps extends SegmentedProps {
    wrapClassName?: string
    size?: SizeType
}
