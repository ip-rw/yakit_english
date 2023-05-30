/**
 * This file was auto-generated by swagger-to-ts.
 * Do not make direct changes to the file.
 */

export declare namespace API {
  export interface YakitSearchData {
    value: string;
    count: number;
  }
  export interface YakitSearch {
    plugin_type: YakitSearchData[];
    tags: YakitSearchData[];
    status: YakitSearchData[];
    group: YakitSearchData[];
  }
  export interface YakitPluginResponse {
    id: number;
    uuid: string;
  }
  export interface YakitPluginParam {
    field: string;
    default_value: string;
    type_verbose: string;
    field_verbose: string;
    help: string;
    required?: boolean;
    group?: string;
    extra_setting?: string;
    buildIn_param?: boolean;
  }
  export interface YakitPluginListResponse extends Paging {
    data: YakitPluginDetail[];
  }
  export interface YakitPluginDetailResponse {
    data: YakitPluginDetail;
  }
  export interface YakitPluginDetail extends GormBaseModel, YakitPlugin {}
  export interface YakitPlugin {
    type: string;
    script_name: string;
    default_open: boolean;
    tags: string;
    content: string;
    params?: YakitPluginParam[];
    authors: string;
    user_id?: number;
    head_img: string;
    /**
     * 插件发布的时间
     */
    published_at: number;
    /**
     * 下载次数
     */
    downloaded_total: number;
    /**
     * 获得推荐的次数
     */
    stars: number;
    /**
     * 审核状态
     */
    status: number;
    official: boolean;
    /**
     * 当前用户是否已点赞
     */
    is_stars: boolean;
    help?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    comment_num: number;
    contributors?: string;
    uuid: string;
    is_private: boolean;
    /**
     * 提交修改插件合并的的人
     */
    submitter?: string;
    /**
     * 是否能审核插件
     */
    checkPlugin?: boolean;
    /**
     * 复制源插件
     */
    base_plugin_id?: number;
    /**
     * 复制源插件名
     */
    base_script_name?: string;
    group?: string;
  }
  export interface UserOrdinaryResponse {
    data: UserList[];
  }
  export interface UserListResponse extends Paging {
    data: UserList[];
  }
  export interface UserList {
    id: number;
    created_at: number;
    updated_at: number;
    name: string;
    from_platform: string;
    email?: string;
    appid: string;
    head_img: string;
    role: string;
  }
  export interface UserInfoByToken {
    token: string;
  }
  export interface UserData {
    from_platform: string;
    appid: string;
    head_img: string;
    name: string;
    token: string;
    role: string;
    user_id: number;
    uid?: string;
    /**
     * 是否显示审核状态筛选
     */
    showStatusSearch?: boolean;
  }
  export interface UserAuthorityRequest {
    userIds: number[];
    pluginIds?: string;
  }
  export interface UserAuthorityListResponse extends Paging {
    data: UserAuthorityList[];
  }
  export interface UserAuthorityList {
    user_id?: number;
    created_at?: number;
    user_name?: string;
    from_platform?: string;
    appid: string;
    head_img?: string;
    pluginIds?: string;
    plugin?: PluginTypeList[];
  }
  export interface UrmUserListResponse extends Paging {
    data: UrmUserList[];
  }
  export interface UrmUserList {
    id: number;
    created_at: number;
    user_name: string;
    head_img: string;
    from_platform: string;
    uid: string;
    department_id?: number;
    department_name?: string;
    role_id?: number;
    role_name?: string;
    department_parent_id?: number;
    department_parent_name?: string;
  }
  export interface UrmLoginRequest {
    user_name: string;
    pwd: string;
  }
  export interface UrmEditListResponse {
    data: UrmUserList;
  }
  export interface UpUserInfoRequest {
    old_pwd?: string;
    pwd?: string;
    confirm_pwd?: string;
    head_img?: string;
  }
  export interface UpPluginRecycleRequest {
    ids?: number[];
    keywords?: string;
    dump: boolean;
  }
  export interface UpdateUserRole {
    appid: string[];
    operation: string;
    role?: string;
  }
  export interface UpdatePluginRequest {
    uuid: string;
    user_id?: number;
    is_official?: string;
    is_private?: string;
  }
  export interface ShareResponse {
    share_id: string;
    extract_code?: string;
    token?: string;
  }
  export interface ShareRequest {
    expired_time: number;
    module: string;
    share_content: string;
    pwd: boolean;
    share_id?: string;
    limit_num?: number;
  }
  export interface SaveYakitPlugin {
    id?: number;
    type?: string;
    content?: string;
    params?: YakitPluginParam[];
    help?: string;
    tags?: string[];
    script_name: string;
    published_at?: number;
    default_open: boolean;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    download_total?: number;
    contributors?: string;
  }
  export interface RoleListResponse extends Paging {
    data: RoleList[];
  }
  export interface RoleList {
    id: number;
    name: string;
    createdAt: number;
    checkPlugin: boolean;
  }
  export interface RiskUploadResponse extends Paging {
    data: RiskLists[];
  }
  export interface RiskUploadRequest {
    token: string;
    risk_hash: string;
    ip?: string;
    ip_integer?: number;
    url?: string;
    port?: number;
    host?: string;
    title?: string;
    title_verbose?: string;
    risk_type?: string;
    risk_type_verbose?: string;
    parameter?: string;
    payload?: string;
    details?: string;
    severity?: string;
    from_yak_script?: string;
    waiting_verified?: boolean;
    reverse_token?: string;
    runtime_id?: string;
    quoted_request?: string;
    quoted_response?: string;
    is_potential?: boolean;
    cve?: string;
    description?: string;
    solution?: string;
    risk_created_at?: number;
  }
  export interface RiskTypes {
    risk_type: string;
  }
  export interface RiskTypeResponse {
    data: RiskTypes[];
  }
  export interface RiskLists extends GormBaseModel, RiskList {}
  export interface RiskList {
    user_name: string;
    rish_hash: string;
    ip: string;
    ip_integer: number;
    url: string;
    port: number;
    host: string;
    title: string;
    title_verbose: string;
    risk_type: string;
    risk_type_verbose: string;
    parameter: string;
    payload: string;
    details: string;
    severity: string;
    from_yak_script: string;
    waiting_verified: boolean;
    reverse_token: string;
    runtime_id: string;
    quoted_request: string;
    quoted_response: string;
    is_potential: boolean;
    cve: string;
    description: string;
    solution: string;
    risk_created_at: number;
    hash: string;
  }
  export interface RemoteTunnelResponse {
    server: string;
    secret: string;
    gen_tls_crt: string;
  }
  export interface RemoteStatusResponse {
    status: boolean;
    /**
     * 控制端人员
     */
    user_name: string;
  }
  export interface RemoteResponse extends Paging {
    data: RemoteLists[];
  }
  export interface RemoteOperationResponseData {
    port: number;
    note: string;
    id: string;
    auth: string;
    host: string;
  }
  export interface RemoteOperationResponse {
    data: RemoteOperationResponseData[];
  }
  export interface RemoteOperationRequest {
    tunnel: string;
    addr: string;
    auth: string;
    note: string;
    /**
     * true 连接, false 断开连接
     */
    status: boolean;
  }
  export interface RemoteLists extends GormBaseModel, RemoteList {}
  export interface RemoteList {
    hash: string;
    addr: string;
    status: boolean;
    user_name: string;
    head_img: string;
  }
  export interface Principle {
    user: string;
    role: string;
    user_id: number;
    head_img: string;
    from_platform: string;
  }
  export interface PluginTypeListResponse {
    data: PluginTypeList[];
  }
  export interface PluginTypeList {
    id: number;
    script_name: string;
  }
  export interface PluginTopSearchResponse {
    data: PluginTopSearch[];
  }
  export interface PluginTopSearch {
    member: string;
    score: number;
  }
  export interface PluginIncreResponse {
    day_incre_num: number;
    yesterday_incre_num: number;
    week_incre_num: number;
    lastWeek_incre_num: number;
  }
  export interface PluginGroupListResponse {
    data: PluginGroupList[];
  }
  export interface PluginGroupList {
    type: string;
    typeList?: PluginGroup[];
  }
  export interface PluginGroup {
    id: number;
    script_name: string;
  }
  export interface PluginDownloads {
    type: string;
    script_name: string;
    default_open: boolean;
    tags: string;
    content: string;
    params?: YakitPluginParam[];
    user_id?: number;
    /**
     * 插件发布的时间
     */
    published_at: number;
    /**
     * 下载次数
     */
    downloaded_total: number;
    /**
     * 获得推荐的次数
     */
    stars: number;
    /**
     * 审核状态
     */
    status: number;
    official: boolean;
    help?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    /**
     * true 为私有
     */
    is_private: boolean;
    authors: string;
    contributors: string;
    uuid: string;
    head_img: string;
    base_plugin_id?: number;
    group?: string;
  }
  export interface PluginDownloadResponse extends Paging {
    data: PluginDownloadDetail[];
  }
  export interface PluginDownloadDetail
    extends GormBaseModel,
      PluginDownloads {}
  export interface PluginDownload {
    /**
     * 下载所有 all
     */
    type?: string;
    /**
     * 单个，批量下载传uuid
     */
    uuid?: string[];
    token?: string;
    /**
     * 下载个人所有/插件商店
     */
    bind_me?: boolean;
    page?: number;
    limit?: number;
    keywords?: string;
    plugin_type?: string;
    status?: string;
    is_private?: string;
    tags?: string;
    user_id?: number;
    user_name?: string;
    /**
     * 根据插件名批量下载
     */
    script_name?: string[];
    /**
     * 当天 day, 本周 week
     */
    time_search?: string;
    group?: string;
  }
  export interface Paging {
    pagemeta: PageMeta;
  }
  export interface PageMeta {
    /**
     * 页面索引
     */
    page: number;
    /**
     * 页面数据条数限制
     */
    limit: number;
    /**
     * 总共数据条数
     */
    total: number;
    /**
     * 总页数
     */
    total_page: number;
  }
  export interface OperationsResponse extends Paging {
    data: Operation[];
  }
  export interface Operation extends GormBaseModel, NewOperation {}
  export interface NewYakitPlugin {
    id?: number;
    type?: string;
    content?: string;
    params?: YakitPluginParam[];
    help?: string;
    tags?: string[];
    script_name: string;
    published_at?: number;
    default_open: boolean;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    download_total?: number;
    contributors?: string;
    is_private?: boolean;
    /**
     * 复制插件id
     */
    base_plugin_id?: number;
    group?: string;
  }
  export interface NewUrmResponse {
    user_name: string;
    password: string;
  }
  export interface NewUrmRequest {
    user_name: string;
    department: number;
    role_id: number;
  }
  export interface NewRoleRequest {
    id?: number;
    name: string;
    checkPlugin: boolean;
    pluginType?: string;
    pluginIds?: string;
    plugin?: PluginTypeList[];
  }
  export interface NewOperation {
    type: string;
    trigger_user_unique_id: string;
    operation_plugin_id: string;
    extra?: string;
  }
  export interface NewComment {
    plugin_id: number;
    by_user_id?: number;
    message_img?: string[];
    parent_id?: number;
    root_id?: number;
    message?: string;
  }
  export interface MergePluginRequest {
    /**
     * 申请列表id
     */
    id: number;
    merge_plugin: boolean;
    type?: string;
    content?: string;
    params?: YakitPluginParam[];
    help?: string;
    tags?: string[];
    script_name?: string;
    contributors?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
  }
  export interface GormBaseModel {
    id: number;
    created_at: number;
    updated_at: number;
  }
  export interface GetRiskWhere {
    hash?: string[];
    search?: string;
    net_work?: string;
    ports?: string;
    risk_type?: string;
    token?: string;
    waiting_verified?: boolean;
    severity?: string;
    user_name?: string;
  }
  export interface GetRemoteWhere {
    user_name?: string;
    start_time?: number;
    end_time?: number;
    status?: string;
  }
  export interface GetPluginWhere {
    keywords?: string;
    /**
     * 审核状态,0待审核，1通过审核，2审核不通过
     */
    status?: string;
    plugin_type?: string;
    bind_me: boolean;
    is_private?: string;
    tags?: string;
    recycle: boolean;
    user_name?: string;
    user_id?: number;
    /**
     * 当天 day, 本周 week
     */
    time_search?: string;
    group?: string;
    delete_uuid?: string[];
    delete_dump?: boolean;
  }
  export interface GetPluginUnloggedWhere {
    keywords?: string;
    plugin_type?: string;
    tags?: string;
    user_name?: string;
    user_id?: number;
    /**
     * 当天 day, 本周 week
     */
    time_search?: string;
  }
  export interface ExtractResponse {
    extract_content: string;
    module: string;
  }
  export interface EditUrmRequest {
    uid: string;
    user_name?: string;
    department?: number;
    role_id?: number;
  }
  export interface DepartmentListResponse extends Paging {
    data: DepartmentList[];
  }
  export interface DepartmentList {
    id: number;
    name: string;
    userNum: number;
    /**
     * 是否有二级分组
     */
    exist_group?: boolean;
  }
  export interface DepartmentGroupList {
    data: DepartmentList[];
  }
  export interface DeleteUrm {
    uid: string[];
  }
  export interface DeleteResource {
    csrf_token?: string;
    file_name: string[];
    /**
     * 删除图片传'img' 视频传 'video'
     */
    file_type: string;
  }
  export interface DeletePluginUuid {
    uuid: string[];
    dump: boolean;
    keywords?: string;
    is_recycle?: boolean;
  }
  export interface CompanyLicenseConfigResponse extends Paging {
    data: CompanyLicenseConfigList[];
  }
  export interface CompanyLicenseConfigList {
    id: number;
    company: string;
    maxActivationNum: number;
    useActivationNum: number;
    maxUser: number;
    durationDate: number;
    currentTime?: number;
  }
  export interface CommentListResponse extends Paging {
    data: CommentListData[];
  }
  export interface CommentListData {
    id: number;
    created_at: number;
    updated_at: number;
    plugin_id: number;
    root_id: number;
    parent_id: number;
    user_id: number;
    user_name: string;
    head_img: string;
    message: string;
    message_img: string;
    like_num: number;
    by_user_id: number;
    by_user_name: string;
    by_head_img: string;
    reply_num: number;
    is_stars?: boolean;
  }
  export interface ApplyPluginResponse {
    type?: string;
    script_name: string;
    tags?: string;
    content?: string;
    published_at?: number;
    params?: YakitPluginParam[];
    user_id?: number;
    /**
     * 审核状态
     */
    status?: number;
    official?: boolean;
    help?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    contributors?: string;
    uuid?: string;
    is_private?: boolean;
    stars?: number;
    download_total?: number;
  }
  export interface ApplyPluginRequest {
    /**
     * 申请列表id
     */
    id: number;
    type?: string;
    content?: string;
    params?: YakitPluginParam[];
    help?: string;
    tags?: string[];
    script_name?: string;
    contributors?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
  }
  export interface ApplyPluginLists extends GormBaseModel, ApplyPluginList {}
  export interface ApplyPluginList {
    user_name: string;
    role?: string;
    user_id?: number;
    /**
     * 合并状态 0 待处理  1合并  2拒绝
     */
    merge_status: number;
    plugin_id?: number;
    up_plugin?: ApplyPluginListUpPlugin;
    /**
     * 当前插件数据/ 修改用户为admin时为修改前数据
     */
    merge_before_plugin?: ApplyPluginListMergeBeforePlugin;
  }
  export interface ApplyPluginListMergeBeforePlugin {
    content?: string;
  }
  export interface ApplyPluginListUpPlugin {
    content?: string;
  }
  export interface ApplyPluginDetail {
    user_name: string;
    plugin_user_id: number;
    apply_user_id: number;
    user_role: string;
    plugin_id: number;
    up_plugin: ApplyPluginDetailUpPlugin;
    /**
     * 当前插件数据/ 修改用户为admin时为修改前数据
     */
    merge_before_plugin: ApplyPluginDetailMergeBeforePlugin;
    /**
     * 合并状态 0 待处理  1合并  2拒绝
     */
    merge_status: number;
  }
  export interface ApplyPluginDetailMergeBeforePlugin {
    type?: string;
    script_name?: string;
    tags?: string;
    content?: string;
    published_at?: number;
    params?: YakitPluginParam[];
    user_id?: number;
    /**
     * 审核状态
     */
    status?: number;
    official?: boolean;
    help?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    contributors?: string;
    uuid?: string;
    is_private?: boolean;
    stars?: number;
    download_total?: number;
  }
  export interface ApplyPluginDetailUpPlugin {
    type?: string;
    script_name?: string;
    tags?: string;
    content?: string;
    published_at?: number;
    params?: YakitPluginParam[];
    user_id?: number;
    /**
     * 审核状态
     */
    status?: number;
    official?: boolean;
    help?: string;
    enable_plugin_selector?: boolean;
    plugin_selector_types?: string;
    is_general_module?: boolean;
    contributors?: string;
    uuid?: string;
    is_private?: boolean;
    stars?: number;
    download_total?: number;
  }
  export interface ApplyListResponses extends Paging {
    data: ApplyPluginLists[];
  }
  export interface ActionSucceeded {
    /**
     * 来源于哪个 API
     */
    from: string;
    /**
     * 执行状态
     */
    ok: boolean;
  }
  export interface ActionFailed {
    /**
     * 来源于哪个 API
     */
    from: string;
    /**
     * 执行状态
     */
    ok: boolean;
    reason: string;
  }
}
