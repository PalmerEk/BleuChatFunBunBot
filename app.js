var settings = require(process.env.settingsFile || './settings')
var util = require('util');
var fs = require('fs');

var _ = require('underscore');
var colors = require('colors');

var db = require("./db");

var BleutradeAPI = require('bleutrade-api');
var bleutrade = new BleutradeAPI(process.env.BUN_FUN_KEY, process.env.BUN_FUN_SECRET);

var nop = function () {};


function CnC(msg, callback) {
  var self = this;
  
  var args = msg.msg.toLowerCase().match(/\S+/g);
  if(args && args.length > 1 && args[0].replace('@', '')==settings.botname) { // you talken to me?
    console.log(msg);

    if(/([a-z0-9]{16})/i.test(args[1])) {
      var matches = msg.msg.match(/([A-Za-z0-9]{16})(.*)/);
      var id = matches[1];
      var punchline = matches[2];
    
      // maybe it's the punchline?  let the db deal with determining if it is
      db.addPunchline(id, msg.nick, punchline, function(err, wasUpdated) {
        if(wasUpdated) {
          console.log("%s Punchline: %s", id, punchline)
          bleutrade.chatsend('en', util.format("@%s haha very funny!  Let's see if anyone else likes it: %s", msg.nick, id), callback);
        } else { // not punchline, maybe a vote?
          db.like(id, msg.nick, function(err, payout) {
            if(payout) {
              console.log("%s liked %s", msg.nick, id);
               bleutrade.transfer(settings.payout.currency, settings.payout.amt, msg.nick, function(err, result) {
                  bleutrade.chatsend('en', util.format("%d %s sent to @%s for having a sense of humor", settings.payout.amt, settings.payout.currency, msg.nick), callback);
              });
            } else {
              return callback();
            }
          })
        }
      })    
    } else { // assume its a new joke entry
      db.create(msg.nick, args.slice(1).join(' '), function(err, joke) {
        if(err || !joke) return callback(err);
        console.log("%s Setup: %s", joke._id, joke.setup);
        bleutrade.chatsend('en', util.format("@%s, Tell me the punchline for joke %s", msg.nick, joke._id), callback);
      });
    }
  } else {
    return callback();  // not us
  }
}


bleutrade.subscribe();
bleutrade.on('msgType', function(data) {
  var msgType = data[1][0];

    if(msgType == 'public_chat_new_message') {
      var msg = {lang: data[1][1][0], 
        nick: data[1][1][1].toLowerCase(), 
        msg: data[1][1][2],
        nickCSSClass: data[1][1][3],  // always chat_nick? nope chat_nick_newbie = unregistered
        var2: data[1][1][4],       // always null?
        sent:  data[1][1][5]
      }

      CnC(msg, nop);
    }
});

/*
var msg = { lang: 'en',
  nick: 'palmerek',
  msg: '@funbunbot asdfadf',
  nickCSSClass: 'chat_nick',
  var2: null,
  sent: '2015-08-21 17:34:37' }

  CnC(msg, nop); 
  */