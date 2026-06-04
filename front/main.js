import { div, h2 } from "./vanille/components.js"

const module_names = await (await fetch("/api/module_names")).json()

async function create_module_card(module_name) {

    const inner_comp = div().add("Loading ...")

    const card = div().set_style({
        border: "1px solid black",
        padding: "10px",
        margin: "10px",
    }).add(
        h2(module_name),
        inner_comp
    )

    card.add2b()

    const imported_module = await import(`./modules/${module_name}.js`)
    const render_comp = await imported_module.render()
    inner_comp.clear().add(render_comp)
}

for (const module_name of module_names) {
    create_module_card(module_name)
}