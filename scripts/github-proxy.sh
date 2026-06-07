#!/bin/zsh
# 让终端里的 gh / git / curl 走本机 VPN 系统代理（mixed-port 12334）
export HTTP_PROXY="http://127.0.0.1:12334"
export HTTPS_PROXY="http://127.0.0.1:12334"
export ALL_PROXY="http://127.0.0.1:12334"
exec "$@"
