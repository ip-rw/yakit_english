import React, {useEffect, useRef, useState} from "react"
import {Space, Pagination, Checkbox, Row, Col} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import {export_json_to_excel, CellSetting} from "./toExcel"
import {failed} from "../../utils/notification"
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "../../pages/invoker/schema"
import {useMemoizedFn} from "ahooks"
import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import styles from "./DataExport.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
interface ExportExcelProps {
    btnProps?: YakitButtonProp
    getData: (query: PaginationSchema) => Promise<any>
    fileName?: string
    pageSize?: number
    showButton?: boolean
    text?: string
    newUIType?: YakitButtonProp["type"]
}

interface resProps {
    header: string[]
    exportData: Array<any>
    response: QueryGeneralResponse<any>
    optsSingleCellSetting?: CellSetting
}

interface PaginationProps {
    Page: number
    Limit: number
}

const maxCellNumber = 100000 // Max Cell 10w

/* Split array into segments if >90MB */
const splitArrayBySize = (arr, maxSizeInBytes) => {
    // chunkSize for fewer parse times - Perf Optimization）
    const chunkSize: number = 100
    const chunks: any[] = []
    let currentChunk: any[] = []
    let currentSize: number = 0

    for (let i = 0; i < arr.length; i++) {
        const element: any = arr[i]

        // Add element to current chunk
        currentChunk.push(element)

        // Calculate every chunkSize rows whether exceeding size or at array end
        if ((i + 1) % chunkSize === 0 || i === arr.length - 1) {
            // Calculate size of first 20 elements together
            const elementsToCalculate = currentChunk.slice(-chunkSize)
            const elementsSize = elementsToCalculate.reduce((size, el) => {
                return size + new TextEncoder().encode(JSON.stringify(el)).length
            }, 0)

            currentSize += elementsSize

            if (currentSize > maxSizeInBytes) {
                // Store and create new chunk if current exceeds size
                chunks.push(currentChunk.slice(0, -chunkSize)) // push array when not exceeded
                currentChunk = elementsToCalculate
                currentSize = elementsSize
            } else if (i === arr.length - 1) {
                // Add remaining currentChunk to chunks on the last loop without exceeding size
                chunks.push(currentChunk)
            }
        }
    }

    return chunks
}

export const ExportExcel: React.FC<ExportExcelProps> = (props) => {
    const {
        btnProps,
        getData,
        fileName = "Port Assets",
        pageSize = 100000,
        showButton = true,
        text,
        newUIType = "outline2"
    } = props
    const [loading, setLoading] = useState<boolean>(false)
    const [selectItem, setSelectItem] = useState<number>()
    const [visible, setVisible] = useState<boolean>(false)
    const [frequency, setFrequency] = useState<number>(0)
    const exportDataBatch = useRef<Array<string[]>>([]) // Save exported data
    const exportNumber = useRef<number>() // Export Counts
    const headerExcel = useRef<string[]>([]) // Excel Header
    const optsCell = useRef<CellSetting>() // Excel Header
    const [pagination, setPagination] = useState<QueryGeneralResponse<any>>({
        Data: [],
        Pagination: genDefaultPagination(pageSize, 1),
        Total: 0
    })
    const [splitVisible, setSplitVisible] = useState<boolean>(false)
    const [chunksData, setChunksData] = useState<any[]>([])
    const beginNumberRef = useRef<number>(0)
    const toExcel = useMemoizedFn((query = {Limit: pageSize, Page: 1}) => {
        setLoading(true)
        getData(query as any)
            .then((res: resProps) => {
                if (res) {
                    const {header, exportData, response, optsSingleCellSetting} = res
                    const totalCellNumber = header.length * exportData.length

                    const maxSizeInBytes = 90 * 1024 * 1024 // 90MB
                    const chunks: any[] = splitArrayBySize(exportData, maxSizeInBytes)

                    if (totalCellNumber < maxCellNumber && response.Total <= pageSize && chunks.length === 1) {
                        // Export directly if cell count < max or content < 90M
                        export_json_to_excel({
                            header: header,
                            data: exportData,
                            filename: `${fileName}1-${exportData.length}`,
                            autoWidth: true,
                            bookType: "xlsx",
                            optsSingleCellSetting
                        })
                    } else if (!(totalCellNumber < maxCellNumber && response.Total <= pageSize)) {
                        // Batch Export
                        const frequency = Math.ceil(totalCellNumber / maxCellNumber) // Export Counts
                        exportNumber.current = Math.floor(maxCellNumber / header.length) //Qty per Export
                        exportDataBatch.current = exportData
                        headerExcel.current = header
                        optsCell.current = optsSingleCellSetting
                        setFrequency(frequency)
                        setVisible(true)
                    } else {
                        // Segmented Export
                        headerExcel.current = header
                        optsCell.current = optsSingleCellSetting
                        setSplitVisible(true)
                        setChunksData(chunks)
                        // let begin:number = 0
                        // for (let i = 0; i < chunks.length; i++) {
                        //     let filename = `${fileName}${begin||1}-${begin+chunks[i].length}`
                        //     begin += chunks[i].length
                        //     export_json_to_excel({
                        //         header: header,
                        //         data: chunks[i],
                        //         filename,
                        //         autoWidth: true,
                        //         bookType: "xlsx",
                        //         optsSingleCellSetting
                        //     })
                        // }
                    }

                    setPagination(response)
                }
            })
            .catch((e: any) => {
                failed("Data Export Failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    // Batch Export
    const inBatchExport = (index: number) => {
        if (!exportNumber.current) return
        const firstIndx = exportNumber.current * index
        const lastIndex =
            (index === frequency - 1 && exportDataBatch.current?.length) ||
            (exportNumber.current && exportNumber.current * (index + 1))
        const name = `${fileName}(No.${pagination.Pagination.Page}Page${
            exportNumber.current && firstIndx + 1
        }-${lastIndex})`
        const list: Array<string[]> = exportDataBatch.current?.slice(firstIndx, lastIndex + 1)
        export_json_to_excel({
            header: headerExcel.current,
            data: list,
            filename: name,
            autoWidth: true,
            bookType: "xlsx",
            optsSingleCellSetting: optsCell.current
        })
        setSelectItem(undefined)
    }

    const onChange = (page, pageSize) => {
        const query: PaginationProps = {
            Page: page,
            Limit: pageSize
        }
        toExcel(query)
    }

    const onSplitExport = useMemoizedFn((data, start, end) => {
        export_json_to_excel({
            header: headerExcel.current,
            data: data,
            filename: `${fileName}${start}-${end}`,
            autoWidth: true,
            bookType: "xlsx",
            optsSingleCellSetting: optsCell.current
        })
        setSelectItem(undefined)
    })
    return (
        <>
            {showButton ? (
                <>
                    <YakitButton loading={loading} type={newUIType} onClick={() => toExcel()} {...btnProps}>
                        {text || "Export Excel"}
                    </YakitButton>
                </>
            ) : (
                <>
                    <span onClick={() => toExcel()}>{text || "Export Excel"}</span>
                    {loading && <LoadingOutlined spin={loading} style={{marginLeft: 5}} />}
                </>
            )}
            <YakitModal
                title='Data Export'
                closable={true}
                visible={visible}
                onCancel={() => setVisible(false)}
                footer={null}
            >
                <div style={{padding: 24}}>
                    <Space wrap>
                        {Array.from({length: frequency}).map((_, index) => (
                            <YakitButton
                                type='outline2'
                                loading={selectItem === index}
                                disabled={typeof selectItem === "number"}
                                key={index}
                                onClick={() => {
                                    setSelectItem(index)
                                    setTimeout(() => {
                                        inBatchExport(index)
                                    }, 500)
                                }}
                            >
                                No.{pagination.Pagination.Page}Page
                                {exportNumber.current && exportNumber.current * index + 1}-
                                {(index === frequency - 1 && exportDataBatch.current?.length) ||
                                    (exportNumber.current && exportNumber.current * (index + 1))}
                            </YakitButton>
                        ))}
                    </Space>
                    <div className={styles["pagination"]}>
                        <Pagination
                            size='small'
                            total={pagination.Total}
                            current={Number(pagination.Pagination.Page)}
                            pageSize={pageSize}
                            showTotal={(total) => `Total ${total} Rows`}
                            hideOnSinglePage={true}
                            onChange={onChange}
                        />
                    </div>
                </div>
            </YakitModal>
            <YakitModal
                title='Data Export'
                closable={true}
                visible={splitVisible}
                onCancel={() => setSplitVisible(false)}
                footer={null}
            >
                <div style={{padding: 24}}>
                    <Space wrap>
                        {chunksData.map((item, index) => {
                            if (index === 0) {
                                beginNumberRef.current = 0
                            }
                            let start: number = beginNumberRef.current || 1
                            let end: number = beginNumberRef.current + item.length
                            beginNumberRef.current = end + 1
                            return (
                                <YakitButton
                                    loading={selectItem === index}
                                    disabled={typeof selectItem === "number"}
                                    key={index}
                                    type='outline2'
                                    onClick={() => {
                                        setSelectItem(index)
                                        setTimeout(() => {
                                            onSplitExport(item, start, end)
                                        }, 500)
                                    }}
                                >
                                    {start}-{end}
                                </YakitButton>
                            )
                        })}
                    </Space>
                </div>
            </YakitModal>
        </>
    )
}

interface ExportSelectProps {
    /* Export Fields */
    exportValue: string[]
    /* Pass Export Fields */
    setExportTitle: (v: string[]) => void
    /* Export Key for caching */
    exportKey: string
    /* Export Data Method */
    getData: (query: PaginationSchema) => Promise<any>
    /* Export File Name */
    fileName?: string
    /* limit */
    pageSize?: number
    initCheckValue?: string[]
}
// Export Field Selection
export const ExportSelect: React.FC<ExportSelectProps> = (props) => {
    const {exportValue, fileName, setExportTitle, exportKey, getData, pageSize, initCheckValue} = props
    const [checkValue, setCheckValue] = useState<CheckboxValueType[]>([])
    useEffect(() => {
        getRemoteValue(exportKey).then((setting) => {
            if (!setting) {
                // All fields selected by default on first entry
                setExportTitle(exportValue as string[])
                setCheckValue(initCheckValue || exportValue)
            } else {
                const values = JSON.parse(setting)
                setCheckValue(values?.checkedValues)
                setExportTitle(values?.checkedValues as string[])
            }
        })
    }, [])
    const onChange = (checkedValues: CheckboxValueType[]) => {
        const orderCheckedValues = exportValue.filter((item) => checkedValues.includes(item))
        setExportTitle(orderCheckedValues)
        setCheckValue(orderCheckedValues)
        setRemoteValue(exportKey, JSON.stringify({checkedValues: orderCheckedValues}))
    }
    return (
        <div className={styles["export-select"]}>
            <Checkbox.Group style={{width: "100%"}} value={checkValue} onChange={onChange}>
                <Row>
                    {exportValue.map((item) => (
                        <Col span={6} className={styles["item"]}>
                            <YakitCheckbox value={item}>{item}</YakitCheckbox>
                        </Col>
                    ))}
                </Row>
            </Checkbox.Group>
            <div className={styles["button-box"]}>
                <ExportExcel
                    btnProps={{
                        className: "button"
                    }}
                    newUIType='primary'
                    getData={getData}
                    fileName={fileName}
                    text='Export'
                    pageSize={pageSize}
                />
            </div>
        </div>
    )
}
