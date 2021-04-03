const { LocalObject, RemoteObject } = require('./object_system')

// ----------- DATA

let objects_data = {}
let all_remotes = {}

// ----------- METHODS

function update_remote(name, data) {
    objects_data[name] = data
    state_obj.put(objects_data)
}

// ----------- STATE OBJ

let state_obj = new LocalObject('exposer', 1346,
    (advice) => {
        let { action } = advice
        let action_result = ({
            'poke': ({ name }) => all_remotes[name].poke(),
            'advice': ({ name, advice: advice_data }) => {
                all_remotes[name].advice(advice_data)
            },
            'register': ({ name }) => {
                all_remotes[name] = new RemoteObject(name, function (data) {
                    update_remote(name, data)
                })
            }
        }[action] ?? (() => null))(advice)
    },
    () => {
        objects_data = {}
        state_obj.put({})
        Object.values(all_remotes).forEach(obj => obj.poke())
    })

// ----------- MAIN

console.log('exposer object running')