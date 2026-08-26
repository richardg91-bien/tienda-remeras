# Script para subir imagenes de Pinterest al banco
# Uso: powershell -ExecutionPolicy Bypass -File scripts/uploadPinterest.ps1

$ErrorActionPreference = "Continue"

# Login
Write-Host "Iniciando sesion..." -ForegroundColor Cyan
try {
    $login = Invoke-RestMethod "http://localhost:3000/api/auth/login" `
        -Method POST -ContentType "application/json" `
        -Body '{"email":"test@test.com","password":"test1234"}'
    $token = $login.accessToken
    Write-Host "Login OK`n" -ForegroundColor Green
} catch {
    Write-Host "Error de login: $_" -ForegroundColor Red
    exit 1
}

$carpeta  = "C:\Users\richa\OneDrive\Desktop\imagenes-pintered-para- tienda-remeras"
$imagenes = Get-ChildItem $carpeta -Include "*.jpg","*.jpeg","*.png","*.webp" -Recurse
$total    = $imagenes.Count
$ok = 0; $fail = 0; $i = 0

Write-Host "Encontradas $total imagenes. Subiendo...`n" -ForegroundColor Cyan

foreach ($img in $imagenes) {
    $i++
    $shortName = if ($img.Name.Length -gt 50) { $img.Name.Substring(0,47) + "..." } else { $img.Name }
    Write-Host "[$i/$total] $shortName" -NoNewline

    try {
        $boundary = [System.Guid]::NewGuid().ToString()
        $ext      = $img.Extension.ToLower().Trim()
        $mime     = switch ($ext) {
            ".png"  { "image/png" }
            ".webp" { "image/webp" }
            ".gif"  { "image/gif" }
            default { "image/jpeg" }
        }
        $baseName = $img.BaseName
        if ($baseName.Length -gt 79) { $baseName = $baseName.Substring(0,79) }
        $bytes = [System.IO.File]::ReadAllBytes($img.FullName)

        $header = [System.Text.Encoding]::UTF8.GetBytes(
            "--$boundary`r`n" +
            "Content-Disposition: form-data; name=`"name`"`r`n`r`n$baseName`r`n" +
            "--$boundary`r`n" +
            "Content-Disposition: form-data; name=`"category`"`r`n`r`ngraficos`r`n" +
            "--$boundary`r`n" +
            "Content-Disposition: form-data; name=`"tags`"`r`n`r`nretro,vintage,cartoon,diseño`r`n" +
            "--$boundary`r`n" +
            "Content-Disposition: form-data; name=`"isPublic`"`r`n`r`ntrue`r`n" +
            "--$boundary`r`n" +
            "Content-Disposition: form-data; name=`"image`"; filename=`"$($img.Name)`"`r`n" +
            "Content-Type: $mime`r`n`r`n"
        )
        $footer = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
        $body   = $header + $bytes + $footer

        $resp = Invoke-RestMethod "http://localhost:3000/api/assets" `
            -Method POST `
            -Headers @{
                Authorization  = "Bearer $token"
                "Content-Type" = "multipart/form-data; boundary=$boundary"
            } `
            -Body $body

        Write-Host " -> OK" -ForegroundColor Green
        $ok++
    } catch {
        $msg = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        Write-Host " -> FALLO: $msg" -ForegroundColor Red
        $fail++
    }

    Start-Sleep -Milliseconds 500
}

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host "SUBIDAS CORRECTAMENTE : $ok" -ForegroundColor Green
Write-Host "FALLIDAS              : $fail" -ForegroundColor Red
Write-Host "TOTAL PROCESADAS      : $i / $total" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
