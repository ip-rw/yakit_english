const {ipcMain} = require("electron")
const fs = require("fs")
const {localCachePath, extraLocalCachePath} = require("./filePath")

/** Cache Var */
const kvCache = new Map()
/** Ext Cache Var */
const extraKVCache = new Map()

/**
 * Write Cache to Local FS
 * @param {"cache"|"extraCache"} Type Cache
 * @param {string} Value Cache
 */
const syncLocalCacheFile = (type, value) => {
    const filePath = type === "cache" ? localCachePath : extraLocalCachePath

    try {
        fs.unlinkSync(filePath)
    } catch (e) {
        console.info(`unlinkSync${type === "extraCache" ? " extra" : ""} local cache failed: ${e}`, e)
    }
    fs.writeFileSync(filePath, new Buffer(value, "utf8"))
}

const localCacheState = {
    cacheChanged: false,
    extraCacheChanged: false,
    cacheInitialized: false,
    extraCacheInitialized: false,
    writingFile: false
}
function getLocalCacheValue(key) {
    return kvCache.get(key)
}
function getExtraLocalCacheValue(key) {
    return extraKVCache.get(key)
}
function setLocalCache(key, value) {
    if (value === kvCache.get(key)) {
        return
    }
    kvCache.set(key, value)
    localCacheState.cacheChanged = true
}
function setExtraLocalCache(key, value) {
    if (value === extraKVCache.get(key)) {
        return
    }
    extraKVCache.set(key, value)
    localCacheState.extraCacheChanged = true
}
/**
 * Cache on Exit
 */
function setCloeseExtraLocalCache(key, value){
    extraKVCache.set(key, value)
    return new Promise((resolve, reject) => {
        try {
            localCacheState.writingFile = true
            const cache = extraKVCache
            let value = []
            cache.forEach((v, k) => {
                value.push({key: k, value: v})
            })
            value.sort((a, b) => `${a.key}`.localeCompare(`${b.key}`))
            syncLocalCacheFile("extraCache", JSON.stringify(value))
        } catch (e) {
            console.info(e)
        } finally {
            localCacheState.writingFile = false
            resolve()
        }
    })
}
/**
 * Write Timer
 * @param {"cache"|"extraCache"} type
 */
const writeTimer = (type) => {
    if (type === "cache") {
        if (!localCacheState.cacheChanged) {
            return
        } else {
            localCacheState.cacheChanged = false
        }
    } else if (type === "extraCache") {
        if (!localCacheState.extraCacheChanged) {
            return
        } else {
            localCacheState.extraCacheChanged = false
        }
    }
    syncCacheToFile(type)
}

/** Fetch Cache */
const initLocalCache = (callback) => {
    if (localCacheState.cacheInitialized) {
        return
    }
    localCacheState.cacheInitialized = true

    kvCache.clear()
    kvCache.set("*description*", "Modify Cache After Closing Yakit")

    try {
        /** Handle File Not Found */
        if (fs.existsSync(localCachePath)) {
            const data = fs.readFileSync(localCachePath)

            /** Prevent Direct File Deletion Error */
            const cache = data.toString() ? data.toString() : `[]`
            JSON.parse(cache).forEach((i) => {
                if (i["key"]) {
                    kvCache.set(i["key"], i["value"])
                }
            })
        }
        if (callback) callback()
    } catch (e) {
        console.info("Read Local Cache Error", e)
    } finally {
        setInterval(() => writeTimer("cache"), 3000)
    }
}
/** Fetch Ext Cache */
const initExtraLocalCache = (callback) => {
    if (localCacheState.extraCacheInitialized) {
        return
    }
    localCacheState.extraCacheInitialized = true

    extraKVCache.clear()
    kvCache.set("*description*", "Modify Cache After Closing Yakit")

    try {
        if (fs.existsSync(extraLocalCachePath)) {
            const data = fs.readFileSync(extraLocalCachePath)
            if (!data) {
                console.info("Extra Local Cache Empty!")
            }

            /** Prevent Direct File Deletion Error */
            const cache = data.toString() ? data.toString() : `[]`
            JSON.parse(cache).forEach((i) => {
                if (i["key"]) {
                    extraKVCache.set(i["key"], i["value"])
                }
            })
        }
        if (callback) callback()
    } catch (e) {
        console.info("Read Local Ext Cache Error", e)
    } finally {
        setInterval(() => writeTimer("extraCache"), 3000)
    }
}

/**
 * Force Write
 * @param {"cache"|"extraCache"} Type Cache
 */
const syncCacheToFile = (type) => {
    try {
        localCacheState.writingFile = true
        const cache = type === "cache" ? kvCache : extraKVCache

        let value = []
        cache.forEach((v, k) => {
            value.push({key: k, value: v})
        })
        value.sort((a, b) => `${a.key}`.localeCompare(`${b.key}`))
        syncLocalCacheFile(type, JSON.stringify(value))
    } catch (e) {
        console.info(e)
    } finally {
        localCacheState.writingFile = false
    }
}

module.exports = {
    getExtraLocalCacheValue,
    setExtraLocalCache,
    setCloeseExtraLocalCache,
    getLocalCacheValue,
    setLocalCache,
    initLocalCache,
    initExtraLocalCache,
    register: (win, getClient) => {
        /** Trigger Write Manually */
        ipcMain.handle("manual-write-file", async (e, type) => {
            syncCacheToFile(type)
        })
        /** Fetch Local Cache */
        ipcMain.handle("fetch-local-cache", async (e, key) => {
            return getLocalCacheValue(key)
        })
        /** Set Local Cache */
        ipcMain.handle("set-local-cache", (e, key, value) => {
            setLocalCache(key, value)
        })
        /** Fetch Local Ext Cache */
        ipcMain.handle("fetch-extra-cache", async (e, key) => {
            return getExtraLocalCacheValue(key)
        })
        /** Set Local Ext Cache */
        ipcMain.handle("set-extra-cache", (e, key, value) => {
            setExtraLocalCache(key, value)
        })
    }
}
