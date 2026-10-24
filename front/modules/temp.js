import { get_file, get_variable, set_file, get_variables, set_variable } from "../api.js"
import { br, button, create_elm, div, h1, hr, input, jsoncopy, listen_to, svg, svg_elm } from "../vanille/components.js"
import { debounce_force_maker, debounce_maker } from "../vanille/fetch_utils.js"

export async function render() {


    const comp = div()

    const data = {
        temp: 0,
        need_temp: false,
        min_temp: 0,
    }

    const temp_comp = div().set_style({ fontSize: "20px" }).add("--°C")
    const time_comp = div().set_style({ fontSize: "10px" }).add("---")
    const chauf_comp = div().set_style({ borderRadius: "1000px", width: "20px", height: "20px" })
    const min_temp_field = input(data.min_temp, "number", (mt) => set_variable("min_temp", parseFloat(mt)), true, true)
    comp.add(
        temp_comp,
        time_comp,
        chauf_comp,
        "Min temp:",
        min_temp_field, "°C"
    )

    setInterval(async () => {

        const temperature = await get_variable("temperature")
        const need_chauff = await get_variable("need_chauf")
        const temp_time = await get_variable("temp_time")
        const min_temp = await get_variable("min_temp")

        temp_comp.clear().add(temperature)
        time_comp.clear().add(temp_time)
        chauf_comp.set_style({ background: need_chauff ? "#ee7f00" : "#d3d3d3" })
        min_temp_field.value = min_temp

    }, 1000)

    return comp

}