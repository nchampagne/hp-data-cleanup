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
            console.log(`OP SIZE: ${list.length}`);
            process(list.shift(), list, collection, () => mongo.close());
            // mongo.close();
        });
    });
}

function process(x, xs, collection, onEnd) {
    console.log(`${x["RxNorm_Name current"]}`);
    let query = {
        "source.name": "RealAge",
        "code": x["RxCUI current"]
    }
    collection.find(query).forEach((doc) => {
        if(doc) console.log(doc._id);
    }, (err) => {
        if(err) console.error(err);
        let xs0 = xs.shift();
        if(xs0) process(xs0, xs, collection, onEnd);
        else onEnd();
    });
}

module.exports.execute = execute