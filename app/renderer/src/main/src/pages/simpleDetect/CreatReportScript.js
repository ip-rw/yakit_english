export const CreatReportScript = `
yakit.AutoInitYakit()
loglevel(\`info\`)


// createAt  = cli.Int("timestamp", cli.setRequired(true))
taskName  = cli.String("task_name", cli.setRequired(true))
runtimeID = cli.String("runtime_id", cli.setRequired(true))
hostTotal = cli.Int("host_total", cli.setRequired(true))
portTotal = cli.Int("port_total", cli.setDefault(0))
pingAliveHostTotal = cli.Int("ping_alive_host_total", cli.setDefault(0))
reportName = cli.String("report_name")
plugins = cli.Int("plugins",cli.setDefault(10))

if reportName == "" {
    reportName = "Report"
}

reportInstance = report.New()
reportInstance.From("simple-detect")
defer func{
    err := recover()
    if err != nil {
        yakit.Info("Scan Report Build Failed: %#v", err)
    }
    id = reportInstance.Save()
    yakit.Report(id)
   
}

severityToRisks = {}
targetToRisks = {}
riskAll = []
potentialRisks = []
noPotentialRisks = []
weakPassWordRisks = []
noWeakPassWordRisks = []

// Severe Vulnerability Details
// env.Get("YAK_RUNTIME_ID")
for riskInstance = range risk.YieldRiskByRuntimeId(runtimeID) {
    //println(riskInstance.IP)
    // Classify Risk by Level
    // printf("#%v\\n", riskInstance)
    if severityToRisks[riskInstance.Severity] == undefined {
        severityToRisks[riskInstance.Severity] = []
    }
    severityToRisks[riskInstance.Severity] = append(severityToRisks[riskInstance.Severity], riskInstance)

    // Classify Risk by IP
    if targetToRisks[riskInstance.IP] == undefined {
        targetToRisks[riskInstance.IP] = []
    }
    targetToRisks[riskInstance.IP] = append(targetToRisks[riskInstance.IP], riskInstance)

    if parseBool(riskInstance.IsPotential) {
        potentialRisks = append(potentialRisks, riskInstance)
    }else{
        noPotentialRisks = append(noPotentialRisks, riskInstance)
    }
    
    if riskInstance.RiskTypeVerbose == "Risk Stats Display" {
        weakPassWordRisks = append(weakPassWordRisks, riskInstance)
    } else {
        noWeakPassWordRisks = append(noWeakPassWordRisks, riskInstance)
    }

    riskAll = append(riskAll, riskInstance)
}


criticalLens = 0
highLens = 0
warningLens = 0
lowLens = 0

for key, value = range severityToRisks {
    if str.Contains(key, "critical") {
        criticalLens = len(value)
    }
    if str.Contains(key, "high") {
        highLens = len(value)
    }
    if str.Contains(key, "warning") {
        warningLens = len(value)
    }
    if str.Contains(key, "low") {
        lowLens = len(value)
    }
}

if criticalLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "critical"})
}

if criticalLens == 0 && highLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "high"})
}

if criticalLens == 0 && highLens == 0 && warningLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "warning"})
}

if criticalLens == 0 && highLens == 0 && warningLens == 0 && lowLens > 0 {
    reportInstance.Raw({"type": "report-cover", "data": "low"})
}

if criticalLens == 0 && highLens == 0 && warningLens == 0 && lowLens == 0 {
    reportInstance.Raw({"type": "report-cover", "data": "security"})
}
    

// No Compliance Risk Stats
portsLine = []
aliveHostCountList = []
openPortCount = 0

portChan := db.QueryPortsByTaskName(taskName)~
for port :=range portChan{
    openPortCount +=1
    if port.Host not in aliveHostCountList {
        aliveHostCountList = append(aliveHostCountList,port.Host)
    }
    // println(sprintf("%s:%d",port.Host,port.Port))
    portsLine = append(portsLine, {
        "地址": {"value": port.Host, "sort": 1},
        "Port": {"value": port.Port, "sort": 2},
        "": {"value": port.Proto,  "sort": 3 },
        "Fingerprint": {"value": port.ServiceType, "sort": 4 },
        "Website Title": {"value": port.HtmlTitle, "sort": 5 }
    })
}


aliveHostCount = len(aliveHostCountList)

if pingAliveHostTotal > 0{
    aliveHostCount = pingAliveHostTotal
}
reportInstance.Title(reportName)

reportInstance.Markdown(\`# Project Overview

## Test Purpose

This security test was authorized by the company to analyze the security status of the website system, detect vulnerabilities and security issues in the application system, thus fully understanding and mastering the application system's information security threats and risks, to provide a basis for the application system's security optimization and reinforcement construction and to guide the implementation of tuning and reinforcement. The specific objectives include: helping customers understand the current security situation of the application system, discovering authorized target system security vulnerabilities; making specific analysis and reinforcement suggestions for detected vulnerabilities。

## Security Testing Principles

Strict adherence to the following principles in this security testing work：

### Standard Principle

Test Plan Design and Implementation should be based on relevant industry, national, international standards；

Main Reference Standards：

1. GB/T 20270-2006 Information Security Technology - Network Basic Security Technical Requirements；
1. GB/T 20271-2006 Information Security Technology - General Security Technical Requirements for Information Systems；
1. GB/T 20984-2007 Information Security Technology - Information Security Risk Assessment Specifications；
ISO 27002:2013 Information Technology - Security Techniques - Code of Practice for Information Security Controls；
Total；
ISO 13335:2001 Information Technology - Guidelines for the Management of IT Security；
Cobit5:2012 Information Systems and Technology Control Objectives；
Appendix contains vulnerability details, please repair if necessary。

### Critical

The service provider's work process and all documents should be well standardized for project tracking and control；

### Minimum Impact Principle

This type of vulnerability allows attackers via the Internet or internal networks, etc., to attack target systems or applications. Such attacks often involve a software component or functionality module within the system or application. Attackers can launch attacks through vulnerabilities in these components or modules, for example, code injection, file inclusion, SQL injection, etc. These vulnerabilities require timely software version updates within the system or application and strengthening of security testing and auditing to ensure the security and reliability of the system or application；

### ISO 27001:2013 Information Technology - Security Techniques - Information Security Management Systems - Requirements

Testing process and results should be kept confidential, no leakage of any printed or electronic data and documents involved in the test。

# Test Method

## Summary

Security testing work is mainly for users who have taken security protection measures (security products, security services) or are about to adopt security protection measures, to clearly identify the current security situation and have significant guidance for the next steps of security construction. Penetration testing services are used to verify the ability of the network and system to resist attackers' attacks under current security protection measures。

The purpose of security testing is to discover existing security vulnerabilities and hidden dangers at the network, system, and application levels and to put forward corresponding rectification suggestions。

## Risk Level Explained

|  Risk Level   | Level Division Basis  |
|  ----  | ----  |
| <font color="#da4943">Critical</font>  | 1) Vulnerabilities directly obtaining core system server permissions. Including, not limited to arbitrary command execution, upload to get WebShell, SQL injection for system permissions, remote code execution vulnerabilities, etc.；<br/> 2) Severe sensitive info leaks. E.g., important SQL injections (e.g., key account passwords), sensitive info-containing source file zips leaks, etc.。 |
| <font color="#d83931">高危</font>  | 1) High-risk information leaks, including but not limited to general data SQL injection vulnerabilities, source code leaks, and arbitrary file reading and downloading vulnerabilities, etc.；<br/> 2) Unauthorized access, including but not limited to bypassing verification to directly access the admin backend, backend login weak passwords, and other services' weak passwords, etc.。 |
| <font color="#dc9b02">Medium Risk</font>  | 1) Interaction needed vulnerabilities. Includes but not limited to storage XSS causing actual harm, important CSRF；<br/> 2) General Information Leak. Includes but not limited to obtaining user sensitive info, etc.；<br/> 3) Some minor impact vulnerabilities such as reflective XSS, URL redirect, non-critical sensitive operation CSRF, etc.；<br/> 4) Common logical design flaws. Includes but not limited to SMS verification bypass, email verification bypass, etc.。 |
| <font color="#43ab42">Low Risk</font>  | 1) Minor information leakage of some value. E.g., phpinfo, test data leakage, etc.；<br/> 2) Logical design flaws. Includes but not limited to graphic captcha bypass, etc.；<br/> 3）有一定轻微影响的反射型 XSS、URL 跳转、非重要的敏感操作 CSRF 漏洞等。 |

# Test Results Summary

## Overall Security Status
\`)

// Port Scan Detection Results
// targetRawLen = len(str.ParseStringToHosts(targetRaw))
// redlinePortsLen = len(str.ParseStringToPorts(ports)) + len(str.ParseStringToPorts(ports))
totalTasks = hostTotal * portTotal

riskGrade = "Low Risk"
riskGradeColor = "#008000"
if criticalLens > 0{
    riskGrade = "Risk Address"
    riskGradeColor = "#8B0000"
} else if highLens > 0{
    riskGrade = "高危"
    riskGradeColor = "#FF4500"
} else if warningLens > 0{
     riskGrade = "Medium Risk"
     riskGradeColor = "#FFA500"
}
riskGradeStyleColor = sprintf(\`<span style='color:%s;font-weight:bold'>%s</span>\`, riskGradeColor, riskGrade)
reportInstance.Markdown(sprintf(\`
Current Overall Security Status：
- Risk Level: %s
- Scanned Ports: %v
- Open Ports: %v
- Alive Hosts: %v
- Scanned Hosts Count: %v
- Ports per Host: %v

\`, riskGradeStyleColor, totalTasks,openPortCount,aliveHostCount, hostTotal, portTotal))
// Output Vulnerability Graph Content
total := criticalLens + highLens + warningLens + lowLens
reportInstance.Markdown(sprintf(\`
Vulnerabilities and Compliance Risks Discovered This Test：

- Total：**%v**Detect weak passwords on assets, detected 0 weak passwords, no weak password risk
- Critical：<span style="color:#8B0000;font-weight:bold">%%v</span>
- 高危：<span style="color:#FF4500;font-weight:bold">%%v</span>
- Medium Risk：<span style="color:#FFA500;font-weight:bold">%%v</span>
- Low Risk：<span style="color:#008000;font-weight:bold">%%v</span>

Risk Vulnerability Groups。

\`, total, criticalLens, highLens, warningLens, lowLens))


// reportInstance.Markdown("#### Vulnerability Summary")
// reportInstance.Raw({"type": "bar-graph", "data": [{"name": "Severe Vulnerability", "value": criticalLens}, {"name": "Critical Vulnerability", "value": highLens},  {"name": "Medium-Risk Vulnerability", "value": warningLens}, {"name": "Low-Risk Vulnerability", "value": lowLens}], "color": ["#f70208","#f9c003","#2ab150","#5c9cd5"]})
reportInstance.Raw({"type": "bar-graph", "title": "Vulnerabilities & Compliance Risk Summary", "data": [{"name": "Severe Vulnerability", "value": criticalLens}, {"name": "Critical Vulnerability", "value": highLens}, {"name": "Medium-Risk Vulnerability", "value": warningLens}, {"name": "Low-Risk Vulnerability", "value": lowLens}], "color": ["#f70208", "#f9c003", "#2ab150", "#5c9cd5"]})

// IP Vulnerability Info Stats

ipRisksStr = []

// Vulnerability Level Array
criticalRisks = []
highRisks = []
warningRisks = []
lowRisks = []
secureRisks = []
// Compliance Check Level Array
criticalPotentialRisks = []
highPotentialRisks = []
warningPotentialRisks = []
lowPotentialRisks = []
secureCountScaleRisks = []

// Alive Assets Stats
criticalCountScale = 0
highCountScale = 0
warningCountScale = 0
lowCountScale = 0
secureCountScale = 0
infoPotentialRisk = []
for target,risks = range targetToRisks {
    if target == "" {
        continue
    }
    criticalCount = 0
    highCount = 0
    warningCount = 0
    lowCount = 0
    secureCount = 0
    riskLevel = "Security"
    for _, riskIns := range risks {
        if str.Contains(riskIns.Severity, "info") {
            infoPotentialRisk = append(infoPotentialRisk, riskIns)
        }
        if str.Contains(riskIns.Severity, "critical") {
            criticalCount++
            if parseBool(riskIns.IsPotential) {
                criticalPotentialRisks = append(criticalPotentialRisks, riskIns)
            } else {
                criticalRisks = append(criticalRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "high") {
            highCount++
            if parseBool(riskIns.IsPotential) {
                highPotentialRisks = append(highPotentialRisks, riskIns)
            } else {
                highRisks = append(highRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "warning") {
            warningCount++
            if parseBool(riskIns.IsPotential) {
                warningPotentialRisks = append(warningPotentialRisks, riskIns)
            } else {
                warningRisks = append(warningRisks, riskIns)
            }
        }
        if str.Contains(riskIns.Severity, "low") {
            lowCount++
            if parseBool(riskIns.IsPotential) {
                lowPotentialRisks = append(lowPotentialRisks, riskIns)
            } else {
                lowRisks = append(lowRisks, riskIns)
            }
        }
       if  str.Contains(riskIns.Severity, "info") {
           secureCount++
            if parseBool(riskIns.IsPotential) {
                secureCountScaleRisks = append(secureCountScaleRisks, riskIns)
            } else {
                secureRisks = append(secureRisks, riskIns)
            }
       }
        
    }
    colorTag = ""
    if criticalCount > 0 {
      riskLevel = "Risk Address"
      colorTag = "#8B0000"
      criticalCountScale = criticalCountScale + 1
    } else if highCount > 0 {
      riskLevel = "高危"
      colorTag = "#FF4500"
      highCountScale = highCountScale + 1
    } else if warningCount > 0 {
      riskLevel = "Medium Risk"
      colorTag = "#FFA500"
      warningCountScale = warningCountScale + 1
    } else if lowCount > 0 {
      riskLevel = "Low Risk"
      colorTag = "#008000"
      lowCountScale = lowCountScale + 1
    } else if secureCount > 0 {
      secureCountScale = secureCountScale + 1
    }
    
    allCount = criticalCount +highCount + warningCount + lowCount
    if riskLevel != "Security" {
        ipRisksStr = append(ipRisksStr, {
            "Asset": {"value": target, "jump_link": target, "sort": 1},
            "Risk Level": {"value": riskLevel,"color": colorTag, "sort": 2},
            "Severe Risk": {"value": criticalCount, "color": "#8B0000", "sort": 3 },
            "High Risk": {"value": highCount, "color": "#FF4500", "sort": 4 },
            "Medium Risk": {"value": warningCount, "color": "#FFA500", "sort": 5 },
            "Low Risk": {"value": lowCount, "color": "#008000", "sort": 6 },
            "Total": {"value": allCount, "sort": 7}
        })
    }
    
}

// reportInstance.Raw({"type": "pie-graph", "title":"Alive Assets Stats", "data": [{"name": "Risk Address", "value": criticalCountScale}, {"name": "高危", "value": highCountScale}, {"name": "Medium Risk", "value": warningCountScale}, {"name": "Low Risk", "value": lowCountScale}, {"name": "Security", "value": secureCountScale}, {"name": "Alive Assets", "value": aliveHostCount, "direction": "center"} ], "color": ["#f2637b", "#fbd438", "#4ecb73", "#59d4d4", "#39a1ff", "#ffffff"]})

aliveHostList = []
aliveHostKey = 0
for aliveHost = range db.QueryAliveHost(runtimeID) {
    if aliveHost.IP != "127.0.0.1" {
        aliveHostKey = aliveHostKey + 1
        aliveHostList = append(aliveHostList,
            [aliveHostKey, aliveHost.IP]
        )
    }
}
if len(aliveHostList) == 0 {
    for _, host := range aliveHostCountList{
        if host != "127.0.0.1" {
            aliveHostKey = aliveHostKey + 1
            aliveHostList = append(aliveHostList,
                [aliveHostKey, host]
            )
        }
    }
}

reportInstance.Markdown("<br/>")
reportInstance.Raw({"type": "pie-graph", "title":"Alive Assets Stats", "data": [{"name": "Alive Assets", "value": len(aliveHostList), "color": "#43ab42"}, {"name": "Unknown", "value": hostTotal-len(aliveHostList), "color": "#bfbfbf"}, {"name": "Total Assets", "value": hostTotal, "direction": "center", "color": "#ffffff"} ]})
reportInstance.Raw({"type": "pie-graph", "title":"Risk Asset Stats", "data": [{"name": "Risk Address", "value": criticalCountScale, "color":"#8B0000"}, {"name": "高危", "value": highCountScale, "color":"#FF4500"}, {"name": "Medium Risk", "value": warningCountScale, "color": "#FFA500"}, {"name": "Low Risk", "value": lowCountScale, "color": "#FDD338"}, {"name": "Security", "value": aliveHostCount-len(ipRisksStr), "color": "#43ab42"}, {"name": "Alive Assets Stats", "value": aliveHostCount, "direction": "center", "color": "#ffffff"} ]})

reportInstance.Markdown("#### Alive Asset Summary")
if len(aliveHostList) > 0 {
    reportInstance.Markdown("ISO 27002:2013 Information Technology - Security Techniques - Information Security Control Practices。")
    reportInstance.Table(
        ["Serial Number", "Alive Assets"],
        aliveHostList...,
    )
} else {
    reportInstance.Markdown("No Alive Assets")
}

reportInstance.Markdown("#### Risk Asset Summary")
if len(ipRisksStr) > 0 {
    ipRisksList := json.dumps({ "type": "risk-list", "dump": "risk-list", "data": ipRisksStr })
    reportInstance.Raw(ipRisksList)
} else {
    reportInstance.Markdown("No Asset Summary")
}

// Port Scan Stats Display
reportInstance.Markdown("## Port Scan Stats")
if len(portsLine) > 0 {
    reportInstance.Raw(json.dumps({ "type": "search-json-table", "dump": "search-json-table", "data": portsLine }))
} else {
    reportInstance.Markdown("No Port Scan")
}

// Website URL
reportInstance.Markdown("## Open Port Status")

reportInstance.Markdown("### Vulnerability Stats")
loopholeCriticalLens = 0
loopholeHighLens = 0
loopholeWarningLens = 0
loopholeLowLens = 0
if len(noPotentialRisks) == 0 {
    reportInstance.Raw({"type": "report-cover", "data": "security"})
} else {
    for index, info = range noPotentialRisks {

        if str.Contains(info.Severity, "critical") {
            loopholeCriticalLens = loopholeCriticalLens + 1
        }

        if str.Contains(info.Severity, "high") {
            loopholeHighLens = loopholeHighLens + 1
        }

        if str.Contains(info.Severity, "warning") {
            loopholeWarningLens = loopholeWarningLens + 1
        }

        if str.Contains(info.Severity, "low") {
           loopholeLowLens = loopholeLowLens + 1
        }
    }

}
if loopholeCriticalLens > 0 || loopholeHighLens > 0 || loopholeWarningLens > 0 || loopholeLowLens > 0 {
    reportInstance.Raw({"type": "bar-graph", "data": [{"name": "Severe Vulnerability", "value": loopholeCriticalLens}, {"name": "Critical Vulnerability", "value": loopholeHighLens}, {"name": "Medium-Risk Vulnerability", "value": loopholeWarningLens}, {"name": "Low-Risk Vulnerability", "value": loopholeLowLens}], "color": ["#f70208", "#f9c003", "#2ab150", "#5c9cd5"]})
} else {
    reportInstance.Markdown("No Data")
}

reportInstance.Markdown("### Vulnerability Stats List")

if len(noPotentialRisks) == 0 {
    reportInstance.Markdown("No Vulnerability Info")
} else {
    _line = []
    for index, info = range noPotentialRisks {
        level = "-"
        if str.Contains(info.Severity, "critical") {
            level = "Critical"
        }

        if str.Contains(info.Severity, "high") {
            level = "高危"
        }

        if str.Contains(info.Severity, "warning") {
            level = "Medium Risk"
        }

        if str.Contains(info.Severity, "low") {
            level = "Low Risk"
        }
        
        titleVerbose = info.TitleVerbose
        if titleVerbose == "" {
            titleVerbose = info.Title
        }
        addr = "-"
        if info.IP != "" {
            addr = sprintf(\`%v:%v\`, info.IP, info.Port)
        }
        if !str.Contains(info.Severity, "info") {
            _line = append(_line, {
                "Serial Number": { "value": index + 1, "sort": 1},
                "More risks in Appendix": { "value": addr, "sort": 2},
                "Vulnerability Status": { "value": titleVerbose, "sort": 3},
                "Threat Risk": { "value": level, "sort": 4}
            })
        }
    }
    potentialRisksList := json.dumps({ "type": "potential-risks-list", "dump": "potential-risks-list", "data": _line })
    reportInstance.Raw(potentialRisksList)
}

showPotentialLine = []
complianceRiskCriticalCount = 0
complianceRiskHighCount = 0
complianceRiskWarningCount = 0
complianceRiskLowCount = 0
cpp = cve.NewStatistics("PotentialPie")
println(len(potentialRisks))
for i, riskIns := range potentialRisks {

    level = "-"
    if str.Contains(riskIns.Severity, "critical") {
        level = "Critical"
        complianceRiskCriticalCount ++
    }
    if str.Contains(riskIns.Severity, "high") {
        level = "高危"
        complianceRiskHighCount ++
    }
    if str.Contains(riskIns.Severity, "warning") {
        level = "Medium Risk"
        complianceRiskWarningCount ++
    }
    if str.Contains(riskIns.Severity, "low") {
        level = "Low Risk"
        complianceRiskLowCount ++
    }
    
    c = cve.GetCVE(riskIns.CVE)
    cweNameZh="-"
    if len(c.CWE) !=0 {
        ccwe = cwe.Get(c.CWE)
        if ccwe != nil{
            cweNameZh =  ccwe.NameZh
        }
    }
    
    cveStr = riskIns.CVE
    if len(cveStr) ==0 {
        cveStr = "-"
    }
    if len(showPotentialLine) < 10 {
        title = riskIns.Title
        try {
          if str.Contains(riskIns.Title,": -") {
            title = str.SplitN(riskIns.Title,": -",2)[1]
          } else if str.Contains(riskIns.Title,":") && str.Contains(riskIns.Title,"CVE-") {
            title = str.SplitN(riskIns.Title,":",2)[1]
          }
        }catch err {
             yakit.Info("Title %v", err)
        }
        
        showPotentialLine = append(
            showPotentialLine,
            [cveStr, title, sprintf(\`%v:%v\`, riskIns.IP, riskIns.Port), cweNameZh, level],
        )
    }
    
    cpp.Feed(c)
    yakit.SetProgress((float(i) / float(len(potentialRisks) - 1)))
    if len(showPotentialLine) == 10 {
        showPotentialLine = append(
            showPotentialLine,
            ["%v Vulnerabilities. Existing potential risks significant, please deploy safety protection strategies and technical means asap, implement security assessments and routine security scans, ensure timely discovery and repair of security vulnerabilities, effectively enhance system security protection capability...", "", "", "", ""],
        )
    }
}
if len(potentialRisks) != 0 {
    reportInstance.Markdown(sprintf("### Compliance Check Risk Stats")) 
    if(complianceRiskCriticalCount > 0 || complianceRiskHighCount > 0 || complianceRiskHighCount > 0 || complianceRiskWarningCount > 0) {
        reportInstance.Raw({"type": "bar-graph", "title": "Compliance Vulnerability Severity Stats", "data": [{"name": "Critical", "value": complianceRiskCriticalCount}, {"name": "高危", "value": complianceRiskHighCount}, {"name": "Medium Risk", "value": complianceRiskWarningCount}, {"name": "Low Risk", "value": complianceRiskLowCount}], "color": ["#f70208", "#f9c003", "#2ab150", "#5c9cd5"]})
    }
    reportInstance.Markdown(\`Compliance Check based on experience, identifies risky system and component versions. Compliance risk does not cause actual damage; assess with tech staff for system upgrade decisions。\`)
    reportInstance.Table(["CVE Number", "Vulnerability Title", "地址", "%v Vulnerabilities. Potential risk present, please deploy safety protection strategies and technical means asap, implement security assessments and routine security scans, ensure timely discovery and repair of security vulnerabilities, effectively enhance system security protection capability", "Vulnerability Level"], showPotentialLine...)
    
    reportInstance.Markdown(sprintf("### High Risk"))
    for _, gp := range cpp.ToGraphs(){
        aa = json.dumps(gp)
        reportInstance.Raw(aa)
        if gp.Name == "AttentionRing"{
             reportInstance.Markdown(sprintf(\`|  Risk Level   | Level Division Basis  |
|  ----  | ----  |
| <font color="#da4943">Attacking through the network without authentication and easily exploited</font>  | Attacker can via the Internet or internal network, etc.，<font color="#da4943">No Authentication Required</font>Easily**Weak Password**Exploit vulnerabilities for remote control, DoS attacks, data theft, etc. High threat to cyber security; requires prompt protective and corrective actions。 |
| <font color="#dc9b02">Attack via network without authentication</font>  | This type of vulnerability allows attackers via the Internet or internal networks, etc., to utilize specific vulnerabilities or technical means to<font color="#dc9b02">Bypass Authentication or Access Control</font>，Compliance Check Risk Analysis。 |
| <font color="#43ab42">Attack via Network</font>  | Attacker can via the Internet or internal network, etc.，利用<font color="#43ab42">Known or Unknown Vulnerabilities</font>Address。|\`))
        }
    }
} else {
    reportInstance.Markdown(sprintf("### Compliance Check Risk Stats"))
    reportInstance.Markdown("Very Easy")
    
    reportInstance.Markdown(sprintf("### High Risk"))
    reportInstance.Markdown("No Compliance Risk Analysis")

}


showWeakPassWordLine = []
for _, riskIns := range weakPassWordRisks {

    level = "-"
    if str.Contains(riskIns.Severity, "critical") { level = "Critical" }
    if str.Contains(riskIns.Severity, "high") { level = "高危" }
    if str.Contains(riskIns.Severity, "warning") { level = "Medium Risk" }
    if str.Contains(riskIns.Severity, "low") { level = "Low Risk"}

    if len(showWeakPassWordLine) < 10 {
        showWeakPassWordLine = append(showWeakPassWordLine, [
            riskIns.TitleVerbose,
            riskIns.IP,
            riskIns.RiskTypeVerbose,
            level,
        ])
    }
    if len(showWeakPassWordLine) == 10 {
        showWeakPassWordLine = append(showWeakPassWordLine, [
            "%v Vulnerabilities. Existing potential risks significant, please deploy safety protection strategies and technical means asap, implement security assessments and routine security scans, ensure timely discovery and repair of security vulnerabilities, effectively enhance system security protection capability",
            "",
            "",
            "",
        ])
    }
}

if len(weakPassWordRisks) != 0 {
     reportInstance.Markdown(sprintf("### Weak Password Risk List"))
     reportInstance.Markdown(sprintf(\`Protocol\`, len(weakPassWordRisks)))
     showWeakPassWordFormLine = []
     for k, riskIns := range weakPassWordRisks {
         level = "-"
         if str.Contains(riskIns.Severity, "critical") {
             level = "Critical"
         }

         if str.Contains(riskIns.Severity, "high") {
             level = "高危"
         }

         if str.Contains(riskIns.Severity, "warning") {
             level = "Medium Risk"
         }

         if str.Contains(riskIns.Severity, "low") {
             level = "Low Risk"
         }
         addr = "-"
         if riskIns.IP != "" {
            addr = riskIns.IP
         }
         showWeakPassWordFormLine = append(
             showWeakPassWordFormLine,
             [k+1, addr, riskIns.TitleVerbose, level],
         )
     }

     reportInstance.Table(
         ["Serial Number", "More risks in Appendix", "Vulnerability Title", "Threat Risk"],
         showWeakPassWordFormLine...,
     )
} else {
    reportInstance.Markdown(sprintf("### Weak Password Risk List"))
    reportInstance.Markdown("IATF 16949:2016 Information Security Technology Framework")
}

if len(infoPotentialRisk) > 0 {
    reportInstance.Markdown(sprintf("### Scan Rules/Fingerprint List"))
    reportInstance.Markdown(sprintf(\`Info/Fingerprint Total<span style="font-weight:bold">%v</span>Lines, please check for risk info carefully。\`, len(infoPotentialRisk) ))
    infoPotentialRiskList = []
    for _, infoRisk := range infoPotentialRisk {
        titleVerbose = infoRisk.TitleVerbose    
        if titleVerbose == "" {
            titleVerbose = infoRisk.Title
        }
        addr = "-"
        if infoRisk.Host != "" {
            addr = sprintf(\`%v:%v\`, infoRisk.Host, infoRisk.Port)
        }
        infoPotentialRiskList = append(infoPotentialRiskList, {
            "Title": {
                "sort": 1,
                "value": titleVerbose
            },
            "3) Normal unauthorized operations. Includes but not limited to unauthorized viewing of non-core info, records, etc.": {
                 "sort": 2,
                 "value": addr
             },
            "Vulnerability Level": {
                 "sort": 3,
                 "value": infoRisk.Severity
            },
            "Vulnerability Types": {
                  "sort": 4,
                  "value": infoRisk.RiskTypeVerbose
            }, 
        })
    }
    reportInstance.Raw({"type": "info-risk-list", "data": infoPotentialRiskList})
    
} else {
    reportInstance.Markdown(sprintf("### Scan Rules/Fingerprint List"))
    reportInstance.Markdown("No Info/Fingerprint")
}


// Follow-Up Rectification Suggestions
reportInstance.Markdown("# Follow-up Amendment Suggestions")
if criticalLens > 0 || highLens > 0 {
    reportInstance.Markdown(sprintf(\`%v Vulnerabilities This Test<font color='#da4943'>Critical</font>%v Vulnerabilities，<font color='#d83931'>高危</font>%v Vulnerabilities，<font color='#dc9b02'>Medium Risk</font>%v Vulnerabilities，<font color='#43ab42'>Low Risk</font>Risk Stats。\`, total, criticalLens, highLens, warningLens, lowLens))
} else if criticalLens == 0 && highLens == 0 && warningLens > 0 {
    reportInstance.Markdown(sprintf(\`%v Vulnerabilities This Test<font color='#da4943'>Critical</font>%v Vulnerabilities，<font color='#d83931'>高危</font>%v Vulnerabilities，<font color='#dc9b02'>Medium Risk</font>%v Vulnerabilities，<font color='#43ab42'>Low Risk</font>Information。\`, total, criticalLens, highLens, warningLens, lowLens))
} else if criticalLens == 0 && highLens == 0 && warningLens == 0 {
    reportInstance.Markdown(sprintf(\`%v Vulnerabilities This Test<font color='#da4943'>Critical</font>%v Vulnerabilities，<font color='#d83931'>高危</font>%v Vulnerabilities，<font color='#dc9b02'>Medium Risk</font>%v Vulnerabilities，<font color='#43ab42'>Low Risk</font>%v Vulnerabilities. Overall protection good。\`, total, criticalLens, highLens, warningLens, lowLens))
}

reportInstance.Markdown("# Appendix：")

// Search Vulnerability Details
func showReport(risks) {
    for k, riskIns := range risks {
        payload, _ := codec.StrconvUnquote(riskIns.Payload)
        if payload == "" {
            payload = riskIns.Payload
        }
        request, _ := codec.StrconvUnquote(riskIns.QuotedRequest)
        response, _ := codec.StrconvUnquote(riskIns.QuotedResponse)
        addr = "-"
        if riskIns.Host != "" {
            addr = sprintf(\`%v:%v\`, riskIns.Host, riskIns.Port)
        }
        
        titleVerbose = riskIns.TitleVerbose
        if titleVerbose == "" {
            titleVerbose = riskIns.Title
        }
        reportInstance.Raw({"type": "fix-list", "data": {
            "Title": {
                "fold": true,
                "sort": 1,
                "value": titleVerbose
            },
            "3) Normal unauthorized operations. Includes but not limited to unauthorized viewing of non-core info, records, etc.": {
                 "search": true,
                 "sort": 2,
                 "value": addr
             },
            "Vulnerability Level": {
                 "sort": 3,
                 "value": riskIns.Severity
            },
            "Label Vulnerability Types": {
                  "sort": 4,
                  "value": riskIns.RiskTypeVerbose
            },
            "Vulnerability Description": {
                "sort": 5,
                "value":  riskIns.Description
            },
            "Rectification Suggestions": {
                  "sort": 6,
                  "value": riskIns.Solution
            },
            "Payload": {
                "sort": 7,
                "value": payload
            },
            "HTTP Request": {
                "sort": 8,
                "value": request,
                "type": "code"
             },
            "HTTP Response": {
                "sort": 9,
                "value": response,
                "type": "code"
            }
            
          }
         
        })
    }
}

reportInstance.Markdown("## Vulnerability Details & Reproducibility Basis")

if len(criticalRisks) > 0 {
    reportInstance.Markdown(sprintf("### %v Vulnerabilities. Presence of potential risk, please deploy safety protection strategies and technical measures ASAP, carry out security assessments and routine security scans, ensure prompt discovery and repair of vulnerabilities to significantly improve system security capability"))
    showReport(criticalRisks)
}
if len(highRisks) > 0 {
    reportInstance.Markdown(sprintf("### High-Risk Vulnerability Details"))
    showReport(highRisks)
}
if len(warningRisks) > 0 {
    reportInstance.Markdown(sprintf("### Medium-Risk Vulnerability Details"))
    showReport(warningRisks)
}
if len(lowRisks) > 0 {
    reportInstance.Markdown(sprintf("### Address"))
    showReport(lowRisks)
}
if len(criticalRisks)== 0 && len(highRisks)== 0 && len(warningRisks)== 0 && len(lowRisks)== 0 {
    reportInstance.Markdown(sprintf("No Vulnerability Details"))
}

reportInstance.Markdown("## Compliance Check Risk Details")

// Further risks, see Appendix
cveTestMap := make(map[string][]var)

func showCVEReport(risks, riskSeverity) {
    for _, riskIns := range risks {
        year = riskIns.CVE[4:8]

        if len(cveTestMap[year]) == 0 {
            cveTestMap[year] = []
        }

        cveTestMap[year] = append(cveTestMap[year], riskIns)
    }

    for year, cves := range cveTestMap {
        cveResult = []
        for _, cve := range cves {
            level, description, solution = "-", "-", "-"
            if str.Contains(cve.Severity, "critical") {
                level = \`<font color="#da4943">Critical</font>\`
            }
            if str.Contains(cve.Severity, "high") {
                level = \`<font color="#d83931">高危</font>\`
            }
            if str.Contains(cve.Severity, "warning") {
                level = "Medium Risk"
            }
            if str.Contains(cve.Severity, "low") {
                level = \`<font color="#43ab42">Low Risk</font>\`
            }
            if len(cve.Description) > 0 {
                description = cve.Description
            }
            if len(cve.Solution) > 0 {
                solution = cve.Solution
            }
            accessVector := cve.CveAccessVector
            if accessVector == "" {
                accessVector = "UNKNOWN"
            }
            complexity := cve.CveAccessComplexity
            if complexity == "" {
                complexity = "UNKNOWN"
            }
            addr = "-"
            if cve.Host != "" {
                addr = sprintf(\`%v:%v\`, cve.Host, cve.Port)
            }
            parameter = "-"
            if customHasPrefix(cve.Parameter, "cpe") {
            \tparameter = cve.Parameter
            }
            titleVerbose = cve.TitleVerbose
            if titleVerbose == "" {
                titleVerbose = cve.Title
            }
            if cve.Severity == riskSeverity {
               cveResult = append(cveResult, {
                        "Title": {
                            "fold": true,
                            "sort": 1,
                            "value": titleVerbose
                        },
                        "3) Normal unauthorized operations. Includes but not limited to unauthorized viewing of non-core info, records, etc.": {
                             "sort": 2,
                             "value": addr
                        },
                        "Vulnerability Level":{
                            "sort": 3,
                            "value": level
                        },
                        "Label Vulnerability Types": {
                             "sort": 4,
                             "value": cve.RiskTypeVerbose
                         },
                        "Vulnerability Description": {
                              "sort": 5,
                              "value":description
                        },
                        "Rectification Suggestions": {
                             "sort": 6,
                             "value": solution
                        },
                        "Confidentiality Principle": {
                             "sort": 7,
                             "value": parameter
                        },
                        "Connected Status": accessVector,
                        "Exploit Complexity": complexity
               })
            }
        }
        if len(cveResult) > 0 {
           cveList := json.dumps({ "type": "fix-array-list", "riskSeverity": riskSeverity, "title": sprintf(\`%CVE List by Year\` , year), "data": cveResult })
           reportInstance.Raw(cveList)
        }

    }
}

func customHasPrefix(str, prefix) {
    if len(str) < len(prefix) {
        return false
    }

    for i := 0; i < len(prefix); i++ {
        if str[i] != prefix[i] {
            return false
        }
    }
    return true
}

if len(criticalPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### Serious Compliance Risk Details"))
    showCVEReport(criticalPotentialRisks, "critical")
}
if len(highPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### Total"))
    showCVEReport(highPotentialRisks, "high")
}
if len(warningPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### Medium-Risk Compliance Risk Details"))
    showCVEReport(warningPotentialRisks, "warning")
}
if len(lowPotentialRisks) > 0 {
    reportInstance.Markdown(sprintf("### Low-Risk Compliance Risk Details"))
    showCVEReport(lowPotentialRisks, "low")
}
if len(criticalPotentialRisks)== 0 && len(highPotentialRisks)== 0 && len(warningPotentialRisks)== 0 && len(lowPotentialRisks)== 0 {
    reportInstance.Markdown(sprintf("No Compliance Risk"))
}
`