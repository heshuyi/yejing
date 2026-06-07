#!/usr/bin/env python3
"""创建中文 Pull Request。用法: python3 scripts/github-pr-create.py <head分支> <标题> <body文件>"""
import json
import subprocess
import sys
import urllib.request

BASE = "https://api.github.com/repos/heshuyi/yejing"


def get_token():
    proc = subprocess.run(
        ["git", "credential-osxkeychain", "get"],
        input="protocol=https\nhost=github.com\n\n",
        text=True,
        capture_output=True,
        check=True,
    )
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise RuntimeError("未找到 GitHub token")


def main():
    if len(sys.argv) < 4:
        print("用法: github-pr-create.py <head> <title> <body文件>")
        sys.exit(1)
    head, title, body_path = sys.argv[1], sys.argv[2], sys.argv[3]
    body = open(body_path, encoding="utf-8").read()
    token = get_token()
    data = json.dumps({"title": title, "head": head, "base": "main", "body": body}).encode()
    req = urllib.request.Request(
        f"{BASE}/pulls",
        data=data,
        method="POST",
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        pr = json.loads(resp.read())
    print(pr["html_url"])
    print(f"已创建 PR #{pr['number']}: {title}")


if __name__ == "__main__":
    main()
