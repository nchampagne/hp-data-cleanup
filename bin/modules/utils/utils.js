const Http  = require('http');

module.exports.prettifyText = function (text, cb) {
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
