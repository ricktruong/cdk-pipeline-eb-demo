// Import Express Node.js web application framework (which was installed as a project dependency earlier)
var express = require('express');
var app = express();    // Instantiate Express web server
var fs = require('fs');
var port = 8080;

// 3. Allow our Express Node.js application to serve static HTML content
// This code will serve the index.html file whenever a request for root of the app is made
app.get('/', function(req, res) {
    html = fs.readFileSync('index.html');
    res.writeHead(200);
    res.write(html);
    res.end();
});

// 2. Create a REST API endpoint named /test
// Test: When our web server receives HTTP REST API call to endpoint /test, send back the message below
app.get('/test', function(req, res) {
    res.send('the REST endpoint test run!');
});

// 1. Start up Express Web Server
app.listen(port, function() {
    console.log('Server running at http://127.0.0.1:%s', port);
});