const { LocalObject, RemoteObject } = require('./object_system')
const fs = require('fs')
const make_uuid = require('uuid').v4

// ----------- DATA

let planning = {}
let schedule = {}

const planning_data_path = __dirname + '/scene_planning_data.json'

let enabled = false

// ----------- INIT

if (fs.existsSync(planning_data_path)) {
    planning = JSON.parse(fs.readFileSync(planning_data_path, 'utf8'))
    console.log('loaded', Object.keys(planning).length, 'planning steps')
}
else save_planning_data()

// ----------- PLANNING SYSTEM
let int = null

function launch() {
    state_learner.advice('disable')
    enabled = true

    let make_schedule = () => {
        let now = Date.now()
        Object.values(planning).forEach(plan => {
            let { uuid, hours, minutes, radius, proba, actions } = plan
            let scheduled = schedule[uuid]
            if (scheduled) {
                let { time, will_occur } = scheduled
                let activate = now > time
                if (!activate) return
                delete schedule[uuid]
                if (will_occur) {
                    actions.forEach(action_elm => {
                        let { plug, action } = action_elm
                        if (plug == 'reset') kinect.advice('reset')
                        else plugs.advice({ device_name: plug, state: action })
                    })
                }
            }
            let time = new Date()
            let min_offset = parseInt((Math.random() - 0.5) * radius)
            let will_occur = Math.random() <= proba
            time.setHours(hours, minutes, 0, 0)
            time.setMinutes(time.getMinutes() + min_offset)
            if (time.getTime() <= now) time.setHours(time.getHours() + 24)
            time = time.getTime()
            scheduled = { time, will_occur, actions }
            schedule[uuid] = scheduled
            push_data()
        })
    }

    int = setInterval(make_schedule, 1000)
    make_schedule()
}

function stop() {
    state_learner.advice('enable')
    enabled = false
    schedule = {}
    clearInterval(int)
    push_data()
}

// ----------- METHODS

function save_planning_data() {
    fs.writeFileSync(planning_data_path, JSON.stringify(planning), 'utf8')
}

function push_data() {
    scene_object.put({ enabled, planning, schedule })
}

// ----------- STATE OBJ

let scene_object = new LocalObject('scene', 5834, (advice) => {
    let { action } = advice
    let end = ({
        'new plan': () => {
            let plan = advice.plan
            plan.uuid = make_uuid()
            planning[plan.uuid] = plan
            save_planning_data()
        },
        'remove plan': () => {
            let uuid = advice.uuid
            delete planning[uuid]
            delete schedule[uuid]
            save_planning_data()
        },
        'enable': () => launch(),
        'disable': () => stop(),
        'reset': () => { planning = {}, save_planning_data() },
    })[action]()
    push_data()
})
push_data()

// ----------- KINECT

let plugs = new RemoteObject('plugs')
let state_learner = new RemoteObject('state_learner')
let kinect = new RemoteObject('kinect')


// ----------- MAIN

console.log('scene object running')