# kafka-twitter-fanout

This app is one component of a data processing pipeline example using [Apache Kafka on Heroku](https://www.heroku.com/kafka).  See the [Getting Started Guide](https://heroku.github.io/kafka-demo) for more details.

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) > 5.x, [Heroku CLI](https://devcenter.heroku.com/articles/heroku-command-line) installed, and an [Apache Kafka on Heroku](https://www.heroku.com/kafka) cluster running.

Additionally, you'll need to copy `.env.sample` to `.env` and provide values for all of the environment variables listed.

- `KAFKA_URL`: Comma-separated list of Kafka broker URLs
- `KAFKA_CLIENT_CERT`: Contents of the Kafka client certificate. This is set on a Heroku app when the Apache Kafka on Heroku add-on is attached.
- `KAFKA_CLIENT_CERT_KEY`: Contents of the Kafka client certificate key. This is set on a Heroku app when the Apache Kafka on Heroku add-on is attached.
- `TWITTER_TRACK_TERMS`: Comma-separated list of terms being tracked from the Twitter Streaming API.
- `KAFKA_TOPIC`: Kafka topic name from which to consume messages.


```sh
git clone git@github.com:heroku/kafka-twitter-fanout.git # or clone your own fork
cd kafka-twitter-fanout
npm install
heroku local
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```sh
heroku create
heroku addons:attach my-kafka-app::KAFKA
# where my-kafka-app is the original app the kafka cluster was attached to

heroku config:set TWITTER_TRACK_TERMS= # comma-separated list of terms being tracked
heroku config:set KAFKA_TOPIC= # Kafka topic from which to consume messages

git push heroku master
```

## Documentation

For more information about using Apache Kafka on Heroku, see these resources:

- [Full demo Getting Started Guide](https://heroku.github.io/kafka-demo)
- [Apache Kafka on Heroku on Dev Center](https://devcenter.heroku.com/articles/kafka-on-heroku)
