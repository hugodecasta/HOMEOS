let { LocalObject } = require('./object_system')
const KasaControl = require('kasa_control')

// ----------- MAP DATA

let devices = {}
let old_devices = {}

// ----------- KASA SYSTEM

const kasa = new KasaControl()
let kasa_map = {}
async function get_kasa_devices() {
    await kasa.login('hugo.castaneda.perso@gmail.com', 'dcahugocastanH14')
    const kasa_devices = (await Promise.all((await kasa.getDevices()).map(async dobj => {
        try {
            let info = await kasa.info(dobj.deviceId)
            kasa_map[dobj.alias] = dobj.deviceId
            return { id: dobj.deviceId, name: dobj.alias, state: info.relay_state == 1 }

        } catch (e) {
            console.log('kasa init error on', dobj.alias, e)
            return null
        }
    }))).filter(e => e)
    return kasa_devices
}
async function set_kasa_light(name, status) {
    try {
        return await kasa.power(kasa_map[name], status)
    } catch (e) {
        console.log('unable to act kasa light', name)
    }
}
async function update_kasa_lights() {
    return await Promise.all(Object.keys(devices)
        .map(async name => {
            return await set_kasa_light(name, devices[name])
        })
    )
}

// ----------- LOCAL OBJECT

let plugs = null
function config_has_changed() {
    for (let name in devices) {
        if (old_devices[name] != devices[name]) return true
    }
    return false
}
async function update_all() {
    if (!config_has_changed()) return
    old_devices = JSON.parse(JSON.stringify(devices))
    plugs.put(devices)
    await update_kasa_lights()
}

plugs = new LocalObject('plugs', 5985, async (instr) => {
    if ('devices' in instr) {
        devices = instr.devices
    } else if ('device_name' in instr) {
        devices[instr.device_name] = !devices[instr.device_name]
    } else if ('state' in instr) {
        devices[instr.device_name] = instr.state
    }
    update_all()
})

// ----------- MAIN

async function init() {
    console.log('init plugs...')
    let kasa_lights = await get_kasa_devices()
    kasa_lights.forEach(dev => devices[dev.name] = dev.state)
    plugs.put(devices)
    console.log('plugs loaded:', Object.keys(devices).join(', '))
    console.log('plugs object running')
}
init()