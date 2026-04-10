#!/usr/bin/env python3
"""Deploy site to Cloudflare Pages using Direct Upload API."""

import os
import json
import hashlib
import requests
import mimetypes

API_TOKEN = "cfut_hS7zk6YBjKJMtqURxqgCvMCg3FAZRYykmIzVPf9314a59615"
ACCOUNT_ID = "641cf08cdd9060470052c8887e987a60"
PROJECT_NAME = "scrisori"
BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}"
SITE_DIR = "/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com"

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
}

ALLOWED_EXT = {'.html', '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.svg',
               '.woff', '.woff2', '.ico', '.webp', '.ttf', '.eot', '.json', '.xml', '.txt'}


def get_files():
    """Get all deployable files."""
    files = []
    for root, dirs, filenames in os.walk(SITE_DIR):
        for fname in filenames:
            filepath = os.path.join(root, fname)
            relpath = os.path.relpath(filepath, SITE_DIR)

            # Skip files with query strings in names (wget artifacts)
            if '@' in relpath:
                continue

            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALLOWED_EXT:
                continue

            files.append((relpath, filepath))

    return files


def compute_hash(filepath):
    """Compute content hash for a file."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def get_content_type(filepath):
    """Get MIME type for file."""
    ct, _ = mimetypes.guess_type(filepath)
    return ct or 'application/octet-stream'


def deploy():
    files = get_files()
    print(f"Found {len(files)} files to upload")

    # Step 1: Create upload token / get JWT
    # Use the direct upload endpoint
    manifest = {}

    # Build file hashes for manifest
    file_data = []
    for relpath, filepath in files:
        size = os.path.getsize(filepath)
        content_hash = compute_hash(filepath)
        # Normalize path: /index.html, /pages/faq.html etc
        key = "/" + relpath.replace("\\", "/")
        file_data.append({
            'key': key,
            'path': relpath,
            'filepath': filepath,
            'hash': content_hash,
            'size': size,
            'content_type': get_content_type(filepath),
        })
        manifest[key] = content_hash

    print(f"Uploading {len(file_data)} files...")

    # Use the create deployment endpoint with multipart upload
    # Cloudflare Pages Direct Upload: POST /pages/projects/{project}/deployments
    # with multipart form: manifest (JSON) + file blobs

    multipart_files = []

    # Add manifest
    manifest_data = json.dumps(manifest)

    # Build the multipart payload
    # Each file is uploaded as a separate part with its hash as the name
    upload_files = {}
    seen_hashes = set()

    for fd in file_data:
        h = fd['hash']
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        upload_files[h] = (fd['path'], open(fd['filepath'], 'rb'), fd['content_type'])

    # The manifest maps paths to content hashes
    files_payload = {'manifest': (None, manifest_data, 'application/json')}
    files_payload.update(upload_files)

    print(f"Uploading {len(upload_files)} unique files (deduped by hash)...")

    resp = requests.post(
        f"{BASE_URL}/deployments",
        headers=HEADERS,
        files=files_payload,
    )

    # Close file handles
    for h, (name, fh, ct) in upload_files.items():
        fh.close()

    print(f"Response status: {resp.status_code}")
    result = resp.json()

    if result.get('success'):
        deployment = result.get('result', {})
        print(f"\nDeployment successful!")
        print(f"  ID: {deployment.get('id')}")
        print(f"  URL: {deployment.get('url')}")
        print(f"  Environment: {deployment.get('environment')}")
    else:
        print(f"Deployment failed!")
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    deploy()
