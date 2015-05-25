var
	log = require('winston'),
	koa = require('koa'),
	koaStatic = require('koa-static'),
	hbs = require('koa-hbs'),
	process = require('process');

// Application configuration.
var appPort = process.env.BIXI_VISUALIZER_PORT || 3012;

// Configure logging.
log.remove(log.transports.Console);
log.add(log.transports.Console, {timestamp: true});

// Configure koa.
var app = koa();

app.use(koaStatic('public'));
app.use(hbs.middleware({
  viewPath: __dirname + '/views'
}));

app.use(function *(next) {
	log.info(`Received request from ${this.ip} for ${this.path} ${this.querystring}`);
	yield next;
});

// For pass-through of IP address from apache.
app.proxy = true;

app.use(function *(){
	log.info(`Got a request from ${this.ip} for ${this.path}`);
	if (this.path === '/') {
		yield this.render(
			'visualizer',
			{
				title: 'Bixi Visualizer',
				apiUrl: 'http://api.bixitime.com/bike/updates'
			}
		);
	}
});

app.listen(appPort);
console.log('Starting listening on port ' + appPort);
