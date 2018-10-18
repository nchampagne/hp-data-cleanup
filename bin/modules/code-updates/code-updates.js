const Mongo	= require('mongodb').MongoClient;
const FS 	= require('fs');
const Util  = require("../utils/utils.js");

let mongoClient	= null;
let database	= null;
let options 	= {
    useNewUrlParser:	true,
	auto_reconnect: 	true,
	keepAlive: 		1,
	connectTimeoutMS: 	10000000,
	socketTimeoutMS: 	10000000
}

let colors = {
    green:  '\033[0;32m',
	red:	'\033[0;31m',
	nc:     '\033[0m'
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
    mongo(queryMongo);
}

function queryMongo(mongo) {
    mongoClient = mongo;
    let db = mongo.db("health-profile")
    db.collection("conditions").find(query).forEach(processDoc("conditions", db), handleCompletion("conditions"));
    db.collection("biometrics").find(query).forEach(processDoc("biometrics", db), handleCompletion("biometrics"));
    db.collection("procedures").find(query).forEach(processDoc("procedures", db), handleCompletion("procedures"));
    db.collection("immunizations").find(query).forEach(processDoc("immunizations", db), handleCompletion("immunizations"));
}

function processDoc(collection, db) {
    let stream = FS.createWriteStream("logs/" + collection + ".log", {flags:'a'});
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
		if(err != null) console.log(colors.red + "ERROR: " + colors.nc + err);
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
			console.log(splitter + "\n" + colors.green + text + colors.nc);
			mongoClient.close();
            process.exit(0);
		});
	}
}
