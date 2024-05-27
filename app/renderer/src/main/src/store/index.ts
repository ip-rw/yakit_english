import {ResultObjProps} from "@/pages/dynamicControl/DynamicControl"
import {create} from "zustand"

export interface UserInfoProps {
    /** Logged In? */
    isLogin: boolean
    /** Login Platform */
    platform: string | null
    githubName: string | null
    githubHeadImg: string | null
    wechatName: string | null
    wechatHeadImg: string | null
    qqName: string | null
    qqHeadImg: string | null
    companyName: string | null
    companyHeadImg: string | null
    /** Role */
    role: string | null
    user_id: number | null
    token: string
    /** Plugin Management Permission? */
    checkPlugin?: boolean
}
interface StoreProps {
    /**@name Login User Info */
    userInfo: UserInfoProps
    setStoreUserInfo: (info: UserInfoProps) => void
}
export const useStore = create<StoreProps>((set, get) => ({
    userInfo: {
        isLogin: false,
        platform: null,
        githubName: null,
        githubHeadImg: null,
        wechatName: null,
        wechatHeadImg: null,
        qqName: null,
        qqHeadImg: null,
        companyName: null,
        companyHeadImg: null,
        role: null,
        user_id: null,
        token: "",
        checkPlugin: false
    },
    setStoreUserInfo: (info) => set({userInfo: info})
}))

export interface StoreParamsProps {
    // Keyword Search Param
    keywords: string
    // Plugin Type Param
    plugin_type: string
    // Today/This Week
    time_search: string
    // Plugin Store Rendered?
    isShowYakitStorePage: boolean
}

export interface DynamicStatusProps extends ResultObjProps {
    /**Remote Control?*/
    isDynamicStatus: boolean
    /**Being Remotely Controlled?*/
    isDynamicSelfStatus: boolean
    /**Private Domain Address*/
    baseUrl: string
}

interface YakitDynamicStatusProps {
    /**@name Remote Control Status Param */
    dynamicStatus: DynamicStatusProps
    setDynamicStatus: (info: DynamicStatusProps) => void
}

export const yakitDynamicStatus = create<YakitDynamicStatusProps>((set, get) => ({
    dynamicStatus: {
        isDynamicStatus: false,
        isDynamicSelfStatus: false,
        baseUrl: "",
        id: "",
        host: "",
        port: 0,
        note: "",
        pubpem: "",
        secret: ""
    },
    setDynamicStatus: (info) => set({dynamicStatus: info})
}))
