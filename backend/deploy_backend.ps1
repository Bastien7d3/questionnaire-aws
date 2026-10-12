# Script de deploiement du Backend Serverless DynamoDB + Lambda (100% Gratuit)
param(
    [string]$Region = "eu-west-3",
    [string]$TableName = "aws-quiz-scoreboard",
    [string]$FunctionName = "aws-quiz-scoreboard-api",
    [string]$RoleName = "aws-quiz-lambda-role"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT DU BACKEND SCOREBOARD (DYNAMODB + LAMBDA)  " -ForegroundColor Cyan
Write-Host "   Region: $Region | Table: $TableName" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

# 1. DynamoDB Table (Always Free 25 RCU/WCU & 25 Go)
Write-Host "[1/5] Verification de la table DynamoDB '$TableName'..." -ForegroundColor Yellow
$tableExists = $false
try {
    aws dynamodb describe-table --table-name $TableName --region $Region 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $tableExists = $true
        Write-Host "  -> La table DynamoDB existe deja." -ForegroundColor Green
    }
} catch {
    $tableExists = $false
}

if (-not $tableExists) {
    Write-Host "  -> Creation de la table DynamoDB en mode PROVISIONED (5 RCU / 5 WCU - 0 €)..." -ForegroundColor Cyan
    aws dynamodb create-table `
        --table-name $TableName `
        --attribute-definitions AttributeName=username,AttributeType=S `
        --key-schema AttributeName=username,KeyType=HASH `
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
        --region $Region | Out-Null
    Write-Host "  -> Table DynamoDB creee avec succes." -ForegroundColor Green
}

# 2. Package Lambda zip
Write-Host "`n[2/5] Creation de l'archive ZIP Lambda..." -ForegroundColor Yellow
$scriptDir = $PSScriptRoot
$zipPath = Join-Path $scriptDir "function.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$pyFile = Join-Path $scriptDir "lambda_function.py"
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $pyFile, "lambda_function.py")
$zip.Dispose()
Write-Host "  -> function.zip genere ($((Get-Item $zipPath).Length) octets)." -ForegroundColor Green

# 3. Update Lambda Code
Write-Host "`n[3/5] Mise a jour du code de la fonction Lambda '$FunctionName'..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $FunctionName `
    --zip-file "fileb://$zipPath" `
    --region $Region | Out-Null
Write-Host "  -> Code Lambda mis a jour avec succes." -ForegroundColor Green

# 4. Get Function URL
Write-Host "`n[4/5] Verification de la Lambda Function URL..." -ForegroundColor Yellow
$urlConf = aws lambda get-function-url-config --function-name $FunctionName --region $Region | ConvertFrom-Json
Write-Host "  -> Endpoint public Function URL : $($urlConf.FunctionUrl)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   BACKEND DEPLOYE AVEC SUCCES (0,00 €)                   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
