import {API} from "@/services/swagger/resposeType"
import {useGetState, useInViewport, useMemoizedFn, useSize} from "ahooks"
import React, {useState, useEffect, memo, useRef, useMemo} from "react"
import {useStore} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {failed, warn, success} from "@/utils/notification"
import {Upload, Input, Modal, Image, Avatar, InputRef} from "antd"
import {LoadingOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import numeral from "numeral"
import styles from "./baseComment.module.scss"
import moment from "moment"
import cloneDeep from "lodash/cloneDeep"
import {useCommenStore} from "@/store/comment"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import Login from "@/pages/Login"
import {fail} from "assert"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {UserPlatformType} from "../globalVariable"
import yakitImg from "@/assets/yakit.jpg"
import {randomAvatarColor} from "@/components/layout/FuncDomain"
import {PaperAirplaneIcon, ResizerIcon} from "@/assets/newIcon"
import {OutlinePhotographIcon, OutlineThumbupActiveIcon, OutlineThumbupIcon} from "@/assets/icon/outline"
import {CloseIcon} from "@/components/configNetwork/icon"
import {NewYakitTimeLineList} from "@/components/yakitUI/NewYakitTimeLineList/NewYakitTimeLineList"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {OnlineJudgment} from "./onlineJudgment/OnlineJudgment"
import {YakitTimeLineListRefProps} from "@/components/yakitUI/YakitTimeLineList/YakitTimeLineListType"
import {YakitCollapseText} from "@/components/yakitUI/YakitCollapseText/YakitCollapseText"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
const {ipcRenderer} = window.require("electron")

const limit = 20
interface PluginCommentProps {
    plugin: API.PluginsDetail
    isLogin: boolean
}

interface SearchCommentRequest {
    uuid: string
    limit: number
    page: number
}

interface CommentStarsProps {
    comment_id: number
    operation: string
}

export const PluginComment: React.FC<PluginCommentProps> = (props) => {
    const {plugin, isLogin} = props
    const [commentLoading, setCommentLoading] = useState<boolean>(false)
    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [commentResponses, setCommentResponses] = useGetState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })
    const [commentInputText, setCommentInputText] = useState<string>("")
    const [commentFiles, setCommentFiles] = useState<string[]>([])
    const [currentComment, setCurrentComment] = useState<API.CommentListData | null>()
    const [commentShow, setCommentShow] = useState<boolean>(false)
    const [parentComment, setParentComment] = useState<API.CommentListData>()
    const [commentChildVisible, setCommentChildVisible] = useState<boolean>(false)
    const [commentSecondShow, setCommentSencondShow] = useState<boolean>(false)
    const [commentAllNum, setCommentAllNum] = useState<number>(0)

    const ref = useRef(null)
    const size = useSize(ref)
    const [inViewport] = useInViewport(ref)
    useEffect(() => {
        getComment(1)
        setFiles([])
        setCommentText("")
    }, [plugin.id])

    useEffect(() => {
        handleClearTimeList()
    }, [plugin.id, inViewport])
    useEffect(() => {
        if (!isLogin) {
            setFiles([])
            setCommentText("")
        }
    }, [isLogin])

    const getComment = useMemoizedFn((page: number = 1) => {
        const params: SearchCommentRequest = {
            uuid: plugin.uuid,
            limit,
            page
        }
        setLoading(true)
        NetWorkApi<SearchCommentRequest, API.CommentListResponse>({
            method: "get",
            url: "comments",
            params
        })
            .then((res) => {
                // console.log("comment---", res, plugin)

                if (!res.data) {
                    res.data = []
                }
                const newCommentResponses = {
                    data: page === 1 ? res.data : commentResponses.data.concat(res.data),
                    pagemeta: res.pagemeta
                }
                const isMore =
                    res.data.length < limit || newCommentResponses.data.length === commentResponses.pagemeta.total
                ishasMore.current = !isMore
                setCommentAllNum(res.pagemeta.total)
                setCommentResponses({
                    data: [...newCommentResponses.data],
                    pagemeta: res.pagemeta
                })
            })
            .catch((err) => {
                failed("Comment fetch failed:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const isLoading = useMemoizedFn(() => {
        Modal.confirm({
            title: "Not logged in",
            icon: <ExclamationCircleOutlined />,
            content: "Comment after login",
            cancelText: "Cancel",
            okText: "Login",
            onOk() {
                setLoginShow(true)
            },
            onCancel() {}
        })
    })
    // Add comment
    const pluginComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!isLogin) {
            isLoading()
            return
        }
        if (!commentText && files.length === 0) {
            failed("Enter comment or upload image")
            return
        }
        const params = {
            uuid: plugin.uuid,
            message_img: files,
            parent_id: 0,
            root_id: 0,
            by_user_id: 0,
            message: commentText
        }
        addComment(params)
    })

    const setCommentResponsesReplyNum = useMemoizedFn(() => {
        const newData: API.CommentListData[] = JSON.parse(JSON.stringify(commentResponses.data))
        const addData = newData.map((item) => {
            if (item.id === parentComment?.id) {
                item.reply_num = item.reply_num + 1
            }
            return item
        })
        setCommentResponses({
            data: addData,
            pagemeta: commentResponses.pagemeta
        })
    })

    // Global watch for sub-comment list refresh state
    const {setCommenData} = useCommenStore()
    // Login Box Status
    const [loginshow, setLoginShow] = useState<boolean>(false)
    const addComment = useMemoizedFn((data: API.NewComments) => {
        NetWorkApi<API.NewComments, API.ActionSucceeded>({
            method: "post",
            url: "comments",
            data
        })
            .then((res) => {
                success("Comment posted")
                // console.log("Comment posted---",data);

                if (data.by_user_id && data.by_user_id > 0) {
                    // Refresh sub-comments in modal
                    setCommenData({
                        isRefChildCommentList: true
                    })
                }
                if (data.parent_id === 0) getComment(1)
                if (data.parent_id && data.parent_id !== 0) setCommentResponsesReplyNum()
                if (commentText) setCommentText("")
                if (files.length > 0) setFiles([])
                if (commentInputText) setCommentInputText("")
                if (currentComment?.id) setCurrentComment(null)
                if (commentFiles.length > 0) setCommentFiles([])
                if (commentShow) setCommentShow(false)
            })
            .catch((err) => {
                failed(err)
            })
            .finally(() => {
                setTimeout(() => setCommentLoading(false), 200)
            })
    })
    const pluginReply = useMemoizedFn((item: API.CommentListData) => {
        if (!isLogin) {
            warn("Please login")
            return
        }
        setCurrentComment(item)
        setCommentShow(true)
    })
    const pluginReplyComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!isLogin) {
            isLoading()
            return
        }
        if (!currentComment?.id) return
        if (!commentInputText && commentFiles.length === 0) {
            failed("Enter comment or upload image")
            return
        }
        const params = {
            uuid: plugin.uuid,
            message_img: commentFiles,
            parent_id: currentComment.root_id === 0 ? 0 : currentComment.id,
            root_id: currentComment.root_id || currentComment.id,
            by_user_id: currentComment.user_id,
            message: commentInputText
        }

        addComment(params)
    })
    const pluginCommentStar = useMemoizedFn((item: API.CommentListData) => {
        if (!isLogin) {
            warn("Please login")
            return
        }
        const params: CommentStarsProps = {
            comment_id: item.id,
            operation: item.is_stars ? "remove" : "add"
        }

        NetWorkApi<CommentStarsProps, API.ActionSucceeded>({
            method: "post",
            url: "comment/stars",
            params: params
        })
            .then((res) => {
                if (!commentResponses) return
                const index: number = commentResponses.data.findIndex((ele: API.CommentListData) => ele.id === item.id)
                if (index !== -1) {
                    if (item.is_stars) {
                        commentResponses.data[index].like_num -= 1
                        commentResponses.data[index].is_stars = false
                    } else {
                        commentResponses.data[index].like_num += 1
                        commentResponses.data[index].is_stars = true
                    }
                    setCommentResponses({
                        ...commentResponses,
                        data: [...commentResponses.data]
                    })
                }
            })
            .catch((err) => {
                failed("Like failed:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const openCommentChildModel = (visible) => {
        setCommentChildVisible(visible)
    }

    const pluginCancelComment = useMemoizedFn((flag: number) => {
        if (flag === 2) {
            setCurrentComment(null)
            setCommentInputText("")
            setCommentFiles([])
            setCommentShow(false)
        }
        setCommentSencondShow(false)
    })
    const onSetValue = useMemoizedFn((value) => {
        if (!isLogin) {
            isLoading()
            return
        }
        setCommentText(value)
    })

    const timeListRef = useRef<YakitTimeLineListRefProps>(null)
    const ishasMore = useRef<boolean>(true)
    const handleClearTimeList = useMemoizedFn(() => {
        timeListRef.current?.onClear()
    })
    const loadMoreData = useMemoizedFn(() => {
        getComment(commentResponses.pagemeta.page + 1)
    })

    const rowsNum = useMemo(() => {
        if (size?.height) {
            if (size.height < 200) {
                return 1
            } else if (size?.height < 300) {
                return 2
            }
        }
    }, [size?.height])

    return (
        <div className={styles["comment-box"]} id='online-plugin-info-scroll' ref={ref}>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
            <div className={styles["info-comment-box"]}>
                <div className={styles["box-header"]}>
                    <span className={styles["header-title"]}>Comment</span>
                    <span className={styles["header-subtitle"]}>{commentAllNum || 0}</span>
                </div>
                {isLogin && (
                    <PluginCommentUpload
                        loading={commentLoading}
                        value={commentText}
                        setValue={onSetValue}
                        files={files}
                        setFiles={setFiles}
                        onSubmit={pluginComment}
                        rows={rowsNum || 3}
                    />
                )}
            </div>
            <div className={styles["comment-list-box"]}>
                {commentResponses.data.length > 0 ? (
                    <OnlineJudgment>
                        <NewYakitTimeLineList
                            ref={timeListRef}
                            loading={loading}
                            data={commentResponses.data}
                            renderItem={(info) => {
                                return (
                                    <PluginCommentInfo
                                        key={info.id}
                                        info={info}
                                        onReply={pluginReply}
                                        onStar={pluginCommentStar}
                                        isStarChange={info.is_stars}
                                        setParentComment={setParentComment}
                                        openCommentChildModel={openCommentChildModel}
                                    />
                                )
                            }}
                            hasMore={ishasMore.current}
                            loadMore={loadMoreData}
                        />
                    </OnlineJudgment>
                ) : (
                    <YakitEmpty style={{paddingTop: 48}} />
                )}
            </div>

            <PluginCommentChildModal
                plugin={plugin}
                visible={commentChildVisible}
                parentInfo={parentComment}
                onReply={pluginReply}
                onCancel={(val) => {
                    setParentComment(undefined)
                    setCommentChildVisible(val)
                }}
                isLogin={isLogin}
            />

            <YakitModal
                title={<div className={styles["header-title"]}>Reply@{currentComment?.user_name}</div>}
                centered={true}
                footer={null}
                keyboard={false}
                maskClosable={false}
                width={560}
                visible={commentShow}
                destroyOnClose={true}
                bodyStyle={{padding: 0}}
                onCancel={() => setCommentSencondShow(true)}
            >
                <div style={{padding: "16px 24px 24px"}}>
                    {isLogin ? (
                        <PluginCommentUpload
                            loading={commentLoading}
                            value={commentInputText}
                            setValue={setCommentInputText}
                            files={commentFiles}
                            setFiles={setCommentFiles}
                            onSubmit={pluginReplyComment}
                            isAlwaysShow={true}
                        />
                    ) : (
                        <>Please login</>
                    )}
                </div>
            </YakitModal>
            <SecondConfirm visible={commentSecondShow} onCancel={pluginCancelComment}></SecondConfirm>
        </div>
    )
}

interface PluginCommentInfoProps {
    info: API.CommentListData
    key: number
    isStarChange?: boolean
    isOperation?: boolean
    onReply: (name: API.CommentListData) => any
    onStar: (name: API.CommentListData) => any
    openCommentChildModel?: (visible: boolean) => any
    setParentComment?: (name: API.CommentListData) => any
    // Avatar size, default 32
    headImgSize?: number
    // Lazy load images by default, otherwise load directly
    isLazyLoadImage?: boolean
}
// Single comment component
const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {
        info,
        onReply,
        onStar,
        key,
        isStarChange,
        openCommentChildModel,
        setParentComment,
        isOperation = true,
        headImgSize = 32,
        isLazyLoadImage = false
    } = props

    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)

    const message_img: string[] = (info.message_img && JSON.parse(info.message_img)) || []

    const lazyLoadImage = useMemo(() => {
        return inViewport || !isLazyLoadImage
    }, [inViewport, isLazyLoadImage])

    return (
        <div className={styles["plugin-comment-opt"]} key={key} ref={ref}>
            <div className={styles["opt-author-img"]} style={{width: headImgSize}}>
                <img
                    src={info.head_img}
                    className={styles["author-img-style"]}
                    style={{height: headImgSize, width: headImgSize}}
                />
            </div>

            <div className={styles["opt-comment-body"]}>
                <div className={styles["comment-body-main"]}>
                    <div className={styles["comment-body-header"]}>
                        <div className={styles["comment-body-name"]}>{info.user_name || "anonymous"}</div>
                        {info.by_user_name && (
                            <>
                                <div className={styles["comment-replay-text"]}>Reply</div>
                                <div className={styles["comment-replay"]}>@{info.by_user_name}</div>
                            </>
                        )}
                        <div className={styles["comment-dot"]}>·</div>
                        <div className={styles["comment-body-time"]}>
                            {moment.unix(info.created_at).format("YYYY-MM-DD HH:mm")}
                        </div>
                    </div>

                    <div className={styles["comment-body-content"]}>
                        <YakitCollapseText content={info.message} rows={2} lineHeight={20} fontSize={14} />
                    </div>
                    {lazyLoadImage && <PluginCommentImages images={message_img} key={info.id} size={90} />}
                    <div className={styles["comment-body-option"]}>
                        {isOperation && (
                            <div className={styles["func-comment-and-star"]}>
                                <div className={styles["comment-and-star"]} onClick={() => onReply(info)}>
                                    <YakitButton type='secondary2' className={styles["reply-btn"]}>
                                        Reply
                                    </YakitButton>
                                </div>
                                <div
                                    style={{marginLeft: 16}}
                                    className={classNames(styles["comment-and-star"])}
                                    onClick={() => onStar(info)}
                                >
                                    {(isStarChange && (
                                        <OutlineThumbupActiveIcon
                                            className={classNames(styles["hover-active"], styles["icon-style-start"])}
                                        />
                                    )) || (
                                        <OutlineThumbupIcon
                                            className={classNames(styles["hover-active"], styles["icon-style"])}
                                        />
                                    )}
                                    <span className={classNames(styles["num-style"])}>
                                        {numeral(info.like_num).format("0,0")}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Undefined height in virtual list, sub-comments cause whitening */}
                {/* {(info.reply_content || []).length > 0 && isOperation && (
                    <>
                        {info.reply_content?.map((info) => {
                            return (
                                <div className={styles["comment-twice-reply"]}>
                                    <PluginCommentInfo
                                        key={123}
                                        info={info}
                                        onReply={onReply}
                                        onStar={onStar}
                                        isStarChange={info.is_stars}
                                        headImgSize={24}
                                    />
                                </div>
                            )
                        })}
                    </>
                )} */}
                {isOperation && info.reply_num > 0 && (
                    <a
                        className={styles["comment-reply"]}
                        onClick={() => {
                            if (openCommentChildModel && setParentComment) {
                                setParentComment(info)
                                setTimeout(() => {
                                    openCommentChildModel(true)
                                }, 1)
                            }
                        }}
                    >
                        Total {info.reply_num} replies, view
                    </a>
                )}
            </div>
        </div>
    )
})
interface PluginCommentImagesProps {
    images: string[]
    onDelete?: (v: string[]) => void
    onOpen?: () => void
    onClose?: () => void
    // Auxiliary key
    key?: string | number
    // Show image size, default 56
    size?: number
}

const PluginCommentImages: React.FC<PluginCommentImagesProps> = (props) => {
    const {images, onDelete, onOpen, onClose, key, size = 56} = props
    const [imageShow, setImageShow] = useState<ImageShowProps>({
        src: "",
        visible: false
    })
    return (
        <div className={styles["plugin-comment-images"]}>
            {images.map((item, index) => {
                return (
                    <div
                        key={`${item}-${key || ""}`}
                        className={styles["upload-img-opt"]}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        style={{width: size, height: size}}
                    >
                        <Image src={item as any} className={styles["opt-pic"]} preview={false} />
                        <div
                            className={styles["mask-box"]}
                            onClick={() => {
                                onOpen && onOpen()
                                setImageShow({
                                    visible: true,
                                    src: item
                                })
                            }}
                        >
                            Preview
                        </div>
                        {onDelete && (
                            <div
                                className={styles["close"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const arr: string[] = cloneDeep(images)
                                    arr.splice(index, 1)
                                    onDelete && onDelete(arr)
                                }}
                            >
                                <CloseIcon />
                            </div>
                        )}
                    </div>
                )
            })}
            <Image
                src={imageShow.src}
                style={{display: "none"}}
                preview={{
                    visible: imageShow.visible,
                    src: imageShow.src,
                    onVisibleChange: (value) => {
                        if (!value) {
                            onClose && onClose()
                            setImageShow({
                                visible: false,
                                src: ""
                            })
                        }
                    }
                }}
            />
        </div>
    )
}

interface PluginCommentUploadProps {
    value: string
    setValue: (value: string) => any
    // Limit input to 150 characters by default
    limit?: number
    loading: boolean
    files: string[]
    setFiles: (files: string[]) => any
    onSubmit: () => void
    submitTxt?: string
    // TextArea rows, default 4
    rows?: number
    // Always show action buttons (focus by default)）
    isAlwaysShow?: boolean
}

interface ImageShowProps {
    src: string
    visible: boolean
}

export const PluginCommentUpload: React.FC<PluginCommentUploadProps> = (props) => {
    const {
        value,
        setValue,
        limit = 150,
        loading,
        files,
        setFiles,
        onSubmit,
        submitTxt = "Post comment",
        rows = 4,
        isAlwaysShow = false
    } = props
    const {userInfo} = useStore()
    const {platform, companyHeadImg, companyName} = userInfo
    const avatarColor = useRef<string>(randomAvatarColor())
    const [filesLoading, setFilesLoading] = useState<boolean>(false)
    const textAreRef = useRef<InputRef>(null)
    const [isFocused, setIsFocused] = useState<boolean>(false)

    // Allow blur?
    const isAllowBlur = useRef<boolean>(true)
    const uploadFiles = (file) => {
        setFilesLoading(true)
        ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                setFiles(files.concat(res.data))
            })
            .catch((err) => {
                fail("Image upload failed")
            })
            .finally(() => {
                setTimeout(() => setFilesLoading(false), 1)
            })
    }

    const disabled = useMemo(() => {
        if (value.length > limit) {
            return true
        }
        if (value.length === 0 && files.length === 0) {
            return true
        }
        return false
    }, [value, limit, files])

    // Show bottom elements?
    const isShowdDom = useMemo(() => {
        if (files.length > 0 || value.length > 0 || isAlwaysShow || isFocused) {
            return true
        } else {
            return false
        }
    }, [isFocused, files, value])

    return (
        <div className={styles["plugin-comment-upload"]}>
            <div className={styles["upload-author-img"]}>
                {platform === "company" ? (
                    <div>
                        {companyHeadImg && !!companyHeadImg.length ? (
                            <Avatar size={32} style={{cursor: "pointer"}} src={companyHeadImg} />
                        ) : (
                            <Avatar
                                size={32}
                                style={{backgroundColor: avatarColor.current}}
                                className={classNames(styles["judge-avatar-avatar"])}
                            >
                                {companyName && companyName.slice(0, 1)}
                            </Avatar>
                        )}
                    </div>
                ) : (
                    <img
                        src={userInfo[UserPlatformType[platform || ""].img] || yakitImg}
                        style={{width: 32, height: 32, borderRadius: "50%"}}
                    />
                )}
            </div>
            <div
                className={classNames(styles["input-upload-box"], {
                    [styles["input-upload-box-active"]]: isFocused
                })}
                onClick={() => {
                    textAreRef.current!.focus({
                        cursor: "end"
                    })
                }}
            >
                {/* Set padding: 12px;Split into 4 divs to solve flicker issue */}
                <div
                    className={styles["padding-top"]}
                    onMouseDown={(e) => {
                        e.preventDefault()
                    }}
                ></div>
                <div className={styles["padding-left-right"]}>
                    <div
                        className={styles["padding-left"]}
                        onMouseDown={(e) => {
                            e.preventDefault()
                        }}
                    ></div>
                    <div className={styles["input-upload"]}>
                        <div
                            className={styles["input-box"]}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                            <Input.TextArea
                                className={styles["input-box-textArea"]}
                                onFocus={() => {
                                    setIsFocused(true)
                                }}
                                onBlur={() => {
                                    if (isAllowBlur.current) {
                                        setIsFocused(false)
                                    } else {
                                        isAllowBlur.current = true
                                        textAreRef.current?.focus()
                                    }
                                }}
                                value={value}
                                ref={textAreRef}
                                bordered={false}
                                rows={rows}
                                placeholder='Say something...'
                                onChange={(e) => setValue(e.target.value)}
                            />
                            <ResizerIcon className={styles["textArea-resizer-icon"]} />
                        </div>
                        {isShowdDom && (
                            <div
                                style={{paddingTop: 12}}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                }}
                            >
                                <PluginCommentImages
                                    images={files}
                                    onDelete={setFiles}
                                    onOpen={() => {
                                        isAllowBlur.current = false
                                    }}
                                    onClose={() => {
                                        isAllowBlur.current = true
                                    }}
                                />
                            </div>
                        )}
                        {isShowdDom && (
                            <div
                                className={styles["upload-box"]}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                }}
                            >
                                <div
                                    className={styles["upload-box-left"]}
                                    onClick={() => {
                                        isAllowBlur.current = false
                                    }}
                                >
                                    <Upload
                                        accept='image/jpeg,image/png,image/jpg,image/gif'
                                        multiple={false}
                                        disabled={files.length >= 3}
                                        showUploadList={false}
                                        beforeUpload={(file: any) => {
                                            if (filesLoading) {
                                                return false
                                            }
                                            if (file.size / 1024 / 1024 > 10) {
                                                failed("Image size up to 10M")
                                                return false
                                            }
                                            if (!"image/jpeg,image/png,image/jpg,image/gif".includes(file.type)) {
                                                failed("Support image upload format: image/jpeg,image/png,image/jpg,image/gif")
                                                return false
                                            }
                                            if (file) {
                                                uploadFiles(file)
                                            }
                                            return true
                                        }}
                                    >
                                        {filesLoading ? (
                                            <LoadingOutlined size={28} />
                                        ) : (
                                            <YakitButton
                                                size='large'
                                                disabled={files.length >= 3}
                                                icon={<OutlinePhotographIcon />}
                                                type='text2'
                                            />
                                        )}
                                    </Upload>
                                </div>
                                <div className={styles["upload-box-right"]}>
                                    <div className={styles["limit-count"]}>
                                        {value.length}/{limit}
                                    </div>
                                    <>
                                        {
                                            // Default event blocked when Button disabled=true, implement disable style manually
                                            disabled ? (
                                                <div className={styles["disabled-btn"]}>
                                                    <PaperAirplaneIcon />
                                                    {submitTxt}
                                                </div>
                                            ) : (
                                                <YakitButton
                                                    icon={<PaperAirplaneIcon />}
                                                    loading={loading}
                                                    onClick={() => {
                                                        onSubmit()
                                                    }}
                                                >
                                                    {submitTxt}
                                                </YakitButton>
                                            )
                                        }
                                    </>
                                </div>
                            </div>
                        )}
                    </div>
                    <div
                        className={styles["padding-right"]}
                        onMouseDown={(e) => {
                            e.preventDefault()
                        }}
                    ></div>
                </div>

                <div
                    className={styles["padding-bottom"]}
                    onMouseDown={(e) => {
                        e.preventDefault()
                    }}
                ></div>
            </div>
        </div>
    )
}

interface PluginCommentChildModalProps {
    plugin: API.PluginsDetail
    visible: boolean
    isLogin: boolean
    parentInfo?: API.CommentListData
    onReply: (info: API.CommentListData) => any
    onCancel: (visible: boolean) => any
}

interface CommentQueryProps extends API.PageMeta {
    root_id?: number
    uuid?: string
}

const PluginCommentChildModal = (props: PluginCommentChildModalProps) => {
    const {plugin, parentInfo, visible, onReply, onCancel, isLogin} = props

    const [loadingChild, setLoadingChild] = useState<boolean>(false)
    const [commentChildResponses, setCommentChildResponses] = useState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })

    const onCommentChildCancel = useMemoizedFn(() => {
        setCommentChildResponses({
            data: [],
            pagemeta: {
                page: 1,
                limit,
                total: 0,
                total_page: 0
            }
        })
        onCancel(false)
    })
    const loadMoreData = useMemoizedFn(() => {
        if (commentChildResponses?.pagemeta?.page) {
            getChildComment(commentChildResponses?.pagemeta?.page + 1)
        }
    })
    // Global watch for sub-comment list refresh state
    const {commenData, setCommenData} = useCommenStore()
    // Fetch sub-comments
    const getChildComment = useMemoizedFn((page: number = 1, payload: any = {}) => {
        const params = {
            root_id: parentInfo?.id,
            uuid: plugin.uuid,
            limit,
            page,
            order_by: "created_at",
            ...payload
        }
        NetWorkApi<CommentQueryProps, API.CommentListResponse>({
            method: "get",
            url: "comments/reply",
            params
        })
            .then((res) => {
                // console.log("comments/reply",res.data);

                if (!res.data) {
                    res.data = []
                }
                const item = res
                const newCommentChildResponses = {
                    data: page === 1 ? item.data : commentChildResponses.data.concat(item.data),
                    pagemeta: item.pagemeta
                }
                const isMore =
                    item.data.length < limit ||
                    newCommentChildResponses.data.length === commentChildResponses.pagemeta.total
                ishasMore.current = !isMore
                setCommentChildResponses({
                    data: [...newCommentChildResponses.data],
                    pagemeta: item.pagemeta
                })
                // Refresh sub-comments in modal
                setCommenData({
                    isRefChildCommentList: false
                })
            })
            .catch((err) => {
                failed("Comment fetch failed:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoadingChild(false), 200)
            })
    })
    const onCommentChildStar = useMemoizedFn((childItem: API.CommentListData) => {
        if (!isLogin) {
            warn("Please login")
            return
        }
        const params = {
            comment_id: childItem.id,
            operation: childItem.is_stars ? "remove" : "add"
        }
        NetWorkApi<CommentStarsProps, API.ActionSucceeded>({
            method: "post",
            url: "comment/stars",
            params: params
        })
            .then((res) => {
                const index: number = commentChildResponses.data.findIndex(
                    (ele: API.CommentListData) => ele.id === childItem.id
                )
                if (index !== -1) {
                    if (childItem.is_stars) {
                        commentChildResponses.data[index].like_num -= 1
                        commentChildResponses.data[index].is_stars = false
                    } else {
                        commentChildResponses.data[index].like_num += 1
                        commentChildResponses.data[index].is_stars = true
                    }
                    setCommentChildResponses({
                        ...commentChildResponses,
                        data: [...commentChildResponses.data]
                    })
                }
            })
            .catch((err) => {
                failed("Like failed:" + err)
            })
            .finally(() => {})
    })
    useEffect(() => {
        if (!commenData.isRefChildCommentList) return
        if (!parentInfo) return

        const refParams = {
            root_id: parentInfo?.id,
            uuid: plugin.uuid
        }
        getChildComment(1, refParams)
    }, [commenData.isRefChildCommentList])

    useEffect(() => {
        if (visible) {
            setLoadingChild(true)
            getChildComment(1)
        }
    }, [visible])

    const ishasMore = useRef<boolean>(true)

    if (!parentInfo) return <></>
    return (
        <Modal visible={visible} onCancel={onCommentChildCancel} footer={null} width='70%' centered>
            <div id='scroll-able-div' className={styles["comment-child-body"]}>
                <PluginCommentInfo
                    key={parentInfo.id}
                    info={parentInfo}
                    isOperation={false}
                    onStar={() => {}}
                    onReply={() => {}}
                />
                {/* Use lazy image loading */}
                <div
                    className={styles["little-child-comment-list"]}
                    onScroll={(e) => {
                        const {target} = e
                        const ref: HTMLDivElement = target as unknown as HTMLDivElement
                        if (ref.scrollTop + ref.offsetHeight + 10 >= ref.scrollHeight) {
                            if (ishasMore.current) {
                                loadMoreData()
                            }
                        }
                    }}
                >
                    {commentChildResponses.data.map((childItem) => {
                        return (
                            <PluginCommentInfo
                                key={childItem.id}
                                info={childItem}
                                onReply={onReply}
                                onStar={onCommentChildStar}
                                isStarChange={childItem.is_stars}
                                isLazyLoadImage={true}
                            />
                        )
                    })}
                </div>
            </div>
        </Modal>
    )
}
