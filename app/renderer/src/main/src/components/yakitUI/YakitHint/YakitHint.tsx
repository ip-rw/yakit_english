import ReactDOM from "react-dom"
import React, {memo, useMemo, useState} from "react"
import {YakitHintModal} from "./YakitHintModal"
import {YakitHintProps} from "./YakitHintType"
import {usePrevious} from "ahooks"

import classNames from "classnames"
import styles from "./YakitHint.module.scss"

export const YakitHint: React.FC<YakitHintProps> = memo((props) => {
    const {mask = true, maskColor, childModal = [], getContainer, visible, ...rest} = props

    const container = useMemo(() => {
        if (!getContainer) return document.body
        return getContainer
    }, [getContainer])

    const modalsPrevious = usePrevious(childModal)

    const [currentTop, setCurrnetTop] = useState<string>("main")

    const modals = useMemo(() => {
        if (!!modalsPrevious && modalsPrevious.length > 0) {
            for (let index in childModal) {
                /** New data position exceeds old data length */
                const position = +index < modalsPrevious.length
                if (position) {
                    /** New data display is true */
                    const isLatest = childModal[index].content.visible === true
                    /** Old data display is false */
                    const isOld = modalsPrevious[index].content.visible === false
                    /** When false to true, pin popup */
                    if (isLatest && isOld) {
                        setTimeout(() => {
                            setCurrnetTop(childModal[index].key)
                        }, 100)
                        break
                    }
                }
            }
        }

        return childModal
    }, [childModal])

    return ReactDOM.createPortal(
        <div
            style={{backgroundColor: mask && maskColor ? maskColor : ""}}
            className={classNames(visible ? styles["yakit-hint-wrapper"] : styles["yakit-hint-hidden-wrapper"], {
                [styles["yakit-hint-mask-wrapper"]]: mask
            })}
        >
            <div className={styles["yakit-hint-body"]}>
                <YakitHintModal
                    {...rest}
                    isMask={mask}
                    visible={true}
                    isTop={currentTop === "main"}
                    setTop={() => setCurrnetTop("main")}
                />
                {modals.map((item) => {
                    const {key, content} = item

                    return (
                        <YakitHintModal
                            {...content}
                            key={key}
                            isMask={mask}
                            isTop={currentTop === key}
                            setTop={() => setCurrnetTop(key)}
                        />
                    )
                })}
            </div>
        </div>,
        container
    )
})
