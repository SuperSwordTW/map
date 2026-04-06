$outputFolder = "Optimized_Panoramas"
if (-not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder
}

$images = Get-ChildItem -Filter *.jpg

foreach ($img in $images) {
    Write-Host "Optimizing: $($img.Name)..." -ForegroundColor Cyan
    
    $outputPath = Join-Path $outputFolder $img.Name
    
    magick "$($img.FullName)" `
        -resize 8192 `
        "$outputPath"
}

Write-Host "Done! All optimized images are in the $outputFolder folder." -ForegroundColor Green
Pause