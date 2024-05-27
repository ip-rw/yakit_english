import React, {useEffect, useMemo, useRef, useState} from "react"
import {LocalPluginList} from "./LocalPluginList"
import {OnlinePluginList} from "./OnlinePluginList"
import {useStore} from "@/store"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {PluginOnlineGroupList} from "./PluginOnlineGroupList"
import {PluginLocalGroupList} from "./PluginLocalGroupList"
import {GroupListItem} from "./PluginGroupList"
import {useInViewport} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import emiter from "@/utils/eventBus/eventBus"
import {apiFetchResetYakScriptGroup} from "../utils"
import {InformationCircleIcon} from "@/assets/newIcon"
import styles from "./PluginGroups.module.scss"

export type PluginGroupType = "online" | "local"
interface PluginGroupsProps {
    pluginGroupType?: PluginGroupType
}

export const PluginGroups: React.FC<PluginGroupsProps> = React.memo((props) => {
    const {pluginGroupType: groupType = "local"} = props
    const userInfo = useStore((s) => s.userInfo)
    const pluginsGroupsRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsGroupsRef)
    const [pluginGroupType, setPluginGroupType] = useState<PluginGroupType>(groupType)
    const [onlineGroupLen, setOnlineGroupLen] = useState<number>(0)
    const [localGroupLen, setLocalGroupLen] = useState<number>(0)
    const [activeLocalGroup, setActiveLocalGroup] = useState<GroupListItem>() // Selected local group
    const [activeOnlineGroup, setActiveOnlineGroup] = useState<GroupListItem>() // Selected online group

    useEffect(() => {
        setPluginGroupType(groupType)
    }, [groupType])

    // Check if admin or superadmin
    const judgeOnlineStatus = useMemo(() => {
        const flag = ["admin", "superAdmin"].includes(userInfo.role || "")
        return flag
    }, [userInfo.role])

    useEffect(() => {
        if (!userInfo.isLogin) {
            setPluginGroupType("local")
        }
    }, [userInfo.isLogin])

    return (
        <div className={styles["plugin-groups-wrapper"]} ref={pluginsGroupsRef}>
            {/* Left-side groups */}
            <div className={styles["plugin-groups-left-wrap"]}>
                <div className={styles["plugin-groups-left-header"]}>
                    <div className={styles["plugin-groups-left-header-info"]}>
                        <span className={styles["plugin-groups-left-header-text"]}>Plugin group management</span>
                        <Tooltip title='Only manage plugins except Yak and Codec' placement='bottomLeft'>
                            <InformationCircleIcon className={styles["pligin-group-mag-icon"]} />
                        </Tooltip>
                        {judgeOnlineStatus && (
                            <YakitRadioButtons
                                style={{marginRight: 4}}
                                value={pluginGroupType}
                                onChange={(e) => setPluginGroupType(e.target.value)}
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "online",
                                        label: "Online"
                                    },
                                    {
                                        value: "local",
                                        label: "Local"
                                    }
                                ]}
                                size={"small"}
                            />
                        )}
                        <span className={styles["plugin-groups-number"]}>
                            {pluginGroupType === "online" ? onlineGroupLen : localGroupLen}
                        </span>
                    </div>
                    <div className={styles["plugin-groups-opt-btns"]}>
                        {pluginGroupType === "local" && (
                            <Tooltip title='Reset deletes all groups and redownloads'>
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    onClick={() => {
                                        const m = showYakitModal({
                                            title: "Reset",
                                            onOkText: "Confirm",
                                            onOk: () => {
                                                m.destroy()
                                                apiFetchResetYakScriptGroup({Token: userInfo.token}).then(() => {
                                                    emiter.emit("onRefPluginGroupMagLocalQueryYakScriptGroup", "")
                                                })
                                            },
                                            content: (
                                                <div style={{margin: 15}}>
                                                    Reset local groups and redownload all, proceed?？
                                                </div>
                                            ),
                                            onCancel: () => {
                                                m.destroy()
                                            }
                                        })
                                    }}
                                >
                                    Reset
                                </YakitButton>
                            </Tooltip>
                        )}
                    </div>
                </div>
                <div className={styles["plugin-groups-left-body"]}>
                    <div
                        style={{
                            display: pluginGroupType === "online" ? "block" : "none",
                            height: "100%"
                        }}
                    >
                        {judgeOnlineStatus && (
                            <PluginOnlineGroupList
                                pluginsGroupsInViewport={inViewport}
                                onOnlineGroupLen={setOnlineGroupLen}
                                activeOnlineGroup={activeOnlineGroup}
                                onActiveGroup={setActiveOnlineGroup}
                            ></PluginOnlineGroupList>
                        )}
                    </div>
                    <div
                        style={{
                            display: pluginGroupType === "local" ? "block" : "none",
                            height: "100%"
                        }}
                    >
                        <PluginLocalGroupList
                            pluginsGroupsInViewport={inViewport}
                            onLocalGroupLen={setLocalGroupLen}
                            activeLocalGroup={activeLocalGroup}
                            onActiveGroup={setActiveLocalGroup}
                        ></PluginLocalGroupList>
                    </div>
                </div>
            </div>
            {/* Right-side plugin list */}
            <div className={styles["plugin-groups-right-wrap"]}>
                <div
                    style={{
                        display: pluginGroupType === "online" ? "block" : "none",
                        height: "100%"
                    }}
                >
                    {judgeOnlineStatus && activeOnlineGroup && (
                        <OnlinePluginList
                            pluginsGroupsInViewport={inViewport}
                            activeGroup={activeOnlineGroup}
                        ></OnlinePluginList>
                    )}
                </div>
                <div
                    style={{
                        display: pluginGroupType === "local" ? "block" : "none",
                        height: "100%"
                    }}
                >
                    {activeLocalGroup && (
                        <LocalPluginList
                            pluginsGroupsInViewport={inViewport}
                            activeGroup={activeLocalGroup}
                        ></LocalPluginList>
                    )}
                </div>
            </div>
        </div>
    )
})
