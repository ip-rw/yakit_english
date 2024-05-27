import React, {useEffect, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineClipboardlistIcon, OutlineCollectionIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/routes/newRoute"
import "video-react/dist/video-react.css" // import css
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import emiter from "@/utils/eventBus/eventBus"
import {getRemoteValue} from "@/utils/kv"
import {AdvancedConfigShowProps} from "../HTTPFuzzerPage"
import {RemoteGV} from "@/yakitGV"

import cloneDeep from "lodash/cloneDeep"
import {defaultWebFuzzerPageInfo} from "@/defaultConstants/HTTPFuzzerPage"
const {ipcRenderer} = window.require("electron")

export const webFuzzerTabs = [
    {
        key: "config",
        label: "Config",
        icon: <OutlineAdjustmentsIcon />
    },
    {
        key: "rule",
        label: "Rules",
        icon: <OutlineClipboardlistIcon />
    },
    {
        key: "sequence",
        label: "Sequence",
        icon: <OutlineCollectionIcon />
    }
]
/**Wrap Config and Rules, not Sequences */
const WebFuzzerPage: React.FC<WebFuzzerPageProps> = React.memo((props) => {
    const {id} = props
    const {queryPagesDataById, selectGroupId, getPagesDataByGroupId} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            selectGroupId: s.selectGroupId.get(YakitRoute.HTTPFuzzer) || "",
            getPagesDataByGroupId: s.getPagesDataByGroupId
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        if (!id) {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, id)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })

    const webFuzzerRef = useRef<any>(null)
    const [inViewport] = useInViewport(webFuzzerRef)
    const [type, setType] = useState<WebFuzzerType>(props.defaultType || "config")
    // Hide Advanced Settings/Display
    const [advancedConfigShow, setAdvancedConfigShow] = useState<AdvancedConfigShowProps>({
        config: true,
        rule: true
    })

    useEffect(() => {
        emiter.on("onGetFuzzerAdvancedConfigShow", debounceGetFuzzerAdvancedConfigShow)
        emiter.on("sequenceSendSwitchTypeToFuzzer", onSwitchType)
        return () => {
            emiter.off("onGetFuzzerAdvancedConfigShow", debounceGetFuzzerAdvancedConfigShow)
            emiter.off("sequenceSendSwitchTypeToFuzzer", onSwitchType)
        }
    }, [])

    useEffect(() => {
        getRemoteValue(RemoteGV.WebFuzzerAdvancedConfigShow).then((c) => {
            if (!c) return
            try {
                const newAdvancedConfigShow = initWebFuzzerPageInfo().advancedConfigShow
                if (newAdvancedConfigShow) {
                    setAdvancedConfigShow({...newAdvancedConfigShow})
                } else {
                    const value = JSON.parse(c)
                    setAdvancedConfigShow({
                        ...value
                    })
                }
            } catch (error) {}
        })
    }, [])

    const onSetSequence = useMemoizedFn(() => {
        const pageChildrenList: PageNodeItemProps[] = getPagesDataByGroupId(YakitRoute.HTTPFuzzer, selectGroupId) || []
        if (props.id && pageChildrenList.length === 0) {
            // Create Group
            onAddGroup(props.id)
        } else {
            // Toggle MainOpContentType Sequencing】
            emiter.emit("sendSwitchSequenceToMainOperatorContent", JSON.stringify({type: "sequence"}))
        }
    })
    const onAddGroup = useMemoizedFn((id: string) => {
        ipcRenderer.invoke("send-add-group", {pageId: id})
    })
    /**Event to Switch Tab Display in This Component */
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        switch (key) {
            case "sequence":
                onSetSequence()
                break
            default:
                // Toggle MainOpContentType Config】/【Rules】
                emiter.emit("sendSwitchSequenceToMainOperatorContent", JSON.stringify({type: key}))
                // Send to HTTPFuzzerPage for Config Toggle】/【Rule Tab Type Select
                emiter.emit("onSwitchTypeWebFuzzerPage", JSON.stringify({type: key}))
                if (type === key) {
                    // Configure Rule】/【Toggle Adv. Settings in Rules
                    emiter.emit("onSetAdvancedConfigShow", JSON.stringify({type: key}))
                }
                // Configure】/【Select Rule
                setType(key)
                break
        }
    })

    const debounceGetFuzzerAdvancedConfigShow = useMemoizedFn((data) => {
        if (inViewport) {
            try {
                const value = JSON.parse(data)
                const key = value.type as WebFuzzerType
                if (key === "sequence") return
                const c = !advancedConfigShow[key]
                const newValue = {
                    ...advancedConfigShow,
                    [key]: c
                }
                setAdvancedConfigShow(newValue)
            } catch (error) {}
        }
    })
    /**FuzzerSeqWrapper Config Toggle Signal】/【Wrapper Layer Rule Type */
    const onSwitchType = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            const type = value.type as WebFuzzerType
            if (type === "sequence") return
            setType(type)
            // Send to HTTPFuzzerPage for Config Toggle】/【Rule Tab Type Select
            emiter.emit("onSwitchTypeWebFuzzerPage", JSON.stringify({type}))
        } catch (error) {}
    })
    const isUnShow = useCreation(() => {
        switch (type) {
            case "config":
                return !advancedConfigShow.config
            case "rule":
                return !advancedConfigShow.rule
            default:
                return false
        }
    }, [type, advancedConfigShow, advancedConfigShow])
    return (
        <div className={styles["web-fuzzer"]} ref={webFuzzerRef}>
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs.map((item) => (
                    <div
                        key={item.key}
                        className={classNames(styles["web-fuzzer-tab-item"], {
                            [styles["web-fuzzer-tab-item-active"]]: type === item.key,
                            [styles["web-fuzzer-tab-item-advanced-config-unShow"]]: item.key === type && isUnShow
                        })}
                        onClick={() => {
                            const keyType = item.key as WebFuzzerType
                            onSetType(keyType)
                        }}
                    >
                        <span className={styles["web-fuzzer-tab-label"]}>{item.label}</span>
                        {item.icon}
                    </div>
                ))}
            </div>
            <div className={classNames(styles["web-fuzzer-tab-content"])}>{props.children}</div>
        </div>
    )
})

export default WebFuzzerPage
