import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./MITMServerStartForm.module.scss"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakEditor} from "@/utils/editors"
import {CaCertData} from "../MITMServerHijacking/MITMServerHijacking"
import {useMemoizedFn} from "ahooks"
import {saveABSFileToOpen} from "@/utils/openWebsite"

const {ipcRenderer} = window.require("electron")

interface MITMCertificateDownloadModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
export const MITMCertificateDownloadModal: React.FC<MITMCertificateDownloadModalProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const [caCerts, setCaCerts] = useState<CaCertData>({
        CaCerts: new Buffer(""),
        LocalFile: ""
    })
    useEffect(() => {
        ipcRenderer.invoke("DownloadMITMCert", {}).then((data: CaCertData) => {
            setCaCerts(data)
        })
    }, [])
    /**
     * @desc Download Certificate
     */
    const onDown = useMemoizedFn(() => {
        if (!caCerts.CaCerts) return
        saveABSFileToOpen("yakit_cert.crt.pem", caCerts.CaCerts)
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            title='Download SSL/TLS cert for HTTPS interception'
            width={720}
            className={styles["mitm-certificate-download-modal"]}
            okText='Download locally and open'
            footerExtra={
                <div className={styles["certificate-download-modal-footer"]}>
                    Access after setting proxy：
                    <YakitTag
                        enableCopy
                        copyText='http://mitm'
                        iconColor='var(--yakit-primary-5)'
                    />
                    Auto-download certificate
                </div>
            }
            onOk={() => onDown()}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["certificate-download-modal-body"]}>
                <YakEditor bytes={true} valueBytes={caCerts.CaCerts} />
            </div>
        </YakitModal>
    )
})

export default MITMCertificateDownloadModal
