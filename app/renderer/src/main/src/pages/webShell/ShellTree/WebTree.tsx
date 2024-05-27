import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import YakitTree, {TreeKey} from "@/components/yakitUI/YakitTree/YakitTree"
import type {DataNode} from "antd/es/tree"
import {useGetState, useInViewport, useMemoizedFn} from "ahooks"
import {
    OutlineDocumentIcon,
    OutlineFolderremoveIcon,
    OutlineLink2Icon,
    OutlineVariableIcon
} from "@/assets/icon/outline"
import {loadFromYakURLRaw, requestYakURLList} from "../yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURL, YakURLResource} from "../yakURLTree/data"
import {SolidFolderaddIcon} from "@/assets/icon/solid"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "@/components/WebTree/WebTree.module.scss"
import path from "path"
import emiter from "@/utils/eventBus/eventBus"
type TreeNodeType = "dir" | "file" | "query" | "path"

export interface TreeNode extends DataNode {
    data?: YakURLResource // Additional Node Data
}

interface WebTreeProp {
    ref?: React.Ref<any>
    schema?: string | "website" | "file" | "behinder" | "godzilla" // Default website.
    searchVal?: string // Search Tree Value
    searchYakURL?: YakURL // Search tree by yakurl.
    height: number // Tree Height for Virtual Scroll
    searchPlaceholder?: string // Search Placeholder
    treeQueryparams?: string // Tree Query Params as JSON String
    refreshTreeWithSearchVal?: boolean // Refresh Tree with Search Conditions?
    refreshTreeFlag?: boolean // On Table Params Change, Refresh Tree?->Do Not Refresh
    onSelectNodes?: (selectedNodes?: TreeNode[]) => void // Selected Node's Nodes
    onSelectKeys?: (selectedKeys: TreeKey[]) => void // Selected Node's Keys
    onGetUrl?: (searchURL: string, includeInUrl: string) => void // Get selected node's URL for table query. Useful for website tree.
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // Reset Table Display - Hide Editor
    isExtendTree?: boolean
}

/**
 * This tree does not support checkboxes; selection supports only single choice.
 * File tree does not support file search feature yet.
 */
export const WebTree: React.FC<WebTreeProp> = React.forwardRef((props, ref) => {
    const {
        height,
        searchVal = "",
        searchYakURL,
        refreshTreeWithSearchVal = false,
        schema = "website",
        searchPlaceholder = "Keyword Search Prompt",
        treeQueryparams = "",
        refreshTreeFlag = false,
        onSelectNodes,
        onSelectKeys,
        onGetUrl,
        resetTableAndEditorShow,
        isExtendTree
    } = props
    const [treeLoading, setTreeLoading] = useState<boolean>(true)
    const [defaultWebTreeData, setDefaultWebTreeData, getDefaultWebTreeData] = useGetState<TreeNode[]>([]) // Default website tree.
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([]) // Website tree when search box has value.
    const [searchTreeFlag, setSearchTreeFlag, getSearchTreeFlag] = useGetState<boolean>(!!searchVal.length) // Check if Search Tree
    const [searchValue, setSearchValue] = useState<string>("")
    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([]) // Expand Node Key Set
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>([]) // Select Node Key Set
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // Select Node Data Set
    const webTreeRef = useRef<any>()
    const [inViewport] = useInViewport(webTreeRef)

    const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
        const iconsEle = {
            ["file"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
            ["query"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
            ["path"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
        }
        return iconsEle[treeNodeType] || <></>
    }

    useEffect(() => {
        emiter.on("onWebShellBackTree", goBack)
        return () => {
            emiter.off("onWebShellBackTree", goBack)
        }
    }, [])

    // Find node by name.
    const getNodeByFileName = useMemoizedFn((tree, name) => {
        if (tree?.title === name) return tree
        else {
            if (Array.isArray(tree.children) && tree.children.length > 0) {
                return getNodeByFileName(tree.children[0], name)
            } else {
                return null
            }
        }
    })

    // Go up one level.
    const goBack = useMemoizedFn(() => {
        const parts = searchValue.split("\\")
        const parentDirectory = parts.slice(0, -1).join("\\")
        setSearchValue(parentDirectory)
        const lastIndex = parentDirectory.lastIndexOf("\\")
        const fileName = parentDirectory.substring(lastIndex + 1)
        if (getDefaultWebTreeData().length > 0) {
            const node = getNodeByFileName(getDefaultWebTreeData()[0], fileName)
            if (node) {
                onLoadWebTreeData(node, true)
                setSelectedKeys([node.key])
            }
        }
    })

    const getTreeData = (path: string) => {
        // Debounce, Call API after 30ms
        setTreeLoading(true)
        setTimeout(() => {
            let search = ""
            if (getSearchTreeFlag()) {
                setSearchWebTreeData([])
                search = `&search=${1}`
            } else {
                setWebTreeData([])
            }
            if (searchYakURL) {
                const newSearchYakURL: YakURL = {
                    ...searchYakURL,
                    Query: searchYakURL.Query.map((i) => {
                        if (i.Key === "path") {
                            return {
                                Key: "path",
                                Value: path
                            }
                        }
                        return i
                    })
                }

                requestYakURLList({url: newSearchYakURL, method: "GET"}, (res) => {
                    // Check if Search Tree
                    if (getSearchTreeFlag()) {

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
            }
        }, 30)
    }
    const cacheExpanded = useRef<TreeKey[]>([])
    const addChildrenToBinNode = (tree, binContents) => {
        const lastIndex = searchValue.lastIndexOf("\\")
        const fileName = searchValue.substring(lastIndex + 1)
        cacheExpanded.current = []
        // Recursively search function for last node.
        const findAndAddBinChildren = (nodes) => {
            nodes.forEach((node) => {
                if (node.title === fileName) {
                    // Assuming binContents is an array containing child nodes.
                    node.children = [...binContents]
                    return tree
                } else if (node.children && node.children.length) {
                    cacheExpanded.current.push(node.key)
                    findAndAddBinChildren(node.children) // Continue to recursively search child nodes.
                }
            })
        }
        findAndAddBinChildren(tree)
        return {tree, defaultExpandedKeys: [...expandedKeys, ...cacheExpanded.current]}
        // ||binContents;
    }

    // First Layer Tree Nodes
    const assembleFirstTreeNode = (arr) => {
        let newArr = arr.map((item: YakURLResource, index: number) => {
            const idObj = {
                website: item.VerboseName,
                behinder: item.Path,
                godzilla: item.Path
            }

            return {
                title: item.VerboseName,
                key: idObj[schema],
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
            }
        })
        if (isExtendTree) {
            const {tree, defaultExpandedKeys} = addChildrenToBinNode(getDefaultWebTreeData(), newArr)
            setExpandedKeys([...expandedKeys, ...defaultExpandedKeys])
            return tree
        }

        return newArr
    }
    useEffect(() => {
        const buildTree = (parts, tree, currentPath = "") => {
            if (parts.length === 0) return
            let part = parts.shift()
            let node = tree.find((n) => n.title === part)
            currentPath += (currentPath ? "/" : "") + part // Update path.
            const item: YakURLResource = {
                ResourceType: "dir",
                VerboseType: "dir",
                ResourceName: part,
                VerboseName: part,
                Size: 0,
                SizeVerbose: "",
                ModifiedTimestamp: 0,
                Path: currentPath,
                YakURLVerbose: "",
                Url: {
                    FromRaw: "",
                    Schema: searchYakURL?.Schema || "",
                    User: "",
                    Pass: "",
                    Location: "",
                    Path: currentPath,
                    Query: [
                        ...(searchYakURL?.Query || []).filter((item) => item.Key !== "path"),
                        {Key: "path", Value: currentPath}
                    ]
                },
                Extra: [],
                HaveChildrenNodes: true
            }
            if (!node) {
                node = {
                    title: part,
                    key: currentPath,
                    isLeaf: parts.length === 0,
                    children: [],
                    data: item,
                    icon: ({expanded}) => {
                        return expanded ? (
                            <OutlineFolderremoveIcon className='yakitTreeNode-icon' />
                        ) : (
                            <SolidFolderaddIcon className='yakitTreeNode-icon' />
                        )
                    }
                }
                tree.push(node)
            }
            buildTree(parts, node.children, currentPath)
        }

        if (!searchYakURL) return

        // Initialize root node.
        const val = searchYakURL.Query.filter((i) => i.Key === "path")[0].Value

        let tree: TreeNode[] = [];
        [val!].forEach((p) => {
            if (p.endsWith('/') || p.endsWith('\\'))  {
               p = p.slice(0, -1);
            }
            let cleanPath = path.normalize(p)
            // Clean path from query strings.
            cleanPath = p.split("?")[0] // Fetch. '?' Prior part.

            // Split path, handle drive letter.
            let parts = cleanPath.includes("/") ? cleanPath.split("/") : cleanPath.split("\\")
            // Handle drive letter separately.
            if (parts[0].length === 2 && parts[0][1] === ":") {
                parts[0] += "/" // Merge drive letter with following path separator.
            }
            buildTree(parts, tree)
        })
        setDefaultWebTreeData(tree)
    }, [searchYakURL])

    const refreshChildrenByParent = useMemoizedFn(
        (origin: TreeNode[], parentKey: string, nodes: TreeNode[], isClick?: boolean) => {
            const arr = origin.map((node) => {
                if (node.key === parentKey) {
                    isClick && onSelectNodes && onSelectNodes(nodes)
                    return {
                        ...node,
                        children: nodes
                    }
                }
                if (node.children) {
                    return {
                        ...node,
                        children: refreshChildrenByParent(node.children, parentKey, nodes, isClick)
                    }
                }
                return node
            })
            return arr
        }
    )

    // Async Load Child Nodes
    const onLoadWebTreeData = ({key, children, data}: any, isClick?: boolean) => {
        return new Promise<void>((resolve, reject) => {
            if (data === undefined) {
                reject("node.data is empty")
                return
            }

            const url = {
                ...data.Url
            }
            try {
                url.Query = url.Query.map((i) => {
                    if (i.Key === "path") {
                        return {
                            Key: "path",
                            Value: url.Path
                        }
                    }
                    return i
                })
            } catch (error) {}
            requestYakURLList(
                {url},
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
                        const idObj = {
                            website: key + "/" + i.ResourceName,
                            behinder: i.Path,
                            godzilla: i.Path
                        }
                        return {
                            title: i.VerboseName,
                            key: idObj[schema],
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
                    // Folders first, files second.
                    const newNodesDir: TreeNode[] = []
                    const newNodesFile: TreeNode[] = []
                    newNodes.forEach((item) => {
                        if (item?.data?.ResourceType === "dir") {
                            newNodesDir.push(item)
                        } else {
                            newNodesFile.push(item)
                        }
                    })
                    const newNodesSort = [...newNodesDir, ...newNodesFile]

                    // Check if Search Tree
                    if (getSearchTreeFlag()) {
                        setSearchWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodesSort, isClick))
                    } else {
                        setWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodesSort, isClick))
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
        setSearchTreeFlag(flag)
        setExpandedKeys([])
        setSelectedKeys([])
        if (val === "" && selectedNodes.length) {
            setSelectedNodes([])
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }

        setSearchValue(val)
        getTreeData(val)
    })

    useEffect(() => {
        searchVal && onSearchTree(searchVal)
    }, [searchVal])

    useEffect(() => {
        if (searchYakURL) {
            let path: string = ""
            searchYakURL.Query.map((i) => {
                if (i.Key === "path") {
                    path = i.Value
                }
            })
            onSearchTree(path)
        }
    }, [])

    useEffect(() => {
        if (treeQueryparams) {
            if (selectedKeys.length) {
                if (refreshTreeFlag) {
                    if (searchTreeFlag) {
                        setSelectedKeys([])
                        setSelectedNodes([])
                        setExpandedKeys([])
                        getTreeData(searchValue)
                    } else {
                        refreshTree()
                    }
                }
            } else {
                if (searchTreeFlag) {
                    setExpandedKeys([])
                    setSelectedNodes([])
                    getTreeData(searchValue)
                } else {
                    refreshTree()
                }
            }
        }
    }, [treeQueryparams, refreshTreeFlag, inViewport])

    // Refresh Web Tree
    const refreshTree = useMemoizedFn(() => {
        // When Table Query Includes Search Conditions
        if (selectedNodes.length) {
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        if (!refreshTreeWithSearchVal) {
            setSearchValue("")
            setSearchTreeFlag(false)
        }
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        getTreeData("")
    })

    // Dedupe Array
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    // Click to Select Node
    const onSelectedKeys = useMemoizedFn(
        (
            selectedKeys: TreeKey[],
            info: {
                selected
                selectedNodes: TreeNode[]
                node
            }
        ) => {
            const {selected, node} = info
            if (selected) {
                setExpandedKeys(filter([...expandedKeys, ...selectedKeys]))
                onLoadWebTreeData(node, true)
            }
            if (!selected) {
                setExpandedKeys((pre) => pre.filter((item) => item !== node.key))
                onSelectNodes && onSelectNodes(undefined)
            }
            setSelectedKeys(selectedKeys)
            setSelectedNodes(info.selectedNodes)
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
    )

    useEffect(() => {
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
                    wrapperStyle={{marginBottom: 15, width: "calc(100% - 40px)"}}
                    placeholder={searchPlaceholder}
                    allowClear
                    onChange={onSearchChange}
                    onSearch={onSearchTree}
                    value={searchValue}
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
                        treeData={searchTreeFlag ? searchWebTreeData : webTreeData}
                        // loadData={onLoadWebTreeData}
                        expandedKeys={expandedKeys}
                        onExpand={(
                            expandedKeys: TreeKey[],
                            info: {
                                expanded: boolean
                                node
                            }
                        ) => {
                            setExpandedKeys(expandedKeys)
                            if (info.expanded) {
                                onLoadWebTreeData(info.node)
                            }
                        }}
                        selectedKeys={selectedKeys}
                        onSelect={onSelectedKeys}
                    ></YakitTree>
                )}
            </div>
        </div>
    )
})
