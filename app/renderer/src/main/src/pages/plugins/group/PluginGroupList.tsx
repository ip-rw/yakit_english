import React, {useState, ReactNode, useRef, useEffect} from "react"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./PluginGroupList.module.scss"

export interface GroupListItem {
    id: string // Unique ID
    name: string // Group Name
    number: number // Plugin Qty by Group
    icon: React.ReactElement // Pre-group Icon
    iconColor: string // Icon Color
    showOptBtns: boolean // Show Action Btn?
    default: boolean // Is Default?
}

interface PluginGroupListProps {
    data: GroupListItem[] // Group Data
    editGroup?: GroupListItem // Current Edit Group
    onEditInputBlur: (groupItem: GroupListItem, newName: string, successCallback: () => void) => void
    extraOptBtn: (groupItem: GroupListItem) => ReactNode // Group Action Btn
    extraHideMenu: (groupItem: GroupListItem) => ReactNode // Hide Group Menu
    onActiveGroup: (groupItem: GroupListItem) => void
}

export const PluginGroupList: React.FC<PluginGroupListProps> = (props) => {
    const {data, editGroup, onEditInputBlur, extraOptBtn, extraHideMenu, onActiveGroup} = props
    const [activeGroupId, setActiveGroupId] = useState<string>(data[0].id) // Group ID Selected
    const activeGroupIdRef = useRef<string>(activeGroupId)
    const editInputRef = useRef<any>()
    const [newName, setNewName] = useState<string>("") // New Group Name

    useEffect(() => {
        if (editGroup) {
            setNewName(editGroup.name)
        }
    }, [editGroup])

    useEffect(() => {
        const index = data.findIndex((item) => item.id === activeGroupIdRef.current)
        if (index === -1) {
            setActiveGroupId(data[0].id)
        } else {
            onActiveGroup(data[index])
        }
    }, [data])

    useEffect(() => {
        activeGroupIdRef.current = activeGroupId
        const findGroupItem = data.find((item) => item.id === activeGroupId)
        if (findGroupItem) {
            onActiveGroup(findGroupItem)
        }
    }, [activeGroupId])

    return (
        <div className={styles["plugin-group-list"]}>
            <div className={styles["plugin-group-list-wrap"]}>
                {data.map((item) => {
                    return (
                        <div
                            className={classNames(styles["plugin-group-list-item"], {
                                [styles["plugin-group-list-item-border-unshow"]]: editGroup && editGroup.id === item.id || activeGroupId === item.id
                            })}
                            key={item.id}
                        >
                            {editGroup && editGroup.id === item.id ? (
                                <div className={styles["plugin-group-list-item-input"]}>
                                    <YakitInput
                                        ref={editInputRef}
                                        wrapperStyle={{height: "100%"}}
                                        style={{height: "100%"}}
                                        onBlur={() => {
                                            onEditInputBlur(item, newName, () => {
                                                if (activeGroupId === item.id) {
                                                    setActiveGroupId(newName + "_group")
                                                }
                                            })
                                        }}
                                        autoFocus={true}
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value.trim())}
                                    ></YakitInput>
                                </div>
                            ) : (
                                <div
                                    className={classNames(styles["plugin-group-list-item-cont"], {
                                        [styles["plugin-group-list-item-cont-active"]]: activeGroupId === item.id
                                    })}
                                    onClick={() => {
                                        setActiveGroupId(item.id)
                                    }}
                                >
                                    <div className={styles["plugin-group-list-item-cont-left"]}>
                                        <span className={styles["list-item-icon"]} style={{color: item.iconColor}}>
                                            {item.icon}
                                        </span>
                                        <span className={styles["groups-text"]}>{item.name}</span>
                                    </div>
                                    {activeGroupId === item.id && item.showOptBtns ? (
                                        extraHideMenu(item)
                                    ) : (
                                        <div
                                            className={classNames(styles["plugin-number"], {
                                                [styles["plugin-number-unshow"]]: item.showOptBtns
                                            })}
                                        >
                                            {item.number}
                                        </div>
                                    )}
                                    {item.showOptBtns && (
                                        <div
                                            className={styles["extra-opt-btns"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        >
                                            {extraOptBtn(item)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className={styles["plugin-group-footer"]}>Reached Bottom ~ </div>
        </div>
    )
}
