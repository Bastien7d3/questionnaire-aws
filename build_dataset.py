import urllib.request
import re
import json
import urllib.parse
import os

AWS_SERVICES = [
    # Patterns and official doc links
    (r'\b(ec2|elastic compute cloud)\b', 'Amazon EC2', 'https://docs.aws.amazon.com/ec2/'),
    (r'\b(s3|simple storage service)\b', 'Amazon S3', 'https://docs.aws.amazon.com/s3/'),
    (r'\b(lambda)\b', 'AWS Lambda', 'https://docs.aws.amazon.com/lambda/'),
    (r'\b(iam|identity and access management)\b', 'AWS IAM', 'https://docs.aws.amazon.com/iam/'),
    (r'\b(rds|relational database service)\b', 'Amazon RDS', 'https://docs.aws.amazon.com/rds/'),
    (r'\b(dynamodb)\b', 'Amazon DynamoDB', 'https://docs.aws.amazon.com/dynamodb/'),
    (r'\b(aurora)\b', 'Amazon Aurora', 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/'),
    (r'\b(cloudwatch)\b', 'Amazon CloudWatch', 'https://docs.aws.amazon.com/cloudwatch/'),
    (r'\b(cloudtrail)\b', 'AWS CloudTrail', 'https://docs.aws.amazon.com/cloudtrail/'),
    (r'\b(route\s*53)\b', 'Amazon Route 53', 'https://docs.aws.amazon.com/route53/'),
    (r'\b(cloudfront)\b', 'Amazon CloudFront', 'https://docs.aws.amazon.com/cloudfront/'),
    (r'\b(vpc|virtual private cloud)\b', 'Amazon VPC', 'https://docs.aws.amazon.com/vpc/'),
    (r'\b(sns|simple notification service)\b', 'Amazon SNS', 'https://docs.aws.amazon.com/sns/'),
    (r'\b(sqs|simple queue service)\b', 'Amazon SQS', 'https://docs.aws.amazon.com/sqs/'),
    (r'\b(load balancer|elb|alb|nlb)\b', 'Elastic Load Balancing (ELB)', 'https://docs.aws.amazon.com/elasticloadbalancing/'),
    (r'\b(auto\s*scaling)\b', 'AWS Auto Scaling', 'https://docs.aws.amazon.com/autoscaling/'),
    (r'\b(trusted advisor)\b', 'AWS Trusted Advisor', 'https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html'),
    (r'\b(shield)\b', 'AWS Shield', 'https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html'),
    (r'\b(waf|web application firewall)\b', 'AWS WAF', 'https://docs.aws.amazon.com/waf/'),
    (r'\b(guardduty)\b', 'Amazon GuardDuty', 'https://docs.aws.amazon.com/guardduty/'),
    (r'\b(macie)\b', 'Amazon Macie', 'https://docs.aws.amazon.com/macie/'),
    (r'\b(inspector)\b', 'Amazon Inspector', 'https://docs.aws.amazon.com/inspector/'),
    (r'\b(organizations)\b', 'AWS Organizations', 'https://docs.aws.amazon.com/organizations/'),
    (r'\b(snowball|snowcone|snowmobile|snow family)\b', 'AWS Snow Family', 'https://docs.aws.amazon.com/snowball/'),
    (r'\b(athena)\b', 'Amazon Athena', 'https://docs.aws.amazon.com/athena/'),
    (r'\b(redshift)\b', 'Amazon Redshift', 'https://docs.aws.amazon.com/redshift/'),
    (r'\b(kinesis)\b', 'Amazon Kinesis', 'https://docs.aws.amazon.com/kinesis/'),
    (r'\b(glue)\b', 'AWS Glue', 'https://docs.aws.amazon.com/glue/'),
    (r'\b(quicksight)\b', 'Amazon QuickSight', 'https://docs.aws.amazon.com/quicksight/'),
    (r'\b(elasticache|redis|memcached)\b', 'Amazon ElastiCache', 'https://docs.aws.amazon.com/elasticache/'),
    (r'\b(cloudformation)\b', 'AWS CloudFormation', 'https://docs.aws.amazon.com/cloudformation/'),
    (r'\b(elastic beanstalk|beanstalk)\b', 'AWS Elastic Beanstalk', 'https://docs.aws.amazon.com/elasticbeanstalk/'),
    (r'\b(kms|key management service)\b', 'AWS KMS', 'https://docs.aws.amazon.com/kms/'),
    (r'\b(cloudhsm)\b', 'AWS CloudHSM', 'https://docs.aws.amazon.com/cloudhsm/'),
    (r'\b(secrets manager)\b', 'AWS Secrets Manager', 'https://docs.aws.amazon.com/secretsmanager/'),
    (r'\b(systems manager|ssm)\b', 'AWS Systems Manager', 'https://docs.aws.amazon.com/systems-manager/'),
    (r'\b(cost explorer)\b', 'AWS Cost Explorer', 'https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html'),
    (r'\b(budgets)\b', 'AWS Budgets', 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html'),
    (r'\b(pricing calculator)\b', 'AWS Pricing Calculator', 'https://calculator.aws/'),
    (r'\b(shared responsibility)\b', 'Shared Responsibility Model', 'https://aws.amazon.com/compliance/shared-responsibility-model/'),
    (r'\b(well[- ]architected)\b', 'AWS Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/'),
    (r'\b(support plan|support concierge|tam)\b', 'AWS Support Plans', 'https://aws.amazon.com/premiumsupport/plans/'),
    (r'\b(direct connect)\b', 'AWS Direct Connect', 'https://docs.aws.amazon.com/directconnect/'),
    (r'\b(storage gateway)\b', 'AWS Storage Gateway', 'https://docs.aws.amazon.com/storagegateway/'),
    (r'\b(efs|elastic file system)\b', 'Amazon EFS', 'https://docs.aws.amazon.com/efs/'),
    (r'\b(ebs|elastic block store)\b', 'Amazon EBS', 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AmazonEBS.html'),
    (r'\b(dms|database migration service)\b', 'AWS DMS', 'https://docs.aws.amazon.com/dms/'),
    (r'\b(glacier)\b', 'Amazon S3 Glacier', 'https://docs.aws.amazon.com/amazonglacier/'),
    (r'\b(cognito)\b', 'Amazon Cognito', 'https://docs.aws.amazon.com/cognito/'),
    (r'\b(step functions)\b', 'AWS Step Functions', 'https://docs.aws.amazon.com/step-functions/'),
    (r'\b(ecs|elastic container service)\b', 'Amazon ECS', 'https://docs.aws.amazon.com/ecs/'),
    (r'\b(eks|elastic kubernetes service)\b', 'Amazon EKS', 'https://docs.aws.amazon.com/eks/'),
    (r'\b(fargate)\b', 'AWS Fargate', 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html'),
    (r'\b(ecr|elastic container registry)\b', 'Amazon ECR', 'https://docs.aws.amazon.com/AmazonECR/latest/userguide/'),
    (r'\b(artifact)\b', 'AWS Artifact', 'https://docs.aws.amazon.com/artifact/'),
    (r'\b(opsworks)\b', 'AWS OpsWorks', 'https://docs.aws.amazon.com/opsworks/'),
    (r'\b(marketplace)\b', 'AWS Marketplace', 'https://aws.amazon.com/marketplace/'),
    (r'\b(x-ray)\b', 'AWS X-Ray', 'https://docs.aws.amazon.com/xray/'),
    (r'\b(lightsail)\b', 'Amazon Lightsail', 'https://docs.aws.amazon.com/lightsail/'),
    (r'\b(config)\b', 'AWS Config', 'https://docs.aws.amazon.com/config/'),
    (r'\b(waf)\b', 'AWS WAF', 'https://docs.aws.amazon.com/waf/'),
    (r'\b(cloud9)\b', 'AWS Cloud9', 'https://docs.aws.amazon.com/cloud9/'),
    (r'\b(codecommit|codebuild|codedeploy|codepipeline)\b', 'AWS Developer Tools', 'https://aws.amazon.com/devops-resources/'),
    (r'\b(security group|network acl|nacl)\b', 'VPC Security & NACLs', 'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html'),
    (r'\b(fault tolerance|high availability)\b', 'AWS High Availability Architecture', 'https://aws.amazon.com/architecture/well-architected/reliability-pillar/'),
    (r'\b(management console|aws console)\b', 'AWS Management Console', 'https://docs.aws.amazon.com/awsconsolehelp/latest/gsg/getting-started.html'),
    (r'\b(aws cli|command line interface)\b', 'AWS CLI', 'https://docs.aws.amazon.com/cli/'),
    (r'\b(aws sdk|software development kit)\b', 'AWS SDKs & Tools', 'https://aws.amazon.com/developer/tools/'),
    (r'\b(consolidation|consolidated billing)\b', 'AWS Consolidated Billing', 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html')
]

def extract_primary_services(text):
    matched = []
    seen_names = set()
    for pattern, name, doc_url in AWS_SERVICES:
        if re.search(pattern, text, re.IGNORECASE):
            if name not in seen_names:
                seen_names.add(name)
                matched.append({'title': name, 'url': doc_url})
    return matched[:3]

def parse_exam(exam_id, raw_markdown):
    pattern = r'(?ms)^(\d+)\.\s+(.*?)(?=^\d+\.\s+|\Z)'
    matches = list(re.finditer(pattern, raw_markdown))
    questions = []

    for m in matches:
        q_num = int(m.group(1))
        block = m.group(2)

        # Extract answer & explanation from <details>
        det_m = re.search(r'<details[^>]*>(.*?)</details>', block, re.DOTALL | re.IGNORECASE)
        answer_letters = []
        explanation_text = ''
        orig_urls = []

        if det_m:
            content = det_m.group(1)
            # Find answer
            ans_m = re.search(r'Correct answer:\s*([^\r\n<]+)', content, re.IGNORECASE)
            if ans_m:
                raw_ans = ans_m.group(1)
                answer_letters = sorted(list(set(re.findall(r'[A-Ea-e]', raw_ans.upper()))))
            
            # Extract URLs from content
            # e.g. <https://...>, (https://...), or raw https://...
            found_urls = re.findall(r'https?://[^\s<>"\')]+', content)
            for u in found_urls:
                cleaned_u = u.rstrip('.,;>')
                if cleaned_u not in orig_urls:
                    orig_urls.append(cleaned_u)

            # Clean explanation text
            lines = []
            for line in content.splitlines():
                line_str = line.strip()
                if not line_str:
                    continue
                if re.search(r'Correct answer:', line_str, re.IGNORECASE):
                    continue
                if re.search(r'</?summary', line_str, re.IGNORECASE):
                    continue
                lines.append(line_str)
            explanation_text = ' '.join(lines)
            
            # Remove <details> to isolate question + options
            main_block = block[:det_m.start()].strip()
        else:
            main_block = block.strip()

        # Parse options
        opt_pattern = r'^\s*(?:[-*]\s*)?([A-Fa-f])[\.:\)]\s*(.*?)$'
        opt_matches = list(re.finditer(opt_pattern, main_block, re.MULTILINE))
        
        if opt_matches:
            first_opt_start = opt_matches[0].start()
            q_text = main_block[:first_opt_start].strip()
            options = []
            for om in opt_matches:
                opt_letter = om.group(1).upper()
                opt_val = om.group(2).strip()
                options.append({'letter': opt_letter, 'text': opt_val})
        else:
            q_text = main_block
            options = []

        # Determine if multiple choice
        is_multiple = False
        num_choices = 1
        if len(answer_letters) > 1:
            is_multiple = True
            num_choices = len(answer_letters)
        elif re.search(r'\(choose\s+(two|2)\)', q_text, re.IGNORECASE):
            is_multiple = True
            num_choices = 2
        elif re.search(r'\(choose\s+(three|3)\)', q_text, re.IGNORECASE):
            is_multiple = True
            num_choices = 3

        # Assemble links
        links = []
        # 1. Original explanation URLs
        for idx, u in enumerate(orig_urls):
            links.append({
                'title': f'Documentation spécifique (Référence question #{idx+1})',
                'url': u,
                'type': 'source'
            })
        
        # 2. Detected AWS Services
        combined_text = q_text + ' ' + ' '.join(o['text'] for o in options)
        matched_services = extract_primary_services(combined_text)
        for s in matched_services:
            # avoid duplicating url
            if not any(l['url'] == s['url'] for l in links):
                links.append({
                    'title': f'Documentation AWS : {s["title"]}',
                    'url': s['url'],
                    'type': 'aws_doc'
                })

        # 3. AWS Search Link
        # create query keywords from first 8-10 significant words of question
        clean_words = [w for w in re.findall(r'[a-zA-Z0-9]+', q_text) if len(w) > 3 and w.lower() not in ['which', 'following', 'what', 'company', 'wants', 'allows', 'users', 'should', 'would', 'their']]
        search_query = ' '.join(clean_words[:6])
        if search_query:
            search_url = f'https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation&searchQuery={urllib.parse.quote_plus(search_query)}'
            links.append({
                'title': f'Recherche Docs AWS : "{search_query}"',
                'url': search_url,
                'type': 'search'
            })

        # 4. GitHub Exam Source Link
        gh_url = f'https://github.com/kananinirav/AWS-Certified-Cloud-Practitioner-Notes/blob/master/practice-exam/practice-exam-{exam_id}.md'
        links.append({
            'title': f'Exam #{exam_id} sur GitHub (Question {q_num})',
            'url': gh_url,
            'type': 'github'
        })

        questions.append({
            'id': f'exam{exam_id}_q{q_num}',
            'exam': exam_id,
            'number': q_num,
            'question': q_text,
            'options': options,
            'answer': answer_letters,
            'is_multiple': is_multiple,
            'num_choices': num_choices,
            'explanation': explanation_text,
            'links': links
        })

    return questions

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    base_url = 'https://raw.githubusercontent.com/kananinirav/AWS-Certified-Cloud-Practitioner-Notes/master/practice-exam/'
    all_questions = []

    print('Telechargement et parsing des 23 examens...')
    for exam_id in range(1, 24):
        url = f'{base_url}practice-exam-{exam_id}.md'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp:
                text = resp.read().decode('utf-8')
            qs = parse_exam(exam_id, text)
            all_questions.extend(qs)
            print(f'  [OK] Exam {exam_id:02d}: {len(qs)} questions extraites.')
        except Exception as e:
            print(f'  [ERREUR] Exam {exam_id}: {e}')

    print(f'\nTotal questions traitees : {len(all_questions)}')

    # Save to questions.json
    json_path = os.path.join(base_dir, 'questions.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f'Fichier sauvegarde : {json_path} ({os.path.getsize(json_path) / 1024:.1f} KB)')

    # Save to questions.js (for direct file:// support without CORS issues)
    js_path = os.path.join(base_dir, 'questions.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write('// Dataset genere automatiquement - 1142 questions AWS Certified Cloud Practitioner\n')
        f.write('window.AWS_QUESTIONS_DATA = ')
        json.dump(all_questions, f, ensure_ascii=False)
        f.write(';\n')
    print(f'Fichier sauvegarde : {js_path} ({os.path.getsize(js_path) / 1024:.1f} KB)')

if __name__ == '__main__':
    main()
