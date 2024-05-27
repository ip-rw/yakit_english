import {Tag} from "antd"
import React, {useState} from "react"
import {CopyComponentsProps, YakitTagProps} from "./YakitTagType"
import styles from "./YakitTag.module.scss"
import classNames from "classnames"
import {DocumentDuplicateSvgIcon} from "@/assets/newIcon"
import {useMemoizedFn} from "ahooks"
import {CheckOutlined, LoadingOutlined} from "@ant-design/icons"
import {success} from "@/utils/notification"
import {OutlineXIcon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")

/**
 * Update Notes
 * 1. Close button hover theme color
 * 2.height Exclude border
 */

/**
 * @description: tag
 * @augments TagProps Inherits antd's TagProps default props
 * @param {middle|large|small} size Default middle 16 20 24
 * @param {"danger" | "info" | "success" | "warning"|"serious" |"yellow"| "purple" | "blue" | "cyan" | "bluePurple"} color Color
 * @param {boolean} disable
 * @param {boolean} enableCopy Copy enabled
 * @param {e} onAfterCopy Callback after copying
 */
export const YakitTag: React.FC<YakitTagProps> = (props) => {
    const {color, size, disable, className, enableCopy, iconColor, copyText, ...restProps} = props
    const onAfterCopy = useMemoizedFn((e) => {
        if (props.onAfterCopy) props.onAfterCopy(e)
    })
    return (
        <Tag
            {...restProps}
            closeIcon={
                (enableCopy && (
                    <CopyComponents copyText={copyText || ""} onAfterCopy={onAfterCopy} iconColor={iconColor} />
                )) ||
                props.closeIcon || <OutlineXIcon />
            }
            closable={props.closable || enableCopy}
            className={classNames(
                styles["yakit-tag-middle"],
                {
                    [styles["yakit-tag-small"]]: size === "small",
                    [styles["yakit-tag-large"]]: size === "large",
                    [styles["yakit-tag-danger"]]: color === "danger",
                    [styles["yakit-tag-info"]]: color === "info",
                    [styles["yakit-tag-success"]]: color === "success",
                    [styles["yakit-tag-warning"]]: color === "warning",
                    [styles["yakit-tag-serious"]]: color === "serious",
                    [styles["yakit-tag-yellow"]]: color === "yellow",
                    [styles["yakit-tag-purple"]]: color === "purple",
                    [styles["yakit-tag-blue"]]: color === "blue",
                    [styles["yakit-tag-cyan"]]: color === "cyan",
                    [styles["yakit-tag-bluePurple"]]: color === "bluePurple",
                    [styles["yakit-tag-white"]]: color === "white",
                    [styles["yakit-tag-disable"]]: !!disable
                },
                className
            )}
            onClose={(e) => {
                if (disable || enableCopy) return
                if (props.onClose) props.onClose(e)
            }}
        >
            {(enableCopy && copyText) || props.children}
        </Tag>
    )
}

export const CopyComponents: React.FC<CopyComponentsProps> = (props) => {
    const {className, iconColor} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowSure, setIsShowSure] = useState<boolean>(false)
    const onCopy = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!props.copyText) return
        setLoading(true)
        ipcRenderer.invoke("set-copy-clipboard", props.copyText)
        setTimeout(() => {
            setLoading(false)
            setIsShowSure(true)
            setTimeout(() => {
                setIsShowSure(false)
            }, 2000)
            success("Copy Success")
        }, 1000)
        if (props.onAfterCopy) props.onAfterCopy(e)
    })
    return (
        <div className={classNames(styles["yakit-copy"], className || "")} onClick={onCopy}>
            {(loading && <LoadingOutlined style={{color: "var(--yakit-primary-5)"}} />) || (
                <>
                    {(isShowSure && <CheckOutlined style={{color: "var(--yakit-success-5)"}} />) || (
                        <DocumentDuplicateSvgIcon style={{color: iconColor || "var(--yakit-primary-5)"}} />
                    )}
                </>
            )}
        </div>
    )
}
