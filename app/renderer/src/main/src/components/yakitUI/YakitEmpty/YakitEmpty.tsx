import { Empty } from "antd"
import React from "react"
import { YakitEmptyProps } from "./YakitEmptyType"
import styles from "./YakitEmpty.module.scss"
import Icon from "@ant-design/icons"
import { CustomIconComponentProps } from "@ant-design/icons/lib/components/Icon"
import EmptyPng from "./empty.png";

/**
 * @description:YakitEmpty
 * @augments YakitEmptyProps Inherits antd's Empty default props
 */
export const YakitEmpty: React.FC<YakitEmptyProps> = (props) => {
    const { title = "No Data Available",...restProps } = props
    return (
        <Empty
            image={<img src={EmptyPng} alt="" />}
            imageStyle={
                props.imageStyle
                    ? props.imageStyle
                    : {
                        height: 160,
                        width: 160,
                        margin: 'auto',
                        marginBottom: 24
                    }
            }
            {...restProps}
            description={
                props.descriptionReactNode ? (
                    props.descriptionReactNode
                ) : (
                    <div className={styles["yakit-empty"]}>
                        <div className={styles["yakit-empty-title"]}>{title}</div>
                        <div className={styles["yakit-empty-description"]}>{props.description}</div>
                    </div>
                )
            }
        >
            {props.children}
        </Empty>
    )
}
