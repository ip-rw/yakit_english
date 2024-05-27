const {app, ipcMain, shell} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const https = require("https");
const EventEmitter = require('events');
const zip = require('node-stream-zip');

const {
    YakitProjectPath,
    remoteLinkDir,
    yaklangEngineDir,
    basicDir,
    remoteLinkFile,
    codeDir,
    loadExtraFilePath,
    yakitInstallDir
} = require("../filePath")
const {
    fetchLatestYakitVersion,
    downloadYakitEE,
    downloadYakitCommunity,
    getYakitEEDownloadUrl,
    getYakitCommunityDownloadUrl,
    downloadYakEngine
} = require("./utils/network");

const userChromeDataDir = path.join(YakitProjectPath, "chrome-profile");
const authMeta = [];


const initMkbaseDir = async () => {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdirSync(remoteLinkDir, {recursive: true})
            fs.mkdirSync(basicDir, {recursive: true})
            fs.mkdirSync(userChromeDataDir, {recursive: true})
            fs.mkdirSync(yaklangEngineDir, {recursive: true})
            fs.mkdirSync(codeDir, {recursive: true})

            try {
                console.info("Start checking bins/resources")
                const extraResources = loadExtraFilePath(path.join("bins", "resources"));
                const resourceBase = basicDir;
                if (!fs.existsSync(path.join(resourceBase, "flag.txt"))) {
                    console.info("Start to load bins/resources ...")
                    fs.readdirSync(extraResources).forEach(value => {
                        if (value.endsWith(".txt")) {
                            try {
                                fs.copyFileSync(path.join(extraResources, value), path.join(resourceBase, value))
                            } catch (e) {
                                console.info(e)
                            }
                        }
                    })
                }
            } catch (e) {
                console.error(e)
            }

            resolve()
        } catch (e) {
            reject(e)
        }
    })
}

const loadSecrets = () => {
    authMeta.splice(0, authMeta.length)
    try {
        const data = fs.readFileSync(path.join(remoteLinkDir, "yakit-remote.json"));
        JSON.parse(data).forEach(i => {
            if (!(i["host"] && i["port"])) {
                return
            }

            authMeta.push({
                name: i["name"] || `${i["host"]}:${i["port"]}`,
                host: i["host"],
                port: i["port"],
                tls: i["tls"] || false,
                password: i["password"] || "",
                caPem: i["caPem"] || "",
            })
        })
    } catch (e) {
    }
};

function saveSecret(name, host, port, tls, password, caPem) {
    if (!host || !port) {
        throw new Error("empty host or port")
    }

    authMeta.push({
        host, port, tls, password, caPem, name: name || `${host}:${port}`,
    })
    saveAllSecret([...authMeta])
};

const isWindows = process.platform === "win32";

const saveAllSecret = (authInfos) => {
    try {
        fs.unlinkSync(remoteLinkFile)
    } catch (e) {

    }


    const authFileStr = JSON.stringify([...authInfos.filter((v, i, arr) => {
        return arr.findIndex(origin => origin.name === v.name) === i
    })]);
    fs.writeFileSync(remoteLinkFile, new Buffer(authFileStr, "utf8"))
};

const getLatestYakLocalEngine = () => {
    switch (process.platform) {
        case "darwin":
        case "linux":
            return path.join(yaklangEngineDir, "yak")
        case "win32":
            return path.join(yaklangEngineDir, "yak.exe")
    }
}

// Get Yakit platform
const getYakitPlatform = () => {
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `darwin-arm64`
            } else {
                return `darwin-x64`
            }
        case "win32":
            return `windows-amd64`
        case "linux":
            return `linux-amd64`
    }
}

module.exports = {
    getLatestYakLocalEngine, initial: async () => {
        return await initMkbaseDir();
    }, register: (win, getClient) => {
        ipcMain.handle("save-yakit-remote-auth", async (e, params) => {
            let {name, host, port, tls, caPem, password} = params;
            name = name || `${host}:${port}`
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets()
            saveSecret(name, host, port, tls, password, caPem)
        })
        ipcMain.handle("remove-yakit-remote-auth", async (e, name) => {
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets();
        })
        ipcMain.handle("get-yakit-remote-auth-all", async (e, name) => {
            loadSecrets()
            return authMeta;
        })
        ipcMain.handle("get-yakit-remote-auth-dir", async (e, name) => {
            return remoteLinkDir;
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncQueryLatestYakEngineVersion = (params) => {
            return new Promise((resolve, reject) => {
                let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/version.txt")
                rsp.on("response", rsp => {
                    rsp.on("data", data => {
                        resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                    }).on("error", err => reject(err))
                })
                rsp.on("error", reject)
            })
        }
        ipcMain.handle("query-latest-yak-version", async (e, params) => {
            return await asyncQueryLatestYakEngineVersion(params)
        });

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncQueryLatestNotification = (params) => {
            return new Promise((resolve, reject) => {
                let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/notification.md")
                rsp.on("response", rsp => {
                    rsp.on("data", data => {
                        const passage = Buffer.from(data).toString();
                        if (passage.startsWith("# Yakit Notification")) {
                            resolve(passage)
                        } else {
                            resolve("")
                        }

                    }).on("error", err => reject(err))
                })
                rsp.on("error", reject)
            })
        }
        ipcMain.handle("query-latest-notification", async (e, params) => {
            return await asyncQueryLatestNotification(params)
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncQueryLatestYakitEngineVersion = (params) => {
            return new Promise((resolve, reject) => {
                fetchLatestYakitVersion().then(version => {
                    resolve(version)
                }).catch(e => {
                    reject(e)
                })
            })
        }
        ipcMain.handle("query-latest-yakit-version", async (e, params) => {
            return await asyncQueryLatestYakitEngineVersion(params)
        })


        class YakVersionEmitter extends EventEmitter {
        }

        const yakVersionEmitter = new YakVersionEmitter();
        let isFetchingVersion = false;
        let latestVersionCache = null;

        /** clear latestVersionCache value */
        ipcMain.handle("clear-local-yaklang-version-cache", async (e) => {
            latestVersionCache = null
            return
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncGetCurrentLatestYakVersion = (params) => {
            return new Promise((resolve, reject) => {
                console.info("start to fetch YAK-VERSION")
                if (latestVersionCache) {
                    console.info("YAK-VERSION: fetch cache: " + `${latestVersionCache}`)
                    resolve(latestVersionCache)
                    return;
                }

                console.info("YAK-VERSION: mount version")
                yakVersionEmitter.once('version', (err, version) => {
                    if (err) {

                        diagnosingYakVersion().catch(err => {
                            console.info("YAK-VERSION(DIAG): fetch error: " + `${err}`)
                            reject(err)
                        }).then(() => {
                            console.info("YAK-VERSION: fetch error: " + `${err}`)
                            reject(err)
                        })
                    } else {
                        console.info("YAK-VERSION: hit version: " + `${version}`)
                        resolve(version);
                    }
                })
                if (isFetchingVersion) {
                    console.info("YAK-VERSION is executing...")
                    return;
                }

                console.info("YAK-VERSION process is executing...")
                isFetchingVersion = true;
                childProcess.execFile(getLatestYakLocalEngine(), ["-v"], (err, stdout) => {
                    console.info(stdout)
                    if (err) {
                        yakVersionEmitter.emit('version', err, null);
                        isFetchingVersion = false
                        return;
                    }
                    // const version = stdout.replaceAll("yak version ()", "").trim();
                    const match = /.*?yak(\.exe)?\s+version\s+(\S+)/.exec(stdout);
                    const version = match && match[2];
                    if (!version) {
                        const error = new Error("[unknown reason] cannot fetch yak version (yak -v)");
                        yakVersionEmitter.emit('version', error, null);
                        isFetchingVersion = false;
                    } else {
                        latestVersionCache = version;
                        yakVersionEmitter.emit('version', null, version);
                        isFetchingVersion = false
                    }
                })
            })
        }
        ipcMain.handle("get-current-yak", async (e, params) => {
            return await asyncGetCurrentLatestYakVersion(params)
        })

        const diagnosingYakVersion = () => new Promise((resolve, reject) => {
            const commandPath = getLatestYakLocalEngine()
            fs.access(commandPath, fs.constants.X_OK, err => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        reject(new Error(`Command not found: ${commandPath}`));
                    } else if (err.code === 'EACCES') {
                        reject(new Error(`Command execution failed (no permission)): ${commandPath}`));
                    } else {
                        reject(new Error(`Command unexecutable: ${commandPath}`));
                    }
                    return;
                }

                childProcess.execFile(commandPath, ['-v'], {timeout: 20000}, (error, stdout, stderr) => {
                    if (error) {
                        let errorMessage = `Command execution failure: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`;
                        if (error.code === 'ENOENT') {
                            errorMessage = `Cannot execute command, engine not found: ${commandPath}\nStderr: ${stderr}`;
                        } else if (error.killed) {
                            errorMessage = `Engine forcibly terminated by system, possible reasons: excessive memory usage, system exit, security software: ${commandPath}\nStderr: ${stderr}`;
                        } else if (error.signal) {
                            errorMessage = `Engine terminated due to signal: ${error.signal}\nStderr: ${stderr}`;
                        } else if (error.code === 'ETIMEDOUT') {
                            errorMessage = `Command times out, process encounters unknown issue, manual engine debugging required: ${commandPath}\nStdout: ${stdout}\nStderr: ${stderr}`;
                        }

                        reject(new Error(errorMessage));
                        return;
                    }

                    resolve(stdout);
                })
            })
        })
        ipcMain.handle('diagnosing-yak-version', async (e, params) => {
            return diagnosingYakVersion()
        })

        // asyncDownloadLatestYak wrapper
        const asyncDownloadLatestYak = (version) => {
            return new Promise(async (resolve, reject) => {
                const dest = path.join(yaklangEngineDir, version.startsWith('dev/') ? 'yak-' + version.replace('dev/', 'dev-') : `yak-${version}`);
                try {
                    fs.unlinkSync(dest)
                } catch (e) {

                }
                await downloadYakEngine(version, dest, state => {
                    win.webContents.send("download-yak-engine-progress", state)
                }, resolve, reject)
            })
        }
        ipcMain.handle("download-latest-yak", async (e, version) => {
            return await asyncDownloadLatestYak(version)
        })

        // asyncDownloadLatestYakit wrapper
        async function asyncDownloadLatestYakit(version, isEnterprise) {
            return new Promise(async (resolve, reject) => {
                // format version
                if (version.startsWith("v")) {
                    version = version.substr(1)
                }

                console.info("start to fetching download-url for yakit")

                const downloadUrl = isEnterprise ? await getYakitEEDownloadUrl(version) : await getYakitCommunityDownloadUrl(version)
                // Check if Downloads folder exists, create if not
                if (!fs.existsSync(yakitInstallDir)) fs.mkdirSync(yakitInstallDir, {recursive: true})
                const dest = path.join(yakitInstallDir, path.basename(downloadUrl));
                try {
                    fs.unlinkSync(dest)
                } catch (e) {

                }

                console.info(`start to download yakit from ${downloadUrl} to ${dest}`)


                if (isEnterprise) {
                    await downloadYakitEE(version, dest, state => {
                        if (!!state) {
                            win.webContents.send("download-yakit-engine-progress", state)
                        }
                    }, resolve, reject)
                } else {
                    await downloadYakitCommunity(version, dest, state => {
                        if (!!state) {
                            win.webContents.send("download-yakit-engine-progress", state)
                        }
                    }, resolve, reject)
                }
            })
        }

        ipcMain.handle("download-latest-yakit", async (e, version, isEnterprise) => {
            return await asyncDownloadLatestYakit(version, isEnterprise)
        })

        ipcMain.handle("download-enpriTrace-latest-yakit", async (e, url) => {
            return await new Promise((resolve, reject) => {
                downloadYakitByDownloadUrl(resolve, reject, url)
            })
        })

        ipcMain.handle("update-enpritrace-info", async () => {
            return await {version: getYakitPlatform()}
        })

        ipcMain.handle("get-windows-install-dir", async (e) => {
            return getLatestYakLocalEngine();
            //systemRoot := os.Getenv("WINDIR")
            // 			if systemRoot == "" {
            // 				systemRoot = os.Getenv("windir")
            // 			}
            // 			if systemRoot == "" {
            // 				systemRoot = os.Getenv("SystemRoot")
            // 			}
            //
            // 			if systemRoot == "" {
            // 				return utils.Errorf("cannot fetch windows system root dir")
            // 			}
            //
            // 			installed = filepath.Join(systemRoot, "System32", "yak.exe")
            // if (process.platform !== "win32") {
            //     return "%WINDIR%\\System32\\yak.exe"
            // }
            // return getWindowsInstallPath();

        });

        const installYakEngine = (version) => {
            return new Promise((resolve, reject) => {
                let origin = path.join(yaklangEngineDir, version.startsWith('dev/') ? 'yak-' + version.replace('dev/', 'dev-') : `yak-${version}`);
                origin = origin.replaceAll(`"`, `\"`);

                let dest = getLatestYakLocalEngine(); //;isWindows ? getWindowsInstallPath() : "/usr/local/bin/yak";
                dest = dest.replaceAll(`"`, `\"`)

                try {
                    fs.unlinkSync(dest)
                } catch (e) {
                    if (e.message.indexOf("operation not permitted") > -1) reject("operation not permitted")
                }


                childProcess.exec(isWindows ? `copy "${origin}" "${dest}"` : `cp "${origin}" "${dest}" && chmod +x "${dest}"`, err => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve()
                })
            })
        }

        ipcMain.handle("install-yak-engine", async (e, version) => {
            return await installYakEngine(version);
        })

        // Get yak code root directory
        ipcMain.handle("fetch-code-path", () => {
            return codeDir
        });

        // Open file at specified path
        ipcMain.handle("open-specified-file", async (e, path) => {
            return shell.showItemInFolder(path)
        })

        const generateInstallScript = () => {
            return new Promise((resolve, reject) => {
                const all = "auto-install-cert.zip"
                const output_name = isWindows ? `auto-install-cert.bat` : `auto-install-cert.sh`
                if (!fs.existsSync(loadExtraFilePath(path.join("bins/scripts", all)))) {
                    reject(all + " not found")
                    return
                }
                console.log("start to gen cert script")
                const zipHandler = new zip({
                    file: loadExtraFilePath(path.join("bins/scripts", all)), storeEntries: true,
                })
                zipHandler.on("ready", () => {
                    const targetPath = path.join(YakitProjectPath, output_name)
                    zipHandler.extract(output_name, targetPath, (err, res) => {   
                        if (!fs.existsSync(targetPath)) {
                            reject(`Extract Cert Script Failed`)
                        } else {
                            // Add execution permission to script if not Windows
                            if (!isWindows) {
                                fs.chmodSync(targetPath, 0o755);
                            }
                            resolve(targetPath)
                        }
                        zipHandler.close();
                    })
                })
                zipHandler.on("error", err => {
                    console.info(err)
                    reject(`${err}`)
                    zipHandler.close()
                })
            })
        }


        ipcMain.handle("generate-install-script", async (e) => {
            return await generateInstallScript()
        })

        // asyncInitBuildInEngine wrapper
        const asyncInitBuildInEngine = (params) => {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync(loadExtraFilePath(path.join("bins", "yak.zip")))) {
                    reject("BuildIn Engine Not Found!")
                    return
                }

                console.info("Start to Extract yak.zip")
                const zipHandler = new zip({
                    file: loadExtraFilePath(path.join("bins", "yak.zip")), storeEntries: true,
                })
                console.info("Start to Extract yak.zip: Set `ready`")
                zipHandler.on("ready", () => {
                    const buildInPath = path.join(yaklangEngineDir, "yak.build-in");

                    console.log('Entries read: ' + zipHandler.entriesCount);
                    for (const entry of Object.values(zipHandler.entries())) {
                        const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
                        console.log(`Entry ${entry.name}: ${desc}`);
                    }

                    console.info("we will extract file to: " + buildInPath)
                    const extractedFile = (() => {
                        switch (os.platform()) {
                            case "darwin":
                                return "bins/yak_darwin_amd64"
                            case "win32":
                                return "bins/yak_windows_amd64.exe"
                            case "linux":
                                switch (os.arch()) {
                                    case "arm64":
                                        return "bins/yak_linux_arm64"
                                    default:
                                        return "bins/yak_linux_amd64"
                                }
                            default:
                                return ""
                        }
                    })()
                    zipHandler.extract(extractedFile, buildInPath, (err, res) => {
                        if (!fs.existsSync(buildInPath)) {
                            reject(`Extract BuildIn Engine Failed`)
                        } else {

                            /**
                             * Copy engine to true location
                             * */
                            try {
                                let targetEngine = path.join(yaklangEngineDir, isWindows ? "yak.exe" : "yak")
                                if (!isWindows) {
                                    fs.copyFileSync(buildInPath, targetEngine)
                                    fs.chmodSync(targetEngine, 0o755)
                                } else {
                                    fs.copyFileSync(buildInPath, targetEngine)
                                }
                                resolve()
                            } catch (e) {
                                reject(e)
                            }
                        }
                        console.info("zipHandler closing...")
                        zipHandler.close();
                    })
                })
                console.info("Start to Extract yak.zip: Set `error`")
                zipHandler.on("error", err => {
                    console.info(err)
                    reject(`${err}`)
                    zipHandler.close()
                })
            })
        }
        ipcMain.handle("InitBuildInEngine", async (e, params) => {
            return await asyncInitBuildInEngine(params)
        })

        // Attempt to initialize database
        ipcMain.handle("InitCVEDatabase", async (e) => {
            const targetFile = path.join(YakitProjectPath, "default-cve.db.gzip")
            if (fs.existsSync(targetFile)) {
                return
            }
            const buildinDBFile = loadExtraFilePath(path.join("bins", "database", "default-cve.db.gzip"));
            if (fs.existsSync(buildinDBFile)) {
                fs.copyFileSync(buildinDBFile, targetFile)
            }
        })

        // Get built-in engine version
        ipcMain.handle("GetBuildInEngineVersion"
            /*"IsBinsExisted"*/, async (e) => {
                const yakZipName = path.join("bins", "yak.zip")
                if (!fs.existsSync(loadExtraFilePath(yakZipName))) {
                    throw Error(`Cannot found yak.zip, bins: ${loadExtraFilePath(yakZipName)}`)
                }
                return fs.readFileSync(loadExtraFilePath(path.join("bins", "engine-version.txt"))).toString("utf8")
            })

        // asyncRestoreEngineAndPlugin wrapper
        ipcMain.handle("RestoreEngineAndPlugin", async (e, params) => {
            const engineTarget = isWindows ? path.join(yaklangEngineDir, "yak.exe") : path.join(yaklangEngineDir, "yak")
            const buidinEngine = path.join(yaklangEngineDir, "yak.build-in")
            const cacheFlagLock = path.join(basicDir, "flag.txt")
            try {
                // remove old engine
                if (fs.existsSync(buidinEngine)) {
                    fs.unlinkSync(buidinEngine)
                }
                if (isWindows && fs.existsSync(engineTarget)) {
                    // access write will fetch delete!
                    fs.accessSync(engineTarget, fs.constants.F_OK | fs.constants.W_OK)
                }
                if (fs.existsSync(engineTarget)) {
                    fs.unlinkSync(engineTarget)
                }

                if (fs.existsSync(cacheFlagLock)) {
                    fs.unlinkSync(cacheFlagLock)
                }

            } catch (e) {
                throw e
            }
            return await asyncInitBuildInEngine({})
        })

        // Unzip start-engine.zip
        const generateStartEngineGRPC = () => {
            return new Promise((resolve, reject) => {
                const all = "start-engine.zip"
                const output_name = isWindows ? `start-engine-grpc.bat` : `start-engine-grpc.sh`

                // Do not unzip if exists
                if(fs.existsSync(path.join(yaklangEngineDir,output_name))){
                    resolve("")
                    return
                }

                if (!fs.existsSync(loadExtraFilePath(path.join("bins/scripts", all)))) {
                    reject(all + " not found")
                    return
                }
                const zipHandler = new zip({
                    file: loadExtraFilePath(path.join("bins/scripts", all)), storeEntries: true,
                })
                zipHandler.on("ready", () => {
                    const targetPath = path.join(yaklangEngineDir, output_name)
                    zipHandler.extract(output_name, targetPath, (err, res) => {
                        if (!fs.existsSync(targetPath)) {
                            reject(`Extract Start Engine GRPC Script Failed`)
                        } else {
                            // Add execution permission to script if not Windows
                            if (!isWindows) {
                                fs.chmodSync(targetPath, 0o755);
                            }
                            resolve("")
                        }
                        zipHandler.close();
                    })
                })
                zipHandler.on("error", err => {
                    console.info(err)
                    reject(`${err}`)
                    zipHandler.close()
                })
            })
        }


        ipcMain.handle("generate-start-engine", async (e) => {
            return await generateStartEngineGRPC()
        })
    },
}