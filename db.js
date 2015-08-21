var Datastore = require('nedb');

module.exports =  {
	jokes: new Datastore({filename:"jokes.db",autoload:true}), 

    like: function(id, user, callback) {
        callback = callback || function () {};

        // Joke must exist, must have a punchline and user must not have already voted for it
        this.jokes.update({_id: id, $and: [{$not: {punchline: null}}, {$not: {likes: {$in: [user]}}}] }, {$addToSet: {likes: user}}, callback);
    },

    addPunchline: function(id, user, punchline, callback) {
        callback = callback || function () {};

        this.jokes.update({_id: id, user: user, punchline: null}, {$set: {punchline: punchline}}, callback);
    },

    create: function(user, setup, callback) {
        callback = callback || function () {};

        var joke = {
            user: user,
            setup: setup,
            punchline: null,
            likes: [user],
            ts: new Date()
        }

        this.jokes.insert(joke, function(err, newJoke) {
            if(err) console.error('Failed to record joke: ', joke);

            return callback(err, newJoke);
        })
    },

    getJoke: function(id, callback) {
        callback = callback || function () {};

        this.jokes.findOne({_id: id}, callback);
    },

    getRandomJoke: function(callback) {
        callback = callback || function () {};

        this.jokes.find({$not: {punchline: null}}, function(err, jokes) {
            var jokeNumber = Math.floor(Math.random()*jokes.length)
            return callback(null, jokes[jokeNumber]);
        });
    }
}
