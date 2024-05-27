import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import styles from "./SimpleDetectExtraParamsDrawer.module.scss"
import {Form} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {useEffect, useState} from "react"
import React from "react"
import {BruteExecuteExtraFormValue} from "../securityTool/newBrute/NewBruteType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {BruteSettings} from "../securityTool/newBrute/BruteExecuteParamsDrawer"
import {
    BasicCrawlerSettingsPanel,
    FingerprintSettingsPanel,
    NetworkCardSettingsPanel,
    ScanOtherSettingsPanel
} from "../securityTool/newPortScan/NewPortScanExtraParamsDrawer"
import {defaultBruteExecuteExtraFormValue} from "@/defaultConstants/NewBrute"

const {YakitPanel} = YakitCollapse

export interface SimpleDetectExtraParam {
    portScanParam: PortScanExecuteExtraFormValue
    bruteExecuteParam: BruteExecuteExtraFormValue
}
interface SimpleDetectExtraParamsDrawerProps {
    extraParamsValue: SimpleDetectExtraParam
    visible: boolean
    onSave: (v: SimpleDetectExtraParam) => void
}

const SimpleDetectExtraParamsDrawer: React.FC<SimpleDetectExtraParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props

    const [activeKey, setActiveKey] = useState<string[]>(["Weak Password Config"])

    const [bruteForm] = Form.useForm()
    const [portScanForm] = Form.useForm()
    useEffect(() => {
        if (visible) {
            bruteForm.setFieldsValue({...extraParamsValue.bruteExecuteParam})
            portScanForm.setFieldsValue({...extraParamsValue.portScanParam})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        const bruteFormValue = bruteForm.getFieldsValue()
        portScanForm.validateFields().then((portScanFormValue) => {
            const formValue = {
                bruteExecuteParam: bruteFormValue,
                portScanParam: portScanFormValue
            }
            onSave(formValue)
        })
    })

    return (
        <YakitDrawer
            className={styles["simple-detect-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='65%'
            title='Extra params'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={bruteForm} style={{marginBottom: 8}}>
                <YakitCollapse
                    destroyInactivePanel={false}
                    activeKey={activeKey}
                    onChange={(key) => setActiveKey(key as string[])}
                    bordered={false}
                >
                    <BruteSettingsPanel key='Weak Password Config' visible={visible} />
                </YakitCollapse>
            </Form>
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={portScanForm}>
                <SimpleDetectExtraParams visible={visible} />
            </Form>
            <div className={styles["to-end"]}>Reached Bottom～</div>
        </YakitDrawer>
    )
})

export default SimpleDetectExtraParamsDrawer

interface BruteSettingsPanelProps {
    visible: boolean
}
export const BruteSettingsPanel: React.FC<BruteSettingsPanelProps> = React.memo((props) => {
    const {visible, ...restProps} = props
    const form = Form.useFormInstance()
    const onResetBrute = useMemoizedFn(() => {
        form.setFieldsValue({
            ...defaultBruteExecuteExtraFormValue
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps} // For Correct Panel Rendering Only/Expand/Collapse, No Other Function
                header='Weak Password Settings'
                key='Weak Password Settings'
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onResetBrute()
                        }}
                    >
                        Reset
                    </YakitButton>
                }
            >
                <BruteSettings visible={visible} form={form} />
            </YakitPanel>
        </>
    )
})
interface SimpleDetectExtraParamsProps {
    visible: boolean
}
const SimpleDetectExtraParams: React.FC<SimpleDetectExtraParamsProps> = React.memo((props) => {
    const {visible} = props
    const [activeKey, setActiveKey] = useState<string[]>(["NIC Config", "Fingerprint Scan Config", "Basic Crawler Config", "Other Configs"])

    return (
        <>
            <YakitCollapse
                destroyInactivePanel={false}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={false}
            >
                <NetworkCardSettingsPanel key='NIC Config' visible={visible} />
                <FingerprintSettingsPanel key='Fingerprint Scan Config' isSimpleDetect={true} />
                <BasicCrawlerSettingsPanel key='Basic Crawler Config' />
                <ScanOtherSettingsPanel key='Other Configs' />
            </YakitCollapse>
        </>
    )
})
