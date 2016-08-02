"use strict";

const Promise = require("bluebird");
const extend = require("./util/extend");

module.exports = function (dependencies) {
  const config          = dependencies.config;
  const EndpointManager = dependencies.EndpointManager;

  function Client (options) {
    this.config = config(options);

    this.endpointManager = new EndpointManager(this.config);
    this.endpointManager.on("wakeup", () => {
      while (this.queue.length > 0) {
        const stream = this.endpointManager.getStream();
        if (!stream) {
          return;
        }
        const resolve = this.queue.shift();
        resolve(stream);
      }
    });

    this.queue = [];

    return (notification, device) => {
      return new Promise( resolve => {
        const stream = this.endpointManager.getStream();
        if (!stream) {
          this.queue.push(resolve);
        } else {
          resolve(stream);
        }
      }).then( stream => {
        return new Promise ( resolve => {
          stream.setEncoding("utf8");

          stream.headers(extend({
            ":scheme": "https",
            ":method": "POST",
            ":authority": this.config.address,
            ":path": "/3/device/" + device,
          }, notification.headers));

          let status, responseData = "";
          stream.on("headers", headers => {
            status = headers[":status"];
          });

          stream.on("data", data => {
            responseData = responseData + data;
          });

          stream.on("end", () => {
            if (status === "200") {
              resolve({ device });
            } else {
              const response = JSON.parse(responseData);
              resolve({ device, status, response });
            }
          });
          stream.write(notification.body);
          stream.end();
        });
      });
    };
  }

  return Client;
}
