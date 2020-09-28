const { fork } = require('child_process')

let objects = process.argv.slice(2, 1000)

objects.forEach(name => {
    fork('./' + name)
});
