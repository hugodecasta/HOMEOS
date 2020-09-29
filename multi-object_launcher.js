const { fork } = require('child_process')

if (!process.subs) process.subs = process.argv.slice(2, 1000)
let objects = process.subs

objects.forEach(name => {
    fork('./' + name)
});
