import React, {useEffect, useState} from "react";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {
    HybridScanActiveTask,
    HybridScanControlRequest,
    HybridScanInputTarget,
    HybridScanPluginConfig,
    HybridScanResponse,
    HybridScanStatisticResponse
} from "@/models/HybridScan";
import {ExecResult, genDefaultPagination} from "@/pages/invoker/schema";
import {Divider, Space, Tag} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {useCookieState, useGetState, useMap} from "ahooks";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";

export interface HybridScanDemoProp {

}


const {ipcRenderer} = window.require("electron");

export const HybridScanDemo: React.FC<HybridScanDemoProp> = (props) => {
    const [token, setToken] = useState(randomString(40))
    const [loading, setLoading] = useState(false);

    const [target, setTarget] = React.useState<HybridScanInputTarget>({
        Input: `http://www.example.com/`, InputFile: [],
        HTTPRequestTemplate: {
            IsHttps: false, IsRawHTTPRequest: false, RawHTTPRequest: new Uint8Array(),
            Method: "GET", Path: ["/"], GetParams: [], Headers: [], Cookie: [],
            Body: new Uint8Array(), PostParams: [], MultipartParams: [], MultipartFileParams: [],IsHttpFlowId:false,
            HTTPFlowId:[]
        },
    })
    const [plugin, setPlugin] = React.useState<HybridScanPluginConfig>({
        PluginNames: ["Basic XSS Detection", "Open URL Redirection Vulnerability"],
        Filter: {Pagination: genDefaultPagination() /* Pagination is ignore for hybrid scan */}
    })

    const [status, setStatus] = React.useState<HybridScanStatisticResponse>({
        ActiveTargets: 0,
        ActiveTasks: 0,
        FinishedTargets: 0,
        FinishedTasks: 0,
        HybridScanTaskId: "",
        TotalPlugins: 0,
        TotalTargets: 0,
        TotalTasks: 0
    })
    const [activeTasks, setActiveTasks, getActiveTasks] = useGetState<HybridScanActiveTask[]>([]);

    useEffect(() => {
        setActiveTasks([])
        ipcRenderer.on(`${token}-data`, async (e, data: HybridScanResponse) => {
            setStatus(data)

            if (!!data?.UpdateActiveTask) {
                if (data.UpdateActiveTask.Operator === "remove") {
                    setActiveTasks(getActiveTasks().filter((v) => {
                        if (data?.UpdateActiveTask !== undefined) {
                            return v.Index !== data?.UpdateActiveTask.Index
                        }
                        return true
                    }))
                } else if (data.UpdateActiveTask.Operator === "create") {
                    setActiveTasks([...getActiveTasks(), data.UpdateActiveTask])
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[HybridScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[HybridScan] finished")
            setLoading(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-HybridScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <YakitResizeBox
        firstRatio={"350px"}
        firstMinSize={"280px"}
        firstNode={<AutoCard title={"Set Parameters"} size={"small"} extra={<div>
            <YakitButton disabled={loading} onClick={() => {
                ipcRenderer.invoke("HybridScan", {
                    Control: true, HybridScanMode: "new",
                } as HybridScanControlRequest, token).then(() => {
                    info(`Launch Success, Task ID: ${token}`)
                    setLoading(true)

                    // send target / plugin
                    ipcRenderer.invoke("HybridScan", {
                        Targets: target,
                        Plugin: plugin,
                    }, token).then(() => {
                        info("Targets & Plugins Sent Successfully")
                    })
                })
            }}>Start</YakitButton>
            <YakitButton danger={true} disabled={!loading} onClick={() => {
                ipcRenderer.invoke("cancel-HybridScan", token)
                setTimeout(() => {
                    setToken(randomString(40))
                }, 100)
            }}>
                Stop Task
            </YakitButton>
        </div>}>
            <Space direction={"vertical"}>
                <div>Default INPUT: {target.Input}</div>
                <div>Plugin Enabled：</div>
                {plugin.PluginNames.map(i => {
                    return <Tag>{i}</Tag>
                })}
            </Space>
        </AutoCard>}
        secondNode={<AutoCard title={"Execution Result"} size={"small"}>
            <Space direction={"vertical"}>
                <Space>
                    <YakitTag>{"Total Targets"}: {status.TotalTargets}</YakitTag>
                    <YakitTag>{"Targets Completed"}: {status.FinishedTargets}</YakitTag>
                    <YakitTag>{"Targets in Progress"}: {status.ActiveTargets}</YakitTag>
                    <YakitTag>{"Total Tasks"}: {status.TotalTasks}</YakitTag>
                    <YakitTag>{"Tasks in Progress"}: {status.ActiveTasks}</YakitTag>
                    <YakitTag>{"Tasks Completed"}: {status.FinishedTasks}</YakitTag>
                </Space>
                <Divider/>
                <Space direction={"vertical"}>
                    {activeTasks.map(i => {
                        return <YakitTag>{i.Index}: [{i.PluginName}] Targets Executed: {i.Url}</YakitTag>
                    })}
                </Space>
            </Space>
        </AutoCard>}
    />
};