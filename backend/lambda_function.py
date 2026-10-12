import json
import boto3
import os
import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='eu-west-3')
TABLE_NAME = os.environ.get('TABLE_NAME', 'aws-quiz-scoreboard')
table = dynamodb.Table(TABLE_NAME)

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event, context):
    # Support both Function URL and direct test events
    http_method = 'GET'
    if 'requestContext' in event and 'http' in event['requestContext']:
        http_method = event['requestContext']['http']['method']
    elif 'httpMethod' in event:
        http_method = event['httpMethod']

    if http_method == 'OPTIONS':
        return build_response(200, {'message': 'CORS OK'})

    try:
        if http_method == 'GET':
            # Retrieve Top users
            response = table.scan()
            items = response.get('Items', [])

            # Sort items by score DESC, then by accuracy DESC
            items.sort(key=lambda x: (
                int(x.get('score', 0)),
                float(x.get('accuracy', 0)),
                int(x.get('max_streak', 0))
            ), reverse=True)

            # Limit to top 20
            top_users = []
            for rank, item in enumerate(items[:20], start=1):
                top_users.append({
                    'rank': rank,
                    'username': item.get('username'),
                    'score': int(item.get('score', 0)),
                    'total_answered': int(item.get('total_answered', 0)),
                    'accuracy': float(item.get('accuracy', 0)),
                    'max_streak': int(item.get('max_streak', 0)),
                    'last_active': item.get('last_active', '')
                })

            return build_response(200, {
                'success': True,
                'count': len(top_users),
                'scoreboard': top_users
            })

        elif http_method == 'POST':
            raw_body = event.get('body', '{}')
            if event.get('isBase64Encoded', False):
                import base64
                raw_body = base64.b64decode(raw_body).decode('utf-8')
            
            data = json.loads(raw_body) if isinstance(raw_body, str) else raw_body

            username = str(data.get('username', '')).strip()
            # Clean and sanitize username
            if not username or len(username) > 30:
                return build_response(400, {'error': 'Le pseudo doit comporter entre 1 et 30 caractères.'})

            score = int(data.get('score', 0))
            total_answered = int(data.get('total_answered', 0))
            max_streak = int(data.get('max_streak', 0))
            streak = int(data.get('streak', 0))

            if total_answered < score:
                total_answered = score

            accuracy = round((score / total_answered * 100), 1) if total_answered > 0 else 0.0

            # Get existing user to preserve highest stats
            now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
            
            existing = table.get_item(Key={'username': username}).get('Item')
            if existing:
                # Merge stats (keep max values)
                score = max(int(existing.get('score', 0)), score)
                total_answered = max(int(existing.get('total_answered', 0)), total_answered)
                max_streak = max(int(existing.get('max_streak', 0)), max_streak, streak)
                accuracy = round((score / total_answered * 100), 1) if total_answered > 0 else 0.0

            item = {
                'username': username,
                'score': score,
                'total_answered': total_answered,
                'accuracy': Decimal(str(accuracy)),
                'max_streak': max_streak,
                'last_active': now_iso
            }

            table.put_item(Item=item)

            return build_response(200, {
                'success': True,
                'message': 'Score mis à jour avec succès.',
                'user': {
                    'username': username,
                    'score': score,
                    'total_answered': total_answered,
                    'accuracy': accuracy,
                    'max_streak': max_streak,
                    'last_active': now_iso
                }
            })

        else:
            return build_response(405, {'error': f'Method {http_method} not allowed.'})

    except Exception as e:
        return build_response(500, {'error': str(e)})
