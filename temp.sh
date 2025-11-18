#!/bin/bash

API_URL="http://localhost:8000/summarize"

# Function to make one request
make_request() {
  local id=$1
  local dummy_url="https://dummy.url/video_${id}"
  local payload=$(cat <<EOF
{
  "vtt": "WEBVTT\\n\\n1\\n00:00:00.000 --> 00:00:01.000\\nDummy text for request ${id}\\n",
  "url": "${dummy_url}",
  "variant": "default"
}
EOF
)

  echo "🚀 [START] Request #${id} at $(date '+%H:%M:%S')"

  curl -s -o /dev/null -w "[DONE] Request #${id} (status: %{http_code})\n" \
    -X POST "$API_URL" \
    -H "Accept: */*" \
    -H "Content-Type: application/json" \
    -H "User-Agent: ParallelTest/1.0" \
    --data "$payload"

  echo "✅ [END] Request #${id} at $(date '+%H:%M:%S')"
}

# Run 100 requests in parallel
for i in $(seq 1 100); do
  make_request "$i" &
done

# Wait for all background jobs to finish
wait

echo "🎉 All 100 requests completed at $(date '+%H:%M:%S')"
