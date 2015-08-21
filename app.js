var settings = require(process.env.settingsFile || './settings')
var util = require('util');
var fs = require('fs');

var _ = require('underscore');
var colors = require('colors');

var db = require("./db");

var BleutradeAPI = require('bleutrade-api');
var bleutrade = new BleutradeAPI(process.env.BUN_FUN_KEY, process.env.BUN_FUN_SECRET);

function CnC(msg, callback) {
  var self = this;
  
  var args = msg.msg.toLowerCase().match(/\S+/g);
  if(args && args.length >= 1 && args[0].replace('@', '')==settings.botname) { // you talken to me?
    console.log(msg);

    if(/([a-z0-9]{16})/i.test(args[1])) {
      var matches = msg.msg.match(/([A-Za-z0-9]{16})(.*)/);
      var id = matches[1];
      var punchline = matches[2];
    
      db.getJoke(id, function(err, joke) {
        console.log(joke);
        if(err || !joke) return callback(err);

        if(joke.punchline == null) {
          db.addPunchline(id, msg.nick, punchline, function(err, wasUpdated) {
            if(wasUpdated) {
              console.log("%s Punchline: %s", id, punchline)
              bleutrade.chatsend('en', util.format("@%s haha very funny!  Lets see if anyone else likes it: %s", msg.nick, id), callback);
            }
          })        
        } else {
          console.log('liking');
          db.like(id, msg.nick, function(err, payout) {
            if(payout) {
              console.log("%s liked %s's joke", msg.nick, joke.user);
              console.log("Q: %s".yellow, joke.setup);
              console.log("A: %s".bold, joke.punchline);

              bleutrade.transfer(settings.payout.currency, settings.payout.amt, joke.user, function(err, result) {
                bleutrade.transfer(settings.payout.currency, settings.payout.amtVoter, msg.nick, function(err, result) {
                  bleutrade.chatsend('en', util.format("%d %s sent to @%s for a great joke and %d %s sent to @%s for finding folly", settings.payout.amt, settings.payout.currency, joke.user, settings.payout.amtVoter, settings.payout.currency, msg.nick), callback);
                });
              });
            } else {
              return callback();
            }
          })
        }
      })
    } else if(args.length > 1) { // no joke ID but they said something to us, assume its a new joke
      db.create(msg.nick, args.slice(1).join(' '), function(err, joke) {
        if(err || !joke) return callback(err);
        console.log("%s Setup: %s", joke._id, joke.setup);
        bleutrade.chatsend('en', util.format("@%s, Tell me the punchline for joke %s", msg.nick, joke._id), callback);
      });
    } else {
      db.getRandomJoke(function(err, joke) {
        if(err || !joke) return callback(err);

        bleutrade.chatsend('en', joke.setup, function() {
          bleutrade.chatsend('en', joke.punchline, function() {
            bleutrade.transfer(settings.payout.currency, settings.payout.amtRoyalty, joke.user, function(err, result) {
              bleutrade.chatsend('en', util.format("%d %s sent to @%s as royalty for a that great joke", settings.payout.amtRoyalty, settings.payout.currency, joke.user), callback);
            });
          });
        });
      })
      
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

      CnC(msg, function () {});
    }
});
