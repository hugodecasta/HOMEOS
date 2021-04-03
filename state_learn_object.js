const { LocalObject, RemoteObject } = require('./object_system')
const fs = require('fs')

// ----------- DATA

let is_learning = false
let enabled = true
let points = []

let necks = null
let plugs = null

const point_data_path = __dirname + '/state_point_data.json'

// ----------- INIT

if (fs.existsSync(point_data_path)) {
    points = JSON.parse(fs.readFileSync(point_data_path, 'utf8'))
    console.log('loaded', points.length, 'points')
}
else save_point_data()

// ----------- METHODS

function save_point_data() {
    fs.writeFileSync(point_data_path, JSON.stringify(points), 'utf8')
}

let comps = ['x', 'y', 'z', 'detected']
function point_dist(p1, p2) {
    return Math.sqrt(comps
        .map(comp => Math.pow(p1[comp] - p2[comp], 2))
        .reduce((a, b) => a + b, 0))
}

function new_point() {
    if (!is_learning || !necks || !plugs) return
    if (necks.length != 1) return
    let neck = necks[0]
    points.push({ neck, plugs })
    push_data()
    save_point_data()
}

function get_nearest_plugs(neck) {
    let nearest = points
        .map(point => {
            let dist = point_dist(point.neck, neck)
            let plugs = point.plugs
            return { dist, plugs }
        }).reduce((n, p) => !n || n.dist > p.dist ? p : n, null)
    return nearest.plugs
}

let last_plugs = null
function handle_necks(necks) {
    if (is_learning || !points.length) return
    let near_plugs = necks.map(neck => get_nearest_plugs(neck))
    let final_plugs = {}
    for (let dev_name in plugs) {
        let must_be_on = near_plugs.map(plugs => plugs[dev_name]).reduce((a, b) => a || b, false)
        final_plugs[dev_name] = must_be_on
    }
    if (last_plugs) {
        if (!Object.keys(last_plugs).some(e => last_plugs[e] != final_plugs[e])) {
            return
        }
    }
    last_plugs = JSON.parse(JSON.stringify(final_plugs))
    plugs_obj.advice({ devices: final_plugs })
    push_data()
}

function push_data() {
    state_learner.put({ is_learning, points, enabled })
}

// ----------- LOCAL

let state_learner = new LocalObject('state_learner', 9876, (instruction) => {
    ({
        'learn': () => is_learning = true,
        'act': () => is_learning = false,
        'enable': () => enabled = true,
        'disable': () => enabled = false,
        'reset': () => { points = [], save_point_data() },
        'point': new_point
    })[instruction]()
    push_data()
})
push_data()

// ----------- REMOTES

new RemoteObject('kinect', function (in_necks) {
    if (!in_necks || !enabled) return
    necks = in_necks
    handle_necks(necks)
})

let plugs_obj = new RemoteObject('plugs', function (in_plugs) { plugs = in_plugs })

// ----------- MAIN

console.log('state object running')