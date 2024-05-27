import React, {useEffect, useState} from "react"
import {Form} from "antd"
import {YakScript} from "../invoker/schema"
import {failed, success, yakitNotify} from "../../utils/notification"
import {useMemoizedFn} from "ahooks"
import "./PluginOperator.scss"
import {getRemoteValue} from "@/utils/kv"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isCommunityEdition} from "@/utils/envfile"
import {CodeGV} from "@/yakitGV"
import {DatabaseFirstMenuProps, YakitRoute} from "@/routes/newRoute"

const {ipcRenderer} = window.require("electron")

export interface AddToMenuActionFormProp {
    script: YakScript
    visible: boolean
    updateGroups?: () => any
    setVisible: (b: boolean) => any
}

interface OptionsProps {
    label: string
    value: string
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const [form] = Form.useForm()
    const {script, visible, setVisible} = props
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {}
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    const [menuData, setMenuData] = useState<DatabaseFirstMenuProps[]>([])
    const [option, setOption] = useState<OptionsProps[]>([])

    useEffect(() => {
        form.setFieldsValue({
            // Group: "Community Components",
            Group: "",
            Verbose: props.script.ScriptName
        })
    }, [props.script])
    useEffect(() => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setPatternMenu(menuMode)
            init(menuMode)
        })
    }, [visible])
    /**
     * @description: Get Top-Level Menu
     */
    const init = useMemoizedFn((menuMode: string, updateSubMenu?: boolean) => {
        ipcRenderer
            .invoke("GetAllNavigationItem", {Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : menuMode})
            .then((rsp: {Data: DatabaseFirstMenuProps[]}) => {
                setOption(rsp.Data.map((ele) => ({label: ele.Group, value: ele.Group})))
                setMenuData(rsp.Data)
                form.setFieldsValue({
                    Group: rsp.Data[0].Group || "",
                    Verbose: props.script?.ScriptName || ""
                })
            })
            .catch((err) => {
                failed("Menu retrieval failed：" + err)
            })
    })
    return (
        <div className='add-to-menu-action-form-body'>
            <Form
                form={form}
                layout='vertical'
                onFinish={(values) => {
                    if (!script) {
                        failed("No Yak Modeule Selected")
                        return
                    }
                    const index = menuData.findIndex((ele) => ele.Group === values.Group)
                    let params: any = {}

                    if (index === -1) {
                        if (menuData.length >= 50) {
                            yakitNotify("error", "Max 50 Top-Level Menus")
                            return
                        }
                        params = {
                            YakScriptName: props.script.ScriptName,
                            Verbose: values.Verbose,
                            VerboseLabel: props.script.ScriptName,
                            Group: values.Group,
                            GroupLabel: values.Group,
                            Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : patternMenu,
                            VerboseSort: 1,
                            GroupSort: menuData.length + 1,
                            Route: YakitRoute.Plugin_OP
                        }
                    } else {
                        if (menuData[index].Items.length >= 50) {
                            yakitNotify("error", "Max 50 Submenus Per Top-Level Menu")
                            return
                        }
                        const groupInfo = menuData[index]
                        params = {
                            YakScriptName: props.script.ScriptName,
                            Verbose: values.Verbose,
                            VerboseLabel: props.script.ScriptName,
                            Group: groupInfo.Group,
                            GroupLabel: groupInfo.GroupLabel,
                            Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : patternMenu,
                            VerboseSort: 0,
                            GroupSort: groupInfo.GroupSort,
                            Route: YakitRoute.Plugin_OP
                        }
                        const subIndex = groupInfo.Items.findIndex((ele) => ele.Verbose === values.Verbose)
                        params.VerboseSort =
                            subIndex === -1
                                ? menuData[index].Items.length + 1
                                : menuData[index].Items[subIndex].VerboseSort || 0
                    }

                    ipcRenderer
                        .invoke("AddOneNavigation", params)
                        .then(() => {
                            if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                            else ipcRenderer.invoke("change-main-menu")
                            updateGroups()
                            setVisible(false)
                            success("Add Success")
                        })
                        .catch((e: any) => {
                            failed(`${e}`)
                        })
                }}
            >
                <Form.Item
                    label={"Menu Option Name (Display Name))"}
                    name='Verbose'
                    rules={[{required: true, message: "Required Field"}]}
                >
                    <YakitInput />
                </Form.Item>
                <Form.Item label={"Menu Group"} name='Group' rules={[{required: true, message: "Required Field"}]}>
                    <YakitAutoComplete options={option} />
                </Form.Item>
                <div className='add-to-menu-action-form-footer'>
                    <Form.Item colon={false} noStyle>
                        <YakitButton
                            type='outline1'
                            onClick={() => {
                                setVisible(false)
                            }}
                        >
                            Cancel
                        </YakitButton>
                    </Form.Item>
                    <Form.Item colon={false} noStyle>
                        <YakitButton type='primary' htmlType='submit'>
                            Add
                        </YakitButton>
                    </Form.Item>
                </div>
            </Form>
        </div>
    )
}
