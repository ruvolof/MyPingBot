var dns = require('dns');
var net = require('net');
var fs = require('fs');
var monitor = require('./Monitor.js');
var config = require('./config');
var ping = require('./node_modules/ping');
var admin = require('./Admin.js');

var adminmode = false;
var EDIT_TIMEOUT = 1000;
var NEWM_TIMEOUT = 1000;

exports.processMessage = function(msg) {
  //console.log('Processing message '+update_id+', message id '+msg.message.text_id+ ', from '+msg.from.username+' '+msg.from.id);
  var s;

  // Checking for special commands from administrator
  if (config.admin.indexOf(msg.from.id) != -1) {
    if (/^\/maintenance\s*$/.test(msg.message.text)) {
      config.maintenance = !config.maintenance;
      if (config.maintenance) {
        s = "Maintenance mode: ON";
      } else {
        s = "Maintenance mode: OFF";
      }
      msg.reply(s.toString('utf8'));
      return;
    } else if (/^\/adminmode\s*$/.test(msg.message.text)) {
      adminmode = !adminmode;
      if (adminmode) {
        s = "Admin mode: ON";
      } else {
        s = "Admin mode: OFF";
      }
      msg.reply(s.toString('utf8'));
      return;
    }
  }

  if (adminmode && config.admin.indexOf(msg.from.id) != -1) {
    admin.processAdminMessage(msg);
    return;
  }

  if (config.maintenance) {
    if (config.admin.indexOf(msg.from.id) == -1 &&
        config.testers.indexOf(msg.from.id) == -1 &&
        config.developers.indexOf(msg.from.id) == -1) {
      s = 'Currently under maintenance. ' +
          'Bot will reply only to developers and testers.';
      msg.reply(s.toString('utf8'));
      return;
    }
  }

  if (!servers_list.hasOwnProperty(msg.from.id)) {
    console.log("New user found: " + msg.from.username + " " + msg.from.id);
    servers_list[msg.from.id] = {
      username: msg.from.username,
      hosts: {},
      favorites: {},
      last_access: Date.now(),
      announcements: true
    }
  } else {
    if (msg.isEdit) {
      if ((Date.now() - servers_list[msg.from.id].last_access) < EDIT_TIMEOUT) {
        s = "Your message rate is limited to " +
            (EDIT_TIMEOUT / 1000) + " per second. Too fast, retry.";
        msg.reply(s.toString('utf8'));
        return;
      } else {
        servers_list[msg.from.id].last_access = Date.now();
      }
    } else {
      if ((Date.now() - servers_list[msg.from.id].last_access) < NEWM_TIMEOUT) {
        s = "Your message rate is limited to " +
        (NEWM_TIMEOUT / 1000) + " per second. Too fast, retry.";
        msg.reply(s.toString('utf8'));
        return;
      } else {
        servers_list[msg.from.id].last_access = Date.now();
      }
    }
  }

  if (/^\/help\s*$/.test(msg.message.text)) {
    help(msg);
  }
  else if (/^\/start\s*$/.test(msg.message.text)) {
    start(msg);
  }
  else if (/^\/pingservers\s*$/.test(msg.message.text)) {
    pingServers(msg);
  }
  else if (/^\/ping\s*/.test(msg.message.text)) {
    pingHost(msg);
  }
  else if (/^\/addfavorite\s*/.test(msg.message.text)) {
    addFavorite(msg);
  }
  else if (/^\/monitor\s*/.test(msg.message.text)) {
    monitorHost(msg);
  }
  else if (/^\/remove\s*/.test(msg.message.text)) {
    remove(msg);
  }
  else if (/^\/listservers\s*$/.test(msg.message.text)) {
    listServers(msg);
  }
  else if (/^\/host\s*/.test(msg.message.text)) {
    getHost(msg);
  }
  else if (/^\/checkport\s*/.test(msg.message.text)) {
    checkPort(msg);
  }
  else if (/^\/announcements\s*$/.test(msg.message.text)) {
    setAnnouncements(msg);
  }
  else if (/^\/resetstats\s*/.test(msg.message.text)) {
    resetStats(msg);
  }
  else if (/^\/stats\s*$/.test(msg.message.text)) {
    sendStats(msg);
  } else {
    s = "Type /help for a list of available commands.";
    msg.reply(s.toString('utf8'));
  }
};

function help(msg) {
  fs.readFile(__dirname + '/help_message.txt', function(err, data) {
    if (err) {
      console.log(err);
    } else {
      msg.reply(data.toString('utf8'));
    }
  });
}

function start(msg) {
  fs.readFile(__dirname + '/start_message.txt', function(err, data) {
    if (err) {
      console.log(err);
    } else {
      msg.reply(data.toString('utf8'));
    }
  });
}

function pingServers(msg) {
  var id = msg.from.id;
  var hosts = Object.keys(servers_list[id].hosts)
    .concat(Object.keys(servers_list[id].favorites));
  var host_total = hosts.length;
  var host_count = 0;
  var alive = [];
  var dead = [];
  var s;

  hosts.forEach(function(host) {
    ping.promise.probe(host)
      .then(function(res) {
        host_count++;
        if (res.alive) {
          //servers_list[msg.from.id].hosts[host].alive = true;
          alive.push(host + " (" + res.time + " ms)");
        } else {
          //servers_list[msg.from.id].hosts[host].alive = false;
          dead.push(host);
        }

        if (host_count == host_total) {
          if (alive.length == 0) {
            s = "Dead servers:\n" + dead.join("\n");
          } else if (dead.length == 0) {
            s = "Alive servers:\n" + alive.join("\n");
          } else {
            s = "Alive servers:\n" + alive.join("\n") +
              "\n\nDead servers:\n" + dead.join("\n");
          }
          msg.reply(s.toString('utf8'));
        }
      });
  })
}

function pingHost(msg) {
  var host;
  var s;
  var re_args = /^\/ping\s+([\.:\/a-z0-9]+)$/g;
  var m = re_args.exec(msg.message.text);

  if (m != null && m.length == 2) {
    host = m[1];
    ping.promise.probe(host)
      .then(function(res) {
        if (res.alive) {
          msg.reply(res.output.toString('utf8'));
        } else {
          s = "Host " + host + " is dead.";
          msg.reply(s.toString('utf8'));
        }
      });
  } else {
    s = "/ping needs a parameter.";
    msg.reply(s.toString('utf8'));
  }
}

function addFavorite(msg) {
  var re_args = /^\/addfavorite\s+([\.:\/a-z0-9]+)$/ig;
  var m = re_args.exec(msg.message.text);
  var host;
  var s;

  if (m != null && m.length == 2) {
    host = m[1];

    if (m[1] == "localhost" || m[1] == "127.0.0.1") {
      s = "Won't add localhost to favorites. Skipping.";
      msg.reply(s.toString('utf8'));
      return;
    }

    monitor.addToFavoriteServersList(host.toLowerCase(), msg);
  } else {
    s = "/addfavorite needs an host.";
    msg.reply(s.toString('utf8'));
  }
}

function monitorHost(msg) {
  var re_args = /^\/monitor\s+([\.:\/a-z0-9]+)$/ig;
  var m = re_args.exec(msg.message.text);
  var host;
  var s;

  if (m != null && m.length == 2) {
    host = m[1];

    if (m[1] == "localhost" || m[1] == "127.0.0.1") {
      s = "Won't monitor localhost. Skipping.";
      msg.reply(s.toString('utf8'));
      return;
    }

    monitor.addToServersList(host.toLowerCase(), msg);
  } else {
    s = "/monitor needs a parameter.";
    msg.reply(s.toString('utf8'));
  }
}

function remove(msg) {
  var re_args = /^\/remove\s+([\.:\/a-z0-9]+)$/ig;
  var m = re_args.exec(msg.message.text);
  var host;
  var s;

  if (m != null && m.length == 2) {
    host = m[1];
    monitor.removeFromServersList(host.toLowerCase(), msg);
  } else {
    s = "/remove needs a parameter.";
    msg.reply(s.toString('utf8'));
  }
}

function listServers(msg) {
  var id = msg.from.id;
  var hosts = Object.keys(servers_list[id].hosts);
  var favorites = Object.keys(servers_list[id].favorites);
  var s;
  if (hosts.length == 0 && favorites.length == 0) {
    s = "You didn't set up any host."
  } else if (hosts.length != 0 && favorites.length == 0) {
    s = "Monitored servers:\n" + hosts.join("\n");
  } else if (hosts.length == 0 && favorites.length != 0) {
    s = "Favorites:\n" + favorites.join("\n");
  } else {
    s = "Monitored servers:\n" + hosts.join("\n") +
        "\n\nFavorites:\n" + favorites.join("\n");
  }

  msg.reply(s.toString('utf8'));
}

function getHost(msg) {
  var re_args = /^\/host\s+([\.:\/a-z0-9]+)$/ig;
  var m = re_args.exec(msg.message.text);
  var host;
  var s;

  if (m != null && m.length == 2) {
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(m[1])) {
      host = m[1];
      dns.reverse(host, function(err, hostnames) {
        if (err) {
          s = "Unable to reverse resolve " + host + ".";
          console.log(s);
          msg.reply(s.toString('utf8'));
        } else {
          s = '';
          hostnames.forEach(function(hostname) {
            s += host + " resolved to " + hostname + "\n";
          });
          msg.reply(s.toString('utf8'));
        }
      })
    } else {
      host = m[1];
      var options = {
        all: true
      };
      dns.lookup(host, options, function(err, addresses) {
        if (err) {
          s = "Couldn't resolve hostname " + host + ". Skipping.";
          msg.reply(s.toString('utf8'));
        } else {
          s = '';
          addresses.forEach(function(address) {
            s += host + " has IPv" + address.family +
              " address " + address.address + "\n";
          });
          msg.reply(s.toString('utf8'));
        }
      });
    }
  } else {
    s = "/host needs a parameter.";
    msg.reply(s.toString('utf8'));
  }
}

function checkPort(msg) {
  var re_args = /^\/checkport\s+([\.:\/a-z0-9]+)\s+([0-9]+)$/ig;
  var m = re_args.exec(msg.message.text);
  var s;
  var c;

  if (m != null && m.length == 3) {
    if (m[2] < 1 || m[2] > 65535) {
      s = m[2] + " isn't a valid port number.";
      msg.reply(s.toString('utf8'));
      return;
    }

    if (m[1] == "localhost" || m[1] == "127.0.0.1") {
      s = "Can't scan localhost.";
      msg.reply(s.toString('utf8'));
      return;
    }

    c = new net.Socket();
    c.setTimeout(5000);
    c.connect({
      port: m[2],
      host: m[1]
    });

    c.on('connect', function() {
      s = "Port " + m[2] + " on " + m[1] + " is OPEN.";
      msg.reply(s.toString('utf8'));
      c.end();
    });

    c.on('error', function(err) {
      if (err.code == "ENOTFOUND") {
        s = "Unable to resolve " + err.host + ".";
      } else {
        s = "Port " + err.port + " on " + err.address + " is CLOSED.";
      }
      msg.reply(s.toString('utf8'));
      c.destroy();
    });

    c.on('timeout', function() {
      s = "A timeout occurred, this might be because the port is closed.";
      msg.reply(s.toString('utf8'));
    })
  } else {
    s = "/checkport needs two parameters: hostaname and port.";
    msg.reply(s.toString('utf8'));
  }
}

function setAnnouncements(msg) {
  var id = msg.from.id;
  var s;
  servers_list[id].announcements = !servers_list[id].announcements;
  if (servers_list[id].announcements) {
    s = "Announcements: ON";
  } else {
    s = "Announcements: OFF";
  }
  msg.reply(s.toString('utf8'));
}

function resetStats(msg) {
  var id = msg.from.id;
  var re_args = /^\/resetstats\s+([\.:\/a-z0-9]+)$/ig;
  var m = re_args.exec(msg.message.text);
  var s;
  var hosts;
  var arg;

  if (m != null && m.length == 2) {
    arg = m[1].toLowerCase();
    if (arg == "all") {
      hosts = Object.keys(servers_list[id].hosts);
      hosts.forEach(function(host) {
        var h = servers_list[id].hosts[host];
        h.last_stats_reset = Date.now();
        h.total_pings = 0;
        h.failed_pings = 0;
      });
      s = "All stats have been reset.";
    } else {
      if (servers_list[id].hosts.hasOwnProperty(arg)) {
        hosts = servers_list[id].hosts[arg];
        hosts.last_stats_reset = Date.now();
        hosts.total_pings = 0;
        hosts.failed_pings = 0;
        s = "Stats for " + arg + " have been reset."
      } else {
        s = "Host " + arg + " not found.";
      }
    }
  } else {
    s = "/resetstats needs a parameter. Type \"all\" for all hosts.";
  }



  msg.reply(s.toString('utf8'));
}

function sendStats(msg) {
  var id = msg.from.id;
  var s = '';
  var hosts = Object.keys(servers_list[id].hosts);
  hosts.forEach(function(host) {
    var h = servers_list[id].hosts[host];
    if (h.total_pings > 0) {
      var d = new Date(h.last_stats_reset);
      s += host + ' (since ' + (d.getMonth() + 1) +
        '/' + d.getDate() + '/' + d.getFullYear() + ')\n';
      s += '\tPing sent: ' + h.total_pings + '\n';
      s += '\tPing received: ' + (h.total_pings - h.failed_pings) + '\n';
      s += '\tAvailability: ' +
       (((h.total_pings - h.failed_pings) / h.total_pings) * 100).toFixed(2) +
       ' %\n\n';
    } else {
      s += host + ': No data available.\n\n';
    }
  });

  msg.reply(s.toString('utf8'));
}
