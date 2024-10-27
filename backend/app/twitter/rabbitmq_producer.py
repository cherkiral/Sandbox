import pika
import json
from app.config import RABBITMQ_URL


def publish_to_queue(queue_name: str, message: dict):
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()

    # Declare the queue (idempotent)
    channel.queue_declare(queue=queue_name, durable=True)

    # Publish the message
    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2)  # Make message persistent
    )

    connection.close()


def add_tweet_to_queue(twitter_token, text):
    message = {
        'type': 'tweet',
        'twitter_token': twitter_token,
        'text': text
    }
    publish_to_queue('tweets', message)


def add_sandbox_confirm_to_queue(session_id, challenge_id):
    message = {
        'type': 'sandbox_confirm',
        'session_id': session_id,
        'challenge_id': challenge_id
    }
    publish_to_queue('sandbox_confirms', message)
