const { LocalObject, RemoteObject } = require('./object_system')
const fs = require('fs')

// ----------- DATA

let points = []

const point_data_path = __dirname + '/draw_point_data.json'

// ----------- INIT

if (fs.existsSync(point_data_path)) {
    points = JSON.parse(fs.readFileSync(point_data_path, 'utf8'))
    console.log('loaded', points.length, 'draw points')
}
else save_point_data()

function save_point_data() {
    fs.writeFileSync(point_data_path, JSON.stringify(points), 'utf8')
}

// ----------- METHODS

function new_point(point) {
    points.push(point)
    save_point_data()
}

function push_data() {
    draw.put(points)
}

// ----------- LOCAL

let draw = new LocalObject('draw', 1542, (instruction) => {
    if (instruction == 'reset') {
        points = []
        save_point_data()
    } else if ('x' in instruction) {
        new_point(instruction)
    }
    push_data()
})
push_data()

// ----------- MAIN

console.log('draw object running')