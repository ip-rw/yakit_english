/**
 * Utilities only, no comm/logic operations
 */

const path = require("path")
const fs = require("fs")

/**
 * @Name: Keep newest files based on count in folder ${length} Single file
 * @Note: Only for folders with files, not subfolders
 * @param {string} Target folder
 * @param {number} Keep file count
 */
const clearFolder = (folderPath, length) => {
    try {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error(`readdir-${folderPath}-error`, err)
                return
            }

            // Get all file details in folder
            const fileStats = files.map((file) => {
                const filePath = path.join(folderPath, file)
                return {
                    name: file,
                    path: filePath,
                    stats: fs.statSync(filePath)
                }
            })
            // Info file set
            const validFiles = fileStats.filter((item) => item.stats.size && item.stats.size > 0)
            // No-info file set
            const invalidFiles = fileStats.filter((item) => !item.stats.size || item.stats.size <= 0)

            // Sort by last modified
            const sortedFiles = validFiles.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())

            // Keep latest 10 files, delete others
            const filesToDelete = sortedFiles.slice(length).concat([...invalidFiles])
            filesToDelete.forEach((file) => {
                fs.unlink(file.path, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err)
                    }
                })
            })
        })
    } catch (error) {
        console.log("checkFolderAndDel-error", error)
    }
}

/** Generate YYYY-MM-DD-HH-MM-SS */
const getNowTime = () => {
    let now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() + 1
    let today = now.getDate()
    let hour = now.getHours()
    let minute = now.getMinutes()
    let second = now.getSeconds()

    return `${year}-${month}-${today}-${hour}-${minute}-${second}`
}

module.exports = {clearFolder, getNowTime}
