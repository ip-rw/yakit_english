export interface YakitCollapseTextProps {
    /** Content */
    content: string
    /** Lines shown when folded, default 3 */
    rows?: number
    /** Single line height, default 16px */
    lineHeight?: number
    /** Text size, default 12px */
    fontSize?: number
    wrapperClassName?: string
}
