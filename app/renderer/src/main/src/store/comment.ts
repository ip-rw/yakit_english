import {create} from "zustand"

export interface CommenDataStore {
    isRefChildCommentList: boolean
}
interface StoreProps {
    /**@Refresh sub-comment list in modal? */
    commenData: CommenDataStore
    setCommenData: (info: CommenDataStore) => void
}

export const useCommenStore = create<StoreProps>((set, get) => ({
    commenData: {
        isRefChildCommentList: false
    },
    setCommenData: (info) => set({commenData: info})
}))
