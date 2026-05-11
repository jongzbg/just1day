---
name: redis-local-install
description: Install and run Redis on a system without sudo or docker access.
---

# Redis Local Install (No sudo/docker)

Install and run Redis on a system without sudo or docker access.

## Scenario
- User: `hermes` (uid 10000, no sudo)
- No apt-get, no docker
- Tools available: gcc, make, node, npm, python3

## Steps

### 1. Build Redis from source

```bash
cd /tmp
python3 -c "
import urllib.request, tarfile, os
url = 'https://github.com/redis/redis/archive/refs/tags/7.2.4.tar.gz'
urllib.request.urlretrieve(url, '/tmp/redis-7.2.4.tar.gz')
with tarfile.open('/tmp/redis-7.2.4.tar.gz', 'r:gz') as tar:
    tar.extractall('/tmp/')
"
cd /tmp/redis-7.2.4 && make -j$(nproc)
```

### 2. Copy binaries to user space

```bash
mkdir -p ~/bin
cp /tmp/redis-7.2.4/src/redis-server /tmp/redis-7.2.4/src/redis-cli ~/bin/
export PATH="$HOME/bin:$PATH"
```

### 3. Start Redis

```bash
mkdir -p /tmp/redis-data
redis-server --daemonize yes --dir /tmp/redis-data --port 6379
redis-cli ping  # Should return PONG
```

### 4. Auto-start on session

Add to shell profile:
```bash
export PATH="$HOME/bin:$PATH"
if ! pgrep -x redis-server > /dev/null; then
    mkdir -p /tmp/redis-data
    ~/bin/redis-server --daemonize yes --dir /tmp/redis-data --port 6379
fi
```

## Verification

```bash
redis-cli ping        # PONG
redis-cli info server # Shows version
redis-cli info memory # Shows memory stats
```

## Environment variable for BullMQ

```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
```
