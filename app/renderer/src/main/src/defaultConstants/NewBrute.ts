import {BruteExecuteExtraFormValue} from "@/pages/securityTool/newBrute/NewBruteType"
import {BrutePageInfoProps} from "@/store/pageInfo"

export const defaultBruteExecuteExtraFormValue: BruteExecuteExtraFormValue = {
    Concurrent: 50,
    DelayMax: 5,
    DelayMin: 1,
    OkToStop: true,
    PasswordFile: "",
    Passwords: [],
    PasswordsDict: [],
    ReplaceDefaultPasswordDict: false,
    PluginScriptName: "",
    Prefix: "",
    TargetFile: "",
    TargetTaskConcurrent: 1,
    Targets: "",
    Type: "",
    UsernameFile: "",
    Usernames: [],
    UsernamesDict: [],
    ReplaceDefaultUsernameDict: false,
    // Frontend Display Use ------start
    usernames: "",
    passwords: "",
    replaceDefaultPasswordDict: true,
    replaceDefaultUsernameDict: true
    // Frontend Display Use ------end
}

export const defaultBrutePageInfo: BrutePageInfoProps = {
    targets: ""
}
