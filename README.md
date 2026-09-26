# Supermercados Rio Sul

Site estático criado no Open Design. Inclui o site principal, o [encarte digital](encarte-digital.html) e o [localizador de lojas](lojas.html).

O encarte digital usa uma seleção conferida das ofertas do PDF de setembro de 2026 em `offers.json` (válidas de 01 a 30/09/2026). Ofertas adicionais vigentes são consultadas na API pública do site oficial Rio Sul; `promotions-current.json` guarda uma cópia de referência de 25/09/2026 caso essa API esteja indisponível. O cliente só mostra a cópia enquanto as datas da oferta ainda forem válidas. Produtos selecionados e quantidades são guardados no navegador do próprio usuário.

O localizador consulta a API pública de lojas do [site oficial](https://www.supermercadosriosul.com.br/public/), com `stores.json` como cópia de referência de 25/09/2026. A localização é solicitada pelo navegador apenas quando o usuário toca no botão, e a distância em linha reta é calculada no próprio aparelho. O botão de rota abre o Google Maps. O compartilhamento no WhatsApp abre a seleção de conversa; o usuário pode escolher “Mensagem para você”.

### Fotos das fachadas no localizador

O mapa e a busca funcionam sem chave. Para ativar as fotos oficiais do Google Maps, crie um projeto no [Google Cloud Console](https://console.cloud.google.com/), vincule o faturamento, ative **Maps JavaScript API** e **Places API (New)** e crie uma chave em [Google Maps Platform → Credenciais](https://console.cloud.google.com/google/maps-apis/credentials). Restrinja a chave a **Sites** (`https://wescostt.github.io`) e às duas APIs acima. Defina cotas no Google Maps Platform para controlar o consumo. O uso é [cobrado conforme as requisições](https://developers.google.com/maps/billing-and-pricing/pricing), após as franquias gratuitas de cada serviço.

Depois, configure a chave no atributo `content` de `<meta name="google-maps-api-key">` em `lojas.html`. Chaves usadas no navegador são visíveis ao público; as restrições de domínio e API são obrigatórias. Não coloque uma chave sem restrições no repositório. Hoje a busca de fachadas está habilitada apenas para as unidades Vila São Luís e Penha Circular, cujos registros e imagens de capa foram conferidos no Google Maps. As demais unidades mantêm o mapa e o fundo original até que uma foto da fachada de cada uma seja confirmada. As fotos são consultadas diretamente pela API, com crédito ao autor; não são armazenadas no projeto.

O PDF da lista é gerado localmente com `pdf-lib` 1.17.1, cuja licença está em `assets/pdf-lib.LICENSE.md`.

## Prévia local

Sirva esta pasta com um servidor HTTP estático e abra `index.html`.

## Publicação na Vercel

Importe este repositório, selecione o preset **Other** e mantenha a raiz do repositório como diretório de publicação. Não é necessário comando de build.
