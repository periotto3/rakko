"""Lambda function for Image generation with Amazon Bedrock triggered by DynamoDB Streams"""

import argparse
import json
import logging
import base64
import os
import sys
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize AWS clients
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_BUCKET = os.environ.get("S3_BUCKET", "your-bucket-name")
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "your-table-name")

bedrock_client = boto3.client(service_name="bedrock-runtime", region_name=AWS_REGION)
s3_client = boto3.client(service_name="s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)


def generate_image(
    prompt: str,
    bedrock_client: boto3.client,
    model_id: str = "amazon.titan-image-generator-v2:0",
    width: int = 1024,
    height: int = 1024,
    cfg_scale: float = 8.0,
    seed: int = 0,
) -> bytes:
    """
    Generate an image using Amazon Bedrock Titan Image Generator.
    """
    logger.info(f"Generating image with prompt: {prompt}")

    accept = "application/json"
    content_type = "application/json"
    # Prepare the request body
    request_body = json.dumps(
        {
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {"text": prompt},
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "height": height,
                "width": width,
                "cfgScale": cfg_scale,
                "seed": seed,
            },
        }
    )

    try:
        response = bedrock_client.invoke_model(
            body=request_body, modelId=model_id, accept=accept, contentType=content_type
        )
        response_body = json.loads(response.get("body").read())

        base64_image = response_body.get("images")[0]
        base64_bytes = base64_image.encode("ascii")
        image_bytes = base64.b64decode(base64_bytes)

        logger.info("Image generated successfully")
        return image_bytes

    except ClientError as e:
        logger.error(f"Failed to generate image: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during image generation: {e}")
        raise


def upload_to_s3(
    image_data: bytes,
    s3_client: boto3.client,
    bucket_name: str,
    prefix: str = "generated-images",
) -> str:
    """
    Upload image data to S3 bucket.
    """
    # Generate unique filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # prefixディレクトリ(Id)配下に保存
    object_key = f"{prefix}/{timestamp}.png"

    logger.info(f"Uploading image to s3://{bucket_name}/{object_key}")

    try:
        # Upload to S3
        s3_client.put_object(
            Bucket=bucket_name, Key=object_key, Body=image_data, ContentType="image/png"
        )

        logger.info("Image uploaded successfully")
        return object_key

    except ClientError as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during S3 upload: {e}")
        raise


def get_record_from_dynamodb(primary_key: dict) -> dict | None:
    """
    Retrieve a record from DynamoDB using primary key.
    """
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)
        response = table.get_item(Key=primary_key)

        if "Item" in response:
            logger.info(f"Record retrieved successfully: {primary_key}")
            return response["Item"]
        else:
            logger.warning(f"No record found for key: {primary_key}")
            return None

    except ClientError as e:
        logger.error(f"Failed to retrieve record from DynamoDB: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error retrieving record: {e}")
        raise


def update_record_sthreeid(primary_key: dict, s3_url: str) -> None:
    """
    Update the sthreeid field in DynamoDB with the S3 URL.
    """
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)
        table.update_item(
            Key=primary_key,
            UpdateExpression="SET sthreeid = :url",
            ExpressionAttributeValues={":url": s3_url},
        )

        logger.info(f"Record updated successfully with S3 URL: {s3_url}")

    except ClientError as e:
        logger.error(f"Failed to update record in DynamoDB: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating record: {e}")
        raise


def process_stream_record(record: dict) -> None:
    """
    Process a single DynamoDB Stream record.
    """
    try:
        # Extract event name (INSERT, MODIFY, REMOVE)
        event_name = record["eventName"]
        logger.info(f"Processing {event_name} event")

        # Only process INSERT and MODIFY events
        if event_name not in ["INSERT", "MODIFY"]:
            logger.info(f"Skipping {event_name} event")
            return

        # Extract primary key from the stream record
        keys = record["dynamodb"]["Keys"]
        logger.info(f"Primary key from stream: {keys}")

        # Convert DynamoDB JSON format to standard Python dict
        from boto3.dynamodb.types import TypeDeserializer

        deserializer = TypeDeserializer()
        primary_key = {k: deserializer.deserialize(v) for k, v in keys.items()}

        # DynamoDBの主キー 'Id' を取得
        record_id = primary_key.get("Id")
        if not record_id:
            logger.warning("No 'Id' field found in primary key, skipping")
            return

        # Retrieve full record from DynamoDB
        db_record = get_record_from_dynamodb(primary_key)

        if not db_record:
            logger.warning("Record not found in DynamoDB, skipping")
            return

        # Extract prompt from the record
        prompt = db_record.get("prompt")
        if not prompt:
            logger.warning("No prompt field found in record, skipping")
            return

        logger.info(f"Extracted prompt: {prompt}")

        # Generate image using Bedrock
        image_data = generate_image(prompt=prompt, bedrock_client=bedrock_client)

        # Upload to S3 (S3のディレクトリ名として Id を渡す)
        object_key = upload_to_s3(
            image_data=image_data,
            s3_client=s3_client,
            bucket_name=S3_BUCKET,
            prefix=str(record_id),
        )

        # Construct S3 URL
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{object_key}"

        # Update the record with S3 URL in sthreeid field
        update_record_sthreeid(primary_key, s3_url)

        logger.info(f"Successfully processed record. Image URL: {s3_url}")

    except Exception as e:
        logger.error(f"Error processing stream record: {e}")
        raise


def lambda_handler(event: dict, context) -> dict:
    """
    Lambda handler function triggered by DynamoDB Streams.
    """
    logger.info(f"Received event with {len(event['Records'])} records")

    successful = 0
    failed = 0

    for record in event["Records"]:
        try:
            process_stream_record(record)
            successful += 1
        except Exception as e:
            logger.error(f"Failed to process record: {e}")
            failed += 1

    logger.info(f"Processing complete. Successful: {successful}, Failed: {failed}")

    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "message": "Processing complete",
                "successful": successful,
                "failed": failed,
            }
        ),
    }


def create_stream_event_from_pk(primary_key: dict, event_name: str = "INSERT") -> dict:
    """
    Create a DynamoDB Stream event structure from a primary key.
    """
    from boto3.dynamodb.types import TypeSerializer

    serializer = TypeSerializer()

    # Convert primary key to DynamoDB JSON format
    keys_dynamodb = {k: serializer.serialize(v) for k, v in primary_key.items()}

    return {
        "Records": [
            {
                "eventName": event_name,
                "dynamodb": {"Keys": keys_dynamodb},
            }
        ]
    }


def test_direct_generation(prompt: str, width: int = 1024, height: int = 1024) -> None:
    """
    Test image generation directly with a prompt (without DynamoDB).
    """
    logger.info("Running direct generation test")

    # Generate image
    image_data = generate_image(
        prompt=prompt, bedrock_client=bedrock_client, width=width, height=height
    )

    # Upload to S3 (Direct mode defaults to 'direct-test' directory to avoid clutter)
    object_key = upload_to_s3(
        image_data=image_data,
        s3_client=s3_client,
        bucket_name=S3_BUCKET,
        prefix="direct-test",
    )

    # Construct S3 URL
    s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{object_key}"

    logger.info(f"Image generated and uploaded successfully: {s3_url}")
    print(f"\nSuccess! Image URL: {s3_url}")


def parse_arguments():
    """Parse command line arguments for local testing."""
    parser = argparse.ArgumentParser(
        description="Generate images using Amazon Bedrock Titan Image Generator"
    )

    parser.add_argument(
        "--mode",
        choices=["stream", "direct", "event-file"],
        default="stream",
        help="Execution mode: stream (simulate DynamoDB Stream with PK), direct (generate from prompt), event-file (load event from JSON file)",
    )

    parser.add_argument(
        "--prompt",
        type=str,
        help="Text prompt for image generation (used with --mode direct)",
    )

    parser.add_argument(
        "--pk",
        type=str,
        help='Primary key in JSON format (e.g., \'{"Id": "user123"}\') for stream mode',
    )

    parser.add_argument(
        "--event-file",
        type=str,
        help="Path to JSON file containing DynamoDB Stream event (for event-file mode)",
    )

    parser.add_argument(
        "--event-name",
        choices=["INSERT", "MODIFY", "REMOVE"],
        default="INSERT",
        help="DynamoDB Stream event name (default: INSERT)",
    )

    parser.add_argument(
        "--region",
        type=str,
        default=os.environ.get("AWS_REGION", "us-east-1"),
        help="AWS region (default: us-east-1 or AWS_REGION env var)",
    )

    parser.add_argument(
        "--bucket",
        type=str,
        default=os.environ.get("S3_BUCKET"),
        help="S3 bucket name (default: S3_BUCKET env var)",
    )

    parser.add_argument(
        "--table",
        type=str,
        default=os.environ.get("DYNAMODB_TABLE"),
        help="DynamoDB table name (default: DYNAMODB_TABLE env var)",
    )

    parser.add_argument(
        "--width", type=int, default=1024, help="Image width in pixels (default: 1280)"
    )

    parser.add_argument(
        "--height",
        type=int,
        default=1024,
        help="Image height in pixels (default: 720)",
    )

    return parser.parse_args()


def main():
    """Main function for local testing with argparse"""
    args = parse_arguments()

    # Update global configuration from arguments
    global AWS_REGION, S3_BUCKET, DYNAMODB_TABLE, bedrock_client, s3_client, dynamodb

    AWS_REGION = args.region
    S3_BUCKET = args.bucket
    DYNAMODB_TABLE = args.table

    # Validate required parameters
    if not S3_BUCKET:
        logger.error("S3 bucket name is required (use --bucket or S3_BUCKET env var)")
        sys.exit(1)

    # Reinitialize clients with updated region
    bedrock_client = boto3.client(
        service_name="bedrock-runtime", region_name=AWS_REGION
    )
    s3_client = boto3.client(service_name="s3", region_name=AWS_REGION)
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

    logger.info(f"Configuration: Region={AWS_REGION}, Bucket={S3_BUCKET}")

    try:
        if args.mode == "direct":
            # Direct generation mode
            if not args.prompt:
                logger.error("--prompt is required for direct mode")
                sys.exit(1)

            test_direct_generation(args.prompt, width=args.width, height=args.height)

        elif args.mode == "stream":
            # Stream simulation mode
            if not args.pk:
                logger.error("--pk is required for stream mode")
                sys.exit(1)

            if not DYNAMODB_TABLE:
                logger.error(
                    "DynamoDB table name is required (use --table or DYNAMODB_TABLE env var)"
                )
                sys.exit(1)

            # Parse primary key from JSON string
            try:
                primary_key = json.loads(args.pk)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON for --pk: {args.pk}")
                sys.exit(1)

            # Create stream event
            event = create_stream_event_from_pk(primary_key, args.event_name)
            logger.info(f"Simulating DynamoDB Stream event with PK: {primary_key}")

            # Process event
            result = lambda_handler(event, None)
            print(f"\nResult: {json.dumps(result, indent=2)}")

        elif args.mode == "event-file":
            # Load event from file
            if not args.event_file:
                logger.error("--event-file is required for event-file mode")
                sys.exit(1)

            if not DYNAMODB_TABLE:
                logger.error(
                    "DynamoDB table name is required (use --table or DYNAMODB_TABLE env var)"
                )
                sys.exit(1)

            try:
                with open(args.event_file, "r", encoding="utf-8") as f:
                    event = json.load(f)
            except FileNotFoundError:
                logger.error(f"Event file not found: {args.event_file}")
                sys.exit(1)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in file: {args.event_file}")
                sys.exit(1)

            logger.info(f"Loaded event from file: {args.event_file}")

            # Process event
            result = lambda_handler(event, None)
            print(f"\nResult: {json.dumps(result, indent=2)}")

    except Exception as e:
        logger.error(f"Execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
