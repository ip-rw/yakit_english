const axios = require('axios');
const fs = require('fs');
const {throttle} = require('throttle-debounce');

// Encode Chinese characters in URL
function encodeChineseCharacters(url) {
    // Implement logic to encode Chinese characters in URL
    return encodeURI(url);
}


function requestWithProgress(downloadUrl, dest, options = {}, onProgress = undefined, onFinished = undefined, onError = undefined) {
    // Set axios request config
    const config = {
        ...options, responseType: 'stream'
    };


    const u = encodeChineseCharacters(downloadUrl);
    console.info(`start download ${u} to ${dest}`)
    axios.get(u, config).then(response => {
        if (response.status === 404) {
            onError && onError(new Error(`404 not found in ${downloadUrl}`))
            return
        }

        const writer = fs.createWriteStream(dest);
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        const startedAt = Date.now();
        let getProgressState = () => {
            const state = {
                time: {
                    elapsed: (Date.now() - startedAt) / 1000, remaining: 0
                }, speed: 0, percent: 0, size: {
                    total: Number(totalLength) || 0, transferred: downloadedLength,
                }
            }
            if (state.time.elapsed >= 1) {
                state.speed = state.size.transferred / state.time.elapsed
            }

            if (state.size.total > 0) {
                state.percent = Math.min(state.size.transferred, state.size.total) / state.size.total;
                if (state.speed > 0) {
                    state.time.remaining = state.percent !== 1 ? (state.size.total / state.speed) - state.time.elapsed : 0;
                    state.time.remaining = Math.round(state.time.remaining * 1000) / 1000;
                }
            }
            return state
        }

        const updateProgress = throttle(options.throttle || 1000, () => {
            const percentage = (downloadedLength / totalLength) * 100;
            // Replace the logic here to update progress, e.g., send to frontend
            const state = getProgressState();
            console.log(`Downloaded: `, state.percent);
            onProgress && onProgress(state)
        });

        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            updateProgress();
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                onProgress && onProgress(100)
                resolve();
            });
            writer.on('error', reject);
        });

    }).then(() => {
        // Post-download processing
        onFinished && onFinished();
    }).catch(error => {
        // Error handling
        console.info(error.message);
        onError && onError(error)
    });
}

module.exports = {
    requestWithProgress,
}