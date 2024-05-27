import React, {ReactNode, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Menu, MenuProps, Tooltip} from "antd"
import {ItemType} from "antd/lib/menu/hooks/useItems"
import {ChevronRightIcon} from "@/assets/newIcon"
import {MenuDividerType} from "rc-menu/lib/interface"
import {YakitEditorKeyCode} from "./YakitEditorType"

import classNames from "classnames"
import styles from "@/components/yakitUI/YakitMenu/yakitMenu.module.scss"

export interface EditorMenuItemProps {
    /** Avoid ReactNode type */
    label: string | ReactNode
    key: string
    disabled?: boolean
    children?: EditorMenuItemType[]
    /** Not recommended */
    itemIcon?: ReactNode
    title?: string
    /** @description !!! Use at least one(ctrl/alt/meta/shift)[No repeat] Combine with Alphabets or F1-12 for Shortcut Func */
    keybindings?: YakitEditorKeyCode[]
}
export interface EditorMenuItemDividerProps {
    type: "divider"
}
export type EditorMenuItemType = EditorMenuItemProps | EditorMenuItemDividerProps

export interface EditorMenuProp extends MenuProps {
    data?: EditorMenuItemType[]
    type?: "primary" | "grey"
    /** Show Tooltip on Hover Toggle */
    isHint?: boolean
    popupClassName?: string
    /** @name Component Size Type (default|Right-click Compact Height) */
    size?: "default" | "rightMenu"
}

export const EditorMenu: React.FC<EditorMenuProp> = React.memo((props) => {
    const {
        data = [],
        type = "primary",
        isHint = false,
        className,
        popupClassName,
        size = "default",
        ...restMenu
    } = props
    const [openKeys, setOpenKeys] = useState<string[]>([])
    const menuTypeClass = useMemo(() => {
        if (type === "grey") return styles["yakit-menu-grey"]
        return styles["yakit-menu-primary"]
    }, [type])
    const menuSizeClass = useMemo(() => {
        if (size === "rightMenu") return styles["yakit-menu-right-menu-size"]
        return styles["yakit-menu-default-size"]
    }, [size])

    const generateMenuInfo = useMemoizedFn((data: EditorMenuItemType) => {
        if (typeof (data as any as EditorMenuItemDividerProps)["type"] !== "undefined") {
            const itemInfo: MenuDividerType = {
                type: "divider"
            }
            return itemInfo
        } else {
            const info = {...(data as any as EditorMenuItemProps)}
            const hintTitle = !!info.title ? info.title : typeof info.label === "string" ? info.label : ""

            if (info.children && info.children.length > 0) {
                const itemInfo: ItemType = {
                    label: (
                        <div className={classNames(styles["yakit-menu-item"])}>
                            <div className={styles["yakit-submenu-item-content"]}>
                                {info.itemIcon}
                                {isHint && !!hintTitle ? (
                                    <Tooltip zIndex={9999} title={hintTitle} placement='leftBottom'>
                                        <div className={classNames(styles["yakit-menu-item-title"])}>{info.label}</div>
                                    </Tooltip>
                                ) : (
                                    <div className={classNames(styles["yakit-menu-item-title"])}>{info.label}</div>
                                )}
                            </div>
                            <ChevronRightIcon className='icon-style' style={{marginLeft: 4}} />
                        </div>
                    ),
                    key: info.key,
                    disabled: info.disabled,
                    children: [],
                    popupClassName: classNames(
                        styles["yakit-menu-submenu"],
                        menuTypeClass,
                        menuSizeClass,
                        popupClassName
                    )
                }
                const arr: ItemType[] = []
                for (let item of info.children) {
                    arr.push(generateMenuInfo(item))
                }
                itemInfo.children = itemInfo.children.concat(arr)
                return itemInfo
            } else {
                const itemInfo: ItemType = {
                    label: (
                        <div className={classNames(styles["yakit-menu-item"])}>
                            <div className={styles["yakit-menu-item-content"]}>
                                {info.itemIcon}
                                {isHint && !!hintTitle ? (
                                    <Tooltip zIndex={9999} title={hintTitle} placement='leftBottom'>
                                        <div className={classNames(styles["yakit-menu-item-title"])}>{info.label}</div>
                                    </Tooltip>
                                ) : (
                                    <div className={classNames(styles["yakit-menu-item-title"])}>{info.label}</div>
                                )}
                            </div>
                        </div>
                    ),
                    key: info.key,
                    disabled: info.disabled
                }
                return itemInfo
            }
        }
    })

    let items: ItemType[] = []
    if (data.length > 0) for (let item of data) items.push(generateMenuInfo(item))

    return (
        <div className={classNames(styles["yakit-menu-div-wrapper"], menuTypeClass, menuSizeClass)}>
            <Menu
                openKeys={openKeys}
                {...restMenu}
                className={classNames(styles["yakit-menu-wrapper"], className || "")}
                items={data && data.length > 0 ? items : restMenu.items}
                onOpenChange={(openKey) => {
                    setOpenKeys(openKey.filter((key, index) => index === openKey.length - 1))
                    if (props.onOpenChange) {
                        props.onOpenChange(openKey)
                    }
                }}
            ></Menu>
        </div>
    )
})
