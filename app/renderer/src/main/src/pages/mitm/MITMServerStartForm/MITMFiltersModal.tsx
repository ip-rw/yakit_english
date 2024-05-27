import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {ClientCertificate} from "./MITMServerStartForm"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {info, yakitFailed, warn} from "@/utils/notification"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, Modal, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, PlusCircleIcon, RemoveIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"
import {MITMFilters, MITMFilterSchema} from "./MITMFilters"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {OutlineClockIcon, OutlineStorageIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

interface MITMFiltersModalProps {
    isStartMITM: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}
interface SaveObjProps {
    filterName: string
    filter: any
}

const MitmSaveFilter = "MitmSaveFilter"
const MITMFiltersModal: React.FC<MITMFiltersModalProps> = React.memo((props) => {
    const {visible, setVisible, isStartMITM} = props
    const filtersRef = useRef<any>()
    // Filter Filter
    const [_mitmFilter, setMITMFilter] = useState<MITMFilterSchema>()
    const [_, setFilterName, getFilterName] = useGetState<string>("")
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
    const onResetFilters = useMemoizedFn(() => {
        ipcRenderer.invoke("mitm-reset-filter").then(() => {
            info("MITM Filter Reset Command Sent")
            setVisible(false)
        })
    })
    useEffect(() => {
        ipcRenderer.on("client-mitm-filter", (e, msg) => {
            info("Update MITM Filter Status")
            setMITMFilter({
                includeSuffix: msg.includeSuffix,
                excludeMethod: msg.excludeMethod,
                excludeSuffix: msg.excludeSuffix,
                includeHostname: msg.includeHostname,
                excludeHostname: msg.excludeHostname,
                excludeContentTypes: msg.excludeContentTypes,
                excludeUri: msg.excludeUri,
                includeUri: msg.includeUri
            })
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-filter")
        }
    }, [])
    useEffect(() => {
        if (visible) getMITMFilter()
    }, [visible])
    const onSetFilter = useMemoizedFn(() => {
        const filter = filtersRef.current.getFormValue()
        // Backend Error If Field Missing
        if (!filter.includeHostname) filter.includeHostname = []
        if (!filter.excludeHostname) filter.excludeHostname = []
        if (!filter.includeSuffix) filter.includeSuffix = []
        if (!filter.excludeSuffix) filter.excludeSuffix = []
        if (!filter.excludeMethod) filter.excludeMethod = []
        if (!filter.excludeContentTypes) filter.excludeContentTypes = []
        if (!filter.excludeUri) filter.excludeUri = []
        if (!filter.includeUri) filter.includeUri = []
        ipcRenderer
            .invoke("mitm-set-filter", filter)
            .then(() => {
                setMITMFilter(filter)
                // Filter WhiteList Configured?
                const flag =
                    !!filter.includeHostname.length || !!filter.includeUri.length || !!filter.includeSuffix.length
                emiter.emit("onSetFilterWhiteListEvent", flag + "")
                setVisible(false)
                info("Update MITM Filter Status")
            })
            .catch((err) => {
                yakitFailed("Update MITM Filter Failed:" + err)
            })
    })
    const getMITMFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("mitm-get-filter")
            .then((val: MITMFilterSchema) => {
                setMITMFilter(val)
            })
            .catch((err) => {
                yakitFailed("Fetch MITM Filter Failed:" + err)
            })
    })
    const onClearFilters = () => {
        filtersRef.current.clearFormValue()
        if (_mitmFilter?.excludeMethod?.includes("CONNECT")) {
            filtersRef.current.setFormValue({
                excludeMethod: ["CONNECT"]
            })
        }
    }

    // Check If Object Property Is Null
    const areObjectPropertiesEmpty = useMemoizedFn((obj) => {
        try {
            for (const key in obj) {
                if (obj[key] !== null && obj[key] !== undefined && Array.isArray(obj[key]) && obj[key].length > 0) {
                    return false
                }
            }
            return true
        } catch (error) {
            return true
        }
    })

    // Save Filter
    const onSaveFilter = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "Save Filter Config",
            content: (
                <div className={styles["mitm-save-filter"]}>
                    <YakitInput.TextArea
                        placeholder='Name Filter Config...'
                        showCount
                        maxLength={50}
                        onChange={(e) => {
                            setFilterName(e.target.value)
                        }}
                    />
                    <div className={styles["btn-box"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setFilterName("")
                                m.destroy()
                            }}
                        >
                            Cancel
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            onClick={() => {
                                if (getFilterName().length === 0) {
                                    warn("Please Enter Name")
                                    return
                                }
                                const filter = filtersRef.current.getFormValue()
                                const saveObj: SaveObjProps = {
                                    filterName: getFilterName(),
                                    filter
                                }
                                getRemoteValue(MitmSaveFilter).then((data) => {
                                    if (!data) {
                                        setRemoteValue(MitmSaveFilter, JSON.stringify([saveObj]))
                                        info("Save Successful")
                                        m.destroy()
                                        return
                                    }
                                    try {
                                        const filterData: SaveObjProps[] = JSON.parse(data)
                                        if (
                                            filterData.filter((item) => item.filterName === getFilterName()).length > 0
                                        ) {
                                            warn("Duplicate Name")
                                        } else {
                                            setRemoteValue(MitmSaveFilter, JSON.stringify([saveObj, ...filterData]))
                                            info("Save Successful")
                                            m.destroy()
                                        }
                                    } catch (error) {}
                                })
                            }}
                        >
                            Save
                        </YakitButton>
                    </div>
                </div>
            ),
            onCancel: () => {
                setFilterName("")
                m.destroy()
            },
            footer: null,
            width: 400
        })
    })

    const onMenuSelect = useMemoizedFn((v) => {
        filtersRef.current.setFormValue(v)
    })

    return (
        <YakitModal
            visible={visible}
            onCancel={() => {
                setVisible(false)
            }}
            closable={true}
            title='Filter Config'
            width={720}
            maskClosable={false}
            subTitle={
                <div className={styles["mitm-filters-subTitle"]}>
                    <YakitButton
                        style={{padding: "3px 8px"}}
                        icon={<OutlineStorageIcon />}
                        type='text'
                        onClick={onSaveFilter}
                    />
                    <YakitPopover
                        overlayClassName={styles["http-history-table-drop-down-popover"]}
                        content={
                            <MitmFilterHistoryStore
                                onSelect={(v) => onMenuSelect(v)}
                                popoverVisible={popoverVisible}
                                setPopoverVisible={setPopoverVisible}
                            />
                        }
                        trigger='click'
                        placement='bottom'
                        onVisibleChange={setPopoverVisible}
                        visible={popoverVisible}
                    >
                        <YakitButton style={{padding: "3px 8px"}} icon={<OutlineClockIcon />} type='text' />
                    </YakitPopover>

                    <YakitButton type='text' onClick={() => onClearFilters()}>
                        Clear
                    </YakitButton>
                    {isStartMITM && (
                        <YakitButton type='text' onClick={() => onResetFilters()}>
                            Reset Filter
                        </YakitButton>
                    )}
                </div>
            }
            className={styles["mitm-filters-modal"]}
            onOk={() => {
                const filter = filtersRef.current.getFormValue()
                if (areObjectPropertiesEmpty(filter)) {
                    Modal.confirm({
                        title: "Prompt",
                        icon: <ExclamationCircleOutlined />,
                        content: "Reset Default Config If Filter Empty? Confirm?？",
                        okText: "Confirm",
                        cancelText: "Cancel",
                        closable: true,
                        closeIcon: (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation()
                                    Modal.destroyAll()
                                }}
                                className='modal-remove-icon'
                            >
                                <RemoveIcon />
                            </div>
                        ),
                        onOk: () => {
                            onSetFilter()
                        },
                        onCancel: () => {},
                        cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                        okButtonProps: {size: "small", className: "modal-ok-button"}
                    })
                } else {
                    onSetFilter()
                }
            }}
            bodyStyle={{padding: 0}}
        >
            <div className={styles.infoBox}>
                Most Filters (Excl. File Extension & Content-Type) Support RegEx Compatible Match &rarr; glob
                Pattern Match &rarr; Keyword Match. File Extension & Content-Type Support Glob Pattern &rarr; Keyword Match。
            </div>
            <MITMFilters filter={_mitmFilter} onFinished={() => onSetFilter()} ref={filtersRef} />
        </YakitModal>
    )
})

export default MITMFiltersModal

interface MitmFilterHistoryStoreProps {
    popoverVisible: boolean
    setPopoverVisible: (v: boolean) => void
    onSelect: (v: any) => void
}
const MitmFilterHistoryStore: React.FC<MitmFilterHistoryStoreProps> = React.memo((props) => {
    const {popoverVisible, setPopoverVisible, onSelect} = props
    const [mitmSaveData, setMitmSaveData] = useState<SaveObjProps[]>([])
    useEffect(() => {
        onMitmSaveFilter()
    }, [popoverVisible])
    const onMitmSaveFilter = useMemoizedFn(() => {
        getRemoteValue(MitmSaveFilter).then((data) => {
            if (!data) {
                setMitmSaveData([])
                return
            }
            try {
                const filterData: SaveObjProps[] = JSON.parse(data)
                setMitmSaveData(filterData)
            } catch (error) {}
        })
    })

    const removeItem = useMemoizedFn((filterName: string) => {
        setMitmSaveData((mitmSaveData) => mitmSaveData.filter((item) => item.filterName !== filterName))
    })

    useUpdateEffect(() => {
        setRemoteValue(MitmSaveFilter, JSON.stringify(mitmSaveData))
    }, [mitmSaveData])

    const onSelectItem = useMemoizedFn((filter) => {
        onSelect(filter)
        setPopoverVisible(false)
    })

    return (
        <div className={styles["mitm-filter-history-store"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>History Store</div>
                {mitmSaveData.length !== 0 && (
                    <YakitButton
                        type='text'
                        colors='danger'
                        onClick={() => {
                            setMitmSaveData([])
                        }}
                    >
                        Clear
                    </YakitButton>
                )}
            </div>

            {mitmSaveData.length > 0 ? (
                <div className={styles["list"]}>
                    {mitmSaveData.map((item, index) => (
                        <div
                            key={item.filterName}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-border"]]: index !== mitmSaveData.length - 1,
                                [styles["list-item-border-top"]]: index === 0
                            })}
                            onClick={() => {
                                onSelectItem(item.filter)
                            }}
                        >
                            <div className={styles["name"]}>{item.filterName}</div>
                            <div
                                className={styles["opt"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeItem(item.filterName)
                                }}
                            >
                                <OutlineTrashIcon />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={classNames(styles["no-data"])}>No Data Available</div>
            )}
        </div>
    )
})
