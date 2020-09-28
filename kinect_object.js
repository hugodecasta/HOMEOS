var Kinect2 = require('kinect2')
let { LocalObject, RemoteObject } = require('./object_system')

var kinect = new Kinect2()
let kinect_online = new LocalObject('kinect')

if (kinect.open()) {
    console.log('Kinect opened !')
    kinect.on('bodyFrame', function (bodyFrame) {
        let necks = bodyFrame.bodies
            .filter(body => body.tracked)
            .map(body => body.joints.filter(joint => joint.jointType == 2)[0])
            .map(neck => { return { x: neck.cameraX, y: neck.cameraZ, z: neck.cameraY } })
            .filter(neck => neck.x != 0)
        kinect_online.put(necks)
    })
    kinect.openBodyReader()
}