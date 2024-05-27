import React, {useEffect, useState} from "react";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Form, Tooltip} from "antd";
import {failed} from "@/utils/notification";
import {QuestionCircleTwoTone} from "@ant-design/icons/lib";
import { getReleaseEditionName } from "./envfile";

export interface ConfigPcapPermissionFormProp {
    onClose: () => any
}

const {ipcRenderer} = window.require("electron");

export const ConfigPcapPermissionForm: React.FC<ConfigPcapPermissionFormProp> = (props) => {
    const [response, setResponse] = useState<{
        IsPrivileged: boolean
        Advice: string,
        AdviceVerbose: string,
    }>({Advice: "unknown", AdviceVerbose: "PCAP support info unavailable", IsPrivileged: false});
    const [platform, setPlatform] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("IsPrivilegedForNetRaw", {}).then(setResponse).catch(e => {
            failed(`Failed to obtain Pcap permission status：${e}`)
        }).finally(() => {
            ipcRenderer.invoke("fetch-system-and-arch").then((e: string) => setPlatform(e)).catch(e => {
                failed(`Fetch. ${getReleaseEditionName()} OS failure：${e}`)
            })
        })
    }, [])

    const isWindows = platform.toLowerCase().startsWith("win")

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            ipcRenderer.invoke(`PromotePermissionForUserPcap`, {}).then(() => {
                if (props?.onClose) {
                    props.onClose()
                }
            }).catch(e => {
                failed(`Failed to elevate PCAP user permissions：${e}`)
            })
        }}
    >
        <Form.Item
            label={" "} colon={false}
            // <Button type={"link"} icon={<QuestionCircleTwoTone/>}/>
            help={
                <>
                    <Tooltip title={"Principle: MacOS sets by /dev/bpf* For permissions, see Wireshark ChmodBPF config. Use setcap for Linux Pcap permissions, launch as admin with UAC on Windows"}>
                        <Button type={"link"} icon={<QuestionCircleTwoTone/>}/>
                    </Tooltip>
                    {isWindows ? `Launch with admin rights on Windows ${getReleaseEditionName()} To gain Pcap usage rights` : "Linux & MacOS can grant full network card access by setting permissions"}
                </>
            }
        >
            {
                response.IsPrivileged
                    ?
                    <Alert type={"success"} message={`Normal SYN scan available, no fix needed`}/>
                    :
                    <Alert type={"warning"} message={`Lacks network card permissions`}/>
            }
        </Form.Item>
        {
            response.IsPrivileged ? <Form.Item label={" "} colon={false}>
                {props?.onClose && <Button onClick={() => {
                    props.onClose()
                }}>Got It～</Button>}
            </Form.Item> : <Form.Item
                label={" "} colon={false}
            >
                <Button htmlType={"submit"} type={"primary"}>Enable PC’AP permissions</Button>
                <Tooltip title={`${response.AdviceVerbose}: ${response.Advice}`}>
                    <Button type={"link"}>Manual repair</Button>
                </Tooltip>
            </Form.Item>
        }
    </Form>
};

export const showPcapPermission = () => {
    const m = showModal({
        title: "Fix Pcap permissions",
        width: "70%",
        content: (
            <ConfigPcapPermissionForm onClose={() => {
                m.destroy()
            }}/>
        )
    })
}