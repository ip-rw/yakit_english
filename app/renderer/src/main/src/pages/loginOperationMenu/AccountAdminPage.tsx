import React, {ReactNode, useEffect, useRef, useState, useMemo} from "react"
import {
    Table,
    Space,
    Button,
    Input,
    Modal,
    Form,
    Popconfirm,
    Tag,
    Avatar,
    Cascader,
    Popover,
    Spin,
    Tree,
    Pagination
} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn, useDebounce, useThrottleFn} from "ahooks"
import moment from "moment"
import "./AccountAdminPage.scss"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../invoker/schema"
import {showModal} from "@/utils/showModal"
import {callCopyToClipboard} from "@/utils/basic"
import {ResizeBox} from "@/components/ResizeBox"
import {PlusOutlined, EditOutlined, DeleteOutlined,RightOutlined} from "@ant-design/icons"
import {DefaultOptionType} from "antd/lib/cascader"
import {useStore} from "@/store"
import { unReadable } from "../dynamicControl/DynamicControl"
import { YakitSelect } from "@/components/yakitUI/YakitSelect/YakitSelect"
import { YakitSpin } from "@/components/yakitUI/YakitSpin/YakitSpin"
const {ipcRenderer} = window.require("electron")
export interface ShowUserInfoProps extends API.NewUrmResponse {
    onClose: () => void
}
const ShowUserInfo: React.FC<ShowUserInfoProps> = (props) => {
    const {user_name, password, onClose} = props
    const copyUserInfo = () => {
        callCopyToClipboard(`Username：${user_name}\nPassword：${password}`)
    }
    return (
        <div style={{padding: "0 10px"}}>
            <div>
                Username：<span>{user_name}</span>
            </div>
            <div>
                Password：<span>{password}</span>
            </div>
            <div style={{textAlign: "center", paddingTop: 10}}>
                <Button type='primary' onClick={() => copyUserInfo()}>
                    Copy
                </Button>
            </div>
        </div>
    )
}

interface QueryAccountProps {
    uid: string
}
export interface AccountFormProps {
    editInfo: API.UrmUserList | undefined
    onCancel: () => void
    // Update other structure ID first, self ID second
    refresh: (v: number, b?: number) => void
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

interface DepData {
    value: number
    label: string
    children?: DepData[]
    isLeaf?: boolean
    loading?: boolean
}

const AccountForm: React.FC<AccountFormProps> = (props) => {
    const {onCancel, refresh, editInfo} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    // Role pagination
    const [pagination, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    // Org Chart pagination
    const [depPagination, setDepPagination, getDepPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [roleData, setRoleData, getRoleData] = useGetState<API.RoleList[]>([])
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    const isOnceLoading = useRef<boolean>(true)
    const [depData, setDepData, getDepData] = useGetState<DepData[]>([])
    const getRolesData = (page?: number, limit?: number) => {
        // Load role list
        isOnceLoading.current = false
        setSelectLoading(true)
        const paginationProps = {
            page: page || pagination.Page,
            limit: limit || pagination.Limit
        }
        NetWorkApi<QueryProps, API.RoleListResponse>({
            method: "get",
            url: "roles",
            params: {
                ...paginationProps
            }
        })
            .then((res) => {
                if (Array.isArray(res.data)) {
                    const newData = res.data.map((item) => ({...item}))
                    setRoleData([...getRoleData(), ...newData])
                    setPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                }
            })
            .catch((err) => {
                failed("Get role list failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setSelectLoading(false)
                }, 200)
            })
    }

    const getDepartmentData = (page?: number, limit?: number, id?: number) => {
        const paginationProps = {
            page: page || depPagination.Page,
            limit: limit || depPagination.Limit
        }
        NetWorkApi<DepartmentGetProps, API.DepartmentListResponse>({
            method: "get",
            url: "department",
            params: {
                ...paginationProps
            }
        })
            .then((res: API.DepartmentListResponse) => {
                if (Array.isArray(res.data)) {
                    // Pagination unsupported - get all data
                    NetWorkApi<DepartmentGetProps, API.DepartmentListResponse>({
                        method: "get",
                        url: "department",
                        params: {
                            page: 1,
                            limit: res.pagemeta.limit
                        }
                    })
                        .then((res: API.DepartmentListResponse) => {
                            const data = res.data.map((item) => ({
                                value: item.id,
                                label: item.name,
                                isLeaf: item.exist_group ? false : true
                            }))
                            if (id) {
                                // Initialize default data
                                initLoadData(data, id)
                            } else {
                                setDepData(data)
                            }
                            setDepPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                        })
                        .catch((err) => {
                            failed("Failed：" + err)
                        })
                        .finally(() => {})
                }
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {})
    }

    useEffect(() => {
        getRolesData()
        if (editInfo?.uid) {
            // Loading edit data
            NetWorkApi<QueryAccountProps, API.UrmEditListResponse>({
                method: "get",
                url: "/urm/edit",
                params: {
                    uid: editInfo?.uid
                }
            })
                .then((res: API.UrmEditListResponse) => {
                    if (res.data) {
                        const {user_name, department_parent_id, department_id, role_id, role_name} = res.data
                        const department = department_parent_id
                            ? [department_parent_id, department_id]
                            : [department_id]
                        getDepartmentData(undefined, undefined, department_parent_id)
                        let obj: any = {
                            user_name
                        }
                        if (department_id) {
                            obj.department = department
                        }
                        if (role_id) {
                            obj.role_id = {key: role_id, value: role_name}
                        }
                        form.setFieldsValue(obj)
                    }
                })
                .catch((err) => {
                    failed("Load data failed：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        } else {
            getDepartmentData()
        }
    }, [])

    const onFinish = useMemoizedFn((values) => {
        const {user_name, department, role_id} = values
        // Edit
        const departmentId: number = department[department.length - 1]
        if (editInfo) {
            const params: API.EditUrmRequest = {
                uid: editInfo.uid,
                user_name,
                department: departmentId,
                role_id: role_id?.key || role_id
            }
            NetWorkApi<API.EditUrmRequest, API.ActionSucceeded>({
                method: "post",
                url: "urm/edit",
                data: params
            })
                .then((res: API.ActionSucceeded) => {
                    refresh(departmentId, editInfo?.department_id)
                    onCancel()
                })
                .catch((err) => {
                    failed("Modify account failed：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        }
        // Add
        else {
            const params: API.NewUrmRequest = {
                user_name,
                department: departmentId,
                role_id
            }
            NetWorkApi<API.NewUrmRequest, API.NewUrmResponse>({
                method: "post",
                url: "urm",
                data: params
            })
                .then((res: API.NewUrmResponse) => {
                    const {user_name, password} = res
                    onCancel()
                    refresh(departmentId)
                    const m = showModal({
                        title: "Account info",
                        content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                    })
                    return m
                })
                .catch((err) => {
                    failed("Create account failed：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        }
    })

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <YakitSpin spinning={selectLoading}>{originNode}</YakitSpin>
            </div>
        )
    })

    const initLoadData = (data, id) => {
        NetWorkApi<DepartmentGetProps, API.DepartmentGroupList>({
            method: "get",
            url: "department/group",
            params: {
                departmentId: id
            }
        })
            .then((res: API.DepartmentGroupList) => {
                if (Array.isArray(res.data)) {
                    const dataIn = res.data.map((item) => ({
                        label: item.name,
                        value: item.id
                    }))
                    let newArr = data.map((item) => {
                        if (item.value === id) {
                            return {
                                ...item,
                                children: dataIn
                            }
                        }
                        return item
                    })
                    setDepData([...newArr])
                }
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {})
    }

    const loadData = (selectedOptions: DefaultOptionType[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]
        targetOption.loading = true

        NetWorkApi<DepartmentGetProps, API.DepartmentGroupList>({
            method: "get",
            url: "department/group",
            params: {
                departmentId: targetOption.value
            }
        })
            .then((res: API.DepartmentGroupList) => {
                if (Array.isArray(res.data)) {
                    targetOption.loading = false
                    const data = res.data.map((item) => ({
                        label: item.name,
                        value: item.id
                    }))
                    targetOption.children = data
                    setDepData([...depData])
                }
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {})
    }

    const {run} = useThrottleFn(
        () => {
            getRolesData(getPagination().Page + 1)
        },
        {wait: 500}
    )
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='user_name' label='Username' rules={[{required: true, message: "Required Field"}]}>
                    <Input placeholder='Enter Username' allowClear />
                </Form.Item>
                <Form.Item name='department' label='Org Chart' rules={[{required: true, message: "Required Field"}]}>
                    <Cascader
                        options={depData}
                        loadData={loadData}
                        placeholder='Select an org structure'
                        changeOnSelect
                        onPopupScroll={(e) => {
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                                getDepartmentData(getDepPagination().Page + 1)
                            }
                        }}
                    />
                </Form.Item>
                <Form.Item name='role_id' label='Role' rules={[{required: true, message: "Required Field"}]}>
                    <YakitSelect
                        showSearch
                        placeholder='Select a role'
                        optionFilterProp='children'
                        filterOption={(input, option) =>
                            (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }
                        onPopupScroll={(e) => {
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                                run()
                            }
                        }}
                        dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                    >
                        {roleData.map((item) => (
                            <YakitSelect.Option key={item.id} value={item.id}>
                                {item.name}
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        Confirm
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface CreateOrganizationFormProps {
    parentId?: number
    onClose: () => void
    refresh: (v?: {name: string; key: number}) => void
}

interface DepartmentPostProps {
    name: string
    pid: number
}

const CreateOrganizationForm: React.FC<CreateOrganizationFormProps> = (props) => {
    const {onClose, refresh, parentId} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const params = {
            name: values.name,
            pid: 0
        }
        if (parentId) {
            params.pid = parentId
        }
        NetWorkApi<DepartmentPostProps, number>({
            method: "post",
            url: "department",
            data: params
        })
            .then((res: number) => {
                if (res) {
                    success("Created successfully")
                    refresh({name: values.name, key: res})
                    onClose()
                }
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    })
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='name' label='Dept name' rules={[{required: true, message: "Required Field"}]}>
                    <Input placeholder='Enter dept name' allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        Confirm
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface DepartmentGetProps {}

interface DepartmentRemoveProps {
    id: number
}

interface DataSourceProps {
    title: string
    key: number
    // Expandable?
    isLeaf: boolean
    // Count
    userNum?: number
    // Show add button?
    isShowAddBtn?: boolean
    // Parent ID
    pid?: number
    // Show all buttons?
    isShowAllBtn?: boolean
    children?: any
}

export interface OrganizationAdminPageProps {
    selectItemId: string | number | undefined
    setSelectItemId: (v: string | number | undefined) => void
    treeCount: TreeCountProps | undefined
    treeReduceCount: TreeReduceCountProps
    setSelectTitle: (v: SelectTitleProps | undefined) => void
}

interface ResetNameProps {
    pid: number
    name: string
    id?: number
}
const OrganizationAdminPage: React.FC<OrganizationAdminPageProps> = (props) => {
    const {selectItemId, setSelectItemId, treeCount, treeReduceCount, setSelectTitle} = props
    const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([])
    const [loadedKeys, setLoadedKeys] = useState<(string | number)[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [pagination, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [treeHeight, setTreeHeight] = useState<number>(0)
    const TreeBoxRef = useRef<any>()
    // Normal - Org Chart
    const [department, setDepartment, getDepartment] = useGetState<DataSourceProps[]>([])
    // Unaffiliated - Org Chart count
    const [noDepartment, setNoDepartment] = useState<number>()

    const realDataSource = useMemo(() => {
        if (noDepartment && noDepartment > 0) {
            return [
                {
                    title: "Unaffiliated",
                    key: -1,
                    userNum: noDepartment,
                    isLeaf: true,
                    isShowAllBtn: false
                },
                ...department
            ]
        }
        return [...department]
    }, [department, noDepartment])

    useEffect(() => {
        setTreeHeight(TreeBoxRef.current.offsetHeight)
        // Get normal org structure
        update()
        // Get unaffiliated org structure
        noUpdate()
    }, [])

    const updateSelectTitle = (list: DataSourceProps[], key: string | number, firstTitle?: string) =>
        list.map((node) => {
            if (node.key === key) {
                if (firstTitle) {
                    setSelectTitle({
                        firstTitle,
                        secondTitle: node.title
                    })
                } else {
                    setSelectTitle({
                        firstTitle: node.title
                    })
                }
            }
            if (node.children) {
                updateSelectTitle(node.children, key, node.title)
            }
        })
    const updateTreeCount = (list: DataSourceProps[], treeCount: TreeCountProps): DataSourceProps[] =>
        list.map((node) => {
            if (node.key === treeCount.id) {
                return {
                    ...node,
                    userNum: treeCount.count
                }
            }
            if (node.children) {
                return {
                    ...node,
                    children: updateTreeCount(node.children, treeCount)
                }
            }
            return node
        })

    // Update count
    useEffect(() => {
        if (treeCount) {
            setDepartment((origin) => updateTreeCount(origin, treeCount))
            noUpdate()
        }
    }, [treeCount])

    const updateTreeReduceCount = (list: DataSourceProps[], treeCountObj: TreeReduceCountProps): DataSourceProps[] => {
        const {obj, reduce} = treeCountObj
        return list.map((node) => {
            if (obj.hasOwnProperty(node.key)) {
                let newUserNum = reduce ? (node?.userNum || 0) - obj[node.key] : (node?.userNum || 0) + obj[node.key]
                let userNum = newUserNum > 0 ? newUserNum : 0
                return {
                    ...node,
                    userNum
                }
            }
            // Multi-level recursion (for future upgrades)）
            if (node.children) {
                return {
                    ...node,
                    children: updateTreeReduceCount(node.children, treeCountObj)
                }
            }
            return node
        })
    }

    // Dynamically calculate count update
    useEffect(() => {
        if (treeReduceCount) {
            setDepartment((origin) => updateTreeReduceCount(origin, treeReduceCount))
            noUpdate()
        }
    }, [treeReduceCount])

    const noUpdate = () => {
        NetWorkApi<DepartmentGetProps, API.DepartmentList>({
            method: "get",
            url: "noDepartment",
            params: {}
        })
            .then((res: API.DepartmentList) => {
                setNoDepartment(res.userNum)
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const update = (offsetId: number = 0) => {
        setLoading(true)
        const paginationProps = {
            page: pagination.Page,
            limit: pagination.Limit
        }
        NetWorkApi<DepartmentGetProps, API.DepartmentListResponse>({
            method: "get",
            url: "department",
            params: {
                ...paginationProps,
                offsetId
            }
        })
            .then((res: API.DepartmentListResponse) => {
                const newData = (res?.data || [])
                    .filter((item) => item.name || item.userNum > 0)
                    .map((item) => ({
                        title: item.name,
                        key: item.id,
                        userNum: item.userNum,
                        isLeaf: item.exist_group ? false : true,
                        isShowAddBtn: true
                    }))
                // Default select first if none
                // if (newData.length > 0) {
                //     setSelectItemId(selectItemId || newData[0].key)
                // }
                setDepartment([...getDepartment(), ...newData])
                setPagination({...pagination, Limit: res.pagemeta.limit})
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const {run} = useThrottleFn(
        () => {
            const lastItem = getDepartment().slice(-1)
            const offsetId: number = lastItem.length > 0 ? lastItem[0].key : 0
            update(offsetId)
        },
        {wait: 500}
    )
    // Delete
    const onRemove = (id: number, pid?: number) => {
        NetWorkApi<DepartmentRemoveProps, API.ActionSucceeded>({
            method: "delete",
            url: "department",
            params: {
                id
            }
        })
            .then((res: API.ActionSucceeded) => {
                if (res.ok) {
                    success("Delete Success")
                    // Reset to show all
                    setSelectItemId(undefined)
                    setSelectTitle(undefined)
                    noUpdate()
                    if (pid) {
                        onLoadData({key: pid})
                    } else {
                        // Dynamic delete single data operation
                        const filterArr = department.filter((item) => item.key !== id)
                        setDepartment(filterArr)
                    }
                }
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {})
    }
    // Edit name
    const resetName = (name, id, pid = 0) => {
        const params: ResetNameProps = {
            name,
            pid
        }
        if (id) {
            params.id = id
        }
        NetWorkApi<ResetNameProps, API.ActionSucceeded>({
            method: "post",
            url: "department",
            data: params
        })
            .then((res: API.ActionSucceeded) => {
                if (res) {
                    success("Modified successfully")
                    // First-level update
                    if (pid === 0) {
                        setDepartment((origin) =>
                            origin.map((node) => {
                                if (node.key === id) {
                                    return {
                                        ...node,
                                        title: name
                                    }
                                }
                                return node
                            })
                        )
                    }
                    // Internal update
                    else {
                        onLoadData({key: pid})
                    }
                }
            })
            .catch((err) => {
                failed("Failed：" + err)
            })
            .finally(() => {})
    }

    const updateTreeData = (list: DataSourceProps[], key: React.Key, children: DataSourceProps[]): DataSourceProps[] =>
        list.map((node) => {
            if (node.key === key) {
                return {
                    ...node,
                    isLeaf: false,
                    children
                }
            }
            // Multi-level recursion (for future upgrades)）
            // if (node.children) {
            //     return {
            //         ...node,
            //         children: updateTreeData(node.children, key, children)
            //     }
            // }
            return node
        })
    const onLoadData = ({key, children}: any) => {
        return new Promise<void>((resolve) => {
            if (children) {
                resolve()
                return
            }
            NetWorkApi<DepartmentGetProps, API.DepartmentGroupList>({
                method: "get",
                url: "department/group",
                params: {
                    departmentId: key
                }
            })
                .then((res: API.DepartmentGroupList) => {
                    if (Array.isArray(res.data)) {
                        const newArr = res.data.map((item) => ({
                            title: item.name,
                            key: item.id,
                            userNum: item.userNum,
                            isLeaf: true,
                            pid: key
                        }))
                        setDepartment((origin) => updateTreeData(origin, key, newArr))
                    }
                    // If result empty, last deleted
                    else {
                        setDepartment((origin) =>
                            origin.map((node) => {
                                if (node.key === key) {
                                    return {
                                        ...node,
                                        isLeaf: true,
                                        children: null
                                    }
                                }
                                return node
                            })
                        )
                    }
                })
                .catch((err) => {
                    failed("Failed：" + err)
                })
                .finally(() => {
                    resolve()
                })
        })
    }

    return (
        <div className='organization-admin-page'>
            <div className='organization-admin-page-title'>
                <div className='title'>Org Chart</div>
                <div
                    className='add-icon'
                    onClick={() => {
                        const m = showModal({
                            title: "Add 1st Level Dept",
                            width: 600,
                            content: (
                                <CreateOrganizationForm
                                    onClose={() => {
                                        m.destroy()
                                    }}
                                    refresh={(obj) => {
                                        // Dynamic add single data operation
                                        if (obj) {
                                            setDepartment((origin) => [
                                                {
                                                    title: obj.name,
                                                    key: obj?.key,
                                                    userNum: 0,
                                                    isLeaf: true,
                                                    isShowAddBtn: true
                                                },
                                                ...origin
                                            ])
                                        }
                                    }}
                                />
                            )
                        })
                    }}
                >
                    <PlusOutlined />
                </div>
            </div>
            <Spin spinning={loading} wrapperClassName='spin-box'>
                <div className='organization-admin-page-content'>
                    <div ref={TreeBoxRef} className='organization-admin-page-content-tree'>
                        <Tree
                            loadData={onLoadData}
                            treeData={realDataSource}
                            blockNode={true}
                            onSelect={(key) => {
                                if (key.length <= 0) {
                                    return
                                }
                                updateSelectTitle(realDataSource, key[0])
                                setSelectItemId(key[0])
                            }}
                            selectedKeys={selectItemId ? [selectItemId] : []}
                            height={treeHeight}
                            expandedKeys={expandedKeys}
                            loadedKeys={loadedKeys}
                            onExpand={(expandedKeys, {expanded, node}) => {
                                setExpandedKeys(expandedKeys)
                            }}
                            onLoad={(loadedKeys, {event, node}) => {
                                setLoadedKeys(loadedKeys)
                            }}
                            titleRender={(nodeData: DataSourceProps) => {
                                const {isShowAllBtn = true} = nodeData
                                return (
                                    <div
                                        className={`department-item ${
                                            nodeData.key === selectItemId ? "click-item" : ""
                                        }`}
                                    >
                                        <div className='department-item-info'>
                                            {nodeData.title}（{nodeData.userNum}）
                                            {/* {nodeData.userNum && `（${nodeData.userNum}）`} */}
                                        </div>
                                        {isShowAllBtn && (
                                            <div className='department-item-operation'>
                                                <Space>
                                                    <Popover
                                                        trigger={"click"}
                                                        title={"Edit name"}
                                                        content={
                                                            <Input
                                                                size={"small"}
                                                                defaultValue={nodeData.title}
                                                                onBlur={(e) => {
                                                                    if (!!e.target.value.length) {
                                                                        resetName(
                                                                            e.target.value,
                                                                            nodeData.key,
                                                                            nodeData.pid
                                                                        )
                                                                    } else {
                                                                        warn("Cannot be empty")
                                                                    }
                                                                }}
                                                            />
                                                        }
                                                    >
                                                        <EditOutlined
                                                            onClick={(e) => {
                                                                // Prevent bubbling
                                                                e?.stopPropagation()
                                                                setSelectItemId(nodeData.key)
                                                            }}
                                                            className='department-item-operation-icon'
                                                        />
                                                    </Popover>
                                                    <Popconfirm
                                                        title={"Confirm item deletion? Irreversible"}
                                                        onConfirm={(e) => {
                                                            onRemove(nodeData.key, nodeData.pid)
                                                        }}
                                                    >
                                                        <DeleteOutlined
                                                            onClick={(e) => {
                                                                // Prevent bubbling
                                                                e?.stopPropagation()
                                                                setSelectItemId(nodeData.key)
                                                            }}
                                                            className='department-item-operation-icon'
                                                        />
                                                    </Popconfirm>
                                                    {nodeData.isShowAddBtn && (
                                                        <PlusOutlined
                                                            className='department-item-operation-add-icon'
                                                            onClick={(e) => {
                                                                // Prevent bubbling
                                                                e?.stopPropagation()
                                                                setSelectItemId(nodeData.key)
                                                                const m = showModal({
                                                                    title: "Add 2nd Level Dept",
                                                                    width: 600,
                                                                    content: (
                                                                        <CreateOrganizationForm
                                                                            onClose={() => {
                                                                                m.destroy()
                                                                            }}
                                                                            refresh={() => {
                                                                                onLoadData({key: nodeData.key})
                                                                            }}
                                                                            parentId={nodeData.key}
                                                                        />
                                                                    )
                                                                })
                                                            }}
                                                        />
                                                    )}
                                                </Space>
                                            </div>
                                        )}
                                    </div>
                                )
                            }}
                            onScroll={(e) => {
                                const {target} = e
                                const ref: HTMLDivElement = target as unknown as HTMLDivElement
                                if (ref.scrollTop + ref.offsetHeight + 10 >= ref.scrollHeight) {
                                    run()
                                }
                            }}
                        />
                    </div>
                    {/* {dataSource.length > 0 && (
                        <div style={{textAlign: "center"}}>
                            <Pagination
                                size='small'
                                current={pagination.Page}
                                pageSize={pagination?.Limit || 10}
                                showSizeChanger={true}
                                total={total}
                                showTotal={(i) => <Tag>{`Total ${i}`}</Tag>}
                                onChange={(page: number, limit?: number) => update(page, limit)}
                            />
                        </div>
                    )} */}
                </div>
            </Spin>
        </div>
    )
}

export interface AccountAdminPageProps {}

export interface QueryExecResultsParams {
    keywords: string
}

interface QueryProps {}
interface TreeCountProps {
    id: string | number
    count: number
}
interface ResetProps {
    user_name: string
    uid: string
}

interface TreeReduceCountProps {
    // Subtract? Otherwise, add
    reduce: boolean
    // Change object
    obj: any
}
interface SelectTitleProps {
    firstTitle: string
    secondTitle?: string
}

const AccountAdminPage: React.FC<AccountAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [userInfoForm, setUserInfoForm] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryExecResultsParams>({
        keywords: ""
    })
    const [selectedRows, setSelectedRows] = useState<API.UrmUserList[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [dataSource, setDataSource] = useState<API.UrmUserList[]>([])
    const [total, setTotal] = useState<number>()
    // Edit item info
    const [editInfo, setEditInfo] = useState<API.UrmUserList>()
    const [selectItemId, setSelectItemId,getSelectItemId] = useGetState<string | number>()
    const [selectTitle, setSelectTitle] = useState<SelectTitleProps>()
    // Total to Count based on request
    const [treeCount, setTreeCount] = useState<TreeCountProps>()
    // Dynamically process and calculate Count
    const [treeReduceCount, setTreeReduceCount] = useState<TreeReduceCountProps>({reduce: true, obj: {}})
    const {userInfo, setStoreUserInfo} = useStore()
    const update = (page?: number, limit?: number, addDepartmentId?: number) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }
        // Handle unaffiliated request
        const id = getSelectItemId() === -1 ? 0 : getSelectItemId()
        // Used to update org chart count on account creation
        const departmentId = addDepartmentId || id
        let filterObj: any = {
            ...params,
            ...paginationProps
        }
        if (departmentId) {
            filterObj.departmentId = departmentId
        }
        NetWorkApi<QueryProps, API.UrmUserListResponse>({
            method: "get",
            url: "urm",
            params: {
                ...params,
                ...paginationProps,
                departmentId: departmentId
            }
        })
            .then((res) => {
                // Create account change org count
                if (addDepartmentId) {
                    setTreeCount({
                        id: addDepartmentId,
                        count: res.pagemeta.total
                    })
                }
                // Normal table render
                else {
                    if (Array.isArray(res.data)) {
                        const newData = res.data.map((item) => ({...item}))
                        setDataSource(newData)
                    } else {
                        setDataSource([])
                    }
                    setPagination({...pagination, Limit: res.pagemeta.limit})
                    setTotal(res.pagemeta.total);
                    (selectItemId&&params.keywords==="") &&
                        setTreeCount({
                            id: selectItemId,
                            count: res.pagemeta.total
                        })
                }
            })
            .catch((err) => {
                failed("Get account list failed：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }

    useEffect(() => {
        setSelectedRows([])
        setSelectedRowKeys([])
        update()
    }, [selectItemId])

    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows: API.UrmUserList[]) => {
            setSelectedRows(selectedRows)
            setSelectedRowKeys(selectedRowKeys)
        },
        selectedRowKeys
    }

    const onRemove = (uid: string[], department_id?: number) => {
        NetWorkApi<API.DeleteUrm, API.NewUrmResponse>({
            method: "delete",
            url: "urm",
            data: {
                uid
            }
        })
            .then((res) => {
                success("Delete user successful")
                update()
                // Delete default displayed data
                if (!selectItemId) {
                    let removeTool = {}
                    if (department_id) {
                        removeTool = {[department_id]: 1}
                    } else {
                        removeTool = selectedRows.reduce((pre, cur) => {
                            if (cur.department_id) {
                                if (cur.department_id in pre) {
                                    pre[cur.department_id]++
                                } else {
                                    pre[cur.department_id] = 1
                                }
                            }
                            return pre
                        }, {})
                    }
                    setTreeReduceCount({obj: removeTool, reduce: true})
                }
            })
            .catch((err) => {
                failed("Delete account failed：" + err)
            })
            .finally(() => {})
    }

    const onReset = (uid, user_name) => {
        NetWorkApi<ResetProps, API.NewUrmResponse>({
            method: "post",
            url: "urm/reset/pwd",
            params: {
                user_name,
                uid
            }
        })
            .then((res) => {
                update()
                const {user_name, password} = res
                const m = showModal({
                    title: "Account info",
                    content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                })
                return m
            })
            .catch((err) => {
                failed("Reset account failed：" + err)
            })
            .finally(() => {})
    }

    const judgeAvatar = (record) => {
        const {head_img, user_name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={32} src={head_img} />
        ) : (
            <Avatar size={32} style={{backgroundColor: "rgb(245, 106, 0)"}}>
                {user_name.slice(0, 1)}
            </Avatar>
        )
    }

    const copySecretKey = (note:string) => {
        
        NetWorkApi<any, API.RemoteOperationResponse>({
            url: "remote/operation",
            method: "get",
            params: {
                note
            }
        }).then((res) => {
            const {data} = res
            if (Array.isArray(data) && data.length > 0) {
                const {auth, id, note, port, host} = data[0]
                const {pubpem, secret} = JSON.parse(auth)
                let resultObj = {
                    id,
                    note,
                    port,
                    host,
                    pubpem,
                    secret
                }
                const showData = unReadable(resultObj)
                ipcRenderer.invoke("set-copy-clipboard", showData)
                success("Copy remote link success")
            } else {
                failed(`No recent link info, ask user to initiate remote connection`)
            }
        })
        .catch((err) => {
            setLoading(false)
                failed(`Copy remote link failed:${err}`)
        })
        .finally(() => {})
    }

    const columns: ColumnsType<API.UrmUserList> = [
        {
            title: "Username",
            dataIndex: "user_name",
            render: (text: string, record) => (
                <div>
                    {judgeAvatar(record)}
                    <span style={{marginLeft: 10}}>{text}</span>
                </div>
            )
        },
        {
            title: "Org Chart",
            dataIndex: "department_name",
            render: (text, record) => {
                return (
                    <div>
                        {record?.department_parent_name && `${record.department_parent_name} / `}
                        {text}
                    </div>
                )
            }
        },
        {
            title: "Role",
            dataIndex: "role_name"
        },
        {
            title: "Created time",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "Action",
            render: (i) => (
                <Space>
                    <Button
                        size='small'
                        type="link"
                        onClick={() => {
                            setEditInfo(i)
                            setUserInfoForm(true)
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm title={"Confirm reset user password?？"} onConfirm={() => onReset(i.uid, i.user_name)}>
                        <Button size='small' type="link">
                            Reset password
                        </Button>
                    </Popconfirm>
                    <Button
                        size='small'
                        type="link"
                        onClick={() => copySecretKey(i.user_name)}
                    >
                        Copy remote link
                    </Button>
                    <Popconfirm
                        title={"Confirm deletion of this user?？"}
                        onConfirm={() => {
                            onRemove([i.uid], i.department_id)
                        }}
                        placement="right"
                    >
                        <Button size={"small"} danger={true} type="link">
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <div className='account-admin-page'>
            <div className='title-operation'>
                <div className='filter'>
                    <Input.Search
                        placeholder={"Enter username to search"}
                        enterButton={true}
                        size={"small"}
                        style={{width: 200}}
                        value={params.keywords}
                        onChange={(e) => {
                            setParams({...getParams(), keywords: e.target.value})
                        }}
                        onSearch={() => {
                            if(getSelectItemId()===undefined){
                                update()
                            }
                            else{
                                setSelectItemId(undefined)
                            }
                        }}
                    />
                </div>
                <div className='operation'>
                    <Space>
                        {!!selectedRowKeys.length ? (
                            <Popconfirm
                                title={"Confirm delete selected users? Irreversible"}
                                onConfirm={() => {
                                    onRemove(selectedRowKeys)
                                }}
                            >
                                <Button type='primary' htmlType='submit' size='small'>
                                    Batch delete
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Button type='primary' size='small' disabled={true}>
                                Batch delete
                            </Button>
                        )}
                        <Button
                            type='primary'
                            htmlType='submit'
                            size='small'
                            onClick={() => {
                                setEditInfo(undefined)
                                setUserInfoForm(!userInfoForm)
                            }}
                        >
                            Create account
                        </Button>
                    </Space>
                </div>
            </div>
            <ResizeBox
                firstNode={
                    <OrganizationAdminPage
                        setSelectItemId={setSelectItemId}
                        selectItemId={selectItemId}
                        treeCount={treeCount}
                        treeReduceCount={treeReduceCount}
                        setSelectTitle={setSelectTitle}
                    />
                }
                firstMinSize={300}
                firstRatio={"300px"}
                secondNode={
                    <div style={{overflowY: "auto", height: "100%"}}>
                        <div className='block-title'>
                            {selectTitle ? (
                                <>
                                    <div className='first-title'>{selectTitle.firstTitle}</div>
                                    {selectTitle?.secondTitle && (
                                        <>
                                        <RightOutlined  className='right-outlined'/>
                                            <div className='second-title'>{selectTitle.secondTitle}</div>
                                        </>
                                    )}
                                </>
                            ) : (
                                "All members"
                            )}
                        </div>
                        <Table
                            loading={loading}
                            pagination={{
                                size: "small",
                                defaultCurrent: 1,
                                pageSize: pagination?.Limit || 10,
                                showSizeChanger: true,
                                total,
                                showTotal: (i) => <Tag>{`Total ${i}`}</Tag>,
                                onChange: (page: number, limit?: number) => {
                                    update(page, limit)
                                }
                            }}
                            rowKey={(row) => row.uid}
                            rowSelection={{
                                type: "checkbox",
                                ...rowSelection
                            }}
                            columns={columns}
                            size={"small"}
                            bordered={true}
                            dataSource={dataSource}
                        />
                    </div>
                }
            />

            <Modal
                visible={userInfoForm}
                title={editInfo ? "Edit account" : "Create account"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setUserInfoForm(false)}
                footer={null}
            >
                <AccountForm
                    editInfo={editInfo}
                    onCancel={() => setUserInfoForm(false)}
                    refresh={(id, oldId) => {
                        // Count from table total if selectCartItem
                        if (selectItemId) {
                            // Explanation: recalculate added count
                            // Update self and affected on org structure change
                            id === selectItemId ? update() : update(1, undefined, id)
                            id !== selectItemId && oldId && update()
                        } else {
                            // Count from +/- when no selectItemId
                            update()
                            if (oldId) {
                                if (oldId !== id) {
                                    oldId && setTreeReduceCount({obj: {[oldId]: 1}, reduce: true})
                                    id && setTreeReduceCount({obj: {[id]: 1}, reduce: false})
                                }
                            } else {
                                setTreeReduceCount({obj: {[id]: 1}, reduce: false})
                            }
                        }
                    }}
                />
            </Modal>
        </div>
    )
}

export default AccountAdminPage
