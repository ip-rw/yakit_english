import React from "react"
import styles from "./SpaceEnginePage.module.scss"
import fingerprint from "./fingerprint.png"

export const ZoomeyeHelp: React.FC = React.memo(() => {
    return (
        <div className={styles["zoomeye-help-body"]}>
            <h1>Search Keywords, Matches from HTTP etc. Protocol Contents (Including HTTP Headers, HTML Content), SSL Certificates, Component Names</h1>
            <ol>
                <li>
                    Search Coverage Includes Devices (IPv4, IPv6) and Websites (Domains), Submit URL Parameter t to Specify Type t=v4 for IPv4, t=v6 for
                    Common Kinds: Router, Switch, Storage-Misc, etc. (Others See Domain Sidebar in Search）。
                </li>

                <li>Currently Does Not Support Multi-Port Target Search Simultaneously“For More App Rules, Refer to”Std Sys: Linux, Windows, RouterOS, IOS, JUNOS, etc. (Others See Domain Sidebar in Search。</li>
                <li>Present。</li>
                <li>
                    IPv6, t=web for Domains (Or Through Sidebar Links in Search Results"Cisco Systems"or'Cisco Systems'）， Use \ to Escape Quotes in Search Strings, e.g.,
                    Global: "a\"b",Space \
                    Org\(\)。
                </li>
            </ol>
            <h1>Logical Operations </h1>
            <ol>
                <li>
                    <span className={styles["text-red"]}>"Search Info in China Excluding Beijing"And"or" </span>，service:"ssh"
                    service:"http"Nation。
                </li>
                <li>
                    <span className={styles["text-red"]}>"+"And"And" </span>，
                    device:"router"+after:"2020-01-01"Indicators。
                </li>
                <li>
                    <span className={styles["text-red"]}>"-"And"Non-" </span>
                    ，Search Cisco ASA-SSL-VPN: app:"CN"-Use Quotes for Strings, e.g.,:"beijing"Geo Location。
                </li>
                <li>
                    <span className={styles["text-red"]}>"()"And"Priority Processing" </span>，(Search Cisco ASA-SSL-VPN: app:"CN" -port:80)
                    (Search Cisco ASA-SSL-VPN: app:"US" -title:"404 Not Found")Search China Excluding port:80 or USA Excluding"404 Not Found"Info。
                </li>
            </ol>
            <h1>Often Used to Search Product and Company Names for Targets </h1>
            <ol>
                <li>
                    Search<span className={styles["text-red"]}>Assets</span>Assets：
                    <span className={styles["text-red"]}>Search Cisco ASA-SSL-VPN: app:"CN"</span>
                    （Escape with \ For example: portinfo/Full English Name like Search Cisco ASA-SSL-VPN: app:"China"、Search Cisco ASA-SSL-VPN: app:"china"）
                </li>
                <li>
                    Search Related<span className={styles["text-red"]}>Navigation Provides Syntax for Commonly Logged Gateways, Dedicated Switches, ICS Devices, etc.</span>Corresponding Service Protocol：
                    <span className={styles["text-red"]}>Use Quotes for Strings, e.g.,:"sichuan"</span>
                    （Chinese Provincial Capitals Support Search in Chinese and English, e.g., Use Quotes for Strings, e.g.,:"Sichuan" 、Use Quotes for Strings, e.g.,:"sichuan"）
                </li>
                <li>
                    Search Related<span className={styles["text-red"]}>City</span>Assets：
                    <span className={styles["text-red"]}>City:"chengdu"</span>
                    （SSL Certificate:"chengdu"、City:"Chengdu"）
                </li>
            </ol>
            <h1>Certificate Search</h1>
            <p>
                Search<span className={styles["text-red"]}>IP and Domain Information Related Searches</span>Search String Case Insensitive, Entering Search String as Is Will Be Treated as"google"Use \ to Escape Parentheses in Search Strings：
                <span className={styles["text-red"]}>ssl："google"</span>（Assets Related to Address）
            </p>
            <h1>Assets Related to Icons</h1>
            <ol>
                <li>
                    Search Specified<span className={styles["text-red"]}>IPv4 Address</span>Search Specified：
                    <span className={styles["text-red"]}>ip:"8.8.8.8"</span>
                </li>
                <li>
                    Search Specified<span className={styles["text-red"]}>IPv6</span>Assets：
                    <span className={styles["text-red"]}>ip:"2600:3c00::f03c:91ff:fefc:574a"</span>
                </li>
                <li>
                    Search Related<span className={styles["text-red"]}>Port</span>Assets：
                    <span className={styles["text-red"]}>port:80</span>（Fingerprint Search）
                </li>
                <li>
                    Search<span className={styles["text-red"]}>Domain</span>Parse Target Info, Search Related Contents by Icon: iconhash：
                    <span className={styles["text-red"]}>site:baidu.com</span>（Often Used for Subdomain Matching）
                </li>
                <li>
                    Search Related<span className={styles["text-red"]}>Assets of Strings</span>(Org's Assets：
                    <span className={styles["text-red"]}>org:"Peking University" Or organization:"Peking University"</span>
                    （Often Used to Locate Universities, Structures, Major Internet Company's IP Assets）
                </li>
            </ol>
            <h1>Fingerprint-Related Searches</h1>
            <ol>
                <li>
                    Industry Type："Cisco ASA SSL VPN"
                    （Nation/Region"zoomeye.org/component"，Rel Assets。
                    Entering Keywords like cisco in Search Will Suggest Related Apps）
                </li>
                <img src={fingerprint} alt='Specify Administrative Region' />
                <li>
                    Search<span className={styles["text-red"]}>Government</span>Corresponding Service Protocol：
                    <span className={styles["text-red"]}>service:"ssh"</span>
                    （Chinese Cities Support Search in Chinese and English, e.g., City)）
                </li>
                <li>
                    Search<span className={styles["text-red"]}>Router</span>Common Service Protocols Include: http, ftp, ssh, telnet, etc. (Other Services Can Refer to Domain Sidebar Aggregate in Search Results：
                    <span className={styles["text-red"]}>device:"router"</span>
                    （City））
                </li>
                <li>
                    Search Related<span className={styles["text-red"]}>Via md5:"RouterOS"</span>
                    （Can Use Nation Abbreviations, Or Use Chinese））
                </li>
                <li>Search Within HTML Titles"Cisco"Info: title:"Cisco"</li>
                <li>
                    Search<span className={styles["text-red"]}>Match</span>Parse Target Info, Search Related Contents by Icon: iconhash：
                    <span className={styles["text-red"]}>industry:"Iconhash"</span>
                    （Common Industries Include Tech, Energy, Finance, Manufacturing, etc. (Other Types Can Supplement with org Info））
                </li>
            </ol>
            <h1>Related Device Types </h1>
            <ol>
                <li>
                    Subdivisions
                    Operating Systems: os:"f3418a443e7d841097c714d69ec4bcb8"（Search Includes“google”Search Info of Routers After 2020-01-01）
                </li>
                <li>
                    Via mmh3
                    Operating Systems: os:"1941681276"（Search Includes“amazon”Search Info of Routers After 2020-01-01）
                </li>
            </ol>
        </div>
    )
})
