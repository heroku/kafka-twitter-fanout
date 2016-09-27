'use strict';

const fs = require('fs');

const _ = require('lodash');
var JSONbig = require('json-bigint');  // standard JSON library cannot handle size of twitter ID values

const Kafka = require('no-kafka');
const consumerTopic = process.env.KAFKA_TOPIC;
const configTopic = process.env.KAFKA_CONFIG_TOPIC;

/*
 * TODO: replace the env var by reading the comma-separated list of terms from the 'config' topic
 *   'config' topic does not yet have terms in it because I haven't figured out how to
 *   write the terms to the 'config' topic on startup of the the 'ingest' producer client
 */
const potentialKeywords = process.env.TWITTER_TRACK_TERMS.toLowerCase().split(',');
/*
let potentialKeywords = [];
*/

// Figure out which keywords are in the tweet
const getKeywordsFromTweet = function(str) {
    const keywords = [];
    for (let i = 0; i < potentialKeywords.length; i++) {
        if (str.toLowerCase().includes(potentialKeywords[i])) {
            keywords.push(potentialKeywords[i]);
        }
    }
    return keywords;
}

/*
 * Data handler for consumer
 *
 * Read each tweet and send it out to a topic identified by its keyword(s)
 * The rules for which properties to check for existence of keywords is defined
 * here https://dev.twitter.com/streaming/overview/request-parameters#track
 *
 * As of 2016-08-29:
 * "The text of the Tweet and some entity fields are considered for matches.
 * Specifically, the text attribute of the Tweet, expanded_url and display_url
 * for links and media, text for hashtags, and screen_name for user mentions
 * are checked for matches."
 */
let tweetCount = 0;
let tweetsNotFannedOutCount = 0;
const dataHandler = function (messageSet, topic, partition) {
    messageSet.forEach(function (m) {
        tweetCount++;

        const tweet = JSONbig.parse(m.message.value.toString('utf8')).payload;

        // Define where keywords can be found in tweet
        const text = tweet.text;
        const url_display_urls    = _.map(tweet.entities.urls, 'display_url').join(' ');
        const url_expanded_urls   = _.map(tweet.entities.urls, 'expanded_url').join(' ');
        const media_display_urls  = _.map(tweet.entities.media, 'display_url').join(' ');
        const media_expanded_urls = _.map(tweet.entities.media, 'expanded_url').join(' ');
        const hashtags            = _.map(tweet.entities.hashtags, 'text').join(' ');
        const screen_names        = _.map(tweet.entities.user_mentions, 'screen_name').join(' ');

        const potentialKeywordString = [url_display_urls, url_expanded_urls,
                                        media_display_urls, media_expanded_urls,
                                        text, hashtags, screen_names]
                                        .join(' ');

        // Get a list of keywords this tweet contains
        const tweetKeywords = getKeywordsFromTweet(potentialKeywordString);

        // Generate some error output when a tweet doesn't match any keywords.
        if (_.isEmpty(tweetKeywords)) {
            tweetsNotFannedOutCount++;
            // console.error('----> Could not find keywords for this tweet', JSONbig.stringify(tweet));
            // console.error('----> Potential keyword string:', potentialKeywordString);
            if (tweetsNotFannedOutCount % 100 == 0) {
                console.error('----> Tweets not fanned out:', tweetsNotFannedOutCount, 'out of', tweetCount);
            }

            producer.send({
                topic: 'unknown-keyword',
                partition: 0,
                message: {
                    value: JSONbig.stringify(tweet)
                }
            })
        }

        // For each keyword, send the tweet a topic of the same name
        // NOTE: the topic for each keyword *must* already exist.
        tweetKeywords.forEach(function(keyword) {
            // console.log('');
            // console.log('----> Sending tweet to topic', keyword);
            // console.log(tweet);
            return producer.send({
                topic: `${keyword}-keyword`,
                partition: 0,
                message: {
                    value: JSONbig.stringify(tweet)
                }
            });
        });
    });
};

// Check that required Kafka environment variables are defined
const cert = process.env.KAFKA_CLIENT_CERT;
const key  = process.env.KAFKA_CLIENT_CERT_KEY;
const url  = process.env.KAFKA_URL;
if (!cert) throw new Error('KAFKA_CLIENT_CERT environment variable must be defined.');
if (!key) throw new Error('KAFKA_CLIENT_CERT_KEY environment variable must be defined.');
if (!url) throw new Error('KAFKA_URL environment variable must be defined.');

// Write certs to disk because that's how no-kafka library needs them
fs.writeFileSync('./client.crt', process.env.KAFKA_CLIENT_CERT);
fs.writeFileSync('./client.key', process.env.KAFKA_CLIENT_CERT_KEY);

// Configure consumer client
const consumer = new Kafka.SimpleConsumer({
    idleTimeout: 100,
    clientId: 'twitter-fanout-consumer',
    connectionString: url.replace(/\+ssl/g,''),
    ssl: {
      certFile: './client.crt',
      keyFile: './client.key'
    }
});

// Configure producer client
const producer = new Kafka.Producer({
    clientId: 'tweet-fanout-producer',
    connectionString: url.replace(/\+ssl/g,''),
    ssl: {
      certFile: './client.crt',
      keyFile: './client.key'
    }
});

/*
 * Startup producer,
 * followed by consumer of 'config' topic,
 * followed by consumer of 'ingest' topic
 *
 * NOTE: see note about uncommenting commented code below
 */
return producer.init().then(function() {
    console.log('Producer connected.');
    return consumer.init().then(function () {
        console.log('Consumer connected.');
        // Uncomment this when ready to read potential keywords from 'config' topic instead of env var
        /*
        console.log('Getting keyword partition names from topic:', configTopic);
        return consumer.subscribe(configTopic, function(messageSet, topic, partition) {
            for (let i = 0; i < messageSet.length; i++) {
                potentialKeywords = messageSet[i].message.value.toString('utf8').split(',').toLowerCase();
            }
        }).then(function() {*/
            console.log('Consuming from topic:', consumerTopic);
            return consumer.subscribe(consumerTopic, dataHandler);/*
        });*/
    });
});
