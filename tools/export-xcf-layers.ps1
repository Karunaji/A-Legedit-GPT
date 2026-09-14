param(
    [string]$XcfRoot = ".",
    [string]$OutputRoot = ".\xcf-export",
    [string]$GimpExe = "",
    [string]$SkipPrefix = "_skip"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-GimpExe {
    param([string]$Requested)

    if ($Requested) {
        if (Test-Path -LiteralPath $Requested) {
            return (Resolve-Path -LiteralPath $Requested).Path
        }
        throw "GIMP executable not found at: $Requested"
    }

    $candidates = @(
        "C:\Program Files\GIMP 3\bin\gimp-console-3.0.exe",
        "C:\Program Files\GIMP 3\bin\gimp-3.0.exe",
        "C:\Program Files\GIMP 2\bin\gimp-console-2.10.exe",
        "C:\Program Files\GIMP 2\bin\gimp-2.10.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    $fromPath = Get-Command gimp-console-3.0.exe,gimp-console-2.10.exe,gimp-3.0.exe,gimp-2.10.exe,gimp.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($fromPath) {
        return $fromPath.Source
    }

    throw "Could not find GIMP automatically. Pass -GimpExe with the full path to your GIMP executable."
}

function To-SchemeString {
    param([string]$Value)
    '"' + ($Value -replace '\\', '\\' -replace '"', '\"') + '"'
}

$projectRoot = (Get-Location).Path
$xcfRootPath = Resolve-Path -LiteralPath $XcfRoot

if (-not (Test-Path -LiteralPath $OutputRoot)) {
    New-Item -ItemType Directory -Path $OutputRoot | Out-Null
}
$outputRootPath = (Resolve-Path -LiteralPath $OutputRoot).Path

$gimpPath = Resolve-GimpExe -Requested $GimpExe
$schemePath = Join-Path $PSScriptRoot "gimp-export-layers.scm"

if (-not (Test-Path -LiteralPath $schemePath)) {
    throw "Scheme helper not found: $schemePath"
}

$xcfFiles = Get-ChildItem -LiteralPath $xcfRootPath.Path -Recurse -File -Filter *.xcf
if (-not $xcfFiles) {
    Write-Warning "No .xcf files found under $($xcfRootPath.Path)"
    exit 0
}

Write-Host "Using GIMP:" $gimpPath
Write-Host "Found" $xcfFiles.Count ".xcf file(s)."

foreach ($xcf in $xcfFiles) {
    $targetDir = Join-Path $outputRootPath $xcf.BaseName
    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }

    Write-Host "Exporting layers from $($xcf.FullName)"
    & $gimpPath -i -d -f `
        -b "(load $(To-SchemeString $schemePath))" `
        -b "(script-fu-export-top-layers $(To-SchemeString $xcf.FullName) $(To-SchemeString $targetDir) $(To-SchemeString $SkipPrefix))" `
        -b "(gimp-quit 0)"
}

Write-Host ""
Write-Host "Done. PNG exports are in:" $outputRootPath
