const {ipcMain} = require("electron")
const fs = require("fs")
const path = require("path")
const {renderLog, printLog} = require("./filePath")
const {getNowTime} = require("./toolsFunc")

/** Engine Error Log */
const renderLogPath = path.join(renderLog, `render-log-${getNowTime()}.txt`)
let renderWriteStream = fs.createWriteStream(renderLogPath, {flags: "a"})

/** Engine Error Log */
const printLogPath = path.join(printLog, `print-log-${getNowTime()}.txt`)
let printWriteStream = fs.createWriteStream(printLogPath, {flags: "a"})

module.exports = (win, getClient) => {
    /** Render Error Info Collection */
    ipcMain.handle("render-error-log", (e, error) => {
        const content = error || ""
        if (content) {
            renderWriteStream.write(`${content}\n`, (err) => {
                if (err) {
                    console.error("render-error-log-write-error:", err)
                }
            })
        }
    })

    /** Suspicion Print Info Collection */
    ipcMain.handle("print-info-log", (e, info) => {
        if (info) {
            printWriteStream.write(`${info}\n`, (err) => {
                if (err) {
                    console.error("print-error-log-write-error:", err)
                }
            })
        }
    })
}
