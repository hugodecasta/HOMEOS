var Kinect2 = require('kinect2')
const fs = require('fs')
let { LocalObject, RemoteObject } = require('./object_system')
const { format } = require('path')

// ----------- DATA

let recording = false
const recording_file_path = __dirname + '/kinect_record_data.log'

let state_necks = []
const detected_range_proximity = 1.2
const undetected_range_proximity = 3

const maximum_person_detection_count = 5

var kinect = null

// ----------- INIT

fs.writeFileSync(recording_file_path, '')

// ----------- LOCAL OBJECT

let kinect_online = new LocalObject('kinect', 8000, (advice) => {
    return ({
        'reset': () => {
            state_necks = []
        },
        'stop': () => {
            stop_kinect()
        },
        'start': () => {
            start_kinect()
        },
        'start_recording': () => {
            fs.writeFileSync(recording_file_path, '')
            recording = true
        },
        'stop_recording': () => recording = false,
        'clean_recording': () => fs.writeFileSync(recording_file_path, ''),
    })[advice]()
})

let recorder = new LocalObject('recorder', 8002, (advice) => { })

// ----------- METHODS

let comps = ['x', 'y', 'z']
let smooth_count = 20

function point_dist(p1, p2) {
    return Math.sqrt(comps
        .map(comp => Math.pow(p1[comp] - p2[comp], 2))
        .reduce((a, b) => a + b, 0))
}

function record_necks(necks) {
    let time = Date.now()
    let necks_str = JSON.stringify(necks)
    let log_str = time + '::' + necks_str + '\n'
    fs.appendFileSync(recording_file_path, log_str)
}

// TODO - better neck handles. Allow +1 only when TRUE necks are appearing !! fn:1 & tn:1 NEVER --> fn:2

function average_necks(necks) {
    return Object.values(necks).map((full_neck_data) => {
        let end_neck = full_neck_data.reduce((av, cur) => {
            if (!av) return JSON.parse(JSON.stringify(cur))
            for (prop in cur) av[prop] += cur[prop]
            return av
        }, null)
        for (let prop in end_neck) end_neck[prop] /= full_neck_data.length
        return end_neck
    })
}

let neck_adder = {}
function smooth_necks(necks) {
    if (necks.length != Object.keys(neck_adder).length) neck_adder = {}
    necks.forEach((neck) => {
        let index = neck.index
        if (!neck_adder[index]) neck_adder[index] = []
        neck_adder[index].push(JSON.parse(JSON.stringify(neck)))
        if (neck_adder[index].length >= smooth_count) neck_adder[index].shift()
    })
    let necks_to_remove = []
    for (let index in neck_adder) {
        if (!necks.map(n => n.index).includes(parseInt(index))) neck_adder[index].shift()
        if (!neck_adder[index].length) necks_to_remove.push(index)
    }
    necks_to_remove.forEach(index => delete neck_adder[index])
    let av = average_necks(neck_adder)
    return av
}

function handle_necks(in_necks) {
    if (state_necks.length > maximum_person_detection_count)
        state_necks = []
    state_necks.forEach((neck, index) => {
        neck.index = index
        neck.detected = 0
    })
    in_necks.forEach((neck, index) => {
        neck.index = index
        neck.detected = 100
    })

    if (in_necks.length > state_necks.length) {
        state_necks = in_necks
        return state_necks
    }

    for (let in_neck of in_necks) {
        let im_nearest_to = state_necks
            .filter(state_neck => {
                let dist = point_dist(in_neck, state_neck)
                state_neck.dist = dist
                return dist <= (state_neck.detected ? detected_range_proximity : undetected_range_proximity)
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

let sending_timeout = 500
let can_send = true
function send_necks(necks_to_send) {
    if (!can_send) return
    setTimeout(() => { can_send = true }, sending_timeout)
    can_send = false
    kinect_online.put(necks_to_send)
}

var int = null
var picture_timer = 1000 * 60 * 2
let last_time = Date.now()
function start_kinect() {
    kinect = new Kinect2()
    if (kinect.open()) {
        console.log('Kinect opened !')
        kinect.on('bodyFrame', function (bodyFrame) {
            let necks = bodyFrame.bodies
                .filter(body => body.tracked)
                .map(body => body.joints.filter(joint => joint.jointType == 2)[0])
                .map(neck => { return { x: neck.cameraX, y: neck.cameraZ, z: neck.cameraY } })
                .filter(neck => neck.x != 0)
            // let send_necks = smooth_necks(handle_necks(necks))
            let necks_to_send = handle_necks(necks)
            if (recording) record_necks(necks_to_send)
            send_necks(necks_to_send)

        })
        // kinect.on('infraredFrame', (newPixelData) => {
        //     console.log(newPixelData)
        // });
        kinect.openBodyReader()
        // kinect.openInfraredReader()
    }
}

function stop_kinect() {
    kinect.close()
    clearInterval(int)
}

// ----------- MAIN

start_kinect()