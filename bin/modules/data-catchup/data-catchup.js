const Mongo	        = require('mongodb').MongoClient;
const FS 	        = require('fs');
const LineReader    = require('line-by-line')
const Util          = require("../utils/utils.js");

const Options = {
    useNewUrlParser:	true,
	auto_reconnect: 	true,
	keepAlive: 		    1,
	connectTimeoutMS: 	10000000,
	socketTimeoutMS: 	10000000
}

let mongoSrcClient	= null;
let mongoDestClient = null;
let readLine        = null;
let logStream       = null;

// Exported hook
module.exports.execute = function execute(srcMongoUri, destinationMongoUri) {
    createLogDir();
    mongo(srcMongoUri, (srcClient) => {
        mongoSrcClient = srcClient;
        let srcCollection = mongoSrcClient.db("health-profile").collection("demographics");
        mongo(destinationMongoUri, (destinationClient) => {
            mongoDestClient = destinationClient;
            let destinationCollection = mongoDestClient.db("health-profile").collection("demographics");
            logStream = FS.createWriteStream("logs/data-catchup/demographics.log", { flags: "a" });
            initReadLine(__dirname + "/demographics-secureIds.txt", (secureId) => {
                if(!secureId || secureId === "") finish("COMPLETE!", false);
                else processDoc(srcCollection, destinationCollection, secureId);
            });
        });
    });
}

function query(secureId) { return { "secureId": secureId }; }

function processDoc(srcColl, destColl, secureId) {
    console.log("Processing " + secureId);
    srcColl.findOne(query(secureId), (err, srcDoc) => {
        if(err) { console.log(errorText("SOURCE COLLECTION ERROR: ") + err); return; }
        else if(srcDoc) {
            destColl.findOne(query(secureId), (err, destDoc) => {
                if(err) { console.log(errorText("DESTINATION COLLECTION ERROR: ") + err); return; }
                else {
                    if(destDoc) {
                        logStream.write("Secure ID found in dest coll: " + secureId + "\n");
                    }
                    else {
                        destColl.insertOne(srcDoc, null, (err, result) => {
                            if(err) {
                                logStream.write("Error inserting: " + srcDoc._id + err + "\n");
                            }
                            else logStream.write("Inserting: " + srcDoc._id + "\n");
                        });
                    } 
                }
                readLine.resume();
            });
        }
       else { readLine.resume(); }
    });
}

function initReadLine(filename, action) {
    readLine = new LineReader(filename);
    readLine.on("error", (err) => { console.log(err); finish("Error", true); });
    readLine.on("line", (line) => { readLine.pause(); action(line); });
}

function createLogDir() {
    if (!FS.existsSync("logs")) {
        FS.mkdirSync("logs");
    }
    if (!FS.existsSync("logs/data-catchup")) {
        FS.mkdirSync("logs/data-catchup");
    }
}

function mongo(dbUrl, action) {
    Mongo.connect(dbUrl, Options, (err, client) => {
    	if(err) {
    		console.log(errorText("ERROR: ") + err);
    		finish("Error", true);
            return;
    	}
        console.log(okayText("Connected successfully to mongo host: ") + dbUrl);
        action(client);
    });
}

function queryMongo(mongo) {
    mongoClient = mongo;
    let db = mongo.db("health-profile")
    for (const k of serviceMap.keys()) {
        db.collection(k).find(Query).forEach(processDoc(k, db), handleCompletion(k));
    }
}

function finish(text, isError) {
    Util.prettifyText(text, (text) => {
        if (isError) console.log(errorText(text));
        else console.log(okayText(text));
        if (readLine) readLine.close();
        if (mongoSrcClient) mongoSrcClient.close();
        if (mongoDestClient) mongoDestClient.close();
        process.exit(0);
	});
}

function errorText(text) { return Util.colors.red + text + Util.colors.nc; }
function okayText(text) { return Util.colors.green + text + Util.colors.nc; }

