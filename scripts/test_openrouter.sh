#!/bin/bash
for model in "google/gemma-4-31b-it:free" "google/gemma-4-26b-a4b-it:free" "z-ai/glm-5.2:free" "openai/gpt-oss-20b:free" "nvidia/nemotron-3-nano-30b-a3b:free"; do
  echo "=== Testing $model ==="
  curl -s -X POST https://openrouter.ai/api/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
    -d "{
      \"model\": \"$model\",
      \"messages\": [
        {\"role\": \"system\", \"content\": \"Kau adalah Hirara, kawan orang Melayu. Balas santai dalam Bahasa Melayu.\"},
        {\"role\": \"user\", \"content\": \"pakai awak saya je lepas ni\"}
      ],
      \"max_tokens\": 100
    }"
  echo ""
  echo ""
done
