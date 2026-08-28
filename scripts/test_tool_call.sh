#!/bin/bash
curl -s -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
  -d '{
    "model": "google/gemma-4-26b-a4b-it:free",
    "messages": [
      {"role": "system", "content": "Kau adalah Hirara, kawan orang Melayu. Kamu mempunyai akses kepada tools jika perlu."},
      {"role": "user", "content": "repo private boleh baca ke?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "list_github_repos",
          "description": "Menyenaraikan semua repository GitHub milik pengguna",
          "parameters": {
            "type": "object",
            "properties": {}
          }
        }
      }
    ]
  }'
