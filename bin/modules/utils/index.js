const https = require('https');
const sleep = require('thread-sleep');

let email 	= process.argv[2];
let pswrd 	= process.argv[3];
let env   	= process.argv[7] ? "." + process.argv[7] : "";
let weight 	= process.argv[6];
let heightFt 	= process.argv[4];
let heightIn 	= process.argv[5];
let ssoUrl 	= "auth" + env + ".sharecare.com";
let apiUrl 	= "micro" + env + ".sharecare.com";
let basicAuth	= "c2hhcmVjYXJlOmhzd2k=";

run();

/**
 *	1. Login
 *	2. Set values for height and weight
 *	3. Answer last page of assessment. RATM will eval scores - generating a BMI value
 *	4. Issue concurrent recommendation requests
 */
function run() {
	console.log("Testing with:\n");
	console.log("\tEmail: " + email + "\n\tHeight: " + heightFt + "'" + heightIn +
		"\"\n\tWeight: " + weight + "\n\tEnvironment: " + ((env) ? env : "production") + "\n");
	login((authResponse) => {
		setValues(authResponse, () => {
			answerLastPage(authResponse, () => {
				console.log("4. Sending recommendation requests");
				getRecommendations(authResponse, (data) => {});
				getRecommendations(authResponse, (data) => {});
			});
		});	
	});
}

function getRecommendations(auth, cb) {
	let options = {
		hostname: apiUrl,
		path: "/rat/user/" + auth.account_id + "/assessments/1004385/rec",
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"Authorization": "SSO " + auth.access_token 
		}
	}
	makeReques(options, null, cb);
}

function setValues(auth, cb) {
	console.log("2. Setting values on " + apiUrl);
	let responseData = "";
	let body = JSON.stringify([
		{"id": "619","value": weight},
		{"id": "10861", "value": heightFt},
		{"id": "10862", "value": heightIn}
	]);

	let options = {
		hostname: apiUrl,
		path: "/rat/user/" + auth.account_id + "/facts",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": body.length,
			"Authorization": "SSO " + auth.access_token 
		}
	}
	makeReques(options, body, cb);
}

function answerLastPage(auth, cb) {
	console.log("3. Submitting answers on " + apiUrl);
	let responseData = "";
	let body = JSON.stringify({"1515254": [{"20512": "F"}]});
	let options = {
		hostname: apiUrl,
		path: "/rat/user/" + auth.account_id + "/assessments/1004385/3/28",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": body.length,
			"Authorization": "SSO " + auth.access_token 
		}
	}
	makeReques(options, body, cb);
}

function login(cb) {
	console.log("1. Authenticating against " + ssoUrl);
	let responseData = "";
	let body = JSON.stringify({"username": email,"password": pswrd});
	let options = {
		hostname: ssoUrl,
		path: "/access?grant_type=password",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": body.length,
			"Authorization": "Basic " + basicAuth
		}
	}
	makeReques(options, body, cb);
}

function makeReques(options, body, cb) {
	let request = https.request(options, (resp) => {
		console.log("\tResponse status: " + resp.statusCode);
		let data = "";
		resp.on('data', (chunk) => {
			data += chunk;
		});
		resp.on('end', () => {
			// We sleep to allow downstream services to persist data
			// prior to us attempting to read.
			sleep(1000);
			let d = (data) ? JSON.parse(data) : null;
			cb(d);
		});

	}).on("error", (err) => {
		console.log("HTTP ERROR: " + err.message);
	});

	if(body) request.write(body);
	request.end();
}

