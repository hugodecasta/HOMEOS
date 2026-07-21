import { get_file, get_variable, set_file, get_variables, set_variable } from "../api.js"
import { br, button, create_elm, div, h1, hr, input, jsoncopy, listen_to, svg, svg_elm } from "../vanille/components.js"
import { debounce_force_maker, debounce_maker } from "../vanille/fetch_utils.js"

export async function render() {


    const comp = div()

    let light_enabled = await get_variable("light_enabled")
    const enable_btn = button("Enable", () => {
        set_variable("light_enabled", !light_enabled)
    }).add2(comp)

    setInterval(async () => {
        light_enabled = await get_variable("light_enabled")
        enable_btn.clear().add(light_enabled ? "Disable" : "Enable")
    }, 1000)

    const zone_comp = div().add2(comp)

    setInterval(async () => {

        const zone_cache = await get_variable("light_zone_cache")
        const states = {}
        for (const [light_name, amount] of Object.entries(zone_cache || {})) {
            const state_name = `${light_name}_state`
            states[light_name] = await get_variable(state_name)
        }

        zone_comp.clear().add(
            ...Object.entries(zone_cache || {}).map(([light_name, amount]) =>
                div()
                    .add(
                        light_name, create_elm('progress').set_attributes({ max: 1, value: amount }), br()
                    )
                    .set_style({
                        opacity: states[light_name] ? 1 : 0.2,
                    })
            )
        )
    }, 1000)

    return comp

}