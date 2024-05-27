const {service, httpApi} = require("../httpServer")
const {ipcMain} = require("electron")
const fs = require("fs")
const customPath = require("path")
const FormData = require("form-data")
const crypto = require("crypto")

module.exports = (win, getClient) => {
    ipcMain.handle("upload-img", async (event, params) => {
        const {path, type} = params
        // Create stream
        // console.log('time1',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        const readerStream = fs.createReadStream(path) // Use as sync interface。
        const formData = new FormData()
        formData.append("file_name", readerStream)
        formData.append("type", type)
        const res = httpApi(
            "post",
            "upload/img",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false
        )
        // res.then(()=>{
        //     console.log('time3',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        // })
        return res
    })

    ipcMain.handle("upload-group-data", async (event, params) => {
        const {path} = params
        // Create stream
        // console.log('time1',new Date().getHours(),new Date().getMinutes(),new Date().getSeconds());
        const readerStream = fs.createReadStream(path) // Use as sync interface。
        const formData = new FormData()
        formData.append("file", readerStream)
        const res = httpApi(
            "post",
            "update/plugins/group",
            formData,
            {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
            false
        )
        return res
    })

    // Compute Hash (supports shard and whole)）
    const hashChunk = ({path, size, chunkSize, chunkIndex}) => {
        return new Promise((resolve, reject) => {
            let options = {}
            if (size && chunkSize && chunkIndex) {
                const start = chunkIndex * chunkSize
                const end = Math.min(start + chunkSize, size)
                options = {start, end}
            }
            // Create shard's read stream
            const chunkStream = fs.createReadStream(path, options)
            // Compute Hash
            const hash = crypto.createHash("sha1")
            chunkStream.on("data", (chunk) => {
                hash.update(chunk)
            })
            chunkStream.on("end", () => {
                // Individual shard Hash
                const fileChunkHash = hash.digest("hex").slice(0, 8) // Keep first 8 chars of hash
                resolve(fileChunkHash)
            })

            chunkStream.on("error", (err) => {
                reject(err)
            })
        })
    }

    // Upload retries cache
    let postPackageHistory = {}
    const postProject = ({url, chunkStream, chunkIndex, totalChunks, fileName, hash, fileHash, token}) => {
        return new Promise((resolve, reject) => {
            postPackageHistory[hash] ? (postPackageHistory[hash] += 1) : (postPackageHistory[hash] = 1)
            const percent = (chunkIndex + 1) / totalChunks
            const formData = new FormData()
            formData.append("file", chunkStream)
            formData.append("index", chunkIndex)
            formData.append("totalChunks", totalChunks)
            formData.append("hash", fileHash)
            formData.append("fileName", fileName)
            // console.log("Parameters---", fileName, fileHash)
            httpApi(
                "post",
                url,
                formData,
                {"Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`},
                false,
                (percent === 1 && totalChunks > 3) ? 60 * 1000 * 10 : 60 * 1000
            )
                .then(async (res) => {
                    // console.log("res---", res)
                    const progress = Math.floor(percent * 100)
                    win.webContents.send(`callback-split-upload-${token}`, {
                        res,
                        progress
                    })
                    if (res.code !== 200 && postPackageHistory[hash] <= 3) {
                        // console.log("Retry", postPackageHistory[hash])
                        // Transfer failed, retry thrice
                        await postProject({url, chunkStream, chunkIndex, totalChunks, fileName, hash, fileHash, token})
                    } else if (postPackageHistory[hash] > 3) {
                        reject("Retry thrice on failure")
                    }
                    resolve()
                })
                .catch((err) => {
                    // console.log("catch", err)
                    reject(err)
                })
        })
    }

    const postProjectFail = ({fileName, hash, fileIndex}) => {
        service({
            url: "import/project/fail",
            method: "post",
            data: {
                fileName,
                hash,
                fileIndex
            }
        }).then((res) => {
            // console.log("rrrr---", res)
        })
    }

    // Upload status
    let TaskStatus = true
    // Shard upload
    ipcMain.handle("split-upload", (event, params) => {
        return new Promise(async (resolve, reject) => {
            // console.log("params---",params);
            // path as file path, token as slice progress, url as endpoint
            const {url, path, token} = params
            // Get filename
            const fileName = customPath.basename(path)
            // File size in bytes）
            const size = fs.statSync(path).size
            // Bytes in 5GB
            const fiveGBInBytes = 5 * 1024 * 1024 * 1024
            if (size > fiveGBInBytes) {
                reject("Upload limit: ≤5GB")
                return
            }
            // Shard size
            const chunkSize = 60 * 1024 * 1024 // Shard size, set to 60MB
            // Total shards count
            const totalChunks = Math.ceil(size / chunkSize)
            // Compute file Hash
            const fileHash = await hashChunk({path})
            const fileHashTime = `${fileHash}-${Date.now()}`
            TaskStatus = true
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                if (TaskStatus) {
                    try {
                        const hash = await hashChunk({path, size, chunkSize, chunkIndex})
                        let add = chunkIndex === 0 ? 0 : 1
                        const start = chunkIndex * chunkSize + add
                        const end = Math.min((chunkIndex + 1) * chunkSize, size)
                        // Create shard's read stream
                        const chunkStream = fs.createReadStream(path, {start, end})
                        await postProject({
                            url,
                            chunkStream,
                            chunkIndex,
                            totalChunks,
                            fileName,
                            hash,
                            fileHash: fileHashTime,
                            token
                        })
                    } catch (error) {
                        postProjectFail({
                            fileName,
                            hash: fileHashTime,
                            fileIndex: chunkIndex
                        })
                        reject(error)
                        TaskStatus = false
                    }
                }
            }
            postPackageHistory = {}
            resolve(TaskStatus)
        })
    })
    ipcMain.handle("cancle-split-upload", (event, params) => {
        return new Promise(async (resolve, reject) => {
            TaskStatus = false
            resolve()
        })
    })

    ipcMain.handle("get-folder-under-files", async (event, params) => {
        const {folderPath} = params
        if (!folderPath) return 0
        fs.readdir(folderPath, (err, files) => {
            if (err) throw err
            event.sender.send(`send-folder-under-files`, files)
        })
    })
}
