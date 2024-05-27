import React, {useMemo, useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ChevronDownIcon, SwitchHorizontalIcon, ChevronUpIcon} from "@/assets/newIcon"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"

import classNames from "classnames"
import styles from "./MenuCodec.module.scss"

const {ipcRenderer} = window.require("electron")

interface MenuCodecProps {}

const CodeMenuInfo: YakitMenuItemProps[] = [
    {key: "base64", label: "Base64 Encode"},
    {key: "htmlencode", label: "HTML Entity Encoding (Forced)）"},
    {key: "htmlencode-hex", label: "HTML Entity Encoding (Forced Hex Mode)）"},
    {key: "htmlescape", label: "HTML Entity Encoding (Special Chars Only)）"},
    {key: "urlencode", label: "URL Encoding (Forced)）"},
    {key: "urlescape", label: "URLEncodeSpecialCharsOnly）"},
    {key: "urlescape-path", label: "URL Path Encoding (Special Chars Only)）"},
    {key: "double-urlencode", label: "Double URL Encode"},
    {key: "hex-encode", label: "Hex Encoding"},
    {key: "json-unicode", label: "Unicode Chinese Encoding"}
]
const DecodeMenuInfo: YakitMenuItemProps[] = [
    {key: "base64-decode", label: "Base64 Decode"},
    {key: "htmldecode", label: "HTML Decode"},
    {key: "urlunescape", label: "URL Decode"},
    {key: "urlunescape-path", label: "URL Path Decoding"},
    {key: "double-urldecode", label: "Double URL Decoding"},
    {key: "hex-decode", label: "Hex Decoding"},
    {key: "json-unicode-decode", label: "Unicode Chinese Decoding"}
]

export const MenuCodec: React.FC<MenuCodecProps> = React.memo((props) => {
    const [avtiveKey, setActiveKey] = useState<string>("")

    const [codeShow, setCodeShow] = useState<boolean>(false)
    const codeMenu = useMemo(
        () => (
            <YakitMenu
                width={245}
                selectedKeys={[]}
                data={CodeMenuInfo}
                onClick={({key}) => {
                    setActiveKey("code")
                    onCodec(key)
                }}
            />
        ),
        []
    )
    const [decodeShow, setDecodeShow] = useState<boolean>(false)
    const decodeMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
                data={DecodeMenuInfo}
                onClick={({key}) => {
                    setActiveKey("decode")
                    onCodec(key)
                }}
            />
        ),
        []
    )

    const [question, setQuestion] = useState<string>("")
    const [answer, setAnswer] = useState<string>("")

    const exchangeValue = useMemoizedFn(() => {
        let value = question
        setQuestion(answer)
        setAnswer(value)
    })

    const isExec = useRef<boolean>(false)
    const onCodec = useMemoizedFn((key: string) => {
        if (isExec.current) {
            yakitNotify("error", "Wait for Last Encode/Decode to Finish")
            return
        }
        if (!question) {
            yakitNotify("error", "Enter Content to Encode/Decode")
            return
        }
        if (!key) {
            yakitNotify("error", "BUG: No Codec Type")
            return
        }
        isExec.current = true
        if (key === "fuzztag") {
            clickExecFuzztab()
        } else {
            ipcRenderer
                .invoke("Codec", {Type: key, Text: question, Params: [], ScriptName: ""})
                .then((res) => {
                    setAnswer(res?.Result || "")
                })
                .catch((err) => {
                    yakitNotify("error", `CODEC Decode Failed：${err}`)
                })
                .finally(() => (isExec.current = false))
        }
    })

    const clickExecFuzztab = useMemoizedFn(() => {
        setActiveKey("fuzztag")
        isExec.current = true
        const newCodecParams = {
            Text: question,
            WorkFlow: [
                {
                    CodecType: "Fuzz",
                    Params: []
                }
            ]
        }
        ipcRenderer
            .invoke("NewCodec", newCodecParams)
            .then((data: {Result: string; RawResult: Uint8Array}) => {
                setAnswer(data.Result || "")
            })
            .catch((e) => {
                yakitNotify("error", `fuzztab failed ${e}`)
            })
            .finally(() => (isExec.current = false))
    })

    return (
        <div className={styles["menu-codec-wrapper"]}>
            <div className={styles["func-btn-body"]}>
                <YakitPopover
                    overlayClassName={styles["codec-menu-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomLeft'
                    content={decodeMenu}
                    visible={codeShow}
                    onVisibleChange={(visible) => setCodeShow(visible)}
                >
                    <YakitButton
                        type={avtiveKey === "decode" ? "primary" : "outline2"}
                        onClick={(e) => e.preventDefault()}
                    >
                        Decode
                        {codeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </YakitButton>
                </YakitPopover>
                <YakitPopover
                    overlayClassName={styles["codec-menu-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomLeft'
                    content={codeMenu}
                    visible={decodeShow}
                    onVisibleChange={(visible) => setDecodeShow(visible)}
                >
                    <YakitButton
                        type={avtiveKey === "code" ? "primary" : "outline2"}
                        onClick={(e) => e.preventDefault()}
                    >
                        Encode
                        {decodeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </YakitButton>
                </YakitPopover>
                <YakitButton
                    size='small'
                    type={avtiveKey === "fuzztag" ? "primary" : "outline2"}
                    onClick={() => onCodec("fuzztag")}
                    style={{height: 24}}
                >
                    fuzztag
                </YakitButton>
            </div>

            <div className={styles["input-textarea-wrapper"]}>
                <YakitInput.TextArea
                    className={styles["input-textarea-body"]}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    isShowResize={false}
                />
                <div className={styles["input-textarea-copy"]}>
                    <CopyComponents
                        className={classNames(styles["copy-icon-style"], {[styles["copy-icon-ban"]]: !question})}
                        copyText={question}
                        iconColor={!!question ? "#85899e" : "#ccd2de"}
                    />
                </div>
            </div>

            <div className={styles["exchange-btn-wrapper"]}>
                <div className={styles["exchange-btn"]} onClick={exchangeValue}>
                    <SwitchHorizontalIcon />
                </div>
            </div>

            <div className={styles["input-textarea-wrapper"]}>
                <YakitInput.TextArea
                    className={styles["input-textarea-body"]}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    isShowResize={false}
                />
                <div className={styles["input-textarea-copy"]}>
                    <CopyComponents
                        className={classNames(styles["copy-icon-style"], {[styles["copy-icon-ban"]]: !answer})}
                        copyText={answer}
                        iconColor={!!answer ? "#85899e" : "#ccd2de"}
                    />
                </div>
            </div>
        </div>
    )
})
