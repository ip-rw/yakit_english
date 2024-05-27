import React, {useEffect, useRef} from "react"
import {PluginExecuteExtraFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {Form, FormInstance} from "antd"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginBatchExecuteExtraFormValue} from "./pluginBatchExecutor"
import {FixExtraParamsNode} from "../operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import cloneDeep from "lodash/cloneDeep"
import {PluginGV} from "../builtInData"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {defPluginExecuteTaskValue} from "@/defaultConstants/PluginBatchExecutor"
import {defPluginExecuteFormValue} from "../operator/localPluginExecuteDetailHeard/constants"

const {YakitPanel} = YakitCollapse

interface PluginBatchExecuteExtraParamsDrawerProps {
    /**Show Request Config? Default Shown */
    isRawHTTPRequest: boolean
    extraParamsValue: PluginBatchExecuteExtraFormValue
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (v: PluginBatchExecuteExtraFormValue) => void
}
const PluginBatchExecuteExtraParamsDrawer: React.FC<PluginBatchExecuteExtraParamsDrawerProps> = React.memo((props) => {
    const {isRawHTTPRequest, extraParamsValue, visible, onSave} = props

    const [form] = Form.useForm()

    const pathRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
        onGetRemoteValues: () => {},
        onSetRemoteValues: (s: string[]) => {}
    })
    const proxyRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
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
            if (formValue.Path) {
                pathRef.current.onSetRemoteValues(formValue.Path)
            }
            if (formValue.Proxy) {
                proxyRef.current.onSetRemoteValues(formValue.Proxy)
            }
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["plugin-batch-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='40%'
            title='Extra params'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <PluginBatchExecuteExtraParams
                    pathRef={pathRef}
                    proxyRef={proxyRef}
                    isRawHTTPRequest={isRawHTTPRequest}
                    form={form}
                />
                <div className={styles["to-end"]}>Reached Bottom～</div>
            </Form>
        </YakitDrawer>
    )
})
export default PluginBatchExecuteExtraParamsDrawer

interface PluginBatchExecuteExtraParamsProps {
    pathRef: React.MutableRefObject<YakitBaseSelectRef>
    proxyRef: React.MutableRefObject<YakitAutoCompleteRefProps>
    isRawHTTPRequest: boolean
    form: FormInstance<PluginExecuteExtraFormValue>
}
const PluginBatchExecuteExtraParams: React.FC<PluginBatchExecuteExtraParamsProps> = React.memo((props) => {
    const {pathRef, proxyRef, isRawHTTPRequest, form} = props
    const handleResetRequest = useMemoizedFn((e) => {
        e.stopPropagation()
        const value = form.getFieldsValue()
        form.setFieldsValue({
            ...value,
            ...cloneDeep(defPluginExecuteFormValue)
        })
    })
    const handleResetTask = useMemoizedFn((e) => {
        e.stopPropagation()
        const value = form.getFieldsValue()
        form.setFieldsValue({
            ...value,
            ...cloneDeep(defPluginExecuteTaskValue)
        })
    })
    /**Reset form values in fixed extra parameters */
    const onReset = useMemoizedFn((restValue) => {
        form.setFieldsValue({...restValue})
    })
    return (
        <YakitCollapse destroyInactivePanel={false} defaultActiveKey={["Request config", "Task Config"]}>
            {!isRawHTTPRequest && (
                <YakitPanel
                    header='Request config'
                    key='Request config'
                    extra={
                        <YakitButton type='text' colors='danger' onClick={handleResetRequest} size='small'>
                            Reset
                        </YakitButton>
                    }
                >
                    <FixExtraParamsNode form={form} pathRef={pathRef} onReset={onReset} />
                </YakitPanel>
            )}
            <YakitPanel
                header='Task Config'
                key='Task Config'
                extra={
                    <YakitButton type='text' colors='danger' onClick={handleResetTask} size='small'>
                        Reset
                    </YakitButton>
                }
            >
                <Form.Item label='Proxy' name='Proxy'>
                    <YakitAutoComplete
                        ref={proxyRef}
                        allowClear
                        placeholder='Please Enter...'
                        cacheHistoryDataKey={PluginGV.LocalBatchExecuteExtraProxy}
                        size='small'
                        isCacheDefaultValue={false}
                    />
                </Form.Item>
                <Form.Item label='Concurrent Processes' name='Concurrent'>
                    <YakitInputNumber type='horizontal' size='small' min={0} precision={0} />
                </Form.Item>
                <Form.Item label='Total Timeout' name='TotalTimeoutSecond'>
                    <YakitInputNumber type='horizontal' size='small' min={0} precision={0} />
                </Form.Item>
            </YakitPanel>
        </YakitCollapse>
    )
})
