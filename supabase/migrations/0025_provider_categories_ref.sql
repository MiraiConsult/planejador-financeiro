-- ============================================================
-- 0025 — Taxonomia completa do Banco MCP (Pluggy) como referência global
--
-- Usada pra preencher a "rubrica" (subcategoria detalhada) de cada
-- lançamento importado, a partir do categoria_externa_id.
-- Ex: 11010000 → "Restaurantes e bares", 19050001 → "Posto de gasolina".
-- ============================================================

create table if not exists cm_provider_categories (
  external_id text primary key,
  nome_pt     text not null,
  prefix      text not null
);

alter table cm_provider_categories enable row level security;
drop policy if exists cmpc_read on cm_provider_categories;
create policy cmpc_read on cm_provider_categories for select using (auth.role() = 'authenticated');

insert into cm_provider_categories (external_id, nome_pt, prefix) values
 ('01000000','Renda','01'),('01010000','Salário','01'),('01020000','Aposentadoria','01'),
 ('01030000','Empreendedorismo','01'),('01040000','Auxílio do governo','01'),('01050000','Renda não-recorrente','01'),
 ('02000000','Empréstimos e financiamento','02'),('02010000','Cheque especial / atraso','02'),('02020000','Juros cobrados','02'),
 ('02030000','Financiamento','02'),('02030001','Financiamento imobiliário','02'),('02030002','Financiamento de veículos','02'),
 ('02030003','Empréstimo estudantil','02'),('02040000','Empréstimos','02'),
 ('03000000','Investimentos','03'),('03010000','Investimento automático','03'),('03020000','Renda fixa','03'),
 ('03030000','Fundos','03'),('03040000','Renda variável','03'),('03050000','Ajuste de margem','03'),
 ('03060000','Juros e dividendos','03'),('03070000','Previdência','03'),
 ('04000000','Transf. mesma titularidade','04'),('04010000','Transf. própria - Dinheiro','04'),
 ('04020000','Transf. própria - PIX','04'),('04030000','Transf. própria - TED','04'),
 ('05000000','Transferências','05'),('05010000','Transf. - Boleto','05'),('05020000','Transf. - Dinheiro','05'),
 ('05030000','Transf. - Cheque','05'),('05040000','Transf. - DOC','05'),('05050000','Transf. - Câmbio','05'),
 ('05060000','Transf. - Mesma instituição','05'),('05070000','Transf. - PIX','05'),('05080000','Transf. - TED','05'),
 ('05090000','Transf. para terceiros','05'),('05090001','Terceiros - Boleto','05'),('05090002','Terceiros - Débito','05'),
 ('05090003','Terceiros - DOC','05'),('05090004','Terceiros - PIX','05'),('05090005','Terceiros - TED','05'),
 ('05100000','Pagamento de cartão','05'),
 ('06000000','Obrigações legais','06'),('06010000','Saldo bloqueado','06'),('06020000','Pensão alimentícia','06'),
 ('07000000','Serviços','07'),('07010000','Telecomunicação','07'),('07010001','Internet','07'),
 ('07010002','Celular','07'),('07010003','TV','07'),('07020000','Educação','07'),('07020001','Cursos online','07'),
 ('07020002','Universidade','07'),('07020003','Escola','07'),('07020004','Creche','07'),
 ('07030000','Saúde e bem-estar','07'),('07030001','Academia','07'),('07030002','Esportes','07'),('07030003','Bem-estar','07'),
 ('07040000','Bilhetes','07'),('07040001','Estádios e arenas','07'),('07040002','Museus e turismo','07'),('07040003','Cinema, teatro e shows','07'),
 ('08000000','Compras','08'),('08010000','Compras online','08'),('08020000','Eletrônicos','08'),
 ('08030000','Pet shop e veterinário','08'),('08040000','Vestuário','08'),('08050000','Artigos infantis','08'),
 ('08060000','Livraria','08'),('08070000','Artigos esportivos','08'),('08080000','Papelaria','08'),('08090000','Cashback','08'),
 ('09000000','Serviços digitais','09'),('09010000','Jogos','09'),('09020000','Streaming de vídeo','09'),('09030000','Streaming de música','09'),
 ('10000000','Supermercado','10'),
 ('11000000','Alimentos e bebidas','11'),('11010000','Restaurantes e bares','11'),('11020000','Delivery','11'),
 ('12000000','Viagens','12'),('12010000','Passagens aéreas','12'),('12020000','Hospedagem','12'),
 ('12030000','Programas de milhagem','12'),('12040000','Passagem de ônibus','12'),
 ('13000000','Doações','13'),
 ('14000000','Apostas','14'),('14010000','Loteria','14'),('14020000','Apostas online','14'),
 ('15000000','Impostos','15'),('15010000','Imposto de renda','15'),('15020000','Imposto s/ investimentos','15'),('15030000','IOF','15'),
 ('16000000','Taxas bancárias','16'),('16010000','Taxas de conta','16'),('16020000','Taxas transf./ATM','16'),('16030000','Taxas de cartão','16'),
 ('17000000','Moradia','17'),('17010000','Aluguel','17'),('17020000','Utilidades','17'),('17020001','Água','17'),
 ('17020002','Energia elétrica','17'),('17020003','Gás','17'),('17030000','Utensílios para casa','17'),('17040000','IPTU','17'),
 ('18000000','Saúde','18'),('18010000','Dentista','18'),('18020000','Farmácia','18'),('18030000','Ótica','18'),
 ('18040000','Hospitais e laboratórios','18'),
 ('19000000','Transporte','19'),('19010000','Táxi e apps','19'),('19020000','Transporte público','19'),
 ('19030000','Aluguel de veículos','19'),('19040000','Bicicleta','19'),('19050000','Automotivo','19'),
 ('19050001','Posto de gasolina','19'),('19050002','Estacionamento','19'),('19050003','Pedágios','19'),
 ('19050004','Taxas de veículos','19'),('19050005','Manutenção de veículos','19'),('19050006','Multas','19'),
 ('20000000','Seguros','20'),('200100000','Seguro de vida','20'),('200200000','Seguro residencial','20'),
 ('200300000','Seguro saúde','20'),('200400000','Seguro de veículos','20'),
 ('21000000','Lazer','21'),
 ('99999999','Outros','99')
on conflict (external_id) do update set nome_pt = excluded.nome_pt, prefix = excluded.prefix;
