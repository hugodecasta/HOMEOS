let { LocalObject, RemoteObject } = require('./object_system')

let port = parseInt(Math.random() * 7000) + 1000
let name = 'Kinect' + Math.random()

let kinect = new LocalObject(name, port)
setInterval(() => {
    kinect.put({ hello: name })
}, 100)

let rkinect = new RemoteObject(name, function (data) {
    console.log('YOLO', data)
})