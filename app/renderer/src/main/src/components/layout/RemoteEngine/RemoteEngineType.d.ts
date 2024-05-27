export interface RemoteEngineProps {
    loading: boolean
    setLoading: (flag: boolean) => any
    /** Engine Installed? */
    installedEngine: boolean
    onSubmit: (info: RemoteLinkInfo) => any
    /** Cancel & Switch to Local Connection */
    onSwitchLocalEngine: () => any
}

/** @name Remote Connection Config Params */
export interface RemoteLinkInfo {
    /** Save as History Connection? */
    allowSave: boolean
    /** History Connection Names */
    linkName?: string
    /** Remote Host Address */
    host: string
    /** Remote Port */
    port: string
    /** TLS Enabled? */
    tls: boolean
    /** Certificate */
    caPem?: string
    password?: string
}

/** @name Local Cache Remote Connection Config */
export interface YakitAuthInfo {
    name: string
    host: string
    port: number
    caPem: string
    tls: boolean
    password: string
}

export interface PEMExampleProps {
    children?: any
    setShow?: (flag: boolean) => any
}
