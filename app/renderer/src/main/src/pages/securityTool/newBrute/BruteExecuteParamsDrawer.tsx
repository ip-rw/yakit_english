import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import React, {useEffect, useState} from "react"
import styles from "./BruteExecuteParamsDrawer.module.scss"
import {BruteExecuteExtraFormValue} from "./NewBruteType"
import {Form, FormInstance} from "antd"
import {useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {apiGetAllPayloadGroup, apiPayloadByType} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {PayloadGroupNodeProps} from "@/pages/payloadManager/newPayload"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

interface BruteExecuteParamsDrawerProps {
    extraParamsValue: BruteExecuteExtraFormValue
    visible: boolean
    onSave: (value: BruteExecuteExtraFormValue) => void
}
const BruteExecuteParamsDrawer: React.FC<BruteExecuteParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props
    const [form] = Form.useForm()

    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])

    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["brute-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='60%'
            title='Extra params'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <BruteSettings visible={visible} form={form} />
                <div className={styles["to-end"]}>Reached Bottom～</div>
            </Form>
        </YakitDrawer>
    )
})
export default BruteExecuteParamsDrawer

interface BruteSettingsProps {
    visible: boolean
    form: FormInstance<BruteExecuteExtraFormValue>
}
/**Weak password detection */
export const BruteSettings: React.FC<BruteSettingsProps> = React.memo((props) => {
    const {visible, form} = props
    const delayMin = Form.useWatch("DelayMin", form)
    const delayMax = Form.useWatch("DelayMax", form)

    const usernamesDict = Form.useWatch("UsernamesDict", form) || []
    const usernames = Form.useWatch("usernames", form)

    const passwordsDict = Form.useWatch("PasswordsDict", form) || []
    const passwords = Form.useWatch("passwords", form)

    useEffect(() => {
        if (usernamesDict.length === 0 && !usernames) {
            form.setFieldsValue({replaceDefaultUsernameDict: true})
        }
    }, [usernamesDict, usernames])
    useEffect(() => {
        if (passwordsDict.length === 0 && !passwords) {
            form.setFieldsValue({replaceDefaultPasswordDict: true})
        }
    }, [passwordsDict, passwords])
    return (
        <>
            <Form.Item
                label='User Dictionary'
                name='UsernamesDict'
                valuePropName='contentValue'
                trigger='setContentValue'
                validateTrigger='setContentValue'
                normalize={(value) => {
                    return value ? value.split(/,|\r?\n/) : []
                }}
            >
                <SelectPayload visible={visible} />
            </Form.Item>
            <Form.Item label='Brute-Force Users' name='usernames'>
                <YakitInput.TextArea placeholder='Enter brute-force usernames, separate multiple with“English Comma”Or New Line Separated' rows={3} />
            </Form.Item>
            <Form.Item label={" "} colon={false} name='replaceDefaultUsernameDict' valuePropName='checked'>
                <YakitCheckbox disabled={usernamesDict.length === 0 && !usernames}>Use Default User Dict</YakitCheckbox>
            </Form.Item>
            <Form.Item
                label='Password Dictionary'
                name='PasswordsDict'
                valuePropName='contentValue'
                trigger='setContentValue'
                validateTrigger='setContentValue'
                normalize={(value) => {
                    return value ? value.split(/,|\r?\n/) : []
                }}
            >
                <SelectPayload visible={visible} />
            </Form.Item>
            <Form.Item label='Brute-Force Passwords' name='passwords'>
                <YakitInput.TextArea placeholder='Enter brute-force passwords, separate multiple with“English Comma”Or New Line Separated' rows={3} />
            </Form.Item>
            <Form.Item label={" "} colon={false} name='replaceDefaultPasswordDict' valuePropName='checked'>
                <YakitCheckbox disabled={passwordsDict.length === 0 && !passwords}>Use Default Password Dict</YakitCheckbox>
            </Form.Item>
            <Form.Item label='Target Concurrency' name='Concurrent' help='Concurrent n Targets'>
                <YakitInputNumber min={0} type='horizontal' />
            </Form.Item>
            <Form.Item label='Concurrent in Target' name='TargetTaskConcurrent' help='Concurrent Tasks per Target'>
                <YakitInputNumber min={0} type='horizontal' />
            </Form.Item>
            <Form.Item label='Auto-Stop' name='OkToStop' help='Stop at First Result' valuePropName='checked'>
                <YakitSwitch />
            </Form.Item>

            <Form.Item label='Min Delay' name='DelayMin'>
                <YakitInputNumber min={0} max={delayMax} type='horizontal' />
            </Form.Item>
            <Form.Item label='Max Delay' name='DelayMax'>
                <YakitInputNumber min={delayMin} type='horizontal' />
            </Form.Item>
        </>
    )
})

interface SelectPayloadProps extends Omit<YakitSelectProps, "value" | "onChange"> {
    visible: boolean
    contentValue?: string | string[]
    setContentValue?: (s: string | string[]) => void
}
const SelectPayload: React.FC<SelectPayloadProps> = React.memo((props) => {
    const {visible, contentValue, setContentValue, ...restProps} = props

    const [valueSelect, setValueSelect] = useState<YakitSelectProps["value"]>()
    const [data, setData] = useState<PayloadGroupNodeProps[]>([])
    useEffect(() => {
        if (visible) fetchList()
    }, [visible])
    useEffect(() => {
        if (!contentValue?.length) {
            setValueSelect(undefined)
        }
    }, [contentValue])
    const fetchList = () => {
        apiGetAllPayloadGroup()
            .then((data: PayloadGroupNodeProps[]) => {
                setData(data)
            })
            .catch((e: any) => {
                yakitNotify("error", "Failed to Get Dictionary List" + e)
            })
            .finally()
    }
    const onSelectChange = useMemoizedFn((value) => {
        if (value) {
            apiPayloadByType(value).then((dict) => {
                if (setContentValue) setContentValue(dict)
            })
        } else {
            if (setContentValue) setContentValue("")
        }
        setValueSelect(value)
    })
    return (
        <YakitSelect allowClear {...restProps} value={valueSelect} onChange={onSelectChange}>
            {data.map((item) => {
                if (item.Type === "Folder") {
                    return item.Nodes.length > 0 ? (
                        <YakitSelect.OptGroup key={item.Name} label={item.Name}>
                            {item.Nodes.map((nodeItem) => (
                                <YakitSelect.Option key={nodeItem.Name} value={nodeItem.Name}>
                                    {nodeItem.Name}
                                </YakitSelect.Option>
                            ))}
                        </YakitSelect.OptGroup>
                    ) : (
                        <React.Fragment key={item.Name}></React.Fragment>
                    )
                }
                return <YakitSelect.Option key={item.Name}>{item.Name}</YakitSelect.Option>
            })}
        </YakitSelect>
    )
})
