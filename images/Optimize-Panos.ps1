# Create an output folder if it doesn't exist
$outputFolder = "Optimized_Panoramas"
if (-not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder
}

# Get all JPG files in the current directory
$images = Get-ChildItem -Filter *.jpg

foreach ($img in $images) {
    Write-Host "Optimizing: $($img.Name)..." -ForegroundColor Cyan
    
    # Define the output path
    $outputPath = Join-Path $outputFolder $img.Name
    
    # Run ImageMagick 'magick' command
    # -strip: Removes metadata/EXIF
    # -quality 82: Optimal compression/quality ratio
    # -interlace Plane: Progressive loading for web
    # -gaussian-blur 0.05: Smooths noise for better compression
    magick "$($img.FullName)" `
        -resize 3072 `
        "$outputPath"
}

Write-Host "Done! All optimized images are in the $outputFolder folder." -ForegroundColor Green
Pause