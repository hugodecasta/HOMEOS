import { get_file, get_variable, set_file, set_variable } from "../api.js"
import { br, button, div, h1, hr, input, jsoncopy, listen_to, svg, svg_elm } from "../vanille/components.js"
import { debounce_force_maker, debounce_maker } from "../vanille/fetch_utils.js"
import * as L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js"

export async function render() {

    const comp = div().set_style({
        width: '280px',
        height: '280px',
        border: '1px solid black',
        position: 'relative',
    })

    const gps_options = {
        radius: 10,
        home: null,
        all_devices: []
    }
    const loaded_gps_options = await get_variable("gps_options")
    if (loaded_gps_options) {
        gps_options.radius = loaded_gps_options.radius || gps_options.radius
        gps_options.home = loaded_gps_options.home || gps_options.home
        gps_options.all_devices = loaded_gps_options.all_devices || gps_options.all_devices
    }

    listen_to(() => gps_options, () => {
        set_variable("gps_options", gps_options)
    })


    const options = div().add2(comp).add(
        button("Set as home", () => gps_options.home = [gps.lat, gps.long]),
        br(),
        "Radius:",
        input(gps_options.radius, "number", (e) => gps_options.radius = parseFloat(e))
    ).set_style({
        position: 'absolute',
        top: '300px'
    })


    const devices_disp = div().add2(options)

    const status_disp = div().add2(options)

    listen_to(() => gps_options.all_devices, () => {
        devices_disp.clear().add(
            hr(),
            "Devices:",
            ...gps_options.all_devices.map((device, id) => div().add(
                device, button('X', () => gps_options.all_devices.splice(id, 1))
            )),
            button('+', () => {
                const new_device = prompt("Enter device name:")
                if (!new_device) return
                gps_options.all_devices.push(new_device)
            })
        )
    }, true)

    const map_view = div().add2(comp).set_style({
        width: '100%',
        height: '100%',
    })

    const map = L.map(map_view, {
        zoomControl: false,
        attributionControl: false
    }).setView([0, 0], 15)
    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19
        }
    ).addTo(map)

    const marker_icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })

    let current_marker = null
    let current_circle = null

    function set_circle(lat, lng, radius) {
        const pos = [lat, lng]

        if (current_circle === null) {
            current_circle = L.circle(pos, {
                radius: radius,
                weight: 2,
                fillOpacity: 0.15
            }).addTo(map)
        } else {
            current_circle.setLatLng(pos)
            current_circle.setRadius(radius)
        }

        return current_circle
    }

    const gps = { lat: 0, long: 0, time: 0 }

    listen_to(() => gps, () => {
        const pos = [gps.lat, gps.long]

        if (current_marker === null) {
            current_marker = L.marker(pos, {
                icon: marker_icon
            }).addTo(map)
        } else {
            current_marker.setLatLng(pos)
        }

        map.setView(pos, 17)
    })

    listen_to(() => gps_options, () => {
        if (gps_options.home) {
            set_circle(gps_options.home[0], gps_options.home[1], gps_options.radius)
        } else {
            if (current_circle) {
                map.removeLayer(current_circle)
                current_circle = null
            }
        }
        set_variable("gps_options", gps_options)
    }, true)

    setInterval(async () => {
        const gps_data = await get_variable("gps")
        if (!gps_data) {
            comp.clear().add("No GPS data received yet.")
            return
        }
        gps.lat = gps_data.lat
        gps.long = gps_data.long
        gps.time = gps_data.time
    }, 1000)

    setInterval(async () => {
        const status = await get_variable("gps_status")
        status_disp.clear().add(
            hr(),
            div().set_style({
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: status.is_home ? 'green' : 'red'
            }).inline().margin({ right: 10, top: 5, bottom: -5 }),
            status.is_home ? "user is Home !" : "user is Away ...", br(),
        )
    })

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            map.invalidateSize()
        })
    })

    return comp
}