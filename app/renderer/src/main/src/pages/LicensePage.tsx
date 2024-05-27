import React, {ReactNode, useEffect, useRef, useState} from "react"
import {failed, info, success} from "@/utils/notification"
import {Button, Col, Divider, Form, Modal, notification, Row, Spin} from "antd"
import {InputItem} from "@/utils/inputUtil"
import CopyToClipboard from "react-copy-to-clipboard"
import "./LicensePage.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
const {ipcRenderer} = window.require("electron")
const {Item} = Form

export interface LicensePageProps {
    judgeLicense: (v: string) => void
    licensePageLoading: boolean
    setLicensePageLoading: (v: boolean) => void
}

interface LicensePostProps {
    licenseActivation: string
}
const LicensePage: React.FC<LicensePageProps> = (props) => {
    const {judgeLicense, licensePageLoading, setLicensePageLoading} = props
    const [licenseRequest, setLicenseRequest] = useState("")
    const [paramsObj, setParamsObj] = useState<LicensePostProps>({licenseActivation: ""})

    useEffect(() => {
        setLicensePageLoading(true)
        ipcRenderer
            .invoke("GetLicense", {})
            .then((e) => {
                setLicenseRequest(e.License)
            })
            .catch((e) => {
                failed(`Failed to Retrieve License: ${e}`)
            })
            .finally(() => {
                setLicensePageLoading(false)
            })
    }, [])

    if (!licenseRequest) {
        return <Spin className='license-spin-box' tip={"Load License"} />
    }

    const UploadLicense = () => {
        setLicensePageLoading(true)
        judgeLicense(paramsObj.licenseActivation)
    }

    return (
        <div style={{height:"100%",overflow:"auto"}}>
            <Spin spinning={licensePageLoading}>
                <Row style={{paddingTop: 50}}>
                    <Col span={4} />
                    <Col span={16}>
                        <Form
                            layout={"horizontal"}
                            labelCol={{span: 4}}
                            wrapperCol={{span: 18}}
                            onSubmitCapture={(e) => {
                                e.preventDefault()

                                if (!paramsObj.licenseActivation) {
                                    Modal.error({title: "Empty License..."})
                                    return
                                }

                                UploadLicense()
                            }}
                        >
                            <Item label={" "} colon={false}>
                                <h1>Register Your Product Using License</h1>
                            </Item>
                            <InputItem
                                label={"License Request Code"}
                                textarea={true}
                                textareaRow={10}
                                disable={true}
                                extraFormItemProps={{
                                    style: {
                                        marginBottom: 4
                                    }
                                }}
                                value={licenseRequest}
                            />
                            <Item
                                label={" "}
                                colon={false}
                                style={{textAlign: "left"}}
                                help={"Provide This Request Code to Sales for Your Unique License"}
                            >
                                <CopyToClipboard
                                    text={licenseRequest}
                                    onCopy={(t, ok) => {
                                        if (ok) {
                                            notification["success"]({message: "Copy Success"})
                                        }
                                    }}
                                >
                                    <Button type={"link"} size={"small"}>
                                        Click to Copy License Request Code
                                    </Button>
                                </CopyToClipboard>
                            </Item>
                            <Divider />
                            <InputItem
                                label={"Your License"}
                                textarea={true}
                                textareaRow={13}
                                setValue={(licenseActivation) => setParamsObj({...paramsObj, licenseActivation})}
                                value={paramsObj.licenseActivation}
                            />
                            <Item label={" "} colon={false}>
                                <Button type={"primary"} htmlType={"submit"} style={{width: "100%", height: 60}}>
                                    Click Here to Activate Your Product with License
                                </Button>
                            </Item>
                        </Form>
                    </Col>
                    <Col span={4} />
                </Row>
            </Spin>
        </div>
    )
}

export default LicensePage
