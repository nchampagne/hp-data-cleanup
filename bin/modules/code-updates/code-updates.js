const Mongo	= require('mongodb').MongoClient;
const FS 	= require('fs');
const Util  = require("../utils/utils.js");

let mongoClient	= null;
let database	= null;
let options 	= {
    useNewUrlParser:	true,
	auto_reconnect: 	true,
	keepAlive: 		    1,
	connectTimeoutMS: 	10000000,
	socketTimeoutMS: 	10000000
}

let valueMap = {
    "procedures": {
        "codeSystem": "2.16.840.1.113883.6.96",
        "codeSystemName": "snomed-CT"
    },
    "immunizations": {
        "codeSystem": "2.16.840.1.113883.6.96",
        "codeSystemName": "snomed-CT"
    },
    "biometrics": {
        "codeSystem": "2.16.840.1.113883.6.1",
        "codeSystemName": "loinc"
    },
    "conditions": {
        "codeSystem": "2.16.840.1.113883.6.96",
        "codeSystemName": "snomed-CT"
    }
}

let query = { "$and": [
    {"source.name": "RealAge"},
    { "$or": [
        { "codeSystem":     { "$exists": false }},
        { "codeSystemName": { "$exists": false }},
        { "$or": [
            { "codes": { "$exists": false }},
            { "codes": { "$exists": true, "$eq": [] }}
        ]}
    ]}
]}

let serviceMap	= new Map([
	["conditions",	    false],
	["biometrics",      false],
	["immunizations",   false],
	["procedures",      false]]);

// Exported hook
module.exports.execute = function execute(mongoUri) {
    dbUrl = mongoUri;
    createLogDir();
    mongo(queryMongo);
}

function createLogDir() {
    if (!FS.existsSync("logs")) {
        FS.mkdirSync("logs");
    }
    if (!FS.existsSync("logs/code-cleanup")) {
        FS.mkdirSync("logs/code-cleanup");
    }
}

function queryMongo(mongo) {
    mongoClient = mongo;
    let db = mongo.db("health-profile")
    for (const k of serviceMap.keys()) {
        console.log(k)
        db.collection(k).find(query).forEach(processDoc(k, db), handleCompletion(k));
    }
}

function processDoc(collection, db) {
    let stream = FS.createWriteStream("logs/code-cleanup/" + collection + ".log", {flags:'a'});
    return (doc) => {
        if(valueMap[collection] && doc.code) {
            let values  = valueMap[collection];
            let codes   = [
                {
                    "code": doc.code,
                    "codeSystem": values.codeSystem,
                    "codeSystemName": values.codeSystemName
                }
            ]
            stream.write("UPDATING: " + doc._id + "\n");
            db.collection(collection).update({ "_id" : doc._id  }, { "$set": { "codeSystem": values.codeSystem, "codeSystemName": values.codeSystemName, "codes": codes }}, { upsert: false}, function(err, results) {
                if(err) console.log("ERROR writing to mongo: " + doc._id + " - " + err + "\n");
            });
        }
    };
}

function mongo(action) {
    Mongo.connect(dbUrl, options, (err, client) => {
    	if(err) {
    		console.log("ERROR: " + err);
    		return;
    	}
        console.log("Connected successfully to source server " + dbUrl);
        action(client);
    });
}

function handleCompletion(collection) {
	return (err) => {
		if(err != null) console.log(Util.colors.red + "ERROR: " + Util.colors.nc + err);
		else {
			Util.prettifyText(collection, (text) => {
				finish(text, collection);
			});
		}
	};
}

function finish(data, collection) {
	let splitter = "================================================================================";
	console.log(splitter + "\n" + data);	
	serviceMap.set(collection, true);

	var allComplete = true;
	for (var [key, value] of serviceMap) {
		if(!value) {
			allComplete = false;
		}
	}
	if(allComplete) {
		Util.prettifyText("ALL DONE!", (text) => {
			console.log(splitter + "\n" + Util.colors.green + text + Util.colors.nc);
			mongoClient.close();
            process.exit(0);
		});
	}
}
