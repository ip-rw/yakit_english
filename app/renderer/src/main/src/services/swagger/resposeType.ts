/**
 * This file was auto-generated by swagger-to-ts.
 * Do not make direct changes to the file.
 */

export declare namespace API {
    export interface YakitPluginParam {
        field: string
        default_value: string
        type_verbose: string
        field_verbose: string
        help: string
        required?: boolean
        group?: string
        extra_setting?: string
        method_type?: string
    }
    export interface UserOrdinaryResponse {
        data: UserList[]
    }
    export interface UserListResponse extends Paging {
        data: UserList[]
    }
    export interface UserList {
        id: number
        created_at: number
        updated_at: number
        name: string
        from_platform: string
        email?: string
        appid: string
        head_img: string
        role: string
    }
    export interface UserInfoByToken {
        token: string
    }
    export interface UserData {
        from_platform: string
        appid: string
        head_img: string
        name: string
        token: string
        role: string
        user_id: number
        uid?: string
        /**
         * Check First Login
         */
        loginTime?: number
        /**
         * Enterprise User Review Permission
         */
        checkPlugin: boolean
    }
    export interface UrmUserListResponse extends Paging {
        data: UrmUserList[]
    }
    export interface UrmUserList {
        id: number
        created_at: number
        user_name: string
        head_img: string
        from_platform: string
        uid: string
        department_id?: number
        department_name?: string
        role_id?: number
        role_name?: string
        department_parent_id?: number
        department_parent_name?: string
    }
    export interface UrmLoginRequest {
        user_name: string
        pwd: string
    }
    export interface UrmEditListResponse {
        data: UrmUserList
    }
    export interface UpUserInfoRequest {
        old_pwd?: string
        pwd?: string
        confirm_pwd?: string
        head_img?: string
    }
    export interface UpPluginsUserRequest {
        uuid: string[]
        user_id: number
    }
    export interface UpPluginsPrivateRequest {
        uuid: string
        is_private: boolean
    }
    export interface UploadDataResponseDetail {
        userName: string
        fileName: string
        filePath: string
    }
    export interface UploadDataResponse extends Paging {
        data: UploadDataList[]
    }
    export interface UploadDataList extends GormBaseModel, UploadDataResponseDetail {}
    export interface UpdateUserRole {
        appid: string[]
        operation: string
        role?: string
    }
    export interface TouristRequest {
        macCode: string
    }
    export interface TouristIncrResponse {
        data: TouristIncrDetail[]
    }
    export interface TouristIncrDetail {
        /**
         * Chart Y-Axis
         */
        count: number
        /**
         * Chart X-Axis
         */
        searchTime: string
    }
    export interface TouristCityResponse {
        /**
         * Total
         */
        total: number
        /**
         * Date
         */
        date: number
        data: TouristCityCount[]
    }
    export interface TouristCityCount {
        city: string
        count: number
    }
    export interface TouristAndUserResponse {
        /**
         * Total Visitors
         */
        touristTotal: number
        /**
         * Total Login Users
         */
        loginTotal: number
        /**
         * Daily Increment
         */
        dayNew: number
        /**
         * Daily Increase Rate
         */
        dayGain: string
        /**
         * up Increase down Decrease
         */
        dayGainUpOrDown?: string
        /**
         * Daily Active
         */
        dayActive: number
        /**
         * Daily Active Increase Rate
         */
        dayActiveGain: string
        /**
         * up Increase down Decrease
         */
        dayActiveGainUpOrDown: string
        /**
         * Weekly Increment
         */
        weekNew: number
        /**
         * Weekly Increase Rate
         */
        weekGain: string
        /**
         * up Increase down Decrease
         */
        weekGainUpOrDown?: string
        /**
         * Weekly Active
         */
        weekActive: number
        /**
         * Weekly Active Increase Rate
         */
        weekActiveGain: string
        /**
         * up Increase down Decrease
         */
        weekActiveGainUpOrDown: string
        /**
         * Monthly Increment
         */
        monthNew: number
        /**
         * Monthly Increase Rate
         */
        monthGain: string
        /**
         * up Increase down Decrease
         */
        monthGainUpOrDown?: string
        /**
         * Monthly Active
         */
        monthActive: number
        /**
         * Monthly Active Increase Rate
         */
        monthActiveGain: string
        /**
         * up Increase down Decrease
         */
        monthActiveGainUpOrDown: string
        dayTimes: number
        /**
         * Today's Duration Increase Rate
         */
        dayTimesGain: string
        /**
         * up Increase down Decrease
         */
        dayTimesGainUpOrDown: string
        weekTimes: number
        /**
         * Weekly Duration Increase Rate
         */
        weekTimesGain: string
        /**
         * up Increase down Decrease
         */
        weekTimesGainUpOrDown: string
        monthTimes: number
        /**
         * Monthly Duration Increase Rate
         */
        monthTimesGain: string
        /**
         * up Increase down Decrease
         */
        monthTimesGainUpOrDown: string
    }
    export interface TouristActiveResponse {
        data: TouristActiveDetail[]
    }
    export interface TouristActiveDetail {
        /**
         * Chart Y-Axis
         */
        count: number
        /**
         * Chart X-Axis
         */
        searchTime: string
    }
    export interface ShareResponse {
        share_id: string
        extract_code?: string
        token?: string
    }
    export interface ShareRequest {
        expired_time: number
        module: string
        share_content: string
        pwd: boolean
        share_id?: string
        limit_num?: number
        token?: string
    }
    export interface RoleListResponse extends Paging {
        data: RoleList[]
    }
    export interface RoleList {
        id: number
        name: string
        createdAt: number
        checkPlugin: boolean
    }
    export interface RiskUploadResponse extends Paging {
        data: RiskLists[]
    }
    export interface RiskUploadRequest {
        token: string
        risk_hash: string
        ip?: string
        ip_integer?: number
        url?: string
        port?: number
        host?: string
        title?: string
        title_verbose?: string
        risk_type?: string
        risk_type_verbose?: string
        parameter?: string
        payload?: string
        details?: string
        severity?: string
        from_yak_script?: string
        waiting_verified?: boolean
        reverse_token?: string
        runtime_id?: string
        quoted_request?: string
        quoted_response?: string
        is_potential?: boolean
        cve?: string
        description?: string
        solution?: string
        risk_created_at?: number
    }
    export interface RiskTypes {
        risk_type: string
    }
    export interface RiskTypeResponse {
        data: RiskTypes[]
    }
    export interface RiskLists extends GormBaseModel, RiskList {}
    export interface RiskList {
        hash: string
        user_name: string
        rish_hash: string
        ip: string
        ip_integer: number
        url: string
        port: number
        host: string
        title: string
        title_verbose: string
        risk_type: string
        risk_type_verbose: string
        parameter: string
        payload: string
        details: string
        severity: string
        from_yak_script: string
        waiting_verified: boolean
        reverse_token: string
        runtime_id: string
        quoted_request: string
        quoted_response: string
        is_potential: boolean
        cve: string
        description: string
        solution: string
        risk_created_at: number
    }
    export interface RemoteTunnelResponse {
        server: string
        secret: string
        gen_tls_crt: string
    }
    export interface RemoteStatusResponse {
        status: boolean
        /**
         * Control Personnel
         */
        user_name: string
    }
    export interface RemoteResponse extends Paging {
        data: RemoteLists[]
    }
    export interface RemoteOperationResponseData {
        port: number
        note: string
        id: string
        auth: string
        host: string
    }
    export interface RemoteOperationResponse {
        data: RemoteOperationResponseData[]
    }
    export interface RemoteOperationRequest {
        tunnel: string
        addr: string
        auth: string
        note: string
        /**
         * true Connect, false Disconnect
         */
        status: boolean
    }
    export interface RemoteLists extends GormBaseModel, RemoteList {}
    export interface RemoteList {
        hash: string
        addr: string
        status: boolean
        user_name: string
        head_img: string
    }
    export interface ProjectListResponse extends Paging {
        data: ProjectList[]
    }
    export interface ProjectListDetail {
        userName: string
        fileName: string
        fileSize: string
        filePath: string
    }
    export interface ProjectList extends GormBaseModel, ProjectListDetail {}
    export interface Principle {
        user: string
        role: string
        user_id: number
        head_img: string
        from_platform: string
        uid: string
    }
    export interface PluginTypeListResponse {
        data: PluginTypeList[]
    }
    export interface PluginTypeList {
        id: number
        script_name: string
    }
    export interface PluginTopSearchResponse {
        data: PluginTopSearch[]
    }
    export interface PluginTopSearch {
        member: string
        score: number
    }
    export interface PluginsWhereListRequest extends PluginsWhere, PluginsWhereList {}
    export interface PluginsWhereList {
        token?: string
    }
    export interface PluginsWhereDownloadRequest extends PluginsWhere, PluginsWhereDownload {}
    export interface PluginsWhereDownload {
        /**
         * Select to Delete
         */
        uuid?: string[]
        page?: number
        limit?: number
        token?: string
    }
    export interface PluginsWhereDeleteRequest extends PluginsWhere, PluginsWhereDelete {}
    export interface PluginsWhereDelete {
        /**
         * Delete Reason
         */
        description?: string
        /**
         * Select to Delete
         */
        uuid?: string[]
    }
    export interface PluginsWhere {
        /** This is actually a boolean array，
         * But backend can't express boolean array，
         * So with each update, backend conversion name changed to《boolean》
         */
        is_private?: boolean[]
        keywords?: string
        plugin_type?: string[]
        tags?: string[]
        user_name?: string
        user_id?: number
        /**
         * Default All Time, Today day, This Week week, This Month month, This Year year
         */
        time_search?: string
        /**
         * Default Home, mine:Personal, recycle:Recycle Bin, check:Review Page, other:Other Cases (for yakit download so private/public not distinguished)
         */
        listType?: string
        /**
         * Review Status,0 Pending Review,1 Approved,2 Rejected
         */
        status?: number[]
        /**
         * Batch Search by Plugin Name
         */
        script_name?: string[]
        pluginGroup?: PluginsWherePluginGroup
        excludePluginTypes?: string[]
    }
    export interface PluginsWherePluginGroup {
        unSetGroup?: boolean
        group?: string[]
    }
    export interface PluginsWhereIsPrivate {}
    export interface PluginsSearchResponse {
        data: PluginsSearch[]
    }
    export interface PluginsSearchRequest {
        /**
         * Default Home mine:Personal recycle:Recycle Bin check:Review Page
         */
        listType?: string
        token?: string
    }
    export interface PluginsSearchData {
        value: string
        count: number
        label: string
    }
    export interface PluginsSearch {
        groupKey: string
        groupName: string
        sort: number
        data: PluginsSearchData[]
    }
    export interface PluginsRiskDetail {
        level: string
        typeVerbose: string
        cve: string
        /**
         * Vulnerability Description
         */
        description: string
        /**
         * Repair Suggestion
         */
        solution: string
    }
    export interface PluginsResponse {
        id: number
        uuid: string
    }
    export interface PluginsRequest {
        type?: string
        content?: string
        params?: YakitPluginParam[]
        help?: string
        tags?: string[]
        script_name: string
        enable_plugin_selector?: boolean
        plugin_selector_types?: string
        is_general_module?: boolean
        download_total?: number
        is_private?: boolean
        group?: string
        riskInfo?: PluginsRiskDetail[]
        isCorePlugin?: boolean
    }
    export interface PluginsRecycleRequest extends PluginsWhere, PluginsRecycle {}
    export interface PluginsRecycle {
        /**
         * Select to Delete
         */
        uuid?: string[]
        /**
         * Mandatory, true delete, false restore
         */
        dumpType: string
    }
    export interface PluginsLogsResponse extends Paging {
        data: PluginsLogsDetail[]
    }
    export interface PluginsLogsDetail extends GormBaseModel {
        /**
         * Operator Name
         */
        userName: string
        /**
         * Operator Avatar
         */
        headImg: string
        /**
         * Author Role admin:Admin trusted:Trusted ordinary:User auditor:Auditor
         */
        userRole: string
        /**
         * Operator Is Author true Yes   false No
         */
        isAuthors: boolean
        /**
         * Review Status
         */
        checkStatus: number
        /**
         * Log Type submit:Add delete:Delete update:Edit check:Review recover:Recover applyMerge:Merge Request
         */
        logType: string
        /**
         * Description
         */
        description: string
        /**
         * Login User is Plugin Author
         */
        loginIsPluginUser: boolean
    }
    export interface PluginsListResponse extends Paging {
        data: PluginsDetail[]
    }
    export interface PluginsGroupWhere {
        uuid?: string[]
    }
    export interface PluginsGroupResponse {
        setGroup: string[]
        allGroup: string[]
    }
    export interface PluginsGroupRequest extends PluginsWhere, PluginsGroupWhere {}
    export interface PluginsGroup {
        uuid: string[]
        saveGroup: string[]
        removeGroup: string[]
    }
    export interface PluginsEditRequest extends PluginsRequest, PluginsEdit {}
    export interface PluginsEdit {
        /**
         * Default to Create if empty, Default to Edit if not
         */
        uuid?: string
        /**
         * Edit Desc Mandatory (not set as mandatory for both add and edit are one button))
         */
        logDescription?: string
    }
    export interface PluginsDetail extends GormBaseModel {
        type: string
        script_name: string
        tags: string
        content: string
        params?: YakitPluginParam[]
        authors: string
        user_id?: number
        head_img: string
        /**
         * Plugin Release Time
         */
        published_at: number
        /**
         * Download Count
         */
        downloaded_total: number
        /**
         * Recommended Times
         */
        stars: number
        /**
         * Review Status
         */
        status: number
        official: boolean
        /**
         * Current User Liked
         */
        is_stars: boolean
        help?: string
        enable_plugin_selector?: boolean
        plugin_selector_types?: string
        is_general_module?: boolean
        comment_num: number
        contributors?: string
        uuid: string
        is_private: boolean
        /**
         * Copy Source Plugin
         */
        base_plugin_id?: number
        /**
         * Copy Source Plugin Name
         */
        base_script_name?: string
        group?: string
        riskInfo?: PluginsRiskDetail[]
        /**
         * Is Built-in Plugin
         */
        isCorePlugin?: boolean
        /**
         * Collaborator
         */
        collaborator?: CollaboratorInfo[]
    }
    export interface PluginsAuditRequest extends PluginsRequest, PluginsAudit {}
    export interface PluginsAuditDetailResponse extends PluginsDetail, PluginsAuditDetail {}
    export interface PluginsAuditDetailRequest {
        uuid: string
        /**
         * Request Page Default(check) Review Detail Page log Log Detail Page
         */
        list_type?: string
        /**
         * Log page to detail page mandatory
         */
        up_log_id?: number
    }
    export interface PluginsAuditDetail {
        /**
         * Modifier
         */
        apply_user_name?: string
        /**
         * Modifier
         */
        apply_user_id?: number
        /**
         * Description
         */
        logDescription?: string
        apply_user_head_img?: string
        /**
         * Processing Status 0 Pending  1Merge  2Reject
         */
        merge_status?: number
        /**
         * Log ID
         */
        up_log_id?: number
        merge_before_plugins?: PluginsAuditDetailMergeBeforePlugins
    }
    export interface PluginsAuditDetailMergeBeforePlugins {
        type?: string
        script_name?: string
        tags?: string
        content?: string
        params?: YakitPluginParam[]
        /**
         * Review Status
         */
        status?: number
        official?: boolean
        help?: string
        enable_plugin_selector?: boolean
        plugin_selector_types?: string
        is_general_module?: boolean
        uuid?: string
        is_private?: boolean
        stars?: number
        download_total?: number
        group?: string
        riskInfo?: PluginsRiskDetail[]
        /**
         * Is Built-in Plugin
         */
        isCorePlugin?: boolean
    }
    export interface PluginsAudit {
        pageType?: string
        /**
         * Review 'true' Approved 'false' Not Approved
         */
        status: string
        /**
         * Mandatory
         */
        uuid: string
        /**
         * Mandatory when not approved
         */
        logDescription?: string
        /**
         * Default to Management Review Page if not passed， 'log' For Log Review Page
         */
        listType?: string
        /**
         * Audit Page with Comparison Mandatory this ID
         */
        upPluginLogId?: number
    }
    export interface PluginIncreResponse {
        day_incre_num: number
        yesterday_incre_num: number
        week_incre_num: number
        lastWeek_incre_num: number
    }
    export interface Paging {
        pagemeta: PageMeta
    }
    export interface PageMeta {
        /**
         * Page Index
         */
        page: number
        /**
         * Page Data Limit
         */
        limit: number
        /**
         * Total Data Count
         */
        total: number
        /**
         * Total Pages
         */
        total_page: number
    }
    export interface OperationsResponse extends Paging {
        data: Operation[]
    }
    export interface Operation extends GormBaseModel, NewOperation {}
    export interface NewUrmResponse {
        user_name: string
        password: string
    }
    export interface NewUrmRequest {
        user_name: string
        department: number
        role_id: number
    }
    export interface NewRoleRequest {
        id?: number
        name: string
        checkPlugin: boolean
        pluginType?: string
        pluginIds?: string
        plugin?: PluginTypeList[]
    }
    export interface NewOperation {
        type: string
        trigger_user_unique_id: string
        operation_plugin_id: string
        extra?: string
    }
    export interface NewComments {
        uuid: string
        by_user_id?: number
        message_img?: string[]
        parent_id?: number
        root_id?: number
        message?: string
    }
    export interface NewComment {
        plugin_id: number
        by_user_id?: number
        message_img?: string[]
        parent_id?: number
        root_id?: number
        message?: string
    }
    export interface NavigationBarsResponse {
        data: NavigationBarsListResponse[]
    }
    export interface NavigationBarsListResponse {
        card: string
        link?: string
        otherLink?: string
        sort?: number
    }
    export interface LogsRequest {
        uuid: string
        token?: string
    }
    export interface IsExtractCodeResponse {
        is_extract_code: boolean
    }
    export interface GroupResponseDetail {
        value: string
        total: number
        default: boolean
    }
    export interface GroupResponse {
        data: GroupResponseDetail[]
    }
    export interface GroupRequest extends PluginsWhere, PluginsGroup {}
    export interface GormBaseModel {
        id: number
        created_at: number
        updated_at: number
    }
    export interface GetRiskWhere {
        hash?: string[]
        search?: string
        net_work?: string
        ports?: string
        risk_type?: string
        token?: string
        waiting_verified?: boolean
        severity?: string
        user_name?: string
    }
    export interface GetRemoteWhere {
        user_name?: string
        start_time?: number
        end_time?: number
        status?: string
    }
    export interface ExtractResponse {
        extract_content: string
        module: string
    }
    export interface EditUrmRequest {
        uid: string
        user_name?: string
        department?: number
        role_id?: number
    }
    export interface DepartmentListResponse extends Paging {
        data: DepartmentList[]
    }
    export interface DepartmentList {
        id: number
        name: string
        userNum: number
        /**
         * Has Subgroups
         */
        exist_group?: boolean
    }
    export interface DepartmentGroupList {
        data: DepartmentList[]
    }
    export interface DeleteUrm {
        uid: string[]
    }
    export interface DeleteResource {
        csrf_token?: string
        file_name: string[]
        /**
         * Delete Image Upload'img' Video Upload 'video'
         */
        file_type: string
    }
    export interface DeletePluginUuid {
        uuid: string[]
        dump: boolean
        keywords?: string
        is_recycle?: boolean
    }
    export interface CopyPluginsRequest extends PluginsRequest, CopyPlugins {}
    export interface CopyPlugins {
        /**
         * Copy Plugin ID
         */
        base_plugin_id: number
    }
    export interface CompanyLicenseConfigResponse extends Paging {
        data: CompanyLicenseConfigList[]
    }
    export interface CompanyLicenseConfigList {
        id: number
        company: string
        maxActivationNum: number
        useActivationNum: number
        maxUser: number
        durationDate: number
        currentTime?: number
    }
    export interface CommentListResponse extends Paging {
        data: CommentListData[]
    }
    export interface CommentListData {
        id: number
        created_at: number
        updated_at: number
        plugin_id: number
        root_id: number
        parent_id: number
        user_id: number
        user_name: string
        head_img: string
        message: string
        message_img: string
        like_num: number
        by_user_id: number
        by_user_name: string
        by_head_img: string
        reply_num: number
        is_stars?: boolean
    }
    export interface CollaboratorInfo {
        user_id: number
        head_img: string
        user_name: string
    }
    export interface ActionSucceeded {
        /**
         * From which API
         */
        from: string
        /**
         * Execution Status
         */
        ok: boolean
    }
    export interface ActionFailed {
        /**
         * From which API
         */
        from: string
        /**
         * Execution Status
         */
        ok: boolean
        reason: string
    }
}
