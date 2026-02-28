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

# ─── Allowlist (curated content only) ─────────────────────
# Only these files get ingested. All paths relative to CONTENT_DIR.
# Decision: Option A allowlist approach, approved 2026-02-27.
INGEST_ALLOWLIST = [
    "_resumes/eriberto-lopez-resume-01-25-26.md",   # Latest resume (Jan 2026)
    "_projects/acrylic-pour-painting.md",            # Real project with content
    "_posts/MBS_1.md",                               # Mind, Body, and Soul — personal blog post
    "CAREER_CATALOG.md",                             # Comprehensive career catalog
]


def main():
    if not S3_BUCKET:
        print("❌ EMBEDDINGS_S3_BUCKET not set", file=sys.stderr)
        sys.exit(1)
    if not FUNCTION_NAME:
        print("❌ CHAT_FUNCTION_NAME not set", file=sys.stderr)
        sys.exit(1)

    # Collect markdown files (filtered by allowlist)
    content_dir = Path(CONTENT_DIR)
    all_files = sorted(content_dir.rglob("*.md"))
    if not all_files:
        print(f"❌ No .md files in {CONTENT_DIR}", file=sys.stderr)
        sys.exit(1)

    files = [f for f in all_files if str(f.relative_to(content_dir)) in INGEST_ALLOWLIST]
    print(f"📁 Found {len(all_files)} total markdown files, {len(files)} on allowlist")
    if not files:
        print("❌ No allowlisted files found. Check INGEST_ALLOWLIST.", file=sys.stderr)
        sys.exit(1)

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
