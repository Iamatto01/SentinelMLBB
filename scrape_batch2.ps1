$heroes = @(
    "esmeralda", "masha", "badang", "guinevere", "ruby",
    "phoveus", "sun", "thamuz", "hilda", "alucard",
    "silvanna", "freya", "jawhead", "bane", "x.borg",
    "lapu-lapu", "khaleed", "barats", "leomord", "martis",
    "arlott", "alpha", "roger", "harith", "sora", "zetian", "obsidia"
)

$outputDir = "f:\INI KALI LA\SentinelMLBB\scratch_heroes"
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

foreach ($slug in $heroes) {
    $url = "https://mlbb.tools/heroes/$slug"
    $outFile = "$outputDir\$($slug -replace '[^a-zA-Z0-9-]','_').html"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
        $response.Content | Out-File -FilePath $outFile -Encoding UTF8
        Write-Host "OK: $slug"
    } catch {
        # Try alternate slug for x.borg
        if ($slug -eq "x.borg") {
            try {
                $url2 = "https://mlbb.tools/heroes/xborg"
                $response = Invoke-WebRequest -Uri $url2 -UseBasicParsing -TimeoutSec 15
                $response.Content | Out-File -FilePath $outFile -Encoding UTF8
                Write-Host "OK: $slug (as xborg)"
            } catch {
                Write-Host "FAIL: $slug - $_"
            }
        } else {
            Write-Host "FAIL: $slug - $_"
        }
    }
}
Write-Host "DONE"
