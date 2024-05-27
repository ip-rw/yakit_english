import ReactDOM from "react-dom"
import React, {memo, useLayoutEffect, useMemo, useRef, useState} from "react"
import {
    YakitWindowContentProps,
    WindowPositionOPProps,
    WindowPositionType,
    YakitWindowProps,
    YakitWindowCacheSizes,
    YakitWindowCacheSizeProps
} from "./YakitWindowType"
import {useDebounce, useDebounceEffect, useDebounceFn, useGetState, useMemoizedFn, useSize, useThrottleFn} from "ahooks"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {YakitButton} from "../YakitButton/YakitButton"
import {OutlineDotshorizontalIcon, OutlineXIcon} from "@/assets/icon/outline"
import {SolidFloatwinIcon, SolidTodownIcon, SolidToleftIcon, SolidTorightIcon} from "@/assets/icon/solid"
import {Tooltip} from "antd"
import {YakitPopover} from "../YakitPopover/YakitPopover"
import {Resizable} from "re-resizable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import cloneDeep from "lodash/cloneDeep"

import classNames from "classnames"
import styles from "./YakitWindow.module.scss"

const DefaultCacheSize: YakitWindowCacheSizes = {
    shrink: {width: 0, height: 0},
    bottom: {width: 0, height: 0},
    left: {width: 0, height: 0},
    right: {width: 0, height: 0}
}

/**
 * @name yakit-Form Widget (Draggable, Movable, Resizable))
 * @description Setting a default initial dock position not recommended due to size saving
 * @description Not supported for other scenarios, ask first
 * @description Component becomes business-specific due to urgent changes, not suitable for public use
 * @description When displaying down, left should not start from 0 due to left side occupation
 */
export const YakitWindow: React.FC<YakitWindowProps> = memo((props) => {
    const {
        getContainer,
        visible,
        layout = "center",
        defaultDockSide = [/* "shrink", */ "left", "right", "bottom"],
        isDrag = true,
        width = 300,
        height = 360,
        minWidth = 240,
        minHeight = 200,
        onResize,
        cacheSizeKey,
        firstDockSide="right",
        ...rest
    } = props

    /** -------------------- Docking Logic Start -------------------- */
    // Default Form Dock Node is body element
    const container = useMemo(() => {
        if (!getContainer) return document.body
        return getContainer
    }, [getContainer])
    // Form Dock Node Top Position
    const dockSideTop = useMemo(() => {
        return container?.getBoundingClientRect()?.top || 37
    }, [container])
    // Form Dock Node Left Position
    const dockSideLeft = useMemo(() => {
        return container?.getBoundingClientRect()?.left || 0
    }, [container])
    // Form Dock Node Visible Width & Height)
    const containerWH = useSize(container)
    /** Form Max Display Width & Max Width Change */
    const winMaxWidth = useMemo(() => {
        return {
            show: containerWH?.width || "100%",
            change: containerWH?.width ? Math.trunc(containerWH.width * 0.9) : "95%"
        }
    }, [containerWH])
    /** Form Max Display Height & Max Height Change */
    const winMaxHeight = useMemo(() => {
        return {
            show: containerWH?.height || "100%",
            change: containerWH?.height ? Math.trunc(containerWH.height * 0.9) : "90%"
        }
    }, [containerWH])
    /** -------------------- Docking Logic End -------------------- */

    /** -------------------- Form Size Cache Logic Start -------------------- */
    /** Cached Form Size */
    const cacheSize = useRef<YakitWindowCacheSizes>(cloneDeep(DefaultCacheSize))
    // Get Cached Size Data
    useLayoutEffect(() => {
        if (visible) {
            if (cacheSizeKey) {
                getRemoteValue(cacheSizeKey)
                    .then((value: string) => {
                        if (value) {
                            try {
                                cacheSize.current = JSON.parse(value)
                                const {width, height} = cacheSize.current["shrink"] || {}
                                if (shrinkRef && shrinkRef.current) {
                                    shrinkRef.current.updateSize({
                                        width: width,
                                        height: height
                                    })
                                }
                            } catch (error) {}
                        }
                    })
                    .catch(() => {})
            }

            return () => {
                cacheSize.current = cloneDeep(DefaultCacheSize)
            }
        }
    }, [visible, cacheSizeKey])
    // Set Cached Size Data
    const setCacheSize = useDebounceFn(
        useMemoizedFn((type: WindowPositionType, size: YakitWindowCacheSizeProps) => {
            if (!cacheSizeKey) return
            const cache: YakitWindowCacheSizes = cloneDeep(cacheSize.current)
            cache[type] = {...size}
            setRemoteValue(cacheSizeKey, JSON.stringify(cache))
        }),
        {wait: 300}
    ).run
    /** -------------------- Form Size Cache Logic End -------------------- */

    /** -------------------- Form Dock Mode & Size Change Logic End -------------------- */
    // Form Dock Mode
    const [dockSide, setDockSide, getDockSide] = useGetState<WindowPositionType>(firstDockSide)
    const onDockSide = useMemoizedFn((side: WindowPositionType) => {
        if (!defaultDockSide.includes(side)) return
        if (side === getDockSide()) return
        setDockSide(side)
    })
    const leftRef = useRef<any>(null)
    const rightRef = useRef<any>(null)
    const bottomRef = useRef<any>(null)
    const shrinkRef = useRef<any>(null)

    // Form Size Change Listener
    const onShrinkResize = useThrottleFn(
        useMemoizedFn((type: WindowPositionType) => {
            let windowRef: any = null

            switch (type) {
                case "shrink":
                    windowRef = shrinkRef
                    break
                case "bottom":
                    windowRef = bottomRef
                    break
                case "left":
                    windowRef = leftRef
                    break
                case "right":
                    windowRef = rightRef
                    break
            }

            if (windowRef && windowRef.current) {
                const {width, height} = windowRef.current?.state || {}
                if (width && height) {
                    if (onResize) onResize({type: type, size: {width: width, height: height}})
                    if (cacheSizeKey) setCacheSize(type, {width: width, height: height})
                }
            }
        }),
        {wait: 100}
    ).run

    // Form Size Sync on Dock Node Resize
    useDebounceEffect(
        () => {
            if (getDockSide() === "shrink") return

            if (getDockSide() === "left") {
                if (!leftRef || !leftRef.current) return
                leftRef.current.updateSize({width: leftRef.current?.state?.width, height: winMaxHeight.show})
                return
            }

            if (getDockSide() === "right") {
                if (!rightRef || !rightRef.current) return
                rightRef.current.updateSize({width: rightRef.current?.state?.width, height: winMaxHeight.show})
                return
            }

            if (getDockSide() === "bottom") {
                if (!bottomRef || !bottomRef.current) return
                bottomRef.current.updateSize({width: winMaxWidth.show, height: bottomRef.current?.state?.height})
                return
            }
        },
        [winMaxWidth, winMaxHeight],
        {
            wait: 100
        }
    )
    /** -------------------- Form Dock Mode & Size Change Logic End -------------------- */

    const layoutClass = useMemo(() => {
        if (layout === "center") return ""
        return styles[`yakit-window-${layout}`]
    }, [])
    const layoutDragEnable = useMemo(() => {
        if (layout === "center" || layout === "topLeft") {
            return {
                top: false,
                right: true,
                bottom: true,
                left: false,
                topRight: false,
                bottomRight: true,
                bottomLeft: false,
                topLeft: false
            }
        }
        if (layout === "topRight") {
            return {
                top: false,
                right: false,
                bottom: true,
                left: true,
                topRight: false,
                bottomRight: false,
                bottomLeft: true,
                topLeft: false
            }
        }
        if (layout === "bottomLeft") {
            return {
                top: true,
                right: true,
                bottom: false,
                left: false,
                topRight: true,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false
            }
        }
        if (layout === "bottomRight") {
            return {
                top: true,
                right: false,
                bottom: false,
                left: true,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: true
            }
        }

        return {
            top: false,
            right: false,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false
        }
    }, [])

    const [disabled, setDisabled, getDisabled] = useGetState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const debouncedBounds = useDebounce(bounds, {wait: 500})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** Drag Area Callback */
    const onActiveDrag = useMemoizedFn((v: boolean) => {
        if (!isDrag) {
            if (!getDisabled()) setDisabled(true)
            return
        }
        if (getDisabled() === v) setDisabled(!v)
    })
    /** Window Drag Event */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        let containerTop = dockSideTop > 37 ? dockSideTop : 37
        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + containerTop,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    // Dock Left
    if (dockSide === "left") {
        return (
            <Resizable
                ref={leftRef}
                key='dock-side-left'
                className={classNames({
                    [styles["yakit-window-hidden-wrapper"]]: !visible
                })}
                style={{position: "fixed", top: dockSideTop, left: 0, zIndex: 1002}}
                defaultSize={{width: cacheSize.current["left"]?.width || width, height: winMaxHeight.show}}
                minHeight={winMaxHeight.show}
                minWidth={minWidth}
                maxWidth={winMaxWidth.change}
                enable={{
                    top: false,
                    right: true,
                    bottom: false,
                    left: false,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false
                }}
                onResize={() => onShrinkResize("left")}
            >
                <YakitWindowContent
                    {...rest}
                    defaultDockSide={defaultDockSide}
                    activeDockSide={dockSide}
                    onDockSide={onDockSide}
                    callbackDrag={onActiveDrag}
                />
            </Resizable>
        )
    }
    // Dock Right
    if (dockSide === "right") {
        return (
            <Resizable
                ref={rightRef}
                key='dock-side-right'
                className={classNames({
                    [styles["yakit-window-hidden-wrapper"]]: !visible
                })}
                style={{position: "fixed", top: dockSideTop, right: 0, zIndex: 1002}}
                defaultSize={{width: cacheSize.current["right"]?.width || width, height: winMaxHeight.show}}
                minHeight={winMaxHeight.show}
                minWidth={minWidth}
                maxWidth={winMaxWidth.change}
                enable={{
                    top: false,
                    right: false,
                    bottom: false,
                    left: true,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false
                }}
                onResize={() => onShrinkResize("right")}
            >
                <YakitWindowContent
                    {...rest}
                    defaultDockSide={defaultDockSide}
                    activeDockSide={dockSide}
                    onDockSide={onDockSide}
                    callbackDrag={onActiveDrag}
                />
            </Resizable>
        )
    }
    // Dock Bottom
    if (dockSide === "bottom") {
        return (
            <Resizable
                ref={bottomRef}
                key='dock-side-bottom'
                className={classNames({
                    [styles["yakit-window-hidden-wrapper"]]: !visible
                })}
                style={{position: "fixed", bottom: 0, left: dockSideLeft, zIndex: 1002}}
                defaultSize={{width: winMaxWidth.show, height: cacheSize.current["bottom"]?.height || height}}
                minWidth={winMaxWidth.show}
                minHeight={minHeight}
                maxHeight={winMaxHeight.change}
                enable={{
                    top: true,
                    right: false,
                    bottom: false,
                    left: false,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false
                }}
                onResize={() => onShrinkResize("bottom")}
            >
                <YakitWindowContent
                    {...rest}
                    defaultDockSide={defaultDockSide}
                    activeDockSide={dockSide}
                    onDockSide={onDockSide}
                    callbackDrag={onActiveDrag}
                />
            </Resizable>
        )
    }

    // Dock Mode-Floating
    return ReactDOM.createPortal(
        <Draggable
            defaultClassName={classNames(
                styles["yakit-window-wrapper"],
                {
                    [styles["yakit-window-hidden-wrapper"]]: !visible,
                    [styles["yakit-window-center"]]: layout === "center"
                },
                layoutClass
            )}
            disabled={disabled}
            bounds={debouncedBounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div
                ref={draggleRef}
                style={layout === "center" ? {left: `calc(50% - ${Math.trunc(width / 2)}px)`} : undefined}
            >
                <Resizable
                    ref={shrinkRef}
                    defaultSize={{width: width, height: height}}
                    minWidth={minWidth}
                    minHeight={minHeight}
                    enable={{...layoutDragEnable}}
                    onResize={() => onShrinkResize("shrink")}
                >
                    <YakitWindowContent
                        {...rest}
                        defaultDockSide={defaultDockSide}
                        activeDockSide={dockSide}
                        onDockSide={onDockSide}
                        callbackDrag={onActiveDrag}
                    />
                </Resizable>
            </div>
        </Draggable>,
        container
    )
})

/** @name Form Display Pos-Action Widget */
export const WindowPositionOP: React.FC<WindowPositionOPProps> = memo((props) => {
    const {defaultDockSide = ["shrink", "left", "right", "bottom"], activeDockSide, onDockSide} = props

    const onType = (v: WindowPositionType) => {
        if (v !== activeDockSide) {
            onDockSide && onDockSide(v)
        }
    }

    return (
        <div className={styles["window-position-op-wrapper"]}>
            <Tooltip title={"Floating Window"}>
                {defaultDockSide.includes("shrink") && (
                    <YakitButton
                        type='text2'
                        isActive={activeDockSide === "shrink"}
                        icon={<SolidFloatwinIcon />}
                        onClick={() => onType("shrink")}
                    />
                )}
            </Tooltip>

            <Tooltip title={"Down"}>
                {defaultDockSide.includes("bottom") && (
                    <YakitButton
                        type='text2'
                        isActive={activeDockSide === "bottom"}
                        icon={<SolidTodownIcon />}
                        onClick={() => onType("bottom")}
                    />
                )}
            </Tooltip>

            <Tooltip title={"Left"}>
                {defaultDockSide.includes("left") && (
                    <YakitButton
                        type='text2'
                        isActive={activeDockSide === "left"}
                        icon={<SolidToleftIcon />}
                        onClick={() => onType("left")}
                    />
                )}
            </Tooltip>

            <Tooltip title={"Right"}>
                {defaultDockSide.includes("right") && (
                    <YakitButton
                        type='text2'
                        isActive={activeDockSide === "right"}
                        icon={<SolidTorightIcon />}
                        onClick={() => onType("right")}
                    />
                )}
            </Tooltip>
        </div>
    )
})
/** @name Form Display Pos-Action Widget (Small Mode)) */
export const WindowPositionOPMenu: React.FC<WindowPositionOPProps> = memo((props) => {
    const {defaultDockSide = ["shrink", "left", "right", "bottom"], activeDockSide, onDockSide} = props

    const [show, setShow] = useState<boolean>(false)

    const content = useMemo(() => {
        return (
            <WindowPositionOP
                defaultDockSide={defaultDockSide}
                activeDockSide={activeDockSide}
                onDockSide={(v) => {
                    setShow(false)
                    if (onDockSide) onDockSide(v)
                }}
            />
        )
    }, [defaultDockSide, activeDockSide, onDockSide])

    return (
        <YakitPopover
            overlayClassName={styles["window-position-op-popover"]}
            overlayStyle={{paddingTop: 2}}
            title={<span>Docking Position</span>}
            placement={"bottomRight"}
            content={content}
            trigger='hover'
            visible={show}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <YakitButton isHover={show} type='text2' icon={<OutlineDotshorizontalIcon />} />
        </YakitPopover>
    )
})

/** @name Form Content Widget */
const YakitWindowContent: React.FC<YakitWindowContentProps> = memo((props) => {
    const {
        defaultDockSide = [],
        activeDockSide,
        onDockSide,
        callbackDrag,
        wrapClassName,
        headerStyle,
        contentStyle,
        footerStyle,
        title,
        subtitle,
        footerExtra,
        okButtonText = "Confirm",
        okButtonProps,
        onOk,
        cancelButtonText = "Cancel",
        cancelButtonProps,
        onCancel
    } = props

    const divRef = useRef<HTMLDivElement>(null)
    const winSize = useSize(divRef)

    const docSideClassName = useMemo(() => {
        if (activeDockSide === "shrink") return ""
        return styles[`yakit-window-${activeDockSide}-body`]
    }, [activeDockSide])

    return (
        <div ref={divRef} className={classNames(styles["yakit-window-body"], docSideClassName, wrapClassName)}>
            <div
                style={headerStyle}
                className={styles["yakit-window-body-header"]}
                onMouseEnter={() => callbackDrag(true)}
                onMouseLeave={() => callbackDrag(false)}
            >
                <div className={styles["header-left"]}>
                    <div className={styles["title-wrapper"]}>{title}</div>
                    <div className={styles["subtitle-wrapper"]}>{subtitle}</div>
                </div>
                <div className={styles["header-right"]}>
                    {winSize && winSize.width > 400 && (
                        <WindowPositionOP
                            defaultDockSide={defaultDockSide}
                            activeDockSide={activeDockSide}
                            onDockSide={onDockSide}
                        />
                    )}
                    {winSize && winSize.width <= 400 && (
                        <WindowPositionOPMenu
                            defaultDockSide={defaultDockSide}
                            activeDockSide={activeDockSide}
                            onDockSide={onDockSide}
                        />
                    )}
                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onCancel} />
                </div>
            </div>
            <div style={contentStyle} className={styles["yakit-window-body-content"]}>
                {props.children || null}
            </div>
            <div style={footerStyle} className={styles["yakit-window-body-footer"]}>
                {footerExtra}
                <div className={styles["btn-group"]}>
                    <YakitButton type='outline2' size='large' onClick={onCancel} {...cancelButtonProps}>
                        {cancelButtonText}
                    </YakitButton>
                    <YakitButton size='large' onClick={onOk} {...okButtonProps}>
                        {okButtonText}
                    </YakitButton>
                </div>
            </div>
        </div>
    )
})
