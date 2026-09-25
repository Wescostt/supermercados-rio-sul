# Supermercados Rio Sul

Site estático criado no Open Design. Inclui o site principal, o [encarte digital](encarte-digital.html) e o [localizador de lojas](lojas.html).

O encarte digital usa uma seleção conferida das ofertas do PDF de setembro de 2026 em `offers.json` (válidas de 01 a 30/09/2026). Ofertas adicionais vigentes são consultadas na API pública do site oficial Rio Sul; `promotions-current.json` guarda uma cópia de referência de 25/09/2026 caso essa API esteja indisponível. O cliente só mostra a cópia enquanto as datas da oferta ainda forem válidas. Produtos selecionados e quantidades são guardados no navegador do próprio usuário.

O localizador consulta a API pública de lojas do [site oficial](https://www.supermercadosriosul.com.br/public/), com `stores.json` como cópia de referência de 25/09/2026. A localização é solicitada pelo navegador apenas quando o usuário toca no botão, e a distância em linha reta é calculada no próprio aparelho. O botão de rota abre o Google Maps. O compartilhamento no WhatsApp abre a seleção de conversa; o usuário pode escolher “Mensagem para você”.

O PDF da lista é gerado localmente com `pdf-lib` 1.17.1, cuja licença está em `assets/pdf-lib.LICENSE.md`.

## Prévia local

Sirva esta pasta com um servidor HTTP estático e abra `index.html`.

## Publicação na Vercel

Importe este repositório, selecione o preset **Other** e mantenha a raiz do repositório como diretório de publicação. Não é necessário comando de build.
