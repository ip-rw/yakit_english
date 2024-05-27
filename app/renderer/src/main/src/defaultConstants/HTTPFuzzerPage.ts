/**
 * @Description This file is a common variable for HTTPFuzzerPage
 * @author luoluo
 */

import {LabelDataProps} from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import {AdvancedConfigShowProps, FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {WebFuzzerPageInfoProps} from "@/store/pageInfo"
import cloneDeep from "lodash/cloneDeep"

export const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

export const WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY"
export const WEB_FUZZ_HOTPATCH_CODE = "WEB_FUZZ_HOTPATCH_CODE"
export const WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE = "WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE"

export const WEB_FUZZ_DNS_Server_Config = "WEB_FUZZ_DNS_Server_Config"
export const WEB_FUZZ_DNS_Hosts_Config = "WEB_FUZZ_DNS_Hosts_Config"

// WebFuzzer Table Default Count
export const DefFuzzerTableMaxData = 20000

export const defaultAdvancedConfigShow: AdvancedConfigShowProps = {
    config: true,
    rule: true
}

export const defaultAdvancedConfigValue: AdvancedConfigValueProps = {
    // Request Pack Config
    fuzzTagMode: "standard",
    fuzzTagSyncIndex: false,
    isHttps: false,
    isGmTLS: false,
    noFixContentLength: false,
    noSystemProxy: false,
    resNumlimit: DefFuzzerTableMaxData,
    actualHost: "",
    timeout: 30.0,
    // Batch Targets
    batchTarget: new Uint8Array(),
    // Packet Config
    concurrent: 20,
    proxy: [],
    minDelaySeconds: 0,
    maxDelaySeconds: 0,
    repeatTimes: 0,
    // Retry Config
    maxRetryTimes: 0,
    retry: true,
    noRetry: false,
    retryConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    noRetryConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    retryWaitSeconds: 0,
    retryMaxWaitSeconds: 0,
    // Redirect Config
    redirectCount: 3,
    noFollowRedirect: true,
    followJSRedirect: false,
    redirectConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    noRedirectConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    // dns config
    dnsServers: [],
    etcHosts: [],
    // Set Variable
    params: [{Key: "", Value: "", Type: "raw"}],
    methodGet: [
        {
            Key: "",
            Value: ""
        }
    ],
    methodPost: [
        {
            Key: "",
            Value: ""
        }
    ],
    cookie: [
        {
            Key: "",
            Value: ""
        }
    ],
    headers: [
        {
            Key: "",
            Value: ""
        }
    ],
    // Matcher
    filterMode: "onlyMatch",
    matchers: [],
    matchersCondition: "and",
    hitColor: "red",
    // Extractor
    extractors: []
}

export const emptyFuzzer: FuzzerResponse = {
    BodyLength: 0,
    BodySimilarity: 0,
    ContentType: "",
    Count: 0,
    DurationMs: 0,
    HeaderSimilarity: 0,
    Headers: [],
    Host: "",
    IsHTTPS: false,
    MatchedByFilter: false,
    Method: "",
    Ok: false,
    Payloads: [],
    Reason: "",
    RequestRaw: new Uint8Array(),
    ResponseRaw: new Uint8Array(),
    StatusCode: 0,
    Timestamp: 0,
    UUID: "",

    DNSDurationMs: 0,
    TotalDurationMs: 0,
    ExtractedResults: [],
    MatchedByMatcher: false,
    HitColor: "",

    IsTooLargeResponse: false,
    TooLargeResponseHeaderFile: "",
    TooLargeResponseBodyFile: "",
    DisableRenderStyles: false,
    RuntimeID: ""
}

export const defaultWebFuzzerPageInfo: WebFuzzerPageInfoProps = {
    pageId: "",
    advancedConfigValue: cloneDeep(defaultAdvancedConfigValue),
    advancedConfigShow: null,
    request: defaultPostTemplate,
    variableActiveKeys: undefined
}
// Note: Order here is reverse (add DefaultDescription with -fixed, this marks fixed items）
export const defaultLabel: LabelDataProps[] = [
    {
        DefaultDescription: "Inverse Regex (Single)-fixed",
        Description: "Inverse Regex (Single）",
        Label: "{{regen:one([0-9a-f]{3})}}"
    },
    {
        DefaultDescription: "Inverse Regex (All)-fixed",
        Description: "Inverse Regex (All）",
        Label: "{{regen([0-9a-f]{3})}}"
    },
    {
        DefaultDescription: "Timestamp (Sec)-fixed",
        Description: "Timestamp (Sec）",
        Label: "{{timestamp(seconds)}}"
    },
    {
        DefaultDescription: "Captcha-fixed",
        Description: "Captcha",
        Label: "{{int(0000-9999)}}"
    },
    {
        DefaultDescription: "RandomNum-fixed",
        Description: "RandomNum",
        Label: "{{randint(0,10)}}"
    },
    {
        DefaultDescription: "RandomStr-fixed",
        Description: "RandomStr",
        Label: "{{randstr}}"
    },
    {
        DefaultDescription: "Integer Range-fixed",
        Description: "Integer Range",
        Label: "{{int(1-10)}}"
    },
    {
        DefaultDescription: "Insert Payload-fixed",
        Description: "Insert Payload"
    },
    {
        DefaultDescription: "Insert Temp Dict-fixed",
        Description: "Insert Temp Dict"
    },
    {
        DefaultDescription: "Insert File-fixed",
        Description: "Insert File"
    }
]
