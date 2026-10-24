import { get_file, get_variable, set_file, get_variables, set_variable } from "../api.js"
import { br, button, div, h1, hr, input, jsoncopy, listen_to, svg, svg_elm } from "../vanille/components.js"
import { debounce_force_maker, debounce_maker } from "../vanille/fetch_utils.js"

export async function render() {

    const comp = div().add(
        button('Restart', async () => {
            set_variable('restart', true)
            comp.clear().add('Restarting...')
            setTimeout(() => {
                location.reload()
            }, 3000)
        })
    )


    return comp

}