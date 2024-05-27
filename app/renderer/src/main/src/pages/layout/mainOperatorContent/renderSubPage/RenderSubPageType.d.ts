import { ComponentParams } from "@/routes/newRoute"

/**
 * @description Page Rendering
 * @property routeKey Route Key
 * @property yakScriptId 
 * @property {ComponentParams} params Initial Rendering Params
 */
export interface PageItemProps {
    routeKey: YakitRoute | string
    yakScriptId?: number
    params?: ComponentParams
}

export interface RenderSubPageProps {
    renderSubPage: MultipleNodeInfo[]
    route: YakitRoute
    pluginId?: number
    selectSubMenuId: string
}

export interface RenderFuzzerSequenceProps{
    route: YakitRoute
    type:WebFuzzerType
    setType:(w:WebFuzzerType)=>void
    // fuzzerSequenceList:FuzzerSequenceReducerProps[]
    // selectGroupId:string
}

export interface RenderSubPageItemProps{
    route: YakitRoute
    pluginId?: number
    selectSubMenuId: string
    subItem:MultipleNodeInfo
}