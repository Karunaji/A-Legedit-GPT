Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd /c cd /d """ & projectDir & """ && "

If fso.FileExists("C:\Program Files\nodejs\npm.cmd") Then
  cmd = cmd & """C:\Program Files\nodejs\npm.cmd"" start"
ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\npm.cmd") Then
  cmd = cmd & """C:\Program Files (x86)\nodejs\npm.cmd"" start"
Else
  cmd = cmd & "npm.cmd start"
End If

shell.Run cmd, 0, False
