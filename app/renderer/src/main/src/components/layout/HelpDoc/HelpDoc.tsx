import React, {useEffect, useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSystem} from "@/yakitGVDefine"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {ReportBug, FeatureRequest, LocalInfoProps} from "@/utils/template/issues"
import {useMemoizedFn} from "ahooks"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./HelpDoc.module.scss"

const {ipcRenderer} = window.require("electron")

interface HelpDocProps {
    system: YakitSystem
    arch: string
    engineLink: boolean
}

/** @name Yakit Update Download Prompt */
export const HelpDoc: React.FC<HelpDocProps> = React.memo((props) => {
    const {system, arch, engineLink} = props

    const [currentYakit, setCurrentYakit] = useState<string>("")
    const [currentYaklang, setCurrentYaklang] = useState<string>("")

    const info = useMemo(() => {
        const info: LocalInfoProps = {
            system: system,
            arch: arch,
            localYakit: currentYakit,
            localYaklang: currentYaklang
        }
        return info
    }, [system, arch, currentYakit, currentYaklang])

    useEffect(() => {
        ipcRenderer
            .invoke("fetch-yakit-version")
            .then((res) => {
                setCurrentYakit(res)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        ipcRenderer
            .invoke("fetch-yakit-version")
            .then((res) => {
                setCurrentYaklang(res)
            })
            .catch(() => {})
    }, [engineLink])

    const [show, setShow] = useState<boolean>(false)
    const menu = (
        <YakitMenu
            data={[
                {
                    key: "official_website",
                    label: "Official Website"
                },
                {
                    key: "Github",
                    label: "Github",
                    children: [
                        {label: "Feature Suggestion", key: "feature_request"},
                        {label: "BUG", key: "report_bug"}
                    ]
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        ></YakitMenu>
    )
    const menuSelect = useMemoizedFn((type: string) => {
        if (show) setShow(false)
        switch (type) {
            case "report_bug":
                const bug_tpl = ReportBug(info)
                ipcRenderer.invoke(
                    "open-url",
                    `https://github.com/yaklang/yakit/issues/new?title=[BUG]Issue Title&body=${bug_tpl}&labels=bug`
                )
                return
            case "feature_request":
                let feature_tpl = FeatureRequest()
                ipcRenderer.invoke(
                    "open-url",
                    `https://github.com/yaklang/yakit/issues/new?title=[REQ]Req Title&body=${feature_tpl}&labels=enhancement`
                )
                return
            case "official_website":
                ipcRenderer.invoke("open-url", "https://www.yaklang.com/docs/intro/")
                return
            default:
                return
        }
    })

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            trigger={"click"}
            placement={system === "Darwin" ? "bottomRight" : "bottom"}
            content={menu}
            visible={show}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div
                    className={classNames(styles["op-btn-body"], {
                        [styles["op-btn-body-hover"]]: show
                    })}
                >
                    <OutlineQuestionmarkcircleIcon className={styles["icon-style"]} />
                </div>
            </div>
        </YakitPopover>
    )
})
