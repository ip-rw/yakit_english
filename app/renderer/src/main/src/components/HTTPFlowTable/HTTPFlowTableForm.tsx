import React, {useEffect, useRef, useState} from "react"
import {Form, Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import styles from "./HTTPFlowTableForm.module.scss"
import classNames from "classnames"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {FiltersItemProps} from "../TableVirtualResize/TableVirtualResizeType"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoveIcon} from "@/assets/newIcon"
export interface HTTPFlowTableFormConfigurationProps {
    visible: boolean
    setVisible: (b: boolean) => void
    responseType: FiltersItemProps[]
    onSave: (v: HTTPFlowTableFromValue) => void
    filterMode: "shield" | "show"
    hostName: string[]
    urlPath: string[]
    fileSuffix: string[]
    searchContentType: string
}

export interface HTTPFlowTableFromValue {
    filterMode: "shield" | "show"
    urlPath: string[]
    hostName: string[]
    fileSuffix: string[]
    searchContentType: string
}

export enum HTTPFlowTableFormConsts {
    HTTPFlowTableFilterMode = "YAKIT_HTTPFlowTableFilterMode",
    HTTPFlowTableHostName = "YAKIT_HTTPFlowTableHostName",
    HTTPFlowTableUrlPath = "YAKIT_HTTPFlowTableUrlPath",
    HTTPFlowTableFileSuffix = "YAKIT_HTTPFlowTableFileSuffix",
    HTTPFlowTableContentType = "YAKIT_HTTPFlowTableContentType"
}

export const HTTPFlowTableFormConfiguration: React.FC<HTTPFlowTableFormConfigurationProps> = (props) => {
    const {visible, setVisible, responseType, onSave, filterMode, hostName, urlPath, fileSuffix, searchContentType} =
        props
    const [filterModeDef, setFilterModeDef] = useState<"shield" | "show">("shield")
    const [hostNameDef, setHostNameDef] = useState<string[]>([])
    const [urlPathDef, setUrlPathDef] = useState<string[]>([])
    const [fileSuffixDef, setFileSuffixDef] = useState<string[]>([])
    const [searchContentTypeDef, setSearchContentTypeDef] = useState<string[]>()
    const [form] = Form.useForm()
    // Get Default
    useEffect(() => {
        if(!visible) return
        // Filter Mode
        setFilterModeDef(filterMode)
        // HostName
        setHostNameDef(hostName)
        // URL Path
        setUrlPathDef(urlPath)
        // File Suffix
        setFileSuffixDef(fileSuffix)
        // Response Type
        const contentType: string = searchContentType
        const searchType: string[] = contentType.length === 0 ? [] : contentType.split(",")
        setSearchContentTypeDef(searchType)

        form.setFieldsValue({filterMode, hostName, urlPath, fileSuffix, searchContentType: searchType})
    }, [visible])

    /**
     * @Save Advanced Settings
     */
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            const {filterMode, urlPath = [], hostName = [], fileSuffix = []} = formValue
            let searchContentType: string = (formValue.searchContentType || []).join(",")
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFilterMode, filterMode)
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableHostName, JSON.stringify(hostName))
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableUrlPath, JSON.stringify(urlPath))
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFileSuffix, JSON.stringify(fileSuffix))
            setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType, searchContentType)
            onSave({
                filterMode: filterMode,
                hostName,
                urlPath,
                fileSuffix,
                searchContentType
            })
        })
    })

    const onClose = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        const oldValue: any = {
            filterMode: filterModeDef,
            hostName: hostNameDef,
            urlPath: urlPathDef,
            fileSuffix: fileSuffixDef,
            searchContentType: searchContentTypeDef
        }
        const newValue = {
            ...formValue
        }
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            Modal.confirm({
                title: "Kind Reminder",
                icon: <ExclamationCircleOutlined />,
                content: "Confirm Save Advanced Settings & Close Dialog？",
                okText: "Save",
                cancelText: "Don't Save",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    onSaveSetting()
                },
                onCancel: () => {
                    setVisible(false)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
        }
    })

    const reset = () => {
        form.resetFields()
    }
    return (
        <YakitDrawer
            className={styles["http-flow-table-form-configuration"]}
            visible={visible}
            width='40%'
            onClose={() => onClose()}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>Advanced Filter</div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setVisible(false)
                            }}
                        >
                            Cancel
                        </YakitButton>
                        <YakitButton type='primary' onClick={() => onSaveSetting()}>
                            Save
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
            <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}} className={styles["mitm-filters-form"]}>
                <Form.Item label='Filter Mode' name='filterMode' initialValue={"shield"}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={[
                            {
                                value: "shield",
                                label: "Block Content"
                            },
                            {
                                value: "show",
                                label: "Display Only"
                            }
                        ]}
                    />
                </Form.Item>
                <Form.Item label='Hostname' name='hostName'>
                    <YakitSelect mode='tags'></YakitSelect>
                </Form.Item>
                <Form.Item
                    label='URL Path'
                    name='urlPath'
                    help={"Understood as URI Matching, e.g. /main/index.php?a=123 or /*/index or /admin* "}
                >
                    <YakitSelect mode='tags'></YakitSelect>
                </Form.Item>
                <Form.Item label={"File Suffix"} name='fileSuffix'>
                    <YakitSelect mode='tags'></YakitSelect>
                </Form.Item>
                <Form.Item label={"Response Type"} name='searchContentType'>
                    <YakitSelect mode='tags' options={responseType}></YakitSelect>
                </Form.Item>
                <Form.Item label={" "} colon={false}>
                    <YakitButton type='text' onClick={reset}>
                        Reset
                    </YakitButton>
                </Form.Item>
            </Form>
        </YakitDrawer>
    )
}
