#!/bin/bash

# Redis Cache Health Check Script
# This script checks the current state of Redis caching

set -e

REDIS_CONTAINER="promptforge-redis-1"
REDIS_PASSWORD="redispassword"

echo "======================================"
echo "Redis Cache Health Check"
echo "======================================"
echo ""

# Check if Redis container is running
echo "1. Checking Redis container status..."
if docker ps | grep -q "$REDIS_CONTAINER"; then
    echo "✅ Redis container is running"
else
    echo "❌ Redis container is not running"
    echo "   Start it with: docker-compose up -d redis"
    exit 1
fi
echo ""

# Get Redis stats
echo "2. Redis Statistics:"
echo "-----------------------------------"
docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" INFO stats 2>/dev/null | grep -E "keyspace_hits|keyspace_misses|expired_keys|evicted_keys" || true
echo ""

# Calculate hit rate
HITS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" INFO stats 2>/dev/null | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r')
MISSES=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" INFO stats 2>/dev/null | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r')

if [ -n "$HITS" ] && [ -n "$MISSES" ] && [ "$HITS" != "0" ] || [ "$MISSES" != "0" ]; then
    TOTAL=$((HITS + MISSES))
    if [ "$TOTAL" -gt 0 ]; then
        HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
        echo "📊 Cache Hit Rate: ${HIT_RATE}%"
        echo "   Total Requests: $TOTAL"
        echo "   Hits: $HITS"
        echo "   Misses: $MISSES"
        echo ""

        if (( $(echo "$HIT_RATE >= 80" | bc -l) )); then
            echo "✅ Hit rate is EXCELLENT (target: >80%)"
        elif (( $(echo "$HIT_RATE >= 60" | bc -l) )); then
            echo "⚠️  Hit rate is GOOD but could be improved (target: >80%)"
        else
            echo "❌ Hit rate is LOW (target: >80%)"
            echo "   Action needed: Implement more Redis caching"
        fi
    else
        echo "⚠️  No cache requests yet (Redis was recently started)"
    fi
else
    echo "⚠️  Could not calculate hit rate"
fi
echo ""

# Get key count and distribution
echo "3. Cache Key Distribution:"
echo "-----------------------------------"

# Count keys by pattern
USER_PROMPT_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan --pattern "user:*:prompts:*" 2>/dev/null | wc -l)
FOLDER_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan --pattern "folder:*" 2>/dev/null | wc -l)
TAG_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan --pattern "tags:*" 2>/dev/null | wc -l)
SHARED_PROMPT_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan --pattern "shared-prompts:*" 2>/dev/null | wc -l)
TRENDING_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan --pattern "trending:*" 2>/dev/null | wc -l)
BULL_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan --pattern "bull:*" 2>/dev/null | wc -l)
TOTAL_KEYS=$(docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" DBSIZE 2>/dev/null | cut -d: -f2 | tr -d '\r')

echo "User Prompts (user:*:prompts:*):    $USER_PROMPT_KEYS keys"
echo "Folders (folder:*):                 $FOLDER_KEYS keys"
echo "Tags (tags:*):                      $TAG_KEYS keys"
echo "Shared Prompts (shared-prompts:*):  $SHARED_PROMPT_KEYS keys"
echo "Trending (trending:*):              $TRENDING_KEYS keys"
echo "Job Queue (bull:*):                 $BULL_KEYS keys"
echo "Total Keys:                         $TOTAL_KEYS keys"
echo ""

# Analyze implementation status
CACHE_KEYS=$((USER_PROMPT_KEYS + FOLDER_KEYS + TAG_KEYS + SHARED_PROMPT_KEYS + TRENDING_KEYS))
echo "4. Implementation Status:"
echo "-----------------------------------"
if [ "$USER_PROMPT_KEYS" -gt 0 ]; then
    echo "✅ User prompt caching is active"
else
    echo "❌ User prompt caching NOT detected"
    echo "   Action: Import and use functions from prompt.actions.redis.ts"
fi

if [ "$FOLDER_KEYS" -gt 0 ]; then
    echo "✅ Folder caching is active"
else
    echo "❌ Folder caching NOT detected"
    echo "   Action: Import and use functions from folder.actions.redis.ts"
fi

if [ "$TAG_KEYS" -gt 0 ]; then
    echo "✅ Tag caching is active"
else
    echo "❌ Tag caching NOT detected"
    echo "   Action: Import and use functions from tag.actions.redis.ts"
fi

if [ "$SHARED_PROMPT_KEYS" -gt 0 ]; then
    echo "✅ Shared prompt caching is active"
else
    echo "⚠️  Shared prompt caching NOT detected (should already exist)"
fi

echo ""

# Memory usage
echo "5. Redis Memory Usage:"
echo "-----------------------------------"
docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" INFO memory 2>/dev/null | grep -E "used_memory_human|used_memory_peak_human|maxmemory" || true
echo ""

# Sample keys
echo "6. Sample Cache Keys (first 10):"
echo "-----------------------------------"
docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --scan 2>/dev/null | grep -v "^bull:" | head -10
echo ""

# Recommendations
echo "======================================"
echo "Recommendations:"
echo "======================================"

if [ "$CACHE_KEYS" -lt 10 ]; then
    echo "❌ CRITICAL: Very few application cache keys detected"
    echo "   Current: $CACHE_KEYS application keys"
    echo "   Expected: 50-500+ keys with active caching"
    echo ""
    echo "   Next Steps:"
    echo "   1. Ensure REDIS_ENABLED=true in .env"
    echo "   2. Update components to use Redis-cached actions:"
    echo "      - Use getAllPromptsRedis() instead of getAllPrompts()"
    echo "      - Use getFoldersRedis() instead of getFolders()"
    echo "      - Use searchTagsRedis() instead of searchTags()"
    echo "   3. Restart the application"
    echo "   4. Re-run this check script"
elif [ "$CACHE_KEYS" -lt 50 ]; then
    echo "⚠️  Some caching is active but usage is low"
    echo "   Current: $CACHE_KEYS application keys"
    echo "   Review REDIS_CACHING_INTEGRATION_GUIDE.md for more migration opportunities"
else
    echo "✅ Good cache key distribution"
    echo "   Current: $CACHE_KEYS application keys"
fi

echo ""
echo "======================================"
echo "For detailed integration steps, see:"
echo "REDIS_CACHING_INTEGRATION_GUIDE.md"
echo "======================================"
