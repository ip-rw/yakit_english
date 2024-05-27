const {ipcMain} = require("electron")
const {launch, killAll, getChromePath} = require("chrome-launcher")
const fs = require("fs")
const path = require("path")
const {YakitProjectPath} =require("../filePath")
const myUserDataDir = path.join(YakitProjectPath, "chrome-profile")

const disableExtensionsExceptStr = (host, port, username, password) => `
var config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "http",
        host: "${host}",
        port: parseInt(${port})
      },
    }
  };

chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});

function callbackFn(details) {
return {
    authCredentials: {
        username: "${username}",
        password: "${password}"
    }
};
}

chrome.webRequest.onAuthRequired.addListener(
        callbackFn,
        {urls: ["<all_urls>"]},
        ['blocking']
);
`

const manifestStr = `
{
    "version": "1.0.0",
    "manifest_version": 2,
    "name": "YakitProxy",
    "permissions": [
        "proxy",
        "tabs",
        "unlimitedStorage",
        "storage",
        "<all_urls>",
        "webRequest",
        "webRequestBlocking"
    ],
    "background": {
        "scripts": ["background.js"]
    },
    "minimum_chrome_version":"22.0.0"
}
`

// Generate Temp Folder
const tempFile = "yakit-proxy"
// Generate Temp Filename
const exceptFileName = "background.js"
const manifestFileName = "manifest.json"
// Full Path for Temp File
const exceptFilePath = path.join(YakitProjectPath, tempFile, exceptFileName)
const manifestFilePath = path.join(YakitProjectPath, tempFile, manifestFileName)
// Get Folder Path
const commonFilePath = path.dirname(exceptFilePath)
// Create Username/Password File
let isCreateFile = false

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const filePath = path.join(folderPath, file)
            const stat = fs.statSync(filePath)

            if (stat.isFile()) {
                fs.unlinkSync(filePath)
            } else if (stat.isDirectory()) {
                deleteFolderRecursive(filePath)
            }
        })
        fs.rmdirSync(folderPath)
    }
}

// Delete Temp Folder and Contents
const deleteCreateFile = () => {
    if (isCreateFile) {
        // Check Folder Existence
        if (fs.existsSync(commonFilePath)) {
            // Read files and subfolders in directory
            fs.readdirSync(commonFilePath).forEach((file) => {
                const filePath = path.join(commonFilePath, file)

                // Check File Type
                const stat = fs.statSync(filePath)

                if (stat.isFile()) {
                    // Delete Files if File
                    fs.unlinkSync(filePath)
                } else if (stat.isDirectory()) {
                    // Recursively Delete Folder and Contents if Folder
                    deleteFolderRecursive(filePath)
                }
            })

            // Delete Empty Folder
            fs.rmdirSync(commonFilePath)
        } else {
            console.log(`not found ${commonFilePath} .`)
        }
        isCreateFile = false
    }
}

module.exports = (win, getClient) => {
    // Startup Count
    let startNum = 0
    // Startup Status
    let started = false
    ipcMain.handle("IsChromeLaunched", async () => {
        return started
    })

    ipcMain.handle("getDefaultUserDataDir", async () => {
        return myUserDataDir
    })

    ipcMain.handle("LaunchChromeWithParams", async (e, params) => {
        const {port, host, chromePath, userDataDir, username, password} = params
        const portInt = parseInt(`${port}`)
        const hostRaw = `${host}`
        if (hostRaw === "undefined" || hostRaw.includes("/") || hostRaw.split(":").length > 1) {
            throw Error(`host: ${hostRaw} is invalid or illegal`)
        }

        // https://peter.sh/experiments/chromium-command-line-switches/
        // opts:
        //   --Do Not Use Sys Proxy Config.
        //   --No Proxy Server't 仅限直接连接. ↪
        let launchOpt = {
            startingUrl: "http://mitm", // Ensure Chrome Opens on Startup://新标签页。
            chromeFlags: [
                `--no-system-proxy-config-service`, // 禁用系统代理配置服务。
                `--proxy-bypass-list=<-loopback>`, // 代理绕过列表，排除回环。
                `--proxy-server=http://${hostRaw}:${portInt}`, // 设置特定代理服务器。

                `--ignore-certificate-errors`, // 忽略 SSL 证书错误。
                `--test-type`, // 标记测试实例。
                `--ignore-urlfetcher-cert-requests`, // 忽略 URL 取回证书请求。
                `--disable-webrtc`, // 禁用 WebRTC。
                `--disable-component-extensions-with-background-pages`, // 禁用背景页组件。
                `--disable-extensions`, // 禁用 所有扩展。
                `--disable-notifications`, // 禁用通知。
                `--force-webrtc-ip-handling-policy=default_public_interface_only`, // 强制仅使用 WebRTC 公共接口。
                `--disable-ipc-flooding-protection`, // 禁用 IPC 泛洪攻击保护。
                `--disable-xss-auditor`, // 禁用 XSS 审计。
                `--disable-bundled-ppapi-flash`, // 禁用捆绑的 PPAPI Flash。
                `--disable-plugins-discovery`, // 防止插件发现。
                `--disable-default-apps`, // 禁用默认应用。
                `--disable-prerender-local-predictor`, // 禁用 预测性预加载本地页面。
                `--disable-sync`, // 禁用同步。
                `--disable-breakpad`, // 禁用 Breakpad 崩溃报告。
                `--disable-crash-reporter`, // 禁用 崩溃报告器。
                `--disk-cache-size=0`, // 设置磁盘缓存大小为 0。
                `--disable-settings-window`, // 禁用 设置窗口。
                `--disable-speech-api`, // 禁用 语音 API。
                `--disable-file-system`, // 禁用文件系统 API。
                `--disable-presentation-api`, // 禁用 演示 API。
                `--disable-permissions-api`, // 禁用 权限 API。
                `--disable-new-zip-unpacker`, // 禁用 新 ZIP 提取。
                `--disable-media-session-api`, // 禁用 媒体会话 API。
                `--no-experiments`, // 禁止实验。
                `--no-events`, // 不发送事件。
                `--no-first-run`, // 启动时跳过首次运行向导。
                `--no-default-browser-check`, // 启动时不检查默认浏览器。
                `--no-pings`, // 禁用 Ping 跟踪。
                `--no-service-autorun`, // 不自启服务。
                `--media-cache-size=0`, // 设置媒体缓存大小为 0。
                `--use-fake-device-for-media-stream`, // 使用虚拟设备进行媒体捕获。
                `--dbus-stub`, // 使用 DBus Stub。
                `--disable-background-networking`, // 禁用背景网络。
                `--disable-component-update`, // Do Not Update Chrome://components/ Browsers Listed“Component”
                `--disable-features=ChromeWhatsNewUI,HttpsUpgrades,OptimizationHints` // 禁用特定功能。
            ]
        }
        if (userDataDir) {
            launchOpt["userDataDir"] = userDataDir
        }
        if (chromePath) {
            launchOpt["chromePath"] = chromePath
        }
        // Username/Password Param Refactoring
        if (username.length > 0 && password.length > 0) {
            try {
                // Block Items
                // `--proxy-server=http://${hostRaw}:${portInt}`,  // 设置特定代理服务器。
                // `--disable-extensions`,  // 禁用 所有扩展。
                launchOpt["chromeFlags"] = launchOpt.chromeFlags.filter(
                    (item) => !(item.startsWith("--proxy-server=http://") || item === "--disable-extensions")
                )

                // Content to Write
                const exceptContent = disableExtensionsExceptStr(host, port, username, password)
                const manifestContent = manifestStr

                // Create Folder { recursive: true } 选项以创建父文件夹。
                if (!fs.existsSync(commonFilePath)) {
                    fs.mkdirSync(commonFilePath, {recursive: true})
                }

                // Create File With fs.writeFileSync, Write Temp File
                fs.writeFileSync(exceptFilePath, exceptContent)
                fs.writeFileSync(manifestFilePath, manifestContent)

                isCreateFile = true

                launchOpt["chromeFlags"].unshift(
                    `--disable-extensions-except=${commonFilePath}`,
                    `--load-extension=${commonFilePath}`
                )
            } catch (error) {
                console.log(`Operation Failed：${error}`)
            }
        }
        return launch(launchOpt).then((chrome) => {
            chrome.process.on("exit", () => {
                // Perform Desired Actions When All Chrome Instances Are Closed
                startNum -= 1
                if (startNum <= 0) {
                    started = false
                    deleteCreateFile()
                }
            })
            startNum += 1
            started = true
            return ""
        })
    })

    function canAccess(file) {
        if (!file) {
            return false
        }
        try {
            fs.accessSync(file)
            return true
        } catch (e) {
            return false
        }
    }

    function darwinFast() {
        const priorityOptions = [
            process.env.CHROME_PATH,
            process.env.LIGHTHOUSE_CHROMIUM_PATH,
            "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ]
        for (const chromePath of priorityOptions) {
            if (chromePath && canAccess(chromePath)) return chromePath
        }
        return null
    }

    const judgePath = () => {
        switch (process.platform) {
            // Handle macOS Stutter, Process Separately
            case "darwin":
                return darwinFast()
            case "win32":
                return getChromePath()
            case "linux":
                return getChromePath()
        }
    }

    ipcMain.handle("GetChromePath", async () => {
        try {
            return judgePath()
        } catch (e) {
            return null
        }
    })

    ipcMain.handle("StopAllChrome", async (e) => {
        deleteCreateFile()
        startNum = 0
        started = false
        return killAll()
    })
}
