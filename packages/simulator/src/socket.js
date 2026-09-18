export function createSocket(url, options = {}) {
    const {
        heartbeat = null,
        autoReconnect = null,
        onConnected,
        onDisconnected,
        onMessage,
        WebSocket: Socket = globalThis.WebSocket,
        timers = globalThis,
        unloadTarget = typeof window !== 'undefined' ? window : null,
    } = options

    let current = null
    let open = false
    let explicitlyClosed = false
    let retried = 0
    let queue = []
    let retryTimer = null
    let beatTimer = null
    let pongTimer = null

    function clearPong() {
        if (pongTimer != null) timers.clearTimeout(pongTimer)
        pongTimer = null
    }

    function stopBeat() {
        if (beatTimer != null) timers.clearInterval(beatTimer)
        beatTimer = null
    }

    function flush() {
        if (!open || !current || queue.length === 0) return
        for (const data of queue) current.send(data)
        queue = []
    }

    function send(data, useQueue = true) {
        if (!current || !open) {
            if (useQueue) queue.push(data)
            return false
        }
        flush()
        current.send(data)
        return true
    }

    function beat() {
        send(heartbeat.message, false)
        if (pongTimer != null) return
        pongTimer = timers.setTimeout(() => {
            shut()
            explicitlyClosed = false
        }, heartbeat.pongTimeout)
    }

    function shouldRetry() {
        const { retries = -1 } = autoReconnect
        return typeof retries === 'function' ? retries(retried) : (retries < 0 || retried < retries)
    }

    function init() {
        if (explicitlyClosed) return
        const ws = new Socket(url)
        current = ws
        open = false

        ws.onopen = () => {
            if (current !== ws) return
            open = true
            retried = 0
            onConnected?.(ws)
            if (heartbeat) {
                stopBeat()
                beatTimer = timers.setInterval(beat, heartbeat.interval)
            }
            flush()
        }

        ws.onclose = (event) => {
            if (current === ws) open = false
            clearPong()
            stopBeat()
            onDisconnected?.(ws, event)
            if (explicitlyClosed || !autoReconnect) return
            if (current != null && ws !== current) return
            if (!shouldRetry()) return
            retried += 1
            retryTimer = timers.setTimeout(init, autoReconnect.delay ?? 1000)
        }

        ws.onmessage = (event) => {
            if (heartbeat) {
                clearPong()
                if (event.data === (heartbeat.responseMessage ?? heartbeat.message)) return
            }
            onMessage?.(ws, event)
        }
    }

    function shut(code = 1000, reason) {
        if (retryTimer != null) timers.clearTimeout(retryTimer)
        retryTimer = null
        if (!current) return
        explicitlyClosed = true
        clearPong()
        stopBeat()
        current.close(code, reason)
        current = null
        open = false
    }

    function close(code = 1000, reason) {
        shut(code, reason)
        unloadTarget?.removeEventListener?.('beforeunload', onUnload)
    }

    function onUnload() {
        close()
    }

    unloadTarget?.addEventListener?.('beforeunload', onUnload, { passive: true })
    init()

    return { send, close }
}
