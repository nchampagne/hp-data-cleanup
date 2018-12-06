const CsvParse  = require("csv-parse");
const Mongo     = require("../mongo/mongo.js");
const FS        = require("fs");
const Path      = require('path');
const Util      = require("../utils/utils.js");

// CREATE INDEX: db.medications.createIndex({"source.name": 1, "code": 1})

function execute(dbUrl) {
    Util.createLogDir("medications-cleanup");
    let stream = FS.createWriteStream("logs/medications-cleanup/medications-cleanup.log", {flags:'a'});

    let file = Path.resolve(__dirname, '../../data/medications-cleanup.csv');
    let csvOptions = {
        delimiter: ",",
        columns: true
    };
    let opMap = new Map();

    function onUpdate(doc) { stream.write(`UPDATED: ${doc._id}\n`) }
    function onError(err) { stream.write(`ERROR: ${err}\n`); }

    Mongo.initMongo(dbUrl, (mongo) => {
        let db = mongo.db("health-profile");
        let collection = db.collection("medications");
        FS.createReadStream(file)
        .pipe(CsvParse(csvOptions))
        .on("data", (row) => {
            opMap.set(row["RxNorm_Name current"], row);
        })
        .on("end", () => {
            let list = new Array();
            opMap.forEach((v, k, m) => { list.push(v); });
            process(list.shift(), list, collection, onUpdate, onError, () => mongo.close());
        });
    });
}

function process(x, xs, collection, onUpdate, onError, onEnd) {
    console.log(`${x["RxNorm_Name current"]}`);
    let options = {
        upsert: false
    };
    let findQuery = {
        "source.name": "RealAge",
        "code": x["RxCUI current"]
    };
    let codes = [
        {
            "codeClass": `TTY:${x["TTY new"]}`,
            "code": x["RxCUI new"],
            "codeSystem": "2.16.840.1.113883.6.88",
            "codeSystemName": "rxNorm"
        }
    ]

    function updateDoc(doc) {
        return {
            "$set": {
                "name": x["RxNorm_Name new"],
                "codeClass": `TTY:${x["TTY new"]}`,
                "code": x["RxCUI new"],
                "codeSystem": "2.16.840.1.113883.6.88",
                "codeSystemName": "rxNorm",
                "codes": codes,
                "secureDistinctKey": `${doc.secureId}-${x["RxCUI new"]}-${doc.source.type}`
            }
        }
    }

    collection.find(findQuery).forEach((doc) => {
        if(doc) collection.updateOne({ "_id": doc._id }, updateDoc(doc), options, (err, result) => {
            if(err) onError(err);
            else onUpdate(doc);
        });
    }, (err) => {
        if(err) onError(err);
        let xs0 = xs.shift();
        if(xs0) process(xs0, xs, collection, onUpdate, onError, onEnd);
        else onEnd();
    });
}

module.exports.execute = execute