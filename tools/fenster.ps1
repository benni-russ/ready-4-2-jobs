# Hilfe für tools/anleitung-fenster.mjs: findet Fenster von Edge, tippt in den Ordnerdialog
# und fotografiert den Bildschirm. Playwright sieht Fenster des Betriebssystems nicht.
# Die Navigationsleiste des Dialogs (eigene Ordner und Laufwerke) wird verpixelt, die Adresszeile zeigt nur den Pfad.
param([string]$aktion, [string]$datei, [string]$pfad, [double]$anteil = 1)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing, UIAutomationClient, UIAutomationTypes
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class R42JFenster {
  public delegate bool Cb(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Cb cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, Cb cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@
[R42JFenster]::SetProcessDPIAware() | Out-Null

function Klasse($h) { $sb = New-Object Text.StringBuilder 256; [R42JFenster]::GetClassName($h, $sb, 256) | Out-Null; $sb.ToString() }

function EdgeFenster([string]$klasse) {
  $script:treffer = @()
  $cb = [R42JFenster+Cb]{ param($h, $l)
    if ([R42JFenster]::IsWindowVisible($h) -and (Klasse $h) -eq $klasse) {
      $id = 0; [R42JFenster]::GetWindowThreadProcessId($h, [ref]$id) | Out-Null
      $p = Get-Process -Id $id -ErrorAction SilentlyContinue
      if ($p -and $p.ProcessName -eq 'msedge') { $script:treffer += $h }
    }
    $true }
  [R42JFenster]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
  $script:treffer
}

function Kinder($eltern, [string]$klasse) {
  $script:kinder = @()
  $cb = [R42JFenster+Cb]{ param($h, $l)
    if ([R42JFenster]::IsWindowVisible($h) -and (Klasse $h) -eq $klasse) { $script:kinder += $h }
    $true }
  [R42JFenster]::EnumChildWindows($eltern, $cb, [IntPtr]::Zero) | Out-Null
  $script:kinder
}

function Rahmen($h) {
  $r = New-Object R42JFenster+RECT
  [R42JFenster]::DwmGetWindowAttribute($h, 9, [ref]$r, 16) | Out-Null  # ohne Schatten
  $r
}

function Verpixeln($bild, [int]$x, [int]$y, [int]$b, [int]$hoehe) {
  if ($b -le 0 -or $hoehe -le 0) { return }
  $klein = New-Object Drawing.Bitmap ([Math]::Max(1, [int]($b / 16))), ([Math]::Max(1, [int]($hoehe / 16)))
  $g = [Drawing.Graphics]::FromImage($klein)
  $g.DrawImage($bild, (New-Object Drawing.Rectangle 0, 0, $klein.Width, $klein.Height), (New-Object Drawing.Rectangle $x, $y, $b, $hoehe), [Drawing.GraphicsUnit]::Pixel)
  $g = [Drawing.Graphics]::FromImage($bild)
  $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($klein, (New-Object Drawing.Rectangle $x, $y, $b, $hoehe))
}

function Aufnehmen($h, $ziel, $ausblenden) {
  $r = Rahmen $h
  $hoehe = [int](($r.B - $r.T) * $anteil)
  $bild = New-Object Drawing.Bitmap ($r.R - $r.L), $hoehe
  [Drawing.Graphics]::FromImage($bild).CopyFromScreen($r.L, $r.T, 0, 0, $bild.Size)
  foreach ($k in $ausblenden) {
    $kr = New-Object R42JFenster+RECT
    [R42JFenster]::GetWindowRect($k, [ref]$kr) | Out-Null
    Verpixeln $bild ($kr.L - $r.L) ($kr.T - $r.T) ($kr.R - $kr.L) ($kr.B - $kr.T)
  }  $bild.Save($ziel, [Drawing.Imaging.ImageFormat]::Png)
}

if ($aktion -eq 'dialog') {
  for ($i = 0; $i -lt 40 -and -not (EdgeFenster '#32770'); $i++) { Start-Sleep -Milliseconds 250 }
  $h = @(EdgeFenster '#32770')[0]
  if (-not $h) { throw 'Der Ordnerdialog ist nicht aufgegangen.' }
  [R42JFenster]::SetForegroundWindow($h) | Out-Null
  Start-Sleep -Milliseconds 400
  [Windows.Forms.SendKeys]::SendWait($pfad + '{ENTER}')
  Start-Sleep -Milliseconds 1500
  $leiste = @(Kinder $h 'SysTreeView32')
  if (-not $leiste) { throw 'Die Navigationsleiste des Dialogs wurde nicht gefunden, das Bild bleibt aus.' }
  # Die Pfadleiste oben zeigt den Namen des Sticks. Als Text (Strg+L) steht dort nur der Pfad.
  [Windows.Forms.SendKeys]::SendWait('^l{END}')
  Start-Sleep -Milliseconds 500
  $fokus = [Windows.Automation.AutomationElement]::FocusedElement.Current
  if ($fokus.ClassName -ne 'Edit' -or $fokus.Name -ne $pfad) { throw 'Die Adresszeile zeigt nicht nur den Pfad, das Bild bleibt aus.' }
  Aufnehmen $h $datei $leiste
} elseif ($aktion -eq 'waehlen') {
  # Knopf „Ordner auswählen“ (IDOK), unabhängig davon, wo der Fokus steht.
  $h = @(EdgeFenster '#32770')[0]
  [R42JFenster]::PostMessage($h, 0x0111, [IntPtr]1, [IntPtr]::Zero) | Out-Null  # WM_COMMAND, IDOK
} elseif ($aktion -eq 'browser') {
  Aufnehmen @(EdgeFenster 'Chrome_WidgetWin_1')[0] $datei @()
}
