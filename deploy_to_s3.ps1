<#
.SYNOPSIS
    Deploie le site statique de revision AWS Certified Cloud Practitioner sur Amazon S3.

.PARAMETER BucketName
    Le nom du bucket S3 (doit etre globalement unique). Exemple: quiz-aws-bb-2026

.PARAMETER Region
    La region AWS (par defaut eu-west-3 / Paris).
#>

param(
    [string]$BucketName = "aws-certif-quiz-$((Get-Random).ToString().Substring(0,6))",
    [string]$Region = "eu-west-3"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT DU QUIZ STATIQUE AWS CERTIF SUR AMAZON S3   " -ForegroundColor Cyan
Write-Host "   Bucket: $BucketName | Region: $Region" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

# 1. Verification d'AWS CLI
try {
    $caller = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "[OK] AWS CLI connecte : Compte $($caller.Account) ($($caller.Arn))" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Impossible de joindre AWS. Verifiez vos identifiants ou votre session AWS CLI." -ForegroundColor Red
    exit 1
}

# 2. Creation du Bucket S3 (si non existant)
Write-Host "`n[1/5] Verification / Creation du bucket S3 '$BucketName'..." -ForegroundColor Yellow
$bucketExists = $false
try {
    aws s3api head-bucket --bucket $BucketName 2>$null
    if ($LASTEXITCODE -eq 0) {
        $bucketExists = $true
        Write-Host "  -> Le bucket '$BucketName' existe deja." -ForegroundColor Green
    }
} catch {
    $bucketExists = $false
}

if (-not $bucketExists) {
    Write-Host "  -> Creation du bucket dans la region $Region..." -ForegroundColor Cyan
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket --bucket $BucketName
    } else {
        aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
    }
    Write-Host "  -> Bucket cree avec succes." -ForegroundColor Green
}

# 3. Desactivation du Block Public Access
Write-Host "`n[2/5] Desactivation du Blocage d'Acces Public (PublicAccessBlock)..." -ForegroundColor Yellow
aws s3api put-public-access-block --bucket $BucketName --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
Write-Host "  -> Acces public autorise sur le bucket." -ForegroundColor Green

# 4. Application de la Bucket Policy de lecture publique (s3:GetObject)
Write-Host "`n[3/5] Application de la Bucket Policy publique..." -ForegroundColor Yellow
$policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BucketName/*"
        }
    ]
}
"@

$policyFile = Join-Path $PSScriptRoot "temp_policy.json"
$policy | Out-File -FilePath $policyFile -Encoding ascii
aws s3api put-bucket-policy --bucket $BucketName --policy file://$policyFile
Remove-Item $policyFile -Force
Write-Host "  -> Bucket policy s3:GetObject appliquee avec succes." -ForegroundColor Green

# 5. Activation de l'hebergement de site statique (Static Website Hosting)
Write-Host "`n[4/5] Configuration du Static Website Hosting..." -ForegroundColor Yellow
$websiteConf = '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"error.html"}}'
$wsFile = Join-Path $PSScriptRoot "temp_website.json"
$websiteConf | Out-File -FilePath $wsFile -Encoding ascii
aws s3api put-bucket-website --bucket $BucketName --website-configuration file://$wsFile
Remove-Item $wsFile -Force
Write-Host "  -> Static Website Hosting active (index: index.html, error: error.html)." -ForegroundColor Green

# 6. Upload / Synchronisation des fichiers
Write-Host "`n[5/5] Synchronisation des fichiers web vers S3..." -ForegroundColor Yellow
$scriptDir = $PSScriptRoot

aws s3 cp "$scriptDir\index.html" "s3://$BucketName/index.html" --content-type "text/html" --cache-control "no-cache"
aws s3 cp "$scriptDir\error.html" "s3://$BucketName/error.html" --content-type "text/html" --cache-control "no-cache"
aws s3 cp "$scriptDir\style.css" "s3://$BucketName/style.css" --content-type "text/css" --cache-control "no-cache"
aws s3 cp "$scriptDir\app.js" "s3://$BucketName/app.js" --content-type "application/javascript" --cache-control "no-cache"
aws s3 cp "$scriptDir\questions.js" "s3://$BucketName/questions.js" --content-type "application/javascript"
aws s3 cp "$scriptDir\questions.json" "s3://$BucketName/questions.json" --content-type "application/json"

# Endpoint S3 Website
$websiteEndpoint = "http://$BucketName.s3-website.$Region.amazonaws.com"
if ($Region -eq "us-east-1") {
    $websiteEndpoint = "http://$BucketName.s3-website-us-east-1.amazonaws.com"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   DEPLOIEMENT REUSSI !                                    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "URL du site Web S3 :" -ForegroundColor Cyan
Write-Host "  $websiteEndpoint" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "`nOuvrez cette URL dans votre navigateur pour reviser vos questions !" -ForegroundColor White
