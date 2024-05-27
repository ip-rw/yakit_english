import React, {useEffect, useState} from "react"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {Form} from "antd"
import {PEMExampleProps, RemoteEngineProps, RemoteLinkInfo, YakitAuthInfo} from "./RemoteEngineType"
import {LocalGVS} from "@/enums/localGlobal"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {getReleaseEditionName, isCommunityEdition, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {YakitThemeSvgIcon} from "../icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {EngineModeVerbose} from "@/components/basics/YakitLoading"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakEditor} from "@/utils/editors"

import yakitEE from "@/assets/yakitEE.png"
import yakitSE from "@/assets/yakitSE.png"
import classNames from "classnames"
import styles from "./RemoteEngine.module.scss"

const {ipcRenderer} = window.require("electron")

const DefaultRemoteLink: RemoteLinkInfo = {
    allowSave: false,
    host: "127.0.0.1",
    port: "8087",
    tls: false
}

export const RemoteEngine: React.FC<RemoteEngineProps> = React.memo((props) => {
    const {loading, setLoading, installedEngine, onSubmit, onSwitchLocalEngine} = props

    /** Remote Host Params */
    const [remote, setRemote] = useState<RemoteLinkInfo>({...DefaultRemoteLink})
    /** Check state? */
    const [isCheck, setIsCheck] = useState<boolean>(false)

    const [auths, setAuths] = useState<YakitAuthInfo[]>([])

    const [showSTL, setShowSTL] = useState<boolean>(false)
    const [showAllow, setShowAllow] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer
            .invoke("get-yakit-remote-auth-all")
            .then((e: YakitAuthInfo[]) => {
                setAuths(
                    e.map((item) => {
                        item.tls = !!item.tls
                        return item
                    })
                )
            })
            .catch(() => {})

        getLocalValue(LocalGVS.YaklangRemoteEngineCredential).then((result: RemoteLinkInfo) => {
            try {
                if (!result?.host || !result?.port) {
                    return
                }
                setRemote({...result})
            } catch (e) {}
        })
    }, [])

    const onSelectHistory = useMemoizedFn((name: string) => {
        const info = auths.find((item) => item.name === name)
        if (!info || !info.host || !info.port) return

        const remoteInfo: RemoteLinkInfo = {
            allowSave: true,
            linkName: info.name,
            host: info.host,
            port: `${info.port === 0 ? 0 : info.port || ""}`,
            tls: info.tls,
            caPem: info.caPem,
            password: info.password
        }
        setRemote(remoteInfo)
    })

    const submit = useMemoizedFn(() => {
        setIsCheck(true)
        if (!remote.host) return
        if (!remote.port) return
        if (remote.tls && !remote.caPem) return
        if (remote.allowSave && !remote.linkName) return

        setLoading(true)
        if (remote.allowSave) {
            const params: YakitAuthInfo = {
                name: remote.linkName || `${remote.host}:${remote.port}`,
                host: remote.host,
                port: +remote.port || 0,
                tls: remote.tls,
                caPem: remote.caPem || "",
                password: remote.password || ""
            }
            const index = auths.findIndex((item) => item.host === params.host && item.port === params.port)
            if (index === -1) setAuths((arr) => arr.concat([params]))
            ipcRenderer
                .invoke("save-yakit-remote-auth", {...params})
                .then(() => {})
                .catch(() => {})
        }

        setLocalValue(LocalGVS.YaklangRemoteEngineCredential, {...remote})
        onSubmit({...remote})
    })

    // Return to app init interface
    const handleSwitchLocalEngine = useMemoizedFn(() => {
        setRemote({...DefaultRemoteLink})
        setIsCheck(false)
        onSwitchLocalEngine()
    })

    return (
        <div className={styles["remote-engine-wrapper"]}>
            <YakitSpin spinning={loading}>
                <div className={styles["remote-yaklang-engine-body"]}>
                    <div className={styles["remote-title"]}>
                        {isCommunityEdition() && <YakitThemeSvgIcon className={styles["logo-img"]} />}
                        {isEnpriTrace() && (
                            <div className={styles["logo-img"]}>
                                <img src={yakitEE} alt='No image' />
                            </div>
                        )}
                        {isEnpriTraceAgent() && (
                            <div className={styles["logo-img"]}>
                                <img src={yakitSE} alt='No image' />
                            </div>
                        )}
                        <div className={styles["title-style"]}>Remote Mode</div>
                        <div className={styles["remote-history"]}>
                            <div className={styles["select-title"]}>Connection History</div>
                            <YakitSelect
                                wrapperClassName={styles["select-style"]}
                                placeholder='Select...'
                                onSelect={onSelectHistory}
                            >
                                {auths.map((item) => {
                                    return (
                                        <YakitSelect.Option key={item.name} value={item.name}>
                                            {item.name}
                                        </YakitSelect.Option>
                                    )
                                })}
                            </YakitSelect>
                        </div>
                    </div>

                    <div className={styles["rmeote-divider"]}></div>
                    <div className={styles["remote-info"]}>
                        <Form colon={false} labelAlign='right' labelCol={{span: 8}}>
                            <Form.Item label='Yak gRPC Host Address:' required={true}>
                                <YakitInput
                                    className={classNames(styles["input-style"], {
                                        [styles["error-border"]]: isCheck && !remote.host
                                    })}
                                    value={remote.host}
                                    onChange={(e) => setRemote({...remote, host: e.target.value})}
                                />
                            </Form.Item>
                            <Form.Item label='Yak gRPC Port:' required={true}>
                                <YakitInput
                                    className={classNames(styles["input-style"], {
                                        [styles["error-border"]]: isCheck && !remote.port
                                    })}
                                    value={remote.port}
                                    onChange={(e) => setRemote({...remote, port: e.target.value})}
                                />
                            </Form.Item>
                            <Form.Item label='Enable TLS Auth:'>
                                <YakitSwitch
                                    size='large'
                                    checked={remote.tls}
                                    onChange={(tls) => setRemote({...remote, tls})}
                                />
                            </Form.Item>
                            {remote.tls && (
                                <>
                                    <Form.Item
                                        label={
                                            <div className={styles["pem-title"]}>
                                                gRPC Root-CA Cert (PEM)){" "}
                                                <PEMExample setShow={setShowSTL}>
                                                    <OutlineQuestionmarkcircleIcon
                                                        className={
                                                            showSTL ? styles["icon-show-style"] : styles["icon-style"]
                                                        }
                                                    />
                                                </PEMExample>
                                                :
                                            </div>
                                        }
                                        required={true}
                                    >
                                        <div
                                            className={classNames(styles["pem-content"], {
                                                [styles["error-border"]]: isCheck && !remote.caPem
                                            })}
                                        >
                                            <YakEditor
                                                type={"pem"}
                                                value={remote.caPem}
                                                setValue={(caPem) => setRemote({...remote, caPem})}
                                            />
                                        </div>
                                    </Form.Item>
                                    <Form.Item label='Password'>
                                        <YakitInput
                                            className={styles["input-style"]}
                                            value={remote.password}
                                            onChange={(e) => setRemote({...remote, password: e.target.value})}
                                        />
                                    </Form.Item>
                                </>
                            )}
                            <Form.Item
                                label={
                                    <div className={styles["pem-title"]}>
                                        Save as History{" "}
                                        <PEMHint setShow={setShowAllow}>
                                            <OutlineQuestionmarkcircleIcon
                                                className={classNames(styles["icon-style"], {
                                                    [styles["icon-show-style"]]: showAllow
                                                })}
                                            />
                                        </PEMHint>
                                        :
                                    </div>
                                }
                            >
                                <YakitSwitch
                                    size='large'
                                    checked={remote.allowSave}
                                    onChange={(allowSave: boolean) => setRemote({...remote, allowSave})}
                                />
                            </Form.Item>
                            {remote.allowSave && (
                                <Form.Item
                                    label='Connection Name:'
                                    required={true}
                                    help='On fill, record saved for quick access'
                                >
                                    <YakitInput
                                        className={classNames(styles["input-style"], {
                                            [styles["error-border"]]: isCheck && !remote.linkName
                                        })}
                                        value={remote.linkName}
                                        onChange={(e) => setRemote({...remote, linkName: e.target.value})}
                                    />
                                </Form.Item>
                            )}
                            <Form.Item label=' ' style={{marginTop: 24}}>
                                <YakitButton size='max' onClick={submit}>
                                    Initiate Connection
                                </YakitButton>

                                <YakitButton
                                    style={{marginLeft: 8}}
                                    size='max'
                                    type='outline2'
                                    onClick={handleSwitchLocalEngine}
                                >
                                    {installedEngine ? EngineModeVerbose("local") : "Cancel"}
                                </YakitButton>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </YakitSpin>
        </div>
    )
})

/** PEM Cert Example */
const PemPlaceHolder = `-----BEGIN CERTIFICATE-----
MIIDDjCCAfagAwIBAgIQdtJUoUlZeG+SAmgFo8TjpzANBgkqhkiG9w0BAQsFADAg
MR4wHAYDVQQDExVZYWtpdCBUZWFtU2VydmVyIFJvb3QwIBcNOTkxMjMxMTYwMDAw
WhgPMjEyMDA3MjkxMzIxMjJaMCAxHjAcBgNVBAMTFVlha2l0IFRlYW1TZXJ2ZXIg
Um9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMBs74NyAc38Srpy
j/rxFP4IICXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZweuZ/nfV2
yj/9ECvP495b863Dxj/Lc+OfUO7sUILi7fRH3h201JFAqdQ0vtDsHwJI6HrLExst
hyKdO7gFPvht5orIXE5a4GLotoV1m1zh+T19NwZPGR7dkHN9U9WPlrPosl4lFNUI
EiGjjTexoYYfEpp8ROSLLTBRIio8zTzOW1TgNUeGDhjpD4Guys1YMaLX3nzbX6az
YkImVaZYkXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZlocoTjglw2
P4XpcL0CAwEAAaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXEB/wQFMAMBAf8w
HQYDVR0OBBYEFFdzdAPrxAja7GXXXXXXXXXXXXXXXXXXXXqGSIb3DQEBCwUAA4IB
AQCdc9dS0E0m4HLwUCCKAXXXXXXXXXXXXXXXXXXXXXXX1222222222oJ2iU3dzd6
PAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXae5a11129ateQEHPJ0JhdlsbqQ
FyTuYOijovSFVNuLuFj3WHrFOp5gY7Pl0V7lPHSiOAjVG4mg8PGGKivwyyv23nw+
Mx5C8WSoRFWx5H0afXDHptF4rq5bI/djg04VM5ibI5GJ3i1EybBpbGj3rRBY+sF9
FRmP2Nx+zifhMNe300xfHzqNeN3D+Uix6+GOkBoYI65KNPGqwi8uy9HlJVx3Jkht
WOG+9PGLcr4IRJx5LUEZ5FB1
-----END CERTIFICATE-----`

/** @name PEM Example Alert */
const PEMExample: React.FC<PEMExampleProps> = React.memo((props) => {
    const {children, setShow} = props

    const content = (
        <div className={classNames(styles["pem-example"], styles["pem-wrapper"])}>
            <div className={styles["title-style"]}>Requires PEM cert</div>
            Through <div className={styles["content-code"]}>yak grpc --tls</div> On server start, RootCA is
            Print, copy to this textbox：
            <br />
            E.g.,：
            <br />
            <div className={styles["code-pem"]}>
                <YakEditor type='plaintext' readOnly={true} value={PemPlaceHolder} />
            </div>
        </div>
    )

    return (
        <YakitPopover
            overlayClassName={styles["pem-example-popover"]}
            content={content}
            onVisibleChange={(visible) => {
                if (setShow) setShow(visible)
            }}
        >
            {children}
        </YakitPopover>
    )
})
/** @name PEM Alert */
const PEMHint: React.FC<PEMExampleProps> = React.memo((props) => {
    const {children, setShow} = props

    const [remotePath, setRemotePath] = useState<string>("")
    useEffect(() => {
        ipcRenderer
            .invoke("fetch-remote-file-path")
            .then((path: string) => {
                setRemotePath(path)
            })
            .catch(() => {})
    }, [])

    const openFile = () => {
        ipcRenderer.invoke("open-remote-link")
    }

    const content = (
        <div className={classNames(styles["pem-hint"], styles["pem-wrapper"])}>
            Note：{getReleaseEditionName()} Doesn't upload history online
            <br />
            Find remote login info in local (client) directory
            <br />
            <div className={styles["path-wrapper"]}>
                <div className={styles["link-wrapper"]}>
                    <div
                        className={classNames(styles["copt-text"], "yakit-content-single-ellipsis")}
                        title={remotePath}
                    >
                        {remotePath}
                    </div>
                    <CopyComponents className={styles["copy-icon"]} copyText={remotePath} />
                </div>
                <div className={styles["link-open"]} onClick={openFile}>
                    Open Remote Info Storage
                </div>
            </div>
        </div>
    )

    return (
        <YakitPopover
            overlayClassName={styles["pem-example-popover"]}
            content={content}
            onVisibleChange={(visible) => {
                if (setShow) setShow(visible)
            }}
        >
            {children}
        </YakitPopover>
    )
})
