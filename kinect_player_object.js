const fs = require('fs')
let { LocalObject, RemoteObject } = require('./object_system')

// ----------- DATA

const recording_file_path = __dirname + '/kinect_record_data.log'
let recored_data = fs.readFileSync(recording_file_path, 'utf8')
    .split('\n').filter(line => line != '')
    .map(line => line.split('::'))
    .map(data => {
        return { time: parseInt(data[0]), necks: JSON.parse(data[1]) }
    })

// ----------- LOCAL OBJECT

let kinect_online = new LocalObject('kinect', 8000)

// ----------- METHODS

function play_data(data) {
    kinect_online.put(data.necks)
}

// ----------- MAIN

let now = Date.now()
let time_offset = now - recored_data[0].time

recored_data.forEach(data => {
    let play_time = (data.time + time_offset) - now
    setTimeout(() => play_data(data), play_time)
})