export type WebFuzzerEventProps = {
    onRefWebFuzzer?: string
    /**Set fuzzer tab advanced settings display/Hide corresponding tab style */
    onGetFuzzerAdvancedConfigShow: string
    onImportYamlPopEditorContent: string
    onImportYamlEditorChange: string
    onFuzzerSequenceImportUpdateMenu: string
    onGetExportFuzzer: string
    onGetExportFuzzerCallBack: string
    onOpenMatchingAndExtractionCard: string
    onOpenFuzzerModal: string
    onRunChatcsAIByFuzzer: string
    /**Set tab "Config】/【Advanced settings display in "Rules"/Hide */
    onSetAdvancedConfigShow: string
    /** Send to HTTPFuzzerPage, switch to "Config】/【Rules" tab, select type */
    onSwitchTypeWebFuzzerPage: string
    /**
     * 1. Send to WebFuzzerPage
     * 2. Click sequence wrapper layer tab to switch to "Config】/【Rules】
     * */
    sequenceSendSwitchTypeToFuzzer: string
    /**Send to MainOperatorContent layer, switch to "Sequence】/(【Rules】/Config) */
    sendSwitchSequenceToMainOperatorContent: string
    /**VariableList component refreshes latest expanded items from data center */
    onRefVariableActiveKey?: string
    /**Open Matcher and Extractor Modal */
    openMatcherAndExtraction: string
}
