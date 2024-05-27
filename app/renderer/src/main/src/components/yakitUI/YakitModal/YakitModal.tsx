import React, {CSSProperties, ReactNode, useMemo} from "react"
import {Modal, ModalProps} from "antd"
import {YakitButton, YakitButtonProp} from "../YakitButton/YakitButton"
import {OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"

import styles from "./yakitModal.module.scss"

export interface YakitModalProp extends Omit<ModalProps, "style" | "cancelButtonProps" | "okButtonProps" | "okType"> {
    headerStyle?: CSSProperties
    footerStyle?: CSSProperties

    cancelButtonProps?: YakitButtonProp
    okButtonProps?: YakitButtonProp
    okType?: YakitButtonProp["type"]

    /** @name Subtitle */
    subTitle?: ReactNode
    /** @name Footer Component Left Operation Area */
    footerExtra?: ReactNode
    /** Dialog Type */
    type?: "gray" | "white"
    /** @name Dialog Size */
    size?: "small" | "large"
    /**
     * @name Hide Header Element
     * @description When set to true, headerStyle|title|subTitle|closable|and closeIcon become ineffective
     */
    hiddenHeader?: boolean
}

/** Usable, consider overwrite issues when used， */
export const YakitModal: React.FC<YakitModalProp> = (props) => {
    const {
        children,
        /** I'm sorry, but it seems there was a misunderstanding. Could you please provide the non-English text that you need translated into English? ↓↓↓ */
        wrapClassName,
        headerStyle,
        bodyStyle,
        footerStyle,
        /** Existing Attributes ↓↓↓ */
        closable = true,
        closeIcon,
        title,
        footer,
        cancelButtonProps,
        cancelText = "Cancel",
        okButtonProps,
        confirmLoading,
        okText = "Confirm",
        okType,
        onCancel,
        onOk,
        /** Custom Added Attributes ↓↓↓ */
        type = "gray",
        size = "small",
        subTitle,
        footerExtra,
        hiddenHeader = false,
        ...resetProps
    } = props

    const typeClass = useMemo(() => {
        if (type === "white") return styles["yakit-modal-white"]
        return styles["yakit-modal-gray"]
    }, [type])
    const sizeClass = useMemo(() => {
        if (size === "large") return styles["yakit-modal-large"]
        return styles["yakit-modal-small"]
    }, [size])

    return (
        <Modal
            {...resetProps}
            wrapClassName={classNames(styles["yakit-modal-wrapper"], typeClass, sizeClass, wrapClassName)}
            closable={false}
            footer={null}
            onCancel={onCancel}
        >
            <div className={styles["yakit-modal-body"]}>
                {!hiddenHeader && (
                    <div style={headerStyle || undefined} className={styles["header-body"]}>
                        {!!title && (
                            <div className={styles["title-wrapper"]}>
                                {title}
                                <div className={styles["subtitle-style"]}>{subTitle}</div>
                            </div>
                        )}
                        {closable && (
                            <YakitButton
                                type='text2'
                                size={size === "large" ? "large" : "middle"}
                                icon={!!closeIcon ? closeIcon : <OutlineXIcon />}
                                onClick={onCancel}
                            />
                        )}
                    </div>
                )}

                <div style={bodyStyle || undefined} className={styles["content-body"]}>
                    {children}
                </div>

                {footer === null ? null : (
                    <div style={footerStyle || undefined} className={styles["footer-body"]}>
                        {!!footer ? (
                            footer
                        ) : (
                            <>
                                <div className={styles["footer-extra"]}>{footerExtra || null}</div>
                                <div className={styles["footer-btn-group"]}>
                                    <YakitButton
                                        size={size === "large" ? "large" : "middle"}
                                        type='outline2'
                                        onClick={onCancel}
                                        {...cancelButtonProps}
                                    >
                                        {cancelText}
                                    </YakitButton>
                                    <YakitButton
                                        loading={confirmLoading}
                                        size={size === "large" ? "large" : "middle"}
                                        type={okType}
                                        onClick={onOk}
                                        {...okButtonProps}
                                    >
                                        {okText}
                                    </YakitButton>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
