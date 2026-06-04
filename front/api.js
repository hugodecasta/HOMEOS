export async function get_variables() {
    const res = await fetch(`/api/variables`)
    return res.json()
}

export async function get_variable(variable) {
    const res = await fetch(`/api/variable/${variable}`)
    return res.json()
}

export async function set_variable(variable, value) {
    const res = await fetch(`/api/variable/${variable}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
    })
    return res.json()
}

export async function get_file(file_name) {
    const res = await fetch(`/api/files/${file_name}`)
    if (res.status === 200) {
        return res.text()
    } else {
        return null
    }
}

export async function set_file(file_name, content) {
    const res = await fetch(`/api/files/${file_name}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: content
    })
    return res.json()
}