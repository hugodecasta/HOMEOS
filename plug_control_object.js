let { RemoteObject, LocalObject } = require('./object_system')

let state_control_map = {}

// ----------- REMOTE OBJECT

let plugs = new RemoteObject('plugs')
let state = new RemoteObject('state', (state) => {
    let state_mapper = state_control_map[state]
    if (!state_mapper) return
    let devices = plugs.data
    let to_toggle = []
    for (let device_name in devices) {
        if (devices[device_name] != state_mapper[device_name]) to_toggle.push(device_name)
    }
    to_toggle.forEach(device_name => plugs.advice(device_name))
})

// ----------- LOCAL OBJECT

new LocalObject('plug_control', 8764, () => {
    let current_state = state.data
    let current_plugs = plugs.data
    state_control_map[current_state] = current_plugs
})

console.log('plug_control is running')