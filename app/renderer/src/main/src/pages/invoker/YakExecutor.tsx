import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Divider,
    Dropdown,
    Empty,
    Input,
    Menu,
    Modal,
    Popover,
    Space,
    Tabs,
    Typography,
    Upload,
    Collapse,
    Table,
    Card
} from "antd"
import "./xtermjs-yak-executor.css"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {PluginResultUI} from "../yakitStore/viewers/base"
import {YakEditor, YakInteractiveEditor} from "../../utils/editors"
import {
    CaretRightOutlined,
    DeleteOutlined,
    EllipsisOutlined,
    ExclamationCircleOutlined,
    FileAddOutlined,
    FolderAddOutlined,
    FolderOpenOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    PoweroffOutlined
} from "@ant-design/icons"
import {getRandomInt} from "../../utils/randomUtil"
import {failed, info, success} from "../../utils/notification"
import {ExecResult} from "./schema"
import {SelectOne} from "../../utils/inputUtil"
import {writeExecResultXTerm, xtermClear} from "../../utils/xtermUtils"
import {AutoCard} from "../../components/AutoCard"
import {AutoSpin} from "../../components/AutoSpin"
import cloneDeep from "lodash/cloneDeep"
import {Terminal} from "./Terminal"
import {useMemoizedFn, useDebounceEffect} from "ahooks"
import {ResizeBox} from "../../components/ResizeBox"
import {CVXterm} from "../../components/CVXterm"
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream"
import "./YakExecutor.css"
import {type} from "os"
import {randomString} from "../../utils/randomUtil"
import {values} from "@antv/util"
import {Form} from "antd"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

const {ipcRenderer} = window.require("electron")
const {Panel} = Collapse
const RecentFileList = "recent-file-list"
const FontSizeCacheKey = "yakrunner-editor-fontsize"

const {TabPane} = Tabs
const {Text, Paragraph} = Typography

const tabMenu: CustomMenuProps[] = [
    {key: "own", value: "Close Tab"},
    {key: "other", value: "Close Other Tabs"},
    {key: "all", value: "Close All Tabs"}
]
const fileMenu: CustomMenuProps[] = [
    {key: "rename", value: "Rename"},
    {key: "remove", value: "Remove"},
    {key: "delete", value: "Delete"}
]

const CustomMenu = (
    id: any,
    isFileList: boolean,
    menus: Array<CustomMenuProps>,
    onClick: (key: string, id: string, isFileList: boolean) => void
) => {
    return (
        <Menu onClick={({key}) => onClick(key, id, isFileList)}>
            {menus.map((item, index) => {
                return (
                    <Menu.Item key={item.key} disabled={!!item.disabled}>
                        <div>{item.value}</div>
                    </Menu.Item>
                )
            })}
        </Menu>
    )
}

export interface YakExecutorProp {}

interface tabCodeProps {
    tab: string
    code: string
    suffix: string
    isFile: boolean
    route?: string
    extraParams?: string
    interactive?: boolean
}

interface CustomMenuProps {
    key: string
    value: string
    disabled?: boolean
}
interface VariableTableDataType {
    key: string
    varName: string
    value: string
}
export const YakExecutor: React.FC<YakExecutorProp> = (props) => {
    const [codePath, setCodePath] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [fileList, setFileList] = useState<tabCodeProps[]>([])
    const [tabList, setTabList] = useState<tabCodeProps[]>([])
    const [activeTab, setActiveTab] = useState<string>("")
    const [unTitleCount, setUnTitleCount] = useState(1)

    const [hintShow, setHintShow] = useState<boolean>(false)
    const [hintFile, setHintFile] = useState<string>("")
    const [hintIndex, setHintIndex] = useState<number>(0)

    const [renameHint, setRenameHint] = useState<boolean>(false)
    const [renameIndex, setRenameIndex] = useState<number>(-1)
    const [renameFlag, setRenameFlag] = useState<boolean>(false)
    const [renameCache, setRenameCache] = useState<string>("")

    const [fullScreen, setFullScreen] = useState<boolean>(false)
    const [token, setToken] = useState<string>(randomString(40))
    const [errors, setErrors] = useState<string[]>([])
    const [executing, setExecuting] = useState(false)
    const [outputEncoding, setOutputEncoding] = useState<"utf8" | "latin1">("utf8")
    const xtermAsideRef = useRef(null)
    const xtermRef = useRef(null)
    const timer = useRef<any>(null)
    const [variableTable, setVariableTable] = useState<VariableTableDataType[]>([])
    const [isInteractive, setIsInteractive] = useState<boolean>(false)
    const [isStaticExec, setIsStaticExec] = useState<boolean>(false)

    const [extraParams, setExtraParams] = useState("")
    const [fontSize, setFontSize] = useState(15)
    const [infoState, {reset, setXtermRef}, interactiveXtermRef] = useHoldingIPCRStream(
        "interactive-runner-start",
        "InteractiveRunYakCode",
        token
    )

    // trigger for updating
    const [triggerForUpdatingHistory, setTriggerForUpdatingHistory] = useState<any>(0)

    const addFileTab = useMemoizedFn((res: any) => {
        const {name, code} = res

        const tab: tabCodeProps = {
            tab: `${name}.yak`,
            code: code,
            suffix: "yak",
            isFile: false
        }
        setActiveTab(`${tabList.length}`)
        setTabList(tabList.concat([tab]))
        setUnTitleCount(unTitleCount + 1)
    })

    useEffect(() => {
        ipcRenderer.on(`${token}-data-scope`, async (e: any, data: {Key: string; Value: Uint8Array}[]) => {
            let res: VariableTableDataType[] = []
            let lastStackValue
            data.forEach((v) => {
                if (v.Key == "__last_stack_value__") {
                    lastStackValue = {
                        key: v.Key,
                        varName: v.Key,
                        value: Uint8ArrayToString(v.Value)
                    }
                    return
                }
                res.push({
                    key: v.Key,
                    varName: v.Key,
                    value: Uint8ArrayToString(v.Value)
                })
            })
            res.unshift(lastStackValue)
            setVariableTable(res)
        })
        ipcRenderer.on(`${token}-exec-end`, () => {
            setTimeout(() => {
                setExecuting(false)
            }, 300)
        })
        ipcRenderer.on("fetch-send-to-yak-running", (e, res: any) => addFileTab(res))
        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-yak-running")
            ipcRenderer.removeAllListeners(`${token}-data`)
        }
    }, [])

    const sendRequest = useMemoizedFn((data: {}) => {
        ipcRenderer.invoke(`InteractiveRunYakCodeWrite`, token, data)
    })
    // Auto Save
    const autoSaveCurrentFile = useMemoizedFn(() => {
        const tabInfo = tabList[+activeTab]
        if (tabInfo?.isFile) {
            ipcRenderer.invoke("write-file", {
                route: tabInfo.route,
                data: tabInfo.code
            })
        }
    })
    // Save Last 15
    const saveFileList = useMemoizedFn(() => {
        let files = cloneDeep(fileList).reverse()
        files.splice(14)
        files = files.reverse()
        ipcRenderer.invoke("set-local-cache", RecentFileList, files)
    })

    useEffect(() => {
        ipcRenderer.invoke("InteractiveRunYakCode", token)
        return () => {
            ipcRenderer.invoke("cancel-InteractiveRunYakCode", token)
        }
    }, [])
    // Auto Save
    useDebounceEffect(
        () => {
            autoSaveCurrentFile()
            saveFileList()
        },
        [tabList[+activeTab]?.code],
        {wait: 500}
    )
    // Fetch/Save Recent Files & Show Default
    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-local-cache", RecentFileList)
            .then((value: any) => {
                if ((value || []).length !== 0) {
                    setFileList(value)
                } else {
                    const tab: tabCodeProps = {
                        tab: `Untitle-${unTitleCount}.yak`,
                        code: "# input your yak code\nprintln(`Hello Yak World!`)",
                        suffix: "yak",
                        isFile: false
                    }
                    setActiveTab(`${tabList.length}`)
                    setTabList([tab])
                    setUnTitleCount(unTitleCount + 1)
                }
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
        ipcRenderer.invoke("fetch-local-cache", FontSizeCacheKey).then((value: any) => {
            if (value) {
                setFontSize(value)
            }
        })
        return () => {
            saveFileList()
        }
    }, [])

    // Global Intercept Rename
    useEffect(() => {
        document.onmousedown = (e) => {
            try {
                // @ts-ignore
                if (e.target.id !== "rename-input" && renameFlag) {
                    renameCode(renameIndex)
                    setRenameFlag(false)
                }
            } catch (e) {
                failed(`rename error: ${e}`)
            }
        }
    }, [renameFlag])

    // Open File
    const addFile = useMemoizedFn((file: any) => {
        const isExists = fileList.filter((item) => item.tab === file.name && item.route === file.path).length === 1

        if (isExists) {
            for (let index in tabList) {
                const item = tabList[index]
                if (item.tab === file.name && item.route === file.path) {
                    setActiveTab(`${index}`)
                    return false
                }
            }
        }
        ipcRenderer
            .invoke("fetch-file-content", file.path)
            .then((res) => {
                const tab: tabCodeProps = {
                    tab: file.name,
                    code: res,
                    suffix: file.name.split(".").pop() === "yak" ? "yak" : "http",
                    isFile: true,
                    route: file.path,
                    extraParams: file.extraParams
                }
                setActiveTab(`${tabList.length}`)
                if (!isExists) setFileList(fileList.concat([tab]))
                setTabList(tabList.concat([tab]))
            })
            .catch(() => {
                failed("File Unreadable, Please Retry！")
                const files = cloneDeep(fileList)
                for (let i in files) if (files[i].route === file.path) files.splice(i, 1)
                setFileList(files)
            })
        return false
    })
    // New File
    const newFile = useMemoizedFn(() => {
        const tab: tabCodeProps = {
            tab: `Untitle-${unTitleCount}.yak`,
            code: "# input your yak code\nprintln(`Hello Yak World!`)",
            suffix: "yak",
            isFile: false
        }
        setActiveTab(`${tabList.length}`)
        setTabList(tabList.concat([tab]))
        setUnTitleCount(unTitleCount + 1)
    })
    //Edit File
    const modifyCode = useMemoizedFn((value: string, index: number) => {
        const tabs = cloneDeep(tabList)
        tabs[index].code = value
        setTabList(tabs)
    })
    // Save File
    const saveCode = useMemoizedFn((info: tabCodeProps, index: number) => {
        if (info.isFile) {
            ipcRenderer.invoke("write-file", {
                route: info.route,
                data: info.code
            })
        } else {
            ipcRenderer.invoke("show-save-dialog", `${codePath}${codePath ? "/" : ""}${info.tab}`).then((res) => {
                if (res.canceled) return

                const path = res.filePath
                const name = res.name
                ipcRenderer
                    .invoke("write-file", {
                        route: res.filePath,
                        data: info.code
                    })
                    .then(() => {
                        const suffix = name.split(".").pop()

                        var tabs = cloneDeep(tabList)
                        var active = null
                        tabs = tabs.filter((item) => item.route !== path)
                        tabs = tabs.map((item, index) => {
                            if (!item.route && item.tab === info.tab) {
                                active = index
                                item.tab = name
                                item.isFile = true
                                item.suffix = suffix === "yak" ? suffix : "http"
                                item.route = path
                                return item
                            }
                            return item
                        })
                        if (active !== null) setActiveTab(`${active}`)
                        setTabList(tabs)
                        const file: tabCodeProps = {
                            tab: name,
                            code: info.code,
                            isFile: true,
                            suffix: suffix === "yak" ? suffix : "http",
                            route: res.filePath,
                            extraParams: info.extraParams
                        }
                        for (let item of fileList) {
                            if (item.route === file.route) {
                                return
                            }
                        }
                        setFileList(fileList.concat([file]))
                    })
            })
        }
    })
    //Close File
    const closeCode = useMemoizedFn((index, isFileList: boolean) => {
        const tabInfo = isFileList ? fileList[+index] : tabList[+index]
        if (isFileList) {
            for (let i in tabList) {
                if (tabList[i].tab === tabInfo.tab && tabList[i].route === tabInfo.route) {
                    const tabs = cloneDeep(tabList)
                    tabs.splice(i, 1)
                    setTabList(tabs)
                    setActiveTab(tabs.length >= 1 ? `0` : "")
                }
            }
            const files = cloneDeep(fileList)
            files.splice(+index, 1)
            setFileList(files)
        } else {
            setActiveTab(index)

            if (!tabInfo.isFile) {
                setHintFile(tabInfo.tab)
                setHintIndex(index)
                setHintShow(true)
            } else {
                const tabs = cloneDeep(tabList)
                tabs.splice(+index, 1)
                setTabList(tabs)
                setActiveTab(tabs.length >= 1 ? `0` : "")
            }
        }
    })
    // Close Temp Without Saving
    const ownCloseCode = useMemoizedFn(() => {
        const tabs = cloneDeep(tabList)
        tabs.splice(hintIndex, 1)
        setTabList(tabs)
        setHintShow(false)
        setActiveTab(tabs.length >= 1 ? `0` : "")
    })
    // Delete File
    const delCode = useMemoizedFn((index) => {
        const fileInfo = fileList[index]

        ipcRenderer
            .invoke("delelte-code-file", fileInfo.route)
            .then(() => {
                for (let i in tabList) {
                    if (tabList[i].tab === fileInfo.tab && tabList[i].route === fileInfo.route) {
                        const tabs = cloneDeep(tabList)
                        tabs.splice(i, 1)
                        setTabList(tabs)
                        setActiveTab(tabs.length >= 1 ? `0` : "")
                    }
                }
                const arr = cloneDeep(fileList)
                arr.splice(index === undefined ? hintIndex : index, 1)
                setFileList(arr)
            })
            .catch(() => {
                failed("File Deletion Failed！")
            })
    })
    //Rename Action
    const renameCode = useMemoizedFn((index: number) => {
        const tabInfo = fileList[index]

        if (renameCache === tabInfo.tab) return
        if (!renameCache) return

        if (!tabInfo.route) return
        const flagStr = tabInfo.route?.indexOf("/") > -1 ? "/" : "\\"
        const routes = tabInfo.route?.split(flagStr)
        routes?.pop()
        ipcRenderer
            .invoke("is-exists-file", routes?.concat([renameCache]).join(flagStr))
            .then(() => {
                const newRoute = routes?.concat([renameCache]).join(flagStr)
                if (!tabInfo.route || !newRoute) return
                renameFile(index, renameCache, tabInfo.route, newRoute)
            })
            .catch(() => {
                setRenameHint(true)
            })
    })
    // Rename File
    const renameFile = useMemoizedFn(
        (index: number, rename: string, oldRoute: string, newRoute: string, callback?: () => void) => {
            ipcRenderer.invoke("rename-file", {old: oldRoute, new: newRoute}).then(() => {
                const suffix = rename.split(".").pop()

                var files = cloneDeep(fileList)
                var tabs = cloneDeep(tabList)
                var active = null
                files = files.filter((item) => item.route !== newRoute)
                tabs = tabs.filter((item) => item.route !== newRoute)

                files = files.map((item) => {
                    if (item.route === oldRoute) {
                        item.tab = rename
                        item.suffix = suffix === "yak" ? suffix : "http"
                        item.route = newRoute
                        return item
                    }
                    return item
                })
                tabs = tabs.map((item, index) => {
                    if (item.route === oldRoute) {
                        active = index
                        item.tab = rename
                        item.suffix = suffix === "yak" ? suffix : "http"
                        item.route = newRoute
                        return item
                    }
                    return item
                })
                if (active !== null) setActiveTab(`${active}`)
                setFileList(files)
                setTabList(tabs)

                if (callback) callback()
            })
        }
    )

    const fileFunction = (kind: string, index: string, isFileList: boolean) => {
        const tabCodeInfo = isFileList ? fileList[index] : tabList[index]

        switch (kind) {
            case "own":
                closeCode(index, isFileList)
                return
            case "other":
                const tabInfo: tabCodeProps = cloneDeep(tabList[index])
                for (let i in tabList) {
                    if (i !== index && !tabList[i].isFile) {
                        const arr: tabCodeProps[] =
                            +i > +index
                                ? [tabInfo].concat(tabList.splice(+i, tabList.length))
                                : tabList.splice(+i, tabList.length)
                        const num = +i > +index ? 1 : 0

                        setActiveTab(`${num}`)
                        setTabList(arr)
                        setHintFile(arr[num].tab)
                        setHintIndex(num)
                        setHintShow(true)
                        return
                    }
                }
                const code = cloneDeep(tabList[index])
                setTabList([code])
                setActiveTab(`0`)
                return
            case "all":
                for (let i in tabList) {
                    if (!tabList[i].isFile) {
                        const arr = tabList.splice(+i, tabList.length)
                        setActiveTab("0")
                        setTabList(arr)
                        setHintFile(arr[0].tab)
                        setHintIndex(0)
                        setHintShow(true)
                        return
                    }
                }
                setActiveTab("")
                setTabList([])
                return
            case "remove":
                closeCode(index, isFileList)
                return
            case "delete":
                delCode(index)
                return
            case "rename":
                setRenameIndex(+index)
                setRenameFlag(true)
                setRenameCache(tabCodeInfo.tab)
                return
        }
    }

    const openFileLayout = (file: any) => {
        addFile(file)
    }

    useEffect(() => {
        ipcRenderer.invoke("fetch-code-path").then((path: string) => {
            ipcRenderer
                .invoke("is-exists-file", path)
                .then(() => {
                    setCodePath("")
                })
                .catch(() => {
                    setCodePath(path)
                })
        })
    }, [])
    useEffect(() => {
        setIsInteractive(Boolean(tabList[+activeTab]?.interactive))
    }, [activeTab])

    useEffect(() => {
        if (tabList.length === 0) setFullScreen(false)
    }, [tabList])

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        // let buffer = "";
        ipcRenderer.on("client-yak-error", async (e: any, data) => {
            failed(`FoundError: ${JSON.stringify(data)}`)
            if (typeof data === "object") {
                setErrors([...errors, `${JSON.stringify(data)}`])
            } else if (typeof data === "string") {
                setErrors([...errors, data])
            } else {
                setErrors([...errors, `${data}`])
            }
        })
        ipcRenderer.on("client-yak-end", () => {
            info("Yak Execution Complete")
            setTriggerForUpdatingHistory(getRandomInt(100000))
            setTimeout(() => {
                setExecuting(false)
            }, 300)
        })
        ipcRenderer.on("client-yak-data", async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                // alert(Buffer.from(data.Message).toString("utf8"))
            }
            if (data?.Raw) {
                writeExecResultXTerm(xtermRef, data, outputEncoding)
                // writeXTerm(xtermRef, Buffer.from(data.Raw).toString(outputEncoding).replaceAll("\n", "\r\n"))
                // monacoEditorWrite(currentOutputEditor, )
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("client-yak-data")
            ipcRenderer.removeAllListeners("client-yak-end")
            ipcRenderer.removeAllListeners("client-yak-error")
        }
    }, [xtermRef])

    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    return (
                        <Dropdown
                            overlay={CustomMenu(barNode.key, false, tabMenu, fileFunction)}
                            trigger={["contextMenu"]}
                        >
                            {barNode}
                        </Dropdown>
                    )
                }}
            />
        )
    }
    const onRunYak = useMemoizedFn(() => {
        setErrors([])
        setExecuting(true)
        if (!isInteractive) {
            ipcRenderer.invoke("exec-yak", {
                Script: tabList[+activeTab].code,
                Params: [],
                RunnerParamRaw: extraParams
            })
        } else {
            sendRequest({
                Input: JSON.stringify({
                    mode: "interactive",
                    script: tabList[+activeTab].code,
                    token: token
                })
            })
        }
    })
    return (
        <AutoCard
            className={"yak-executor-body"}
            // title={"Yak Runner"}
            headStyle={{minHeight: 0}}
            bodyStyle={{padding: 0, overflow: "hidden"}}
        >
            <div
                style={{width: "100%", height: "100%", display: "flex", backgroundColor: "#E8E9E8"}}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.keyCode === 78 && (e.ctrlKey || e.metaKey)) {
                        newFile()
                    }
                    if (e.keyCode === 83 && (e.ctrlKey || e.metaKey) && activeTab) {
                        saveCode(tabList[+activeTab], +activeTab)
                    }
                }}
            >
                <div style={{width: `${fullScreen ? 0 : 15}%`}}>
                    <AutoSpin spinning={loading}>
                        <ExecutorFileList
                            lists={fileList}
                            activeFile={tabList[+activeTab]?.route || ""}
                            renameFlag={renameFlag}
                            renameIndex={renameIndex}
                            renameCache={renameCache}
                            setRenameCache={setRenameCache}
                            addFile={addFile}
                            newFile={newFile}
                            openFile={openFileLayout}
                            fileFunction={fileFunction}
                            renameCode={renameCode}
                            setRenameFlag={setRenameFlag}
                        />
                    </AutoSpin>
                </div>
                <div style={{width: `${fullScreen ? 100 : 85}%`}} className='executor-right-body'>
                    {tabList.length > 0 && (
                        <ResizeBox
                            isVer={isInteractive ? false : true}
                            firstNode={
                                <Tabs
                                    className={"right-editor"}
                                    style={{height: "100%"}}
                                    type='editable-card'
                                    activeKey={activeTab}
                                    hideAdd={true}
                                    onChange={(activeTab) => setActiveTab(activeTab)}
                                    onEdit={(key, event: "add" | "remove") => {
                                        switch (event) {
                                            case "remove":
                                                closeCode(key, false)
                                                return
                                            case "add":
                                                return
                                        }
                                    }}
                                    renderTabBar={(props, TabBarDefault) => {
                                        return bars(props, TabBarDefault)
                                    }}
                                    tabBarExtraContent={
                                        tabList.length && (
                                            <Space style={{marginRight: 5}} size={0}>
                                                <Button
                                                    style={{height: 25}}
                                                    type={"link"}
                                                    size={"small"}
                                                    disabled={
                                                        tabList[+activeTab] && tabList[+activeTab].suffix !== "yak"
                                                    }
                                                    onClick={(e) => {
                                                        tabList[+activeTab] = {
                                                            ...tabList[+activeTab],
                                                            interactive: !Boolean(tabList[+activeTab]?.interactive)
                                                        }

                                                        setIsInteractive(Boolean(tabList[+activeTab]?.interactive))
                                                    }}
                                                >
                                                    {isInteractive ? "Standard Edit" : "Interactive Edit"}
                                                </Button>

                                                <Button
                                                    icon={
                                                        fullScreen ? (
                                                            <FullscreenExitOutlined style={{fontSize: 15}} />
                                                        ) : (
                                                            <FullscreenOutlined style={{fontSize: 15}} />
                                                        )
                                                    }
                                                    type={"link"}
                                                    size={"small"}
                                                    style={{width: 30, height: 25}}
                                                    onClick={() => setFullScreen(!fullScreen)}
                                                />
                                                <Popover
                                                    trigger={["click"]}
                                                    title={"Other Settings"}
                                                    placement='bottomRight'
                                                    content={
                                                        <>
                                                            <Form.Item label='Run Command' name='runCommand'>
                                                                <YakitInput
                                                                    prefix={
                                                                        "yak " + tabList[+activeTab]?.tab || "[file]"
                                                                    }
                                                                    value={extraParams}
                                                                    onChange={(e) => setExtraParams(e.target.value)}
                                                                    onPressEnter={(e) => {
                                                                        tabList[+activeTab].extraParams = extraParams
                                                                        setTabList(tabList)
                                                                        tabList[+activeTab].isFile &&
                                                                            setFileList(
                                                                                fileList.map((item) => {
                                                                                    item.route ===
                                                                                        tabList[+activeTab].route &&
                                                                                        (item.extraParams = extraParams)
                                                                                    return item
                                                                                })
                                                                            )
                                                                        success("Save Successful")
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                            <Form.Item label='Font Size' name='fontSize'>
                                                                <YakitInputNumber
                                                                    size='small'
                                                                    value={fontSize}
                                                                    defaultValue={fontSize}
                                                                    onChange={(value) => {
                                                                        setFontSize(value as number)
                                                                        ipcRenderer.invoke(
                                                                            "set-local-cache",
                                                                            FontSizeCacheKey,
                                                                            value as number
                                                                        )
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                        </>
                                                    }
                                                >
                                                    <Button
                                                        type={"link"}
                                                        icon={<EllipsisOutlined />}
                                                        onClick={() => {
                                                            setExtraParams(tabList[+activeTab]?.extraParams || "")
                                                        }}
                                                    />
                                                </Popover>
                                                {executing ? (
                                                    <Button
                                                        icon={<PoweroffOutlined style={{fontSize: 15}} />}
                                                        type={"link"}
                                                        danger={true}
                                                        size={"small"}
                                                        style={{width: 30, height: 25}}
                                                        onClick={() => ipcRenderer.invoke("cancel-yak")}
                                                    />
                                                ) : (
                                                    <Button
                                                        icon={<CaretRightOutlined style={{fontSize: 15}} />}
                                                        type={"link"}
                                                        ghost={true}
                                                        size={"small"}
                                                        style={{width: 30, height: 25}}
                                                        disabled={
                                                            tabList[+activeTab] && tabList[+activeTab].suffix !== "yak"
                                                        }
                                                        onClick={() => {
                                                            onRunYak()
                                                            xtermClear(xtermRef)
                                                        }}
                                                    />
                                                )}
                                            </Space>
                                        )
                                    }
                                >
                                    {tabList.map((item, index) => {
                                        return (
                                            <TabPane
                                                tab={item.isFile ? item.tab : `(Unsaved)${item.tab}`}
                                                key={`${index}`}
                                            >
                                                <div style={{height: "100%"}}>
                                                    <AutoSpin spinning={executing}>
                                                        <div style={{height: "100%"}}>
                                                            <YakEditor
                                                                type={item.suffix}
                                                                value={item.code}
                                                                setValue={(value) => {
                                                                    modifyCode(value, index)
                                                                }}
                                                                fontSize={fontSize}
                                                                actions={[
                                                                    {
                                                                        contextMenuGroupId: "9_cutcopypaste",
                                                                        label: "Run",
                                                                        id: "run-yak",
                                                                        run: () => {
                                                                            onRunYak()
                                                                        }
                                                                    }
                                                                ]}
                                                            />
                                                        </div>
                                                    </AutoSpin>
                                                </div>
                                            </TabPane>
                                        )
                                    })}
                                </Tabs>
                            }
                            firstRatio='70%'
                            secondNode={
                                isInteractive ? (
                                    <ResizeBox
                                        isVer={true}
                                        // firstRatio={"40%"}
                                        // secondRatio={"60%"}
                                        firstNode={
                                            <div>
                                                <Table
                                                    pagination={{position: []}}
                                                    size='small'
                                                    rowClassName={"interactive-executor-table"}
                                                    columns={[
                                                        {
                                                            title: "Variables",
                                                            dataIndex: "varName",
                                                            key: "varName"
                                                        },
                                                        {
                                                            title: "Value",
                                                            dataIndex: "value",
                                                            key: "value"
                                                        }
                                                    ]}
                                                    dataSource={variableTable}
                                                />
                                            </div>
                                        }
                                        secondNode={
                                            <div style={{height: "100%"}}>
                                                <PluginResultUI
                                                    loading={false}
                                                    progress={infoState.processState}
                                                    results={infoState.messageState}
                                                    risks={infoState.riskState}
                                                    featureType={infoState.featureTypeState}
                                                    feature={infoState.featureMessageState}
                                                    statusCards={infoState.statusState}
                                                    onXtermRef={setXtermRef}
                                                />
                                            </div>
                                        }
                                        lineStyle={{
                                            backgroundColor: "#d1d1d1"
                                        }}
                                    />
                                ) : (
                                    <div
                                        ref={xtermAsideRef}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            overflow: "hidden",
                                            borderTop: "1px solid #dfdfdf"
                                        }}
                                    >
                                        <Tabs
                                            style={{height: "100%"}}
                                            className={"right-xterm"}
                                            size={"small"}
                                            tabBarExtraContent={
                                                <Space>
                                                    <SelectOne
                                                        formItemStyle={{marginBottom: 0}}
                                                        value={outputEncoding}
                                                        setValue={setOutputEncoding}
                                                        size={"small"}
                                                        data={[
                                                            {text: "GBxxx Encoded", value: "latin1"},
                                                            {text: "UTF-8", value: "utf8"}
                                                        ]}
                                                    />
                                                    <Button
                                                        size={"small"}
                                                        icon={<DeleteOutlined />}
                                                        type={"link"}
                                                        onClick={(e) => {
                                                            xtermClear(xtermRef)
                                                        }}
                                                    />
                                                </Space>
                                            }
                                        >
                                            <TabPane
                                                tab={<div style={{width: 50, textAlign: "center"}}>Output</div>}
                                                key={"output"}
                                            >
                                                <div style={{width: "100%", height: "100%"}}>
                                                    <CVXterm
                                                        maxHeight={0}
                                                        ref={xtermRef}
                                                        options={{
                                                            convertEol: true,
                                                            theme: {
                                                                foreground: "#536870",
                                                                background: "#E8E9E8",
                                                                cursor: "#536870",

                                                                black: "#002831",
                                                                brightBlack: "#001e27",

                                                                red: "#d11c24",
                                                                brightRed: "#bd3613",

                                                                green: "#738a05",
                                                                brightGreen: "#475b62",

                                                                yellow: "#a57706",
                                                                brightYellow: "#536870",

                                                                blue: "#2176c7",
                                                                brightBlue: "#708284",

                                                                magenta: "#c61c6f",
                                                                brightMagenta: "#5956ba",

                                                                cyan: "#259286",
                                                                brightCyan: "#819090",

                                                                white: "#eae3cb",
                                                                brightWhite: "#fcf4dc"
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </TabPane>
                                            <TabPane
                                                tab={
                                                    <div style={{width: 50, textAlign: "center"}} key={"terminal"}>
                                                        Terminal (Under Supervision))
                                                    </div>
                                                }
                                                disabled
                                            >
                                                <Terminal />
                                            </TabPane>
                                        </Tabs>
                                    </div>
                                )
                            }
                            secondRatio='30%'
                        />
                    )}
                    {tabList.length === 0 && (
                        <Empty className='right-empty' description={<p>Open/New File on Left</p>}></Empty>
                    )}
                </div>

                <Modal
                    visible={hintShow}
                    onCancel={() => setHintShow(false)}
                    footer={[
                        <Button key='link' onClick={() => setHintShow(false)}>
                            Cancel
                        </Button>,
                        <Button key='submit' onClick={() => ownCloseCode()}>
                            Do Not Save
                        </Button>,
                        <Button key='back' type='primary' onClick={() => saveCode(tabList[hintIndex], hintIndex)}>
                            Save
                        </Button>
                    ]}
                >
                    <div style={{height: 40}}>
                        <ExclamationCircleOutlined style={{fontSize: 22, color: "#faad14"}} />
                        <span style={{fontSize: 18, marginLeft: 15}}>File Not Saved</span>
                    </div>
                    <p style={{fontSize: 15, marginLeft: 37}}>{`Save Changes?${hintFile}Content Inside？`}</p>
                </Modal>

                <Modal
                    visible={renameHint}
                    onCancel={() => setHintShow(false)}
                    footer={[
                        <Button key='link' onClick={() => setRenameHint(false)}>
                            Cancel
                        </Button>,
                        <Button
                            key='back'
                            type='primary'
                            onClick={() => {
                                const oldRoute = tabList[renameIndex].route
                                if (!oldRoute) return
                                const flagStr = oldRoute?.indexOf("/") > -1 ? "/" : "\\"
                                const routes = oldRoute?.split(flagStr)
                                routes?.pop()
                                const newRoute = routes?.concat([renameCache]).join(flagStr)
                                if (!oldRoute || !newRoute) return
                                renameFile(renameIndex, renameCache, oldRoute, newRoute, () => {
                                    setRenameHint(false)
                                })
                            }}
                        >
                            Confirm
                        </Button>
                    ]}
                >
                    <div style={{height: 40}}>
                        <ExclamationCircleOutlined style={{fontSize: 22, color: "#faad14"}} />
                        <span style={{fontSize: 18, marginLeft: 15}}>File Exists</span>
                    </div>
                    <p style={{fontSize: 15, marginLeft: 37}}>{`Overwrite File?？`}</p>
                </Modal>
            </div>
        </AutoCard>
    )
}

interface ExecutorFileListProps {
    lists: tabCodeProps[]
    activeFile: string

    renameFlag: boolean
    renameIndex: number
    renameCache: string
    setRenameCache: (name: string) => void

    addFile: (file: any) => void
    newFile: () => void
    openFile: (file: any) => void
    fileFunction: (kind: string, index: string, isFileList: boolean) => void
    renameCode: (index: number) => void
    setRenameFlag: (flag: boolean) => void
}

// @ts-ignore
const ExecutorFileList = (props: ExecutorFileListProps) => {
    const {
        lists,
        activeFile,
        addFile,
        newFile,
        openFile,
        fileFunction,
        renameFlag,
        renameIndex,
        renameCache,
        setRenameCache,
        renameCode,
        setRenameFlag
    } = props

    return (
        <AutoCard
            className={"executor-file-list"}
            title={<span style={{color: "#000", fontWeight: 400}}>Recent Files</span>}
            headStyle={{
                minHeight: 0,
                fontSize: 14,
                fontWeight: 300,
                padding: "0 5px",
                backgroundColor: "#e8e9e8",
                borderBottom: "2px solid #d7d7d7"
            }}
            bodyStyle={{padding: 0, paddingTop: 7, backgroundColor: "#efefef"}}
            extra={
                <>
                    <Upload multiple={false} maxCount={1} showUploadList={false} beforeUpload={(f: any) => addFile(f)}>
                        <FolderOpenOutlined className='file-list-icon' title='Open File' />
                    </Upload>
                    <FolderAddOutlined className='file-list-icon' title='New File' onClick={newFile} />
                </>
            }
        >
            {lists.length > 0 && (
                <div className={"file-list"}>
                    {lists.map((item, index) => {
                        return (
                            <Dropdown
                                key={index}
                                overlay={CustomMenu(`${index}`, true, fileMenu, fileFunction)}
                                trigger={["contextMenu"]}
                            >
                                <div
                                    className={`list-opt ${activeFile === item.route ? "selected" : ""}`}
                                    style={{top: `${index * 22}px`}}
                                    onClick={() =>
                                        openFile({name: item.tab, path: item.route, extraParams: item.extraParams})
                                    }
                                >
                                    <div>
                                        {renameFlag && renameIndex === index ? (
                                            <div>
                                                <Input
                                                    id='rename-input'
                                                    className='input'
                                                    size='small'
                                                    value={renameCache}
                                                    onChange={(e) => setRenameCache(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            renameCode(renameIndex)
                                                            setRenameFlag(false)
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className='name'>
                                                <Text ellipsis={{tooltip: item.tab}} style={{width: "100%"}}>
                                                    {item.tab}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Dropdown>
                        )
                    })}
                </div>
            )}
            {lists.length === 0 && (
                <Empty
                    className='file-empty '
                    imageStyle={{display: "none"}}
                    description={
                        <div style={{marginTop: 90}}>
                            <Button type='link' icon={<FileAddOutlined style={{fontSize: 30}} />} onClick={newFile} />
                            <p style={{marginTop: 10}}>New File</p>
                        </div>
                    }
                />
            )}
        </AutoCard>
    )
}
