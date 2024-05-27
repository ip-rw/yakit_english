export type RefreshDataEventProps = {
    // Notify QueryHTTPFlows to Poll Updates
    onRefreshQueryHTTPFlows?: string
    // Notify QueryYakScript to Poll Updates
    onRefreshQueryYakScript?: string
    // Notify QueryNewRisk to Poll Updates
    onRefreshQueryNewRisk?: string
}