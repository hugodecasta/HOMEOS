import { get_file, get_variable, set_file, set_variable } from "../api.js"
import { br, button, div, h1, hr, input, jsoncopy, listen_to, svg, svg_elm } from "../vanille/components.js"
import { debounce_force_maker, debounce_maker } from "../vanille/fetch_utils.js"

export async function render() {

    const disp_options = {
        width: 300,
        height: 300,
        offsetx: 0,
        offsety: 0,
        scale: 1
    }

    const loaded_options = await get_variable("user_pos_disp_options")
    if (loaded_options) {
        Object.assign(disp_options, loaded_options)
    }

    let is_drawing = false
    let current_draw_zone = null
    let selected_zone = null

    const comp = div()

    const options_view = div().add2(comp).add(
        "Width:",
        input(disp_options.width, "number", (n) => disp_options.width = parseFloat(n)).set_style({ display: "block" }),
        "Height:",
        input(disp_options.height, "number", (n) => disp_options.height = parseFloat(n)).set_style({ display: "block" }),
        "Offset X:",
        input(disp_options.offsetx, "number", (n) => disp_options.offsetx = parseFloat(n)).set_style({ display: "block" }),
        "Offset Y:",
        input(disp_options.offsety, "number", (n) => disp_options.offsety = parseFloat(n)).set_style({ display: "block" }),
        "Scale:",
        input(disp_options.scale, "number", (n) => disp_options.scale = parseFloat(n)).set_style({ display: "block" }),
        button("Draw", () => {
            is_drawing = !is_drawing
        }),
        button("New zone", () => {
            if (current_draw_zone != null) {
                console.log("Created zone:", jsoncopy(current_draw_zone))
                zones[current_draw_zone.name] = {
                    devices: [],
                    polygon: current_draw_zone.points,
                    options: { rise_time: 0, fall_time: 0 }
                }
                selected_zone = current_draw_zone.name
                current_draw_zone = null
            }
            else {
                const zone_name = prompt("Zone name:")
                if (!zone_name) return
                current_draw_zone = { name: zone_name, points: [] }
            }
        })
    )

    const viewer = div().add2(comp).set_style({
        border: '1px solid black',
        position: 'relative',
        overflow: 'hidden',
    })

    const zone_options_view = div().add2(comp)

    const dot = div().add2(viewer).absolute().set_style({
        width: '10px',
        height: '10px',
        borderRadius: '100px',
        backgroundColor: 'blue',
        transform: 'translate(-5px, -5px)'
    })

    const draw_disp = div().add2(viewer).absolute().set_style({
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    })

    const zones_disp = div().add2(viewer).absolute().set_style({
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    })

    const zones = {}
    const loaded_zones = await get_file("light_zones")
    if (loaded_zones) {
        Object.assign(zones, JSON.parse(loaded_zones))
    }

    const drawing = []
    const loaded_drawing = JSON.parse(await get_file("user_pos_drawing") || "[]")
    drawing.push(...loaded_drawing)

    const user_data = { x: 0, y: 0 }

    listen_to(() => [is_drawing, current_draw_zone], () => {
        const size = is_drawing || current_draw_zone ? '3px' : '1px'
        const color = current_draw_zone ? 'green' : (is_drawing ? 'red' : 'black')
        viewer.set_style({
            border: `${size} solid ${color}`
        })
    })

    const save_options = debounce_force_maker((options) => {
        set_variable("user_pos_disp_options", options)
    }, 1000)

    listen_to(() => disp_options, () => {
        viewer.set_style({
            width: disp_options.width + 'px',
            height: disp_options.height + 'px',
        })
        options_view.set_style({
            width: disp_options.width + 'px',
        })
        save_options(disp_options)
    }, true)

    listen_to(() => [user_data, disp_options], () => {
        const x = (user_data.x + disp_options.offsetx) * disp_options.scale
        const y = (user_data.y + disp_options.offsety) * disp_options.scale
        dot.set_style({
            left: x + 'px',
            top: y + 'px',
        })
        if (is_drawing) {
            drawing.push([user_data.x, user_data.y])
        }
    }, true)

    listen_to(() => [drawing, disp_options], () => {
        draw_disp.innerHTML = ""
        if (drawing.length > 1) {
            const path = drawing
                .map(p => `${(p[0] + disp_options.offsetx) * disp_options.scale},${(p[1] + disp_options.offsety) * disp_options.scale}`)
                .join(" ")
            const svg = `
            <svg width="${disp_options.width}" height="${disp_options.height}">
                <polyline points="${path}" style="fill:none;stroke:red;stroke-width:2" />
            </svg>`
            draw_disp.innerHTML = svg
        }
    }, true)

    viewer.set_click((e) => {
        if (current_draw_zone) {
            const { offsetX, offsetY } = e
            const x = offsetX / disp_options.scale - disp_options.offsetx
            const y = offsetY / disp_options.scale - disp_options.offsety
            current_draw_zone.points.push([x, y])
        }
        else {
            selected_zone = null
            for (const zone_name in zones) {
                const zone = zones[zone_name]
                const path = new Path2D()
                zone.polygon.forEach((p, i) => {
                    const px = (p[0] + disp_options.offsetx) * disp_options.scale
                    const py = (p[1] + disp_options.offsety) * disp_options.scale
                    if (i === 0) {
                        path.moveTo(px, py)
                    }
                    else {
                        path.lineTo(px, py)
                    }
                })
                path.closePath()
                const canvas = document.createElement("canvas")
                canvas.width = disp_options.width
                canvas.height = disp_options.height
                const ctx = canvas.getContext("2d")
                ctx.fillStyle = "rgba(0,0,0,0.5)"
                ctx.fill(path)
                if (ctx.isPointInPath(path, e.offsetX, e.offsetY)) {
                    selected_zone = zone_name
                    break
                }
            }
        }
    })

    listen_to(() => zones[selected_zone], () => {
        zone_options_view.clear()
        if (!selected_zone) return

        zone_options_view.add(
            h1(`Zone: ${selected_zone}`),
            button("Delete", () => {
                if (!confirm("Delete zone " + selected_zone + " ?")) return
                delete zones[selected_zone]
                selected_zone = null
            }),
            hr(),
            "Devices:",
            ...zones[selected_zone].devices.map((device, id) =>
                div().add(device, button("X", () => zones[selected_zone].devices.splice(id, 1)))
            ),
            button("+", () => {
                const device = prompt("Device name:")
                if (!device) return
                zones[selected_zone].devices.push(device)
            }),
            hr(),
            "Options:", br(),
            "Rise time:",
            input(zones[selected_zone].options.rise_time, "number", (n) => zones[selected_zone].options.rise_time = parseFloat(n)).set_style({ display: "block" }),
            "Fall time:",
            input(zones[selected_zone].options.fall_time, "number", (n) => zones[selected_zone].options.fall_time = parseFloat(n)).set_style({ display: "block" }),
        )
    })

    const save_zones = debounce_force_maker((zones) => {
        set_file("light_zones", JSON.stringify(zones))
    }, 1000)
    listen_to(() => zones, () => {
        save_zones(zones)
    }, true)

    listen_to(() => [current_draw_zone, zones, disp_options], () => {
        const disp_zones = { ...zones }
        if (current_draw_zone) {
            disp_zones[current_draw_zone.name] = {
                devices: [],
                polygon: current_draw_zone.points,
                options: { rise_time: 0, fall_time: 0 }
            }
        }

        const colors = ["green", "orange", "purple", "cyan", "magenta", "yellow", "lime"]
        let svg_content = svg(`0 0 ${disp_options.width} ${disp_options.height}`).set_style({
            width: disp_options.width + 'px',
            height: disp_options.height + 'px',
        })

        for (const zone_name in disp_zones) {
            const zone = disp_zones[zone_name]
            const index = Object.keys(disp_zones).indexOf(zone_name)
            const path = zone.polygon.map(p => `${(p[0] + disp_options.offsetx) * disp_options.scale},${(p[1] + disp_options.offsety) * disp_options.scale}`).join(" ")
            const svg = svg_elm("polygon", {
                points: path,
                style: `fill:${colors[index % colors.length]};stroke-width:0;opacity:0.5;`
            }).add2(svg_content)
        }
        zones_disp.clear().add(svg_content)
    }, true)


    const save_drawing = debounce_force_maker((drawing) => {
        set_file("user_pos_drawing", JSON.stringify(drawing))
    }, 2000)

    listen_to(() => drawing, () => save_drawing(drawing))

    setInterval(async () => {
        const user_pos = await get_variable("user_pos")
        user_data.x = user_pos.x
        user_data.y = user_pos.y
    }, 100)

    return comp

}