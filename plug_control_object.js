let { RemoteObject, LocalObject } = require('./object_system')
const fs = require('fs')

// ----------- DATA

let state_control_map = {}

let map_data_path = __dirname + '/state_map_data.json'
if (fs.existsSync(map_data_path)) {
    state_control_map = JSON.parse(fs.readFileSync(map_data_path))
    console.log('loaded map', Object.keys(state_control_map)
        .map(name => '"' + name + '"').join(', ')
    )
}

// ----------- METHODS

function save_map() {
    fs.writeFileSync(map_data_path, JSON.stringify(state_control_map))
}

// ----------- REMOTE OBJECT

let plugs = new RemoteObject('plugs')
let state = new RemoteObject('state', (states) => {
    let all_mapers = states.map(state => state_control_map[state]).filter(mapper => mapper)
    if (!all_mapers.length) return
    let devices = plugs.data
    let to_toggle = []
    for (let device_name in devices) {
        let must_be_on = all_mapers.map(mapper => mapper[device_name]).reduce((is_on, cur_on) => is_on || cur_on, false)
        if (devices[device_name] != must_be_on) to_toggle.push(device_name)
    }
    to_toggle.forEach(device_name => plugs.advice(device_name))
})

// ----------- LOCAL OBJECT

new LocalObject('plug_control', 8764, (action) => {
    return ({
        'record_state': () => {
            let current_state = state.data
            let current_plugs = plugs.data
            state_control_map[current_state] = current_plugs
            console.log('record', current_state)
            save_map()
        },
        'reset_all': () => {
            state_control_map = {}
            save_map()
        }
    })[action]()

})

console.log('plug_control is running')