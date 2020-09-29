var Kinect2 = require('kinect2')
let { LocalObject, RemoteObject } = require('./object_system')

var kinect = new Kinect2()
let kinect_online = new LocalObject('kinect', 8000)

function point_dist(p1, p2) {
    return Math.sqrt(Object.keys(p1)
        .map(comp => Math.pow(p1[comp] - p2[comp], 2))
        .reduce((a, b) => a + b, 0))
}

let state_necks = [{
    x: 0.14827169477939606,
    y: 3.9644811153411865,
    z: 0.7495285868644714
}]
const movement_size_range = 1.2

function handle_necks(in_necks) {
    state_necks.forEach((neck, index) => neck.index = index)
    in_necks.forEach((neck, index) => neck.index = index)

    for (let in_neck of in_necks) {
        let im_nearest_to = state_necks
            .filter(state_neck => {
                let dist = point_dist(in_neck, state_neck)
                state_neck.dist = dist
                return dist <= movement_size_range
            })
            .reduce((nn, cn) => !nn || nn.dist > cn.dist ? cn : nn, null)
        if (im_nearest_to) {
            state_necks[im_nearest_to.index] = in_neck
        } else {
            state_necks.push(in_neck)
        }
    }

    return state_necks
}

if (kinect.open()) {
    console.log('Kinect opened !')
    kinect.on('bodyFrame', function (bodyFrame) {
        let necks = bodyFrame.bodies
            .filter(body => body.tracked)
            .map(body => body.joints.filter(joint => joint.jointType == 2)[0])
            .map(neck => { return { x: neck.cameraX, y: neck.cameraZ, z: neck.cameraY } })
            .filter(neck => neck.x != 0)
        let send_necks = handle_necks(necks)
        kinect_online.put(send_necks)
    })
    kinect.openBodyReader()
}