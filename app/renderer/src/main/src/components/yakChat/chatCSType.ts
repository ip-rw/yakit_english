import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakScript} from "@/pages/invoker/schema"

/** @msgInfo - chat-cs Dialog */
export interface CacheChatCSProps {
    /** Unique ID */
    token: string
    /** Chat Name */
    name: string
    /** Chat Name Modified (Auto)/Manual Edit） */
    isRename: boolean
    /** Search Engine Enhancement */
    is_bing: boolean
    /** Plugin Debug Execution */
    is_plugin: boolean
    /** Chat History */
    history: ChatInfoProps[]
    /** Latest Chat Time */
    time: string
}
/** @SingleMsg - chat-cs */
export interface ChatInfoProps {
    token: string
    isMe: boolean
    time: string
    info: ChatMeInfoProps | ChatCSMultipleInfoProps | ChatPluginListProps
    // Render Type
    renderType?: "plugin-list"
}
/** User Info Attrs */
export interface ChatMeInfoProps {
    content: string
    is_bing: boolean
    is_plugin: boolean
}
/** Server Info Attrs */
export interface ChatCSMultipleInfoProps {
    likeType: string
    content: ChatCSSingleInfoProps[]
}

/** Server Plugin List Attrs */
export interface ChatPluginListProps {
    input: string
    data: YakScript[]
}

export interface ChatCSSingleInfoProps {
    is_bing: boolean
    is_plugin: boolean
    content: string
    /** Chat Server Unique ID */
    id: string

    /** Cache Plugin Results */
    status?: "succee" | "fail" | "info"
    runtimeId?: string
    riskState?: StreamResult.Risk[]
    /** Content in Response */
    load_content: LoadObjProps[]
    /** API Response Finished */
    end: boolean
}

/** Data Struct from Backend */
export interface ChatCSAnswerProps {
    id: string
    role: string
    result: string
    // Loading Text
    loadResult?: LoadObjProps[]
}

export interface PluginListItemProps {
    name: string
    arguments: any
}

export interface ChatCSPluginProps {
    id: string
    role: string
    script: PluginListItemProps
    // Loading Text
    loadResult?: LoadObjProps[]
}
/** Data Struct for Plugin from Backend */
export interface ChatCSPluginAnswerProps {
    id: string
    role: string
    // Plugin Array
    script: string[]
    // Target
    input: string
    // Loading Text
    loadResult?: LoadObjProps[]
}



/** Data Struct in Backend Response */
export interface LoadObjProps {
    result: string
    id: string
}