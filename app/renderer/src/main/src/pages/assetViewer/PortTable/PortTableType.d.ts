import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {ReactNode} from "react"
import {PortAsset} from "../models"
import {QueryPortsRequest} from "../PortAssetPage"

export interface PortTableRefProps {
    /**Built-in Delete Method */
    onRemove: () => Promise
}
export interface PortTableProps {
    ref?: React.ForwardedRef<PortTableRefProps>
    /**Timer Toggle: True On, False Off */
    isStop?: boolean
    isRefresh?: boolean
    setIsRefresh?: (b: boolean) => void
    query: QueryPortsRequest
    setQuery: (t: QueryPortsRequest) => void
    /**Table Header */
    tableTitle?: ReactNode
    /**Table Header Right Actions */
    tableTitleExtraOperate: ReactNode
    /**Table Body Class */
    containerClassName?: string
    /**Table Header Class */
    tableTitleClassName?: string
    /**Section 2, Detail Body Class */
    detailBodyClassName?: string
    btnSize: YakitButtonProp["size"]
    /**Top Real-time Refresh Cache Data */
    offsetDataInTop?: PortAsset[]
    /**Top Real-time Data Refresh Callback */
    setOffsetDataInTop?: (t: PortAsset[]) => void
    /**Selected Rows Callback */
    setSelectNumber?: (n: number) => void
    setTotal?: (n: number) => void
}
