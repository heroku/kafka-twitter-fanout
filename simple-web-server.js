'use strict';

let http = require('http');
const port = process.env.PORT || 8080;

function handler(request, response){
  response.end('OK');
}

exports.startServer = function() {
  http.createServer(handler).listen(port, function(){
    console.log("Server listening on port %s", port);
  });
}
