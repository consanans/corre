# Virar o Asaas pro dinheiro de verdade

Hoje o Corre cobra no **sandbox** do Asaas: é tudo de mentira, ninguém paga nada. Este é o passo a passo pra começar a receber de gente de verdade. Faz na ordem, um de cada vez.

## Antes: a 3.72 no ar

A 3.72 traz os Termos de uso, o "Li e aceito" na hora de assinar e o botão de desistir em 7 dias. Sem ela, não abre pra venda.

1. **Banco:** Supabase › SQL Editor › cola o `supabase/delta-v372.sql` › Run. Tem que terminar com `delta v3.72 ok`.
2. **Site:** sobe o `corre-site.zip` da 3.72 no Netlify.
3. **Função:** Supabase › Edge Functions › `pagamento` › Deploy com o código novo (ou me dá o ok que eu subo pelo conector). Deixa o **Verify JWT desligado**, como já tá.

Confere: abre app.corresocial.com/termos.html. Tem que aparecer "Termos de uso do Corre", com o endereço da Houzi.

## 1. Lá no Asaas (conta de produção)

1. **Conta aprovada.** É a conta da Houzi Produtora Ltda, CNPJ 28.415.207/0001-46, com os documentos aceitos. Sem a aprovação, o Asaas não libera a chave de produção.
2. **Chave Pix cadastrada** (Minha conta › Pix). É ela que recebe e é por ela que você saca.
3. **Juros e multa zerados** (Configurações › Cobranças, ou a personalização das cobranças). Os Termos prometem que o Corre não cobra multa nem juros de atraso.
4. **E-mails da fatura ligados** (Notificações). O cliente recebe a fatura e o aviso de vencimento por e-mail.
5. **Nota fiscal (NFS-e de Londrina).** Em Notas fiscais, preenche a inscrição municipal, o regime de tributação, o código do serviço e a alíquota do ISS. **Esses números vêm do teu contador.** Me manda o código do serviço e a alíquota que eu ligo a nota automática em cada assinatura (os Termos dizem que a nota sai no nome de quem paga).
6. **Chave de API de produção** (Integrações › Chave de API). Ela começa com `$aact_prod_`. Se o Asaas perguntar as permissões, deixa liberado **cobranças, assinaturas, clientes, webhooks e estornos**: o estorno é o que devolve o dinheiro de quem desiste em 7 dias.

## 2. No Supabase

1. **Edge Functions › Secrets:** troca o valor da `ASAAS_API_KEY` pela chave de produção. Se existir um secret `ASAAS_AMBIENTE` dizendo `sandbox`, apaga ele.
2. **SQL Editor:** cola o `supabase/asaas-producao.sql` › Run. Ele limpa o que veio do sandbox e guarda os testes grátis de cada um. Tem que terminar com `sandbox limpo: N testes grátis guardados`.

## 3. No app (entrando como @consanans)

1. Financeiro › Planos › **Ligar o Asaas**.
2. Tem que aparecer **"Ligado na conta de verdade. O aviso de pagamento tá cadastrado no Asaas."** Se aparecer "sandbox", a chave do passo 2 ainda é a de teste.

## 4. A compra de teste, com dinheiro de verdade

O fundador não vê o botão de assinar, então usa **outra conta Google** (de alguém de confiança, com o ok da pessoa).

1. Entra com essa conta e assina o **Hórus** (R$ 9,90), marcando o "Li e aceito".
2. Paga a fatura no **Pix**. Em até um minuto o cartão do Hórus tem que dizer **"Ativo. Pago até…"**.
3. Logo embaixo aparece **"Mudou de ideia? Até dd/mm dá pra desistir…"**. Toca em **Desistir e receber de volta**.
4. Confere: o Pix volta pra conta que pagou, o plano fica parado e, no painel do Asaas, a cobrança aparece como **estornada**.

Se os quatro passaram, tá tudo ligado: cobrança, aviso de pagamento, devolução e os Termos. Pode anunciar.

## Se algo der errado

- **"Falta a chave"** no Ligar o Asaas: a `ASAAS_API_KEY` não tá nos Secrets.
- **Pagou e o plano não ligou:** reabre Financeiro › Planos (o app confere direto no Asaas). Se seguir parado, me chama com o horário do pagamento.
- **O Asaas recusou o estorno:** a chave de API não tem a permissão de estorno (passo 1.6), ou falta saldo na conta do Asaas pra devolver.
- **Desistência pelo e-mail** (a segunda vez no mesmo plano, ou quem pediu por lá): no painel do Asaas, estorna a cobrança da pessoa ("Estornar") e remove a assinatura dela (senão o Asaas cobra de novo no mês que vem). O plano para sozinho quando o Asaas avisa.
