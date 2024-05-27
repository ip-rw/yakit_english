import React, {useMemo, useEffect, useRef, useState} from "react"
import {Tag, TagProps, Tooltip} from "antd"
import {useGetState} from "ahooks"

import "./BaseTags.scss"
import classNames from "classnames"
import styles from "./BaswButton.module.scss"
export interface TagsListProps extends TagProps {
    data: string[]
    ellipsis?: boolean
    className?: string
    size?: "big" | "small"
}

// Tags Display Component
export const TagsList: React.FC<TagsListProps> = React.memo((props) => {
    const {data, ellipsis, className, size, ...otherProps} = props
    const tagListRef = useRef<any>(null)
    const tagEllipsis = useRef<any>(null)
    // Display Data Source
    const [dataSource, setDataSource] = useState<string[]>([])
    // Hidden Items After Ellipsis
    const [ellipsisTags, setEllipsisTags, getEllipsisTags] = useGetState<string[]>([])
    useEffect(() => {
        // Ellipsis Mode Dynamic Calculation
        if (ellipsis) {
            const {current} = tagListRef
            const boxWidth = current.offsetWidth
            const ellipsisWidth = tagEllipsis.current.offsetWidth
            let countWidth = 0 //Calculate Current Width
            const lastItem = current.children.length - 1 // Last Item Index
            const itemMargin = 8 //Item Margin
            // ps: loop does not account for the final...extension item
            let showTagsArr: string[] = []
            let ellipsisTagsArr: string[] = []
            for (let i = 0; i <= lastItem; i++) {
                // Full Width of Current Item (including margin))
                let nowItemWidth = current.children[i].offsetWidth + itemMargin
                // Calculate Width After Current Item
                let nowWidth = countWidth + nowItemWidth
                // If Not Last Item, Add...for Width Calculation
                if (i < lastItem && nowWidth + ellipsisWidth < boxWidth) {
                    countWidth += nowItemWidth
                    showTagsArr = [...showTagsArr, data[i]]
                } else if (i === lastItem && nowWidth < boxWidth) {
                    countWidth += nowItemWidth
                    showTagsArr = [...showTagsArr, data[i]]
                } else {
                    ellipsisTagsArr = [...ellipsisTagsArr, data[i]]
                }
            }
            setDataSource(showTagsArr)
            setEllipsisTags(ellipsisTagsArr)
        } else {
            setDataSource(data)
        }
    }, [data])

    const sizeClass = useMemo(() => {
        if (!size) return "base-tags-size"
        if (size === "big") return "base-tags-big-size"
        if (size === "small") return "base-tags-small-size"
        return "base-tags-size"
    }, [size])

    const tooltipStr = ellipsis && ellipsisTags.join("，")
    return (
        <div className={styles["base-tags-list"]}>
            {/* Hide DOM Elements for Real-time Calculation */}
            <div style={{overflow: "hidden", height: 0}} ref={tagListRef}>
                {data.map((item) => (
                    <Tag
                        className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                            [styles[className || ""]]: !!className
                        })}
                        key={item}
                        {...otherProps}
                    >
                        {item}
                    </Tag>
                ))}
            </div>
            <div
                style={{overflow: "hidden", display: "inline-block", position: "absolute", height: 0}}
                ref={tagEllipsis}
            >
                <Tag
                    className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                        [styles[className || ""]]: !!className
                    })}
                    {...otherProps}
                >
                    ...
                </Tag>
            </div>
            {dataSource.map((item) => (
                <Tag
                    className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                        [styles[className || ""]]: !!className
                    })}
                    key={item}
                    {...otherProps}
                >
                    {item}
                </Tag>
            ))}
            {ellipsis && ellipsisTags.length > 0 && (
                <Tooltip title={tooltipStr}>
                    <Tag
                        className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                            [styles[className || ""]]: !!className
                        })}
                        {...otherProps}
                    >
                        ...
                    </Tag>
                </Tooltip>
            )}
        </div>
    )
})
