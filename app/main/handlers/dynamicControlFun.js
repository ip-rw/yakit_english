const childProcess = require("child_process")
const {getLocalYaklangEngine} = require("../filePath")
const {psYakList} = require("../handlers/yakLocal")
const {killYakGRPC} = require("../handlers/yakLocal")
const isWindows = process.platform === "win32"
/** @Generate Admin CMD for Windows */
function generateWindowsSudoCommand(file, args) {
    const cmds = args === "" ? `${file}` : `${file} ${args}`
    return `${cmds}`
}
// Service PPID
let ppid = null

const asyncKillDynamicControl = () => {
    return new Promise(async (resolve, reject) => {
        if (ppid) {
            const yakList = await psYakList()
            const processItem = yakList.find((element) => {
                if (isWindows) {
                    return element.ppid === ppid
                } else {
                    return element.pid === ppid
                }
            })
            if (processItem) {
                killYakGRPC(processItem.pid)
                    .then(() => {
                        ppid = null
                        console.log("colse-colse-colse-colse-colse-")
                    })
                    .finally(() => {
                        resolve()
                    })
            } else {
                resolve()
            }
        } else {
            resolve()
        }
    })
}

const asyncStartDynamicControl = (win, params) => {
    // Skip if service enabled, kill & restart process if no key within 10s
    if (ppid) {
        return new Promise((resolve, reject) => resolve({alive:true}))
    }
    const {note, secret, server, gen_tls_crt} = params
    return new Promise((resolve, reject) => {
        try {
            const subprocess = childProcess.exec(
                generateWindowsSudoCommand(
                    getLocalYaklangEngine(),
                    `xgrpc  --server  ${server} --gen-tls-crt ${gen_tls_crt} --secret ${secret} --note ${note}`
                ),
                {
                    maxBuffer: 1000 * 1000 * 1000,
                    stdio: "pipe"
                }
            )
            subprocess.stdout.on("data", (stdout) => {
                console.log("start-data", stdout)
                if (stdout.includes("yak grpc ok")) {
                    setTimeout(() => {
                        resolve({alive:false})
                    }, 1000)
                    // Enabled Service ID
                    ppid = subprocess.pid
                }
            })
            subprocess.stderr.on("data", (stderr) => {
                if (stderr) {
                    ppid = null
                    reject(stderr.toString("utf-8"))
                }
            })
            subprocess.on("error", (err) => {
                if (err) {
                    ppid = null
                    reject(err)
                }
            })

            subprocess.on("close", async (e) => {
                if (e) reject(e)
                ppid = null
            })
        } catch (e) {
            reject(e)
        }
    })
}

const asyncAliveDynamicControlStatus = () => {
    return new Promise((resolve, reject) => resolve(!!ppid))
}

module.exports = {
    asyncKillDynamicControl,
    asyncStartDynamicControl,
    asyncAliveDynamicControlStatus,
}
