import {CollapsePanelProps, CollapseProps} from "antd"
/**
 * @description: YakitSelectProps
 * @augments YakitCollapseProps Inherits default CollapseProps from antd
 */
export interface YakitCollapseProps extends Omit<CollapseProps, "ghost"> {}
/**
 * @description: YakitPanelProps
 * @augments YakitPanelProps Inherits default CollapsePanelProps from antd
 */
export interface YakitPanelProps extends CollapsePanelProps {}
