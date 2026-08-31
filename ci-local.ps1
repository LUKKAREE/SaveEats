# =====================================================================
#  ci-local.ps1 - รันชุดตรวจเดียวกับ CI บน GitHub แต่รันในเครื่องตัวเอง
#
#  ใช้ตอนไหน
#    1. ก่อน push ทุกครั้ง จะได้ไม่เสีย commit ไปกับการแก้ error ที่ CI ฟ้อง
#    2. ตอนสาธิตหน้าห้อง ถ้าเน็ตห้องใช้ไม่ได้ ก็ยังโชว์ได้ว่าตรวจอะไรบ้าง
#
#  วิธีรัน  (เปิด PowerShell แล้วพิมพ์)
#      cd C:\SaveEats
#      .\ci-local.ps1
#
#  ถ้าขึ้นว่า "running scripts is disabled on this system" ให้พิมพ์บรรทัดนี้ก่อนหนึ่งครั้ง
#      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#
#  *** ขั้นตอนข้างล่างต้องตรงกับ .github/workflows/ci.yml เสมอ ***
#  ถ้าวันไหนไปเพิ่มขั้นตอนใน ci.yml อย่าลืมมาเพิ่มที่นี่ด้วย
#  ไม่งั้นไฟล์นี้จะโกหกว่า "ผ่านแล้ว" ทั้งที่ CI จริงยังไม่ผ่าน
# =====================================================================

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$failed = @()

function Invoke-Check {
    param([string]$Folder, [string]$Script, [string]$Label)

    Write-Host ""
    Write-Host "-> $Label" -ForegroundColor Cyan

    Push-Location (Join-Path $root $Folder)
    & npm run $Script
    $code = $LASTEXITCODE
    Pop-Location

    if ($code -ne 0) {
        Write-Host "   ผิดพลาด : $Label" -ForegroundColor Red
        $script:failed += $Label
    } else {
        Write-Host "   ผ่าน" -ForegroundColor Green
    }
}

Write-Host "===============================================" -ForegroundColor Yellow
Write-Host " SaveEats - ชุดตรวจเดียวกับ CI บน GitHub" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow

# งานที่ 1 : Backend
Invoke-Check -Folder 'backend'   -Script 'typecheck' -Label 'Backend  : ตรวจชนิดข้อมูล'
Invoke-Check -Folder 'backend'   -Script 'test'      -Label 'Backend  : รันเทสต์ 21 ข้อ'

# งานที่ 2 : Mobile
Invoke-Check -Folder 'mobile'    -Script 'typecheck' -Label 'Mobile   : ตรวจชนิดข้อมูล'

# งานที่ 3 : Admin Web
Invoke-Check -Folder 'admin-web' -Script 'typecheck' -Label 'AdminWeb : ตรวจชนิดข้อมูล'
Invoke-Check -Folder 'admin-web' -Script 'build'     -Label 'AdminWeb : สั่ง build'

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
if ($failed.Count -eq 0) {
    Write-Host " ผ่านครบทุกขั้นตอน - push ขึ้น GitHub ได้เลย" -ForegroundColor Green
    exit 0
} else {
    Write-Host " ไม่ผ่าน $($failed.Count) ขั้นตอน :" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host " แก้ให้ผ่านก่อนค่อย push" -ForegroundColor Red
    exit 1
}
