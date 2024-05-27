import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "@ant-design/icons"
import {useGetState, useInViewport, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./DataStatistics.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {UserIcon} from "./icon"
import {SolidCalendarIcon, SolidTrendingdownIcon, SolidTrendingupIcon} from "@/assets/icon/solid"
import * as echarts from "echarts"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import numeral from "numeral"
import moment, {Moment} from "moment"
import "moment/locale/zh-cn"
import locale from "antd/es/date-picker/locale/zh_CN"
import {RangePickerProps} from "antd/lib/date-picker"
import {YakitDatePicker} from "@/components/yakitUI/YakitDatePicker/YakitDatePicker"
const {RangePicker} = YakitDatePicker
const {ipcRenderer} = window.require("electron")

// Convert Minutes to Hours, 2 Decimals
const minutesToHours = (minutes: number) => {
    return (minutes / 60).toFixed(2)
}


interface RiseLineEchartsProps {
    riseLineParams: RiseLineProps
    inViewport?: boolean
}

interface RiseLineProps {
    // Day/Month/Year Display
    showType: showTypeValue
    // Total/Growth: Total, Incr.
    changeType: "total" | "incr"
    // Custom Start Time
    startTime: number
    // Custom End Time
    endTime: number
}

const RiseLineEcharts: React.FC<RiseLineEchartsProps> = (props) => {
    const {inViewport, riseLineParams} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const optionRef = useRef<any>({
        color: "#4A3AFF", // Set Line Color
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "line"
            },
            formatter: "{b} : {c}"
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: []
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    type: "dashed" // Set Dashed Horizontal Lines
                }
            },
            axisLabel: {
                formatter: (value) => {
                    // Divide Y-axis by 1000 and Add 'k' Suffix
                    if (value < 1000) {
                        return value
                    } else {
                        return `${value / 1000}k`
                    }
                }
            }
        },
        series: [
            {
                data: [],
                type: "line",
                symbol: "circle", // Set Connect Point Shape Circle
                symbolSize: 14, // Set Connect Point Size 14
                itemStyle: {
                    color: "#4A3AFF", // Set Connect Point Color Black
                    borderColor: "#FFFFFF", // Set Connect Point Border Color
                    borderWidth: 2 // Set Connect Point Border Width
                },
                lineStyle: {
                    color: "#C893FD" // Set Line Color
                }
            },
            {
                type: "bar",
                stack: "1",
                barWidth: 8,
                data: [],
                itemStyle: {
                    color: "#EAECF3" // Set Bar Chart Background Gray
                }
            }
        ],
        grid: {
            top: "5%", // Top Margin
            bottom: "10%", // Bottom Margin
            left: "5%", // Left Margin
            right: "5%" // Right Margin
        }
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1920) {
            optionRef.current.grid.left = "3%"
            setEcharts(optionRef.current)
        } else if (width > 1050) {
            optionRef.current.grid.left = "5%"
            setEcharts(optionRef.current)
        } else {
            optionRef.current.grid.left = "8%"
            setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            getRiseLine()
        }
    }, [inViewport])

    useUpdateEffect(() => {
        getRiseLine()
    }, [riseLineParams])

    useEffect(() => {
        if (!echartsRef.current) return
        //Unbind events to prevent duplicates
        // echartsRef.current.off("click")
        // echartsRef.current.off("legendselectchanged")
        // echartsRef.current.on("click", function (params) {
        //     // console.log("Click", params)
        // })
        // echartsRef.current.on("legendselectchanged", (e) => {
        //     // console.log("Clicked", e) // Without Off Event, Triggers Stack
        // })
    }, [])
    const getRiseLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<RiseLineProps, API.TouristActiveResponse>({
            method: "get",
            url: "tourist/change",
            params: {...riseLineParams}
        })
            .then((res: API.TouristActiveResponse) => {
                if (res.data) {
                    let XData: string[] = []
                    let YData: number[] = []
                    res.data.forEach((item) => {
                        XData.push(item.searchTime)
                        YData.push(item.count)
                    })
                    optionRef.current.xAxis.data = XData
                    optionRef.current.series[0].data = YData
                    optionRef.current.series[1].data = YData
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("User Count Change Failed:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })
    const setEcharts = (options) => {
        const chartDom = document.getElementById("data-statistics-risk-line")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='data-statistics-risk-line'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        />
    )
}

interface ActiveLineEchartsProps {
    activeLineParams: ActiveLineProp
    inViewport?: boolean
    activeOrTime: "active" | "times"
}
interface ActiveLineProp {
    // Day/Month/Year Display
    showType: showTypeValue
    // Custom Start Time
    startTime: number
    // Custom End Time
    endTime: number
}

const ActiveLineEcharts: React.FC<ActiveLineEchartsProps> = (props) => {
    const {inViewport, activeLineParams, activeOrTime} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const optionRef = useRef<any>({
        color: "#4A3AFF", // Set Line Color
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "line"
            },
            formatter: "{b} : {c}"
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: []
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    type: "dashed" // Set Dashed Horizontal Lines
                }
            },
            axisLabel: {
                formatter: (value) => {
                    // Divide Y-axis by 1000 and Add 'k' Suffix
                    if (value < 1000) {
                        return value
                    } else {
                        return `${value / 1000}k`
                    }
                }
            }
        },
        series: [
            {
                data: [],
                type: "line",
                // symbol: "none", // Hide Breakpoints
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: "rgba(74, 58, 255, 0.5)" // Start Color
                            },
                            {
                                offset: 1,
                                color: "rgba(255, 255, 255, 0.5)" // End Color
                            }
                        ]
                    }
                }
            }
        ],
        grid: {
            top: "5%", // Top Margin
            bottom: "10%", // Bottom Margin
            left: "5%", // Left Margin
            right: "5%" // Right Margin
        }
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1920) {
            optionRef.current.grid.left = "3%"
            setEcharts(optionRef.current)
        } else if (width > 1050) {
            optionRef.current.grid.left = "5%"
            setEcharts(optionRef.current)
        } else {
            optionRef.current.grid.left = "8%"
            setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            activeOrTime === "active" ? getActiveLine() : getUsedTimeLine()
        }
    }, [inViewport])

    useUpdateEffect(() => {
        activeOrTime === "active" ? getActiveLine() : getUsedTimeLine()
    }, [activeLineParams,activeOrTime])

    useEffect(() => {
        if (!echartsRef.current) return
        //Unbind events to prevent duplicates
        // echartsRef.current.off("click")
        // echartsRef.current.off("legendselectchanged")
        // echartsRef.current.on("click", function (params) {
        //     // console.log("Click", params)
        // })
        // echartsRef.current.on("legendselectchanged", (e) => {
        //     // console.log("Clicked", e) // Without Off Event, Triggers Stack
        // })
    }, [])

    // Activity Statistics
    const getActiveLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<ActiveLineProp, API.TouristIncrResponse>({
            method: "get",
            url: "tourist/active",
            params: {...activeLineParams}
        })
            .then((res: API.TouristIncrResponse) => {
                if (res.data) {
                    let XData: string[] = []
                    let YData: number[] = []
                    res.data.forEach((item) => {
                        XData.push(item.searchTime)
                        YData.push(item.count)
                    })
                    optionRef.current.xAxis.data = XData
                    optionRef.current.series[0].data = YData
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("Activity Data Fetch Failed:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    // Duration Statistics
    const getUsedTimeLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<ActiveLineProp, API.TouristIncrResponse>({
            method: "get",
            url: "tourist/used/time",
            params: {...activeLineParams}
        })
            .then((res: API.TouristIncrResponse) => {
                if (res.data) {
                    let XData: string[] = []
                    let YData: string[] = []
                    res.data.forEach((item) => {
                        XData.push(item.searchTime)
                        YData.push(minutesToHours(item.count))
                    })
                    optionRef.current.xAxis.data = XData
                    optionRef.current.series[0].data = YData
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("Activity Data Fetch Failed:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    const setEcharts = (options) => {
        const chartDom = document.getElementById("data-statistics-active-line")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='data-statistics-active-line'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        />
    )
}
interface PieChartProps {
    inViewport?: boolean
    setCityDate: (v: number) => void
}
interface echartListProps {
    name: string
    value: number
}
const PieEcharts: React.FC<PieChartProps> = (props) => {
    const {inViewport, setCityDate} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const chartListRef = useRef<echartListProps[]>([])
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const colorList = [
        "#8863F7",
        "#DA5FDD",
        "#4A94F8",
        "#29BCD0",
        "#35D8EE",
        "#56C991",
        "#F4736B",
        "#FFB660",
        "#FFD583",
        "#B4BBCA",
        "#F28B44"
    ]
    const optionRef = useRef<any>({
        color: colorList,
        title: {
            show: false,
            text: 0,
            subtext: "Total Users",
            top: "32%",
            left: "49%",
            // right: "50%",
            textAlign: "center",
            itemGap: 0,
            triggerEvent: true,
            textStyle: {
                fontSize: 40,
                color: "#31343F",
                lineHeight: 52,
                fontWeight: 700
            },
            subtextStyle: {
                color: "#B4BBCA",
                fontSize: 18,
                lineHeight: 30,
                fontWeight: 400
            }
        },
        tooltip: {
            trigger: "item",
            formatter: "{b} : {c} ({d}%)"
        },
        legend: {
            show: true,
            bottom: 0, // Set Legend Bottom Margin
            left: "center",
            orient: "horizontal",
            icon: "circle",
            // width: 300, // Set Legend Width
            padding: [0, 0, 0, 0],
            // Dot size & position
            itemWidth: 13,
            itemHeight: 7,
            itemStyle: {
                borderWidth: 0
                // borderColor:"#0ba5ff"
            },
            itemGap: 18, // Set Legend Item Spacing
            formatter: (name) => {
                try {
                    const itemValue = chartListRef.current.filter((item) => item.name === name)[0].value
                    return "{name|" + name + "} " + "{value|" + itemValue + "}"
                } catch (error) {
                    return ""
                }
            },
            textStyle: {
                rich: {
                    name: {
                        color: "#85899E",
                        fontSize: 12,
                        marginRight: 12
                    },
                    value: {
                        color: "#31343F",
                        fontSize: 14,
                        fontWeight: 500,
                        align: "right"
                    }
                }
            }
        },

        series: [
            {
                // Pie chart inner & outer radius
                radius: ["48%", "78%"],
                // Pie chart position
                center: ["50%", "40%"],
                itemStyle: {
                    borderColor: "#FFFFFF",
                    borderWidth: 2,
                    borderRadius: [5, 5, 5, 5]
                },
                avoidLabelOverlap: false,
                type: "pie",
                label: {
                    show: false
                },
                labelLine: {
                    show: false
                },

                data: []
                // hoverAnimation: false, // Disable Hover Effect
            }
        ]
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1100) {
            optionRef.current.legend.show = true
            setEcharts(optionRef.current)
        } else {
            optionRef.current.legend.show = false
            setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            getPluginSearch()
        }
    }, [inViewport])

    useEffect(() => {
        if (!echartsRef.current) return
        //Unbind events to prevent duplicates
        // echartsRef.current.off("click")
        // echartsRef.current.off("legendselectchanged")
        // echartsRef.current.on("click", function (params) {
        //     // console.log("Click", params)
        // })
        // echartsRef.current.on("legendselectchanged", (e) => {
        //     // console.log("Clicked", e) // Without Off Event, Triggers Stack
        // })
    }, [])

    const getPluginSearch = useMemoizedFn(() => {
        NetWorkApi<null, API.TouristCityResponse>({
            method: "get",
            url: "tourist/city"
        })
            .then((res: API.TouristCityResponse) => {
                if (res.data) {
                    const chartListCache = res.data.map((item) => ({
                        name: item.city,
                        value: item.count
                    }))
                    optionRef.current.series[0].data = chartListCache
                    optionRef.current.title.text = res.total
                    optionRef.current.title.show = true
                    chartListRef.current = chartListCache
                    setCityDate(res.date)
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("Geo Location Fetch Failed:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    const setEcharts = (options) => {
        const chartDom = document.getElementById("data-statistics-pie")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='data-statistics-pie'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        />
    )
}

interface UpsOrDownsProps {
    type?: string //"up" | "down"
    value?: string
}
export const UpsOrDowns: React.FC<UpsOrDownsProps> = (props) => {
    const {type = "", value = ""} = props
    return (
        <div
            className={classNames(styles["ups-or-downs"], {
                [styles["type-up"]]: type === "up",
                [styles["type-down"]]: type === "down",
                [styles["type-keep"]]: type !== "down" && type !== "up"
            })}
        >
            <div className={classNames(styles["content"])}>
                {type === "up" && "+"}
                {type === "down" && "-"}
                {value ? `${value}%` : ""}
            </div>
            {["up", "down"].includes(type) && (
                <div className={styles["icon"]}>
                    {type === "up" ? <SolidTrendingupIcon /> : <SolidTrendingdownIcon />}
                </div>
            )}
        </div>
    )
}
type RangeValue = [Moment | null, Moment | null] | null
type showTypeValue = "day" | "month" | "year"
export interface DataStatisticsProps {}
export const DataStatistics: React.FC<DataStatisticsProps> = (props) => {
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    // Fetch Current Date
    const today = moment()
    // Earliest Revelation Time
    const beginDate = moment("2023-12-01")
    // Calc. 30 Days Ago
    const thirtyDaysAgo = today.clone().subtract(30, "days")
    // Calc. Last Month's First Day 00:00:00
    // const previousMonthFirstDay = today.clone().subtract(1, "months").startOf("month")
    // // Calc. Last Year's First Day 00:00:00
    // const previousYearFirstDay = today.clone().subtract(1, "years").startOf("year")
    const [userData, setUserData] = useState<API.TouristAndUserResponse>()
    const [loading, setLoading] = useState<boolean>(false)
    const [activeLineParams, setActiveLineParams] = useState<ActiveLineProp>({
        showType: "day",
        startTime: moment(thirtyDaysAgo).unix(),
        endTime: moment(today).unix()
    })
    const [riseLineParams, setRiseLineParams] = useState<RiseLineProps>({
        changeType: "total",
        showType: "day",
        startTime: moment(thirtyDaysAgo).unix(),
        endTime: moment(today).unix()
    })
    const [cityDate, setCityDate] = useState<number>()

    const [activeOrTime, setActiveOrTime] = useState<"active" | "times">("active")

    // Display Options
    const [activeNoShowType, setActiveNoShowType] = useState<showTypeValue[]>([])
    useEffect(() => {
        const firstDate = moment.unix(activeLineParams.startTime)
        const secondDate = moment.unix(activeLineParams.endTime)
        // Days >= 60
        const isDifferenceGreaterThan60Days = firstDate.diff(secondDate, "days") > 60
        // Month >= 60
        const isDifferenceGreaterThan60Months = firstDate.diff(secondDate, "months") > 60
        // Year >= 60
        const isDifferenceGreaterThan60Years = firstDate.diff(secondDate, "years") > 60
        let arr: showTypeValue[] = []
        // Days > 60 Unselectable
        if (isDifferenceGreaterThan60Days) {
            arr.push("day")
        }
        // Month > 60 Unselectable
        if (isDifferenceGreaterThan60Months) {
            arr.push("month")
        }
        // Year > 60 Unselectable
        if (isDifferenceGreaterThan60Years) {
            arr.push("year")
        }
        setActiveNoShowType(arr)
    }, [activeLineParams])
    const getActiveShowType = useMemo(() => {
        return [
            {
                label: "Days",
                value: "day",
                disabled: activeNoShowType.includes("day")
            },
            {
                label: "Month",
                value: "month",
                disabled: activeNoShowType.includes("month")
            },
            {
                label: "Year",
                value: "year",
                disabled: activeNoShowType.includes("year")
            }
        ]
    }, [activeNoShowType])

    // Display Options
    const [riseNoShowType, setRiseNoShowType] = useState<showTypeValue[]>([])
    useEffect(() => {
        const firstDate = moment.unix(riseLineParams.startTime)
        const secondDate = moment.unix(riseLineParams.endTime)
        // Days >= 60
        const isDifferenceGreaterThan60Days = firstDate.diff(secondDate, "days") > 60
        // Month >= 60
        const isDifferenceGreaterThan60Months = firstDate.diff(secondDate, "months") > 60
        // Year >= 60
        const isDifferenceGreaterThan60Years = firstDate.diff(secondDate, "years") > 60
        let arr: showTypeValue[] = []
        // Days > 60 Unselectable
        if (isDifferenceGreaterThan60Days) {
            arr.push("day")
        }
        // Month > 60 Unselectable
        if (isDifferenceGreaterThan60Months) {
            arr.push("month")
        }
        // Year > 60 Unselectable
        if (isDifferenceGreaterThan60Years) {
            arr.push("year")
        }
        setRiseNoShowType(arr)
    }, [riseLineParams])
    const getRiseShowType = useMemo(() => {
        return [
            {
                label: "Days",
                value: "day",
                disabled: riseNoShowType.includes("day")
            },
            {
                label: "Month",
                value: "month",
                disabled: riseNoShowType.includes("month")
            },
            {
                label: "Year",
                value: "year",
                disabled: riseNoShowType.includes("year")
            }
        ]
    }, [riseNoShowType])

    useEffect(() => {
        getUserData()
    }, [])

    const getUserData = useMemoizedFn(() => {
        setLoading(true)
        NetWorkApi<null, API.TouristAndUserResponse>({
            url: "tourist",
            method: "get"
        })
            .then((data) => {
                console.log("Statistics", data)

                setUserData(data)
            })
            .catch((err) => {})
            .finally(() => {
                setLoading(false)
            })
    })

    const [riseDates, setRiseDates] = useState<RangeValue>(null)
    const [riseHackValue, setRiseHackValue] = useState<RangeValue>(null)
    const [activeDates, setActiveDates] = useState<RangeValue>(null)
    const [activeHackValue, setActiveHackValue] = useState<RangeValue>(null)

    const disabledRiseLineDate: RangePickerProps["disabledDate"] = (current) => {
        if (riseLineParams.showType === "day") {
            if (riseDates) {
                const tooLate = (riseDates[0] && current.diff(riseDates[0], "days") > 60) || false
                const tooEarly = (riseDates[1] && riseDates[1].diff(current, "days") > 60) || false
                return current && (current < beginDate || current >= moment().endOf("day") || tooLate || tooEarly)
            }
            return current && (current < beginDate || current >= moment().endOf("day"))
        } else if (riseLineParams.showType === "month") {
            if (riseDates) {
                const tooLate = (riseDates[0] && current.diff(riseDates[0], "months") > 60) || false
                const tooEarly = (riseDates[1] && riseDates[1].diff(current, "months") > 60) || false
                return (
                    current &&
                    (current < moment("2023-12") || current >= moment().endOf("month") || tooLate || tooEarly)
                )
            }
            return current && (current < moment("2023-12") || current >= moment().endOf("month"))
        } else {
            if (riseDates) {
                const tooLate = (riseDates[0] && current.diff(riseDates[0], "years") > 60) || false
                const tooEarly = (riseDates[1] && riseDates[1].diff(current, "years") > 60) || false
                return current && (current < moment("2023") || current >= moment().endOf("year") || tooLate || tooEarly)
            }
            return current && (current < moment("2023") || current >= moment().endOf("year"))
        }
    }

    const disabledActiveLineDate: RangePickerProps["disabledDate"] = (current) => {
        if (activeLineParams.showType === "day") {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "days") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "days") > 60) || false
                return current && (current < beginDate || current >= moment().endOf("day") || tooLate || tooEarly)
            }
            return current && (current < beginDate || current >= moment().endOf("day"))
        } else if (activeLineParams.showType === "month") {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "months") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "months") > 60) || false
                return (
                    current &&
                    (current < moment("2023-12") || current >= moment().endOf("month") || tooLate || tooEarly)
                )
            }
            return current && (current < moment("2023-12") || current >= moment().endOf("month"))
        } else {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "years") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "years") > 60) || false
                return current && (current < moment("2023") || current >= moment().endOf("year") || tooLate || tooEarly)
            }
            return current && (current < moment("2023") || current >= moment().endOf("year"))
        }
    }

    const getDateFormat = (v: showTypeValue) => {
        if (v === "day") {
            return "YYYY/MM/DD"
        } else if (v === "month") {
            return "YYYY/MM"
        } else {
            return "YYYY"
        }
    }

    return (
        <div className={styles["data-statistics"]} ref={ref}>
            <div className={styles["left-box"]}>
                <div className={styles["user-box"]}>
                    <YakitSpin spinning={loading}>
                        <div className={styles["user-sum"]}>
                            <div className={styles["all-user"]}>
                                <div className={styles["user-icon"]}>
                                    <UserIcon />
                                </div>
                                <div className={styles["count-box"]}>
                                    <div className={styles["count"]}>
                                        {userData ? numeral(userData.touristTotal).format("0,0") : ""}
                                    </div>
                                    <div className={styles["sub-title"]}>Institutional Users</div>
                                </div>
                            </div>
                            <div className={styles["login-user"]}>
                                <div className={styles["count"]}>
                                    {userData ? numeral(userData.loginTotal).format("0,0") : ""}
                                </div>
                                <div className={styles["sub-title"]}>Total Login Users</div>
                            </div>
                        </div>
                        <div className={styles["card-box"]}>
                            <div className={classNames(styles["day-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.dayNew ?? ""}</div>
                                    <UpsOrDowns type={userData?.dayGainUpOrDown} value={userData?.dayGain} />
                                </div>

                                <div className={styles["title"]}>New Users Today</div>
                            </div>
                            <div className={classNames(styles["week-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.weekNew ?? ""}</div>
                                    <UpsOrDowns type={userData?.weekGainUpOrDown} value={userData?.weekGain} />
                                </div>
                                <div className={styles["title"]}>New Users This Week</div>
                            </div>
                            <div className={classNames(styles["month-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.monthNew ?? ""}</div>
                                    <UpsOrDowns type={userData?.monthGainUpOrDown} value={userData?.monthGain} />
                                </div>
                                <div className={styles["title"]}>New Users This Month</div>
                            </div>
                        </div>
                    </YakitSpin>
                </div>

                <div className={styles["v-line"]} />
                <div className={styles["pie-charts-box"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>Top 10 User Geo Locations</div>
                        <div className={styles["extra"]}>
                            {cityDate && (
                                <>
                                    <div className={styles["icon"]}>
                                        <SolidCalendarIcon />
                                    </div>
                                    <div className={styles["date"]}>
                                        {moment.unix(cityDate).format("YYYY-MM-DD HH:mm:ss")}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={styles["pie-charts"]}>
                        {/* Zooming In Chart Adjusts, Zooming Out Breaks (Not Adaptive). Reason: Flex Layout of Chart's Parent Causes Issue. Suggest Using Percentage.*/}
                        <PieEcharts inViewport={inViewport} setCityDate={setCityDate} />
                    </div>
                </div>
            </div>
            <div className={styles["right-box"]}>
                <div className={styles["user-active-time"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <YakitRadioButtons
                                value={activeOrTime}
                                onChange={(e) => {
                                    setActiveOrTime(e.target.value)
                                }}
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "active",
                                        label: "Activity Statistics"
                                    },
                                    {
                                        value: "times",
                                        label: "Duration Statistics"
                                    }
                                ]}
                            />
                        </div>
                        <div className={styles["extra"]}>
                            <RangePicker
                                locale={locale}
                                value={
                                    activeHackValue || [
                                        moment.unix(activeLineParams.startTime),
                                        moment.unix(activeLineParams.endTime)
                                    ]
                                }
                                format={getDateFormat(activeLineParams.showType)}
                                allowClear={false}
                                disabledDate={disabledActiveLineDate}
                                onOpenChange={(open: boolean) => {
                                    if (open) {
                                        setActiveHackValue([null, null])
                                        setActiveDates([null, null])
                                    } else {
                                        setActiveHackValue(null)
                                    }
                                }}
                                picker={activeLineParams.showType === "day" ? "date" : activeLineParams.showType}
                                onCalendarChange={(val) => setActiveDates(val)}
                                onChange={(time) => {
                                    const riseDates = time as [Moment, Moment] | null
                                    if (riseDates) {
                                        let firstDate = riseDates[0]
                                        let secondDate = riseDates[1]
                                        if (activeLineParams.showType === "day") {
                                            if (firstDate.isBefore(beginDate)) {
                                                firstDate = beginDate
                                            } else {
                                                firstDate = moment(firstDate).startOf("day")
                                            }
                                            if (secondDate.isSame(today, "day")) {
                                                secondDate = today
                                            } else {
                                                secondDate = moment(secondDate).endOf("day")
                                            }
                                        }
                                        if (activeLineParams.showType === "month") {
                                            if (firstDate.isBefore(beginDate)) {
                                                firstDate = beginDate
                                            } else {
                                                firstDate = moment(firstDate).startOf("month")
                                            }
                                            if (secondDate.isSame(today, "month")) {
                                                secondDate = today
                                            } else {
                                                secondDate = moment(secondDate).endOf("month")
                                            }
                                        }
                                        if (activeLineParams.showType === "year") {
                                            if (firstDate.isBefore(beginDate)) {
                                                firstDate = beginDate
                                            } else {
                                                firstDate = moment(firstDate).startOf("year")
                                            }
                                            if (secondDate.isSame(today, "year")) {
                                                secondDate = today
                                            } else {
                                                secondDate = moment(secondDate).endOf("year")
                                            }
                                        }
                                        setActiveLineParams({
                                            ...activeLineParams,
                                            startTime: moment(firstDate).unix(),
                                            endTime: moment(secondDate).unix()
                                        })
                                    }
                                }}
                            />
                            <YakitSegmented
                                value={activeLineParams?.showType}
                                onChange={(v) => {
                                    const showType: showTypeValue = v as showTypeValue
                                    setActiveLineParams({
                                        ...activeLineParams,
                                        showType
                                    })
                                }}
                                options={getActiveShowType}
                            />
                        </div>
                    </div>
                    <div>
                        <YakitSpin spinning={loading}>
                            <div className={styles["card-box"]}>
                                {activeOrTime === "active" ? (
                                    <>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? numeral(userData.dayActive).format("0,0") : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.dayActiveGainUpOrDown}
                                                    value={userData?.dayActiveGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>Daily Active Users</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? numeral(userData.weekActive).format("0,0") : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.weekActiveGainUpOrDown}
                                                    value={userData?.weekActiveGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>Weekly Active Users</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? numeral(userData.monthActive).format("0,0") : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.monthActiveGainUpOrDown}
                                                    value={userData?.monthActiveGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>Monthly Active Users</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? minutesToHours(userData.dayTimes) : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.dayTimesGainUpOrDown}
                                                    value={userData?.dayTimesGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>Today's Total Duration/h</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? minutesToHours(userData.weekTimes) : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.weekTimesGainUpOrDown}
                                                    value={userData?.weekTimesGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>Total Duration This Week/h</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? minutesToHours(userData.monthTimes) : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.monthTimesGainUpOrDown}
                                                    value={userData?.monthTimesGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>This Month's Total Duration/h</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </YakitSpin>
                    </div>
                    <div className={styles["active-line-charts"]}>
                        <ActiveLineEcharts
                            inViewport={inViewport}
                            activeLineParams={activeLineParams}
                            activeOrTime={activeOrTime}
                        />
                    </div>
                </div>
                <div className={styles["user-rise"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <div className={styles["text"]}>User Count Trend</div>
                            <div className={styles["radio-btn"]}>
                                <YakitRadioButtons
                                    value={riseLineParams.changeType}
                                    onChange={(e) => {
                                        setRiseLineParams({...riseLineParams, changeType: e.target.value})
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {
                                            value: "total",
                                            label: "Total"
                                        },
                                        {
                                            value: "incr",
                                            label: "Growth"
                                        }
                                    ]}
                                />
                            </div>
                        </div>
                        <div className={styles["extra"]}>
                            <div className={styles["range-picker"]}>
                                <RangePicker
                                    locale={locale}
                                    value={
                                        riseHackValue || [
                                            moment.unix(riseLineParams.startTime),
                                            moment.unix(riseLineParams.endTime)
                                        ]
                                    }
                                    format={getDateFormat(riseLineParams.showType)}
                                    allowClear={false}
                                    disabledDate={disabledRiseLineDate}
                                    onOpenChange={(open: boolean) => {
                                        if (open) {
                                            setRiseHackValue([null, null])
                                            setRiseDates([null, null])
                                        } else {
                                            setRiseHackValue(null)
                                        }
                                    }}
                                    picker={riseLineParams.showType === "day" ? "date" : riseLineParams.showType}
                                    onCalendarChange={(val) => setRiseDates(val)}
                                    onChange={(time) => {
                                        const riseDates = time as [Moment, Moment] | null
                                        if (riseDates) {
                                            let firstDate = riseDates[0]
                                            let secondDate = riseDates[1]
                                            if (riseLineParams.showType === "day") {
                                                if (firstDate.isBefore(beginDate)) {
                                                    firstDate = beginDate
                                                } else {
                                                    firstDate = moment(firstDate).startOf("day")
                                                }
                                                if (secondDate.isSame(today, "day")) {
                                                    secondDate = today
                                                } else {
                                                    secondDate = moment(secondDate).endOf("day")
                                                }
                                            }
                                            if (riseLineParams.showType === "month") {
                                                if (firstDate.isBefore(beginDate)) {
                                                    firstDate = beginDate
                                                } else {
                                                    firstDate = moment(firstDate).startOf("month")
                                                }
                                                if (secondDate.isSame(today, "month")) {
                                                    secondDate = today
                                                } else {
                                                    secondDate = moment(secondDate).endOf("month")
                                                }
                                            }
                                            if (riseLineParams.showType === "year") {
                                                if (firstDate.isBefore(beginDate)) {
                                                    firstDate = beginDate
                                                } else {
                                                    firstDate = moment(firstDate).startOf("year")
                                                }
                                                if (secondDate.isSame(today, "year")) {
                                                    secondDate = today
                                                } else {
                                                    secondDate = moment(secondDate).endOf("year")
                                                }
                                            }
                                            setRiseLineParams({
                                                ...riseLineParams,
                                                startTime: moment(firstDate).unix(),
                                                endTime: moment(secondDate).unix()
                                            })
                                        }
                                    }}
                                />
                            </div>

                            <YakitSegmented
                                value={riseLineParams?.showType}
                                onChange={(v) => {
                                    const showType: showTypeValue = v as showTypeValue
                                    setRiseLineParams({
                                        ...riseLineParams,
                                        showType
                                    })
                                }}
                                options={getRiseShowType}
                            />
                        </div>
                    </div>
                    <div className={styles["user-rise-charts"]}>
                        <RiseLineEcharts inViewport={inViewport} riseLineParams={riseLineParams} />
                    </div>
                </div>
            </div>
        </div>
    )
}
