"""Lambda function for REST API to generate images with Amazon Bedrock.

This Lambda function handles REST API requests to generate images using
Amazon Bedrock Titan Image Generator and store them in S3.
"""

import argparse
import json
import logging
import base64
import os
import sys
from datetime import datetime
from typing import Dict, Any, Tuple
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

bedrock_client = boto3.client(service_name="bedrock-runtime", region_name=AWS_REGION)
s3_client = boto3.client(service_name="s3", region_name=AWS_REGION)


def generate_image(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    cfg_scale: float = 8.0,
    seed: int = 0,
    model_id: str = "amazon.titan-image-generator-v2:0",
) -> bytes:
    """Generate an image using Amazon Bedrock Titan Image Generator.

    Args:
        prompt: Text prompt for image generation.
        width: Image width in pixels.
        height: Image height in pixels.
        cfg_scale: How strictly the diffusion process adheres to the prompt.
        seed: Random seed for reproducibility.
        model_id: Bedrock model ID to use.

    Returns:
        bytes: Generated image data in PNG format.

    Raises:
        ClientError: If Bedrock API call fails.
        Exception: For other unexpected errors.
    """
    logger.info(f"Generating image with prompt: {prompt}")

    # Prepare the request body
    request_body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {"text": prompt},
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "width": width,
            "height": height,
            "cfgScale": cfg_scale,
            "seed": seed,
        },
    }

    try:
        # Invoke Bedrock model
        response = bedrock_client.invoke_model(
            modelId=model_id, body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response["body"].read())

        # Extract base64 encoded image
        base64_image = response_body["images"][0]

        # Decode to bytes
        image_data = base64.b64decode(base64_image)

        logger.info("Image generated successfully")
        return image_data

    except ClientError as e:
        logger.error(f"Failed to generate image: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during image generation: {e}")
        raise


def upload_to_s3(
    image_data: bytes, bucket_name: str, object_key: str
) -> Tuple[str, str]:
    """Upload image data to S3 bucket.

    Args:
        image_data: Image data in bytes.
        bucket_name: S3 bucket name.
        object_key: S3 object key (path).

    Returns:
        Tuple[str, str]: S3 object key and full S3 URL.

    Raises:
        ClientError: If S3 upload fails.
        Exception: For other unexpected errors.
    """
    logger.info(f"Uploading image to s3://{bucket_name}/{object_key}")

    try:
        # Upload to S3
        s3_client.put_object(
            Bucket=bucket_name, Key=object_key, Body=image_data, ContentType="image/png"
        )

        # Construct S3 URL
        s3_url = f"https://{bucket_name}.s3.{AWS_REGION}.amazonaws.com/{object_key}"

        logger.info(f"Image uploaded successfully: {s3_url}")
        return object_key, s3_url

    except ClientError as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during S3 upload: {e}")
        raise


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create API Gateway response format.

    Args:
        status_code: HTTP status code.
        body: Response body dictionary.

    Returns:
        Dict[str, Any]: API Gateway formatted response.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # Enable CORS
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body),
    }


def validate_request(body: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate the incoming request body.

    Args:
        body: Request body dictionary.

    Returns:
        Tuple[bool, str]: (is_valid, error_message).
    """
    # Check required fields
    if "Id" not in body:
        return False, "Missing required field: Id"

    if "prompt" not in body:
        return False, "Missing required field: prompt"

    # Validate Id
    id_value = body["Id"]
    if not isinstance(id_value, str) or not id_value.strip():
        return False, "Id must be a non-empty string"

    # Validate prompt
    prompt_value = body["prompt"]
    if not isinstance(prompt_value, str) or not prompt_value.strip():
        return False, "prompt must be a non-empty string"

    return True, ""


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler for REST API requests.

    Expected request body:
        {
            "Id": "unique-id-123",
            "prompt": "A serene landscape with mountains",
            "width": 1024,  // optional, default 1024
            "height": 1024,  // optional, default 1024
            "cfg_scale": 8.0,  // optional, default 8.0
            "seed": 0  // optional, default 0
        }

    Response format:
        Success (200):
        {
            "success": true,
            "message": "Image generated successfully",
            "data": {
                "Id": "unique-id-123",
                "s3_key": "generated_images/unique-id-123/Background/20260221_143022.png",
                "s3_url": "https://bucket.s3.region.amazonaws.com/...",
                "timestamp": "2026-02-21T14:30:22"
            }
        }

        Error (400/500):
        {
            "success": false,
            "message": "Error description"
        }

    Args:
        event: API Gateway event.
        context: Lambda context.

    Returns:
        Dict[str, Any]: API Gateway response.
    """
    logger.info("Received request")

    try:
        # Parse request body
        if "body" not in event:
            return create_response(
                400, {"success": False, "message": "Missing request body"}
            )

        # Handle string body (from API Gateway)
        body = event["body"]
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                return create_response(
                    400, {"success": False, "message": "Invalid JSON in request body"}
                )

        logger.info(f"Request body: {body}")

        # Validate request
        is_valid, error_message = validate_request(body)
        if not is_valid:
            return create_response(400, {"success": False, "message": error_message})

        # Extract parameters
        id_value = body["Id"]
        prompt = body["prompt"]
        width = body.get("width", 1024)
        height = body.get("height", 1024)
        cfg_scale = body.get("cfg_scale", 8.0)
        seed = body.get("seed", 0)

        # Generate image
        image_data = generate_image(
            prompt=prompt, width=width, height=height, cfg_scale=cfg_scale, seed=seed
        )

        # Create S3 key with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"generated_images/{id_value}/Background/{timestamp}.png"

        # Upload to S3
        object_key, s3_url = upload_to_s3(image_data, S3_BUCKET, s3_key)

        # Prepare success response
        response_data = {
            "success": True,
            "message": "Image generated successfully",
            "data": {
                "Id": id_value,
                "s3_key": object_key,
                "s3_url": s3_url,
                "timestamp": datetime.now().isoformat(),
            },
        }

        logger.info(f"Request completed successfully: {s3_url}")
        return create_response(200, response_data)

    except ClientError as e:
        logger.error(f"AWS service error: {e}")
        return create_response(
            500,
            {
                "success": False,
                "message": f"AWS service error: {str(e)}",
            },
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return create_response(
            500,
            {
                "success": False,
                "message": f"Internal server error: {str(e)}",
            },
        )


def parse_arguments():
    """Parse command line arguments for local testing.

    Returns:
        argparse.Namespace: Parsed arguments.
    """
    parser = argparse.ArgumentParser(
        description="Generate images using Amazon Bedrock REST API Lambda function"
    )

    parser.add_argument(
        "--id", type=str, required=True, help="Unique ID for the image generation"
    )

    parser.add_argument(
        "--prompt",
        type=str,
        required=True,
        help="Text prompt for image generation",
    )

    parser.add_argument("--width", type=int, default=1024, help="Image width in pixels")

    parser.add_argument(
        "--height",
        type=int,
        default=1024,
        help="Image height in pixels",
    )

    parser.add_argument(
        "--cfg-scale",
        type=float,
        default=8.0,
        help="CFG scale value (default: 8.0)",
    )

    parser.add_argument("--seed", type=int, default=0, help="Random seed (default: 0)")

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

    return parser.parse_args()


def main():
    """Main function for local testing."""
    args = parse_arguments()

    # Update global configuration
    global AWS_REGION, S3_BUCKET, bedrock_client, s3_client

    AWS_REGION = args.region
    S3_BUCKET = args.bucket

    # Validate required parameters
    if not S3_BUCKET:
        logger.error("S3 bucket name is required (use --bucket or S3_BUCKET env var)")
        sys.exit(1)

    # Reinitialize clients
    bedrock_client = boto3.client(
        service_name="bedrock-runtime", region_name=AWS_REGION
    )
    s3_client = boto3.client(service_name="s3", region_name=AWS_REGION)

    logger.info(f"Configuration: Region={AWS_REGION}, Bucket={S3_BUCKET}")

    # Create test event
    test_event = {
        "body": json.dumps(
            {
                "Id": args.id,
                "prompt": args.prompt,
                "width": args.width,
                "height": args.height,
                "cfg_scale": args.cfg_scale,
                "seed": args.seed,
            }
        )
    }

    # Execute Lambda handler
    try:
        result = lambda_handler(test_event, None)

        # Parse and display result
        print("\n" + "=" * 50)
        print("RESULT")
        print("=" * 50)
        print(f"Status Code: {result['statusCode']}")
        print("Response Body:")
        print(json.dumps(json.loads(result["body"]), indent=2))
        print("=" * 50)

        # Exit with appropriate code
        if result["statusCode"] == 200:
            sys.exit(0)
        else:
            sys.exit(1)

    except Exception as e:
        logger.error(f"Execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
