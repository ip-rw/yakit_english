/**
 * @param {string} copyText Copy Text, defaults to Display Text if not provided
 * @param {string} showText Display Text
 */
export interface YakitCopyTextProps {
    copyText?: string
    showText: string
    onAfterCopy?: (e: MouseEvent) => void
    iconColor?: string
    wrapStyle?: CSSProperties
}