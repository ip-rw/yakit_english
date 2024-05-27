const {ipcMain, shell} = require("electron")
const OS = require("os")
const path = require("path")
const process = require("process")
const {yaklangEngineDir, remoteLinkDir, yakitInstallDir} = require("../filePath")

module.exports = (win, getClient) => {
    // CPU usage average
    const cpuData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    // CPU monitor timer variable
    var time = null

    const cpuAverage = () => {
        //Initialise sum of idle and time of cores and fetch CPU info
        var totalIdle = 0,
            totalTick = 0
        var cpus = OS.cpus()

        //Loop through CPU cores
        for (var i = 0, len = cpus.length; i < len; i++) {
            //Select CPU core
            var cpu = cpus[i]

            //Total up the time in the cores tick
            for (type in cpu.times) {
                totalTick += cpu.times[type]
            }

            //Total up the idle time of the core
            totalIdle += cpu.times.idle
        }

        //Return the average Idle and Tick times
        return {idle: totalIdle / cpus.length, total: totalTick / cpus.length}
    }
    // function to calculate average of array
    const arrAvg = function (arr) {
        if (arr && arr.length >= 1) {
            const sumArr = arr.reduce((a, b) => a + b, 0)
            return sumArr / arr.length
        }
    }
    // load average for the past 1000 milliseconds calculated every 100
    const getCPULoadAVG = (avgTime = 1000, delay = 100) => {
        return new Promise((resolve, reject) => {
            const n = ~~(avgTime / delay)
            if (n <= 1) {
                reject("Error: interval to small")
            }

            let i = 0
            let samples = []
            const avg1 = cpuAverage()

            let interval = setInterval(() => {
                if (i >= n) {
                    clearInterval(interval)
                    resolve(~~(arrAvg(samples) * 100))
                }

                const avg2 = cpuAverage()
                const totalDiff = avg2.total - avg1.total
                const idleDiff = avg2.idle - avg1.idle

                samples[i] = 1 - idleDiff / totalDiff

                i++
            }, delay)
        })
    }

    // Start CPU & memory usage calc
    ipcMain.handle("start-compute-percent", () => {
        if (time) clearInterval(time)
        time = setInterval(() => {
            //cpu
            getCPULoadAVG(400, 200).then((avg) => {
                cpuData.shift()
                cpuData.push(avg)
            })

            /**
             * Memory calc method, pure nodejs can't get accurate memory usage
             *
             * Note：
             * Consider third-party libraries"systeminformation"Fetch memory details
             * But this library causes lag (due to system command/local file use for info)
             */
        }, 400)
    })
    // Fetch CPU & memory usage
    ipcMain.handle("fetch-compute-percent", () => {
        return cpuData
    })
    // Destroy CPU & memory usage counters
    ipcMain.handle("clear-compute-percent", () => {
        if (time) clearInterval(time)
    })

    /** Fetch OS type */
    ipcMain.handle("fetch-system-name", () => {
        return OS.type()
    })

    /** Fetch CPU architecture */
    ipcMain.handle("fetch-cpu-arch", () => {
        return `${process.arch}`
    })

    /** Fetch<OS-CPU architecture>Info */
    ipcMain.handle("fetch-system-and-arch", () => {
        /** @return {String} */
        return `${process.platform}-${process.arch}`
    })

    /** Open folder for yaklang/yakit files (note: moves with yakit downloads, opens yaklang only)*/
    ipcMain.handle("open-yaklang-path", (e) => {
        return shell.openPath(yaklangEngineDir)
    })

    /** Open folder for yakit files */
    ipcMain.handle("open-yakit-path", (e) => {
        return shell.openPath(yakitInstallDir)
    })

    /** Get remote connection config file path */
    ipcMain.handle("fetch-remote-file-path", (e) => {
        return remoteLinkDir
    })

    /** Open remote connection config folder */
    ipcMain.handle("open-remote-link", (e) => {
        return shell.openPath(remoteLinkDir)
    })

    /** Get computer name */
    ipcMain.handle("fetch-computer-name", () => {
        /** @return {String} */
        return OS.hostname()
    })
}
