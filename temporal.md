Analise a documentação do https://temporal.io/ e utilize Temporal.io para criar workflow e orquestrar 
chamadas para serviços do mercado pago. 
○ O Temporal.io será a espinha dorsal para garantir que as operações de 
pagamento com Cartão de Crédito sejam robustas e confiáveis. Em vez de 
depender de um callback simples, você criará um workflow para gerenciar toda a 
transação: 
Este workflow se encarregará de: 
● Registrar o pagamento no banco de dados com o status PENDING. 
● Chamar o serviço de integração com o Mercado Pago para criar a 
transação. 
● Aguardar o retorno do Mercado Pago (via callback ou polling) de 
forma durável. Se o servidor cair, o workflow não será perdido; ele 
continuará de onde parou. 
● Atualizar o status do pagamento para PAID ou FAIL no banco de dados, 
com base na resposta do Mercado Pago. 