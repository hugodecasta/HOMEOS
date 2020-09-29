let { RemoteObject, local_map } = require('./object_system')

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/home_viewer.html')
    // res.sendFile(__dirname + '/ws_junk.html')
})

app.listen(port, () => {
    console.log('viewer working')
})