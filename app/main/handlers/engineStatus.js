const {ipcMain} = require("electron")
const childProcess = require("child_process")
const _sudoPrompt = require("sudo-prompt")
const {GLOBAL_YAK_SETTING} = require("../state")
const {testRemoteClient} = require("../ipc")
const {getLocalYaklangEngine, engineLog, YakitProjectPath} = require("../filePath")
const net = require("net")
const fs = require("fs")
const path = require("path")
const {getNowTime} = require("../toolsFunc")

/** Engine error log */
const logPath = path.join(engineLog, `engine-log-${getNowTime()}.txt`)
let out = null
fs.open(logPath, "a", (err, fd) => {
    if (err) {
        console.log("Get local engine error log：", err)
    } else {
        out = fd
    }
})

let dbFile = undefined

/** Local engine retries with random port (max retries: 5) */
let engineCount = 0

function isPortAvailable(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer({})
        server.on("listening", () => {
            server.close((err) => {
                if (err === undefined) {
                    resolve()
                } else {
                    reject(err)
                }
            })
        })
        server.on("error", (err) => {
            reject(err)
        })
        server.listen(port, () => {})
    })
}

function isPortOpen(port) {}

const isWindows = process.platform === "win32"

/** @name Generate admin command for Windows */
// function generateWindowsSudoCommand(file, args) {
//     const cmds = args === "" ? `"'${file}'"` : `"'${file}'" "'${args}'"`
//     return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
// }
/** @name Execute command as admin */
// function sudoExec(cmd, opt, callback) {
//     if (isWindows) {
//         childProcess.exec(cmd, {maxBuffer: 1000 * 1000 * 1000}, (err, stdout, stderr) => {
//             callback(err)
//         })
//     } else {
//         _sudoPrompt.exec(cmd, {...opt, env: {YAKIT_HOME: YakitProjectPath}}, callback)
//     }
// }

const engineStdioOutputFactory = (win) => (buf) => {
    if (win) {
        win.webContents.send("live-engine-stdio", buf.toString("utf-8"))
    }
}

const engineLogOutputFactory = (win) => (message) => {
    if (win) {
        console.info(message)
        win.webContents.send("live-engine-log", message + "\n")
    }
}

const ECHO_TEST_MSG = "Hello Yakit!"

module.exports = (win, callback, getClient, newClient) => {
    // Output to welcome page
    const toStdout = engineStdioOutputFactory(win)
    // Log to file
    const toLog = engineLogOutputFactory(win)

    /** Get local engine version */
    ipcMain.handle("fetch-yak-version", () => {
        try {
            getClient().Version({}, async (err, data) => {
                if (win && data.Version) win.webContents.send("fetch-yak-version-callback", data.Version)
                else win.webContents.send("fetch-yak-version-callback", "")
            })
        } catch (e) {
            win.webContents.send("fetch-yak-version-callback", "")
        }
    })

    ipcMain.handle("engine-status", () => {
        try {
            const text = "hello yak grpc engine"
            getClient().Echo({text}, (err, data) => {
                if (win) {
                    if (data?.result === text) {
                        win.webContents.send("client-engine-status-ok")
                    } else {
                        win.webContents.send("client-engine-status-error")
                    }
                }
            })
        } catch (e) {
            if (win) {
                win.webContents.send("client-engine-status-error")
            }
        }
    })

    // asyncGetRandomPort wrapper
    const asyncGetRandomPort = () => {
        return new Promise((resolve, reject) => {
            const port = 40000 + Math.floor(Math.random() * 9999)
            isPortAvailable(port)
                .then(() => {
                    resolve(port)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }
    ipcMain.handle("get-random-local-engine-port", async (e) => {
        return await asyncGetRandomPort()
    })

    // asyncIsPortAvailable wrapper
    const asyncIsPortAvailable = (params) => {
        return isPortAvailable(params)
    }
    ipcMain.handle("is-port-available", async (e, port) => {
        /**
         * @port: Check if port is listenable
         */
        return await asyncIsPortAvailable(port)
    })

    /**
     * @name Manually launch Yaklang engine process
     * @param {Object} params
     * @param {Boolean} params.sudo Launch yak with admin rights?
     * @param {Number} params.port Engine start port in local cache
     * @param {Boolean} params.isEnpriTraceAgent Engine start port in local cache
     */
    const asyncStartLocalYakEngineServer = (win, params) => {
        engineCount += 1

        const {port, isEnpriTraceAgent} = params
        return new Promise((resolve, reject) => {
            try {
                toLog("Local engine process started")
                const log = out ? out : "ignore"

                const grpcPort = ["grpc", "--port", `${port}`]
                const extraParams = dbFile ? [...grpcPort, "--profile-db", dbFile] : grpcPort
                const resultParams = isEnpriTraceAgent ? [...extraParams, "--disable-output"] : extraParams

                const subprocess = childProcess.spawn(getLocalYaklangEngine(), resultParams, {
                    // stdio: ["ignore", "ignore", "ignore"]
                    detached: false,
                    windowsHide: true,
                    stdio: ["ignore", log, log],
                    env: {
                        ...process.env,
                        YAKIT_HOME: YakitProjectPath
                    }
                })

                // subprocess.unref()
                process.on("exit", () => {
                    // Terminate subprocess
                    subprocess.kill()
                })
                subprocess.on("error", (err) => {
                    toLog(`Local engine error occurred, reason：${err}`)
                    win.webContents.send("start-yaklang-engine-error", `Local engine error occurred, reason：${err}`)
                    reject(err)
                })
                subprocess.on("close", async (e) => {
                    toLog(`Local engine exited, exit code：${e}`)
                    fs.readFile(engineLog, (err, data) => {
                        if (err) {
                            console.log("Read engine file failed", err)
                        } else {
                            toStdout(data)
                            setTimeout(() => {
                                try {
                                    fs.unlinkSync(engineLog)
                                } catch (e) {
                                    console.info(`unlinkSync 'engine.log' local cache failed: ${e}`, e)
                                }
                            }, 1000)
                        }
                    })
                })
                resolve()
            } catch (e) {
                reject(e)
            }
        })
    }

    /** Launch local Yaklang engine */
    ipcMain.handle("start-local-yaklang-engine", async (e, params) => {
        if (!params["port"]) {
            throw Error("Start local engine requires port")
        }
        return await asyncStartLocalYakEngineServer(win, params)
    })

    /** Check if remote cache port has engine running */
    const judgeRemoteEngineStarted = (win, params) => {
        return new Promise((resolve, reject) => {
            try {
                testRemoteClient(params, async (err, result) => {
                    if (!err) {
                        GLOBAL_YAK_SETTING.defaultYakGRPCAddr = `${params.host}:${params.port}`
                        GLOBAL_YAK_SETTING.caPem = params.caPem || ""
                        GLOBAL_YAK_SETTING.password = params.password
                        GLOBAL_YAK_SETTING.sudo = false
                        win.webContents.send("start-yaklang-engine-success", "remote")
                        resolve()
                    } else reject(err)
                })
            } catch (e) {
                reject(e)
            }
        })
    }
    /** Remote Connect Engine */
    ipcMain.handle("start-remote-yaklang-engine", async (e, params) => {
        return await judgeRemoteEngineStarted(win, params)
    })

    /** Connect Engine */
    ipcMain.handle("connect-yaklang-engine", async (e, params) => {
        /**
         * connect Yaklang engine is for setting parameters, actually unaware of remote or local
         * params should include the following：
         *  @Host: Hostname, may include port
         *  @Port: Port
         *  @Sudo: Admin rights?
         *  @IsTLS?: TLS encrypted?
         *  @PemBytes?: Uint8Array is CaPem
         *  @Password?: Login password
         */
        const hostRaw = `${params["Host"] || "127.0.0.1"}`
        let portFromRaw = `${params["Port"] || 8087}`
        let hostFormatted = hostRaw
        if (hostRaw.lastIndexOf(":") >= 0) {
            portFromRaw = `${parseInt(hostRaw.substr(hostRaw.lastIndexOf(":") + 1))}`
            hostFormatted = `${hostRaw.substr(0, hostRaw.lastIndexOf(":"))}`
        }
        const addr = `${hostFormatted}:${portFromRaw}`
        toLog(`Original parameters: ${JSON.stringify(params)}`)
        toLog(`Start connect to engine at：${addr} Host: ${hostRaw} Port: ${portFromRaw}`)
        GLOBAL_YAK_SETTING.defaultYakGRPCAddr = addr

        callback(
            GLOBAL_YAK_SETTING.defaultYakGRPCAddr,
            Buffer.from(params["PemBytes"] === undefined ? "" : params["PemBytes"]).toString("utf-8"),
            params["Password"] || ""
        )
        return await new Promise((resolve, reject) => {
            newClient().Echo({text: ECHO_TEST_MSG}, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                if (data["result"] === ECHO_TEST_MSG) {
                    resolve(data)
                } else {
                    reject(Error(`ECHO ${ECHO_TEST_MSG} ERROR`))
                }
            })
        })
    })

    /** Disconnect engine (not used) */
    ipcMain.handle("break-yaklalng-engine", () => {})

    /** Log to welcome screen */
    ipcMain.handle("output-log-to-welcome-console", (e, msg) => {
        toLog(`${msg}`)
    })

    /** Invoke command to create runtime node */
    ipcMain.handle("call-command-generate-node", (e, params) => {
        return new Promise((resolve, reject) => {
            // Runtime node
            const subprocess = childProcess.spawn(getLocalYaklangEngine(), [
                "mq",
                "--server",
                params.ipOrdomain,
                "--server-port",
                params.port,
                "--id",
                params.nodename
            ])
            subprocess.stdout.on("data", (data) => {
                resolve(subprocess.pid)
            })
            subprocess.on("error", (error) => {
                reject(error)
            })
            subprocess.stderr.on("data", (data) => {
                reject(data)
            })
        })
    })
    /** Delete runtime node */
    ipcMain.handle("kill-run-node", (e, params) => {
        return new Promise((resolve, reject) => {
            if (isWindows) {
                childProcess.exec(`taskkill /F /PID ${params.pid}`, (error, stdout, stderr) => {
                    if (error) {
                        reject(error)
                    }
                    if (stderr) {
                        reject(stderr)
                    }
                    resolve("")
                })
            } else {
                childProcess.exec(`kill -9 ${params.pid}`, (error, stdout, stderr) => {
                    if (error) {
                        reject(error)
                    }
                    if (stderr) {
                        reject(stderr)
                    }
                    resolve("")
                })
            }
        })
    })
}
