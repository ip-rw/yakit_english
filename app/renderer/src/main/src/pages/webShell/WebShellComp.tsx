import React, {useEffect, useState} from "react"
import {Form, Space} from "antd";
import {FromLayoutProps} from "@/pages/invoker/YakScriptCreator";
import {EncMode, ShellScript, ShellType, WebShellDetail} from "@/pages/webShell/models";
import {useCreation, useDebounceEffect, useGetState, useMemoizedFn} from "ahooks";
import {InputItem} from "@/utils/inputUtil";
import {YakScript} from "@/pages/invoker/schema";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import styles from "@/pages/layout/publicMenu/MenuCodec.module.scss";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag";
import classNames from "classnames";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {failed, success} from "@/utils/notification";
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage";
import {queryYakScriptList} from "@/pages/yakitStore/network";


export const RemarkDetail = ({remark}) => {

    return (
        <div style={{width: "100%"}}>
            <div>{remark}</div>
        </div>
    )
}

export interface WebShellCreatorFormProp {
    onCreated?: (i: WebShellDetail) => any
    modified?: WebShellDetail
    onChanged?: (i: WebShellDetail) => any
    fromLayout?: FromLayoutProps
    noClose?: boolean
    showButton?: boolean
    setScript?: (i: WebShellDetail) => any
    closeModal?: () => void
    isCreate?: boolean
}

const {ipcRenderer} = window.require("electron")

export const WebShellCreatorForm: React.FC<WebShellCreatorFormProp> = (props) => {
    const defFromLayout = useCreation(() => {
        const col: FromLayoutProps = {
            labelCol: {span: 5},
            wrapperCol: {span: 14}
        }
        return col
    }, [])
    const [fromLayout, setFromLayout] = useState<FromLayoutProps>(defFromLayout)

    const [params, setParams, getParams] = useGetState<WebShellDetail>(props.modified || {} as WebShellDetail)

    const [paramsLoading, setParamsLoading] = useState(false)

    // const [modified, setModified] = useState<WebShellDetail | undefined>(props.modified)

    const [createLoading, setCreateLoading] = useState<boolean>(false)

    const createOrUpdateWebShell = useMemoizedFn(() => {
        setCreateLoading(true)
        ipcRenderer.invoke(props.isCreate ? "CreateWebShell" : "UpdateWebShell", params).then((data: WebShellDetail) => {
            success(props.isCreate ? "Create" : "Edit" + " Site Management Success")
            setParams(data)
            if (data) {
                props.onCreated && props.onCreated(data)
                props.onChanged && props.onChanged(data)
            }
            props.closeModal && props.closeModal()
        }).catch((err) => {
            failed(props.isCreate ? "Create" : "Edit" + ` Site Management Failed: ${err}`)
        }).finally(() => {
            setTimeout(() => {
                setCreateLoading(false)
            }, 20)
        })
    })
    return (
        <div>
            <Form {...fromLayout}>
                <WebShellFormContent
                    params={params}
                    setParams={setParams}
                    // modified={modified}
                    setParamsLoading={setParamsLoading}
                />
                <Form.Item colon={false} label={" "}>
                    <Space>
                        <YakitButton onClick={createOrUpdateWebShell} loading={createLoading}>
                            {props.isCreate ? "Add" : "Edit"}
                        </YakitButton>
                    </Space>
                </Form.Item>
            </Form>
        </div>

    )
}

interface WebShellFormContentProps {
    params: WebShellDetail
    setParams: (y: WebShellDetail) => void
    modified?: WebShellDetail | undefined
    setParamsLoading?: (b: boolean) => void
    isShowAuthor?: boolean
    disabled?: boolean
}

const WebShellFormContent: React.FC<WebShellFormContentProps> = (props) => {
    const {params, modified, setParams, setParamsLoading, isShowAuthor = true, disabled} = props
    const [showSecret, setShowSecret] = useState(false);
    const [showCodec, setShowCodec] = useState(false);
    const [headersStr, setHeadersStr] = useState<string>("")
    const [shellScript, setShellScript] = useState<string>("")
    useEffect(() => {
        // Set if params.ShellScript is empty "jsp"
        if (!params.ShellScript) {
            setParams({...params, ShellScript: ShellScript.JSP});
            setShellScript(ShellScript.JSP)
        }

        if (!params.ShellType) {
            setParams({...params, ShellType: ShellType.Behinder});
            setShowCodec(true)
        } else {
            setShowCodec(params.ShellType === ShellType.Behinder)
        }

        if (!params.Headers) {
            setHeadersStr('');
        } else {
            const headersStr = Object.entries(params.Headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            setHeadersStr(headersStr);
        }
    }, []);
    useDebounceEffect(() => {
        if (params.Url === '') {
            // Update params directly if URL is empty
            return;
        }

        try {
            // Try parsing URL
            const url = new URL(params.Url);
            // Get file extension from URL
            const urlPath = url.pathname;
            const extension = urlPath.split('.').pop();

            // Update ShellScript if file extension is a supported script type
            const scriptTypes = Object.values(ShellScript);
            if (extension) {
                const upperCaseExtension = extension.toUpperCase();
                if (scriptTypes.includes(upperCaseExtension as ShellScript)) {
                    setShellScript(upperCaseExtension);
                    setParams({...params, ShellScript: upperCaseExtension, Url: params.Url});
                }
            }
        } catch (error) {
            // Handle errors if URL parsing fails
            console.error(`Invalid URL: ${params.Url}`);
        }
    }, [params.Url]);

    const [packetScriptList, setPacketScriptList] = useState<SelectOptionProps[]>([])
    const [payloadScriptList, setPayloadScriptList] = useState<SelectOptionProps[]>([])
    const handleQueryYakScriptList = (tag: string, setScriptList: Function) => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    setScriptList([])
                    return
                }
                const validItems = i.filter((item) => {
                    const tags = item.Tags.split(",").map(tag => tag.toLowerCase());
                    return tags.length === 2 && tags.includes(tag) && tags.includes(shellScript.toLowerCase());
                });

                if (validItems.length === 0) {
                    setScriptList([]);
                    return;
                }

                const scriptNames = validItems.map((item) => (
                    {label: item.ScriptName, value: item.ScriptName}
                ));
                setScriptList(scriptNames)
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [tag, shellScript]
        )
    }
    useEffect(() => {
        handleQueryYakScriptList("webshell-packet-codec", setPacketScriptList);
        handleQueryYakScriptList("webshell-payload-codec", setPayloadScriptList);
    }, [shellScript])
    return (
        <>
            <Form.Item label={"Site Type"} required={true} rules={[{required: true, message: "Required Field"}]}>
                <YakitSelect
                    value={params.ShellType || ShellType.Behinder}
                    onSelect={(val) => {
                        setParams({...params, ShellType: val})
                        setShowSecret(val === ShellType.Godzilla)
                        setShowCodec(!(val === ShellType.Godzilla))
                    }}
                >
                    <YakitSelect.Option value={ShellType.Behinder}>Behinder</YakitSelect.Option>
                    <YakitSelect.Option value={ShellType.Godzilla}>Godzilla</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            <InputItem
                label={"URL"}
                required={true}
                setValue={(Url) => setParams({...params, Url})}
                value={params.Url}
                disable={disabled}
            />
            <Form.Item label={"Script Type"}>
                <YakitSelect
                    value={params.ShellScript || ShellScript.JSP}
                    onSelect={(val) => {
                        setParams({...params, ShellScript: val})
                        setShellScript(val)
                    }}
                >
                    <YakitSelect.Option value={ShellScript.JSP}>JSP</YakitSelect.Option>
                    <YakitSelect.Option value={ShellScript.JSPX}>JSPX</YakitSelect.Option>
                    <YakitSelect.Option value={ShellScript.PHP}>PHP</YakitSelect.Option>
                    <YakitSelect.Option value={ShellScript.ASP}>ASP</YakitSelect.Option>
                    <YakitSelect.Option value={ShellScript.ASPX}>ASPX</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            <InputItem
                label={"Key"}
                setValue={(SecretKey) => setParams({...params, SecretKey})}
                value={params.SecretKey}
                disable={disabled}
            />
            {showSecret && (
                <>
                    <InputItem
                        label={"Password"}
                        setValue={(Pass) => setParams({...params, Pass})}
                        value={params.Pass}
                        disable={disabled}
                    />
                    <Form.Item label={"Encryption Mode"}>
                        <YakitSelect
                            value={params.EncMode || ""}
                            onSelect={(val) => {
                                setParams({...params, EncMode: val});
                            }}
                        >
                            <YakitSelect.Option value={EncMode.Base64}>Base64</YakitSelect.Option>
                            <YakitSelect.Option value={EncMode.Raw}>Raw</YakitSelect.Option>
                        </YakitSelect>
                    </Form.Item>
                </>
            )}
            {showCodec && (
                <>
                    <Form.Item label={"Packet Codec"}>
                        <YakitSelect
                            showSearch
                            options={packetScriptList}
                            placeholder='Please select packet codec...'
                            value={params.PacketCodecName}
                            onChange={(PacketCodecName) => {
                                setParams({...params, PacketCodecName})
                            }}
                            maxTagCount={10}
                        />
                    </Form.Item>

                    <Form.Item label={"Echo Codec"}>
                        <YakitSelect
                            showSearch
                            options={payloadScriptList}
                            placeholder='Please select echo codec...'
                            value={params.PayloadCodecName}
                            onChange={(PayloadCodecName) => {
                                setParams({...params, PayloadCodecName})
                            }}
                            maxTagCount={10}
                        />
                    </Form.Item>
                </>
            )}
            <Form.Item label={"Headers"} initialValue={[]}>
                <div className={styles["menu-codec-wrapper"]}>
                    <div className={styles["input-textarea-wrapper"]}>
                        <YakitInput.TextArea
                            className={styles["input-textarea-body"]}
                            value={headersStr}
                            onChange={(e) => {
                                setHeadersStr(e.target.value);
                                const lines = e.target.value.split('\n');
                                let newHeaders: { [key: string]: string } = {};
                                lines.forEach(line => {
                                    const [key, ...rest] = line.split(':');
                                    newHeaders[key.trim()] = rest.join(':').trim();
                                });
                                setParams({...params, Headers: newHeaders});
                            }}
                            spellCheck={false}
                            placeholder={"Custom headers, e.g.: User-Agent: Yakit/1.0.0"}
                        />
                        <div className={styles["input-textarea-copy"]}>
                            <CopyComponents
                                className={classNames(styles["copy-icon-style"], {[styles["copy-icon-ban"]]: !headersStr})}
                                copyText={headersStr}
                                iconColor={!!headersStr ? "#85899e" : "#ccd2de"}
                            />
                        </div>
                    </div>
                </div>
            </Form.Item>

            <InputItem
                label={"Set Proxy"}
                setValue={(Proxy) => setParams({...params, Proxy})}
                value={params.Proxy}
                disable={disabled}
            />

            <InputItem
                label={"Note"}
                setValue={(Remark) => setParams({...params, Remark})}
                value={params.Remark}
                disable={disabled}
            />
        </>
    )
}