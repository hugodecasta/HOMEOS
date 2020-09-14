let { LocalObject, RemoteObject } = require('./object_system')

// ----------- LOCAL OBJECT

let clock = new LocalObject('clock', 8000)
let time = 0
setInterval(() => {
    clock.put(time++)
}, 1000)

// ----------- REMOTE OBJECT

let r_clock = new RemoteObject('clock', function (time) {
    console.log('CURRENT TIME', time)
})