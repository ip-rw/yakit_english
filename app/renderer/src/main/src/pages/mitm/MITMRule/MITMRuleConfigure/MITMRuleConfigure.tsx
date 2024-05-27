import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakEditor} from "@/utils/editors"
import {failed, info} from "@/utils/notification"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {Spin} from "antd"
import React, {useEffect, useState} from "react"
import {MITMRuleExportProps, MITMRuleImportProps} from "./MITMRuleConfigureType"
import styles from "./MITMRuleConfigure.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import defaultConfig from "./yakitMitmReplacerRulesConfig.json"

const {ipcRenderer} = window.require("electron")

export const MITMRuleExport: React.FC<MITMRuleExportProps> = (props) => {
    const {visible, setVisible} = props
    const [value, setValue] = useState<Uint8Array>(new Uint8Array())
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        ipcRenderer
            .invoke("ExportMITMReplacerRules", {})
            .then((r: {JsonRaw: Uint8Array}) => {
                setValue(r.JsonRaw)
            })
            .catch((e) => {
                failed(`Export Failed：${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [visible])
    return (
        <YakitModal
            title='Export Config JSON'
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='Save As'
            width={960}
            closable={true}
            onOk={() => {
                saveABSFileToOpen("yakit-mitm-replacer-rules-config.json", value)
            }}
            bodyStyle={{padding: 0}}
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakEditor type={"json"} value={new Buffer(value).toString("utf8")} readOnly={true} />
                </div>
            </Spin>
        </YakitModal>
    )
}

export const MITMRuleImport: React.FC<MITMRuleImportProps> = (props) => {
    const {visible, setVisible, onOk, isUseDefRules} = props
    const [params, setParams] = useState<{JsonRaw: Uint8Array; ReplaceAll: boolean}>({
        JsonRaw: new Uint8Array(),
        ReplaceAll: false
    })
    useEffect(() => {
        if (isUseDefRules) onUseDefaultConfig()
    }, [isUseDefRules])
    const [loading, setLoading] = useState(false)
    const onImport = useMemoizedFn(() => {
        if (!new Buffer(params.JsonRaw).toString("utf8")) {
            failed("Please Enter Data!")
            return
        }
        try {
            let rules = JSON.parse(new Buffer(params.JsonRaw).toString("utf8")).map((item, index) => ({
                ...item,
                Index: index + 1
            }))
            ipcRenderer
                .invoke("ImportMITMReplacerRules", {...params, JsonRaw: Buffer.from(JSON.stringify(rules))})
                .then((e) => {
                    if (onOk) {
                        onOk()
                    } else {
                        setVisible(false)
                    }
                    info("Import Success")
                })
                .catch((e) => {
                    failed("Import Failed:" + e)
                })
        } catch (error) {
            failed("Import Failed:" + error)
        }
    })
    const onUseDefaultConfig = useMemoizedFn(() => {
        const value = Buffer.from(JSON.stringify(defaultConfig.map((item) => ({...item, NoReplace: true}))))
        setLoading(true)
        setParams({ReplaceAll: false, JsonRaw: value})
        setTimeout(() => setLoading(false), 300)
    })
    return (
        <YakitModal
            title='Import from JSON'
            subTitle={
                <div className={styles["modal-subTitle"]}>
                    <span>Copy JSON to Box</span>
                    <YakitButton type='text' onClick={() => onUseDefaultConfig()}>
                        Use Default Config
                    </YakitButton>
                </div>
            }
            visible={visible}
            onCancel={() => setVisible(false)}
            okText='Import'
            width={960}
            closable={true}
            onOk={() => onImport()}
            footerExtra={
                <div className={styles["modal-footer-extra"]}>
                    <span className={styles["modal-footer-extra-text"]}>Overwrite Rules</span>
                    <YakitSwitch
                        onChange={(ReplaceAll) => setParams({...params, ReplaceAll})}
                        checked={params.ReplaceAll}
                    />
                </div>
            }
            bodyStyle={{padding: 0}}
        >
            <Spin spinning={loading}>
                <div style={{height: 466}}>
                    <YakEditor
                        triggerId={loading}
                        type={"json"}
                        value={new Buffer(params.JsonRaw).toString("utf8")}
                        setValue={(e) => {
                            setParams({...params, JsonRaw: Buffer.from(e)})
                        }}
                    />
                </div>
            </Spin>
        </YakitModal>
    )
}
