import { get_file, get_variable, set_file, get_variables } from "../api.js"
import { br, button, div, h1, hr, input, jsoncopy, listen_to, svg, svg_elm } from "../vanille/components.js"
import { debounce_force_maker, debounce_maker } from "../vanille/fetch_utils.js"

export async function render() {

    const comp = div().set_style({
        overflow: 'auto',
    })

    setInterval(async () => {
        const variables = await get_variables()
        comp.clear().add(

            ...Object.entries(variables).map(([key, value]) => div().add(
                key + ':', JSON.stringify(value)
            ))
        )
    }, 100)

    return comp

}