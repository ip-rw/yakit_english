import React, {memo, useEffect, useRef} from "react"
import {YakitDiffEditorProps} from "./YakitDiffEditorType"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import {yakitNotify} from "@/utils/notification"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"

import styles from "./YakitDiffEditor.module.scss"

/** @Name Monaco-Editor Comparator */
export const YakitDiffEditor: React.FC<YakitDiffEditorProps> = memo((props) => {
    const {
        leftDefaultCode,
        setLeftCode,
        rightDefaultCode,
        setRightCode,
        triggerUpdate,
        language = "text/plain",
        noWrap,
        leftReadOnly = false,
        rightReadOnly = false,
        fontSize = 12
    } = props

    const diffDivRef = useRef<HTMLDivElement>(null)
    const monaco = monacoEditor.editor
    const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor>()
    const leftEditorRef = useRef<monacoEditor.editor.ITextModel>()
    const rightEditorRef = useRef<monacoEditor.editor.ITextModel>()

    // Left Editor Update Event
    const {run: onLeftChange} = useDebounceFn(
        useMemoizedFn((e: monacoEditor.editor.IModelContentChangedEvent) => {
            if (leftEditorRef.current) {
                if (setLeftCode) setLeftCode(leftEditorRef.current.getValue())
            }
        }),
        {wait: 500}
    )
    // Right Editor Update Event
    const {run: onRightChange} = useDebounceFn(
        useMemoizedFn((e: monacoEditor.editor.IModelContentChangedEvent) => {
            if (rightEditorRef.current) {
                if (setRightCode) setRightCode(rightEditorRef.current.getValue())
            }
        }),
        {wait: 500}
    )

    useEffect(() => {
        // Destroy Comparator If Exists
        if (diffEditorRef.current) {
            diffEditorRef.current.dispose()
            diffEditorRef.current = undefined
        }
        // Destroy Left Editor If Exists
        if (leftEditorRef.current) {
            leftEditorRef.current.dispose()
            leftEditorRef.current = undefined
        }
        // Destroy Right Editor If Exists
        if (rightEditorRef.current) {
            rightEditorRef.current.dispose()
            rightEditorRef.current = undefined
        }

        // Comparator Element Not Found
        if (!diffDivRef || !diffDivRef.current) {
            yakitNotify("error", "Comparator Init Failed, Retry by Closing!")
            return
        }

        diffEditorRef.current = monaco.createDiffEditor(diffDivRef.current, {
            enableSplitViewResizing: false,
            originalEditable: !leftReadOnly,
            readOnly: rightReadOnly,
            automaticLayout: true,
            wordWrap: !!noWrap ? "off" : "on",
            fontSize: fontSize
        })

        leftEditorRef.current = monaco.createModel(leftDefaultCode, language)
        rightEditorRef.current = monaco.createModel(rightDefaultCode, language)
        diffEditorRef.current.setModel({
            original: leftEditorRef.current,
            modified: rightEditorRef.current
        })
        // Monitor Left Editor Changes
        leftEditorRef.current.onDidChangeContent(onLeftChange)
        // Monitor Right Editor Changes
        rightEditorRef.current.onDidChangeContent(onRightChange)

        return () => {
            if (diffEditorRef.current) diffEditorRef.current.dispose()
            if (leftEditorRef.current) leftEditorRef.current.dispose()
            if (rightEditorRef.current) rightEditorRef.current.dispose()
        }
    }, [])

    // Update Comparator Config
    useUpdateEffect(() => {
        if (diffEditorRef.current) {
            diffEditorRef.current.updateOptions({
                originalEditable: !leftReadOnly,
                readOnly: rightReadOnly,
                wordWrap: !!noWrap ? "off" : "on",
                fontSize: fontSize
            })
        }
    }, [noWrap, leftReadOnly, rightReadOnly, fontSize])

    // Force Update Defaults
    useUpdateEffect(() => {
        if (leftEditorRef.current) leftEditorRef.current.setValue(leftDefaultCode)
        if (rightEditorRef.current) rightEditorRef.current.setValue(rightDefaultCode)
    }, [triggerUpdate])

    return <div ref={diffDivRef} className={styles["yakit-diff-editor-wrapper"]}></div>
})
