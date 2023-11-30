const lineByLine = require('n-readlines');
var express = require('express');
var fileUpload = require('express-fileupload');
const chokidar = require('chokidar');
const fsExtra = require('fs-extra')
const fs = require('fs')
var expressStaticGzip = require("express-static-gzip");
const NodePrefs = require('node-prefs');
const prefs = new NodePrefs({
    filePath: __dirname + "/",
    fileName: "myDataBase"
});
var app = express();
let flname = "";
let resdw = null;
let fields = prefs.get("fields");
app.use(fileUpload({}));
app.use(express.json());
app.set('trust proxy', true);
app.use(express.static(__dirname));
app.use("/", expressStaticGzip(__dirname + "/dist"));

app.get('/fields', function (req, res) {
    res.send(fields);
})

app.post('/fields', function (req, res) {
    fields.h = Number(req.body.h);
    fields.Rd = Number(req.body.Rd);
    fields.Rb = Number(req.body.Rb);
    prefs.set("fields", fields);
    console.log(req.body);
    res.end("ok");
})

app.get("/corr", function (req, res) {
    fsExtra.emptyDir(__dirname + '\\upload\\', err => {
        if (err) return console.error(err)
        console.log('upload is empty!')
        res.download(__dirname + '\\corrfiles\\' + flname + "c", (err) => {
            if (err) {
                console.log(err);
            }
            fsExtra.emptyDir(__dirname + '\\corrfiles\\', err => {
                if (err) return console.error(err)
                console.log('corrfiles is empty!')
            })
        })
    })
})

app.post('/upload', function (req, res) {
    req.files.photo.mv(__dirname + '/upload\\' + req.files.photo.name);
    flname = req.files.photo.name;
    resdw = res;
});
const log = console.log.bind(console);

fs.mkdir(__dirname + '\\upload\\', { recursive: true }, (err) => {
    if (err) {
        return console.error(err);
    }
    chokidar.watch(__dirname + '\\upload\\', { ignoreInitial: true })
        .on('all', (event, path) => {
            if ((event == 'add') || (event == 'change')) {
                log(`File ${path} has been added`);
                crz(flname);
            }
        })
});

fs.mkdir(__dirname + '\\corrfiles\\', { recursive: true }, (err) => {
    if (err) {
        return console.error(err);
    }
    chokidar.watch(__dirname + '\\corrfiles\\', { ignoreInitial: true })
        .on('all', (event, path) => {
            if ((event == 'add') || (event == 'change')) {
                log(`File ${path} has been changed`);
                if (resdw != null) {
                    resdw.send(flname + "c");
                    resdw = null;
                }
            }
        })
});


function crz(fl_name) {
    const liner = new lineByLine(__dirname + '\\upload\\' + fl_name);
    let line;
    let Z;
    let writestream = fs.createWriteStream(__dirname + '\\corrfiles\\' + fl_name + "c")
    while (line = liner.next()) {
        let str = line.toString('ascii');
        const exp = /[Z][-\d\.,]*/gi;
        const result = str.match(exp);
        Z = str;
        if (result != null) {
            let res = result.map(elem => elem.replace(",", ".").slice(1));
            if (Number(res[0]) != undefined) Z = "Z" + Number((Math.sqrt(Math.pow(Number(res[0]) + fields.h / 2 + fields.Rd / 2, 2) - Math.pow(fields.Rb / 2, 2)) - fields.Rd / 2 - fields.h / 2).toFixed(3)).toString();
            Z = str.replace(exp, Z);
        }
        writestream.write(Z)
    }
    writestream.end();
}



app.listen(3000);