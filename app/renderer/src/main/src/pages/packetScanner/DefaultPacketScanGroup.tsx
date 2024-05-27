import React, {useState} from "react"
import {ByCursorMenuItemProps} from "@/utils/showByCursor"
import {Space} from "antd"
import {execPacketScan, execPacketScanFromRaw} from "@/pages/packetScanner/PacketScanner"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import styles from "./packetScanner.module.scss"

/**
 * @description Default Menu Data for Packet Scanning
 */
export const packetScanDefaultValue: {Verbose: string; Keyword?: string}[] = [
    {Verbose: "Batch Execution", Keyword: undefined},
    {Verbose: "Network Devices & OA Systems", Keyword: "Ruijie,RuoYi,JinHe,JinShan,Kingdee,Zhiyuan,Seeyou,seeyou,Tongda,tonged,Tongda,Yinpeng,Inspur,Weaver,FangWei,FanRuan,Sunflower,ecshop,Dahua,Huawei,Zimbra,Coremail,Coremail,Mail Server"},
    {Verbose: "Security Products", Keyword: "Firewall,Behavior Management,NSFOCUS,Tianqing,tianqing,Data Tampering Prevention,Genians,Cyber Security,Audit Systems,Topssec,Security System"},
    {Verbose: "FastJSON", Keyword: "fastjson,FastJson,FastJSON"},
    {Verbose: "Log4j", Keyword: "Log4j,log4j,Log4shell,log4shell,Log4Shell"},
    {Verbose: "Weblogic", Keyword: "weblogic,Weblogic"},
    {Verbose: "Remote Code Execution (Scan）", Keyword: "RCE,rce"},
    {Verbose: "XSS", Keyword: "xss,XSS"},
    {Verbose: "Java", Keyword: "Java"},
    {Verbose: "Tomcat", Keyword: "Tomcat"},
    {Verbose: "IIS", Keyword: "IIS"},
    {Verbose: "Nginx", Keyword: "Nginx"},
    {Verbose: "Shiro", Keyword: "Shiro"},
    {Verbose: "SQL Injection", Keyword: "SQL Injection"}
]

export const GetPacketScanByCursorMenuItem = (id: number): ByCursorMenuItemProps => {
    return {
        title: "Data Packet Scan",
        onClick: () => {},
        subMenuItems: packetScanDefaultValue.map((i) => {
            return {
                id: i.Keyword,
                title: i.Verbose,
                onClick: () => {
                    execPacketScan({
                        httpFlowIds: [id],
                        value: i,
                        https: false
                    })
                }
            }
        })
    }
}

export interface PacketScanButtonProp {
    packetGetter: () => {https: boolean; httpRequest: Uint8Array}
}

export const PacketScanButton: React.FC<PacketScanButtonProp> = (props) => {
    const [visible, setVisible] = useState<false | undefined>(undefined);
    return (
        <YakitPopover
            key={'Data Packet Scan'}
            title={"Data Packet Scan"}
            trigger={["click"]}
            visible={visible}
            content={
                <Space direction={"vertical"} style={{width: 150}}>
                    {packetScanDefaultValue.map((i,n) => {
                        return (
                            <YakitButton
                                className={styles["yakit-button-theme"]}
                                type='outline2'
                                onClick={() => {
                                    const {https, httpRequest} = props.packetGetter()
                                    setVisible(false)
                                    setTimeout(() => {
                                        setVisible(undefined)
                                    }, 300)
                                    execPacketScanFromRaw(https, httpRequest, i)
                                }}
                                key={`${i.Verbose}+${n}`}
                            >
                                {i.Verbose}
                            </YakitButton>
                        )
                    })}
                </Space>
            }
        >
            <YakitButton size={"small"} type='outline2'>
                Data Packet Scan
            </YakitButton>
        </YakitPopover>
    )
}
