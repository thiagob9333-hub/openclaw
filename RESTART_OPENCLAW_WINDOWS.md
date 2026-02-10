# Reinicio rapido do OpenClaw (Windows)

Use este passo a passo quando ligar o PC novamente.

## 1) Abrir o app

1. Abra o `OpenClaw.app` no Windows.
2. Aguarde 10 segundos.

Se ele conectar sozinho, pode parar aqui.

## 2) Se nao conectar, subir/reiniciar o Gateway

Abra PowerShell e rode:

```powershell
cd "C:\Users\thiag\Open Clowd versão em uso\openclaw"
openclaw gateway restart
Start-Sleep -Seconds 6
openclaw gateway status
```

Esperado:
- `Runtime: running`
- `RPC probe: ok`

## 3) Validar status geral

```powershell
openclaw status --deep
openclaw health
```

## 4) Se aparecer erro 1006 (gateway closed)

```powershell
openclaw gateway stop
Start-Sleep -Seconds 2
openclaw gateway start
Start-Sleep -Seconds 6
openclaw gateway status
openclaw status --deep
```

## 5) Logs ao vivo (debug)

```powershell
openclaw logs --follow
```

## Enderecos locais

- Dashboard: `http://127.0.0.1:18789/`
- Gateway WS: `ws://127.0.0.1:18789`
