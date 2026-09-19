import json
import os
import time
import uuid
from decimal import Decimal

import boto3

table = boto3.resource("dynamodb").Table(os.environ.get("TABLE_NAME", "payments"))

HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}


def _default(o):
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    raise TypeError


def respond(status, body):
    return {
        "statusCode": status,
        "headers": HEADERS,
        "body": json.dumps(body, default=_default),
    }


def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")

    # CORS preflight
    if method == "OPTIONS":
        return respond(200, {})

    # Save a payment
    if method == "POST" and path.endswith("/payment"):
        try:
            data = json.loads(event.get("body") or "{}")
            amount = int(data.get("amount", 0))
        except (TypeError, ValueError):
            return respond(400, {"error": "invalid body"})
        if amount <= 0:
            return respond(400, {"error": "amount must be positive"})

        item = {
            "paymentId": str(uuid.uuid4()),
            "amount": amount,
            "payer": str(data.get("payer", "Customer"))[:50],
            "app": str(data.get("app", "UPI"))[:20],
            "createdAt": int(time.time() * 1000),
        }
        table.put_item(Item=item)
        return respond(201, item)

    # List recent payments
    if method == "GET" and path.endswith("/payments"):
        items = table.scan().get("Items", [])
        items.sort(key=lambda i: i["createdAt"], reverse=True)
        return respond(200, items[:50])

    return respond(404, {"error": "not found"})
