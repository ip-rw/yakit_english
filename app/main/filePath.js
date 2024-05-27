const {app} = require("electron")
const electronIsDev = require("electron-is-dev")
const os = require("os")
const path = require("path")
const process = require("process")
const fs = require("fs")

/** Root Directory */
const appPath = app.isPackaged ? path.dirname(app.getPath("exe")) : app.getAppPath()
/** System User Home */
const osHome = os.homedir()
/** Data Folder Name */
const projectName = "yakit-projects"

/** Data Path Logic Setting Start */
// Data Folder Path
let project_path = ""
// OS-Home Proj Folder Path
const osHomeProjectPath = path.join(osHome, projectName)
// Software Env Proj Folder Path
const appProjectPath = path.join(appPath, projectName)

try {
    /**
     * Dev Env, WIN searches Env Var first, MAC/Linux to OS-Home
     * Release Env, WIN set to root, MAC/Linux to OS-Home
     */
    if (process.platform === "win32") {
        if (electronIsDev) {
            project_path = process.env.YAKIT_HOME
                ? fs.existsSync(process.env.YAKIT_HOME)
                    ? process.env.YAKIT_HOME
                    : osHomeProjectPath
                : osHomeProjectPath
        } else {
            project_path = appProjectPath
        }
    } else {
        project_path = osHomeProjectPath
    }
} catch (error) {
    console.log(`Project Data Folder Load Failed，${error}`)
}
/** Data Path Logic Setting End */

/**
 * @name Project-Related Dir Path
 * In new versions, custom WIN installation paths migrate yakit-projects from OS-Home to root
 * On project-related folder path retrieval error, will auto-set to system user's directory (Disaster Recovery))
 */
const YakitProjectPath = project_path || osHomeProjectPath

console.log(`---------- Global-Path Start ----------`)
console.log(`software-path: ${appPath}`)
console.log(`os-home-path: ${osHome}`)
console.log(`yakit-projects-path: ${YakitProjectPath}`)
console.log(`---------- Global-Path End ----------`)

/** Engine Folder Path */
const yaklangEngineDir = path.join(YakitProjectPath, "yak-engine")

/** Yakit Install Path */
const yakitInstallDir = path.join(os.homedir(), "Downloads")

/** Engine Path */
const getLocalYaklangEngine = () => {
    switch (process.platform) {
        case "darwin":
        case "linux":
            return path.join(yaklangEngineDir, "yak")
        case "win32":
            return path.join(yaklangEngineDir, "yak.exe")
    }
}

/** Generates Root Dir + Param Path */
const loadExtraFilePath = (s) => {
    if (electronIsDev) {
        return s
    }

    switch (os.platform()) {
        case "darwin":
            return path.join(app.getAppPath(), "../..", s)
        case "linux":
            return path.join(app.getAppPath(), "../..", s)
        case "win32":
            return path.join(app.getAppPath(), "../..", s)
        default:
            return path.join(app.getAppPath(), s)
    }
}

/** Base Cache Data Folder */
const basicDir = path.join(YakitProjectPath, "base")
/** Local Cache Data Path */
const localCachePath = path.join(basicDir, "yakit-local.json")
/** Local Cache (Extended) Data Path */
const extraLocalCachePath = path.join(basicDir, "yakit-extra-local.json")

/** Engine Error Log */
const engineLog = path.join(YakitProjectPath, "engine-log")
/** Rendering Error Log */
const renderLog = path.join(YakitProjectPath, "render-log")
/** Loggable Issues */
const printLog = path.join(YakitProjectPath, "print-log")

/** Remote Config Storage Folder */
const remoteLinkDir = path.join(YakitProjectPath, "auth")
/** Remote Engine Config Data Path */
const remoteLinkFile = path.join(remoteLinkDir, "yakit-remote.json")

/** Yak Code Folder Path */
const codeDir = path.join(YakitProjectPath, "code")

/** HTML Template Path */
// const yakitDir = path.join(os.homedir(), "AppData","Local","Programs","yakit")
// const htmlTemplateDir = path.join(yakitDir, "report")
const htmlTemplateDir = loadExtraFilePath(path.join("report"))

/** Window Cache File Path */
const windowStatePatch = path.join(basicDir)

module.exports = {
    YakitProjectPath,

    yaklangEngineDir,
    yakitInstallDir,
    getLocalYaklangEngine,
    loadExtraFilePath,

    basicDir,
    localCachePath,
    extraLocalCachePath,
    engineLog,
    renderLog,
    printLog,

    remoteLinkDir,
    remoteLinkFile,

    codeDir,

    htmlTemplateDir,
    windowStatePatch
}
