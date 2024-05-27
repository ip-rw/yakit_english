import ReactDOM from "react-dom"
import React, {memo, ReactNode, useEffect, useRef} from "react"
import {coordinate} from "@/pages/globalVariable"
import {YakitMenu, YakitMenuProp} from "./YakitMenu"
import {createRoot} from "react-dom/client"
import styles from "./showByRightContext.module.scss"

const roundDown = (value: number) => {
    return Math.floor(value)
}

const genX = (client, coordinate, target) => {
    if (target + coordinate > client) {
        return coordinate - target - 6
    } else {
        return coordinate + 6
    }
}
const genY = (client, coordinate, target) => {
    const heightDiff = target + coordinate - client
    if (heightDiff <= -10) {
        return coordinate + 6
    }
    if (heightDiff > -10 && coordinate > target + 6) {
        return coordinate - target - 6
    }
    if (heightDiff > -10 && coordinate <= target + 6) {
        return coordinate - heightDiff - 6
    }
}

const ContextMenuId = "yakit-right-context"

/**
 * @name Generates a display box at the mouse position (props default to menu component, but can also pass a custom component)
 * @description x and y parameters are optional, content is displayed at the x-y coordinate when specified
 */
export const showByRightContext = (props: YakitMenuProp | ReactNode, x?: number, y?: number, isForce?: boolean) => {
    let divExisted = document.getElementById(ContextMenuId)

    if (isForce) {
        if (divExisted) divExisted.remove()
        divExisted = null
    }

    const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement("div")

    /** body's Display Height and Width; indicates the height and width of the area where the body is displayed in the browser */
    const clientHeight = roundDown(document.body.getBoundingClientRect().height || 0)
    const clientWidth = roundDown(document.body.getBoundingClientRect().width || 0)
    /** Mouse Coordinate */
    let left = x || coordinate.clientX
    let top = y || coordinate.clientY
    /** Right-Click Display Element Dimensions */
    const divWidth = roundDown(div.getBoundingClientRect().width || 0)
    const divHeight = roundDown(div.getBoundingClientRect().height || 0)
        /**RightContext Root Node */
        // let rightContextRootDiv

    if (divWidth > 0 && divHeight > 0) {
        // y Coordinate Calculation
        top = genY(clientHeight, top, divHeight)
        // x Coordinate Calculation
        left = genX(clientWidth, left, divWidth)
        div.style.left = `${left}px`
        div.style.top = `${top}px`
    } else {
        div.style.left = `-9999px`
        div.style.top = `-9999px`
    }

    div.style.position = "absolute"
    div.style.zIndex = "9999"
    div.id = ContextMenuId
    div.className = "popup"
    document.body.appendChild(div)

    const destory = () => {
        // if (rightContextRootDiv) {
        //     rightContextRootDiv.unmount()
        // }
        const unmountResult = ReactDOM.unmountComponentAtNode(div)
        if (unmountResult && div.parentNode) {
            div.parentNode.removeChild(div)
        }
    }

    const offsetPosition = (width: number, height: number) => {
        // y Coordinate Calculation
        top = genY(clientHeight, top, height)
        // x Coordinate Calculation
        left = genX(clientWidth, left, width)
        div.style.left = `${left}px`
        div.style.top = `${top}px`
    }

    const render = () => {
        setTimeout(() => {
            document.addEventListener("click", function onClickOutsize() {
                destory()
                document.removeEventListener("click", onClickOutsize)
            })
            // document.addEventListener("contextmenu", function onContextMenuOutsize() {
            //     destory()
            //     document.removeEventListener("contextmenu", onContextMenuOutsize)
            // })
            // if (!rightContextRootDiv) {
            //     rightContextRootDiv = createRoot(div)
            // }
            // rightContextRootDiv.render(<RightContext data={props} callback={offsetPosition} />)
            // The above comment is a new syntax in react 18, but under the antd menu, there is a problem with multiple sub-menus opening at the same time
            ReactDOM.render(<RightContext data={props} callback={offsetPosition} />, div)
        })
    }
    render()

    return {destroy: destory}
}

interface RightContextProp {
    data: YakitMenuProp | ReactNode
    callback?: (width: number, height: number) => any
}
const RightContext: React.FC<RightContextProp> = memo((props) => {
    const {data, callback} = props

    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if ((wrapperRef.current?.clientWidth || 0) > 0 && (wrapperRef.current?.clientHeight || 0) > 0) {
            if (callback) callback(wrapperRef.current?.clientWidth || 0, wrapperRef.current?.clientHeight || 0)
        }
    }, [wrapperRef])

    return (
        <div className={styles["show-by-right-context-wrapper"]} ref={wrapperRef}>
            {React.isValidElement(data) ? data : <YakitMenu {...(data as YakitMenuProp)} />}
        </div>
    )
})
