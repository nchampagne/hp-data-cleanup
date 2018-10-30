const Mongo	    = require('mongodb').MongoClient;
const FS 	    = require('fs');
const Readline  = require('readline');
const Util      = require("../utils/utils.js");

const Options 	= {
    useNewUrlParser:	true,
	auto_reconnect: 	true,
	keepAlive: 		    1,
	connectTimeoutMS: 	10000000,
	socketTimeoutMS: 	10000000
}

let mongoClient	= null;

// Exported hook
module.exports.execute = function execute(srcMongoUri, destinationMongoUri) {
    createLogDir();
    mongo(srcMongoUri, (srcClient) => {
        let srcCollection = srcClient.db("health-profile").collection("demographics");
        mongo(destinationMongoUri, (destinationClient) => {
            let destinationCollection = destinationClient.db("health-profile").collection("demographics");
            readFile(__dirname + "/demographics-secureIds.txt", (secureId) => {
                if(!secureId) finish(srcClient, destinationClient);
                else console.log("Searching for secureId: " + secureId);
            });
        });
    });
}

function readFile(filename, action) {
    Readline.createInterface({
        input: FS.createReadStream(filename),
        crlfDelay: Infinity
    }).on("line", (line) => { action(line) });
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
        db.collection(k).find(Query).forEach(processDoc(k, db), handleCompletion(k));
    }
}

function finish(mongoSrcClient, mongoDestClient) {
    Util.prettifyText("ALL DONE!", (text) => {
		console.log(Util.colors.green + text + Util.colors.nc);
		mongoSrcClient.close();
        mongoDestClient.close();
        process.exit(0);
	});
}

