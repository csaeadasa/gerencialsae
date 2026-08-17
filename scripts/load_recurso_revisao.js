import pg from 'pg';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

dotenv.config();

const csvData = `ID;Nº PROCESSO ADASA;NOME DO RECORRENTE;Nº DE INSCRIÇÃO CAESB;LATITUDE UTM;LONGITUDE UTM;IRREGULARIDADE ENCONTRADA;QUANTIDADE DE IRREGULARIDADES;TIPO DE INFRAÇÃO;PROCESSO CAESB;CLASSIFICAÇÃO DO IMÓVEL;TIPO DE SERVIÇO;REGIÃO ADMINISTRATIVA;DATA DE RECEBIMENTO;NOTA TÉCNICA Nº/ SISGED/SEI Nº;SITUAÇÃO;POSICIONAMENTO DIRETORIA;VALOR DA MULTA APLICADA CAESB;VALOR DA MULTA PÓS REVISÃO ADASA;DIFERENÇA EM FAVOR DO USUÁRIO;DATA DO EXTRATO DE DECISÃO DA DIR.;REUNIÃO PÚBLICA DIRETORIA;DATA DE SAÍDA NOTIFICAÇÃO USUÁRIO;OBSERVAÇÃO;
1;SISGED-0197-000057/2017;Maria da Glória C.F.A. Santos;1895338;-16,02723084;-48,08347621;Retirada de hidrômetro;1;Violação do hidrômetro;092.003.890/2017;Residencial;Água;Gama;18/01/2017;?;INDEFERIDO;;R$ 286,00;R$ 286,00;R$ 0,00;26/01/2017;;;Nota Técnica não cadastrada;
2;SISGED-0197-000987/2017;José Luis Pereira;2450445;-15,89435088;-48,10742712;CG/CS;2;Dispositivo padrão inadequado;092.001.581/2017;Residencial;Esgoto;Samambaia;03/08/2017;SEI nº70 / 10799-2017;DEFERIDO PARCIAL;;R$ 1.057,35;R$ 927,50;R$ 129,85;19/09/2017;;26/09/2017;;
3;SISGED-0197-000517/2017;Zewilson de Abreu Mota;2684081;-16,00801222;-47,98706859;Inversão de hidrômetro;1;Violação do hidrômetro;092.003.915/2016;Residencial;Água;Santa Maria;03/04/2017;SEI nº33/05048-2017;DEFERIDO PARCIAL;;R$ 286,00;R$ 258,00;R$ 28,00;17/05/2017;;;;
4;SISGED-0197-000988/2017;Evilázio Cardoso Ribeiro;2449072;-15,89443236;-48,10568582;CG/CS;2;Dispositivo padrão inadequado;092.001.851/2017;Residencial;Esgoto;Samambaia;03/08/2017;SEI nº73 / 10858-2017;DEFERIDO PARCIAL;;R$ 1.057,35;R$ 927,50;R$ 129,85;19/09/2017;;26/09/2017;;
5;SISGED-0197-001034/2017;Maria da Conceição de Oliveira Silva;4993535;-15,65507005;-47,84047354;Violação do hidrômetro;1;Violação do hidrômetro;092.002.846/2017;Residencial;Água;Sobradinho;14/08/2017;SEI nº71 / 10801-2017;INDEFERIDO;;R$ 265,00;R$ 265,00;R$ 0,00;19/09/2017;;26/09/2017;;
6;SEI-  0197-001073/2017;Escola Criança Feliz*;7.372.485;-15,90308686;-48,07315328;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.009.099/2015;Comercial;Esgoto;Recanto das Emas;18/08/2017;SEI nº93 (11416144);DEFERIDO PARCIAL;;R$ 4.585,00;R$ 1.375,50;R$ 3.209,50;22/08/2018;;22/08/2018;Diretoria perdeu o prazo de julgamento/reapreciado;
7;SISGED-0197-001071/2017;Bruno Bittar;3102491;-15,91219104;-47,7640026;Intervenção indevida no PV de esgoto;1; Intervenção indevida nas redes de água ou danos às mesmas;092.009.616/2015;Residencial;Esgoto;São Sebastião;18/08/2017;SEI nº94 /12529-2017;INDEFERIDO;;R$ 2.193,00;R$ 2.193,00;R$ 0,00;03/11/2017;;10/11/2017;Diretoria perdeu o prazo de julgamento;
8;SISGED-0197-001167/2017;Marileide Lopes da Costa;2771438;-15,92650261;-48,10438048;CI/CG;2;Dispositivo padrão inadequado;092.008.046/2015;Residencial;Esgoto;Recanto das Emas;04/09/2017;SEI nº99 / 13040-2017;INDEFERIDO;;R$ 2.193,00;R$ 2.193,00;R$ 0,00;08/12/2017;;11/12/2017;Diretoria perdeu o prazo de julgamento;
9;SISGED-0197-001168/2017;Valdemar Sabino da Silva;4200501;-15,74580718;-47,76631313;Intervenção indevida no PV de esgoto;1; Intervenção indevida nas redes de água ou danos às mesmas;092.001.663/2016;Residencial;Esgoto;Itapoã;04/09/2017;SEI nº102/13286-2017;INDEFERIDO;;R$ 1.855,00;R$ 1.855,00;R$ 0,00;04/12/2017;;05/12/2017;Diretoria perdeu o prazo de julgamento;
10;SISGED-0197-001232/2017;Antônio Inácio Pereira;3.408.868;-15,84670691;-47,97955383;CG;1;Dispositivo padrão inadequado;092.003159/2016;Comercial;Esgoto;Guará;14/09/2017;SEI nº110/13897-2017;INDEFERIDO;;R$ 2.856,00;R$ 2.856,00;R$ 0,00;08/12/2017;;11/12/2017; SAE perdeu o prazo da análise;
11;SISGED-0197-001233/2017;Jussara Barbosa;3.407.101;-15,84900424;-47,9784658;SSAO;1;Dispositivo padrão inadequado;092.003.897/2016;Comercial;Esgoto;Guará;14/09/2017;SEI nº111/14064-2017;DEFERIDO PARCIAL;;R$ 2.856,00;R$ 2.352,00;R$ 504,00;12/12/2017;;13/12/2017; SAE perdeu o prazo da análise;
12;SISGED-0197-001072/2017;Iramil Lemos da Silva;3.409.041;-15,84694401;-47,98020593;CI/CS/CG;3;Dispositivo padrão inadequado;092.002.085/2017;Comercial;Esgoto;Guará;18/08/2017;SEI nº86 / 12038-2017;INDEFERIDO;;R$ 2.856,00;R$ 2.856,00;R$ 0,00;03/11/2017;;10/11/2017;Diretoria perdeu o prazo de julgamento;
13;SISGED-0197-001074/2017;Maria da Conceição Mota da Silva;784711;-15,60167466;-47,64274452;Intervenção indevida no PV de esgoto;1; Intervenção indevida nas redes de água ou danos às mesmas;092.002.906/2017;Residencial;Esgoto;Planaltina;18/08/2017;SEI nº87 / 12049-2017;INDEFERIDO;;R$ 1.792,00;R$ 1.792,00;R$ 0,00;26/10/2017;;13/11/2017;Diretoria perdeu o prazo de julgamento;
14;SISGED-0197-001405/2017;Laudimira Fernandes Diamantina;2421232;-15,77086394;-47,78253571;Intervenção indevida no PV de esgoto;1; Intervenção indevida nas redes de água ou danos às mesmas;092.003.519/2017;Residencial;Esgoto;Paranoá;16/10/2017;SEI nº114/14274-2017;INDEFERIDO;;R$ 2.002,00;R$ 2.002,00;R$ 0,00;12/12/2017;;13/12/2017;;
15;SISGED-0197-001470/2017;Francisca da Conceição Mendes *;6185321;-15,87478514;-48,11039757;Intervenção indevida no PV de esgoto;1; Intervenção indevida nas redes de água ou danos às mesmas;092.003.379/2017;Residencial;Esgoto;Samambaia;27/10/2017;SEI nº120/14804-2017;INDEFERIDO;;R$ 1.855,00;R$ 1.855,00;R$ 0,00;05/03/2018;;08/03/2018;Diretoria perdeu o prazo de julgamento;
16;SISGED-0197-001469/2017;Justina Borges da Cruz;2226154;-15,79821948;-48,12843386;CI/CS/CG;3;Dispositivo padrão inadequado;092.003.378/2017;Residencial;Esgoto;Ceilândia;27/10/2017;SEI nº121/14841-2017;INDEFERIDO;;R$ 1.001,00;R$ 1.001,00;R$ 0,00;27/12/2017;;09/01/2018;;
17;0019700002208/2017-51;Elson Alves Rodrigues;1122967;-15,8491375;-47,96941988;CI/CS/CG;6;Lançamentos indevidos de óleos e gorduras na rede pública ;092.005.522/2017;Residencial;Esgoto;Guará;16/11/2017;SEI nº 05 (4431420);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 1.001,00;R$ 1.001,00;R$ 0,00;25/01/2018;1ª - 2018 - 494ª;26/01/2018;;
18;0019700002575/2017-54;Maria Alves dos Santos **;822787;-15,62906298;-47,64663633;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.004.601/2017;Residencial;Esgoto;Planaltina;03/11/2017;SEI nº 02 (4037608);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário.";R$ 2.860,00;R$ 2.431,00;R$ 429,00;10/01/2018;39ª - 2017 - 492ª;12/01/2018;Usuário impetrou ação na justiça comum;
19;0019700002222/2017-54;Inácio Lino Neto **;1.124.391;-15,84821743;-47,96819406;CI/CG;5;Lançamentos indevidos de óleos e gorduras na rede pública ;092.005.496/2017;Comercial;Esgoto;Guará;17/11/2017;SEI nº 08 (4441487);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 3.085,00;R$ 3.085,00;R$ 0,00;25/01/2018;1ª - 2018 - 494ª;26/01/2018;Diretoria perdeu o prazo de julgamento / Usuário impetrou ação na justiça comum;
20;0019700002224/2017-43;Millen Guedes da Silva de Souza;426814;-15,8238687;-48,1048315;CI/CS/CG;7;Lançamentos indevidos de óleos e gorduras na rede pública ;092.005.415/2017;Residencial;Esgoto;Ceilândia;17/11/2017;SEI nº 09 (4443594);DEFERIDO PARCIAL;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário.";R$ 1.430,00;R$ 1.215,50;R$ 214,50;25/01/2018;1ª - 2018 - 494ª;26/01/2018;Diretoria perdeu o prazo de julgamento / optou em manter o valor original;
21;0019700002083/2017-69;João da Silva Costa;2248328;-15,78798753;-48,12752121;CG / Ligação de águas pluviais nos esgotos;7;Lançamentos indevidos de óleos e gorduras na rede pública ;092.005.417/2017;Residencial;Esgoto;Ceilândia;08/11/2017;SEI nº 05 (4102257);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário.";R$ 1.430,00;R$ 1.215,50;R$ 214,50;10/01/2018;39ª - 2017 - 492ª;12/01/2018;Diretoria perdeu o prazo de julgamento;
22;0019700002082/2017-14;José Rodrigues dos Santos;5853151;-15,61202122;-47,68469697;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.001.148/2016;Residencial;Esgoto;Planaltina;08/11/2017;SEI n° 06 (4153870) ;INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 1.855,00;R$ 1.855,00;R$ 0,00;01/02/2018;2ª - 2018 - 495ª;05/02/2018;Diretoria perdeu o prazo de julgamento;
23;0019700002205/2017-17;Cipriana Bispo Póvoa;1515561;-15,87561182;-48,10097915;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.003.382/2017;Residencial;Esgoto;Samambaia;16/11/2017;SEI nº 06 (4436108);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 1.855,00;R$ 1.855,00;R$ 0,00;25/01/2018;1ª - 2018 - 494ª;26/01/2018;Diretoria perdeu o prazo de julgamento;
24;0019700002315/2017-89;Rapport Cafés Especiais e Bistrô;67.628;-15,80451046;-47,88515291;CG/CS;1;Lançamento de esgotos em galerias de águas pluviais;092.004.608/2017;Comercial;Esgoto;Plano Piloto;24/11/2017;SEI nº 10 (4483571);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 2.541,00;R$ 2.541,00;R$ 0,00;25/01/2018;1ª - 2018 - 494ª;26/01/2018;;
25;00197-00002167/2017-01;Condomínio Residencial Gamaggiore;6847609;-16,00038952;-48,05785956;Interconexão de água bruta com água da CAESB;1;Interconexão da instalação predial com canalizações de água de outra procedência;0092.005.569/2018;Residencial;Água;Gama;28/02/2019;SEI n° 12 (20576661);DEFERIDO TOTAL;"1. DAR PROVIMENTO TOTAL e ANULAR  a decisão de multa exarada pela CAESB;
2. ANULAR o valor da multa cobrado pela CAESB.";R$ 590,00;R$ 0,00;R$ 590,00;19/06/2019;15ª - 2019 - 564ª;19/06/2019;;
26;0019700000004/2018-66;Marcelo Bertulucci;1.022.571;-15,8351594;-47,98702841;CI/CG/SSAO;3;Lançamentos indevidos de óleos e gorduras na rede pública ;092.005.527/2017;Comercial;Esgoto;Guará;02/01/2018;SEI nº 22 (5059586);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 2.541,00;R$ 1.524,60;R$ 1.016,40;22/02/2018;4ª - 2018 - 497ª;22/02/2018;;
27;0019700000198/2018-08;Alvino Soares de Oliveira;341461;-15,6669264;-48,20265095;Intervenção indevida no PV de esgoto;3;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.006.581/2017;Residencial;Esgoto;Brazlândia;12/01/2018;SEI nº 23 (5158327);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 2.002,00;R$ 2.002,00;R$ 0,00;01/03/2018;5ª - 2018 - 498ª;01/03/2018;;
28;0019700000671/2018-49;Geralda Moura de Souza;5888484;-15,84553553;-48,06121628;Intervenção indevida no ramal predial;1;Intervenção indevida no ramal predial;092.005.564/2017;Residencial;Água;Taguatinga;15/02/2018;SEI nº 29 (5391105);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 572,00;R$ 572,00;R$ 0,00;08/03/2018;6ª - 2018 - 499ª;13/03/2018;;
29;00197-00000736/2018-56;Eronildes Vieira Pessoa;4522877;-15,87185938;-47,81204415;Hidrômetro danificado;1;Violação do hidrômetro;092.008.164/2017;Residencial;Água;Jardim Botânico;20/02/2018;SEI nº 30 (5490171);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 286,00;R$ 286,00;R$ 0,00;16/03/2018;7ª - 2018 - 500ª;16/03/2018;;
30;0019700000765/2018-18;Luis Fernando Zeferino;4126416;-15,75009479;-47,77071617;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.008.077/2017;Residencial;Esgoto;Itapoã;22/02/2018;SEI nº 37 (5854634);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 2.507,50;R$ 2.507,50;R$ 0,00;02/04/2018;8ª - 2018 - 502ª;05/04/2018;;
31;0019700000735/2018-10;Nilson Pereira dos Santos;5193184;-15,9061521;-47,75252661;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.008.058/2017;Residencial;Esgoto;São Sebastião;20/02/2018;SEI nº 32 (5553416);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 2.065,00;R$ 2.065,00;R$ 0,00;16/03/2018;7ª - 2018 - 500ª;16/03/2018;;
32;0019700000734/2018-67;Ubaldina Gomes de São José;1200631;-15,85885672;-48,03998386;Construção irregular sobre a rede de água;1;Construção sobre rede de água;092.007.891/2017;Residencial;Água;Taguatinga;20/02/2018;SEI nº  48 (6429399);DEFERIDO TOTAL;"1. DAR PROVIMENTO TOTAL e ANULAR  a decisão de multa exarada pela CAESB;
2. ANULAR o valor da multa cobrado pela CAESB.";R$ 2.860,00;R$ 0,00;R$ 2.860,00;30/04/2018;11ª - 2018 - 508ª;04/05/2018;Diretoria perdeu o prazo de julgamento;
33;0019700000764/2018-73;Condomínio do Reserva de Taguatinga;7091087;-15,79925687;-48,09200828;Fornecimento de água a terceiros;1;A derivação de tubulações da instalação predial de água para suprir outro imóvel;092.008.264/2017;Residencial;Água;Taguatinga;22/02/2018;SEI nº 42 (6003980);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 286,00;R$ 286,00;R$ 0,00;02/04/2018;8ª - 2018 - 502ª;03/04/2018;;
34;0019700001458/2018-54;João Batista Luciano da Silva;5842107;-15,8812959;-47,80572151;Derivação de água clandestina;1;Intervenção indevida no ramal predial;092.005.843/2017;Residencial;Água;Jardim Botânico;04/04/2018;SEI n° 66 (7351022);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 572,00;R$ 572,00;R$ 0,00;28/05/2018;15ª - 2018 - 513ª;06/06/2018;;
35;0019700001460/2018-23;Zenildo Caetano da Silva;2466155;-15,79355703;-47,85230421;CI/CS/CG;4;Lançamentos indevidos de óleos e gorduras na rede pública;092.007.960/2017;Residencial;Esgoto;Guará;04/04/2018;SEI n° 63 (7461375);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 1.001,00;R$ 1.001,00;R$ 0,00;18/05/2018;14ª - 2018 - 512ª;23/05/2018;;
36;0019700001461/2018-78;Maria Antonia de Souza;2303485;-15,7945816;-48,13915361;CI/CS/CG;5;Lançamentos indevidos de óleos e gorduras na rede pública;092.008.194/2017;Residencial;Esgoto;Ceilândia;04/04/2018;SEI n° 62 (7356266);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 1.251,50;R$ 1.001,00;R$ 250,50;28/05/2018;15ª - 2018 - 513ª;06/06/2018;;
37;0019700001465/2018-56;Darcisa de Souza Brito;5.520.185;-15,84499567;-47,98462361;CI/CS/CG/SSAO;3;Lançamentos indevidos de óleos e gorduras na rede pública;092.008.046/2016;Comercial;Esgoto;Guará;04/04/2018;SEI n° 57 (7081332);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 3.630,00;R$ 3.630,00;R$ 0,00;30/04/2018;11ª - 2018 - 508ª;04/05/2018;;
38;0019700001561/2018-02;Mea Silva de Araújo;2.437.881;-15,79145302;-47,85469469;CI/CG/OUTROS;6;Lançamentos indevidos de óleos e gorduras na rede pública;092.008.056/2017;Comercial;Esgoto;Plano Piloto;11/04/2018;SEI n° 59 (7252757);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 3.128,00;R$ 3.128,00;R$ 0,00;30/04/2018;11ª - 2018 - 508ª;04/05/2018;;
39;0019700001564/2018-38;Condomínio Ed. Vivendas;176087;-15,76729659;-47,88436871;Interconexão de água bruta com água da CAESB;1;Interconexão da instalação predial com canalizaciones de água de outra procedência;092.008.523/2017;Residencial;Água;Plano Piloto;11/04/2018;SEI n° 71 (7941802);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 572,00;R$ 572,00;R$ 0,00;11/06/2018;17ª - 2018 - 515ª;14/06/2018;;
40;0019700001562/2018-49;Evangelista Vieira da Silva;2.284.928;-15,80064473;-48,13507368;CI/CS/CG/OUTROS;7;Lançamentos indevidos de óleos e gorduras na rede pública ;092.008.381/2017;Comercial;Esgoto;Ceilândia;11/04/2018;SEI n° 58 (7166329) ;DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 3.630,00;R$ 2.541,00;R$ 1.089,00;18/05/2018;14ª - 2018 - 512ª;23/05/2018;;
41;0019700001956/2018-05;Erenides Nunes de Sousa;1823752;-16,02558897;-48,05847507;Derivação de água clandestina;1;Intervenção indevida no ramal predial;092.009.038/2017;Residencial;Água;Gama;08/05/2018;SEI n° 80 (8555119);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 586,00;R$ 586,00;R$ 0,00;18/06/2018;18ª -2018 - 516ª;20/06/2018;;
42;00197-00001894/2018-23;Nilda Xavier da Silva;2438712;-15,79265391;-47,85213424;CI/CS/CG/OUTROS;10;Lançamentos indevidos de óleos e gorduras na rede pública ;092.008.845/2017;Residencial;Esgoto;Plano Piloto;03/05/2018;SEI n° 75 (8138326);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 1.004,50;R$ 619,50;R$ 385,00;18/06/2018;18ª -2018 - 516ª;20/06/2018;;
43;00197-00002266/2018-65;Maria da Penha de Farias de Almeida;3.325.628;-16,01038351;-48,05403084;Construção irregular sobre a rede de água;1;Construção sobre rede de água;092.009.045/2017;Comercial;Água;Gama;30/05/2018;SEI n° 88 (9591808);DEFERIDO TOTAL;"1. DAR PROVIMENTO TOTAL e ANULAR  a decisão de multa exarada pela CAESB;
2. ANULAR o valor da multa cobrado pela CAESB.";R$ 5.187,00;R$ 0,00;R$ 5.187,00;16/07/2018;21ª - 2018 - 519ª;19/07/2018;;
44;0019700002894/2018-41;Maria José Bregion de Godoy;1.334.069;-15,83713485;-48,05952759;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.000.543/2018;Comercial;Esgoto;Taguatinga;04/07/2018;SEI n° 87 (9867725);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 5.236,00;R$ 1.570,80;R$ 3.665,20;27/08/2018;27ª - 2018 - 525ª;27/08/2018;;
45;0019700002910/2018-03;Assembléia de Deus CIADSETA;3093948;-15,91096934;-47,7612476;CI/CS/CG;5;Lançamentos indevidos de óleos e gorduras na rede pública;092.000.557/2018;Residencial;Esgoto;São Sebastião;04/07/2018;SEI n° 90 (10585006);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 1.032,50;R$ 1.032,50;R$ 0,00;22/08/2018;26ª - 2018 - 524ª;22/08/2018;;
46;0019700003302/2018-16;Florisa Lopes de Oliveira;489.051;-15,82607843;-48,11782217;CI/CS/CG;5;Lançamentos indevidos de óleos e gorduras na rede pública;092.000.294/2018;Comercial;Esgoto;Ceilândia;02/08/2018;SEI n° 97 (11748346);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 3.630,00;R$ 1.089,00;R$ 2.541,00;17/09/2018;29ª - 2018 - 527ª;17/09/2018;;
47;0019700003304/2018-05;Ramão Lourenço Brandi Gonçalves;1992112;-15,7975888;-48,10673872;Intervenção indevida no ramal predial;1;Intervenção indevida no ramal predial;092.000.264/2018;Residencial;Água;Taguatinga;02/08/2018;SEI n° 94 (11193368);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 572,00;R$ 572,00;R$ 0,00;13/09/2018;28ª - 2018 - 526ª;13/09/2018;;
48;0019700003698/2018-93;Armando Alves dos Santos;1229451;-15,85749024;-48,08524554;Intervenção indevida no ramal predial;1;Intervenção indevida no ramal predial;092.000.807/2018;Residencial;Água;Samambaia;27/08/2018;SEI nº 102 (12211776);DEFERIDO TOTAL;"1. DAR PROVIMENTO TOTAL e ANULAR  a decisão de multa exarada pela CAESB;
2. ANULAR o valor da multa cobrado pela CAESB.";R$ 590,00;R$ 0,00;R$ 590,00;25/09/2018;30ª - 2018 - 528ª;25/09/2018;;
49;0019700003718/2018-26;Tania Dias Franco;6779417;-15,80916182;-48,12461034;Fornecimento de água a terceiros;1;A derivação de tubulações da instalação predial de água para suprir outro imóvel;092.000.752/2018;Residencial;Água;Ceilândia;27/08/2018;SEI nº 99 (12048714);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 295,00;R$ 295,00;R$ 0,00;15/10/2018;31ª - 2018 - 529ª;15/10/2018;;
50;0019700003791/2018-06;Eldorado Construtora e Incorporadora LTDA;43.184;-15,798102;-47,88718305;CI/CS/CG/OUTROS;6;Lançamentos indevidos de óleos e gorduras na rede pública;092.000.699/2018 ;Comercial;Esgoto;Plano Piloto;30/08/2018;SEI n° 101 (12183762);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 3.179,00;R$ 3.179,00;R$ 0,00;16/11/2018;36ª - 2018 - 534ª;19/11/2018;;
51;0019700003795/2018-86 ;Gilberto Gonçalves Bezerra;7302878;-16,00946016;-48,05395328;Construção irregular sobre a rede de água;1;Construção sobre rede de água;092.000.423/2018;Residencial;Água;Gama;30/08/2018;SEI n° 103 (12478039);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 2.482,00;R$ 1.253,75;R$ 1.677,00;25/10/2018;33ª - 2018 - 531ª;25/10/2018;;
52;00197-00003554/2018-37;João Soares dos Santos;1.228.145;-15,84629809;-48,04594136;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.003.651/2017;Comercial;Esgoto;Taguatinga;16/08/2018;SEI n° 98 (11873171);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 5.712,00;R$ 5.712,00;R$ 0,00;25/09/2018;30ª - 2018 - 528ª;25/09/2018;Recurso por Processo Administrativo;
53;00197-00004757/2018-41;Cleide Sousa dos Reis Borges;1.845.951;-16,01447018;-48,06678943;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.004.594/2017;Comercial;Esgoto;Gama;29/10/2018;SEI nº 107 (15249233);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 5.712,00;R$ 2.352,00;R$ 3.360,00;20/12/2018;40ª - 2018 - 538ª;20/12/2018;;
54;00197-00004982/2018-87;Lidia Azevedo da Silva;1235354;-15,86433638;-48,08292605;Intervenção indevida no ramal predial;1;Intervenção indevida no ramal predial;092.001.510/2018;Residencial;Água;Samambaia;12/11/2018;SEI nº 108 (15313429);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 413,00;R$ 413,00;R$ 0,00;17/12/2018;39ª - 2018 - 537ª;17/12/2018;;
55;00197-00004976/2018-20;Administração Regional de Sobradinho II;5.779.898;-15,64225127;-47,82275755;CI/CS/CG;7;Lançamentos indevidos de óleos e gorduras na rede pública;092.002.718/2018;Público;Água;Sobradinho;12/11/2018;SEI nº 113 (16282110);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 2.618,00;R$ 2.618,00;R$ 0,00;28/01/2019;1ª - 2019 - 540ª;28/01/2019;;
56;00197-00004978/2018-19;Maria Aparecida Rodrigues de Abreu;3472507;-15,61808135;-47,63043111;Furo no hidrômetro;1;Violação do hidrômetro;092.001.844/2018;Residencial;Água;Planaltina;12/11/2018;SEI nº 112 (15901063);INDEFERIDO;"1. NEGAR pedido e MANTER a decisão de multa exarada pela CAESB;
2. Confirmar a decisão exarada pela CAESB que impôs a penalidade de multa ao usuário, mantendo o valor inicial.";R$ 295,00;R$ 295,00;R$ 0,00;28/01/2019;1ª - 2019 - 540ª;28/01/2019;;
57;00197-00004974/2018-31;SERMATEC Ltda;3.136.094;-15,7491595;-47,92408405;Intervenção indevida no PV de esgoto;1;Qualquer intervenção indevida nas instalações públicas de esgotos sanitários ou danos às mesmas;092.001.887/2018;Comercial;Esgoto;Plano Piloto;12/11/2018;SEI nº 111 (15869434);DEFERIDO PARCIAL;"1. DAR PROVIMENTO PARCIAL e MODIFICAR a decisão da CAESB;
2. Modificar e definir o valor final a ser cobrado.";R$ 5.712,00;R$ 2.352,00;R$ 3.360,00;28/01/2019;1ª - 2019 - 540ª;28/01/2019;;
`;

function parseCurrency(str) {
  if (!str) return null;
  const clean = String(str).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function parseDateToISO(str) {
  if (!str || str === '?' || str === '-') return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parts[0].trim().padStart(2, '0');
    const month = parts[1].trim().padStart(2, '0');
    const year = parts[2].trim();
    return `${year}-${month}-${day}`;
  }
  return str;
}

function recordToRecursoRevData(rec) {
  const dataRecebimentoISO = parseDateToISO(rec['DATA DE RECEBIMENTO']);
  
  let rawResultado = (rec['SITUAÇÃO'] || '').trim().toUpperCase();
  let resultado = 'Em Análise';
  if (rawResultado.includes('INDEFERIDO')) resultado = 'Indeferido';
  else if (rawResultado.includes('PARCIAL')) resultado = 'Deferido Parcial';
  else if (rawResultado.includes('TOTAL') || rawResultado.includes('DEFERIDO')) resultado = 'Deferido Total';

  const datasEtapas = {};
  if (dataRecebimentoISO) {
    datasEtapas['Recebido'] = dataRecebimentoISO;
    const dataDecisao = parseDateToISO(rec['DATA DO EXTRATO DE DECISÃO DA DIR.']);
    if (dataDecisao) datasEtapas['Finalizado'] = dataDecisao;
  }

  return {
    numeroProcesso: (rec['Nº PROCESSO ADASA'] || '').trim(),
    recorrente: (rec['NOME DO RECORRENTE'] || '').trim(),
    inscricaoCaesb: (rec['Nº DE INSCRIÇÃO CAESB'] || '').trim(),
    latitude: (rec['LATITUDE UTM'] || '').trim(),
    longitude: (rec['LONGITUDE UTM'] || '').trim(),
    irregularidadeEncontrada: (rec['IRREGULARIDADE ENCONTRADA'] || '').trim(),
    qtdeIrregularidades: rec['QUANTIDADE DE IRREGULARIDADES'] ? parseInt(rec['QUANTIDADE DE IRREGULARIDADES'], 10) || rec['QUANTIDADE DE IRREGULARIDADES'] : '',
    tipoInfracao: (rec['TIPO DE INFRAÇÃO'] || '').trim(),
    autoInfracaoOrigem: (rec['PROCESSO CAESB'] || '').trim(),
    classificacaoImovel: (rec['CLASSIFICAÇÃO DO IMÓVEL'] || '').trim(),
    servico: (rec['TIPO DE SERVIÇO'] || 'Água').trim(),
    regiaoAdministrativa: (rec['REGIÃO ADMINISTRATIVA'] || '').trim(),
    dataProtocolo: dataRecebimentoISO || '',
    numeroNotaTecnica: (rec['NOTA TÉCNICA Nº/ SISGED/SEI Nº'] || '').trim(),
    situacao: 'Finalizado',
    resultado: resultado,
    decisaoDiretoria: (rec['POSICIONAMENTO DIRETORIA'] || '').trim(),
    valorMultaQuestionada: parseCurrency(rec['VALOR DA MULTA APLICADA CAESB']),
    valorMultaMantida: parseCurrency(rec['VALOR DA MULTA PÓS REVISÃO ADASA']),
    reuniaoPublicaDiretoria: (rec['REUNIÃO PÚBLICA DIRETORIA'] || '').trim(),
    observacao: (rec['OBSERVAÇÃO'] || '').trim(),
    tipoRecurso: 'Recurso de Revisão',
    datasEtapas: Object.keys(datasEtapas).length > 0 ? datasEtapas : undefined
  };
}

function normalizeProcessNumber(str) {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

async function runLoad() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('DATABASE_URL or POSTGRES_URL is missing');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: connectionString.replace(/&?channel_binding=require/g, ''),
    ssl: { rejectUnauthorized: false }
  });

  const parsedRecords = parse(csvData, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Parsed ${parsedRecords.length} records from CSV.`);

  const client = await pool.connect();
  try {
    // Fetch tasks of type 'recurso_revisao'
    const tasksRes = await client.query("SELECT id, title, sei_process, recurso_rev_data FROM pl_tasks WHERE type = 'recurso_revisao' ORDER BY id ASC");
    const tasks = tasksRes.rows;
    console.log(`Found ${tasks.length} tasks of type 'recurso_revisao' in database.`);

    let matchedCount = 0;
    let randomCount = 0;

    await client.query('BEGIN');

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskTitleNorm = normalizeProcessNumber(task.title);
      const taskSeiNorm = normalizeProcessNumber(task.sei_process);
      const existingDataProcNorm = task.recurso_rev_data?.numeroProcesso ? normalizeProcessNumber(task.recurso_rev_data.numeroProcesso) : '';

      // Try to find matching CSV record
      let matchedRecord = parsedRecords.find(rec => {
        const proc = rec['Nº PROCESSO ADASA'];
        if (!proc) return false;
        const procNorm = normalizeProcessNumber(proc);
        if (!procNorm || procNorm.length < 5) return false;

        return (
          (taskTitleNorm && (taskTitleNorm.includes(procNorm) || procNorm.includes(taskTitleNorm))) ||
          (taskSeiNorm && (taskSeiNorm.includes(procNorm) || procNorm.includes(taskSeiNorm))) ||
          (existingDataProcNorm && (existingDataProcNorm.includes(procNorm) || procNorm.includes(existingDataProcNorm)))
        );
      });

      let recursoRevObj;
      if (matchedRecord) {
        matchedCount++;
        recursoRevObj = recordToRecursoRevData(matchedRecord);
      } else {
        randomCount++;
        // Pick a random CSV record to populate for test database
        const randomRecord = parsedRecords[i % parsedRecords.length];
        recursoRevObj = recordToRecursoRevData(randomRecord);

        // Keep or extract process number from title if possible
        const procFromTitle = task.title.match(/(?:SISGED|SEI|00197)[-\s\d\/]+/i);
        if (procFromTitle) {
          recursoRevObj.numeroProcesso = procFromTitle[0].trim();
        }
      }

      await client.query(
        'UPDATE pl_tasks SET recurso_rev_data = $1, sei_process = COALESCE(sei_process, $2) WHERE id = $3',
        [JSON.stringify(recursoRevObj), recursoRevObj.numeroProcesso || null, task.id]
      );
    }

    await client.query('COMMIT');
    console.log(`SUCCESS: Loaded data into ${tasks.length} Recurso de Revisão tasks.`);
    console.log(`- Directly matched by process number: ${matchedCount}`);
    console.log(`- Populated with test data: ${randomCount}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during data load:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runLoad();
