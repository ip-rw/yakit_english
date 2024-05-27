import {ReactNode} from "react"
import {FilterMode} from "../HTTPFuzzerPage"

export type MatchingAndExtraction = "matchers" | "extractors"

export interface MatcherAndExtractionCardProps extends MatcherAndExtractionProps {}

export interface MatcherAndExtractionProps {
    ref?: React.ForwardedRef<MatcherAndExtractionRefProps>
    httpResponse: string
    onClose: () => void
    onSave: (m: MatcherValueProps, e: ExtractorValueProps) => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    defActiveKey: string
    defActiveType: MatchingAndExtraction
}

export interface MatcherAndExtractionRefProps {
    validate: () => Promise<MatcherAndExtractionValueProps>
}
export interface MatcherAndExtractionValueProps {
    matcher: MatcherValueProps
    extractor: ExtractorValueProps
}

export interface MatcherValueProps {
    filterMode: FilterMode
    /**@Set only if name filterMode is onlyMatch*/
    hitColor: string
    matchersCondition: "and" | "or"
    matchersList: HTTPResponseMatcher[]
}

export interface ExtractorValueProps {
    extractorList: HTTPResponseExtractor[]
}

export interface MatcherCollapseProps extends MatcherAndExtractorProps {
    matcher: MatcherValueProps
    setMatcher: (m: MatcherValueProps) => void
    httpResponse: string
}

export interface ExtractorCollapseProps extends MatcherAndExtractorProps {
    extractor: ExtractorValueProps
    setExtractor: (e: ExtractorValueProps) => void
    httpResponse: string
}

interface MatcherAndExtractorProps {
    isSmallMode: boolean
    type: MatchingAndExtraction
    /**@No edit mode, no delete or related action buttons;Also, opens all Panels by default, no click to close/Open and others */
    notEditable?: boolean
    defActiveKey: string
}

export interface HTTPResponseMatcher {
    SubMatchers: HTTPResponseMatcher[]
    SubMatcherCondition: string
    MatcherType: string
    Scope: string
    Condition: string
    Group: string[]
    GroupEncoding: string
    Negative: boolean
    ExprType: string
}

export interface HTTPResponseExtractor {
    Name: string
    Type: string
    Scope: string
    Groups: string[]
    RegexpMatchGroup: string[]
    XPathAttribute: string
}

export interface labelNodeItemProps {
    label: string
    children: ReactNode
    column?: boolean
    className?: string
    labelClassName?: string
}

export interface MatcherItemProps extends MatcherItemAndExtractorItemProps {
    matcherItem: HTTPResponseMatcher
    httpResponse: string
}

export interface ExtractorItemProps extends MatcherItemAndExtractorItemProps {
    extractorItem: HTTPResponseExtractor
    httpResponse: string
}

interface MatcherItemAndExtractorItemProps {
    isSmallMode?: boolean
    /**@No edit mode, no delete or related action buttons;Also, opens all Panels by default, no click to close/Open and others */
    notEditable?: boolean
    onEdit: (f: string, v: any) => void
}

export interface MatchHTTPResponseParams {
    Matchers: HTTPResponseMatcher[]
    MatcherCondition: string
    IsHTTPS?: boolean
    HTTPResponse: string
    HTTPRequest?: string
}

export interface ColorSelectProps {
    size?: "small" | "large" | "max"
    value?: string
    onChange?: (value: string) => void
}

export interface MatcherAndExtractionValueListProps {
    /**@Show regex icon for name */
    showRegex: boolean
    group: string[]
    notEditable?: boolean
    onEditGroup: (group: string[]) => void
    onAddGroup: () => void
    httpResponse: string
}

export interface ExtractionResultsContentProps {
    list: {Key: string; Value: string}[]
}

export interface MatcherAndExtractionDrawerProps {
    visibleDrawer: boolean
    defActiveType: MatchingAndExtraction
    httpResponse: string
    defActiveKey: string
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    onClose: () => void
    onSave: (m: MatcherValueProps, e: ExtractorValueProps) => void
}