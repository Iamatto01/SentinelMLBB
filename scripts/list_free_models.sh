#!/bin/bash
curl -s https://openrouter.ai/api/v1/models | python3 -c "
import sys, json
data = json.load(sys.stdin)
free = [m['id'] for m in data.get('data', []) if ':free' in m['id']]
for f in free[:30]:
    print(f)
if not free:
    print('No free models found')
"
