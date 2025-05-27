# Negari Database Import to Neon (PowerShell)
Write-Host "🚀 Negari Database Import to Neon" -ForegroundColor Magenta
Write-Host "==================================" -ForegroundColor Magenta
Write-Host ""

# Check if psql is available
try {
    $psqlVersion = psql --version 2>$null
    Write-Host "✅ psql found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ psql not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host ""
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Or install via chocolatey: choco install postgresql" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if export file exists
$exportFile = "exports\full_export_corrected.sql"
if (-not (Test-Path $exportFile)) {
    Write-Host "❌ Export file not found: $exportFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available files in exports directory:" -ForegroundColor Yellow
    Get-ChildItem exports\*.sql | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Cyan }
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Export file found: $exportFile" -ForegroundColor Green
Write-Host ""

# Load DATABASE_URL from .env
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$databaseUrl = ""
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^DATABASE_URL=(.+)$") {
        $databaseUrl = $matches[1]
    }
}

if ($databaseUrl -eq "") {
    Write-Host "❌ DATABASE_URL not found in .env file" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ DATABASE_URL loaded" -ForegroundColor Green
Write-Host ""

Write-Host "📥 Starting import to Neon database..." -ForegroundColor Blue
Write-Host "⏳ This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Run the import
try {
    & psql $databaseUrl -f $exportFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Import completed successfully!" -ForegroundColor Green
        Write-Host "✅ Your Neon database now contains your local data." -ForegroundColor Green
        Write-Host "🔄 You can now restart your backend server." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Import failed. Check the error messages above." -ForegroundColor Red
        Write-Host "🔧 You may need to check your connection or data format." -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ Import failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
