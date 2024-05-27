import React, {useEffect, useRef, useState} from "react"
import {Form, Select, Progress, Cascader} from "antd"
import {useMemoizedFn, useThrottleFn, useGetState} from "ahooks"
import {failed, success, warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {
    FileProjectInfoProps,
    ProjectDescription,
    ProjectIOProgress,
    ProjectsResponse
} from "./softwareSettings/ProjectManage"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ChevronDownIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

const {ipcRenderer} = window.require("electron")

export interface SelectUploadProps {
    onCancel: () => void
}

interface CascaderValueProps {
    Id: string
    DatabasePath: string
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

const SelectUpload: React.FC<SelectUploadProps> = (props) => {
    const {onCancel} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [allowPassword, setAllowPassword] = useState<"0" | "1" | "2">()
    const [token, _] = useState(randomString(40))
    const [uploadToken, __] = useState(randomString(40))
    const [form] = Form.useForm()
    const [percent, setPercent] = useState<number>(0.0)
    const filePath = useRef<string>()
    const [cascaderValue, setCascaderValue] = useState<CascaderValueProps>()

    const [data, setData, getData] = useGetState<FileProjectInfoProps[]>([])

    /** @name Export Entity File Error? (Block post-channel upload if error) */
    const hasErrorRef = useRef<boolean>(false)
    // Cancel?
    const isCancle = useRef<boolean>(false)

    const uploadFile = useMemoizedFn(async () => {
        if (isCancle.current) return
        setPercent(allowPassword === "2" ? 0.01 : 0.51)
        await ipcRenderer
            .invoke("split-upload", {url: "import/project", path: filePath.current, token: uploadToken})
            .then((TaskStatus) => {
                if (isCancle.current) return
                if (TaskStatus) {
                    setPercent(1)
                    success("Upload Data Success")
                    setTimeout(() => {
                        onCancel()
                    }, 200)
                } else {
                    failed(`Project Upload Failed`)
                }
            })
            .catch((err) => {
                failed(`Project Upload Failed:${err}`)
            })
            .finally(() => {
                if (isCancle.current) return
                setTimeout(() => {
                    setLoading(false)
                    setPercent(0)
                }, 200)
            })
    })

    useEffect(() => {
        ipcRenderer.on(`callback-split-upload-${uploadToken}`, async (e, res: any) => {
            if (isCancle.current) return
            const {progress} = res
            let newProgress = progress
            if (newProgress === 100) {
                newProgress = 99
            }
            if (newProgress === 0) {
                newProgress = 1
            }
            let intProgress = newProgress / 100
            if (allowPassword === "2") {
                setPercent(intProgress)
            } else {
                setPercent(intProgress * 0.5 + 0.5)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners(`callback-split-upload-${uploadToken}`)
        }
    }, [allowPassword])

    const cancleUpload = () => {
        ipcRenderer.invoke("cancel-ExportProject", token)
        ipcRenderer.invoke("cancle-split-upload").then(() => {
            warn("Cancel Upload Success")
            setLoading(false)
            setPercent(0)
            isCancle.current = true
        })
    }

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-data`, async (e, data: ProjectIOProgress) => {
            if (!!data.TargetPath) {
                filePath.current = data.TargetPath.replace(/\\/g, "\\")
            }
            if (data.Percent > 0) {
                if (isCancle.current) return
                setPercent(data.Percent * 0.5)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            hasErrorRef.current = true
            setLoading(false)
            failed(`[ExportProject] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (hasErrorRef.current) return
            uploadFile()
        })

        return () => {
            ipcRenderer.invoke("cancel-ExportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    const onFinish = useMemoizedFn((values) => {
        if (!cascaderValue) return
        setLoading(true)
        isCancle.current = false
        if (allowPassword === "2") {
            // Direct Upload Skip ExportProject Read project default-yakit.db directly
            filePath.current = cascaderValue.DatabasePath
            uploadFile()
            return
        }
        hasErrorRef.current = false
        ipcRenderer.invoke(
            "ExportProject",
            {
                Id: cascaderValue.Id,
                Password: allowPassword === "1" ? values.password || "" : ""
            },
            token
        )
    })

    const fetchChildNode = useMemoizedFn((selectedOptions: FileProjectInfoProps[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]
        targetOption.loading = true
        ipcRenderer
            .invoke("GetProjects", {
                FolderId: +targetOption.Id,
                Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
            })
            .then((rsp: ProjectsResponse) => {
                try {
                    setTimeout(() => {
                        if (rsp.Projects.length === 0) {
                            targetOption.children = [] // Empty Array
                        } else {
                            targetOption.children = [...rsp.Projects].map((item) => {
                                const info: FileProjectInfoProps = {...item}
                                if (info.Type === "file") {
                                    info.isLeaf = false
                                } else {
                                    info.isLeaf = true
                                }
                                return info
                            })
                        }
                        targetOption.loading = false
                        setData([...getData()])
                    }, 300)
                } catch (e) {
                    failed("Process Project Data Failed: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`Query Projects Failed：${e}`)
            })
    })

    const fetchFirstList = useMemoizedFn(() => {
        const param = {
            Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
        }

        ipcRenderer
            .invoke("GetProjects", param)
            .then((rsp: ProjectsResponse) => {
                try {
                    setData(
                        rsp.Projects.map((item) => {
                            const info: FileProjectInfoProps = {...item}
                            if (info.Type === "file") {
                                info.isLeaf = false
                            } else {
                                info.isLeaf = true
                            }
                            return info
                        })
                    )
                } catch (e) {
                    failed("Process Project Data Failed: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`Query Projects Failed：${e}`)
            })
    })

    useEffect(() => {
        fetchFirstList()
    }, [])

    return (
        <Form {...layout} form={form} onFinish={onFinish}>
            <Form.Item name='allow_password' label='Upload Mode' rules={[{required: true, message: "Required Field"}]}>
                <YakitSelect disabled={loading} placeholder='Select Encryption Mode' onChange={setAllowPassword}>
                    <YakitSelect.Option value='1'>Encrypt Upload</YakitSelect.Option>
                    <YakitSelect.Option value='0'>Compress Upload</YakitSelect.Option>
                    <YakitSelect.Option value='2'>Direct Upload</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            {allowPassword === "1" && (
                <Form.Item name='password' label='Password' rules={[{required: true, message: "Required Field"}]}>
                    <YakitInput disabled={loading} placeholder='Enter Password' />
                </Form.Item>
            )}
            <Form.Item name='name' label='Project' rules={[{required: true, message: "Required Field"}]}>
                <Cascader
                    disabled={loading}
                    options={data}
                    placeholder='Select Project'
                    fieldNames={{label: "ProjectName", value: "Id", children: "children"}}
                    loadData={(selectedOptions) => fetchChildNode(selectedOptions as any)}
                    showCheckedStrategy='SHOW_CHILD'
                    onChange={(value, selectedOptions) => {
                        if (
                            selectedOptions.length > 0 &&
                            selectedOptions[selectedOptions.length - 1].Type === "project"
                        ) {
                            const item = selectedOptions[selectedOptions.length - 1]
                            setCascaderValue({Id: item.Id, DatabasePath: item.DatabasePath})
                        }
                    }}
                    suffixIcon={<ChevronDownIcon style={{color: "var(--yakit-body-text-color)"}} />}
                />
            </Form.Item>
            {percent > 0 && (
                <div style={{width: 276, margin: "0 auto", paddingBottom: 14}}>
                    <Progress percent={Math.floor((percent || 0) * 100)} />
                </div>
            )}
            <div style={{textAlign: "center"}}>
                {loading ? (
                    <YakitButton style={{width: 200}} type='primary' onClick={cancleUpload}>
                        Cancel
                    </YakitButton>
                ) : (
                    <YakitButton style={{width: 200}} type='primary' htmlType='submit'>
                        Confirm
                    </YakitButton>
                )}
            </div>
        </Form>
    )
}

export default SelectUpload
