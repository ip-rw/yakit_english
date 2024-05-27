import React, {useEffect, useState} from "react"
import {ResizeBox} from "@/components/ResizeBox"
import {AutoCard} from "@/components/AutoCard"
import {Button, Card, Collapse, Form} from "antd"
import {PaginationSchema} from "@/pages/invoker/schema"
import {MultiSelectForString, SwitchItem} from "@/utils/inputUtil"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {CVETable} from "@/pages/cve/CVETable"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import styles from "./CVETable.module.scss"
import {yakitFailed} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ChevronDownIcon} from "@/assets/newIcon"
import {YakitCheckableTagList} from "@/components/YakitCheckableTagList/YakitCheckableTagList"

const {Panel} = Collapse
export interface QueryCVERequest {
    Pagination?: PaginationSchema
    AccessVector: "NETWORK" | "LOCAL" | "ADJACENT_NETWORK" | "PHYSICAL" | string
    AccessComplexity: "HIGH" | "MEDIUM" | "LOW" | string
    CWE: string
    Year: string
    Severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string
    // Score: number
    Product: string
    // ChineseTranslationFirst: boolean
    Keywords: string
}

export interface CVEViewerProp {}
const {ipcRenderer} = window.require("electron")
export const CVEViewer: React.FC<CVEViewerProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>(defQueryCVERequest)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false) // CVE DB Available
    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("IsCVEDatabaseReady")
            .then((rsp: {Ok: boolean; Reason: string; ShouldUpdate: boolean}) => {
                setAvailable(rsp.Ok)
            })
            .catch((err) => {
                yakitFailed("IsCVEDatabaseReady Failed：" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
    })
    return loading ? (
        <YakitSpin spinning={true} style={{alignItems: "center", paddingTop: 150}} />
    ) : (
        <div className={styles["cve-viewer"]}>
            {available && advancedQuery && (
                <CVEQuery
                    onChange={setParams}
                    defaultParams={params}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                />
            )}
            <CVETable
                filter={params}
                advancedQuery={advancedQuery}
                setAdvancedQuery={setAdvancedQuery}
                available={available}
            />
        </div>
    )
}

interface CVEQueryProp {
    defaultParams?: QueryCVERequest
    onChange?: (req: QueryCVERequest) => any
    advancedQuery: boolean //Advanced Query Enabled
    setAdvancedQuery: (b: boolean) => void
}
export const defQueryCVERequest:QueryCVERequest = {
    AccessComplexity: "",
    AccessVector: "",
    CWE: "",
    Product: "",
    // Score: 6.0,
    Severity: "",
    Year: "",
    // ChineseTranslationFirst: true
    Keywords: ""
}
const CVEQuery: React.FC<CVEQueryProp> = (props) => {
    const {advancedQuery, setAdvancedQuery} = props
    const [params, setParams] = useState<QueryCVERequest>(props.defaultParams || defQueryCVERequest)

    useEffect(() => {
        if (!props.onChange) {
            return
        }
        props.onChange(params)
    }, [params])

    return (
        <div className={styles["cve-query"]}>
            <div className={styles["cve-query-heard"]}>
                <span>Advanced Query</span>
                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
            </div>
            <div className={styles["cve-query-body"]}>
                <div className={styles["cve-query-text"]}>
                    <span>CVE Search Criteria</span>
                    <span
                        className={styles["cve-query-resetting"]}
                        onClick={() => {
                            setParams(defQueryCVERequest)
                        }}
                    >
                        Reset
                    </span>
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>Exploit Path</div>
                    <YakitCheckableTagList
                        data={[
                            {value: "NETWORK", label: "Network"},
                            {value: "ADJACENT_NETWORK", label: "LAN"},
                            {value: "LOCAL", label: "Local"},
                            {value: "PHYSICAL", label: "Physical"}
                        ]}
                        value={params.AccessVector ? params.AccessVector.split(",") : []}
                        setValue={(AccessVector) => setParams({...params, AccessVector: AccessVector.join(",")})}
                    />
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>Exploit Difficulty</div>
                    <YakitCheckableTagList
                        setValue={(AccessComplexity) =>
                            setParams({...params, AccessComplexity: AccessComplexity.join(",")})
                        }
                        value={params.AccessComplexity ? params.AccessComplexity.split(",") : []}
                        data={[
                            {value: "HIGH", label: "Difficult"},
                            {value: "MEDIUM", label: "Normal"},
                            {value: "LOW", label: "Easy"}
                        ]}
                    />
                </div>
                <div className={styles["cve-query-item"]}>
                    <div>Vulnerability Level</div>
                    <YakitCheckableTagList
                        setValue={(Severity) => setParams({...params, Severity: Severity.join(",")})}
                        value={params.Severity ? params.Severity.split(",") : []}
                        data={[
                            {value: "CRITICAL", label: "Severe"},
                            {value: "HIGH", label: "High Risk"},
                            {value: "MEDIUM", label: "Reply Complete"},
                            {value: "LOW", label: "Low Risk"}
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
