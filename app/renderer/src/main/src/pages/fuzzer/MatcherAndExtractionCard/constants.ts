import {HTTPResponseExtractor, HTTPResponseMatcher} from "./MatcherAndExtractionCardType"

/**@name Filter Mode */
export const filterModeOptions = [
    {
        value: "drop",
        label: "Discard"
    },
    {
        value: "match",
        label: "Retain"
    },
    {
        value: "onlyMatch",
        label: "Matches Only"
    }
]

/**@name Conditional Rel */
export const matchersConditionOptions = [
    {
        value: "and",
        label: "AND"
    },
    {
        value: "or",
        label: "OR"
    }
]

export const defaultMatcherItem: HTTPResponseMatcher = {
    MatcherType: "word",
    ExprType: "nuclei-dsl",
    Scope: "body",
    Group: [""],
    Condition: "and",
    Negative: false,
    // ---------
    SubMatchers: [],
    SubMatcherCondition: "",
    GroupEncoding: ""
}

export const defaultExtractorItem: HTTPResponseExtractor = {
    Type: "regex",
    Scope: "raw",
    Groups: [""],
    // ---------
    Name: "data_0",
    RegexpMatchGroup: [],
    XPathAttribute: ""
}

export const matcherTypeList = [
    {label: "Keyword", value: "word"},
    {label: "Regex", value: "regex"},
    {label: "Status Code", value: "status_code"},
    {label: "Hex", value: "binary"},
    {label: "Expression", value: "expr"}
]

export const extractorTypeList = [
    {label: "Regex", value: "regex"},
    {label: "XPath", value: "xpath"},
    {label: "Key-Value", value: "kval"},
    {label: "JQ(*)", value: "json"},
    {label: "Expression", value: "nuclei-dsl"}
]

export const defMatcherAndExtractionCode =
    "HTTP/1.1 200 OK\r\n" +
    "Date: Mon, 23 May 2005 22:38:34 GMT\r\n" +
    "Content-Type: text/html; charset=UTF-8\r\n" +
    "Content-Encoding: UTF-8\r\n" +
    "\r\n" +
    "<html>" +
    '<!doctype html>\n<html>\n<body>\n  <div id="result">%d</div>\n</body>\n</html>' +
    "</html>"
