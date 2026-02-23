#!/usr/bin/env python3
"""
Standalone document ingestion: markdown → Bedrock Titan embeddings → S3 JSON.
"""

import json, os, re, hashlib, sys
from pathlib import Path

import boto3

CONTENT_DIR = os.environ.get("CONTENT_DIR", str(Path(__file__).resolve().parent.parent / "frontend" / "content"))
EMBED_MODEL = os.environ.get("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
S3_BUCKET   = os.environ.get("EMBEDDINGS_S3_BUCKET", "")
S3_KEY      = os.environ.get("EMBEDDINGS_S3_KEY", "chat/embeddings.json")
REGION      = os.environ.get("AWS_REGION", "us-east-1")
CHUNK_SIZE  = 800
CHUNK_OVERLAP = 200


def find_md_files(d):
    return sorted(Path(d).rglob("*.md"))


def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        idx = line.find(":")
        if idx > 0:
            k = line[:idx].strip()
            v = line[idx+1:].strip().strip("'\"")
            if k and v:
                meta[k] = v
    return meta, m.group(2)


def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    chunks, start = [], 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            sl = text[start:end]
            for sep in ["\n\n", ". ", "\n"]:
                pos = sl.rfind(sep)
                if pos > size * 0.5:
                    end = start + pos + len(sep)
                    break
        chunk = text[start:end].strip()
        if len(chunk) > 50:
            chunks.append(chunk)
        start = end - overlap
        if start >= len(text):
            break
    return chunks


def chunk_id(source, idx):
    h = hashlib.sha256(f"{source}:{idx}".encode()).hexdigest()[:12]
    return f"{Path(source).stem}-{idx}-{h}"


def embed(bedrock, text):
    resp = bedrock.invoke_model(
        modelId=EMBED_MODEL,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({"inputText": text}),
    )
    return json.loads(resp["body"].read())["embedding"]


def main():
    if not S3_BUCKET:
        print("❌ EMBEDDINGS_S3_BUCKET not set", file=sys.stderr)
        sys.exit(1)

    print("🔄 Starting document ingestion pipeline...\n")
    files = find_md_files(CONTENT_DIR)
    if not files:
        print(f"❌ No .md files in {CONTENT_DIR}", file=sys.stderr)
        sys.exit(1)
    print(f"📁 Found {len(files)} markdown files")

    # Parse + chunk
    all_chunks = []
    base = Path(CONTENT_DIR).resolve().parent.parent  # repo root
    for fp in files:
        rel = str(fp.relative_to(base))
        content = fp.read_text()
        meta, body = parse_frontmatter(content)
        stype = ("resume" if "_resumes" in rel
                 else "project" if "_projects" in rel
                 else "post" if "_posts" in rel
                 else "document")
        title = meta.get("title") or meta.get("name") or fp.stem
        chunks = chunk_text(body)
        for i, c in enumerate(chunks):
            all_chunks.append({
                "id": chunk_id(rel, i),
                "text": f"[{stype}: {title}] {c}",
                "metadata": {**meta, "source": rel, "sourceType": stype, "chunkIndex": str(i)},
            })
        print(f"  📄 {fp.name} → {len(chunks)} chunks ({stype})")

    print(f"\n📊 Total: {len(all_chunks)} chunks\n")

    # Embed
    bedrock = boto3.client("bedrock-runtime", region_name=REGION)
    print(f"🧠 Embedding with Bedrock ({EMBED_MODEL})...")

    stored = []
    for i, ch in enumerate(all_chunks):
        vec = embed(bedrock, ch["text"])
        stored.append({**ch, "embedding": vec})
        if (i + 1) % 5 == 0 or i == len(all_chunks) - 1:
            print(f"  ✅ Embedded {i+1}/{len(all_chunks)}")

    # Upload
    payload = json.dumps({"chunks": stored, "createdAt": __import__("datetime").datetime.utcnow().isoformat(), "count": len(stored)})
    s3 = boto3.client("s3", region_name=REGION)
    print(f"\n💾 Uploading to s3://{S3_BUCKET}/{S3_KEY} ({len(payload)//1024} KB)...")
    s3.put_object(Bucket=S3_BUCKET, Key=S3_KEY, Body=payload, ContentType="application/json")
    print(f"\n✅ Done! {len(stored)} chunks uploaded.")


if __name__ == "__main__":
    main()
