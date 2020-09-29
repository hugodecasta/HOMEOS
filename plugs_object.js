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

plugs = new LocalObject('plugs', 5985, (instr) => {
    if ('devices' in instr) {
        devices = instr.devices
        plugs.put(devices)
    } else if ('device_name' in instr) {
        toggle_light(instr.device_name)
    }
})
plugs.put(devices)

// ----------- MAIN

console.log('plugs object running')