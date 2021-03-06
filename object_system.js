// -------------------------------------------------------------------- OBJECT DNS

const dgram = require('dgram')
const local_udp = dgram.createSocket('udp4')
let local_map = {}
local_udp.on('error', function (err) {
})
local_udp.on('message', function (input, sender) {
    let data = JSON.parse(input.toString())
    if (data == null) {
        local_udp.send(JSON.stringify(local_map), sender.port, sender.address)
    } else if (data.register) {
        local_map[data.register.name] = { port: data.register.port, address: sender.address }
    } else if (data.kill) {
        delete local_map[data.kill]
    }
})
local_udp.bind(3773)

function register_me(name, port) {
    let data = { register: { name, port } }
    local_udp.send(JSON.stringify(data), 3773, '')
}
function request_map() {
    let requester = dgram.createSocket('udp4')
    requester.send('null', 3773, '')
    requester.on('message', function (input, sender) {
        let data = JSON.parse(input.toString())
        for (let name in data) local_map[name] = data[name]
        requester.close()
    })
}

// -------------------------------------------------------------------- LOCAL OBJECT

const io = require("socket.io")
const express = require('express')
const cors = require('cors')

class LocalObject {
    constructor(name, port, advice_callback = () => { }, poke_behavior = null) {
        this.data = null
        this.webserver = express()
        this.webserver.use(cors())
        this.server = io.listen(port)
        setTimeout(() => { register_me(name, port) }, 100)
        this.__setup_webserver(advice_callback)
        this.webserver.listen(port + 1)
        this.server.on('connect', (client) => {
            client.on('advice', advice_callback)
            client.on('poke', () => {
                if (poke_behavior) poke_behavior()
                else this.put(this.data)
            })
        })
    }
    __setup_webserver(advice_callback) {
        this.webserver.get('/', (_, res) => { res.json(this.data) })
        this.webserver.post('/', (req, _, next) => {
            req.body = ''
            req.setEncoding('utf8')
            req.on('data', function (chunk) { req.body += chunk })
            req.on('end', function () {
                req.body = JSON.parse(req.body)
                next()
            })
        }, (req, res) => { res.json(advice_callback(req.body)) })
    }
    put(data) {
        this.data = data
        this.server.emit('put', data)
    }
}

// -------------------------------------------------------------------- REMOTE OBJECT

const ioclient = require("socket.io-client")

class RemoteObject {
    constructor(name, callback = () => { }) {
        this.name = name
        this.client = null
        this.data = null
        let int = setInterval(() => {
            let remote = local_map[name]
            if (!remote) {
                request_map()
            } else {
                clearInterval(int)
                this.client = ioclient.connect(`http://${remote.address}:${remote.port}`)
                this.client.on('put', (data) => { this.data = data; callback(data) })
                this.poke()
            }
        }, 100)
    }
    poke() {
        this.client.emit('poke')
    }
    advice(data) {
        this.client.emit('advice', data)
    }
}

// -------------------------------------------------------------------- EXPORTS

module.exports = { LocalObject, RemoteObject, local_map }