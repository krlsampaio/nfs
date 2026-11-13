# Ponte de NFs

Escaneie notas fiscais (QR code da NFC-e ou código de barras do DANFE) no celular e copie a chave de acesso no PC.

## Como subir no Vercel

1. Crie um repositório no GitHub e envie estes arquivos (`index.html`, `package.json`, pasta `api/`).
2. No Vercel: **Add New → Project**, escolha o repositório. Framework: **Other**. Clique em **Deploy**.
3. No projeto, abra **Storage → Create Database → Upstash (Redis)**, crie (plano grátis) e conecte ao projeto.
4. Vá em **Deployments → ⋯ → Redeploy** para o site pegar as variáveis do banco.

## Como usar

- Abra o site no PC: aparece um QR code.
- Leia esse QR com a câmera do celular e toque no link: os dois ficam conectados.
- No celular, toque em **Escanear notas** e aponte para os códigos. Cada nota aparece no PC em ~2 s.
- No PC, clique numa chave para copiar, ou em **Copiar pendentes** para copiar várias (uma por linha).

Notas ficam guardadas por 30 dias sem uso. O código da sala funciona como senha: quem tiver o link da sala vê as chaves.
