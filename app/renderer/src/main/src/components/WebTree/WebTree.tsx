import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import YakitTree, {TreeKey} from "../yakitUI/YakitTree/YakitTree"
import type {DataNode} from "antd/es/tree"
import {useInViewport, useMemoizedFn} from "ahooks"
import {
    OutlineDocumentIcon,
    OutlineFolderremoveIcon,
    OutlineLink2Icon,
    OutlineVariableIcon
} from "@/assets/icon/outline"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURL, YakURLResource} from "@/pages/yakURLTree/data"
import {SolidFolderaddIcon} from "@/assets/icon/solid"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import styles from "./WebTree.module.scss"

type TreeNodeType = "dir" | "file" | "query" | "path"
export interface TreeNode extends DataNode {
    data?: YakURLResource // Additional Node Data
}

interface WebTreeProp {
    ref?: React.Ref<any>
    height: number // Tree Height for Virtual Scroll
    searchVal?: string // Search Tree Value
    searchInputDisabled?: boolean
    searchPlaceholder?: string // Search Placeholder
    treeExtraQueryparams: string // Tree Query Params as JSON String
    refreshTreeWithSearchVal?: boolean // Refresh Tree with Search Conditions?
    refreshTreeFlag?: boolean // On Table Params Change, Refresh Tree?->Do Not Refresh
    onSelectNodes?: (selectedNodes: TreeNode[]) => void // Selected Node's Nodes
    onSelectKeys?: (selectedKeys: TreeKey[]) => void // Selected Node's Keys
    onGetUrl?: (searchURL: string, includeInUrl: string) => void // Get Selected Node's URL for Table Query
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // Reset Table Display - Hide Editor

    /** runtime-id Filter for Web Tree) */
    runTimeId?: string
}

/**
 * Checkbox Not Supported, Select Single Mode Only
 */
export const WebTree: React.FC<WebTreeProp> = React.forwardRef((props, ref) => {
    const {
        height,
        searchVal = "",
        searchInputDisabled = false,
        refreshTreeWithSearchVal = false,
        searchPlaceholder = "Enter Keywords",
        treeExtraQueryparams,
        refreshTreeFlag = false,
        onSelectNodes,
        onSelectKeys,
        onGetUrl,
        resetTableAndEditorShow,
        runTimeId = ""
    } = props

    const [treeLoading, setTreeLoading] = useState<boolean>(false)
    // Web Tree Before Search
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    // Web Tree After Search
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([])
    /** Check if Searched */
    const searchTreeFlag = useRef<boolean>(!!searchVal)

    const [searchValue, setSearchValue] = useState<string>(searchVal)
    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([]) // Expand Node Key Set
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>([]) // Select Node Key Set
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // Select Node Data Set
    const webTreeRef = useRef<any>()
    const [inViewport] = useInViewport(webTreeRef)

    useImperativeHandle(ref, () => ({
        onJumpWebTree
    }))

    const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
        const iconsEle = {
            ["file"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
            ["query"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
            ["path"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
        }
        return iconsEle[treeNodeType] || <></>
    }

    const getTreeData = useMemoizedFn((yakurl: string) => {
        if(treeLoading)return

        // Debounce, Call API after 30ms
        setTreeLoading(true)
        setTimeout(() => {
            let params: string = ""
            if (treeExtraQueryparams) {
                params = `params=${treeExtraQueryparams}`
            }

            let search: string = ""
            if (searchTreeFlag.current) {
                setSearchWebTreeData([])
                search = params ? `&search=${1}` : `search=${1}`
            } else {
                setWebTreeData([])
            }

            let runTime_id: string = ""
            if (runTimeId) {
                runTime_id = params || search ? `&runtime_id=${runTimeId}` : `runtime_id=${runTimeId}`
            }

            loadFromYakURLRaw(`${yakurl}?${params}${search}${runTime_id}`, (res) => {
                // Check if Search Tree
                if (searchTreeFlag.current) {
                    setSearchWebTreeData(assembleFirstTreeNode(res.Resources))
                } else {
                    setWebTreeData(assembleFirstTreeNode(res.Resources))
                }
                setTimeout(() => {
                    setTreeLoading(false)
                }, 50)
            }).catch((error) => {
                setTreeLoading(false)
                yakitFailed(`Loading Failed: ${error}`)
            })
        }, 30)
    })

    // First Layer Tree Nodes
    const assembleFirstTreeNode = (arr: YakURLResource[]) => {
        return arr.map((item, index) => {
            const id = item.VerboseName
            return {
                title: item.VerboseName,
                key: id,
                isLeaf: !item.HaveChildrenNodes,
                data: item,
                icon: ({expanded}) => {
                    if (item.ResourceType === "dir") {
                        return expanded ? (
                            <OutlineFolderremoveIcon className='yakitTreeNode-icon' />
                        ) : (
                            <SolidFolderaddIcon className='yakitTreeNode-icon' />
                        )
                    }
                    return renderTreeNodeIcon(item.ResourceType as TreeNodeType)
                }
            } as TreeNode
        })
    }

    const refreshChildrenByParent = useMemoizedFn((origin: TreeNode[], parentKey: string, nodes: TreeNode[]) => {
        const arr: TreeNode[] = origin.map((node) => {
            if (node.key === parentKey) {
                return {
                    ...node,
                    children: nodes
                } as TreeNode
            }
            if (node.children) {
                return {
                    ...node,
                    children: refreshChildrenByParent(node.children, parentKey, nodes)
                } as TreeNode
            }
            return node
        })
        return arr
    })

    // Async Load Child Nodes
    const onLoadWebTreeData = ({key, children, data}: any) => {
        return new Promise<void>((resolve, reject) => {
            if (data === undefined) {
                reject("node.data is empty")
                return
            }
            const obj: YakURL = {...data.Url, Query: []}
            if (treeExtraQueryparams) {
                obj.Query.push({Key: "params", Value: treeExtraQueryparams})
            }

            if (key.startsWith("https://")) {
                obj.Query.push({Key: "schema", Value: "https"})
            } else if (key.startsWith("http://")) {
                obj.Query.push({Key: "schema", Value: "http"})
            }

            if (runTimeId) {
                obj.Query.push({Key: "runtime_id", Value: runTimeId})
            }

            requestYakURLList(
                obj,
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
                        const id = key + "/" + i.ResourceName
                        return {
                            title: i.VerboseName,
                            key: id,
                            isLeaf: !i.HaveChildrenNodes,
                            data: i,
                            icon: ({expanded}) => {
                                if (i.ResourceType === "dir") {
                                    return expanded ? (
                                        <OutlineFolderremoveIcon className='yakitTreeNode-icon' />
                                    ) : (
                                        <SolidFolderaddIcon className='yakitTreeNode-icon' />
                                    )
                                }
                                return renderTreeNodeIcon(i.ResourceType as TreeNodeType)
                            }
                        }
                    })
                    // Check if Search Tree
                    if (searchTreeFlag.current) {
                        setSearchWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodes))
                    } else {
                        setWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodes))
                    }
                    resolve()
                },
                reject
            )
        })
    }

    // Search Tree
    const onSearchTree = useMemoizedFn((value: string) => {
        const val = value.trim()
        const flag = val === "/" ? false : !!val.trim()
        searchTreeFlag.current = flag
        setExpandedKeys([])
        setSelectedKeys([])
        if (val === "" && selectedNodes.length) {
            setSelectedNodes([])
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        setSearchValue(val)
        getTreeData("website://" + `${val ? val : "/"}`)
    })

    useEffect(() => {
        searchVal && onSearchTree(searchVal)
    }, [searchVal])

    useEffect(() => {
        if (treeExtraQueryparams) {
            if (selectedKeys.length) {
                if (refreshTreeFlag) {
                    if (searchTreeFlag.current) {
                        setSelectedKeys([])
                        setSelectedNodes([])
                        setExpandedKeys([])
                        getTreeData("website://" + searchValue)
                    } else {
                        refreshTree()
                    }
                }
            } else {
                if (searchTreeFlag.current) {
                    setExpandedKeys([])
                    setSelectedNodes([])
                    getTreeData("website://" + searchValue)
                } else {
                    refreshTree()
                }
            }
        }
    }, [treeExtraQueryparams, refreshTreeFlag, inViewport])

    // Refresh Web Tree
    const refreshTree = useMemoizedFn(() => {
        // When Table Query Includes Search Conditions
        if (selectedNodes.length) {
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        if (!refreshTreeWithSearchVal) {
            setSearchValue("")
            searchTreeFlag.current = false
        }
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        getTreeData("website://" + `${refreshTreeWithSearchVal ? `${searchValue ? searchValue : "/"}` : "/"}`)
    })

    // Web Tree Navigation -> Query in Search Bar
    const onJumpWebTree = (value: string) => {
        searchTreeFlag.current = true
        setSelectedKeys([])
        setSearchValue(value)
        getTreeData("website://" + value)
    }

    // Click to Select Node
    const onSelectedKeys = useMemoizedFn(
        (
            selectedKeys: TreeKey[],
            info: {
                selectedNodes: TreeNode[]
            }
        ) => {
            setSelectedKeys(selectedKeys)
            setSelectedNodes(info.selectedNodes)
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
    )

    useEffect(() => {
        onSelectNodes && onSelectNodes(selectedNodes)
        const node = selectedNodes[0]
        if (node) {
            const urlItem = node.data?.Extra.find((item) => item.Key === "url")
            if (urlItem && urlItem.Value) {
                try {
                    const url = new URL(urlItem.Value)
                    // Get URL Query String (Excluding '?'）
                    const query = url.search.substring(1)
                    onGetUrl && onGetUrl(url.origin + url.pathname, query ? `${query}` : "")
                } catch (_) {
                    onGetUrl && onGetUrl("", "")
                }
            } else {
                onGetUrl && onGetUrl("", "")
            }
        } else {
            onGetUrl && onGetUrl("", "")
        }
    }, [selectedNodes])

    useEffect(() => {
        onSelectKeys && onSelectKeys(selectedKeys)
    }, [selectedKeys])

    /**
     * Calculate Tree Header Height
     */
    const treeTopWrapRef = useRef<any>()
    const [treeTopWrapHeight, setTreeTopWrapHeight] = useState<number>(0)
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
            const target = entry.target
            setTreeTopWrapHeight(target.getBoundingClientRect().height)
        })
    })
    useEffect(() => {
        if (treeTopWrapRef.current) {
            resizeObserver.observe(treeTopWrapRef.current)
        }
    }, [treeTopWrapRef.current])

    // Search Box
    const onSearchChange = useMemoizedFn((e: {target: {value: string}}) => {
        const value = e.target.value
        setSearchValue(value)
    })

    return (
        <div className={styles.webTree} ref={webTreeRef}>
            <div className={styles["tree-top-wrap"]} ref={treeTopWrapRef}>
                <YakitInput.Search
                    wrapperStyle={{width: "calc(100% - 40px)", marginBottom: 15}}
                    placeholder={searchPlaceholder}
                    allowClear
                    onChange={onSearchChange}
                    onSearch={onSearchTree}
                    value={searchValue}
                    disabled={searchInputDisabled}
                />
                <YakitButton type='text2' icon={<RefreshIcon />} onClick={refreshTree} style={{marginBottom: 15}} />
            </div>
            <div className={styles["tree-wrap"]}>
                {treeLoading ? (
                    <YakitSpin />
                ) : (
                    <YakitTree
                        height={height !== undefined ? height - treeTopWrapHeight : undefined}
                        multiple={false}
                        treeData={searchTreeFlag.current ? searchWebTreeData : webTreeData}
                        loadData={onLoadWebTreeData}
                        expandedKeys={expandedKeys}
                        onExpand={(expandedKeys: TreeKey[]) => setExpandedKeys(expandedKeys)}
                        selectedKeys={selectedKeys}
                        onSelect={onSelectedKeys}
                    ></YakitTree>
                )}
            </div>
        </div>
    )
})