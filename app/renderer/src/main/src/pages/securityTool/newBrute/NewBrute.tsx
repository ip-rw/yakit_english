import React, {useState, useEffect, Key, useRef, forwardRef, useImperativeHandle} from "react"
import {
    BruteExecuteContentProps,
    BruteExecuteContentRefProps,
    BruteExecuteExtraFormValue,
    BruteExecuteProps,
    BruteTypeTreeListProps,
    NewBruteProps
} from "./NewBruteType"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {apiCancelStartBrute, apiGetAvailableBruteTypes, apiStartBrute, convertStartBruteParams} from "./utils"
import YakitTree from "@/components/yakitUI/YakitTree/YakitTree"
import {DataNode} from "antd/lib/tree"
import styles from "./NewBrute.module.scss"
import {
    ExpandAndRetract,
    ExpandAndRetractExcessiveState
} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginExecuteProgress} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {Divider, Form} from "antd"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import cloneDeep from "lodash/cloneDeep"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {StartBruteParams} from "@/pages/brute/BrutePage"
import {BrutePageInfoProps, PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"
import {defaultBruteExecuteExtraFormValue, defaultBrutePageInfo} from "@/defaultConstants/NewBrute"

const BruteExecuteParamsDrawer = React.lazy(() => import("./BruteExecuteParamsDrawer"))

export const NewBrute: React.FC<NewBruteProps> = React.memo((props) => {
    const {id} = props
    const [bruteType, setBruteType] = useState<React.Key[]>([])
    const [hidden, setHidden] = useState<boolean>(false)

    return (
        <div className={styles["brute-wrapper"]}>
            <BruteTypeTreeList hidden={hidden} bruteType={bruteType} setBruteType={setBruteType} />
            <BruteExecute
                hidden={hidden}
                setHidden={setHidden}
                bruteType={bruteType}
                setBruteType={setBruteType}
                pageId={id}
            />
        </div>
    )
})

const BruteTypeTreeList: React.FC<BruteTypeTreeListProps> = React.memo((props) => {
    const {hidden} = props
    const [tree, setTree] = useState<DataNode[]>([])

    const [checkedKeys, setCheckedKeys] = useControllableValue<React.Key[]>(props, {
        defaultValue: [],
        valuePropName: "bruteType",
        trigger: "setBruteType"
    })

    useEffect(() => {
        getAvailableBruteTypes()
    }, [])
    const getAvailableBruteTypes = useMemoizedFn(() => {
        apiGetAvailableBruteTypes().then(setTree)
    })
    const onCheck = useMemoizedFn((checkedKeysValue: Key[]) => {
        const checkedKeys = checkedKeysValue.filter((item) => !(item as string).includes("temporary-id-"))
        setCheckedKeys(checkedKeys)
    })
    /**Click to select */
    const onSelect = useMemoizedFn((keys: Key[]) => {
        if (keys.length === 0) return
        const item = keys[0] as string
        if (item.includes("temporary-id-")) {
            // Primary
            const selectItem = tree.find((ele) => ele.key === item)
            if (!selectItem) return
            const itemChildren = selectItem.children || []
            const childrenListKey = itemChildren.map((ele) => ele.key)
            const haveCheckKeys = checkedKeys.filter((ele) => childrenListKey.includes(ele))
            if (itemChildren.length === haveCheckKeys.length) {
                const newCheckedKeys = checkedKeys.filter((ele) => !childrenListKey.includes(ele))
                setCheckedKeys(newCheckedKeys)
            } else {
                const newCheckedKeys = [...new Set([...checkedKeys, ...childrenListKey])]
                setCheckedKeys(newCheckedKeys)
            }
        } else {
            // Secondary
            if (checkedKeys.includes(item)) {
                setCheckedKeys(checkedKeys.filter((ele) => ele !== item))
            } else {
                const newCheckedKeys = [...new Set([...checkedKeys, item])]
                setCheckedKeys(newCheckedKeys)
            }
        }
    })
    return (
        <div
            className={classNames(styles["tree-list-wrapper"], {
                [styles["tree-list-wrapper-hidden"]]: hidden
            })}
        >
            <div className={styles["tree-heard"]}>
                <span className={styles["tree-heard-title"]}>Available Types</span>
            </div>
            <YakitTree
                checkable
                selectedKeys={[]}
                checkedKeys={checkedKeys}
                onCheck={(keys) => onCheck(keys as Key[])}
                showLine={false}
                treeData={tree}
                onSelect={onSelect}
                classNameWrapper={styles["tree-list"]}
                rootClassName={styles["tree-root"]}
            />
        </div>
    )
})

const BruteExecute: React.FC<BruteExecuteProps> = React.memo((props) => {
    const {bruteType, setBruteType, pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    /**Fetch page data in data center */
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Mod_Brute, pageId)
        if (currentItem && currentItem.pageParamsInfo.brutePageInfo) {
            return currentItem.pageParamsInfo.brutePageInfo
        } else {
            return {
                ...defaultBrutePageInfo
            }
        }
    })
    const [pageInfo, setPageInfo] = useState<BrutePageInfoProps>(initPageInfo())

    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })
    /**Expand?/Collapse */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    const bruteExecuteContentRef = useRef<BruteExecuteContentRefProps>(null)

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setBruteType([])
    })
    const selectNum = useCreation(() => {
        return bruteType.length
    }, [bruteType])
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        bruteExecuteContentRef.current?.onStopExecute()
    })
    const onStartExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        bruteExecuteContentRef.current?.onStartExecute()
    })
    return (
        <div className={styles["brute-execute-wrapper"]}>
            <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                <div className={styles["brute-executor-title"]}>
                    <span className={styles["brute-executor-title-text"]}>Weak-password detection</span>
                    {selectNum > 0 && (
                        <YakitTag closable onClose={onRemove} color='info'>
                            {selectNum} types
                        </YakitTag>
                    )}
                </div>
                <div className={styles["brute-executor-btn"]}>
                    {progressList.length === 1 && (
                        <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                    )}
                    {isExecuting
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={onStopExecute}>
                                      Exec Plugin Names Array
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onStartExecute} disabled={selectNum === 0}>
                                      Risk Items
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )}
                    <YakitButton
                        type='text2'
                        icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                        onClick={(e) => {
                            e.stopPropagation()
                            setHidden(!hidden)
                        }}
                    />
                </div>
            </ExpandAndRetract>
            <div className={styles["brute-executor-body"]}>
                <BruteExecuteContent
                    ref={bruteExecuteContentRef}
                    bruteType={bruteType}
                    isExpand={isExpand}
                    setIsExpand={setIsExpand}
                    executeStatus={executeStatus}
                    setExecuteStatus={setExecuteStatus}
                    selectNum={selectNum}
                    setProgressList={setProgressList}
                    pageInfo={pageInfo}
                />
            </div>
        </div>
    )
})

const BruteExecuteContent: React.FC<BruteExecuteContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            bruteType,
            isExpand,
            executeStatus,
            setExecuteStatus,
            setIsExpand,
            selectNum,
            setProgressList,
            pageInfo
        } = props
        const [form] = Form.useForm()
        const [runtimeId, setRuntimeId] = useState<string>("")

        /**For cache modification */
        const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
        const [extraParamsValue, setExtraParamsValue] = useState<BruteExecuteExtraFormValue>(
            cloneDeep(defaultBruteExecuteExtraFormValue)
        )

        const tokenRef = useRef<string>(randomString(40))

        const defaultTabs = useCreation(() => {
            const tabs = [
                {tabName: "Stop Answering", type: "risk"},
                {tabName: "Logs", type: "log"},
                {tabName: "Console", type: "console"}
            ]
            return tabs
        }, [])
        const [streamInfo, streamEvent] = useHoldGRPCStream({
            tabs: defaultTabs,
            taskName: "StartBrute",
            apiKey: "StartBrute",
            token: tokenRef.current,
            onEnd: () => {
                streamEvent.stop()
                setTimeout(() => {
                    setExecuteStatus("finished")
                }, 200)
            },
            setRuntimeId: (rId) => {
                setRuntimeId(rId)
            }
        })

        useImperativeHandle(
            ref,
            () => ({
                onStopExecute,
                onStartExecute: () => {
                    form.validateFields()
                        .then(onStartExecute)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                }
            }),
            [form]
        )

        useEffect(() => {
            setProgressList(streamInfo.progressState)
        }, [streamInfo.progressState])

        /**Code Gen */
        const onStopExecute = useMemoizedFn(() => {
            apiCancelStartBrute(tokenRef.current).then(() => {
                streamEvent.stop()
                setExecuteStatus("finished")
            })
        })
        /**Start Execution */
        const onStartExecute = useMemoizedFn((value) => {
            const params: StartBruteParams = {
                ...convertStartBruteParams({
                    ...extraParamsValue,
                    Targets: value.Targets,
                    Type: bruteType.join(",")
                })
            }
            streamEvent.reset()
            apiStartBrute(params, tokenRef.current).then(() => {
                setExecuteStatus("process")
                setIsExpand(false)
                streamEvent.start()
            })
        })

        const isExecuting = useCreation(() => {
            if (executeStatus === "process") return true
            return false
        }, [executeStatus])

        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsValue({
                ...extraParamsValue
            })
            setExtraParamsVisible(true)
        })
        /**Save Extra Parameters */
        const onSaveExtraParams = useMemoizedFn((v: BruteExecuteExtraFormValue) => {
            setExtraParamsValue({...v} as BruteExecuteExtraFormValue)
            setExtraParamsVisible(false)
        })
        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId
        }, [isExecuting, runtimeId])
        const progressList = useCreation(() => {
            return streamInfo.progressState
        }, [streamInfo.progressState])
        return (
            <>
                <div
                    className={classNames(styles["brute-form-wrapper"], {
                        [styles["brute-form-wrapper-hidden"]]: !isExpand
                    })}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //Centering the Input Box Intentionally
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} Required Field"
                        }}
                        labelWrap={true}
                    >
                        <YakitFormDraggerContent
                            style={{width: "100%"}}
                            formItemProps={{
                                name: "Targets",
                                label: "Input Target",
                                rules: [{required: true}],
                                initialValue: pageInfo.targets
                            }}
                            accept='.txt,.xlsx,.xls,.csv'
                            textareaProps={{
                                placeholder: "Domain Rules(:Port)/IP(:Port)/IP Range, Separate with Commas",
                                rows: 3
                            }}
                            help='Drag TXT, Excel files here or'
                            disabled={isExecuting}
                        />
                        <Form.Item label={" "} colon={false}>
                            <div className={styles["form-extra"]}>
                                <YakitTag>Target Concurrency:{extraParamsValue.Concurrent}</YakitTag>
                                {extraParamsValue?.OkToStop ? (
                                    <YakitTag>Stop on Success</YakitTag>
                                ) : (
                                    <YakitTag>Continue After Success</YakitTag>
                                )}
                                {(extraParamsValue?.DelayMax || 0) > 0 && (
                                    <YakitTag>
                                        Random Pause:{extraParamsValue.DelayMin}-{extraParamsValue.DelayMax}s
                                    </YakitTag>
                                )}
                            </div>
                        </Form.Item>
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["plugin-execute-form-operate"]}>
                                {isExecuting ? (
                                    <YakitButton danger onClick={onStopExecute} size='large'>
                                        Exec Plugin Names Array
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        className={styles["plugin-execute-form-operate-start"]}
                                        htmlType='submit'
                                        size='large'
                                        disabled={selectNum === 0}
                                    >
                                        Start Execution
                                    </YakitButton>
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isExecuting}
                                    size='large'
                                >
                                    Extra params
                                </YakitButton>
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {progressList.length > 1 && (
                    <div className={styles["executing-progress"]}>
                        {progressList.map((ele, index) => (
                            <React.Fragment key={ele.id}>
                                {index !== 0 && <Divider type='vertical' style={{margin: 0, top: 2}} />}
                                <PluginExecuteProgress percent={ele.progress} name={ele.id} />
                            </React.Fragment>
                        ))}
                    </div>
                )}
                {isShowResult && (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey={""}
                        pluginExecuteResultWrapper={styles["brute-execute-result-wrapper"]}
                    />
                )}
                <React.Suspense fallback={<div>loading...</div>}>
                    <BruteExecuteParamsDrawer
                        extraParamsValue={extraParamsValue}
                        visible={extraParamsVisible}
                        onSave={onSaveExtraParams}
                    />
                </React.Suspense>
            </>
        )
    })
)
