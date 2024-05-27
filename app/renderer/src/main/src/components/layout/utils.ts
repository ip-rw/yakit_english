import {DownloadingState} from "@/yakitGVDefine"

/** @name Process Progress Bar Data (Prevent abnormal data)) */
export const safeFormatDownloadProcessState = (state: DownloadingState) => {
    try {
        // Use optional chaining to safely access deep properties, defaulting to 0 if nonexistent
        const total = state.size?.total || 0
        const transferred = state.size?.transferred || 0
        const elapsed = state.time?.elapsed || 0
        const remaining = state.time?.remaining || 0

        return {
            percent: state.percent || 0,
            size: {total, transferred},
            speed: state.speed || 0,
            time: {elapsed, remaining}
        }
    } catch (e) {
        return {
            percent: 0,
            size: {total: 0, transferred: 0},
            speed: 0,
            time: {elapsed: 0, remaining: 0}
        }
    }
}
