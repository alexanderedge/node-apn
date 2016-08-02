"use strict";
const EventEmitter = require("events");
const Promise = require("bluebird");

module.exports = function(dependencies) {
  const Client = dependencies.Client;

  function Connection (options) {
    if(false === (this instanceof Connection)) {
      return new Connection(options);
    }

    this.client = new Client(options);

    EventEmitter.call(this);
  }

  Connection.prototype = Object.create(EventEmitter.prototype);

  Connection.prototype.pushNotification = function pushNotification(notification, recipients) {
    const builtNotification = {
      headers: notification.headers(),
      body:    notification.compile(),
    };

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    return Promise.all( recipients.map(this.client.write.bind(this.client, builtNotification)) )
      .then( responses => {
      let sent = [];
      let failed = [];

      responses.forEach( response => {
        if (response.status) {
          failed.push(response);
        } else {
          sent.push(response);
        }
      });
      return {sent, failed};
    });
  };

  return Connection;
};

