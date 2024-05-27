import {HoldGRPCStreamProps} from "./useHoldGRPCStreamType"

/** @name Default tabs for plugin execution results */
export const DefaultTabs: HoldGRPCStreamProps.InfoTab[] = [
    {tabName: "HTTP Traffic", type: "http"},
    {tabName: "Vulnerabilities & Risks", type: "risk"},
    {tabName: "Log", type: "log"},
    {tabName: "Console", type: "console"}
]
