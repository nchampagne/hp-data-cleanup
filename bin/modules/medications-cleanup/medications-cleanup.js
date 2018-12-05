const CsvParse  = require("csv-parse");
const Mongo     = require("../mongo/mongo.js");
const FS        = require("fs");

// CREATE INDEX: db.medications.createIndex({"source.name": 1, "code": 1})

let file = "medications-cleanup.csv";
let csvOptions = {
    delimiter: ",",
    columns: true
};
let testDBUrl = "mongodb://localhost:27017";
execute(testDBUrl);

function execute(dbUrl) {
    let opMap = new Map();
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
            process(list.shift(), list, collection, () => mongo.close());
        });
    });
}

function process(x, xs, collection, onEnd) {
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
        // console.log(doc._id);
        if(doc) collection.updateOne({ "_id": doc._id }, updateDoc(doc), options, (err, result) => {
            if(err) console.error(err);
        });
    }, (err) => {
        if(err) console.error(err);
        let xs0 = xs.shift();
        if(xs0) process(xs0, xs, collection, onEnd);
        else onEnd();
    });
}

module.exports.execute = execute