import React, {useEffect, useState} from "react";
import {Button, Col, Form, Input, Row, Typography, Tag, Space, Popconfirm} from "antd";
import {DeleteOutlined} from "@ant-design/icons";
import {showModal} from "../../utils/showModal";
import {InputItem, SelectOne} from "../../utils/inputUtil";

const {Text} = Typography;

export interface YakExecutorParam {
    Key: string,
    Value: any
}

export interface YakExecutorParamsProp {
    onParams: (params: YakExecutorParam[]) => any
}

export const YakExecutorParams: React.FC<YakExecutorParamsProp> = (props) => {
    const [params, setParams] = useState<YakExecutorParam[]>([]);

    const deleteParams = (k: string) => {
        const data = [...params.filter(i => i.Key !== k)];
        setParams(data);
    }

    const deleteButton = (i: YakExecutorParam) => {
        return <Popconfirm
            title={"Confirm Delete Param？"} onConfirm={() => deleteParams(i.Key)}
        >
            <Button
                size={"small"} style={{margin: 0, padding: 0}}
                icon={<DeleteOutlined/>}
                type={"link"} danger={true}
            />
        </Popconfirm>
    }

    return <div style={{width: "100%"}}>
        <Form style={{width: "100%", marginLeft: 8, marginBottom: 14}}>
            <Form.Item
                label={"Execute Yak CMD"} style={{width: "100%"}}
                help={<>
                    {(params || []).length > 0 ? params.map(i => {
                        if (!i.Value) {
                            return <Tag color={"orange"} style={{marginTop: 3}}>{i.Key}: true {deleteButton(i)}</Tag>
                        }
                        return <Tag color={"geekblue"}>{i.Key}: {i.Value} {deleteButton(i)}</Tag>
                    }) : <Tag>No Params</Tag>}
                </>}
            >
                <Row style={{width: "100%"}} gutter={4}>
                    <Space>
                        <Text style={{marginBottom: 0}}>yak [current-script].yak </Text>
                        <Text copyable={false}>
                            {params.map(i => {
                                if (i.Value) {
                                    const prefix = i.Key.startsWith("--") ? `${i.Key}` : `--${i.Key}`
                                    return <Text>
                                        {prefix} <Text mark={true}>{i.Value}</Text><Text> </Text>
                                    </Text>
                                }
                                return <Text>
                                    <Text mark={true}>{i.Key.startsWith("--") ? `${i.Key}` : `--${i.Key}`}</Text>
                                    <Text> </Text>
                                </Text>
                            })}
                        </Text>
                        <Button
                            style={{width: "100%"}} type={"link"}
                            onClick={() => {
                                let m = showModal({
                                    content: <>
                                        <Param onCreated={(k, v) => {
                                            let existed: boolean = false;
                                            params.forEach(p => {
                                                if (p.Key === k) {
                                                    existed = true
                                                    p.Value = v
                                                }
                                            });
                                            if (existed) {
                                                setParams([...params])
                                            } else {
                                                setParams([...params, {Key: k, Value: v}])
                                            }
                                            m.destroy()
                                        }}/>
                                    </>
                                })
                            }}
                        >
                            Add Param
                        </Button>
                    </Space>
                </Row>
            </Form.Item>

        </Form>
    </div>
};

interface ParamProp {
    onCreated: (key: string, value: string) => any
}

const Param: React.FC<ParamProp> = (props) => {
    const [key, setKey] = useState("");
    const [value, setValue] = useState("");
    const [isBool, setIsBool] = useState(false);

    return <>
        <Form
            labelCol={{span: 7}} wrapperCol={{span: 13}}
            onSubmitCapture={e => {
                e.preventDefault()

                props.onCreated(key, isBool ? "" : value)
            }}
        >
            <SelectOne label={"Param Type"} data={[
                {value: true, text: "Bool Type"},
                {value: false, text: "General Params"},
            ]} value={isBool} setValue={setIsBool}/>
            <InputItem label={"Parameter Name"} value={key} setValue={setKey} required={true}/>
            {!isBool && <InputItem
                label={"Param Value"} value={value} setValue={setValue} required={true}
            />}
            <Form.Item label={" "} colon={false}>
                <Button type={"primary"} htmlType={"submit"}>Add Param</Button>
            </Form.Item>
        </Form>
    </>
};