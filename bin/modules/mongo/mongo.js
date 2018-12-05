const Mongo	= require('mongodb').MongoClient;

const Options 	= {
    useNewUrlParser:	true,
	auto_reconnect: 	true,
	keepAlive: 		    1,
	connectTimeoutMS: 	10000000,
	socketTimeoutMS: 	10000000
}

function initMongo(dbUrl, action) {
    Mongo.connect(dbUrl, Options, (err, client) => {
    	if(err) { console.log("ERROR: " + err); return; }
        console.log("Connected successfully to source server " + dbUrl);
        action(client);
    });
}

module.exports.initMongo = initMongo;