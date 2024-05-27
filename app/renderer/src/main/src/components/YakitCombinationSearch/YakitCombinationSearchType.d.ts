import {YakitSelectProps} from "../yakitUI/YakitSelect/YakitSelectType"
interface OptionProps {
    label: string
    value: string | number
}
/**
 * @description Combo search
 * @param {"input" | "select"} afterModuleType Right component type, supports two
 * @param {number} beforeOptionWidth Left dropdown width
 * @param {string | number} valueBeforeOption Left dropdown value
 * @param {OptionProps[]} valueBeforeOption Left dropdown option
 * @param {(o: string) => void} onSelectBeforeOption Left dropdown select event
 * @param {string} wrapperClassName Outer class
 * @param {YakitSelectProps} selectProps Left dropdown props
 * @param {YakitInputSearchProps} inputSearchModuleTypeProps afterModuleType=input, inputProps
 * @param {YakitSelectProps} selectModuleTypeProps afterModuleType=select, inputProps
 */
export interface YakitCombinationSearchProps extends Omit<InputProps, "size"> {
    afterModuleType?: "input" | "select"
    beforeOptionWidth?: number
    valueBeforeOption?: string | number
    addonBeforeOption?: OptionProps[]
    onSelectBeforeOption?: (o: string) => void
    wrapperClassName?: string
    selectProps?: YakitSelectProps
    inputSearchModuleTypeProps?: YakitInputSearchProps
    selectModuleTypeProps?: SelectModuleTypeProps
}

interface SelectModuleTypeProps extends YakitSelectProps {
    data?: any[]
    optText?: string
    optValue?: string
    optKey?: string
    optDisabled?: string
    renderOpt?: (info: any) => ReactNode
}
