import {Descriptions, List, Tabs} from "antd"
import {CVEDetail, CWEDetail} from "@/pages/cve/models"
import classNames from "classnames"
import "../main.scss"
import styles from "./CVETable.module.scss"
import {useCreation} from "ahooks"
import moment from "moment"
import React, {ReactNode} from "react"
const {ipcRenderer} = window.require("electron")
const {TabPane} = Tabs

export const CVEDescription = React.memo(
    ({
         CVE,
         DescriptionZh,
         DescriptionOrigin,
         Title,
         Solution,
         AccessVector,
         References,
         AccessComplexity,
         ConfidentialityImpact,
         IntegrityImpact,
         AvailabilityImpact,
         PublishedAt,
         CWE,
         Severity,
         CVSSVectorString,
         BaseCVSSv2Score,
         ExploitabilityScore,
         Product
     }: CVEDetail) => {

        const color = useCreation(() => {
            let text = "success"
            if (Severity === "Severe") {
                text = "serious"
            }
            if (Severity === "High Risk") {
                text = "danger"
            }
            if (Severity === "Reply Complete") {
                text = "warning"
            }
            return text
        }, [BaseCVSSv2Score, Severity, Severity])
        // Exclude FTP ref links eg: CVE-2001-0830
        const references_links = References ? References.split('\n').filter((link) => !link.startsWith('ftp://')) : [];
        const handleClickLink = (link) => {
            ipcRenderer.invoke('open-url', link);
        };
        return (
            <div className={styles["description-content"]}>
                <Descriptions bordered size='small' column={3}>
                    <Descriptions.Item label='CVE ID' span={2} contentStyle={{fontSize: 16, fontWeight: "bold"}}>
                        {CVE || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='Vuln Level' span={1} contentStyle={{minWidth: 110}}>
                        {Severity === "-" ? (
                            "-"
                        ) : (
                            <div
                                className={classNames(
                                    styles["cve-list-product-success"],
                                    styles["cve-description-product-success"],
                                    {
                                        [styles["cve-list-product-warning"]]: color === "warning",
                                        [styles["cve-list-product-danger"]]: color === "danger",
                                        [styles["cve-list-product-serious"]]: color === "serious"
                                    }
                                )}
                            >
                                <div className={classNames(styles["cve-list-severity"])}>{Severity}</div>
                                <span className={classNames(styles["cve-list-baseCVSSv2Score"])}>
                                    {BaseCVSSv2Score}
                                </span>
                            </div>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label='Title' span={2}>
                        {Title || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='Disclosure Time' span={1}>
                        {moment.unix(PublishedAt).format("YYYY/MM/DD")}
                    </Descriptions.Item>
                    <Descriptions.Item label='Vuln Summary' span={3}>
                        {DescriptionZh || DescriptionOrigin || "-"}
                    </Descriptions.Item>

                    <Descriptions.Item label='Exploit Path' span={2}>
                        {AccessVector || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='Exploit Difficulty' span={2}>
                        {AccessComplexity === "-" ? (
                            "-"
                        ) : (
                            <div
                                className={classNames(
                                    styles["cve-list-product-success"],
                                    styles["cve-description-product-success"],
                                    {
                                        [styles["cve-list-product-warning"]]: AccessComplexity === "General",
                                        [styles["cve-list-product-danger"]]: AccessComplexity === "Hard"
                                    }
                                )}
                            >
                                <div className={classNames(styles["cve-list-severity"])}>{AccessComplexity}</div>
                                <span className={classNames(styles["cve-list-baseCVSSv2Score"])}>
                                    {ExploitabilityScore}
                                </span>
                            </div>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label='Affected Products' span={3}>
                        {Product || "-"}
                    </Descriptions.Item>

                    <Descriptions.Item label='Solution' span={3}>
                        {Solution || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='Reference Link' span={3}>
                        {
                            references_links.length > 0 ? (
                                <div>
                                    {references_links.map((link, index) => (
                                        <div key={index}>
                                            <a
                                                href={link}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    handleClickLink(link);
                                                }}
                                                style={{ textDecoration: 'underline', cursor: 'pointer' }}
                                            >
                                                {link}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : '-'
                        }
                    </Descriptions.Item>
                </Descriptions>
                <div className={styles["no-more"]}>No More</div>
            </div>
        )
    }
)

interface CWEDescriptionProps {
    data: CWEDetail[]
    tabBarExtraContent: ReactNode
    onSelectCve: (s: string) => void
}

export const CWEDescription: React.FC<CWEDescriptionProps> = React.memo((props) => {
    const {data, tabBarExtraContent, onSelectCve} = props

    return (
        <>
            <Tabs
                defaultActiveKey={data[0]?.CWE || "-"}
                size='small'
                type='card'
                className={classNames(styles["cwe-tabs"], "main-content-tabs", "yakit-layout-tabs")}
                // className={styles["cwe-tabs"]}
                tabBarExtraContent={tabBarExtraContent}
            >
                {data.map((i: CWEDetail) => (
                    <TabPane tab={i.CWE} key={i.CWE}>
                        <CWEDescriptionItem item={i} onSelectCve={onSelectCve}/>
                        <div className={styles["no-more"]}>No More</div>
                    </TabPane>
                ))}
            </Tabs>
        </>
    )
})

interface CWEDescriptionItemProps {
    item: CWEDetail
    onSelectCve: (s: string) => void
}

export const CWEDescriptionItem: React.FC<CWEDescriptionItemProps> = React.memo((props) => {
    const {item, onSelectCve} = props
    return (
        <Descriptions bordered size='small' column={3}>
            <Descriptions.Item label={"CWE ID"} span={2} contentStyle={{fontSize: 16, fontWeight: "bold"}}>
                {item.CWE || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"CWE Status"} span={1}>
                {item.Status || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"Type"} span={3}>
                {item.NameZh || item.Name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"Description"} span={3}>
                {item.DescriptionZh || item.Description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"Fix Plan"} span={3}>
                {item.Solution || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"Other Cases"} span={3} contentStyle={{paddingBottom: 8}}>
                {item.RelativeCVE.map((c) => (
                    <div key={c} className={styles["cwe-tag"]} onClick={() => onSelectCve(c)}>
                        {c}
                    </div>
                ))}
            </Descriptions.Item>
        </Descriptions>
    )
})
