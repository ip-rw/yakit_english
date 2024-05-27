import React, {useState} from "react";
import {Button, PageHeader} from "antd";
import {YakScript} from "../invoker/schema";
import MDEditor from '@uiw/react-md-editor';
import {success} from "../../utils/notification";

const {ipcRenderer} = window.require("electron");

export interface DocumentEditorProp {
    yakScript: YakScript
    markdown: string
    onFinished: () => any
}

export const DocumentEditor: React.FC<DocumentEditorProp> = (props) => {
    const [markdown, setMarkdown] = useState(props.markdown);

    return <div>
        <PageHeader
            title={"Edit/Add Mod Doc"} subTitle={props.yakScript.ScriptName + `[${props.yakScript.Id}]`}
            extra={[
                <Button
                    type={"primary"}
                    onClick={e => {
                        ipcRenderer.invoke("SaveMarkdownDocument", {
                            YakScriptId: props.yakScript.Id,
                            YakScriptName: props.yakScript.ScriptName,
                            Markdown: markdown,
                        }).then(() => {
                            success("Save Doc Success")
                        }).catch((e: any) => {
                            console.info(e)
                        }).finally()
                    }}
                >Save / Create Doc</Button>
            ]}
        />
        <MDEditor
            value={markdown}
            onChange={e => setMarkdown(e || "")}
            maxHeight={1000} height={700}
        >

        </MDEditor>
    </div>
};