import React, {useState} from "react";
import {Button, Form} from "antd";
import {InputInteger, InputItem} from "../../utils/inputUtil";
import {failed} from "../../utils/notification";

export interface CreateShellReceiverFormProp {
    title?: string
    onCreated: (addr: string) => any
    onCheck: (addr: string) => boolean
}

export const CreateShellReceiverForm: React.FC<CreateShellReceiverFormProp> = (props) => {
    const [host, setHost] = useState("0.0.0.0");
    const [port, setPort] = useState(8085);

    return <div>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            if (!host) {
                failed("Host address required")
                return
            }

            if (port <= 0 || port > 65535) {
                failed(`Invalid port setting, cannot be: [${port}]`)
                return
            }

            const addr = `${host}:${port}`;
            if (props.onCheck(addr)) {
                props.onCreated(addr)
            }

        }} wrapperCol={{span: 14}} labelCol={{span: 6}}>
            {props.title && <Form.Item label={" "} colon={false}>
                <h2 style={{marginTop: 30}}>{props.title}</h2>
            </Form.Item>}
            <InputItem
                label={"Host to Monitor"} value={host} setValue={setHost}
                autoComplete={[
                    "0.0.0.0", "127.0.0.1", "192.168.1.235",
                ]}
            />
            <InputInteger
                label={"Port"} value={port} setValue={setPort}
                min={1} max={65535}
            />
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> Port to Monitor </Button>
            </Form.Item>
        </Form>
    </div>
};