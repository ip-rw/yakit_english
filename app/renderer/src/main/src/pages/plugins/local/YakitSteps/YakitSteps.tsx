import React, {useEffect} from "react"
import {YakitStepProps, YakitStepsProps} from "./YakitStepsType"
import styles from "./YakitSteps.module.scss"
import {Steps} from "antd"

import classNames from "classnames"

const {Step} = Steps
/** YakitSteps/YakitStep is currently used only for batch uploads in the plugin store, not intended as a public component for now, future needs can be discussed later. */
const YakitSteps: React.FC<YakitStepsProps> = React.memo((props) => {
    useEffect(() => {}, [])
    return (
        <Steps {...props} size='small' className={classNames(styles["yakit-steps"], props.className)}>
            {props.children}
        </Steps>
    )
})

const YakitStep: React.FC<YakitStepProps> = React.memo((props) => {
    return <Step {...props} className={classNames(styles["yakit-step"], props.className)} />
})

export default Object.assign(YakitSteps, {YakitStep})
