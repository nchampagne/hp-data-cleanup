const Http  = require('http');
const FS 	= require('fs');

const colors = {
    green:  '\033[0;32m',
	red:	'\033[0;31m',
	nc:     '\033[0m'
};

function prettifyText(text, cb) {
	Http.get('http://artii.herokuapp.com/make?text=' + text, (resp) => {
		let data = '';
		resp.on('data', (chunk) => {
			data += chunk;
		});
		resp.on('end', () => {
			cb(data);
		});
			
	}).on("error", (err) => {
		console.log(colors.red + "HTTP ERROR: " + colors.nc + err.message);
		cb(text);
	});
}

function createLogDir(dirName) {
    if (!FS.existsSync("logs")) {
        FS.mkdirSync("logs");
    }
    if (!FS.existsSync(`logs/${dirName}`)) {
        FS.mkdirSync(`logs/${dirName}`);
    }
}

module.exports.colors = colors;
module.exports.createLogDir = createLogDir;
module.exports.prettifyText = prettifyText