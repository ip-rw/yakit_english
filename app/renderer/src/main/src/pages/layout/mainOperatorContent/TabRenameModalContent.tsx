import React, {useEffect, useRef, useState} from "react"
import styles from "./TabRenameModalContent.module.scss"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import { TextAreaRef } from "antd/lib/input/TextArea"

interface TabRenameModalProps {
    title: string
    onClose: () => void
    name: string
    onOk: (s: string) => void
}
const TabRenameModalContent: React.FC<TabRenameModalProps> = React.memo((props) => {
    const {title, onClose, name, onOk} = props
    const [value, setValue] = useState<string>(name)
    const textareaRef = useRef<TextAreaRef>(null)
    useEffect(() => {
        if (textareaRef.current) {
            const textArea = textareaRef.current.resizableTextArea?.textArea
            if (textArea) {
                // textArea.focus();
                textArea.select()
            }
        }
    }, [])
    return (
        <div className={styles["subMenu-edit-modal"]}>
            <div className={styles["subMenu-edit-modal-heard"]}>
                <div className={styles["subMenu-edit-modal-title"]}>{title}</div>
                <div className={styles["close-icon"]} onClick={() => onClose()}>
                    <RemoveIcon />
                </div>
            </div>
            <div className={styles["subMenu-edit-modal-body"]}>
                <YakitInput.TextArea
                    ref={textareaRef}
                    autoSize={{minRows: 3, maxRows: 3}}
                    isShowResize={false}
                    showCount
                    value={value}
                    maxLength={50}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        // Disable Enter for newline
                        const keyCode = e.keyCode ? e.keyCode : e.key
                        if (keyCode === 13) {
                            e.stopPropagation()
                            e.preventDefault()
                        }
                    }}
                />
            </div>
            <div className={styles["subMenu-edit-modal-footer"]}>
                <YakitButton
                    type='outline2'
                    onClick={() => {
                        onClose()
                        setValue("")
                    }}
                >
                    Cancel
                </YakitButton>
                <YakitButton type='primary' onClick={() => onOk(value)}>
                    Confirm
                </YakitButton>
            </div>
        </div>
    )
})

export default TabRenameModalContent
