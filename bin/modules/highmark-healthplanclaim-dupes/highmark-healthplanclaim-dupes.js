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

let highmarkQuery = { "source.name": "HIGHMARK" };
function hpcQuery(doc) { 
    return { "$and": [
        { "source.name": "Health Plan Claim" },
        { "name": doc.name },
        { "observationDate": doc.observationDate }
    ]}
}

let serviceMap	= new Map([
	["conditions",  false],
	["biometrics",  false],
	["labResults",  false],
	["medications", false]]);

// Exported hook
module.exports.execute = function execute(mongoUri) {
    dbUrl = mongoUri;
    mongo(queryMongo);
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

function queryMongo(mongo) {
    mongoClient = mongo;
    let db = mongo.db("health-profile")
    for (const k of serviceMap.keys()) {
        console.log(k)
        db.collection(k).find(highmarkQuery).forEach(processDoc(k, db), handleCompletion(k));
    }
}

function processDoc(collection, db) {
    let stream = FS.createWriteStream("logs/" + collection + ".log", {flags:'a'});
    return (doc) => {
        db.collection(collection).findOne(hpcQuery(doc), (err, hpcDoc) => {
            if(err) console.log("QUERY ERROR: " + err);
            else {
                if(hpcDoc) {
                    stream.write(doc._id + "\n");
                } 
            }
        });
    };
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
