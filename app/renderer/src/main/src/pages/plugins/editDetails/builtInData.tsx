/**
 * @name Plugin Data Modification - Built-in tags list
 */
export const BuiltInTags: string[] = [
    "IOT",
    "Mainstream CMS",
    "Middleware",
    "Code Development",
    "Feature Type",
    "Application Type",
    "Network Devices",
    "Big Data Platform",
    "Database Services",
    "Virtualization Services",
    "Mail Servers",
    "Centralized Control",
    "Mainstream Application Frameworks",
    "Collaborative Suite",
    "Common Vulnerability Detection",
    "Mainstream Third-Party Services",
    "Information Collection",
    "Data Processing",
    "Brute Force",
    "Fingerprint Identification",
    "Directory Brute-Force",
    "Encryption/Decryption Tools",
    "Threat Intelligence",
    "Space Engine",
    "AI Tools"
]

/** @name Risk Level corresponding Tag Component Color */
export const RiskLevelToTag: Record<string, {color: string; name: string}> = {
    critical: {color: "serious", name: "Severe"},
    high: {color: "danger", name: "High Risk"},
    warning: {color: "info", name: "Reply Complete"},
    low: {color: "yellow", name: "Low Risk"},
    info: {color: "success", name: "Info/Parse content in plugin backend stream"}
}
