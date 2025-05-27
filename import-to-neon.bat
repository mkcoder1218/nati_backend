@echo off
echo 🚀 Negari Database Import to Neon
echo ==================================
echo.

REM Check if psql is available
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ psql not found. Please install PostgreSQL client tools.
    echo.
    echo Download from: https://www.postgresql.org/download/windows/
    echo Or install via chocolatey: choco install postgresql
    pause
    exit /b 1
)

echo ✅ psql found
echo.

REM Check if export file exists
if not exist "exports\full_export_corrected.sql" (
    echo ❌ Export file not found: exports\full_export_corrected.sql
    echo.
    echo Available files in exports directory:
    dir exports\*.sql /b
    pause
    exit /b 1
)

echo ✅ Export file found: exports\full_export_corrected.sql
echo.

REM Load environment variables (simplified)
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr "DATABASE_URL"') do set %%a=%%b

if "%DATABASE_URL%"=="" (
    echo ❌ DATABASE_URL not found in .env file
    pause
    exit /b 1
)

echo ✅ DATABASE_URL loaded
echo.

echo 📥 Starting import to Neon database...
echo ⏳ This may take a few minutes...
echo.

REM Run the import
psql "%DATABASE_URL%" -f "exports\full_export_corrected.sql"

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Import completed successfully!
    echo ✅ Your Neon database now contains your local data.
    echo 🔄 You can now restart your backend server.
) else (
    echo.
    echo ❌ Import failed. Check the error messages above.
    echo 🔧 You may need to check your connection or data format.
)

echo.
pause
