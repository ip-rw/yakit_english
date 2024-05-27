import React, {} from "react"
import {FuzzerSequenceWrapperProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {webFuzzerTabs} from "./WebFuzzerPage"

/**Only Wrap Sequence */
const FuzzerSequenceWrapper: React.FC<FuzzerSequenceWrapperProps> = React.memo((props) => {
    /**Click Switch Tab, With Additional Actions */
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        switch (key) {
            case "sequence":
                break
            default:
                emiter.emit("sendSwitchSequenceToMainOperatorContent", JSON.stringify({type: key}))
                // 标签切换&发送事件, 配置切换】/【活动标签规则类型
                emiter.emit("sequenceSendSwitchTypeToFuzzer", JSON.stringify({type: key}))
                break
        }
    })
    return (
        <div className={styles["web-fuzzer"]}>
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs.map((item) => (
                    <div
                        key={item.key}
                        className={classNames(styles["web-fuzzer-tab-item"], {
                            [styles["web-fuzzer-tab-item-active"]]: item.key === "sequence"
                        })}
                        onClick={() => {
                            const keyType = item.key as WebFuzzerType
                            onSetType(keyType)
                        }}
                    >
                        <span className={styles["web-fuzzer-tab-label"]}>{item.label}</span>
                        {item.icon}
                    </div>
                ))}
            </div>
            <div className={classNames(styles["web-fuzzer-tab-content"])}>{props.children}</div>
        </div>
    )
})

export default FuzzerSequenceWrapper
