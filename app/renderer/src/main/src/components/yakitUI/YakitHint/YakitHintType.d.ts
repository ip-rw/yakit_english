import {ReactNode} from "react"
import {YakitButtonProp} from "../YakitButton/YakitButton"

export interface YakitHintProps extends YakitHintModalTypes {
    /** Show overlay */
    mask?: boolean
    /** Overlay background color (requires color with transparency)) */
    maskColor?: string
    /** Sub-window group for multiple popups */
    childModal?: ChildModalProps[]
    /** Specified popup mount node, defaults to body */
    getContainer?: HTMLElement
}

interface ChildModalProps {
    /** Sub-window identifier (unique within group)) */
    key: string
    /** Sub-window component props */
    content: YakitHintModalTypes
}

type YakitHintModalTypes = Omit<YakitHintModalProps, "isTop" | "setTop" | "isMask">

export interface YakitHintModalProps {
    /** Overlay exists */
    isMask?: boolean
    /** Draggable */
    isDrag?: boolean
    /** Show popup */
    visible: boolean
    /** Popup width, default 448px */
    width?: number
    /** Popup is on top */
    isTop?: boolean
    /** Set popup to top */
    setTop?: () => any
    /** Popup decor - style class */
    wrapClassName?: string
    /** Top left area tip icon */
    heardIcon?: ReactNode
    /** Bottom left area expand icon */
    extraIcon?: ReactNode
    /** Popup title */
    title?: ReactNode
    /** Popup text content */
    content?: ReactNode
    /** Popup action bottom, set to{null}Do not show bottom area */
    footer?: ReactNode | null
    /** Popup action bottom extension (left), when footer={null}This property is invalid */
    footerExtra?: ReactNode
    /** Confirm button text */
    okButtonText?: ReactNode
    /** Confirm button props */
    okButtonProps?: YakitButtonProp
    /** Confirm button callback */
    onOk?: () => any
    /** Cancel button text */
    cancelButtonText?: ReactNode
    /** Cancel button props */
    cancelButtonProps?: YakitButtonProp
    /** Cancel button callback */
    onCancel?: () => any
    children?: ReactNode
}
