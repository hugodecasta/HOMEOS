const { LocalObject, RemoteObject } = require('./object_system')
const fs = require('fs')

// ----------- DATA

var state_points = []

let point_data_path = __dirname + '/state_point_data.json'
if (fs.existsSync(point_data_path)) {
    state_points = JSON.parse(fs.readFileSync(point_data_path))
    console.log('loaded points', state_points
        .map(point => '"' + point.name + '"')
        .filter((name, index, self) => self.indexOf(name) == index).join(', ')
    )
}

// ----------- METHODS

function save_points() {
    fs.writeFileSync(point_data_path, JSON.stringify(state_points))
}

function add_point(name) {
    if (!neck) return
    if (name.includes('!')) {
        let del_name = name.replace('!', '')
        console.log('removing points', del_name)
        let names = state_points.map(point => point.name)
        while (names.indexOf(del_name) > -1) {
            let index = names.indexOf(del_name)
            names.splice(index, 1)
            state_points.splice(index, 1)
        }
    } else {
        console.log('adding point', '"' + name + '"')
        state_points.push({ name, pos: neck })
    }
    save_points()
}

function get_nearest(pos) {
    let point_dist = state_points.map(point => {
        let dist = 0
        for (let poscomp in point.pos) dist += Math.pow(point.pos[poscomp] - pos[poscomp], 2)
        dist = Math.sqrt(dist)
        point.dist = dist
        return point
    })
    return point_dist.reduce((nearest, cur) => !nearest || nearest.dist > cur.dist ? cur : nearest, null)
}

// ----------- STATE OBJ

let state_obj = new LocalObject('state', 9876, (name) => {
    add_point(name)
})

// ----------- KINECT

let neck = null
let old_state = null
new RemoteObject('kinect', function (necks) {
    neck = necks[0] ?? neck
    let nearest = get_nearest(neck)
    if (!nearest) return
    let state = nearest.name
    if (state != old_state) {
        state_obj.put(state)
        old_state = state
    }
})

// ----------- MAIN

console.log('state object running')