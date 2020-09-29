const { LocalObject, RemoteObject } = require('./object_system')
const fs = require('fs')

// ----------- DATA

let is_learning = false
let points = []

let necks = null
let plugs = null

// ----------- METHODS

function point_dist(p1, p2) {
    return Math.sqrt(Object.keys(p1)
        .map(comp => Math.pow(p1[comp] - p2[comp], 2))
        .reduce((a, b) => a + b, 0))
}

function new_point() {
    if (!is_learning || !necks || !plugs) return
    if (necks.length != 1) return
    let neck = necks[0]
    points.push({ neck, plugs })
    push_data()
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

function handle_necks(necks) {
    if (is_learning || !points.length) return
    let near_plugs = necks.map(neck => get_nearest_plugs(neck))
    let final_plugs = {}
    for (let dev_name in plugs) {
        let must_be_on = near_plugs.map(plugs => plugs[dev_name]).reduce((a, b) => a || b, false)
        final_plugs[dev_name] = must_be_on
    }
    plugs_obj.advice({ devices: final_plugs })
    push_data()
}

function push_data() {
    state_learner.put({ is_learning, points })
}

// ----------- LOCAL

let state_learner = new LocalObject('state_learner', 9876, (instruction) => {
    ({
        'learn': () => is_learning = true,
        'act': () => is_learning = false,
        'point': new_point
    })[instruction]()
    push_data()
})
push_data()

// ----------- REMOTES

new RemoteObject('kinect', function (in_necks) {
    necks = in_necks
    handle_necks(necks)
})

let plugs_obj = new RemoteObject('plugs', function (in_plugs) { plugs = in_plugs })

// ----------- MAIN

console.log('state object running')