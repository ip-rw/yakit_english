import {useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {
    ImportAndExportStatusInfo,
    LogListInfo,
    SaveProgressStream
} from "@/components/YakitUploadModal/YakitUploadModal"
import {v4 as uuidv4} from "uuid"
import {yakitFailed} from "@/utils/notification"
import {ExportParamsProps, ExportYakScriptLocalResponse} from "./PluginsLocalType"
import {useDebounceEffect} from "ahooks"
const {ipcRenderer} = window.require("electron")

declare type getContainerFunc = () => HTMLElement
interface PluginLocalExportProps {
    visible: boolean
    onClose: () => void
    getContainer?: string | HTMLElement | getContainerFunc | false
    exportLocalParams: ExportParamsProps
}

export const PluginLocalExport: React.FC<PluginLocalExportProps> = (props) => {
    const {visible, exportLocalParams, onClose, getContainer} = props
    const [localStreamData, setLocalStreamData] = useState<SaveProgressStream>()
    const localStreamDataRef = useRef<SaveProgressStream>()
    const [locallogListInfo, setLocallogListInfo] = useState<LogListInfo[]>([])
    const locallogListInfoRef = useRef<LogListInfo[]>([])

    useDebounceEffect(
        () => {
            let timer
            if (visible) {
                // Send Export Stream Signal
                const sendExportSignal = async () => {
                    try {
                        await ipcRenderer.invoke("ExportLocalYakScriptStream", exportLocalParams)
                    } catch (error) {
                        yakitFailed(error + "")
                    }
                }
                sendExportSignal()

                // Render Data Every 200ms
                timer = setInterval(() => {
                    setLocalStreamData(localStreamDataRef.current)
                    setLocallogListInfo([...locallogListInfoRef.current])
                }, 200)

                // Receive Exported Stream Data
                ipcRenderer.on("export-yak-script-data", (e, data: ExportYakScriptLocalResponse) => {
                    localStreamDataRef.current = {Progress: data.Progress}
                    // Display Only Error Logs & Last Log
                    if (data.MessageType === "error" || data.Progress === 1) {
                        locallogListInfoRef.current.unshift({
                            message: data.Message,
                            isError: ["error", "finalError"].includes(data.MessageType),
                            key: uuidv4()
                        })
                    }
                    // Auto-Close on Success or Status Finished
                    if (["success", "finished"].includes(data.MessageType) && data.Progress === 1) {
                        setTimeout(() => {
                            handleExportLocalPluginFinish()
                        }, 300)
                    }
                })

                return () => {
                    clearInterval(timer)
                    ipcRenderer.invoke("cancel-exportYakScript")
                    ipcRenderer.removeAllListeners("export-yak-script-data")
                }
            }
        },
        [visible, exportLocalParams],
        {wait: 300}
    )

    const resetLocalExport = () => {
        setLocalStreamData(undefined)
        setLocallogListInfo([])
        localStreamDataRef.current = undefined
        locallogListInfoRef.current = []
    }

    const handleExportLocalPluginFinish = () => {
        resetLocalExport()
        onClose()
    }

    return (
        <YakitModal
            visible={visible}
            getContainer={getContainer}
            type='white'
            title='Export Local Plugin'
            onCancel={handleExportLocalPluginFinish}
            width={680}
            closable={true}
            maskClosable={false}
            destroyOnClose={true}
            bodyStyle={{padding: 0}}
            footerStyle={{justifyContent: "flex-end"}}
            footer={
                <YakitButton type={"outline2"} onClick={handleExportLocalPluginFinish}>
                    {localStreamData?.Progress === 1 ? "Complete" : "Cancel"}
                </YakitButton>
            }
        >
            <div style={{padding: "0 16px"}}>
                <ImportAndExportStatusInfo
                    title='Exporting'
                    showDownloadDetail={false}
                    streamData={localStreamData || {Progress: 0}}
                    logListInfo={locallogListInfo}
                ></ImportAndExportStatusInfo>
            </div>
        </YakitModal>
    )
}
