#!/usr/bin/env python3
"""Deploy Vue 3 build to Cloudflare Pages via Direct Upload API."""

import os
import json
import hashlib
import mimetypes
import requests

API_TOKEN = "cfat_4OSxAL03Al1oRDawc7gYF57bzOxtsumjfysP7AjEc203ec23"
ACCOUNT_ID = "641cf08cdd9060470052c8887e987a60"
PROJECT_NAME = "scrisori"
BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}"
DIST_DIR = "/var/develop/scrisoricupovesti/frontend/dist"

HEADERS = {"Authorization": f"Bearer {API_TOKEN}"}


def get_files():
    files = []
    for root, dirs, filenames in os.walk(DIST_DIR):
        for fname in filenames:
            filepath = os.path.join(root, fname)
            relpath = os.path.relpath(filepath, DIST_DIR)
            key = "/" + relpath.replace("\\", "/")
            files.append((key, filepath))
    return files


def compute_hash(data):
    return hashlib.sha256(data).hexdigest()


def deploy():
    files = get_files()
    print(f"Found {len(files)} files to deploy")

    # Read all file contents and compute hashes
    file_contents = {}
    manifest = {}

    for key, filepath in files:
        with open(filepath, 'rb') as f:
            content = f.read()
        content_hash = compute_hash(content)
        manifest[key] = content_hash
        if content_hash not in file_contents:
            file_contents[content_hash] = (filepath, content)

    print(f"Unique files by hash: {len(file_contents)}")
    print(f"Manifest entries: {len(manifest)}")

    # Build multipart form data
    # manifest must be the first field
    form_fields = []
    form_fields.append(('manifest', (None, json.dumps(manifest), 'application/json')))

    # Each unique file is uploaded with its content hash as the field name
    for content_hash, (filepath, content) in file_contents.items():
        ct, _ = mimetypes.guess_type(filepath)
        if ct is None:
            ct = 'application/octet-stream'
        basename = os.path.basename(filepath)
        form_fields.append((content_hash, (basename, content, ct)))

    print(f"Uploading...")
    resp = requests.post(
        f"{BASE_URL}/deployments",
        headers=HEADERS,
        files=form_fields,
    )

    print(f"Response: {resp.status_code}")
    result = resp.json()

    if result.get('success'):
        dep = result.get('result', {})
        print(f"\n✓ Deployment successful!")
        print(f"  ID: {dep.get('id')}")
        print(f"  URL: {dep.get('url')}")
        print(f"  Production: https://scrisori.pages.dev")
    else:
        print(f"✗ Deployment failed!")
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    deploy()
