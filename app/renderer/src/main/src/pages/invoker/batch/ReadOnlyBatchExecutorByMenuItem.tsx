import React, {useEffect, useState} from "react";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {ResizeBox} from "../../../components/ResizeBox";
import {BatchExecuteByFilter} from "./BatchExecuteByFilter";
import {SimplePluginListFromYakScriptNames} from "../../../components/SimplePluginList";
import {AutoCard} from "../../../components/AutoCard";
import {Empty, Spin} from "antd";


const {ipcRenderer} = window.require("electron");

export interface ReadOnlyBatchExecutorByRecoverUidProp {
    Uid?: string
    BaseProgress?: number
}
/**@Deprecated appears unused, but batch execution lacks task listing, so retain for now as reference */
export const ReadOnlyBatchExecutorByRecoverUid: React.FC<ReadOnlyBatchExecutorByRecoverUidProp> = (props: ReadOnlyBatchExecutorByRecoverUidProp) => {
    const [target, setTarget] = useState<string>("");
    const [query, setQuery] = useState<SimpleQueryYakScriptSchema>({
        tags: "struts", include: [], exclude: [], type: "mitm,port-scan,nuclei"
    });
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("GetExecBatchYakScriptUnfinishedTaskByUid", {
            Uid: props.Uid,
        }).then((req: {
            ScriptNames: string[],
            Target: string,
        }) => {
            const {Target, ScriptNames} = req;
            setQuery({include: ScriptNames, type: "mitm,port-scan,nuclei", exclude: [], tags: ""})
            setTarget(Target)
        }).catch(e => {
            console.info(e)
        }).finally(() => setTimeout(() => setLoading(false), 600))
    }, [props.Uid])

    if (!props.Uid) {
        return <Empty description={"Resuming unfinished batch tasks requires extra UID"}>

        </Empty>
    }

    if (loading) {
        return <Spin tip={"Resuming unfinished tasks"}/>
    }

    return <AutoCard size={"small"} bordered={false}
                     bodyStyle={{paddingLeft: 0, paddingRight: 0, paddingTop: 4, overflow: "hidden"}}>
        <ResizeBox
            firstNode={
                <div style={{height: "100%"}}>
                    <SimplePluginListFromYakScriptNames
                        names={query.include}
                    />
                </div>
            }
            firstMinSize={300}
            firstRatio={"300px"}
            secondNode={<BatchExecuteByFilter
                simpleQuery={query}
                allTag={[]}
                total={query.include.length}
                initTargetRequest={{
                    target: target, targetFile: "", allowFuzz: true,
                    progressTaskCount: 5, concurrent: 3, proxy: "",
                    totalTimeout: 7200,
                }}
                isAll={false}
                fromRecover={true}
                recoverUid={props.Uid}
                baseProgress={props.BaseProgress}
                executeHistory={(i) => {
                    // if (!setQuery) {
                    //     return
                    // }
                    // setQuery(i.simpleQuery)
                }}
            />}
        />
    </AutoCard>
}
