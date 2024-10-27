import pika
import json
from services import create_tweet, check_confirm_status
from app.config import RABBITMQ_URL


def process_message(ch, method, properties, body):
    message = json.loads(body)
    if message['type'] == 'tweet':
        # Process tweet posting
        try:
            create_tweet(message['twitter_token'], message['text'])
        except Exception as e:
            print(f"Error creating tweet: {str(e)}")
    elif message['type'] == 'sandbox_confirm':
        # Process sandbox confirmation status check
        try:
            check_confirm_status(message['session_id'], message['challenge_id'])
        except Exception as e:
            print(f"Error checking sandbox confirmation: {str(e)}")

    # Acknowledge message after processing
    ch.basic_ack(delivery_tag=method.delivery_tag)


def start_worker(queue_name):
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()

    # Declare the queue (idempotent)
    channel.queue_declare(queue=queue_name, durable=True)

    # Set up a consumer
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=queue_name, on_message_callback=process_message)

    print(f" [*] Waiting for messages in {queue_name}. To exit press CTRL+C")
    channel.start_consuming()
