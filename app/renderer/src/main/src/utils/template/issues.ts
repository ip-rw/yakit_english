import {getReleaseEditionName} from "../envfile"

export interface LocalInfoProps {
    system: string
    arch: string
    localYakit: string
    localYaklang: string
}

export const ReportBug = (system_info?: LocalInfoProps): string => {
    let tpl = `
## Issue Description

Provide a detailed description of the issue you encountered here. Describe the symptoms, frequency, scope of impact, and any other relevant information. If possible, please provide specific steps to reproduce the issue。

## Expected Behavior

Describe the behavior you expect here, i.e., the result that should occur after the issue is resolved. If possible, please provide specific examples of the outcome。

## Actual Behavior

Describe the behavior you actually observed here, i.e., the result after the issue is resolved. If possible, please provide specific examples of the outcome。

## Reproduction Steps

Provide specific steps to reproduce the issue here. If the problem occurs randomly, or requires specific environmental conditions to reproduce, please provide more detailed explanations。

1. Step 1
2. Step 2
3. Step 3

## Environment Info

- Operating System: ${system_info?.system}
- System Architecture: ${system_info?.arch}
- ${getReleaseEditionName()} Version: ${system_info?.localYakit}
- YakLang Version: ${system_info?.localYaklang}

## Additional Notes

Add any other info or comments about the issue here。

`
    tpl = encodeURIComponent(tpl)
    return tpl
}
export const FeatureRequest = (): string => {
    let tpl = `
## Requirement Description

Please describe clearly and precisely the problem you encountered, for example: I always encounter the following issues when using the product...

## Solution

Please describe clearly and precisely the goal and solution you want, for example: I wish the product could implement the following features...

## Alternative Suggestions

Please describe clearly and precisely any other alternatives or features you have considered。

## Additional Info

Provide any context information, screenshots, or other materials related to this feature request。
`
    tpl = encodeURIComponent(tpl)
    return tpl
}
