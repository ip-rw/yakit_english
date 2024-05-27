import React, {memo} from "react"
import {Button, Modal} from "antd"

import "./SecondConfirm.scss"
import { YakitButton } from "../yakitUI/YakitButton/YakitButton"

export interface SecondConfirmProps {
    visible: boolean
    onCancel: (flag: number) => any
}

export const SecondConfirm: React.FC<SecondConfirmProps> = memo((props) => {
    const {visible, onCancel} = props

    const kindClick = (flag: number) => onCancel(flag)

    return (
        <Modal
            wrapClassName='second-confirm-dialog'
            visible={!!visible}
            width={260}
            centered={true}
            closable={false}
            destroyOnClose={true}
            footer={null}
            onCancel={() => kindClick(0)}
        >
            <div className='second-confirm-container'>
                <div className='container-title'>Confirm closure?</div>

                <div className='container-subtitle'>Irreversible after closure</div>

                <div className='container-btn'>
                    <YakitButton type="outline1" onClick={() => kindClick(1)} size="large">
                        Cancel
                    </YakitButton>
                    <YakitButton type="primary" onClick={() => kindClick(2)} size="large">
                        Confirm
                    </YakitButton>
                </div>
            </div>
        </Modal>
    )
})
