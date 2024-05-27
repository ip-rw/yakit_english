import React from "react"
import {Tree} from "antd"
import type {DataNode as TreeNode, TreeProps} from "antd/es/tree"
import {OutlineMinusIcon, OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "../YakitEmpty/YakitEmpty"
import styles from "./YakitTree.module.scss"
import classNames from "classnames"

export type TreeKey = string | number
interface YakitTreeProps extends TreeProps {
    showIcon?: boolean // Show tree node icon by default -> Display
    treeData: TreeNode[] // Array of DataNode type required
    classNameWrapper?: string
}

const YakitTree: React.FC<YakitTreeProps> = React.memo((props) => {
    const {showLine = true, showIcon = true, classNameWrapper} = props

    return (
        <div className={classNames(styles.yakitTree, classNameWrapper)}>
            {props.treeData.length ? (
                <Tree
                    {...props}
                    showLine={showLine ? {showLeafIcon: false} : false}
                    showIcon={showIcon}
                    switcherIcon={(p: {expanded: boolean}) => {
                        return p.expanded ? (
                            <OutlineMinusIcon className={styles["switcher-icon"]} />
                        ) : (
                            <OutlinePlusIcon className={styles["switcher-icon"]} />
                        )
                    }}
                ></Tree>
            ) : (
                <YakitEmpty />
            )}
        </div>
    )
})

export default YakitTree
