import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {WebFuzzerType} from "../WebFuzzerPage/WebFuzzerPageType"

export type FilterMode = "drop" | "match" | "onlyMatch"

export type FuzzTagMode = "close" | "standard" | "legacy"

export interface AdvancedConfigValueProps {
    // Request Pack Config
    fuzzTagMode: FuzzTagMode
    fuzzTagSyncIndex: boolean
    isHttps: boolean
    isGmTLS: boolean
    /**@name No Fix Length */
    noFixContentLength: boolean
    noSystemProxy: boolean
    resNumlimit: number
    actualHost: string
    timeout: number
    batchTarget?: Uint8Array
    // Send Pack Config
    concurrent: number
    proxy: string[]
    minDelaySeconds: number
    maxDelaySeconds: number
    repeatTimes: number
    // Retry Config
    maxRetryTimes: number
    /**@name Retry Condition Checked */
    retry: boolean
    /**@name No Retry Condition Checked */
    noRetry: boolean
    retryConfiguration?: {
        statusCode: string
        keyWord: string
    }
    noRetryConfiguration?: {
        statusCode: string
        keyWord: string
    }
    retryWaitSeconds: number
    retryMaxWaitSeconds: number
    // Redirect Config
    redirectCount: number
    noFollowRedirect: boolean
    followJSRedirect: boolean
    redirectConfiguration?: {
        statusCode: string
        keyWord: string
    }
    noRedirectConfiguration?: {
        statusCode: string
        keyWord: string
    }
    // Filter Config 0612 Discontinued
    // filterMode: "drop" | "match"
    // statusCode: string
    // regexps: string
    // keyWord: string
    // /**@name Max. Response Size After Transformation for Backend */
    // minBodySize: number
    // /**@name Min. Response Size After Transformation for Backend */
    // maxBodySize: number

    // dns config
    dnsServers: string[]
    etcHosts: KVPair[]
    // Set Variable
    params: FuzzerParamItem[]
    methodGet: KVPair[]
    methodPost: KVPair[]
    headers: KVPair[]
    cookie: KVPair[]
    // Matcher
    filterMode: FilterMode
    matchers: HTTPResponseMatcher[]
    matchersCondition: "and" | "or"
    hitColor: string
    //Extractor
    extractors: HTTPResponseExtractor[]

    // Sequence
    /**@name  */
    inheritCookies?: boolean
    /**@name  */
    inheritVariables?: boolean
}

export interface FuzzerParamItem {
    Key: string
    Value: string
    Type: string
}

export interface HttpQueryAdvancedConfigProps {
    advancedConfigValue: AdvancedConfigValueProps
    visible: boolean
    onInsertYakFuzzer: () => void
    onValuesChange: (v: AdvancedConfigValueProps) => void
    /**Responses in Matcher and Extractor */
    defaultHttpResponse: string
    /**@name Use with onShowShowResponseMatcherAndExtraction */
    outsideShowResponseMatcherAndExtraction?: boolean
    /**@name Display Matcher and Extractor below the response if there is any;Requires use with outsideShowResponseMatcherAndExtraction*/
    onShowResponseMatcherAndExtraction?: (activeType: MatchingAndExtraction, activeKey: string) => void
    inViewportCurrent?: boolean
    id: string
    matchSubmitFun: () => void
    /**Show Advanced Config content based on type */
    showFormContentType: WebFuzzerType
    proxyListRef: React.Ref
    isbuttonIsSendReqStatus: boolean
}

export interface KVPair {
    Key: string
    Value: string
}
