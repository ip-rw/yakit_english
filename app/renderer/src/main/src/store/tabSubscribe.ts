import {YakitModalConfirmProps} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {create} from "zustand"
export interface YakitSecondaryConfirmProps extends Omit<YakitModalConfirmProps, "onOk"> {
    onOk: (m) => void
}

/**
 * @name First-Level Menu Operations Confirmation Config
 * @description Map Structure for Confirmation Config Info (e.g., close, reset, etc.))
 */

interface SubscribeCloseProps {
    events: Map<string, Record<string, YakitSecondaryConfirmProps>>

    getSubscribeClose: (key: string) => Record<string, YakitSecondaryConfirmProps> | undefined
    setSubscribeClose: (key: string, p: Record<string, YakitSecondaryConfirmProps>) => void
    removeSubscribeClose: (key: string) => void

    clearSubscribeClose: () => void
}
export const useSubscribeClose = create<SubscribeCloseProps>((set, get) => ({
    events: new Map(),
    getSubscribeClose: (key) => get().events.get(key),
    setSubscribeClose: (key, ev) => {
        const newVal = get().events
        newVal.set(key, ev)
        set({
            events: newVal
        })
    },
    removeSubscribeClose: (key) => {
        const newVal = get().events
        newVal.delete(key)
        set({
            events: newVal
        })
    },
    clearSubscribeClose: () => {
        const newVal = get().events
        newVal.clear()
        set({
            events: newVal
        })
    }
}))
