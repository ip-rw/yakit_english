import React, {useEffect, useRef, useState} from "react"
import {ShellType, WebShellDetail} from "@/pages/webShell/models"
import {WebShellURLTreeAndTable} from "@/pages/webShell/WebShellTreeAndTable"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {CVXterm} from "@/components/CVXterm"
import {TERMINAL_INPUT_KEY, YakitCVXterm} from "@/components/yakitUI/YakitCVXterm/YakitCVXterm"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {failed} from "@/utils/notification"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import {loadFromYakURLRaw, requestYakURLList} from "./yakURLTree/netif"
import ReactResizeDetector from "react-resize-detector"
import path from "path"
import {YakURL} from "@/pages/yakURLTree/data"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";

interface MsgProps {
    arch: string
    basicInfo: string
    currentPath: string
    driveList: string
    localIp: string
    osInfo: string
}

interface WebShellDetailOptProps {
    id: string
    webshellInfo: WebShellDetail
}

const {ipcRenderer} = window.require("electron")

export const WebShellDetailOpt: React.FC<WebShellDetailOptProps> = (props) => {
    // console.log("WebShellDetailOpt", props)
    const xtermRef = useRef<any>(null)
    const [inputValue, setInputValue] = useState<string>("")
    const [defaultPath, setDefaultPath] = useState<string>("")
    const [defaultXterm, setDefaultXterm] = useState<string>("")
    const [linePath, setLinePath] = useState<string>("")
    const [behidnerBaseInfo, setBehinderBaseInfo] = useState<string>("")
    const [godzillaBaseInfo, setGodzillaBaseInfo] = useState<string>("")
    const [activeKey, setActiveKey] = useState<string>("basicInfo")
    const [shellType, setShellType] = useState<"Behinder" | "Godzilla">("Behinder")
    /** Log Output */

    useEffect(() => {
        if (!xtermRef) {
            return
        }
    }, [xtermRef])

    useUpdateEffect(() => {
        if (activeKey === "vcmd" && inputValue.length === 0) {
            // xtermClear(xtermRef)
            setInputValue(defaultXterm)
            writeXTerm(xtermRef, defaultXterm)
        }
    }, [activeKey])

    // Define sort function
    const sortByPriority = (a, b) => {
        // Place these three items at the top
        const priorityValues = ["OsInfo", "OS", "CurrentDir"];
        const priorityA = priorityValues.indexOf(a.key);
        const priorityB = priorityValues.indexOf(b.key);
        return priorityB - priorityA;
    };

    useEffect(() => {
        const {Id, ShellType} = props.webshellInfo
        // Define async function to get Basic Info
        ipcRenderer
            .invoke("GetBasicInfo", {Id})
            .then((r) => {
                try {
                    setShellType(ShellType)
                    if (ShellType === "Behinder") {
                        let obj: { status: string; msg: MsgProps } = JSON.parse(new Buffer(r.Data, "utf8").toString())
                        const {status, msg} = obj
                        if (status === "success") {
                            setDefaultPath(msg.currentPath)
                            const helloMsg = `Arch: ${msg.arch}
OS: ${msg.osInfo}
LocalIP: ${msg.localIp}
                            
${msg.currentPath}`
                            setDefaultXterm(helloMsg + ">")
                            const sortedKeys = Object.keys(obj.msg).sort(
                                (a, b) => obj.msg[a].length - obj.msg[b].length
                            )
                            const resultArr = sortedKeys.map((key) => ({
                                key,
                                content: obj.msg[key]
                            }))
                            let resultString: string = ""
                            resultArr.map((item) => {
                                resultString += item.key + ": " + item.content
                            })
                            setBehinderBaseInfo(resultString)
                        }
                    } else {
                        let obj = JSON.parse(new Buffer(r.Data, "utf8").toString())
                        setDefaultPath(obj.CurrentDir)
                        const helloMsg = `OS: ${obj.OS}        
${obj.CurrentDir}`

                        setDefaultXterm(helloMsg + ">")
                        const resultString = Object.entries(obj) // Get key-value pair array directly
                            .sort(([keyA, valueA], [keyB, valueB]) => sortByPriority(valueA, valueB))
                            .reduce((resultString, [key, content]) => {
                                return `${resultString}${key}: ${content}\n`;
                            }, '');

                        setGodzillaBaseInfo(resultString);
                    }
                } catch (error) {
                }
            })
            .catch((e) => {
                failed(`FeaturePing failed: ${e}`)
            })
    }, [props.webshellInfo])

    const commandExec = useMemoizedFn((cmd: string) => {
        // Remove defaultXterm prefix from cmd string
        if (cmd.startsWith(defaultXterm)) {
            cmd = cmd.replace(defaultXterm, "")
        }

        const p = linePath === "" ? path.normalize(defaultPath) : path.normalize(linePath)
        const url: YakURL = {
            FromRaw: "",
            Schema: props.webshellInfo.ShellType,
            User: "",
            Pass: "",
            Location: "",
            Path: "/",
            Query: [
                {Key: "op", Value: "cmd"},
                {Key: "id", Value: props.webshellInfo.Id},
                {Key: "cmd", Value: cmd},
                {Key: "path", Value: p}
            ]
        }
        requestYakURLList({url, method: "POST"})
            .then((res) => {
                // Iterate Resources array in response
                res.Resources.forEach((resource) => {
                    // Iterate Extra array of each resource
                    const cp = resource.Path
                    setLinePath(cp)
                    resource.Extra.forEach((item) => {
                        // Check key match 'content'
                        if (item.Key === "content") {
                            writeXTerm(xtermRef, item.Value)
                            writeXTerm(xtermRef, "\n")
                            writeXTerm(xtermRef, cp + ">")
                            setInputValue(cp + ">")
                            setDefaultXterm(cp + ">")
                        }
                    })
                })
            })
            .catch((error) => {
                console.error("Failed to load data:", error) // Handle any possible errors
            })
    })

    return (
        <div style={{width: "100%", height: "100%"}}>
            <YakitTabs
                activeKey={activeKey}
                onChange={(v) => setActiveKey(v)}
                className='scan-port-tabs no-theme-tabs'
                tabBarStyle={{marginBottom: 5}}
            >
                <YakitTabs.YakitTabPane tab={"Basic Info"} key={"basicInfo"}>
                    <div style={{overflow: "auto", height: "100%"}}>
                        {shellType === "Behinder" ? (
                            <>

                                <YakitEditor
                                    type={"html"} value={behidnerBaseInfo} readOnly={true}
                                ></YakitEditor>
                            </>
                        ) : (
                            <>
                                <YakitEditor
                                    type={"html"} value={godzillaBaseInfo} readOnly={true}
                                ></YakitEditor>
                            </>
                        )}
                    </div>
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"Virtual Terminal"} key={"vcmd"}>
                    <div style={{height: "100%", width: "100%"}}>
                        <ReactResizeDetector
                            onResize={(width, height) => {
                                if (!width || !height) return
                                const row = Math.floor(height / 18.5)
                                const col = Math.floor(width / 10)
                                if (xtermRef) xtermFit(xtermRef, col, row)
                            }}
                            handleWidth={true}
                            handleHeight={true}
                            refreshMode={"debounce"}
                            refreshRate={50}
                        />
                        <YakitCVXterm
                            maxHeight={0}
                            ref={xtermRef}
                            options={{
                                convertEol: true
                            }}
                            isWrite={false}
                            onData={(data) => {
                                if (data.replace(/[\x7F]/g, "").length > 0) {
                                    writeXTerm(xtermRef, data)
                                    // Process user input data
                                    setInputValue((prevInput) => prevInput + data)
                                }
                            }}
                            onKey={(e) => {
                                const {key} = e
                                const {keyCode} = e.domEvent
                                // Delete
                                if (keyCode === TERMINAL_INPUT_KEY.BACK && xtermRef?.current) {
                                    // Don't delete if only initial value remains
                                    if (inputValue === defaultXterm) {
                                        return
                                    }
                                    setInputValue((prevInput) => prevInput.replace(/.$/, "").replace(/[\x7F]/g, ""))
                                    // Send backspace character
                                    xtermRef.current.terminal.write("\b \b")
                                    return
                                }
                                // Enter
                                if (keyCode === TERMINAL_INPUT_KEY.ENTER && xtermRef?.current) {
                                    // Call API here
                                    commandExec(inputValue)
                                    xtermRef.current.terminal.write("\n")
                                    setInputValue("")
                                    return
                                }
                            }}
                        />
                    </div>
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"File Mgmt"} key={"fileOpt"}>
                    <WebShellURLTreeAndTable
                        Id={props.webshellInfo.Id}
                        CurrentPath={defaultPath}
                        shellType={props.webshellInfo.ShellType as ShellType}
                    />
                </YakitTabs.YakitTabPane>
                <YakitTabs.YakitTabPane tab={"Database Mgmt"} key={"databaseOpt"}>
                    {props.webshellInfo.Url}
                    {props.webshellInfo.ShellType}
                </YakitTabs.YakitTabPane>
            </YakitTabs>
        </div>
    )
}
