import React from "react";
import {info} from "@/utils/notification";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Space} from "antd";
import { getReleaseEditionName } from "./envfile";

const {ipcRenderer} = window.require("electron");

export const invalidCacheAndUserData = (delTemporaryProject) => {
    const m = showModal({
        title: "Reset UserData & Cache",
        content: (
            <Space style={{width: 600}} direction={"vertical"}>
                <Alert type={"error"} message={`If your ${getReleaseEditionName()} 若遇到错误, 请使用此功能删除所有本地缓存与用户数据, 重新连接与重启。`}/>
                <Alert type={"error"} message={"Caution, this action will permanently delete cache data, hard to recover, proceed with caution"}/>
                <Button type={"primary"} danger={true} onClick={async () => {
                    m.destroy()
                    await delTemporaryProject()
                    ipcRenderer.invoke("ResetAndInvalidUserData", {}).then(() => {
                    }).catch(e => {
                    }).finally(() => {
                        info("Reset UserData Success")
                    })
                }}>I acknowledge the risk, delete now</Button>
            </Space>
        ),
        width: 700,
    })

}