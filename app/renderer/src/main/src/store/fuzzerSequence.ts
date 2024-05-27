/**
 * @description Record screen capture
 */

import {SequenceProps} from "@/pages/fuzzer/FuzzerSequence/FuzzerSequenceType"
import {setRemoteProjectValue} from "@/utils/kv"
import {subscribeWithSelector, persist, createJSONStorage} from "zustand/middleware"
import debounce from "lodash/debounce"
import {RemoteGV} from "@/yakitGV"
import {yakitNotify} from "@/utils/notification"
import {createWithEqualityFn} from "zustand/traditional"

interface FuzzerSequenceProps {
    fuzzerSequenceList: FuzzerSequenceListProps[]
    fuzzerSequenceCacheData: FuzzerSequenceCacheDataProps[]

    addFuzzerSequenceList: (f: FuzzerSequenceListProps) => void
    /**Deleting fuzzerSequenceList also removes data with the same groupId in fuzzerSequenceCacheData*/
    removeFuzzerSequenceList: (f: FuzzerSequenceListProps) => void

    setFuzzerSequenceCacheData: (v: FuzzerSequenceCacheDataProps[]) => void
    queryFuzzerSequenceCacheDataByGroupId: (groupId: string) => SequenceProps[]
    addFuzzerSequenceCacheData: (groupId: string, v: SequenceProps[]) => void
    updateFuzzerSequenceCacheData: (groupId: string, v: SequenceProps[]) => void
    removeFuzzerSequenceCacheData: (groupId: string) => void
    clearFuzzerSequence: () => void
    /**Only retain data of the specified groupId */
    onlySaveFuzzerSequenceCacheDataIncomingGroupId: (groupId: string) => void
    /**Delete other data within the group, retaining only the data of the specified id */
    removeGroupOther: (groupId: string, id: string) => void
    /**Delete group data by the provided id */
    removeWithinGroupDataById: (groupId: string, id: string) => void
}

export interface FuzzerListProps {}
export interface FuzzerSequenceListProps {
    groupId: string
}

export interface FuzzerSequenceCacheDataProps {
    groupId: string
    cacheData: SequenceProps[]
}

export const useFuzzerSequence = createWithEqualityFn<FuzzerSequenceProps>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                fuzzerSequenceList: [],
                fuzzerSequenceCacheData: [],
                addFuzzerSequenceList: (val) => {
                    const s = get()
                    if (!s) return
                    const isHave = s.fuzzerSequenceList.filter((ele) => ele.groupId === val.groupId).length > 0
                    if (isHave) return
                    set({
                        ...s,
                        fuzzerSequenceList: [...s.fuzzerSequenceList, val]
                    })
                },
                removeFuzzerSequenceList: (val) => {
                    const s = get()
                    if (!s) return
                    set({
                        ...s,
                        fuzzerSequenceList: s.fuzzerSequenceList.filter((ele) => ele.groupId !== val.groupId),
                        fuzzerSequenceCacheData: s.fuzzerSequenceCacheData.filter((ele) => ele.groupId !== val.groupId)
                    })
                },
                setFuzzerSequenceCacheData: (values) => {
                    const s = get()
                    if (!s) return
                    set({
                        ...s,
                        fuzzerSequenceCacheData: values
                    })
                },
                queryFuzzerSequenceCacheDataByGroupId: (groupId) => {
                    const cacheDataList = get().fuzzerSequenceCacheData
                    const queryCacheData = cacheDataList.find((ele) => ele.groupId === groupId)
                    return queryCacheData ? queryCacheData.cacheData : []
                },
                addFuzzerSequenceCacheData: (groupId, values) => {
                    let allCacheList = get().fuzzerSequenceCacheData
                    let index = allCacheList.findIndex((ele) => ele.groupId === groupId)
                    if (index === -1) {
                        allCacheList = [
                            ...allCacheList,
                            {
                                groupId,
                                cacheData: values
                            }
                        ]
                        set({
                            ...get(),
                            fuzzerSequenceCacheData: [...allCacheList]
                        })
                    }
                },
                updateFuzzerSequenceCacheData: (groupId, cacheList) => {
                    const allCacheList = get().fuzzerSequenceCacheData
                    let index = allCacheList.findIndex((ele) => ele.groupId === groupId)
                    if (index !== -1) {
                        allCacheList[index].cacheData = [...cacheList]
                        set({
                            ...get(),
                            fuzzerSequenceCacheData: [...allCacheList]
                        })
                    }
                },
                removeFuzzerSequenceCacheData: (groupId) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const newPageList = newVal.filter((ele) => ele.groupId !== groupId)
                    set({
                        ...get(),
                        fuzzerSequenceCacheData: newPageList
                    })
                },
                clearFuzzerSequence: () => {
                    set({
                        fuzzerSequenceCacheData: [],
                        fuzzerSequenceList: []
                    })
                },
                onlySaveFuzzerSequenceCacheDataIncomingGroupId: (groupId) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const newPageList = newVal.filter((ele) => ele.groupId === groupId)
                    set({
                        ...get(),
                        fuzzerSequenceCacheData: newPageList
                    })
                },
                removeGroupOther: (groupId, id) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const index = newVal.findIndex((ele) => ele.groupId === groupId)
                    if (index !== -1) {
                        const list = newVal[index].cacheData.filter((ele) => ele.pageId === id)
                        newVal[index] = {
                            groupId,
                            cacheData: list
                        }
                        set({
                            ...get(),
                            fuzzerSequenceCacheData: [...newVal]
                        })
                    }
                },
                removeWithinGroupDataById: (groupId, id) => {
                    const newVal = get().fuzzerSequenceCacheData || []
                    const index = newVal.findIndex((ele) => ele.groupId === groupId)
                    if (index !== -1) {
                        const list = newVal[index].cacheData.filter((ele) => ele.pageId !== id)
                        newVal[index] = {
                            groupId,
                            cacheData: list
                        }
                        set({
                            ...get(),
                            fuzzerSequenceCacheData: [...newVal]
                        })
                    }
                }
            }),
            {
                name: "fuzzer-sequence",
                storage: createJSONStorage(() => sessionStorage)
            }
        )
    ),
    Object.is
)
try {
    /**
     *  @description Subscription remains active after soft-opening until the app is closed;Consider optimization methods later
     */
    const unFuzzerSequenceCacheData = useFuzzerSequence.subscribe(
        (state) => state.fuzzerSequenceCacheData,
        (selectedState, previousSelectedState) => {
            saveFuzzerSequenceCache(selectedState)
        }
    )

    const saveFuzzerSequenceCache = debounce(
        (selectedState) => {
            const sequenceCache = selectedState.filter((ele) => ele.cacheData.length > 0)
            // console.log("saveFuzzerSequenceCache", sequenceCache)
            setRemoteProjectValue(RemoteGV.FuzzerSequenceCache, JSON.stringify(sequenceCache)).catch((error) => {})
        },
        500,
        {leading: true}
    )
} catch (error) {
    yakitNotify("error", "webFuzzer serialization of cache data failed:" + error)
}
