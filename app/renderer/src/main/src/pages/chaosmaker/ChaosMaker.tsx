import React, {useState} from "react";
import {List, PageHeader, Spin, Table, Tooltip} from "antd";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {AutoCard} from "@/components/AutoCard";
import {ResizeBox} from "@/components/ResizeBox";
import {ChaosMakerRuleTable, QueryChaosMakerRulesRequest} from "@/pages/chaosmaker/ChaosMakerRuleTable";
import {CopyableField} from "@/utils/inputUtil";
import {showDrawer} from "@/utils/showModal";
import {ChaosMakerRuleImport} from "@/pages/chaosmaker/ChaosMakerRuleImport";
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin";

export interface ChaosMakerPageProp {

}

export interface ChaosMakerRuleGroup {
    Title: string
    Description: string
    Keywords: string
    Protocols: string[]
    Solution: string
}

const groups: ChaosMakerRuleGroup[] = [
    {
        "Title": "Attack Struts2",
        "Description": "Security attacks on Java Web applications using the Struts framework can lead to information disclosure, privilege elevation, remote code execution, and more.。",
        "Keywords": "struts",
        "Protocols": [
            "http",
        ],
        "Solution": "To prevent Java Web Struts attacks, ensure Struts framework is up-to-date, follow secure coding practices, validate and filter inputs, and perform regular security audits.。"
    },
    {
        "Title": "Attack SpringCloud",
        "Description": "Security attacks on Java Web applications using the Spring MVC framework can lead to information disclosure, privilege escalation, remote code execution, and more.。",
        "Keywords": "spring",
        "Protocols": [
            "http",
        ],
        "Solution": "To prevent attacks on Java Web Spring MVC framework, ensure timely updates to the Spring MVC framework, adhere to secure coding practices, validate and filter inputs, and conduct regular security audits.。"
    },
    {
        "Title": "ICMP Tunnel Backconnect",
        "Description": "ICMP Tunnel Backconnect is a technique that uses ICMP packets to establish hidden communication channels across networks, allowing attackers to bypass firewalls for remote control and data leakage.。",
        "Keywords": "icmp",
        "Protocols": [
            "icmp"
        ],
        "Solution": "To prevent ICMP Tunnel Backconnect attacks, recommend: 1. Restrict ICMP traffic, monitor and filter inbound and outbound traffic; 2. Deploy firewalls at network peripheries, implement strict security policies; 3. Enhance internal network security, monitor unusual behavior; Regular security audits and penetration tests to check for system vulnerabilities.。"
    },
    {
        "Title": "Mining via DNS)",
        "Description": "Mining via DNS protocol involves attackers injecting malicious mining software into victims' Devices through DNS requests to transfer mining profits to specified servers, potentially causing resource abuse and performance degradation.。",
        "Keywords": "mine",
        "Protocols": [
            "dns"
        ],
        "Solution": "Prevent DNS mining by: 1. Installing and updating security software to detect and remove mining software; 2. Monitoring DNS traffic for abnormal requests and data transfers; 3. Restricting or banning unauthorized device access to the internal network; 4. Enhancing DNS server security, limiting unauthorized resolutions; Regular security audits to check for vulnerabilities.。"
    },
    {
        "Title": "Attack Office Suites",
        "Description": "Attack historical vulnerabilities in common OA systems like Wanhu Ezoffice, Tongda OA, Redflag OA, Weaver e-bridge, FineReport, Weaver e-cology, Weaver e-office, Weaver e-mobile, YonYou NC, etc.",
        "Keywords": "oa",
        "Protocols": [
            "http"
        ],
        "Solution": "Software Upgrade: For known vulnerabilities, collaboration software manufacturers often release patches. Users should upgrade software versions timely to prevent exploitation. Set security policies: Collaboration software typically includes many functions and modules; I'm sorry, but it appears there was a misunderstanding. Could you please provide the non-English text you need translated into English, following the guidelines you'Ve mentioned?.。"
    },
    {
        "Title": "Attack Big Data Platforms",
        "Description": "Attack historical vulnerabilities in big data platforms like Hadoop (HDFS, Hbase, Hive, Zookeeper), Spark, Kafka, Splunk, Apache Dubbo, OpenStack, Apache Flink, Elasticsearch, etc.",
        "Keywords": "hdfs,hbase,hive,zookeeper,spark,kafka,splunk,dubbo,openstack,flink,elasticsearch",
        "Protocols": [],
        "Solution": "For known vulnerabilities, big data platform development teams often release patches. Users should upgrade software versions timely to prevent exploitation. Enable access control: Big data platforms comprise many components and modules; Users should configure access control policies based on needs and security requirements, such as restricting access IPs, authorizing user access, configuring firewalls, etc.。"
    },
    {
        "Title": "Attack Middleware Servers",
        "Description": "Attack historical vulnerabilities in common web servers like IIS, Apache, Nginx, Weblogic, Tomcat, JBoss, etc.",
        "Keywords": "iis,apache,nginx,weblogic,tomcat,jboss",
        "Protocols": [],
        "Solution": "Software Upgrade: For known vulnerabilities, web server development teams usually release patches. Users should upgrade software versions timely to avoid exploitation. Enable security configurations: Web servers offer many configuration options; Users should configure security policies based on needs and security requirements, such as disabling unnecessary services, enabling HTTPS, configuring access control, etc.。"
    },
    {
        "Title": "Attack IoT Devices",
        "Description": "Target historical vulnerabilities in popular IP Cameras such as iCatch, GoAhead, avtech, ACTI Camera, 5MP Network Camera, Hikvision, etc.",
        "Keywords": "camara,ipcamera,icatch,goadhead,avtech,acti,5mp,hikvision,hiwatch,hikvision",
        "Protocols": [],
        "Solution": "Firmware Update: For known vulnerabilities, manufacturers typically release patches for fixes. Deploy devices in internal networks where possible."
    },
    {
        "Title": "Attack Mail Servers",
        "Description": "Attack historical vulnerabilities in mail servers like Exchange, EYou, Coremail, anymacro, Huawei anymail, webmail, Zimbra, etc.",
        "Keywords": "mail,exchange",
        "Protocols": [],
        "Solution": ""
    }
] as ChaosMakerRuleGroup[];

export const ChaosMakerPage: React.FC<ChaosMakerPageProp> = (props) => {
    const [selected, setSelected] = useState<ChaosMakerRuleGroup[]>([]);
    const [loading, setLoading] = useState(false);

    if (loading) {
        return <YakitSpin spinning={loading}>
            <div style={{width: "100%", height: "100%"}}/>
        </YakitSpin>
    }

    return <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100%"}}>
        <PageHeader style={{width: "100%"}} title={"Breach & Attack Simulator Playbook"} subTitle={"Intrusion and Attack Simulation Script Management"}
                    extra={<div>
                        <YakitButton onClick={() => {
                            const d = showDrawer({
                                title: "Import Rules",
                                width: "70%",
                                maskClosable: false,
                                content: (
                                    <ChaosMakerRuleImport/>
                                )
                            })
                        }}>Import Rules</YakitButton>
                    </div>}/>
        <div style={{flex: 1, backgroundColor: "#fff"}}>
            <ResizeBox
                firstMinSize={"400px"}
                firstRatio={"400px"}
                firstNode={
                    <List<ChaosMakerRuleGroup>
                        grid={{column: 2, gutter: 0}}
                        bordered={true}
                        dataSource={groups}
                        style={{borderRadius: "6px", backgroundColor: "#f5f5f5", paddingTop: 20, paddingBottom: 20}}
                        renderItem={(e: ChaosMakerRuleGroup) => {
                            const isSelected = selected.filter(i => i.Title === e.Title).length > 0;
                            return <List.Item style={{marginTop: 8, marginBottom: 8}} key={e.Title}>
                                <AutoCard title={<div style={{color: isSelected ? "#fff" : ""}}>
                                    {e.Title}
                                </div>} size={"small"} hoverable={true} style={{
                                    backgroundColor: isSelected ? "#F28B44" : "#eee",
                                    borderRadius: "6px", color: isSelected ? "#fff" : "",
                                    fontWeight: isSelected ? "bold" : "unset",
                                }} onClick={() => {
                                    if (isSelected) {
                                        setSelected(selected.filter(i => i.Title !== e.Title))
                                        return
                                    }
                                    setSelected([...selected, e])
                                }}>
                                    <div style={{
                                        maxWidth: "100%",
                                        maxHeight: "50px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        lineHeight: "25px"
                                    }}>
                                        <Tooltip title={e.Description}>
                                            {e.Description}
                                        </Tooltip>
                                    </div>
                                </AutoCard>
                            </List.Item>
                        }}
                    >

                    </List>
                }
                secondNode={<ChaosMakerRuleTable groups={selected} onReset={() => {
                    setLoading(true)
                    setTimeout(() => setLoading(false), 500)
                }}/>}
            />
        </div>
    </div>
};