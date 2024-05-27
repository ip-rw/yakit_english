import React, {useState} from "react"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {useMemoizedFn} from "ahooks"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {setRemoteValue} from "@/utils/kv"
import {EngineRemoteGV} from "@/enums/engine"
import {YaklangEngineMode} from "@/yakitGVDefine"

import styles from "./CheckEngineVersion.module.scss"

interface CheckEngineVersionProps {
    engineMode: YaklangEngineMode
    currentVersion: string
    builtInVersion: string
    visible: boolean
    onCancel: (flag: boolean) => any
}

/** @name Yakit Update Download Prompt */
export const CheckEngineVersion: React.FC<CheckEngineVersionProps> = React.memo((props) => {
    const {engineMode, visible, currentVersion, builtInVersion, onCancel} = props

    const [loading, setLoading] = useState<boolean>(false)

    const [noPrompt, setNoPrompt] = useState<boolean>(false)

    const onSubmit = useMemoizedFn(() => {
        if (loading) return
        setRemoteValue(EngineRemoteGV.RemoteCheckEngineVersion, `${noPrompt}`)
        onCancel(true)
        setTimeout(() => {
            setLoading(false)
        }, 500)
    })
    const onClose = useMemoizedFn(() => {
        setRemoteValue(EngineRemoteGV.RemoteCheckEngineVersion, `${noPrompt}`)
        onCancel(false)
    })

    return (
        <YakitHint
            visible={visible}
            title='Engine Version Too Low'
            content={
                <div>
                    Your instructions are noted, but you haven't It seems there was a misunderstanding. I'll need the specific text or phrases you want translated from Chinese to English to proceed. Could you please share those??。
                    <div>Current Version : {currentVersion}</div>
                    <div>Recommended Version : {builtInVersion}</div>
                </div>
            }
            footerExtra={
                <div className={styles["check-engine-version-checkbox"]}>
                    <YakitCheckbox value={noPrompt} onChange={(e) => setNoPrompt(e.target.checked)}>
                        Do Not Remind Again
                    </YakitCheckbox>
                </div>
            }
            okButtonText='Update Now'
            okButtonProps={{loading: loading, style: {display: engineMode === "remote" ? "none" : ""}}}
            onOk={onSubmit}
            cancelButtonText={engineMode === "remote" ? "Got It" : "Ignore"}
            onCancel={onClose}
        />
    )
})
