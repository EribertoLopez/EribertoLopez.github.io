#!/usr/bin/env python3
"""
Upload markdown content to S3, then invoke Lambda to embed + store.
Keeps computation on Lambda (has AWS SDK + Bedrock access natively).
"""

import json, os, sys, base64, io, zipfile
from pathlib import Path
import boto3

CONTENT_DIR = os.environ.get("CONTENT_DIR", str(Path(__file__).resolve().parent.parent / "frontend" / "content"))
S3_BUCKET = os.environ.get("EMBEDDINGS_S3_BUCKET", "")
FUNCTION_NAME = os.environ.get("CHAT_FUNCTION_NAME", "")
REGION = os.environ.get("AWS_REGION", "us-east-1")


def main():
    if not S3_BUCKET:
        print("❌ EMBEDDINGS_S3_BUCKET not set", file=sys.stderr)
        sys.exit(1)
    if not FUNCTION_NAME:
        print("❌ CHAT_FUNCTION_NAME not set", file=sys.stderr)
        sys.exit(1)

    # Collect all markdown files
    content_dir = Path(CONTENT_DIR)
    files = sorted(content_dir.rglob("*.md"))
    if not files:
        print(f"❌ No .md files in {CONTENT_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"📁 Found {len(files)} markdown files")

    # Build payload with file contents
    documents = []
    base = content_dir.resolve().parent.parent
    for fp in files:
        rel = str(fp.relative_to(base))
        documents.append({"path": rel, "content": fp.read_text()})
        print(f"  📄 {fp.name} ({fp.stat().st_size} bytes)")

    total_size = sum(len(d["content"]) for d in documents)
    print(f"\n📊 Total: {len(documents)} files, {total_size // 1024} KB")

    # Invoke Lambda with ingest payload
    print(f"\n🚀 Invoking Lambda ({FUNCTION_NAME})...")
    lam = boto3.client("lambda", region_name=REGION)

    # Build a fake API Gateway event for POST /ingest
    event = {
        "routeKey": "POST /ingest",
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"documents": documents}),
        "requestContext": {"http": {"method": "POST", "sourceIp": "github-actions"}},
    }

    resp = lam.invoke(
        FunctionName=FUNCTION_NAME,
        InvocationType="RequestResponse",
        Payload=json.dumps(event),
    )

    result = json.loads(resp["Payload"].read())
    status = result.get("statusCode", 0)
    body = json.loads(result.get("body", "{}"))

    if status == 200:
        print(f"\n✅ {body.get('message', 'Done!')}")
        print(f"   Chunks: {body.get('chunks', '?')}, Size: {body.get('sizeKB', '?')} KB")
    else:
        print(f"\n❌ Lambda returned {status}: {body}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
