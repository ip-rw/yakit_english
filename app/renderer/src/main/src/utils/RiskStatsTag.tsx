import React, {useEffect, useState} from "react";
import {Badge, Button, Popover, Space, Tag} from "antd";
import {failed, info} from "./notification";
import {showDrawer} from "./showModal";
import {RiskTable} from "../pages/risks/RiskTable";
import {PaginationSchema, QueryGeneralResponse} from "../pages/invoker/schema";
import {Risk} from "../pages/risks/schema";
import {useGetState, useMemoizedFn} from "ahooks";

export interface RiskStatsTagProp {
    professionalMode?: boolean
}

const {ipcRenderer} = window.require("electron");

export const RiskStatsTag: React.FC<RiskStatsTagProp> = React.memo((props) => {
    const [originTotal, setOriginTotal] = useState(0);
    const [total, setTotal] = useState(0);

    const [originCriticalOrHigh, setOriginCriticalOrHigh, getOriginCriticalOrHigh] = useGetState(0);
    const [criticalOrHigh, setCriticalOrHigh] = useState(0);
    const [latestRisk, setLatestRisk] = useState<Risk>();

    const updateHighOrCritical = useMemoizedFn(() => {
        ipcRenderer.invoke("QueryRisks", {
            ...{Severity: "high,critical"},
            Pagination: {Limit: 1, Page: 1, Order: "desc", OrderBy: "updated_at"} as PaginationSchema,
        }).then((r: QueryGeneralResponse<Risk>) => {
            if ((r?.Data || []).length > 0) {
                setLatestRisk(r.Data[0])
            }
            const total = r?.Total || 0;
            setCriticalOrHigh(total)
            if (originCriticalOrHigh === 0) {
                setOriginCriticalOrHigh(total)
            }
        }).catch((e) => {
        }).finally(() => setTimeout(() => {
            // setLoading(false)
        }, 300))
    })

    const updateTotal = useMemoizedFn((after?: () => any) => {
        ipcRenderer.invoke("QueryRisks", {
            Pagination: {Limit: 1, Page: 1, Order: "desc", OrderBy: "updated_at"} as PaginationSchema,
        }).then((r: QueryGeneralResponse<Risk>) => {
            const total = r?.Total || 0;
            setTotal(total)
            if (originTotal === 0) {
                setOriginTotal(total)
            }
            if (after) {
                after()
            }
        }).catch((e) => {
        }).finally(() => setTimeout(() => {
            // setLoading(false)
        }, 300))
    })

    useEffect(() => {
        const update = () => updateTotal(updateHighOrCritical);
        update()
        let id = setInterval(update, 5000);
        return () => {
            clearInterval(id);
        }
    }, [])

    const viewAll = useMemoizedFn((severity?: string) => {
        return <Button type={"primary"} size={"small"}
                       onClick={() => {
                           showDrawer({
                               title: "Vulnerabilities && Risks",
                               width: "70%",
                               content: <>
                                   <RiskTable severity={severity}/>
                               </>
                           })
                       }}
        >All Vulnerabilities & Risks</Button>
    });

    const calcCriticalDelta = useMemoizedFn(() => {
        if (originCriticalOrHigh <= 0) {
            return 0
        }
        if (criticalOrHigh <= 0) {
            return 0
        }

        if (criticalOrHigh > originCriticalOrHigh) {
            return criticalOrHigh - originCriticalOrHigh
        }
        return 0
    })

    const calcOriginDelta = useMemoizedFn(() => {
        if (originTotal <= 0 || total <= 0) {
            return 0
        }

        if (total > originTotal) {
            return total - originTotal
        }
        return 0
    })

    const criticalDelta = calcCriticalDelta();
    const ordinaryDelta = calcOriginDelta() - criticalDelta;

    return <Space size={0}>
        <Popover
            title={"Vulnerabilities & Risks Count"}
            content={<Space>
                <Button onClick={() => {
                    setOriginTotal(0)
                    setOriginCriticalOrHigh(0)
                }} size={"small"}>Mark as Read (All)</Button>
                {viewAll("high|critical")}
            </Space>}
        >
            <Tag
                color={criticalDelta > 0 ? "red" : undefined}
            >High Risk/Severe{criticalDelta > 0 ? `(+${criticalDelta})` : `(No New Additions)`}
            </Tag>
        </Popover>
        {ordinaryDelta > 0 && props.professionalMode && <Popover
            title={"Vulnerabilities & Risks Count"}
            content={<Space>
                <Button onClick={() => {
                    setOriginTotal(0)
                    setOriginCriticalOrHigh(0)
                }} size={"small"}>Mark as Read (All)</Button>
                {viewAll()}
            </Space>}
        >
            <Tag
                color={ordinaryDelta > 0 ? "orange" : undefined}
            >Mid-Low Risk/Parse content in plugin backend stream{ordinaryDelta > 0 ? `(+${ordinaryDelta})` : `(No New Additions)`}
            </Tag>
        </Popover>}
    </Space>
});