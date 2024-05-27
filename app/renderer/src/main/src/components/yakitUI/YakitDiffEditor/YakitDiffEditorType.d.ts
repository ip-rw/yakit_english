export interface YakitDiffEditorProps {
    /** Left Code */
    leftDefaultCode: string
    setLeftCode?: (value: string) => any
    /** Right Code */
    rightDefaultCode: string
    setRightCode?: (value: string) => any
    /** Force Refresh Default */
    triggerUpdate?: boolean

    /** Language */
    language?: string
    /** Wrap Code */
    noWrap?: boolean
    /** Left Read-Only */
    leftReadOnly?: boolean
    /** Right Read-Only */
    rightReadOnly?: boolean
    /** FontSize */
    fontSize?: number
}
