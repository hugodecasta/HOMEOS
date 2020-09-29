let { LocalObject } = require('./object_system')

// ----------- LOCAL OBJECT

let devices = {
    'lampe salon': false,
    'lampe lit': false,
    'lampe cuisine': false,
    'lampe entrée': false,
}

let plugs = null

function toggle_light(device_to_toggle) {
    devices[device_to_toggle] = !devices[device_to_toggle]
    plugs.put(devices)
}

plugs = new LocalObject('plugs', 5985, toggle_light)
plugs.put(devices)

// ----------- MAIN

console.log('plugs object running')