import React, {ReactElement, useEffect, useRef, useState} from "react"
import {monaco} from "react-monaco-editor"
import ReactDOM from "react-dom"
import {editor} from "monaco-editor"
import {IMonacoEditor, NewHTTPPacketEditor, NewHTTPPacketEditorProp} from "@/utils/editors"
import {CountDirectionProps, EditorDetailInfoProps} from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import {createRoot} from "react-dom/client"

export interface NewEditorSelectRangeProps extends NewHTTPPacketEditorProp {
    // Editor’s Unique Popup Click ID
    selectId?: string
    // Click Popup Content
    selectNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement
    // Editor’s Unique Selection Popup ID
    rangeId?: string
    // Select Popup Content
    rangeNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement
    // Hide Popup After Exceeding Line Limit (Default 3 Lines))
    overLine?: number
}
export const NewEditorSelectRange: React.FC<NewEditorSelectRangeProps> = (props) => {
    const {selectId, selectNode, rangeId, rangeNode, overLine = 3, onEditor, ...otherProps} = props
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const downPosY = useRef<number>()
    const upPosY = useRef<number>()
    // Editor Info (Dimensions))
    const editorInfo = useRef<any>()
    useEffect(() => {
        if (reqEditor) {
            editerMenuFun(reqEditor)
        }
    }, [reqEditor])

    // Editor Menu
    const editerMenuFun = (reqEditor: IMonacoEditor) => { 
        // Menu Displayed on Click in Editor
        const fizzSelectWidget = {
            isOpen: false,
            getId: function () {
                return selectId || ""
            },
            getDomNode: function () {
                // Convert TSX to DOM Node
                const domNode = document.createElement("div")
                // Solve Mouse Wheel Scrolling Issue in Popup
                domNode.onwheel = (e) => e.stopPropagation()
                selectNode && createRoot(domNode).render(selectNode(closeFizzSelectWidget, editorInfo.current))
                return domNode
            },
            getPosition: function () {
                const currentPos = reqEditor.getPosition()
                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // Update Widget Position
                this.getPosition()
                reqEditor.layoutContentWidget(this)
            }
        }
        // Menu Displayed on Selection in Editor
        const fizzRangeWidget = {
            isOpen: false,
            getId: function () {
                return rangeId || ""
            },
            getDomNode: function () {
                // Convert TSX to DOM Node
                const domNode = document.createElement("div")
                // Solve Mouse Wheel Scrolling Issue in Popup
                domNode.onwheel = (e) => e.stopPropagation()
                rangeNode && createRoot(domNode).render(rangeNode(closeFizzRangeWidget, editorInfo.current))
                return domNode
            },
            getPosition: function () {
                const currentPos = reqEditor.getPosition()

                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // Update Widget Position
                this.getPosition()
                reqEditor.layoutContentWidget(this)
            }
        }
        // Menu Visibility
        // if (false) {
        //     closeFizzSelectWidget()
        //     return
        // }

        // Close Clicked Menu
        const closeFizzSelectWidget = () => {
            fizzSelectWidget.isOpen = false
            reqEditor.removeContentWidget(fizzSelectWidget)
        }
        // Close Selected Menu
        const closeFizzRangeWidget = () => {
            fizzRangeWidget.isOpen = false
            reqEditor.removeContentWidget(fizzRangeWidget)
        }

        // Editor Update Before Close
        closeFizzSelectWidget()
        closeFizzRangeWidget()

        reqEditor?.getModel()?.pushEOL(editor.EndOfLineSequence.CRLF)
        reqEditor.onMouseMove((e) => {
            try {
                // const pos = e.target.position
                // if (pos?.lineNumber) {
                //     const lineOffset = pos.lineNumber - (reqEditor.getPosition()?.lineNumber || 0)
                //     // Remove Menu if Out of Range
                //     if (lineOffset > 2 || lineOffset < -2) {
                //         // console.log("Within Two Lines");
                //         closeFizzSelectWidget()
                //         closeFizzRangeWidget()
                //     }
                // }

                const {target, event} = e
                const {posy} = event
                const detail = target.type === editor.MouseTargetType.CONTENT_WIDGET || 
                               target.type === editor.MouseTargetType.OVERLAY_WIDGET ?
                               target.detail : undefined
                const lineHeight = reqEditor.getOption(monaco.editor.EditorOption.lineHeight)
                if (
                    detail !== selectId &&
                    detail !== rangeId &&
                    downPosY.current &&
                    upPosY.current
                ) {
                    const overHeight = overLine * lineHeight
                    if (fizzSelectWidget.isOpen) {
                        if (posy < upPosY.current - overHeight || posy > upPosY.current + overHeight) {
                            closeFizzSelectWidget()
                        }
                    } else if (fizzRangeWidget.isOpen) {
                        // Selection Range From Top to Bottom
                        if (
                            downPosY.current < upPosY.current &&
                            (posy < downPosY.current - overHeight || posy > upPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                        // Selection Range From Bottom to Top
                        else if (
                            downPosY.current > upPosY.current &&
                            (posy < upPosY.current - overHeight || posy > downPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            }
        })

        // Trigger on Exiting Editor
        // reqEditor.onMouseLeave(() => {
        //     closeFizzSelectWidget()
        //     closeFizzRangeWidget()
        // })

        reqEditor.onMouseDown((e) => {
            const {leftButton, posy} = e.event
            // When Neither are Open
            if (leftButton && !fizzSelectWidget.isOpen && !fizzRangeWidget.isOpen) {
                // Record posy Position
                downPosY.current = posy
            }
        })

        reqEditor.onMouseUp((e) => {
            // @ts-ignore
            const {leftButton, rightButton, posx, posy, editorPos} = e.event
            // Get Editor’s x, y, Dimensions
            const {x, y} = editorPos
            const editorHeight = editorPos.height
            const editorWidth = editorPos.width

            // Calculate Focus Coordinates
            let a: any = reqEditor.getPosition()
            const position = reqEditor.getScrolledVisiblePosition(a)
            if (position) {
                // Get Focus Position in Editor, Height per Line Varies with Font Size）
                const {top, left, height} = position

                // Solution 1
                // Get Focus Position to Determine Editor Location (Top, Bottom, Left, Right) for Popup Direction
                // Issue: Need Focus Position to Calculate. How to Get? Only Line and Column Numbers Found, No Exact Coordinates
                // console.log("Focus Position：", e, x, left, y, top, x + left, y + top)
                const focusX = x + left
                const focusY = y + top

                // Focus and Lift-Off Coordinates Within Bounds
                const isOver: boolean = overLine * height < Math.abs(focusY - posy)
                if (leftButton && !isOver) {
                    // Get Editor Container Info to Determine Specific Position in Editor
                    const editorContainer = reqEditor.getDomNode()
                    if (editorContainer) {
                        const editorContainerInfo = editorContainer.getBoundingClientRect()
                        const {top, bottom, left, right} = editorContainerInfo
                        // Display Based on Editor Size (Hide if Width < 250 or Height < 200))
                        const isShowByLimit = ((right-left)>250)&&((bottom-top)>200)
                        // Determine Focus Position
                        const isTopHalf = focusY < (top + bottom) / 2
                        const isLeftHalf = focusX < (left + right) / 2
                        // Line Height
                        // const lineHeight = reqEditor.getOption(monaco.editor.EditorOption.lineHeight)

                        let countDirection: CountDirectionProps = {}
                        if (isTopHalf) {
                            // Mouse on Top Half of Editor
                            countDirection.y = "top"
                        } else {
                            // Mouse on Bottom Half of Editor
                            countDirection.y = "bottom"
                        }
                        if (Math.abs(focusX - (left + right) / 2) < 50) {
                            // Mouse in Middle of Editor
                            countDirection.x = "middle"
                        } else if (isLeftHalf) {
                            // Mouse on Left Half of Editor
                            countDirection.x = "left"
                        } else {
                            // Mouse on Right Half of Editor
                            countDirection.x = "right"
                        }
                        editorInfo.current = {
                            direction: countDirection,
                            top,
                            bottom,
                            left,
                            right,
                            focusX,
                            focusY,
                            lineHeight: height
                        }

                        upPosY.current = posy
                        const selection = reqEditor.getSelection()
                        if (selection&&isShowByLimit) {
                            const selectedText = reqEditor.getModel()?.getValueInRange(selection) || ""
                            if (fizzSelectWidget.isOpen && selectedText.length === 0) {
                                // Update Clicked Menu Widget Position
                                fizzSelectWidget.update()
                            } else if (fizzRangeWidget.isOpen && selectedText.length !== 0) {
                                fizzRangeWidget.update()
                            } else if (selectedText.length === 0) {
                                closeFizzRangeWidget()
                                // Display Clicked Menu
                                selectId && reqEditor.addContentWidget(fizzSelectWidget)
                                fizzSelectWidget.isOpen = true
                            } else {
                                closeFizzSelectWidget()
                                // Display Selected Menu
                                rangeId && reqEditor.addContentWidget(fizzRangeWidget)
                                fizzRangeWidget.isOpen = true
                            }
                        }
                        else{
                            closeFizzRangeWidget()
                            closeFizzSelectWidget()
                        }
                    }
                }
                if (rightButton) {
                    closeFizzRangeWidget()
                    closeFizzSelectWidget()
                }
            }
        })
        // Listen to Cursor Movement
        reqEditor.onDidChangeCursorPosition((e) => {
            closeFizzRangeWidget()
            closeFizzSelectWidget()
            // const { position } = e;
            // console.log('Current Cursor Position：', position);
        })
    }
    return (
        <NewHTTPPacketEditor
            onEditor={(Editor: IMonacoEditor) => {
                setReqEditor(Editor)
                onEditor && onEditor(Editor)
            }}
            {...otherProps}
        />
    )
}
