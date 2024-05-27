const {ipcMain, shell, clipboard} = require("electron")
const URL = require("url")
const Path = require("path")
const Fs = require("fs")

module.exports = (win, getClient) => {
    /**
     * @name Check if string is valid URL
     * @param {String} value
     * @returns {Boolean}
     */
    const judgeUrl = (value) => {
        return URL.parse(value, true).protocol === "http:" || URL.parse(value, true).protocol === "https:"
    }
    /**
     * Open external link
     * @description URL from render process must include http or https
     */
    ipcMain.handle("open-url", (e, url) => {
        const flag = judgeUrl(url)
        if (flag) shell.openExternal(url)
    })

    // Copy render process content to clipboard
    ipcMain.handle("set-copy-clipboard", (e, text) => {
        clipboard.writeText(text)
    })
    /** Pass clipboard content to render process */
    ipcMain.handle("get-copy-clipboard", (e, text) => {
        return clipboard.readText()
    })

    // Extract filename from absolute path (no extension)
    ipcMain.handle("fetch-path-file-name", (e, path) => {
        const extension = Path.extname(path)
        return Path.basename(path, extension)
    })

    /** Check if file at target path exists */
    ipcMain.handle("is-file-exists", (e, path) => {
        return Fs.existsSync(path)
    })
}
